import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/dashboard/stats - Get detailed dashboard statistics
export async function GET() {
  try {
    console.log('📈 Dashboard stats API called')

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Get last 7 days for trends
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(todayStart)
      date.setDate(date.getDate() - i)
      return date
    }).reverse()

    // Parallel data fetching
    const [
      // Box type distribution
      boxTypeDistribution,
      
      // Daily revenue for last 7 days
      dailyRevenue,
      
      // Farmer type distribution
      farmerTypeDistribution,
      
      // Processing status breakdown
      processingStatusBreakdown,
      
      // Payment status breakdown
      paymentStatusBreakdown,
      
      // Recent session details
      recentSessionDetails,
      
      // Box utilization by type
      boxUtilizationByType
    ] = await Promise.all([
      // Box types
      prisma.box.groupBy({
        by: ['type'],
        _count: { type: true },
        where: { status: 'IN_USE' }
      }),
      
      // Daily revenue for last 7 days
      Promise.all(
        last7Days.map(async (date) => {
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
          
          const revenue = await prisma.processingSession.aggregate({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
              paymentStatus: { in: ['PAID', 'PARTIAL'] } // Include partial payments
            },
            _sum: { amountPaid: true } // Use amountPaid to include partial payments
          })
          
          return {
            date: startOfDay.toISOString().split('T')[0],
            revenue: Number(revenue._sum.amountPaid || 0) // Use amountPaid
          }
        })
      ),
      
      // Farmer types
      prisma.farmer.groupBy({
        by: ['type'],
        _count: { type: true }
      }),
      
      // Processing status
      prisma.processingSession.groupBy({
        by: ['processingStatus'],
        _count: { processingStatus: true }
      }),
      
      // Payment status
      prisma.processingSession.groupBy({
        by: ['paymentStatus'],
        _count: { paymentStatus: true }
      }),
      
      // Recent sessions with farmer details
      prisma.processingSession.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: {
            select: { 
              name: true, 
              type: true,
              phone: true 
            }
          },
          sessionBoxes: {
            select: {
              boxWeight: true,
              boxType: true
            }
          }
        }
      }),
      
      // Box utilization by type
      prisma.box.groupBy({
        by: ['type', 'status'],
        _count: { id: true }
      })
    ])

    // Process box utilization by type
    const boxUtilizationStats = ['NORMAL', 'NCHIRA', 'CHKARA'].map(type => {
      const available = boxUtilizationByType.find(b => b.type === type && b.status === 'AVAILABLE')?._count.id || 0
      const inUse = boxUtilizationByType.find(b => b.type === type && b.status === 'IN_USE')?._count.id || 0
      const total = available + inUse
      
      return {
        type,
        available,
        inUse,
        total,
        utilizationRate: total > 0 ? Math.round((inUse / total) * 100) : 0
      }
    })

    // Calculate top farmers by revenue
    const topFarmers = await prisma.farmer.findMany({
      include: {
        processingSessions: {
          where: { paymentStatus: 'PAID' },
          select: { totalPrice: true }
        }
      },
      take: 10
    })

    const topFarmersByRevenue = topFarmers
      .map(farmer => ({
        id: farmer.id,
        name: farmer.name,
        type: farmer.type,
        totalRevenue: farmer.processingSessions.reduce((sum, session) => sum + Number(session.totalPrice), 0),
        sessionCount: farmer.processingSessions.length
      }))
      .filter(farmer => farmer.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)

    const responseData = {
      boxStats: {
        typeDistribution: boxTypeDistribution.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        utilizationByType: boxUtilizationStats
      },
      
      revenueStats: {
        daily: dailyRevenue,
        topFarmers: topFarmersByRevenue
      },
      
      farmerStats: {
        typeDistribution: farmerTypeDistribution.map(item => ({
          type: item.type,
          count: item._count.type
        }))
      },
      
      sessionStats: {
        processingStatus: processingStatusBreakdown.map(item => ({
          status: item.processingStatus,
          count: item._count.processingStatus
        })),
        paymentStatus: paymentStatusBreakdown.map(item => ({
          status: item.paymentStatus,
          count: item._count.paymentStatus
        })),
        recent: recentSessionDetails.map(session => ({
          id: session.id,
          date: session.createdAt.toISOString(),
          farmer: session.farmer,
          boxCount: session.boxCount,
          totalWeight: Number(session.totalBoxWeight),
          oilWeight: Number(session.oilWeight),
          totalPrice: Number(session.totalPrice),
          processingStatus: session.processingStatus,
          paymentStatus: session.paymentStatus,
          extractionRate: Number(session.totalBoxWeight) > 0 ? 
            Number((Number(session.oilWeight) / Number(session.totalBoxWeight)) * 100).toFixed(2) : 0
        }))
      },
      lastUpdated: now.toISOString()
    }

    console.log('✅ Dashboard stats calculated successfully')
    return NextResponse.json(createSuccessResponse(responseData))
    
  } catch (error) {
    console.error('❌ Dashboard stats API error:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des statistiques'),
      { status: 500 }
    )
  }
} 