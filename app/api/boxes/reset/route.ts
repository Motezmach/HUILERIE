import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/boxes/reset - Reset all boxes to available status
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting box reset process...')

    // Get count of factory boxes currently in use (excluding Chkara)
    const inUseFactoryBoxes = await prisma.box.count({
      where: { 
        status: 'IN_USE',
        // Only count factory boxes (1-600), exclude Chkara boxes
        AND: [
          { type: { not: 'CHKARA' } },
          {
            id: {
              in: Array.from({ length: 600 }, (_, i) => (i + 1).toString())
            }
          }
        ]
      }
    })

    if (inUseFactoryBoxes === 0) {
      return NextResponse.json(
        createSuccessResponse(null, 'Aucune boîte d\'usine en cours d\'utilisation à réinitialiser'),
        { status: 200 }
      )
    }

    // Reset only factory boxes to available status (exclude Chkara)
    const result = await prisma.box.updateMany({
      where: { 
        status: 'IN_USE',
        // Only reset factory boxes (1-600), exclude Chkara boxes
        AND: [
          { type: { not: 'CHKARA' } },
          {
            id: {
              in: Array.from({ length: 600 }, (_, i) => (i + 1).toString())
            }
          }
        ]
      },
      data: {
        currentFarmerId: null,
        currentWeight: null,
        assignedAt: null,
        status: 'AVAILABLE',
        isSelected: false
      }
    })

    console.log(`✅ Reset ${result.count} factory boxes to available status`)

    // Trigger dashboard update
    await triggerDashboardUpdate(`Factory box reset: ${result.count} factory boxes made available`)

    return NextResponse.json(
      createSuccessResponse(
        { resetCount: result.count },
        `${result.count} boîte(s) d'usine réinitialisée(s) avec succès. Toutes les boîtes d'usine sont maintenant disponibles.`
      ),
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Error resetting boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la réinitialisation des boîtes'),
      { status: 500 }
    )
  }
} 