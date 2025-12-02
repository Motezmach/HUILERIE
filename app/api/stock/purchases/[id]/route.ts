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

// GET /api/stock/purchases/[id] - Get single purchase
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const purchase = await prisma.olivePurchase.findUnique({
      where: { id: params.id },
      include: {
        safe: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json(
        createErrorResponse('Achat non trouvé'),
        { status: 404 }
      )
    }

    const formattedPurchase = {
      id: purchase.id,
      purchaseDate: purchase.purchaseDate,
      farmerName: purchase.farmerName,
      farmerPhone: purchase.farmerPhone,
      oliveWeight: Number(purchase.oliveWeight),
      pricePerKg: Number(purchase.pricePerKg),
      totalCost: Number(purchase.totalCost),
      oilProduced: Number(purchase.oilProduced),
      yieldPercentage: Number(purchase.yieldPercentage),
      safeId: purchase.safeId,
      safeName: purchase.safe.name,
      notes: purchase.notes,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt
    }

    return NextResponse.json(
      createSuccessResponse(formattedPurchase, 'Achat récupéré avec succès')
    )
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération de l\'achat'),
      { status: 500 }
    )
  }
}

// PUT /api/stock/purchases/[id] - Update purchase
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { 
      farmerName, 
      farmerPhone, 
      oliveWeight, 
      pricePerKg, 
      oilProduced,
      notes,
      purchaseDate,
      isBasePurchase // When true, calculate totalCost based on OIL weight, not OLIVE weight
    } = body

    // Check if purchase exists
    const existingPurchase = await prisma.olivePurchase.findUnique({
      where: { id: params.id },
      include: {
        safe: true
      }
    })

    if (!existingPurchase) {
      return NextResponse.json(
        createErrorResponse('Achat non trouvé'),
        { status: 404 }
      )
    }

    // Prepare update data with validations
    const updateData: any = {}
    
    if (farmerName !== undefined) {
      if (!farmerName.trim()) {
        return NextResponse.json(
          createErrorResponse('Le nom du fournisseur est requis'),
          { status: 400 }
        )
      }
      updateData.farmerName = farmerName.trim()
    }

    if (farmerPhone !== undefined) {
      updateData.farmerPhone = farmerPhone?.trim() || null
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null
    }

    if (purchaseDate !== undefined) {
      updateData.purchaseDate = new Date(purchaseDate)
    }

    // Handle numeric updates with recalculations
    let needsRecalculation = false
    let newOliveWeight = Number(existingPurchase.oliveWeight)
    let newPricePerKg = Number(existingPurchase.pricePerKg)
    let newOilProduced = Number(existingPurchase.oilProduced)

    if (oliveWeight !== undefined) {
      if (oliveWeight <= 0) {
        return NextResponse.json(
          createErrorResponse('Le poids des olives doit être supérieur à 0'),
          { status: 400 }
        )
      }
      newOliveWeight = oliveWeight
      needsRecalculation = true
    }

    if (pricePerKg !== undefined) {
      if (pricePerKg <= 0) {
        return NextResponse.json(
          createErrorResponse('Le prix par kg doit être supérieur à 0'),
          { status: 400 }
        )
      }
      newPricePerKg = pricePerKg
      needsRecalculation = true
    }

    if (oilProduced !== undefined) {
      if (oilProduced <= 0) {
        return NextResponse.json(
          createErrorResponse('La quantité d\'huile produite doit être supérieure à 0'),
          { status: 400 }
        )
      }
      newOilProduced = oilProduced
      needsRecalculation = true
    }

    // Calculate stock adjustment if oil quantity changed
    const oldOilProduced = Number(existingPurchase.oilProduced)
    const oilDifference = newOilProduced - oldOilProduced

    // Check if new oil amount exceeds safe capacity
    if (oilDifference > 0) {
      const availableCapacity = Number(existingPurchase.safe.capacity) - Number(existingPurchase.safe.currentStock)
      if (oilDifference > availableCapacity) {
        return NextResponse.json(
          createErrorResponse(`Capacité insuffisante. Disponible: ${availableCapacity.toFixed(2)} kg`),
          { status: 400 }
        )
      }
    }

    // Recalculate if needed
    if (needsRecalculation) {
      updateData.oliveWeight = newOliveWeight
      updateData.pricePerKg = newPricePerKg
      updateData.oilProduced = newOilProduced
      
      // For BASE purchases, calculate based on OIL weight
      // For regular purchases, calculate based on OLIVE weight
      updateData.totalCost = isBasePurchase 
        ? (newOilProduced * newPricePerKg)  // BASE: price × oil kg
        : (newOliveWeight * newPricePerKg)  // Regular: price × olive kg
        
      // Only calculate yield if we have olive weight
      updateData.yieldPercentage = newOliveWeight > 0 
        ? (newOilProduced / newOliveWeight) * 100 
        : 0
    }

    // Update purchase and safe stock in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update purchase
      const updatedPurchase = await tx.olivePurchase.update({
        where: { id: params.id },
        data: updateData,
        include: {
          safe: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Update safe stock if oil quantity changed
      if (oilDifference !== 0) {
        await tx.oilSafe.update({
          where: { id: existingPurchase.safeId },
          data: {
            currentStock: {
              increment: oilDifference
            }
          }
        })
      }

      return updatedPurchase
    })

    const formattedPurchase = {
      id: result.id,
      purchaseDate: result.purchaseDate,
      farmerName: result.farmerName,
      farmerPhone: result.farmerPhone,
      oliveWeight: Number(result.oliveWeight),
      pricePerKg: Number(result.pricePerKg),
      totalCost: Number(result.totalCost),
      oilProduced: Number(result.oilProduced),
      yieldPercentage: Number(result.yieldPercentage),
      safeId: result.safeId,
      safeName: result.safe.name,
      notes: result.notes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    }

    return NextResponse.json(
      createSuccessResponse(formattedPurchase, 'Achat mis à jour avec succès')
    )
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de l\'achat'),
      { status: 500 }
    )
  }
}

// DELETE /api/stock/purchases/[id] - Delete purchase
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const purchase = await prisma.olivePurchase.findUnique({
      where: { id: params.id }
    })

    if (!purchase) {
      return NextResponse.json(
        createErrorResponse('Achat non trouvé'),
        { status: 404 }
      )
    }

    // Delete purchase and update safe stock in transaction
    await prisma.$transaction(async (tx: any) => {
      // Delete purchase
      await tx.olivePurchase.delete({
        where: { id: params.id }
      })

      // Update safe stock (remove the oil from this purchase)
      await tx.oilSafe.update({
        where: { id: purchase.safeId },
        data: {
          currentStock: {
            decrement: Number(purchase.oilProduced)
          }
        }
      })
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Achat supprimé avec succès')
    )
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de l\'achat'),
      { status: 500 }
    )
  }
}


