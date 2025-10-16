import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateBoxSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  transformBoxFromDb
} from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/boxes/[id] - Get single box
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boxId = params.id
    
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        currentFarmer: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    if (!box) {
      return NextResponse.json(
        createErrorResponse('Boîte non trouvée'),
        { status: 404 }
      )
    }

    const formattedBox = transformBoxFromDb(box)

    return NextResponse.json(
      createSuccessResponse(formattedBox, 'Boîte récupérée avec succès')
    )
  } catch (error) {
    console.error('Error fetching box:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération de la boîte'),
      { status: 500 }
    )
  }
}

// PUT /api/boxes/[id] - Update box
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boxId = params.id
    const body = await request.json()
    const validatedData = updateBoxSchema.parse(body)

    // Check if box exists
    const existingBox = await prisma.box.findUnique({
      where: { id: boxId }
    })

    if (!existingBox) {
      return NextResponse.json(
        createErrorResponse('Boîte non trouvée'),
        { status: 404 }
      )
    }

    // Check if box is available for modification
    if (existingBox.status !== 'IN_USE') {
      return NextResponse.json(
        createErrorResponse('Seules les boîtes en cours d\'utilisation peuvent être modifiées'),
        { status: 400 }
      )
    }

    // Handle ID changes (since ID is primary key, we need special handling)
    if (validatedData.id && validatedData.id !== boxId) {
      // Check if new ID already exists AND is in use by another farmer
      const duplicateBox = await prisma.box.findUnique({
        where: { id: validatedData.id }
      })

      // Only block if the duplicate box is actually in use by a farmer
      if (duplicateBox && duplicateBox.status === 'IN_USE' && duplicateBox.currentFarmerId) {
        return NextResponse.json(
          createErrorResponse(`L'ID ${validatedData.id} est déjà utilisé par une autre boîte assignée à un agriculteur`),
          { status: 400 }
        )
      }
      
      // If duplicate exists but is AVAILABLE, we need to delete it first
      if (duplicateBox && duplicateBox.status === 'AVAILABLE') {
        await prisma.box.delete({
          where: { id: validatedData.id }
        })
      }

      // Create new box with new ID and delete old one (transaction)
      const result = await prisma.$transaction(async (tx: any) => {
        // Create new box
        const newBox = await tx.box.create({
        data: {
          id: validatedData.id,
            currentFarmerId: existingBox.currentFarmerId,
            type: validatedData.type ? validatedData.type.toUpperCase() as any : existingBox.type,
            currentWeight: validatedData.weight !== undefined ? validatedData.weight : existingBox.currentWeight,
            isSelected: existingBox.isSelected,
            status: existingBox.status,
            assignedAt: existingBox.assignedAt
        }
      })

        // Delete old box
        await tx.box.delete({
        where: { id: boxId }
        })

        return newBox
      })

      const formattedBox = transformBoxFromDb(result)
      return NextResponse.json(
        createSuccessResponse(formattedBox, 'Boîte mise à jour avec succès')
      )
    } else {
      // Regular update without ID change
      const updateData: any = {}
      if (validatedData.weight !== undefined) updateData.currentWeight = validatedData.weight
      if (validatedData.type !== undefined) updateData.type = validatedData.type.toUpperCase()

      const box = await prisma.box.update({
        where: { id: boxId },
        data: updateData
      })

      const formattedBox = transformBoxFromDb(box)
      return NextResponse.json(
        createSuccessResponse(formattedBox, 'Boîte mise à jour avec succès')
      )
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error updating box:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de la boîte'),
      { status: 500 }
    )
  }
}

// DELETE /api/boxes/[id] - Release box (make it available, don't actually delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boxId = params.id

    // Check if box exists
    const existingBox = await prisma.box.findUnique({
      where: { id: boxId }
    })

    if (!existingBox) {
      return NextResponse.json(
        createErrorResponse('Boîte non trouvée'),
        { status: 404 }
      )
    }

    // Check if box is not currently assigned to a farmer
    if (existingBox.status !== 'IN_USE' || !existingBox.currentFarmerId) {
      return NextResponse.json(
        createErrorResponse('Cette boîte n\'est pas assignée à un agriculteur'),
        { status: 400 }
      )
    }

    // PROFESSIONAL LOGIC: Release box (make it available, don't delete)
    const releasedBox = await prisma.box.update({
      where: { id: boxId },
      data: {
        status: 'AVAILABLE',        // Box becomes available for other farmers
        currentFarmerId: null,      // Remove farmer assignment
        currentWeight: null,        // Clear weight
        assignedAt: null,           // Clear assignment date
        isSelected: false           // Reset selection
      }
    })

    const formattedBox = transformBoxFromDb(releasedBox)

    return NextResponse.json(
      createSuccessResponse(formattedBox, `Boîte ${boxId} libérée avec succès! Elle est maintenant disponible pour d'autres agriculteurs.`)
    )
  } catch (error) {
    console.error('Error releasing box:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la libération de la boîte'),
      { status: 500 }
    )
  }
}
