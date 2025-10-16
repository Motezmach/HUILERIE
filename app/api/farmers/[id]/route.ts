import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateFarmerSchema, uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  transformFarmerFromDb
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/farmers/[id] - Get single farmer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const farmerId = uuidSchema.parse(params.id)
    
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        currentBoxes: true,
        processingSessions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Transform the data structure for the frontend
    const farmerWithBoxes = {
      ...farmer,
      boxes: farmer.currentBoxes || []  // Map currentBoxes to boxes for consistency
    }

    const formattedFarmer = transformFarmerFromDb(farmerWithBoxes)

    return NextResponse.json(
      createSuccessResponse(formattedFarmer, 'Agriculteur récupéré avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID d\'agriculteur invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error fetching farmer:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération de l\'agriculteur'),
      { status: 500 }
    )
  }
}

// PUT /api/farmers/[id] - Update farmer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const farmerId = uuidSchema.parse(params.id)
    const body = await request.json()
    const validatedData = updateFarmerSchema.parse(body)

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id: farmerId }
    })

    if (!existingFarmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.nickname !== undefined) updateData.nickname = validatedData.nickname || null
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null
    if (validatedData.type !== undefined) {
      updateData.type = validatedData.type.toUpperCase()
      // Note: pricePerKg is now nullable - no default pricing
      // Actual pricing is handled per-session during payment
    }

    const farmer = await prisma.farmer.update({
      where: { id: farmerId },
      data: updateData,
      include: {
        currentBoxes: true
        }
      })
      
    // Transform the data structure for the frontend
    const farmerWithBoxes = {
      ...farmer,
      boxes: farmer.currentBoxes || []  // Map currentBoxes to boxes for consistency
    }

    const formattedFarmer = transformFarmerFromDb(farmerWithBoxes)

    return NextResponse.json(
      createSuccessResponse(formattedFarmer, 'Agriculteur mis à jour avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error updating farmer:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de l\'agriculteur'),
      { status: 500 }
    )
  }
}

// DELETE /api/farmers/[id] - Delete farmer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const farmerId = uuidSchema.parse(params.id)

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        currentBoxes: true,
        processingSessions: true
      }
    })

    if (!existingFarmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Check if farmer has any sessions (for informational purposes)
    const sessionsCount = existingFarmer.processingSessions?.length || 0

    // Use transaction to ensure all deletions are atomic
    await prisma.$transaction(async (tx) => {
      // Delete all sessions first (this will cascade to payment transactions and session boxes)
      if (sessionsCount > 0) {
        await tx.processingSession.deleteMany({
          where: { farmerId: farmerId }
        })
    }

    // Make farmer's boxes available for other farmers
      await tx.box.updateMany({
      where: { currentFarmerId: farmerId },
      data: { 
        currentFarmerId: null,
        currentWeight: null,
        assignedAt: null,
        status: 'AVAILABLE',
        isSelected: false
      }
    })

      // Delete farmer
      await tx.farmer.delete({
      where: { id: farmerId }
      })
    })

    // Trigger dashboard update
    await triggerDashboardUpdate(`Farmer ${existingFarmer.name} deleted with ${sessionsCount} sessions - ${existingFarmer.currentBoxes.length} boxes made available`)

    return NextResponse.json(
      createSuccessResponse(null, `Agriculteur supprimé avec succès. ${sessionsCount} sessions et ${existingFarmer.currentBoxes.length} boîtes libérées.`)
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID d\'agriculteur invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error deleting farmer:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de l\'agriculteur'),
      { status: 500 }
    )
  }
}
