import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dashboardQuerySchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse,
  getTodayDateString,
  getDateRange
} from '@/lib/utils'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

// GET /api/dashboard - Get dashboard metrics and data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = dashboardQuerySchema.parse(Object.fromEntries(searchParams))

    const targetDate = query.date || getTodayDateString()
    const { from, to } = getDateRange(targetDate, targetDate)

    // If refresh is requested, always calculate fresh metrics
    if (query.refresh) {
      console.log('🔄 Dashboard refresh requested - calculating fresh metrics')
    }

    // Check if we have cached metrics for today (only if not refresh flag)
    if (!query.refresh) {
      const cachedMetrics = await prisma.dashboardMetrics.findUnique({
        where: { metricDate: new Date(targetDate) }
      })

      if (cachedMetrics) {
        const formattedMetrics = {
          ...cachedMetrics,
          todayRevenue: Number(cachedMetrics.todayRevenue),
          totalRevenue: Number(cachedMetrics.totalRevenue),
          averageOilExtraction: Number(cachedMetrics.averageOilExtraction)
        }

        // Still get recent activity and other required data
        const [recentActivity, totalBoxes, availableBoxes, inUseBoxes] = await Promise.all([
          getRecentActivity(),
          prisma.box.count(),
          prisma.box.count({ where: { status: 'AVAILABLE' } }),
          prisma.box.count({ where: { status: 'IN_USE' } })
        ])

        // Calculate box capacity utilization
        const boxUtilization = {
          used: inUseBoxes,
          total: 600, // Based on your box ID range 1-600
          percentage: Math.round((inUseBoxes / 600) * 100)
        }

        // Calculate trends (compare with yesterday)
        const yesterday = new Date(from)
        yesterday.setDate(yesterday.getDate() - 1)
        const { from: yesterdayFrom, to: yesterdayTo } = getDateRange(
          yesterday.toISOString().split('T')[0], 
          yesterday.toISOString().split('T')[0]
        )

        const [yesterdayFarmers, yesterdayRevenue] = await Promise.all([
          prisma.farmer.count({
            where: {
              createdAt: { gte: yesterdayFrom, lte: yesterdayTo }
            }
          }),
          prisma.processingSession.aggregate({
            where: {
              createdAt: { gte: yesterdayFrom, lte: yesterdayTo },
              paymentStatus: 'PAID'
            },
            _sum: { totalPrice: true }
          })
        ])

        const trends = {
          farmersChange: formattedMetrics.totalFarmers - yesterdayFarmers,
          revenueChange: formattedMetrics.todayRevenue - Number(yesterdayRevenue._sum.totalPrice || 0)
        }

        return NextResponse.json(
          createSuccessResponse({
            metrics: formattedMetrics,
            recentActivity,
            boxUtilization,
            trends,
            lastUpdated: cachedMetrics.updatedAt,
            fromCache: true,
            dataTimestamp: Date.now() // Add timestamp for frontend change detection
          })
        )
      }
    }

    // Calculate fresh metrics
    console.log('📊 Calculating fresh dashboard metrics...')
    const [
      totalFarmers,
      totalBoxes,
      availableBoxes,
      inUseBoxes,
      pendingExtractions,
      todayRevenue,
      totalRevenue,
      avgOilExtraction
    ] = await Promise.all([
      // Total farmers
      prisma.farmer.count(),
      
      // Total boxes
      prisma.box.count(),
      
      // Available boxes (ready for use)
      prisma.box.count({
        where: { 
          status: 'AVAILABLE'
        }
      }),
      
      // In-use boxes (currently with farmers)
      prisma.box.count({
        where: { 
          status: 'IN_USE'
        }
      }),
      
      // Pending extractions
      prisma.processingSession.count({
        where: { processingStatus: 'PENDING' }
      }),
      
      // Today's revenue
      prisma.processingSession.aggregate({
        where: {
          createdAt: { gte: from, lte: to },
          paymentStatus: 'PAID'
        },
        _sum: { totalPrice: true }
      }),
      
      // Total revenue (all time)
      prisma.processingSession.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalPrice: true }
      }),
      
      // Average oil extraction rate
      prisma.processingSession.aggregate({
        where: { 
          processingStatus: 'PROCESSED',
          oilWeight: { gt: 0 }
        },
        _avg: { oilWeight: true }
      })
    ])

    const metrics = {
      totalFarmers,
      totalBoxes,
      activeBoxes: availableBoxes,
      pendingExtractions,
      todayRevenue: Number(todayRevenue._sum.totalPrice || 0),
      totalRevenue: Number(totalRevenue._sum.totalPrice || 0),
      averageOilExtraction: Number(avgOilExtraction._avg.oilWeight || 0)
    }

    console.log('📊 Fresh metrics calculated:', {
      totalFarmers,
      inUseBoxes,
      availableBoxes,
      todayRevenue: metrics.todayRevenue
    })

    // Cache the metrics only if not in refresh mode
    if (!query.refresh) {
      const metricDate = new Date(targetDate)
      await prisma.dashboardMetrics.upsert({
        where: { metricDate },
        update: {
          ...metrics,
          updatedAt: new Date()
        },
        create: {
          ...metrics,
          metricDate
        }
      })
    }

    // Get recent activity
    const recentActivity = await getRecentActivity()

    // Calculate box capacity utilization
    const boxUtilization = {
      used: inUseBoxes,
      total: 600, // Based on your box ID range 1-600
      percentage: Math.round((inUseBoxes / 600) * 100)
    }

    // Get trends (compare with yesterday)
    const yesterday = new Date(from)
    yesterday.setDate(yesterday.getDate() - 1)
    const { from: yesterdayFrom, to: yesterdayTo } = getDateRange(
      yesterday.toISOString().split('T')[0], 
      yesterday.toISOString().split('T')[0]
    )

    const [yesterdayFarmers, yesterdayRevenue] = await Promise.all([
      prisma.farmer.count({
        where: {
          createdAt: { gte: yesterdayFrom, lte: yesterdayTo }
        }
      }),
      prisma.processingSession.aggregate({
        where: {
          createdAt: { gte: yesterdayFrom, lte: yesterdayTo },
          paymentStatus: 'PAID'
        },
        _sum: { totalPrice: true }
      })
    ])

    const trends = {
      farmersChange: totalFarmers - yesterdayFarmers,
      revenueChange: metrics.todayRevenue - Number(yesterdayRevenue._sum.totalPrice || 0)
    }

    return NextResponse.json(
      createSuccessResponse({
        metrics,
        recentActivity,
        boxUtilization,
        trends,
        lastUpdated: new Date(),
        fromCache: false,
        dataTimestamp: Date.now() // Add timestamp for frontend change detection
      })
    )
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des données du tableau de bord'),
      { status: 500 }
    )
  }
}

// Helper function to get recent activity
async function getRecentActivity() {
  const [recentSessions, recentFarmers, recentPayments] = await Promise.all([
    // Recent processing sessions
    prisma.processingSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          select: { name: true }
        }
      }
    }),
    
    // Recent farmers
    prisma.farmer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    }),
    
    // Recent payments
    prisma.processingSession.findMany({
      take: 5,
      where: { 
        paymentStatus: 'PAID',
        paymentDate: { not: null }
      },
      orderBy: { paymentDate: 'desc' },
      include: {
        farmer: {
          select: { name: true }
        }
      }
    })
  ])
  const activity: any[] = []

  // Add session activities
  recentSessions.forEach((session: any) => {
    activity.push({
      id: `session-${session.id}`,
      type: session.processingStatus === 'PROCESSED' ? 'session_completed' : 'session_created',
      description: session.processingStatus === 'PROCESSED' 
        ? `Traitement terminé pour ${session.farmer.name}` 
        : `Session créée pour ${session.farmer.name} (${session.boxCount} boîtes)`,
      timestamp: session.createdAt,
      amount: Number(session.totalPrice)
    })
  })

  // Add farmer activities
  recentFarmers.forEach((farmer: any) => {
    activity.push({
      id: `farmer-${farmer.id}`,
      type: 'farmer_added',
      description: `Agriculteur ajouté: ${farmer.name}`,
      timestamp: farmer.createdAt
    })
  })

  // Add payment activities
  recentPayments.forEach((payment: any) => {
    activity.push({
      id: `payment-${payment.id}`,
      type: 'payment_received',
      description: `Paiement reçu de ${payment.farmer.name}`,
      timestamp: payment.paymentDate,
      amount: Number(payment.totalPrice)
    })
  })

  // Sort by timestamp and return latest 10
  return activity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
}


