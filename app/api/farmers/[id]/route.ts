import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateFarmerSchema, uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  transformFarmerFromDb,
  calculatePricePerKg
} from '@/lib/utils'

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
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null
    if (validatedData.type !== undefined) {
      updateData.type = validatedData.type.toUpperCase()
      updateData.pricePerKg = calculatePricePerKg(validatedData.type)
    }
    // Handle direct pricePerKg update (for when just updating price)
    if (validatedData.pricePerKg !== undefined) {
      updateData.pricePerKg = validatedData.pricePerKg
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

    // Check if farmer has active processing sessions
    const activeSessions = existingFarmer.processingSessions.filter(
      (session: any) => session.processingStatus === 'PENDING'
    )

    if (activeSessions.length > 0) {
      return NextResponse.json(
        createErrorResponse('Impossible de supprimer: l\'agriculteur a des sessions de traitement en cours'),
        { status: 400 }
      )
    }

    // Delete farmer (cascade will handle boxes and sessions)
    await prisma.farmer.delete({
      where: { id: farmerId }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Agriculteur supprimé avec succès')
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
