import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/sessions/bulk-payment - Create one combined session from multiple sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      farmerId,
      sessionIds,
      pricePerKg,
      amountPaid,
      paymentDate,
      totalBoxWeight,
      totalOilWeight,
      boxCount,
      boxIds
    } = body

    // Validation
    if (!farmerId || !sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        createErrorResponse('Données invalides: farmerId et sessionIds requis'),
        { status: 400 }
      )
    }

    if (!pricePerKg || pricePerKg <= 0) {
      return NextResponse.json(
        createErrorResponse('Prix par kg requis et doit être supérieur à 0'),
        { status: 400 }
      )
    }

    if (amountPaid === undefined || amountPaid === null || amountPaid < 0) {
      return NextResponse.json(
        createErrorResponse('Montant payé requis et doit être supérieur ou égal à 0'),
        { status: 400 }
      )
    }

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Calculate total price and determine payment status
    const totalPrice = totalBoxWeight * pricePerKg
    const remainingAmount = totalPrice - amountPaid
    const paymentStatus = amountPaid >= totalPrice ? 'PAID' : (amountPaid > 0 ? 'PARTIAL' : 'UNPAID')

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get all sessions to combine
      const sessionsToDelete = await tx.processingSession.findMany({
        where: {
          id: { in: sessionIds },
          farmerId: farmerId
        },
        include: {
          sessionBoxes: true
        }
      })

      if (sessionsToDelete.length !== sessionIds.length) {
        throw new Error('Une ou plusieurs sessions non trouvées')
      }

      // Collect all session boxes data and handle duplicates
      const allSessionBoxes = sessionsToDelete.flatMap(session => 
        session.sessionBoxes.map(sb => ({
          boxId: sb.boxId,
          boxWeight: sb.boxWeight,
          boxType: sb.boxType,
          farmerId: sb.farmerId
        }))
      )

      // Remove duplicate boxes and sum their weights
      // (if same box used in multiple sessions, combine the weights)
      const uniqueBoxes = allSessionBoxes.reduce((acc, box) => {
        const existing = acc.find(b => b.boxId === box.boxId)
        if (existing) {
          // Box already exists, add the weight
          existing.boxWeight = Number(existing.boxWeight) + Number(box.boxWeight)
        } else {
          // New box, add it
          acc.push({ ...box })
        }
        return acc
      }, [] as Array<{ boxId: string; boxWeight: any; boxType: any; farmerId: string }>)

      console.log('📦 Box deduplication:', {
        totalBoxes: allSessionBoxes.length,
        uniqueBoxes: uniqueBoxes.length,
        duplicatesRemoved: allSessionBoxes.length - uniqueBoxes.length
      })

      // Collect and combine all notes from the sessions
      const sessionsWithNotes = sessionsToDelete.filter(session => session.notes && session.notes.trim())
      
      let finalNotes = ''
      if (sessionsWithNotes.length > 0) {
        // Combine all notes with session identification
        finalNotes = sessionsWithNotes
          .map(session => `Note session ${session.sessionNumber}:\n${session.notes}`)
          .join('\n\n')
      } else {
        // Default message if no notes
        finalNotes = `Session groupée de ${sessionIds.length} sessions`
      }

      console.log('📝 Combining notes:', {
        totalSessions: sessionsToDelete.length,
        sessionsWithNotes: sessionsWithNotes.length,
        combinedNotesLength: finalNotes.length,
        preview: finalNotes.substring(0, 100)
      })

      // Generate new session number (use first session's number + " (Groupé)")
      const firstSessionNumber = sessionsToDelete[0].sessionNumber
      const newSessionNumber = `${firstSessionNumber.split(' ')[0]} (Groupé)`

      // Create the combined session
      const combinedSession = await tx.processingSession.create({
        data: {
          farmerId: farmerId,
          sessionNumber: newSessionNumber,
          processingDate: new Date(),
          oilWeight: totalOilWeight,
          totalBoxWeight: totalBoxWeight,
          boxCount: boxCount,
          totalPrice: totalPrice,
          pricePerKg: pricePerKg,
          amountPaid: amountPaid,
          remainingAmount: remainingAmount,
          processingStatus: 'PROCESSED',
          paymentStatus: paymentStatus,
          paymentDate: paymentDate ? new Date(paymentDate) : (paymentStatus === 'PAID' ? new Date() : null),
          notes: finalNotes
        }
      })

      // Create session boxes for the combined session (using deduplicated boxes)
      await tx.sessionBox.createMany({
        data: uniqueBoxes.map(sb => ({
          sessionId: combinedSession.id,
          boxId: sb.boxId,
          boxWeight: Number(sb.boxWeight),
          boxType: sb.boxType,
          farmerId: sb.farmerId
        }))
      })

      // If there are payment transactions in the old sessions, we might want to note them
      // For now, we'll create one payment transaction for the combined session
      if (amountPaid > 0) {
        await tx.paymentTransaction.create({
          data: {
            sessionId: combinedSession.id,
            amount: amountPaid,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod: 'Paiement groupé',
            notes: `Paiement groupé pour ${sessionIds.length} sessions`
          }
        })

        // Create revenue transaction for tracking (FARMER_PAYMENT)
        await tx.transaction.create({
          data: {
            type: 'FARMER_PAYMENT',
            amount: amountPaid,
            description: `Paiement groupé session ${newSessionNumber} (${sessionIds.length} sessions)`,
            farmerName: farmer.name,
            farmerId: farmerId,
            sessionId: combinedSession.id,
            transactionDate: new Date()
          }
        })
      }

      // Delete the old sessions (cascade will delete session boxes and payment transactions)
      await tx.processingSession.deleteMany({
        where: {
          id: { in: sessionIds }
        }
      })

      // Update farmer's totals
      const farmerSessions = await tx.processingSession.findMany({
        where: { farmerId: farmerId }
      })

      const totalAmountDue = farmerSessions.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0)
      const totalAmountPaid = farmerSessions.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0)
      const farmerPaymentStatus = totalAmountPaid >= totalAmountDue ? 'PAID' : (totalAmountPaid > 0 ? 'PARTIAL' : 'PENDING')

      await tx.farmer.update({
        where: { id: farmerId },
        data: {
          totalAmountDue: totalAmountDue,
          totalAmountPaid: totalAmountPaid,
          paymentStatus: farmerPaymentStatus
        }
      })

      return combinedSession
    })

    return NextResponse.json(
      createSuccessResponse(result, 'Sessions groupées avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating bulk payment:', error)
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erreur lors du paiement groupé'),
      { status: 500 }
    )
  }
}

