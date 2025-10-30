import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper functions
const createSuccessResponse = (data: any, message?: string) => ({
  success: true,
  data,
  message
})

const createErrorResponse = (error: string) => ({
  success: false,
  error
})

// GET - Fetch all transactions with optional date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let whereClause: any = {}

    // Apply date filters
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.transactionDate = {
        gte: startOfDay,
        lte: endOfDay
      }
    } else if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)

      whereClause.transactionDate = {
        gte: startDate,
        lte: endDate
      }
    } else if (dateFrom) {
      const startDate = new Date(dateFrom)
      startDate.setHours(0, 0, 0, 0)

      whereClause.transactionDate = {
        gte: startDate
      }
    } else if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)

      whereClause.transactionDate = {
        lte: endDate
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: {
        transactionDate: 'desc'
      }
    })

    // Calculate totals
    const totals = {
      farmerPayments: 0,
      debits: 0,
      credits: 0,
      netRevenue: 0
    }

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount)
      
      if (transaction.type === 'FARMER_PAYMENT') {
        totals.farmerPayments += amount
      } else if (transaction.type === 'DEBIT') {
        totals.debits += amount
      } else if (transaction.type === 'CREDIT') {
        totals.credits += Math.abs(amount) // Credits are stored as negative
      }
    })

    totals.netRevenue = totals.farmerPayments + totals.debits - totals.credits

    return NextResponse.json(
      createSuccessResponse({
        transactions,
        totals
      })
    )
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des transactions'),
      { status: 500 }
    )
  }
}

// POST - Create a new transaction (debit or credit)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, description, destination, createdBy } = body

    // Validation
    if (!type || !['DEBIT', 'CREDIT'].includes(type)) {
      return NextResponse.json(
        createErrorResponse('Type de transaction invalide'),
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        createErrorResponse('Le montant doit être supérieur à 0'),
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        createErrorResponse('La description est requise'),
        { status: 400 }
      )
    }

    // For credits, store as negative amount
    const finalAmount = type === 'CREDIT' ? -Math.abs(amount) : Math.abs(amount)

    const transaction = await prisma.transaction.create({
      data: {
        type: type,
        amount: finalAmount,
        description: description.trim(),
        destination: destination?.trim() || null,
        createdBy: createdBy || null,
        transactionDate: new Date()
      }
    })

    return NextResponse.json(
      createSuccessResponse(transaction, 'Transaction créée avec succès')
    )
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création de la transaction'),
      { status: 500 }
    )
  }
}

