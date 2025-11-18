import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { completeSessionSchema, uuidSchema } from '@/lib/validations'
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

// PUT /api/sessions/[id]/complete - Complete processing session
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)
    const body = await request.json()
    const { oilWeight, oilUnit, processingDate, paymentDate, notes } = body

    // Check if session exists
    const existingSession = await prisma.processingSession.findUnique({
      where: { id: sessionId },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerKg: true
          }
        },
        sessionBoxes: {
          include: {
            box: true
          }
        }
      }
    })

    if (!existingSession) {
      return NextResponse.json(
        createErrorResponse('Session non trouvée'),
        { status: 404 }
      )
    }

    // Check if session is already paid (prevent editing paid sessions)
    if (existingSession.paymentStatus === 'PAID') {
      return NextResponse.json(
        createErrorResponse('Session déjà payée - modification impossible'),
        { status: 400 }
      )
    }

    // Use database transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
    // Update session to completed
      const updateData: any = {
        oilWeight,
        oilUnit: oilUnit || 'kg', // Default to kg if not provided
        processingDate: new Date(processingDate),
        processingStatus: 'PROCESSED'
      }

      // IMPORTANT: Only update payment date if provided, but DON'T change payment status
      // Payment status should only be changed through the payment endpoints
      if (paymentDate) {
        updateData.paymentDate = new Date(paymentDate)
        // DO NOT set paymentStatus here - it's managed separately via payment flow
      }

      // Add notes if provided
      if (notes !== undefined) {
        updateData.notes = notes || null
      }

      const updatedSession = await tx.processingSession.update({
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
        },
        sessionBoxes: {
          include: {
            box: true
          }
        }
      }
      })

      // Note: Boxes are already AVAILABLE since session creation
      // No need to change box status here - they were made available when session was created
      // This maintains the professional box management workflow

      return updatedSession
    })

    // Update farmer totals
    await updateFarmerTotals(existingSession.farmerId, prisma)

    // Format response data
    const formattedSession = {
      ...result,
      processingStatus: result.processingStatus.toLowerCase(),
      paymentStatus: result.paymentStatus.toLowerCase(),
      oilWeight: Number(result.oilWeight),
      totalBoxWeight: Number(result.totalBoxWeight),
      totalPrice: Number(result.totalPrice),
      pricePerKg: Number(result.pricePerKg || 0), // Use session's pricePerKg, not farmer's
      farmer: {
        ...result.farmer,
        type: result.farmer.type.toLowerCase(),
        pricePerKg: Number(result.farmer.pricePerKg)
      },
      sessionBoxes: result.sessionBoxes.map((sb: any) => ({
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
      createSuccessResponse(formattedSession, 'Session de traitement terminée avec succès')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error completing session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la finalisation de la session'),
      { status: 500 }
    )
  }
}
