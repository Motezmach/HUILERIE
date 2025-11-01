import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET all payments or filter by groupId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    const payments = await prisma.collectorPayment.findMany({
      where: groupId ? { groupId } : undefined,
      include: {
        group: true
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST - Create new payment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { groupId, amount, notes } = body

    if (!groupId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'groupId and amount are required' },
        { status: 400 }
      )
    }

    const payment = await prisma.collectorPayment.create({
      data: {
        groupId,
        amount: parseFloat(amount.toString()),
        notes: notes || null,
        paymentDate: new Date()
      },
      include: {
        group: true
      }
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete payment
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

    await prisma.collectorPayment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete payment' },
      { status: 500 }
    )
  }
}


