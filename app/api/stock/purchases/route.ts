import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/stock/purchases - Get all purchases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const safeId = searchParams.get('safeId')

    const where = safeId ? { safeId } : {}

    const purchases = await prisma.olivePurchase.findMany({
      where,
      include: {
        safe: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })

    const formattedPurchases = purchases.map(purchase => ({
      id: purchase.id,
      purchaseDate: purchase.purchaseDate,
      farmerName: purchase.farmerName,
      farmerPhone: purchase.farmerPhone,
      oliveWeight: Number(purchase.oliveWeight),
      pricePerKg: Number(purchase.pricePerKg),
      totalCost: Number(purchase.totalCost),
      oilProduced: purchase.oilProduced ? Number(purchase.oilProduced) : null,
      yieldPercentage: purchase.yieldPercentage ? Number(purchase.yieldPercentage) : null,
      safeId: purchase.safeId,
      safeName: purchase.safe.name,
      notes: purchase.notes,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      isPendingOil: !purchase.oilProduced
    }))

    return NextResponse.json(
      createSuccessResponse(formattedPurchases, 'Achats récupérés avec succès')
    )
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des achats'),
      { status: 500 }
    )
  }
}

// POST /api/stock/purchases - Create new purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      farmerName, 
      farmerPhone, 
      oliveWeight, 
      pricePerKg, 
      oilProduced, 
      safeId, 
      notes,
      purchaseDate,
      isBasePurchase // When true, calculate totalCost based on OIL weight, not OLIVE weight
    } = body

    // Validation
    if (!farmerName || !farmerName.trim()) {
      return NextResponse.json(
        createErrorResponse('Le nom du fournisseur est requis'),
        { status: 400 }
      )
    }

    // Oil is now required
    if (!oilProduced || oilProduced <= 0) {
      return NextResponse.json(
        createErrorResponse('La quantité d\'huile produite est requise'),
        { status: 400 }
      )
    }

    if (!pricePerKg || pricePerKg <= 0) {
      return NextResponse.json(
        createErrorResponse('Le prix par kg doit être supérieur à 0'),
        { status: 400 }
      )
    }

    // Olives can be null when buying oil directly (sessions conversion)
    if (oliveWeight !== undefined && oliveWeight !== null && oliveWeight <= 0) {
      return NextResponse.json(
        createErrorResponse('Le poids des olives doit être supérieur à 0'),
        { status: 400 }
      )
    }

    if (!safeId) {
      return NextResponse.json(
        createErrorResponse('Veuillez sélectionner un coffre'),
        { status: 400 }
      )
    }

    // Check if safe exists and has capacity (only if oil is provided)
    const safe = await prisma.oilSafe.findUnique({
      where: { id: safeId }
    })

    if (!safe) {
      return NextResponse.json(
        createErrorResponse('Coffre non trouvé'),
        { status: 404 }
      )
    }

    // Only check capacity if oil is being added
    if (oilProduced) {
      const availableCapacity = Number(safe.capacity) - Number(safe.currentStock)
      if (oilProduced > availableCapacity) {
        return NextResponse.json(
          createErrorResponse(`Capacité insuffisante. Disponible: ${availableCapacity.toFixed(2)} kg`),
          { status: 400 }
        )
      }
    }

    // Calculate totals
    // For BASE purchases (buying sessions), calculate based on OIL weight
    // For regular olive purchases, calculate based on OLIVE weight
    const totalCost = isBasePurchase 
      ? (oilProduced * pricePerKg)  // BASE purchase: price × oil kg
      : (oliveWeight ? (oliveWeight * pricePerKg) : (oilProduced * pricePerKg))  // Regular: price × olive kg
    const yieldPercentage = (oliveWeight && oilProduced) ? (oilProduced / oliveWeight) * 100 : null

    // Create purchase and update safe stock in transaction (only if oil is provided)
    const result = await prisma.$transaction(async (tx: any) => {
      // Create purchase
      const purchase = await tx.olivePurchase.create({
        data: {
          farmerName: farmerName.trim(),
          farmerPhone: farmerPhone?.trim() || null,
          oliveWeight: oliveWeight || 0, // Use 0 if not provided (buying oil directly)
          pricePerKg: pricePerKg,
          totalCost: totalCost,
          oilProduced: oilProduced,
          yieldPercentage: yieldPercentage || 0,
          safeId: safeId,
          notes: notes?.trim() || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date()
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

      // Only update safe stock if oil was produced
      if (oilProduced) {
        await tx.oilSafe.update({
          where: { id: safeId },
          data: {
            currentStock: {
              increment: oilProduced
            }
          }
        })
      }

      return purchase
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
      createSuccessResponse(formattedPurchase, 'Achat enregistré avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de l\'enregistrement de l\'achat'),
      { status: 500 }
    )
  }
}


