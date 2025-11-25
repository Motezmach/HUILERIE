import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uuidSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  updateFarmerTotals
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = uuidSchema.parse(params.id)

    const existingSession = await prisma.processingSession.findUnique({
      where: { id: sessionId },
      include: {
        paymentTransactions: {
          orderBy: { createdAt: 'desc' }
        },
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

    if (existingSession.paymentStatus === 'UNPAID') {
      return NextResponse.json(
        createErrorResponse('Cette session n\'est pas payée'),
        { status: 400 }
      )
    }

    const paymentTransactions = existingSession.paymentTransactions
    const totalPaidAmount = Number(existingSession.amountPaid) || 0

    if (paymentTransactions.length === 0 || totalPaidAmount === 0) {
      return NextResponse.json(
        createErrorResponse('Aucun paiement à annuler'),
        { status: 400 }
      )
    }

    console.log('Unpaying session:', existingSession.sessionNumber)

    const result = await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.deleteMany({
        where: { sessionId: sessionId }
      })

      await tx.transaction.deleteMany({
        where: {
          sessionId: sessionId,
          type: 'FARMER_PAYMENT'
        }
      })

      const updatedSession = await tx.processingSession.update({
        where: { id: sessionId },
        data: {
          paymentStatus: 'UNPAID',
          paymentDate: null,
          amountPaid: 0,
          remainingAmount: 0,
          pricePerKg: null,
          totalPrice: null
        },
        include: {
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
              type: true
            }
          },
          paymentTransactions: true
        }
      })

      return updatedSession
    })

    await updateFarmerTotals(existingSession.farmerId, prisma)
    await triggerDashboardUpdate(`Session ${existingSession.sessionNumber} payment reverted`)

    const formattedSession = {
      ...result,
      totalBoxWeight: Number(result.totalBoxWeight),
      oilWeight: Number(result.oilWeight),
      pricePerKg: result.pricePerKg ? Number(result.pricePerKg) : null,
      totalPrice: result.totalPrice ? Number(result.totalPrice) : null,
      amountPaid: Number(result.amountPaid),
      remainingAmount: result.remainingAmount ? Number(result.remainingAmount) : null
    }

    return NextResponse.json(
      createSuccessResponse(
        formattedSession,
        `Paiement annulé avec succès. ${totalPaidAmount.toFixed(3)} DT retiré des revenus.`
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error unpaying session:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createErrorResponse('ID de session invalide'),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createErrorResponse('Erreur lors de l\'annulation du paiement'),
      { status: 500 }
    )
  }
}

