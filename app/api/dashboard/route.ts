import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/dashboard - Get dashboard metrics and data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const refresh = searchParams.get('refresh') === 'true'
    
    console.log('📊 Dashboard API called', { refresh, timestamp: new Date().toISOString() })

    // Get current date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayEnd = new Date(todayStart.getTime() - 1)

    // Fetch all required data in parallel for better performance
    const [
      // Core metrics
      totalFarmers,
      totalBoxesInDb,
      boxStatusCounts,
      sessionCounts,
      
      // Session status counts - Enhanced
      sessionStatusCounts,
      paymentStatusCounts,
      
      // Revenue data
      todayRevenue,
      totalRevenue,
      
      // Yesterday's data for trends
      yesterdayFarmers,
      yesterdayRevenue,
      
      // Oil extraction data
      avgOilExtraction,
      
      // Recent activity
      recentSessions,
      recentFarmers,
      recentPayments
    ] = await Promise.all([
      // Total farmers count
      prisma.farmer.count(),
      
      // Total boxes in database
      prisma.box.count(),
      
      // Box status distribution - Only for factory boxes (1-600), exclude Chkara
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
      
      // Session status counts (legacy for pendingExtractions)
      prisma.processingSession.groupBy({
        by: ['processingStatus'],
        _count: { processingStatus: true }
      }),
      
      // Enhanced session status counts
      prisma.processingSession.groupBy({
        by: ['processingStatus'],
        _count: { processingStatus: true }
      }),
      
      // Payment status counts
      prisma.processingSession.groupBy({
        by: ['paymentStatus'],
        _count: { paymentStatus: true }
      }),
      
      // Today's revenue (include both paid and partial payments)
      prisma.processingSession.aggregate({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          paymentStatus: { in: ['PAID', 'PARTIAL'] }
        },
        _sum: { amountPaid: true } // Use amountPaid to include partial payments
      }),
      
      // Total revenue (all time, include both paid and partial payments)
      prisma.processingSession.aggregate({
        where: { paymentStatus: { in: ['PAID', 'PARTIAL'] } },
        _sum: { amountPaid: true } // Use amountPaid to include partial payments
      }),
      
      // Yesterday's farmers count
      prisma.farmer.count({
        where: {
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
        }
      }),
      
      // Yesterday's revenue (include both paid and partial payments)
      prisma.processingSession.aggregate({
        where: {
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          paymentStatus: { in: ['PAID', 'PARTIAL'] }
        },
        _sum: { amountPaid: true } // Use amountPaid to include partial payments
      }),
      
      // Average oil extraction (processed sessions only)
      prisma.processingSession.aggregate({
        where: { 
          processingStatus: 'PROCESSED',
          oilWeight: { gt: 0 }
        },
        _avg: { oilWeight: true }
      }),
      
      // Recent processing sessions (last 5) with box details
      prisma.processingSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { name: true } },
          sessionBoxes: {
            select: {
              boxId: true,
              boxType: true
            }
          }
        }
      }),
      
      // Recent farmers (last 3)
      prisma.farmer.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      }),
      
      // Recent payments (last 3)
      prisma.processingSession.findMany({
        take: 3,
        where: { 
          paymentStatus: 'PAID',
          paymentDate: { not: null }
        },
        orderBy: { paymentDate: 'desc' },
        include: {
          farmer: { select: { name: true } }
        }
      })
    ])

    // Process box status counts
    const availableBoxes = boxStatusCounts.find(b => b.status === 'AVAILABLE')?._count.status || 0
    const inUseBoxes = boxStatusCounts.find(b => b.status === 'IN_USE')?._count.status || 0
    
    // Get Chkara count separately
    const chkaraCount = await prisma.box.count({
      where: { 
        type: 'CHKARA',
        status: 'IN_USE'
      }
    })
    
    // Process session status counts (legacy)
    const pendingExtractions = sessionCounts.find(s => s.processingStatus === 'PENDING')?._count.processingStatus || 0
    
    // Enhanced session status processing
    const pendingSessionsCount = sessionStatusCounts.find(s => s.processingStatus === 'PENDING')?._count.processingStatus || 0
    const processedSessionsCount = sessionStatusCounts.find(s => s.processingStatus === 'PROCESSED')?._count.processingStatus || 0
    
    // Payment status processing
    const paidSessionsCount = paymentStatusCounts.find(p => p.paymentStatus === 'PAID')?._count.paymentStatus || 0
    const unpaidSessionsCount = paymentStatusCounts.find(p => p.paymentStatus === 'UNPAID')?._count.paymentStatus || 0
    
    // Calculate unpaid processed sessions (processed but not paid)
    const unpaidProcessedSessions = await prisma.processingSession.count({
      where: {
        processingStatus: 'PROCESSED',
        paymentStatus: 'UNPAID'
      }
    })
    
    // Calculate metrics
    const metrics = {
      totalFarmers,
      totalBoxes: 600, // Fixed total factory boxes based on your memory
      activeBoxes: availableBoxes, // Available boxes (ready for assignment)
      pendingExtractions,
      todayRevenue: Number(todayRevenue._sum.amountPaid || 0), // Fixed to use amountPaid
      totalRevenue: Number(totalRevenue._sum.amountPaid || 0), // Fixed to use amountPaid
      averageOilExtraction: Number(avgOilExtraction._avg.oilWeight || 0),
      metricDate: todayStart.toISOString(),
      chkaraCount: chkaraCount // Add Chkara count
    }

    // Calculate box utilization
    const boxUtilization = {
      used: inUseBoxes,
      total: 600,
      percentage: Math.round((inUseBoxes / 600) * 100)
    }

    // Enhanced session status counts
    const enhancedSessionStatusCounts = {
      pending: pendingSessionsCount,
      processed: processedSessionsCount, // All processed sessions
      paid: paidSessionsCount, // All paid sessions (regardless of processing status)
      unpaidProcessed: unpaidProcessedSessions // Processed but not paid
    }

    // Calculate trends (comparing with yesterday)
    const todayFarmersAdded = await prisma.farmer.count({
        where: {
        createdAt: { gte: todayStart, lte: todayEnd }
        }
    })

    const trends = {
      farmersChange: todayFarmersAdded - yesterdayFarmers,
      revenueChange: metrics.todayRevenue - Number(yesterdayRevenue._sum.amountPaid || 0)
    }

    // Build recent activity feed
    const recentActivity: any[] = []

    // Add session activities
    recentSessions.forEach((session: any) => {
      // Extract box IDs and types from session boxes
      const boxIds = session.sessionBoxes?.map((sb: any) => sb.boxId) || []
      const boxDetails = session.sessionBoxes?.map((sb: any) => ({
        id: sb.boxId,
        type: sb.boxType?.toLowerCase() || 'normal'
      })) || []
      
      recentActivity.push({
        id: `session-${session.id}`,
        type: session.processingStatus === 'PROCESSED' ? 'session_completed' : 'session_created',
        description: session.processingStatus === 'PROCESSED' 
          ? `Traitement terminé pour ${session.farmer.name}` 
          : `Session créée pour ${session.farmer.name} (${session.boxCount} boîtes)`,
        timestamp: session.createdAt.toISOString(),
        amount: session.processingStatus === 'PROCESSED' ? Number(session.totalPrice) : undefined,
        metadata: {
          farmerId: session.farmerId,
          sessionId: session.id,
          boxCount: session.boxCount,
          boxIds: boxIds,
          boxDetails: boxDetails
        }
      })
    })

    // Add farmer activities
    recentFarmers.forEach((farmer: any) => {
      recentActivity.push({
        id: `farmer-${farmer.id}`,
        type: 'farmer_added',
        description: `Agriculteur ajouté: ${farmer.name}`,
        timestamp: farmer.createdAt.toISOString(),
        metadata: {
          farmerId: farmer.id,
          farmerType: farmer.type
        }
      })
    })

    // Add payment activities (only show amount, no box IDs)
    recentPayments.forEach((payment: any) => {
      recentActivity.push({
        id: `payment-${payment.id}`,
        type: 'payment_received',
        description: `Paiement reçu de ${payment.farmer.name}`,
        timestamp: payment.paymentDate.toISOString(),
        amount: Number(payment.totalPrice),
        metadata: {
          farmerId: payment.farmerId,
          sessionId: payment.id,
          // No box information for payments
        }
      })
    })

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const dashboardData = {
        metrics,
      recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent
        boxUtilization,
        trends,
      sessionStatusCounts: enhancedSessionStatusCounts, // Enhanced session counts
      lastUpdated: now.toISOString(),
      fromCache: false,
      dataTimestamp: Date.now()
    }

    console.log('✅ Dashboard data calculated successfully:', {
      totalFarmers: metrics.totalFarmers,
      boxUtilization: `${boxUtilization.used}/${boxUtilization.total}`,
      todayRevenue: metrics.todayRevenue,
      activityCount: recentActivity.length,
      sessionCounts: enhancedSessionStatusCounts
    })

    return NextResponse.json(createSuccessResponse(dashboardData))
  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des données du tableau de bord'),
      { status: 500 }
    )
  }
}


