import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const createSuccessResponse = (data: any, message?: string) => ({
  success: true,
  data,
  message
})

const createErrorResponse = (error: string) => ({
  success: false,
  error
})

// DELETE - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    })

    if (!transaction) {
      return NextResponse.json(
        createErrorResponse('Transaction non trouvée'),
        { status: 404 }
      )
    }

    // Allow deletion of orphaned farmer payment transactions
    // (where session or farmer no longer exists)
    if (transaction.type === 'FARMER_PAYMENT') {
      // Check if session still exists
      if (transaction.sessionId) {
        const sessionExists = await prisma.processingSession.findUnique({
          where: { id: transaction.sessionId }
        })
        
        if (sessionExists) {
          return NextResponse.json(
            createErrorResponse('Cette transaction est liée à une session active. Supprimez d\'abord la session.'),
            { status: 400 }
          )
        }
      }
      
      // If session doesn't exist, it's orphaned - allow deletion
      console.log('🧹 Deleting orphaned FARMER_PAYMENT transaction:', transaction.id)
    }

    await prisma.transaction.delete({
      where: { id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Transaction supprimée avec succès')
    )
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de la transaction'),
      { status: 500 }
    )
  }
}

