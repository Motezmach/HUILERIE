import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'
import { Decimal } from '@prisma/client/runtime/library'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/collections - Get all daily collections with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (groupId) {
      where.groupId = groupId
    }

    if (startDate || endDate) {
      where.collectionDate = {}
      if (startDate) {
        where.collectionDate.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.collectionDate.lte = end
      }
    }

    const collections = await prisma.dailyCollection.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        collectionDate: 'desc'
      }
    })

    return NextResponse.json(
      createSuccessResponse(collections, 'Collections récupérées avec succès')
    )
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des collections'),
      { status: 500 }
    )
  }
}

// POST /api/collections - Create a new daily collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      groupId, 
      collectionDate, 
      location, 
      clientName, 
      chakraCount, 
      galbaCount,
      nchiraChakraCount,
      nchiraGalbaCount,
      pricePerChakra,
      notes 
    } = body

    // Validate required fields
    if (!groupId || !collectionDate || !location || !clientName) {
      return NextResponse.json(
        createErrorResponse('Groupe, date, lieu et client sont requis'),
        { status: 400 }
      )
    }

    if (chakraCount === undefined || galbaCount === undefined) {
      return NextResponse.json(
        createErrorResponse('Chakra et galba sont requis'),
        { status: 400 }
      )
    }

    // Calculate total chakra (5 galba = 1 chakra) INCLUDING nchira
    const regularChakra = new Decimal(chakraCount).plus(new Decimal(galbaCount).dividedBy(5))
    const nchiraTotal = new Decimal(nchiraChakraCount || 0).plus(new Decimal(nchiraGalbaCount || 0).dividedBy(5))
    const totalChakra = regularChakra.plus(nchiraTotal)
    
    // Calculate price and total amount (default to 0 if not provided)
    const price = pricePerChakra ? new Decimal(pricePerChakra) : new Decimal(0)
    const totalAmount = totalChakra.times(price)

    const collection = await prisma.dailyCollection.create({
      data: {
        groupId,
        collectionDate: new Date(collectionDate),
        location: location.trim(),
        clientName: clientName.trim(),
        chakraCount: parseInt(chakraCount),
        galbaCount: parseInt(galbaCount),
        nchiraChakraCount: parseInt(nchiraChakraCount || 0),
        nchiraGalbaCount: parseInt(nchiraGalbaCount || 0),
        totalChakra,
        pricePerChakra: price,
        totalAmount,
        notes: notes?.trim() || null
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(
      createSuccessResponse(collection, 'Collection enregistrée avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création de la collection'),
      { status: 500 }
    )
  }
}

