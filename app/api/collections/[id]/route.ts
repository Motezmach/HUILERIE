import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'
import { Decimal } from '@prisma/client/runtime/library'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PUT /api/collections/[id] - Update a daily collection
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { 
      location, 
      clientName, 
      chakraCount, 
      galbaCount,
      pricePerChakra,
      notes 
    } = body

    // Get current collection to recalculate totals
    const current = await prisma.dailyCollection.findUnique({
      where: { id }
    })

    if (!current) {
      return NextResponse.json(
        createErrorResponse('Collection non trouvée'),
        { status: 404 }
      )
    }

    // Calculate total chakra if counts changed
    const finalChakraCount = chakraCount !== undefined ? parseInt(chakraCount) : current.chakraCount
    const finalGalbaCount = galbaCount !== undefined ? parseInt(galbaCount) : current.galbaCount
    const totalChakra = new Decimal(finalChakraCount).plus(new Decimal(finalGalbaCount).dividedBy(5))
    
    // Calculate total amount
    const finalPricePerChakra = pricePerChakra !== undefined ? 
      (pricePerChakra ? new Decimal(pricePerChakra) : null) : 
      current.pricePerChakra
    
    const totalAmount = finalPricePerChakra ? totalChakra.times(finalPricePerChakra) : null

    const updateData: any = {
      totalChakra,
      totalAmount
    }

    if (location !== undefined) updateData.location = location.trim()
    if (clientName !== undefined) updateData.clientName = clientName.trim()
    if (chakraCount !== undefined) updateData.chakraCount = finalChakraCount
    if (galbaCount !== undefined) updateData.galbaCount = finalGalbaCount
    if (pricePerChakra !== undefined) updateData.pricePerChakra = finalPricePerChakra
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    const collection = await prisma.dailyCollection.update({
      where: { id },
      data: updateData,
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
      createSuccessResponse(collection, 'Collection mise à jour avec succès')
    )
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de la collection'),
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id] - Delete a daily collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await prisma.dailyCollection.delete({
      where: { id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Collection supprimée avec succès')
    )
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de la collection'),
      { status: 500 }
    )
  }
}

