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

// PUT /api/sessions/[id]/payment - Process payment with flexible pricing
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)
    const body = await request.json()
    const { pricePerKg, amountPaid, paymentMethod, notes } = body

    // Validate required fields
    if (!pricePerKg || pricePerKg <= 0) {
      return NextResponse.json(
        createErrorResponse('Prix par kg requis et doit être supérieur à 0'),
        { status: 400 }
      )
    }

    if (amountPaid === undefined || amountPaid === null || amountPaid < 0) {
      console.error('❌ Payment validation error:', {
        amountPaid,
        pricePerKg,
        body
      })
      return NextResponse.json(
        createErrorResponse('Montant payé requis et doit être supérieur ou égal à 0'),
        { status: 400 }
      )
    }

    console.log('✅ Payment validation passed:', {
      sessionId,
      pricePerKg,
      amountPaid,
      paymentMethod,
      notes
    })

    // Check if session exists
    const existingSession = await prisma.processingSession.findUnique({
      where: { id: sessionId },
      include: {
        paymentTransactions: true,
        farmer: {
          select: {
            id: true,
            name: true
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

    // Check if session is processed (can only pay processed sessions)
    const isProcessed = existingSession.processingStatus === 'PROCESSED' || Number(existingSession.oilWeight) > 0
    if (!isProcessed) {
      return NextResponse.json(
        createErrorResponse('Impossible de traiter le paiement d\'une session non traitée'),
        { status: 400 }
      )
    }

    // Calculate total price based on weight and price per kg
    const totalPrice = Number(existingSession.totalBoxWeight) * Number(pricePerKg)
    
    // Calculate current total paid amount
    const currentPaidAmount = Number(existingSession.amountPaid) || 0
    const newTotalPaid = currentPaidAmount + Number(amountPaid)
    
    // Validate payment doesn't exceed total
    if (newTotalPaid > totalPrice) {
      return NextResponse.json(
        createErrorResponse(`Le montant payé (${newTotalPaid.toFixed(2)} DT) dépasse le total dû (${totalPrice.toFixed(2)} DT)`),
        { status: 400 }
      )
    }

    // Determine payment status
    let paymentStatus: string
    if (newTotalPaid >= totalPrice) {
      paymentStatus = 'PAID'  // Full payment
    } else {
      paymentStatus = 'PARTIAL'  // Partial payment
    }

    // Calculate remaining amount
    const remainingAmount = Math.max(0, totalPrice - newTotalPaid)

    // Use database transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create payment transaction record
      await tx.paymentTransaction.create({
        data: {
          sessionId: sessionId,
          amount: Number(amountPaid),
          paymentMethod: paymentMethod || null,
          notes: notes || null
        }
      })

      // Create revenue transaction for tracking (FARMER_PAYMENT)
      await tx.transaction.create({
        data: {
          type: 'FARMER_PAYMENT',
          amount: Number(amountPaid),
          description: `Paiement session ${existingSession.sessionNumber}`,
          farmerName: existingSession.farmer?.name || 'Agriculteur',
          farmerId: existingSession.farmerId,
          sessionId: sessionId,
          transactionDate: new Date()
        }
      })

      // Update session with pricing and payment info
      const updateData: any = {
        pricePerKg: Number(pricePerKg),
        totalPrice: totalPrice,
        amountPaid: newTotalPaid,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus
      }

      // Set payment date only when fully paid
      if (paymentStatus === 'PAID') {
        updateData.paymentDate = new Date()
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
              type: true
            }
          },
          paymentTransactions: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      return updatedSession
    })

    // Update farmer totals
    await updateFarmerTotals(existingSession.farmerId, prisma)

    // Trigger dashboard update
    await triggerDashboardUpdate(`Payment processed for session ${existingSession.sessionNumber}`)

    // Format response
    const formattedSession = {
      ...result,
      paymentStatus: result.paymentStatus.toLowerCase(),
      processingStatus: result.processingStatus.toLowerCase(),
      oilWeight: Number(result.oilWeight),
      totalBoxWeight: Number(result.totalBoxWeight),
      totalPrice: Number(result.totalPrice),
      pricePerKg: Number(result.pricePerKg),
      amountPaid: Number(result.amountPaid),
      remainingAmount: Number(result.remainingAmount),
      farmer: {
        ...result.farmer,
        type: result.farmer.type.toLowerCase()
      }
    }

    console.log('🔍 Payment API Response Debug:', {
      sessionId: sessionId,
      totalPrice: formattedSession.totalPrice,
      amountPaid: formattedSession.amountPaid,
      remainingAmount: formattedSession.remainingAmount,
      paymentStatus: formattedSession.paymentStatus,
      rawResult: {
        totalPrice: result.totalPrice,
        amountPaid: result.amountPaid,
        remainingAmount: result.remainingAmount,
        paymentStatus: result.paymentStatus
      }
    })

    const message = paymentStatus === 'PAID' 
      ? 'Paiement complet effectué avec succès!'
      : `Paiement partiel de ${amountPaid} DT enregistré. Reste à payer: ${remainingAmount.toFixed(2)} DT`

    return NextResponse.json(
      createSuccessResponse(formattedSession, message)
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error processing payment:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors du traitement du paiement'),
      { status: 500 }
    )
  }
}

