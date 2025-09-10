import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/dashboard/real-time - Get real-time dashboard updates
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // Fetch only essential real-time data
    const [
      totalFarmers,
      boxCounts,
      todaySessionsCount,
      todayRevenue,
      latestActivity
    ] = await Promise.all([
      // Quick farmer count
      prisma.farmer.count(),
      
      // Box status counts - Only for factory boxes (1-600), exclude Chkara
      prisma.box.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
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
      }),
      
      // Today's sessions count
      prisma.processingSession.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd }
        }
      }),
      
      // Today's revenue (include both paid and partial payments)
      prisma.processingSession.aggregate({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          paymentStatus: { in: ['PAID', 'PARTIAL'] } // Include partial payments
        },
        _sum: { amountPaid: true } // Use amountPaid to include partial payments
      }),
      
      // Latest activity (just 3 items for real-time updates)
      prisma.processingSession.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { name: true } }
        }
      })
    ])

    const inUseBoxes = boxCounts.find(b => b.status === 'IN_USE')?._count.status || 0
    const availableBoxes = boxCounts.find(b => b.status === 'AVAILABLE')?._count.status || 0

    // Get Chkara count separately
    const chkaraCount = await prisma.box.count({
      where: { 
        type: 'CHKARA',
        status: 'IN_USE'
      }
    })

    const realTimeData = {
      // Core metrics for dashboard cards
      metrics: {
        totalFarmers,
        availableBoxes,
        inUseBoxes,
        boxUtilization: Math.round((inUseBoxes / 600) * 100),
        todaySessionsCount,
        todayRevenue: Number(todayRevenue._sum.amountPaid || 0),
        chkaraCount: chkaraCount
      },
      
      // Latest activity for live feed
      latestActivity: latestActivity.map(session => ({
        id: session.id,
        type: session.processingStatus === 'PROCESSED' ? 'completed' : 'created',
        description: `Session ${session.processingStatus === 'PROCESSED' ? 'terminée' : 'créée'} - ${session.farmer.name}`,
        timestamp: session.createdAt.toISOString(),
        amount: Number(session.totalPrice)
      })),
      
      // System status indicators
      systemStatus: {
        boxSystemOperational: true,
        lastDataUpdate: now.toISOString(),
        totalCapacity: 600,
        utilizationStatus: inUseBoxes > 500 ? 'high' : inUseBoxes > 300 ? 'medium' : 'low'
      },
      
      timestamp: Date.now()
    }

    return NextResponse.json(createSuccessResponse(realTimeData))
    
  } catch (error) {
    console.error('❌ Real-time dashboard API error:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des données en temps réel'),
      { status: 500 }
    )
  }
} 