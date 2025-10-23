import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/stock/safes/[id] - Get single safe with details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const safe = await prisma.oilSafe.findUnique({
      where: { id: params.id },
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
      }
    })

    if (!safe) {
      return NextResponse.json(
        createErrorResponse('Coffre non trouvé'),
        { status: 404 }
      )
    }

    const formattedSafe = {
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
      purchases: safe.purchases.map(p => ({
        ...p,
        oliveWeight: Number(p.oliveWeight),
        pricePerKg: Number(p.pricePerKg),
        totalCost: Number(p.totalCost),
        oilProduced: Number(p.oilProduced),
        yieldPercentage: Number(p.yieldPercentage)
      })),
      sales: safe.sales.map(s => ({
        ...s,
        quantity: Number(s.quantity),
        pricePerKg: Number(s.pricePerKg),
        totalRevenue: Number(s.totalRevenue)
      })),
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt
    }

    return NextResponse.json(
      createSuccessResponse(formattedSafe, 'Coffre récupéré avec succès')
    )
  } catch (error) {
    console.error('Error fetching safe:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération du coffre'),
      { status: 500 }
    )
  }
}

// PUT /api/stock/safes/[id] - Update safe
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { name, capacity, description, isActive } = body

    // Check if safe exists
    const existing = await prisma.oilSafe.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Coffre non trouvé'),
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (capacity !== undefined) {
      // Don't allow capacity reduction below current stock
      if (capacity < Number(existing.currentStock)) {
        return NextResponse.json(
          createErrorResponse(`La capacité ne peut pas être inférieure au stock actuel (${Number(existing.currentStock)} kg)`),
          { status: 400 }
        )
      }
      updateData.capacity = capacity
    }
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const safe = await prisma.oilSafe.update({
      where: { id: params.id },
      data: updateData
    })

    const formattedSafe = {
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
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt
    }

    return NextResponse.json(
      createSuccessResponse(formattedSafe, 'Coffre mis à jour avec succès')
    )
  } catch (error) {
    console.error('Error updating safe:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour du coffre'),
      { status: 500 }
    )
  }
}

// DELETE /api/stock/safes/[id] - Delete safe
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const safe = await prisma.oilSafe.findUnique({
      where: { id: params.id },
      include: {
        purchases: true,
        sales: true
      }
    })

    if (!safe) {
      return NextResponse.json(
        createErrorResponse('Coffre non trouvé'),
        { status: 404 }
      )
    }

    // Don't allow deletion if there's stock or transactions
    if (Number(safe.currentStock) > 0) {
      return NextResponse.json(
        createErrorResponse('Impossible de supprimer un coffre contenant du stock'),
        { status: 400 }
      )
    }

    if (safe.purchases.length > 0 || safe.sales.length > 0) {
      return NextResponse.json(
        createErrorResponse('Impossible de supprimer un coffre avec un historique de transactions'),
        { status: 400 }
      )
    }

    await prisma.oilSafe.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Coffre supprimé avec succès')
    )
  } catch (error) {
    console.error('Error deleting safe:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression du coffre'),
      { status: 500 }
    )
  }
}



