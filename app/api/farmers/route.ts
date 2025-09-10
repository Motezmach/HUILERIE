import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createFarmerSchema, farmersQuerySchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createPaginatedResponse
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

// GET /api/farmers - Retrieve all farmers with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = farmersQuerySchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const where: any = {}
    
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }
    
    if (query.type !== 'all') {
      where.type = query.type.toUpperCase()
    }
    
    if (query.paymentStatus !== 'all') {
      where.paymentStatus = query.paymentStatus.toUpperCase()
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (query.sortBy === 'name') orderBy.name = query.sortOrder
    else if (query.sortBy === 'dateAdded') orderBy.dateAdded = query.sortOrder
    else if (query.sortBy === 'totalAmountDue') orderBy.totalAmountDue = query.sortOrder
    else if (query.sortBy === 'type') orderBy.type = query.sortOrder

    // Execute queries
    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          currentBoxes: query.includeBoxes ? true : false,
          processingSessions: query.includeSessions ? {
            orderBy: { createdAt: 'desc' }
          } : false
        },
        orderBy
      }),
      prisma.farmer.count({ where })
    ])

    // Format response data
    const formattedFarmers = farmers.map((farmer: any) => ({
      ...farmer,
      type: farmer.type.toLowerCase(),
      paymentStatus: farmer.paymentStatus.toLowerCase(),
      pricePerKg: Number(farmer.pricePerKg),
      totalAmountDue: Number(farmer.totalAmountDue),
      totalAmountPaid: Number(farmer.totalAmountPaid),
      boxes: query.includeBoxes ? farmer.currentBoxes?.map((box: any) => ({
        ...box,
        type: box.type.toLowerCase(),
        weight: Number(box.currentWeight || 0),
        selected: box.isSelected || false,
        status: box.status.toLowerCase(),
        currentFarmerId: box.currentFarmerId
      })) || [] : undefined,
      processingSessions: query.includeSessions ? farmer.processingSessions?.map((session: any) => ({
        ...session,
        processingStatus: session.processingStatus.toLowerCase(),
        paymentStatus: session.paymentStatus.toLowerCase(),
        oilWeight: Number(session.oilWeight),
        totalBoxWeight: Number(session.totalBoxWeight),
        totalPrice: Number(session.totalPrice)
      })) || [] : undefined
    }))

    return NextResponse.json(
      createPaginatedResponse(formattedFarmers, total, query.page, query.limit)
    )
  } catch (error) {
    console.error('Error fetching farmers:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des agriculteurs'),
      { status: 500 }
    )
  }
}

// POST /api/farmers - Create a new farmer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createFarmerSchema.parse(body)
    
    const farmer = await prisma.farmer.create({
      data: {
        name: validatedData.name,
        nickname: validatedData.nickname || null,
        phone: validatedData.phone || null,
        type: validatedData.type.toUpperCase() as any,
        // pricePerKg is now nullable - no default value set
      }
    })

    const formattedFarmer = {
      ...farmer,
      type: farmer.type.toLowerCase(),
      paymentStatus: farmer.paymentStatus.toLowerCase(),
      pricePerKg: Number(farmer.pricePerKg),
      totalAmountDue: Number(farmer.totalAmountDue),
      totalAmountPaid: Number(farmer.totalAmountPaid)
    }

    await triggerDashboardUpdate(`New farmer added: ${farmer.name}`)

    return NextResponse.json(
      createSuccessResponse(formattedFarmer, 'Agriculteur créé avec succès'),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error creating farmer:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création de l\'agriculteur'),
      { status: 500 }
    )
  }
}
