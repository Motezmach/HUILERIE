import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse
} from '@/lib/utils'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/sessions/[id]/reset - Reset session status to PENDING (for testing)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)

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

    // Reset session to pending status
    const updatedSession = await prisma.processingSession.update({
      where: { id: sessionId },
      data: {
        processingStatus: 'PENDING',
        oilWeight: 0,
        processingDate: null
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    return NextResponse.json(
      createSuccessResponse({
        ...updatedSession,
        processingStatus: updatedSession.processingStatus.toLowerCase(),
        paymentStatus: updatedSession.paymentStatus.toLowerCase()
      }, 'Session réinitialisée pour le test')
    )
  } catch (error) {
    console.error('Error resetting session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la réinitialisation de la session'),
      { status: 500 }
    )
  }
}
