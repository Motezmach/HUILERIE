import { prisma } from './prisma'

// Dashboard cache invalidation system
export async function invalidateDashboardCache() {
  try {
    // Delete all cached dashboard metrics to force fresh data
    const result = await prisma.dashboardMetrics.deleteMany({})
    console.log(`🗑️ Dashboard cache invalidated - deleted ${result.count} cached entries`)
  } catch (error) {
    console.error('Error invalidating dashboard cache:', error)
  }
}

// Trigger dashboard update after data changes
export async function triggerDashboardUpdate(reason: string) {
  console.log(`🔄 Dashboard update triggered: ${reason}`)
  await invalidateDashboardCache()
  
  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Dashboard cache cleared due to: ${reason}`)
  }
  
  // Force immediate recalculation by calling the dashboard API
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/api/dashboard?refresh=true&t=${Date.now()}`)
    if (response.ok) {
      console.log('✅ Dashboard data pre-calculated after update')
    }
  } catch (error) {
    console.log('⚠️ Could not pre-calculate dashboard data:', error)
  }
}

// Helper function to update farmer totals and trigger dashboard update
export async function updateFarmerTotalsAndDashboard(farmerId: string, reason: string) {
  try {
    // Update farmer totals
    const sessions = await prisma.processingSession.findMany({
      where: { farmerId }
    })
    
    const totalAmountDue = sessions.reduce((sum, session) => sum + Number(session.totalPrice), 0)
    const totalAmountPaid = sessions
      .filter(session => session.paymentStatus === 'PAID')
      .reduce((sum, session) => sum + Number(session.totalPrice), 0)
    
    const paymentStatus = totalAmountDue === totalAmountPaid ? 'PAID' : 'PENDING'
    
    await prisma.farmer.update({
      where: { id: farmerId },
      data: {
        totalAmountDue,
        totalAmountPaid,
        paymentStatus
      }
    })
    
    // Trigger dashboard update
    await triggerDashboardUpdate(reason)
  } catch (error) {
    console.error('Error updating farmer totals and dashboard:', error)
  }
} 