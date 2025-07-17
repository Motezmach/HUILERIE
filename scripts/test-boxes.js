const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBoxes() {
  try {
    console.log('🧪 Testing box system...')

    // Check total boxes
    const totalBoxes = await prisma.box.count()
    console.log(`📦 Total boxes in database: ${totalBoxes}`)

    // Check available boxes
    const availableBoxes = await prisma.box.count({
      where: { status: 'AVAILABLE' }
    })
    console.log(`✅ Available boxes: ${availableBoxes}`)

    // Check used boxes
    const usedBoxes = await prisma.box.count({
      where: { status: 'IN_USE' }
    })
    console.log(`🔒 Used boxes: ${usedBoxes}`)

    // Check factory boxes (1-600)
    const factoryBoxes = await prisma.box.count({
      where: {
        id: {
          in: Array.from({ length: 600 }, (_, i) => (i + 1).toString())
        }
      }
    })
    console.log(`🏭 Factory boxes (1-600): ${factoryBoxes}`)

    // Check Chkara boxes
    const chkaraBoxes = await prisma.box.count({
      where: {
        id: { startsWith: 'Chkara' }
      }
    })
    console.log(`👜 Chkara boxes: ${chkaraBoxes}`)

    // Test specific box availability
    const testBox = await prisma.box.findUnique({
      where: { id: '260' }
    })
    
    if (testBox) {
      console.log(`✅ Box 260 exists: ${testBox.status}`)
    } else {
      console.log(`❌ Box 260 does not exist`)
    }

    // Test box assignment
    console.log('\n🔧 Testing box assignment...')
    
    // Find a farmer or create one for testing
    let testFarmer = await prisma.farmer.findFirst()
    if (!testFarmer) {
      console.log('Creating test farmer...')
      testFarmer = await prisma.farmer.create({
        data: {
          name: 'Test Farmer',
          type: 'SMALL',
          pricePerKg: 0.15
        }
      })
    }

    // Try to assign box 260
    try {
      const assignedBox = await prisma.box.update({
        where: { id: '260' },
        data: {
          currentWeight: 25.5,
          currentFarmerId: testFarmer.id,
          assignedAt: new Date(),
          status: 'IN_USE'
        }
      })
      console.log(`✅ Successfully assigned box 260 to ${testFarmer.name}`)
      
      // Clean up - release the box
      await prisma.box.update({
        where: { id: '260' },
        data: {
          currentWeight: null,
          currentFarmerId: null,
          assignedAt: null,
          status: 'AVAILABLE'
        }
      })
      console.log('✅ Box 260 released back to available status')
      
    } catch (error) {
      console.error('❌ Error assigning box 260:', error.message)
    }

    console.log('\n✅ Box system test completed!')

  } catch (error) {
    console.error('❌ Error testing boxes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBoxes() 