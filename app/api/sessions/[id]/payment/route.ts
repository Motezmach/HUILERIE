import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  updateFarmerTotals
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/sessions/[id]/payment - Toggle payment status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)
    const body = await request.json()
    const { status } = body

    if (!status || !['paid', 'unpaid'].includes(status)) {
      return NextResponse.json(
        createErrorResponse('Statut de paiement invalide. Utilisez "paid" ou "unpaid"'),
        { status: 400 }
      )
    }

    // Check if session exists
    const existingSession = await prisma.processingSession.findUnique({
      where: { id: sessionId }
    })

    if (!existingSession) {
      return NextResponse.json(
        createErrorResponse('Session non trouvée'),
        { status: 404 }
      )
    }

    // Check if session is processed (can only pay processed sessions)
    // Allow payment for sessions with oil weight > 0 even if status is still PENDING
    const isProcessed = existingSession.processingStatus === 'PROCESSED' || Number(existingSession.oilWeight) > 0
    if (!isProcessed) {
      return NextResponse.json(
        createErrorResponse('Impossible de modifier le paiement d\'une session non traitée'),
        { status: 400 }
      )
    }

    // Update payment status
    const updateData: any = {
      paymentStatus: status.toUpperCase()
    }

    if (status === 'paid') {
      updateData.paymentDate = new Date()
    } else {
      updateData.paymentDate = null
    }

    const updatedSession = await prisma.processingSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            type: true,
            pricePerKg: true
          }
        }
      }
    })

    // Update farmer totals
    await updateFarmerTotals(existingSession.farmerId, prisma)

    // Trigger dashboard update
    await triggerDashboardUpdate(`Payment status changed to ${status} for session ${updatedSession.sessionNumber}`)

    const formattedSession = {
      ...updatedSession,
      processingStatus: updatedSession.processingStatus.toLowerCase(),
      paymentStatus: updatedSession.paymentStatus.toLowerCase(),
      oilWeight: Number(updatedSession.oilWeight),
      totalBoxWeight: Number(updatedSession.totalBoxWeight),
      totalPrice: Number(updatedSession.totalPrice),
      farmer: {
        ...updatedSession.farmer,
        type: updatedSession.farmer.type.toLowerCase(),
        pricePerKg: Number(updatedSession.farmer.pricePerKg)
      }
    }

    const message = status === 'paid' 
      ? 'Session marquée comme payée' 
      : 'Session marquée comme non payée'

    return NextResponse.json(
      createSuccessResponse(formattedSession, message)
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID de session invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error updating payment status:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour du statut de paiement'),
      { status: 500 }
    )
  }
}
