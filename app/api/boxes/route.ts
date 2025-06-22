import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { boxesQuerySchema, bulkSelectionSchema, createBoxSchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createPaginatedResponse,
  validateBoxId
} from '@/lib/utils'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

// GET /api/boxes - Get all boxes with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = boxesQuerySchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const where: any = {}
    
    // Filter by current farmer assignment (new box system)
    if (query.farmerId) {
      where.currentFarmerId = query.farmerId
    }
    
    if (query.type !== 'all') {
      where.type = query.type.toUpperCase()
    }
    
    // Filter by box status (AVAILABLE or IN_USE)
    if (query.status && query.status !== 'all') {
      where.status = query.status
    }
    
    if (query.isSelected !== undefined) {
      where.isSelected = query.isSelected
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (query.sortBy === 'id') {
      // For numeric IDs, sort as numbers
      orderBy.id = query.sortOrder
    } else if (query.sortBy === 'weight') {
      orderBy.currentWeight = query.sortOrder
    } else if (query.sortBy === 'type') {
      orderBy.type = query.sortOrder
    } else if (query.sortBy === 'createdAt') {
      orderBy.createdAt = query.sortOrder
    }

    // Build include clause
    const include: any = {}
    if (query.includeCurrentFarmer) {
      include.currentFarmer = {
        select: {
          id: true,
          name: true,
          type: true,
          pricePerKg: true,
          phone: true
        }
      }
    }

    // Execute queries
    const [boxes, total] = await Promise.all([
      prisma.box.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include,
        orderBy
      }),
      prisma.box.count({ where })
    ])

    // Format response data
    const formattedBoxes = boxes.map((box: any) => ({
      id: box.id,
      type: box.type.toLowerCase(),
      status: box.status.toLowerCase(),
      currentFarmerId: box.currentFarmerId,
      currentWeight: box.currentWeight ? Number(box.currentWeight) : null,
      assignedAt: box.assignedAt,
      isSelected: box.isSelected,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
      currentFarmer: box.currentFarmer ? {
        id: box.currentFarmer.id,
        name: box.currentFarmer.name,
        type: box.currentFarmer.type.toLowerCase(),
        pricePerKg: Number(box.currentFarmer.pricePerKg),
        phone: box.currentFarmer.phone
      } : undefined
    }))

    return NextResponse.json(
      createPaginatedResponse(formattedBoxes, total, query.page, query.limit)
    )
  } catch (error) {
    console.error('Error fetching boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des boîtes'),
      { status: 500 }
    )
  }
}

// PUT /api/boxes - Bulk selection/unselection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { boxIds, action } = bulkSelectionSchema.parse(body)

    let updateData: any = {}
    let message = ''

    switch (action) {
      case 'select':
        updateData = { isSelected: true }
        message = `${boxIds.length} boîte(s) sélectionnée(s)`
        break
      case 'unselect':
        updateData = { isSelected: false }
        message = `${boxIds.length} boîte(s) désélectionnée(s)`
        break
      case 'delete':
        // Check if any boxes are currently in use
        const inUseBoxes = await prisma.box.findMany({
          where: {
            id: { in: boxIds },
            status: 'IN_USE'
          }
        })

        if (inUseBoxes.length > 0) {
          return NextResponse.json(
            createErrorResponse('Impossible de supprimer des boîtes actuellement utilisées'),
            { status: 400 }
          )
        }

        // For the new box system, we should change status to AVAILABLE instead of deleting
        // to maintain the fixed 600 box capacity
        const updatedBoxes = await prisma.box.updateMany({
          where: { id: { in: boxIds } },
          data: {
            status: 'AVAILABLE',
            currentFarmerId: null,
            currentWeight: null,
            assignedAt: null,
            isSelected: false
          }
        })

        return NextResponse.json(
          createSuccessResponse({ count: updatedBoxes.count }, `${boxIds.length} boîte(s) remise(s) à disposition`)
        )
    }

    const updatedBoxes = await prisma.box.updateMany({
      where: { id: { in: boxIds } },
      data: updateData
    })

    return NextResponse.json(
      createSuccessResponse({ count: updatedBoxes.count }, message)
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error bulk updating boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour des boîtes'),
      { status: 500 }
    )
  }
}

// POST /api/boxes - Create a new box (now assigns existing box to farmer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const boxData = createBoxSchema.parse(body)

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id: boxData.farmerId }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Find an available box with the specified ID
    const availableBox = await prisma.box.findFirst({
      where: {
        id: boxData.id,
        status: 'AVAILABLE'
      }
    })

    if (!availableBox) {
      return NextResponse.json(
        createErrorResponse('Boîte non disponible ou introuvable'),
        { status: 404 }
      )
    }

    // Assign the box to the farmer
    const assignedBox = await prisma.box.update({
      where: { id: boxData.id },
      data: {
        status: 'IN_USE',
        currentFarmerId: boxData.farmerId,
        currentWeight: boxData.weight,
        assignedAt: new Date(),
        type: boxData.type.toUpperCase() as any,
        isSelected: false
      },
      include: {
        currentFarmer: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerKg: true
          }
        }
      }
    })

    // Format response
    const formattedBox = {
      ...assignedBox,
      type: assignedBox.type.toLowerCase(),
      status: assignedBox.status.toLowerCase(),
      currentWeight: Number(assignedBox.currentWeight || 0),
      currentFarmer: assignedBox.currentFarmer ? {
        ...assignedBox.currentFarmer,
        type: assignedBox.currentFarmer.type.toLowerCase(),
        pricePerKg: Number(assignedBox.currentFarmer.pricePerKg)
      } : undefined
    }

    return NextResponse.json(
      createSuccessResponse(formattedBox, 'Boîte assignée avec succès'),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error assigning box:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de l\'assignation de la boîte'),
      { status: 500 }
    )
  }
}
