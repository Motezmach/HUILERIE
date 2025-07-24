const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDashboardBoxes() {
  try {
    console.log('🧪 Testing dashboard box counting...')

    // Test the exact query that the dashboard uses
    const boxStatusCounts = await prisma.box.groupBy({
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
    })

    console.log('📊 Box status counts (factory boxes only):')
    boxStatusCounts.forEach(count => {
      console.log(`  ${count.status}: ${count._count.status}`)
    })

    // Calculate available and in-use boxes
    const availableBoxes = boxStatusCounts.find(b => b.status === 'AVAILABLE')?._count.status || 0
    const inUseBoxes = boxStatusCounts.find(b => b.status === 'IN_USE')?._count.status || 0
    const total = availableBoxes + inUseBoxes

    console.log('\n📈 Dashboard metrics:')
    console.log(`  Total factory boxes: ${total}`)
    console.log(`  Available boxes: ${availableBoxes}`)
    console.log(`  In-use boxes: ${inUseBoxes}`)
    console.log(`  Utilization: ${Math.round((inUseBoxes / total) * 100)}%`)

    // Verify the count is exactly 600
    if (total === 600) {
      console.log('✅ Dashboard box count is correct (600 factory boxes)')
    } else {
      console.log(`❌ Dashboard box count is incorrect: ${total} (should be 600)`)
    }

    // Also test the old query to show the difference
    const oldBoxStatusCounts = await prisma.box.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    console.log('\n📊 Old query (all boxes including Chkara):')
    oldBoxStatusCounts.forEach(count => {
      console.log(`  ${count.status}: ${count._count.status}`)
    })

    const oldAvailableBoxes = oldBoxStatusCounts.find(b => b.status === 'AVAILABLE')?._count.status || 0
    const oldInUseBoxes = oldBoxStatusCounts.find(b => b.status === 'IN_USE')?._count.status || 0
    const oldTotal = oldAvailableBoxes + oldInUseBoxes

    console.log(`\n📈 Old metrics (all boxes):`)
    console.log(`  Total boxes: ${oldTotal}`)
    console.log(`  Available boxes: ${oldAvailableBoxes}`)
    console.log(`  In-use boxes: ${oldInUseBoxes}`)

    console.log('\n✅ Dashboard box counting test completed!')

  } catch (error) {
    console.error('❌ Error testing dashboard boxes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardBoxes() 