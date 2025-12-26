import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateSessionSchema, uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  updateFarmerTotals
} from '@/lib/utils'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/sessions/[id] - Get single session with details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)
    
    const session = await prisma.processingSession.findUnique({
      where: { id: sessionId },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            nickname: true,
            phone: true,
            type: true,
            pricePerKg: true
          }
        },
        sessionBoxes: {
          include: {
            box: true
          },
          orderBy: {
            box: { id: 'asc' }
          }
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        createErrorResponse('Session non trouvée'),
        { status: 404 }
      )
    }

    // Format response data
    const formattedSession = {
      ...session,
      processingStatus: session.processingStatus.toLowerCase(),
      paymentStatus: session.paymentStatus.toLowerCase(),
      oilWeight: Number(session.oilWeight),
      totalBoxWeight: Number(session.totalBoxWeight),
      totalPrice: Number(session.totalPrice),
      pricePerKg: Number(session.pricePerKg || 0), // Use session's pricePerKg, not farmer's
      farmer: {
        ...session.farmer,
        type: session.farmer.type.toLowerCase(),
        pricePerKg: Number(session.farmer.pricePerKg)
      },
      sessionBoxes: session.sessionBoxes.map((sb: any) => ({
        ...sb,
        boxWeight: Number(sb.boxWeight),
        boxType: sb.boxType.toLowerCase(),
        box: {
          ...sb.box,
          type: sb.box.type.toLowerCase(),
          weight: Number(sb.box.weight)
        }
      }))
    }

    return NextResponse.json(
      createSuccessResponse(formattedSession, 'Session récupérée avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID de session invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error fetching session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération de la session'),
      { status: 500 }
    )
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)
    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

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

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.oilWeight !== undefined) {
      updateData.oilWeight = validatedData.oilWeight
    }
    
    if (validatedData.processingDate) {
      updateData.processingDate = new Date(validatedData.processingDate)
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    
    if (validatedData.processingStatus) {
      updateData.processingStatus = validatedData.processingStatus.toUpperCase()
    }
    
    if (validatedData.paymentStatus) {
      updateData.paymentStatus = validatedData.paymentStatus.toUpperCase()
      
      // Set payment date if marking as paid
      if (validatedData.paymentStatus === 'paid') {
        // Preserve existing paymentDate if already set, otherwise use current date
        updateData.paymentDate = existingSession.paymentDate || new Date()
      } else if (validatedData.paymentStatus === 'unpaid') {
        updateData.paymentDate = null
      }
    }

    // Update session
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

    // Update farmer totals if payment status changed
    if (validatedData.paymentStatus) {
      await updateFarmerTotals(updatedSession.farmerId, prisma)
    }

    const formattedSession = {
      ...updatedSession,
      processingStatus: updatedSession.processingStatus.toLowerCase(),
      paymentStatus: updatedSession.paymentStatus.toLowerCase(),
      oilWeight: Number(updatedSession.oilWeight),
      totalBoxWeight: Number(updatedSession.totalBoxWeight),
      totalPrice: Number(updatedSession.totalPrice),
      pricePerKg: Number(updatedSession.pricePerKg || 0), // Use session's pricePerKg, not farmer's
      farmer: {
        ...updatedSession.farmer,
        type: updatedSession.farmer.type.toLowerCase(),
        pricePerKg: Number(updatedSession.farmer.pricePerKg)
      }
    }

    return NextResponse.json(
      createSuccessResponse(formattedSession, 'Session mise à jour avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error updating session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de la session'),
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)

    // Check if session exists
    const existingSession = await prisma.processingSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionBoxes: true
      }
    })

    if (!existingSession) {
      return NextResponse.json(
        createErrorResponse('Session non trouvée'),
        { status: 404 }
      )
    }

    // Check if session is paid (prevent deletion of paid sessions only)
    if (existingSession.paymentStatus === 'PAID') {
      return NextResponse.json(
        createErrorResponse('Impossible de supprimer une session payée. Veuillez d\'abord rembourser le client.'),
        { status: 400 }
      )
    }

    // Calculate refund information for partial payments
    const refundAmount = Number(existingSession.amountPaid || 0)
    const wasPartiallyPaid = existingSession.paymentStatus === 'PARTIAL' && refundAmount > 0

    console.log('🗑️ Session Deletion Info:', {
      sessionId: sessionId,
      sessionNumber: existingSession.sessionNumber,
      farmerId: existingSession.farmerId,
      paymentStatus: existingSession.paymentStatus,
      totalPrice: existingSession.totalPrice,
      amountPaid: existingSession.amountPaid,
      refundAmount: refundAmount,
      wasPartiallyPaid: wasPartiallyPaid,
      boxCount: existingSession.sessionBoxes.length
    })

    // Delete session in transaction (will also restore boxes)
    await prisma.$transaction(async (tx: any) => {
      // Get box IDs from session
      const boxIds = existingSession.sessionBoxes.map((sb: any) => sb.boxId)

      console.log('📦 Releasing boxes:', boxIds)

      // Restore boxes to available state (remove assignment)
      if (boxIds.length > 0) {
      await tx.box.updateMany({
        where: { id: { in: boxIds } },
        data: {
            status: 'AVAILABLE',
            currentFarmerId: null,
            currentWeight: null,
            assignedAt: null,
            isSelected: false
        }
      })
      }

      // Delete associated revenue transactions (FARMER_PAYMENT records)
      await tx.transaction.deleteMany({
        where: { 
          sessionId: sessionId,
          type: 'FARMER_PAYMENT'
        }
      })
      console.log('💰 Deleted associated FARMER_PAYMENT transactions')

      // Delete session (cascades to sessionBoxes and paymentTransactions)
      await tx.processingSession.delete({
        where: { id: sessionId }
      })

      console.log('✅ Session deleted successfully')
    })

    // Update farmer totals after session deletion
    console.log('🔄 Updating farmer totals after session deletion...')
    await updateFarmerTotals(existingSession.farmerId, prisma)

    // Prepare response message
    let successMessage = 'Session supprimée avec succès'
    if (wasPartiallyPaid) {
      successMessage += ` - Remboursement nécessaire: ${refundAmount.toFixed(2)} DT`
    }
    if (existingSession.sessionBoxes.length > 0) {
      successMessage += ` - ${existingSession.sessionBoxes.length} boîtes libérées`
    }

    return NextResponse.json(
      createSuccessResponse({
        deletedSessionId: sessionId,
        refundAmount: refundAmount,
        wasPartiallyPaid: wasPartiallyPaid,
        boxesReleased: existingSession.sessionBoxes.length
      }, successMessage)
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('ID de session invalide'),
        { status: 400 }
      )
    }
    
    console.error('Error deleting session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de la session'),
      { status: 500 }
    )
  }
}
