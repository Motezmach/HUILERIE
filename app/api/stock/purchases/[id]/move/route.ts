import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

function createSuccessResponse(data: any, message?: string) {
  return { success: true, data, message }
}

function createErrorResponse(message: string) {
  return { success: false, error: message }
}

// PATCH /api/stock/purchases/[id]/move - Move purchase to different safe
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { newSafeId } = body

    if (!newSafeId) {
      return NextResponse.json(
        createErrorResponse('Le coffre de destination est requis'),
        { status: 400 }
      )
    }

    // Get existing purchase
    const existingPurchase = await prisma.olivePurchase.findUnique({
      where: { id: params.id }
    })

    if (!existingPurchase) {
      return NextResponse.json(
        createErrorResponse('Achat non trouvé'),
        { status: 404 }
      )
    }

    // Check if trying to move to the same safe
    if (existingPurchase.safeId === newSafeId) {
      return NextResponse.json(
        createErrorResponse('L\'achat est déjà dans ce coffre'),
        { status: 400 }
      )
    }

    // Verify new safe exists
    const newSafe = await prisma.oilSafe.findUnique({
      where: { id: newSafeId }
    })

    if (!newSafe) {
      return NextResponse.json(
        createErrorResponse('Coffre de destination non trouvé'),
        { status: 404 }
      )
    }

    // Check if new safe has capacity for the oil (if oil exists)
    const oilAmount = Number(existingPurchase.oilProduced || 0)
    if (oilAmount > 0) {
      const availableCapacity = Number(newSafe.capacity) - Number(newSafe.currentStock)
      if (availableCapacity < oilAmount) {
        return NextResponse.json(
          createErrorResponse(
            `Capacité insuffisante dans le coffre ${newSafe.name}. ` +
            `Disponible: ${availableCapacity.toFixed(2)} kg, Requis: ${oilAmount.toFixed(2)} kg`
          ),
          { status: 400 }
        )
      }
    }

    // Move purchase in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update purchase with new safe
      const updatedPurchase = await tx.olivePurchase.update({
        where: { id: params.id },
        data: {
          safeId: newSafeId
        },
        include: {
          safe: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Only update stock levels if oil exists
      if (oilAmount > 0) {
        // Remove oil from old safe
        await tx.oilSafe.update({
          where: { id: existingPurchase.safeId },
          data: {
            currentStock: {
              decrement: oilAmount
            }
          }
        })

        // Add oil to new safe
        await tx.oilSafe.update({
          where: { id: newSafeId },
          data: {
            currentStock: {
              increment: oilAmount
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
      oilProduced: result.oilProduced ? Number(result.oilProduced) : null,
      yieldPercentage: result.yieldPercentage ? Number(result.yieldPercentage) : null,
      safeId: result.safeId,
      safeName: result.safe.name,
      notes: result.notes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      isPendingOil: !result.oilProduced
    }

    return NextResponse.json(
      createSuccessResponse(formattedPurchase, 'Achat déplacé avec succès')
    )
  } catch (error) {
    console.error('Error moving purchase:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors du déplacement de l\'achat'),
      { status: 500 }
    )
  }
}
