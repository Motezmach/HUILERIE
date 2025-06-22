import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createBoxItemSchema, bulkCreateBoxSchema, uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  validateBoxId
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/farmers/[id]/boxes - Get farmer's boxes
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      orderBy: [
        { type: 'asc' },
        { id: 'asc' }
      ]
    })

    const formattedBoxes = boxes.map((box: any) => ({
      ...box,
      type: box.type.toLowerCase(),
      currentWeight: Number(box.currentWeight || 0)
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

// POST /api/farmers/[id]/boxes - Add box(es) to farmer
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const farmerId = uuidSchema.parse(params.id)
    const body = await request.json()

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

    // Determine if it's bulk or single box creation
    const isBulk = body.boxes && Array.isArray(body.boxes)
    
    if (isBulk) {
      // Bulk creation
      const validatedData = bulkCreateBoxSchema.parse(body)
      const boxesToCreate = validatedData.boxes
      const createdBoxes = []
      const errors = []

      for (const boxData of boxesToCreate) {
        try {
          // Validate box ID format
          const validationError = validateBoxId(boxData.id)
          if (validationError) {
            errors.push(`Boîte ${boxData.id}: ${validationError}`)
            continue
          }

          // Check if box ID already exists
          const existingBox = await prisma.box.findFirst({
            where: { id: boxData.id }
          })

          if (existingBox) {
            errors.push(`Boîte ${boxData.id}: ID déjà utilisé`)
            continue
          }

          // Create the box
          const createdBox = await prisma.box.create({
            data: {
              id: boxData.id,
              currentFarmerId: farmerId,
              type: boxData.type.toUpperCase() as any,
              currentWeight: boxData.weight,
              status: 'IN_USE',
              assignedAt: new Date(),
              isSelected: false
            }
          })

          createdBoxes.push({
            ...createdBox,
            type: createdBox.type.toLowerCase(),
            currentWeight: Number(createdBox.currentWeight || 0)
          })
        } catch (boxError) {
          console.error(`Error creating box ${boxData.id}:`, boxError)
          errors.push(`Boîte ${boxData.id}: Erreur de création`)
        }
      }

      // Return results
      if (createdBoxes.length === 0) {
        return NextResponse.json(
          createErrorResponse('Aucune boîte n\'a pu être créée: ' + errors.join(', ')),
          { status: 400 }
        )
      }

      // Trigger dashboard update
      await triggerDashboardUpdate(`Added ${createdBoxes.length} boxes to farmer ${farmerId}`)

      return NextResponse.json(
        createSuccessResponse({
          created: createdBoxes,
          errors: errors.length > 0 ? errors : undefined
        }, `${createdBoxes.length} boîte(s) créée(s) avec succès`),
        { status: 201 }
      )
    } else {
      // Single box creation
      const validatedData = createBoxItemSchema.parse(body)
      
      // Validate box ID format
      const validationError = validateBoxId(validatedData.id)
      if (validationError) {
        return NextResponse.json(
          createErrorResponse(validationError),
          { status: 400 }
        )
      }

      // Check if box ID already exists
      const existingBox = await prisma.box.findFirst({
        where: { id: validatedData.id }
      })

      if (existingBox) {
        return NextResponse.json(
          createErrorResponse('Une boîte avec cet ID existe déjà'),
          { status: 409 }
        )
      }

      // Create the box
      const createdBox = await prisma.box.create({
        data: {
          id: validatedData.id,
          currentFarmerId: farmerId,
          type: validatedData.type.toUpperCase() as any,
          currentWeight: validatedData.weight,
          status: 'IN_USE',
          assignedAt: new Date(),
          isSelected: false
        }
      })

      // Trigger dashboard update
      await triggerDashboardUpdate(`Added box ${validatedData.id} to farmer ${farmerId}`)

      return NextResponse.json(
        createSuccessResponse({
          ...createdBox,
          type: createdBox.type.toLowerCase(),
          currentWeight: Number(createdBox.currentWeight || 0)
        }, 'Boîte créée avec succès'),
        { status: 201 }
      )
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error creating farmer boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création des boîtes'),
      { status: 500 }
    )
  }
}
