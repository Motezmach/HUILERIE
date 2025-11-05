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

// DELETE - Delete an employee payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if payment exists
    const payment = await prisma.employeePayment.findUnique({
      where: { id }
    })

    if (!payment) {
      return NextResponse.json(
        createErrorResponse('Paiement non trouvé'),
        { status: 404 }
      )
    }

    await prisma.employeePayment.delete({
      where: { id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Paiement supprimé avec succès')
    )
  } catch (error) {
    console.error('Error deleting employee payment:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression du paiement'),
      { status: 500 }
    )
  }
}

