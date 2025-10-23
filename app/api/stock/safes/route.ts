import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/stock/safes - Get all safes
export async function GET(request: NextRequest) {
  try {
    const safes = await prisma.oilSafe.findMany({
      include: {
        purchases: {
          orderBy: {
            purchaseDate: 'desc'
          }
        },
        sales: {
          orderBy: {
            saleDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Format response
    const formattedSafes = safes.map(safe => ({
      id: safe.id,
      name: safe.name,
      capacity: Number(safe.capacity),
      currentStock: Number(safe.currentStock),
      description: safe.description,
      isActive: safe.isActive,
      availableCapacity: Number(safe.capacity) - Number(safe.currentStock),
      utilizationPercentage: Number(safe.capacity) > 0 
        ? (Number(safe.currentStock) / Number(safe.capacity)) * 100 
        : 0,
      purchaseCount: safe.purchases.length,
      saleCount: safe.sales.length,
      pendingOilCount: safe.purchases.filter(p => !p.oilProduced).length,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt
    }))

    return NextResponse.json(
      createSuccessResponse(formattedSafes, 'Coffres récupérés avec succès')
    )
  } catch (error) {
    console.error('Error fetching safes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des coffres'),
      { status: 500 }
    )
  }
}

// POST /api/stock/safes - Create new safe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, capacity, description } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        createErrorResponse('Le nom du coffre est requis'),
        { status: 400 }
      )
    }

    if (!capacity || capacity <= 0) {
      return NextResponse.json(
        createErrorResponse('La capacité doit être supérieure à 0'),
        { status: 400 }
      )
    }

    // Check if name already exists
    const existing = await prisma.oilSafe.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        createErrorResponse('Un coffre avec ce nom existe déjà'),
        { status: 400 }
      )
    }

    // Create safe
    const safe = await prisma.oilSafe.create({
      data: {
        name: name.trim(),
        capacity: capacity,
        description: description?.trim() || null
      }
    })

    const formattedSafe = {
      id: safe.id,
      name: safe.name,
      capacity: Number(safe.capacity),
      currentStock: Number(safe.currentStock),
      description: safe.description,
      isActive: safe.isActive,
      availableCapacity: Number(safe.capacity),
      utilizationPercentage: 0,
      purchaseCount: 0,
      saleCount: 0,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt
    }

    return NextResponse.json(
      createSuccessResponse(formattedSafe, 'Coffre créé avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating safe:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création du coffre'),
      { status: 500 }
    )
  }
}


