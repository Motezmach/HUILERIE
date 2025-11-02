import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET all employee payments or filter by employeeId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const payments = await prisma.employeePayment.findMany({
      where: employeeId ? { employeeId } : undefined,
      include: {
        employee: true
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error: any) {
    console.error('Error fetching employee payments:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST - Create new employee payment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, amount, notes } = body

    if (!employeeId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'employeeId and amount are required' },
        { status: 400 }
      )
    }

    const payment = await prisma.employeePayment.create({
      data: {
        employeeId,
        amount: parseFloat(amount.toString()),
        notes: notes || null,
        paymentDate: new Date()
      },
      include: {
        employee: true
      }
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error: any) {
    console.error('Error creating employee payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete employee payment
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    await prisma.employeePayment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting employee payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete payment' },
      { status: 500 }
    )
  }
}

