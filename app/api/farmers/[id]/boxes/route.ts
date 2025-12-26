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
      // OPTIMIZED Bulk operation - assign multiple boxes in parallel
      const validatedData = bulkCreateBoxSchema.parse(body)
      
      // Pre-fetch all needed data once (not per box)
      const [existingChkaraBoxes, requestedBoxIds] = await Promise.all([
        // Get existing chakra boxes once
        prisma.box.findMany({
          where: { id: { startsWith: 'Chkara' } },
            select: { id: true }
        }),
        // Get IDs of all requested factory boxes
        Promise.resolve(validatedData.boxes
          .filter(b => b.type !== 'chkara' && b.id)
          .map(b => b.id!))
      ])

      // Validate all factory boxes at once
      if (requestedBoxIds.length > 0) {
        const factoryBoxes = await prisma.box.findMany({
          where: { id: { in: requestedBoxIds } }
        })

        // Check if all boxes exist and are available
        for (const boxId of requestedBoxIds) {
          const box = factoryBoxes.find(b => b.id === boxId)
          if (!box) {
            return NextResponse.json(
              createErrorResponse(`Boîte ${boxId} n'existe pas`),
              { status: 400 }
            )
          }
          if (box.status !== 'AVAILABLE') {
            return NextResponse.json(
              createErrorResponse(`Boîte ${boxId} n'est pas disponible`),
              { status: 400 }
            )
          }
        }
      }

      // Calculate next chakra counter once
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
          
      // Process all boxes in PARALLEL using Promise.all()
      const boxPromises = validatedData.boxes.map(async (boxRequest, index) => {
        if (boxRequest.type === 'chkara') {
          // Create new CHKARA box
          return await prisma.box.create({
            data: {
              id: `Chkara${chkaraCounter + index}`,
              type: 'CHKARA',
              currentWeight: boxRequest.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
    } else {
          // Assign factory box
          return await prisma.box.update({
            where: { id: boxRequest.id! },
            data: {
              type: boxRequest.type.toUpperCase() as any,
              currentWeight: boxRequest.weight ?? null,
              currentFarmerId: farmerId,
              assignedAt: new Date(),
              status: 'IN_USE'
            }
          })
        }
      })

      // Execute all box operations in parallel - MUCH FASTER!
      const assignedBoxes = await Promise.all(boxPromises)

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
    } else if (body.bulkQuantity && body.bulkWeight) {
      // 🚀 NEW SMART BULK ADD - Auto-assign available boxes with distributed weight
      const { bulkQuantity, bulkWeight } = body
      
      console.log('🎯 Smart bulk add:', { farmerId, bulkQuantity, bulkWeight })
      
      // Validate inputs
      if (!Number.isInteger(bulkQuantity) || bulkQuantity <= 0 || bulkQuantity > 50) {
        return NextResponse.json(
          createErrorResponse('Quantité invalide. Doit être entre 1 et 50'),
          { status: 400 }
        )
      }
      
      if (typeof bulkWeight !== 'number' || bulkWeight <= 0) {
        return NextResponse.json(
          createErrorResponse('Poids total invalide. Doit être supérieur à 0'),
          { status: 400 }
        )
      }
      
      // Fetch available factory boxes (sorted numerically)
      const availableBoxes = await prisma.box.findMany({
        where: {
          status: 'AVAILABLE',
          type: { not: 'CHKARA' }
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: bulkQuantity
      })
      
      // Check if we have enough available boxes
      if (availableBoxes.length < bulkQuantity) {
        return NextResponse.json(
          createErrorResponse(`Pas assez de boîtes disponibles. Demandé: ${bulkQuantity}, Disponible: ${availableBoxes.length}`),
          { status: 400 }
        )
      }
      
      // Calculate weight per box (evenly distributed)
      const weightPerBox = bulkWeight / bulkQuantity
      
      console.log('📦 Auto-assigning boxes:', {
        quantity: bulkQuantity,
        totalWeight: bulkWeight,
        weightPerBox: weightPerBox.toFixed(2),
        boxIds: availableBoxes.map(b => b.id)
      })
      
      // Assign all boxes in parallel
      const assignmentPromises = availableBoxes.map(box =>
        prisma.box.update({
          where: { id: box.id },
          data: {
            status: 'IN_USE',
            currentFarmerId: farmerId,
            currentWeight: weightPerBox,
            assignedAt: new Date(),
            type: 'NORMAL'
          }
        })
      )
      
      const assignedBoxes = await Promise.all(assignmentPromises)
      
      const formattedBoxes = assignedBoxes.map((box: any) => ({
        ...box,
        type: box.type.toLowerCase(),
        weight: Number(box.currentWeight || 0),
        farmerId: box.currentFarmerId,
        selected: box.isSelected || false,
        status: box.status.toLowerCase()
      }))
      
      // Trigger dashboard update
      await triggerDashboardUpdate(`Smart bulk assigned ${assignedBoxes.length} boxes to farmer ${farmerId}`)
      
      console.log('✅ Smart bulk add successful:', {
        boxCount: assignedBoxes.length,
        totalWeight: bulkWeight,
        avgWeight: weightPerBox.toFixed(2)
      })
      
      return NextResponse.json(
        createSuccessResponse(formattedBoxes, `${assignedBoxes.length} boîtes assignées automatiquement avec ${weightPerBox.toFixed(2)} kg chacune`),
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
