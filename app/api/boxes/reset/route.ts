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

    // Get count of boxes currently in use
    const inUseBoxes = await prisma.box.count({
      where: { status: 'IN_USE' }
    })

    if (inUseBoxes === 0) {
      return NextResponse.json(
        createSuccessResponse(null, 'Aucune boîte en cours d\'utilisation à réinitialiser'),
        { status: 200 }
      )
    }

    // Reset all boxes to available status
    const result = await prisma.box.updateMany({
      where: { status: 'IN_USE' },
      data: {
        currentFarmerId: null,
        currentWeight: null,
        assignedAt: null,
        status: 'AVAILABLE',
        isSelected: false
      }
    })

    console.log(`✅ Reset ${result.count} boxes to available status`)

    // Trigger dashboard update
    await triggerDashboardUpdate(`Box reset: ${result.count} boxes made available`)

    return NextResponse.json(
      createSuccessResponse(
        { resetCount: result.count },
        `${result.count} boîte(s) réinitialisée(s) avec succès. Toutes les boîtes sont maintenant disponibles.`
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