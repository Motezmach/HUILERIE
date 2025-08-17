import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createBoxItemSchema, bulkCreateBoxSchema, uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  transformBoxFromDb
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/farmers/[id]/boxes - Get farmer's boxes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const farmerId = uuidSchema.parse(params.id)
    
    // Check if farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    const boxes = await prisma.box.findMany({
      where: { currentFarmerId: farmerId },
      orderBy: { assignedAt: 'desc' }
    })

    const formattedBoxes = boxes.map((box: any) => ({
      ...box,
      type: box.type.toLowerCase(),
      weight: Number(box.currentWeight || 0),
      farmerId: box.currentFarmerId,
      selected: box.isSelected || false,
      status: box.status.toLowerCase()
    }))

    return NextResponse.json(
      createSuccessResponse(formattedBoxes, 'Boîtes récupérées avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID d\'agriculteur invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error fetching farmer boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des boîtes'),
      { status: 500 }
    )
  }
}

// POST /api/farmers/[id]/boxes - Assign box to farmer (PROFESSIONAL SYSTEM)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const farmerId = uuidSchema.parse(params.id)
    const body = await request.json()

    // Check if farmer exists first
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Handle different box types with new professional logic
    if (body.boxes) {
      // Bulk operation - assign multiple boxes
      const validatedData = bulkCreateBoxSchema.parse(body)
      const assignedBoxes = []

      for (const boxRequest of validatedData.boxes) {
        if (boxRequest.type === 'chkara') {
          // For CHKARA boxes, we create new ones (these are sacs, not factory boxes)
          const existingChkaraBoxes = await prisma.box.findMany({
            where: {
              id: { startsWith: 'Chkara' }
            },
            select: { id: true }
          })
          
          let chkaraCounter = 1
          if (existingChkaraBoxes.length > 0) {
            const chkaraNums = existingChkaraBoxes
              .map((box: any) => parseInt(box.id.replace('Chkara', '')))
              .filter((num: number) => !isNaN(num))
              .sort((a: number, b: number) => a - b)
            
            for (const num of chkaraNums) {
              if (num === chkaraCounter) {
                chkaraCounter++
              } else {
                break
              }
            }
          }
          
          const chkaraBox = await prisma.box.create({
            data: {
              id: `Chkara${chkaraCounter}`,
              type: 'CHKARA',
              currentWeight: boxRequest.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
          
          assignedBoxes.push(chkaraBox)
    } else {
          // For NORMAL/NCHIRA boxes, assign from available factory boxes
          const requestedBoxId = boxRequest.id
          
          // Check if specific box ID is available
          const targetBox = await prisma.box.findUnique({
            where: { id: requestedBoxId }
          })
          
          if (!targetBox) {
            return NextResponse.json(
              createErrorResponse(`Boîte ${requestedBoxId} n'existe pas dans l'inventaire de l'usine`),
              { status: 400 }
            )
          }
          
          if (targetBox.status !== 'AVAILABLE') {
            return NextResponse.json(
              createErrorResponse(`Boîte ${requestedBoxId} n'est pas disponible (actuellement: ${targetBox.status})`),
              { status: 400 }
            )
          }
          
          // Assign the box to farmer
          const assignedBox = await prisma.box.update({
            where: { id: requestedBoxId },
            data: {
              type: boxRequest.type.toUpperCase() as any,
              currentWeight: boxRequest.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
          
          assignedBoxes.push(assignedBox)
        }
      }

      const formattedBoxes = assignedBoxes.map((box: any) => ({
        ...box,
        type: box.type.toLowerCase(),
        weight: Number(box.currentWeight || 0),
        farmerId: box.currentFarmerId,
        selected: box.isSelected || false,
        status: box.status.toLowerCase()
      }))

      // Trigger dashboard update
      await triggerDashboardUpdate(`Assigned ${assignedBoxes.length} boxes to farmer ${farmerId}`)

      return NextResponse.json(
        createSuccessResponse(formattedBoxes, `${assignedBoxes.length} boîtes assignées avec succès`),
        { status: 201 }
      )
    } else {
      // Single box operation
      const validatedData = createBoxItemSchema.parse(body)

      if (validatedData.type === 'chkara') {
        // Create new Chkara box (sac)
        const existingChkaraBoxes = await prisma.box.findMany({
          where: {
            id: { startsWith: 'Chkara' }
          },
          select: { id: true }
        })

        let chkaraCounter = 1
        if (existingChkaraBoxes.length > 0) {
          const chkaraNums = existingChkaraBoxes
            .map((box: any) => parseInt(box.id.replace('Chkara', '')))
            .filter((num: number) => !isNaN(num))
            .sort((a: number, b: number) => a - b)
          
          for (const num of chkaraNums) {
            if (num === chkaraCounter) {
              chkaraCounter++
            } else {
              break
            }
          }
        }
        
        const chkaraBox = await prisma.box.create({
          data: {
            id: `Chkara${chkaraCounter}`,
            type: 'CHKARA',
            currentWeight: validatedData.weight ?? null,
            currentFarmerId: farmerId,
            assignedAt: new Date(),
            status: 'IN_USE'
          }
        })

        const formattedBox = {
          ...chkaraBox,
          type: chkaraBox.type.toLowerCase(),
          weight: Number(chkaraBox.currentWeight || 0),
          farmerId: chkaraBox.currentFarmerId,
          selected: chkaraBox.isSelected || false,
          status: chkaraBox.status.toLowerCase()
        }

        // Trigger dashboard update
        await triggerDashboardUpdate(`Created and assigned Chkara box to farmer ${farmerId}`)

        return NextResponse.json(
          createSuccessResponse(formattedBox, 'Sac Chkara créé et assigné avec succès'),
          { status: 201 }
        )
      } else {
        // Handle factory box assignment (create or update)
        const requestedBoxId = validatedData.id
        
        // Check if box exists in factory inventory
        const targetBox = await prisma.box.findUnique({
          where: { id: requestedBoxId }
        })
        
        let assignedBox
        
        if (!targetBox) {
          // Validate ID range for factory boxes (1-600)
          const numId = parseInt(requestedBoxId)
          if (isNaN(numId) || numId < 1 || numId > 600) {
            return NextResponse.json(
              createErrorResponse(`ID de boîte invalide. Les boîtes d'usine doivent avoir un ID entre 1 et 600.`),
              { status: 400 }
            )
    }

          // Create new factory box
          assignedBox = await prisma.box.create({
            data: {
              id: requestedBoxId,
              type: validatedData.type.toUpperCase() as any,
              currentWeight: validatedData.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
        } else {
          // Update existing box
          if (targetBox.status !== 'AVAILABLE') {
            const statusMessage = targetBox.status === 'IN_USE' 
              ? `utilisée par un autre agriculteur` 
              : targetBox.status
            
      return NextResponse.json(
              createErrorResponse(`Boîte ${requestedBoxId} n'est pas disponible (${statusMessage})`),
        { status: 400 }
      )
    }

          // Assign the existing box to farmer
          assignedBox = await prisma.box.update({
            where: { id: requestedBoxId },
            data: {
              type: validatedData.type.toUpperCase() as any,
              currentWeight: validatedData.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
        }

        const formattedBox = {
          ...assignedBox,
          type: assignedBox.type.toLowerCase(),
          weight: Number(assignedBox.currentWeight || 0),
          farmerId: assignedBox.currentFarmerId,
          selected: assignedBox.isSelected || false,
          status: assignedBox.status.toLowerCase()
        }

        // Trigger dashboard update
        await triggerDashboardUpdate(`Assigned box ${requestedBoxId} to farmer ${farmerId}`)

    return NextResponse.json(
          createSuccessResponse(formattedBox, `Boîte ${requestedBoxId} assignée avec succès`),
      { status: 201 }
    )
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error assigning box:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de l\'assignation de la boîte'),
      { status: 500 }
    )
  }
}
