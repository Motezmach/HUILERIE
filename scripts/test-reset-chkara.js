const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testResetChkara() {
  try {
    console.log('🧪 Testing reset functionality with Chkara exclusion...')

    // First, let's see the current state
    console.log('\n📊 Current box status:')
    
    const allBoxes = await prisma.box.groupBy({
      by: ['status', 'type'],
      _count: { status: true }
    })
    
    allBoxes.forEach(count => {
      console.log(`  ${count.type} - ${count.status}: ${count._count.status}`)
    })

    // Count factory boxes in use
    const factoryBoxesInUse = await prisma.box.count({
      where: { 
        status: 'IN_USE',
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

    // Count Chkara boxes in use
    const chkaraBoxesInUse = await prisma.box.count({
      where: { 
        type: 'CHKARA',
        status: 'IN_USE'
      }
    })

    console.log(`\n📈 Before reset:`)
    console.log(`  Factory boxes in use: ${factoryBoxesInUse}`)
    console.log(`  Chkara boxes in use: ${chkaraBoxesInUse}`)

    if (factoryBoxesInUse === 0) {
      console.log('\n✅ No factory boxes in use to reset')
      return
    }

    // Simulate the reset API call
    console.log('\n🔄 Simulating reset API call...')
    
    const resetResult = await prisma.box.updateMany({
      where: { 
        status: 'IN_USE',
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

    console.log(`✅ Reset ${resetResult.count} factory boxes`)

    // Check the state after reset
    const factoryBoxesInUseAfter = await prisma.box.count({
      where: { 
        status: 'IN_USE',
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

    const chkaraBoxesInUseAfter = await prisma.box.count({
      where: { 
        type: 'CHKARA',
        status: 'IN_USE'
      }
    })

    console.log(`\n📈 After reset:`)
    console.log(`  Factory boxes in use: ${factoryBoxesInUseAfter}`)
    console.log(`  Chkara boxes in use: ${chkaraBoxesInUseAfter}`)

    // Verify the results
    if (factoryBoxesInUseAfter === 0) {
      console.log('✅ All factory boxes successfully reset')
    } else {
      console.log('❌ Some factory boxes still in use')
    }

    if (chkaraBoxesInUseAfter === chkaraBoxesInUse) {
      console.log('✅ Chkara boxes correctly preserved (not reset)')
    } else {
      console.log('❌ Chkara boxes were affected by reset')
    }

    console.log('\n✅ Reset test completed!')

  } catch (error) {
    console.error('❌ Error testing reset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testResetChkara() 