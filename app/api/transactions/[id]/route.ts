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

    // Don't allow deletion of farmer payment transactions (they're auto-generated)
    if (transaction.type === 'FARMER_PAYMENT') {
      return NextResponse.json(
        createErrorResponse('Les paiements des agriculteurs ne peuvent pas être supprimés manuellement'),
        { status: 400 }
      )
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

