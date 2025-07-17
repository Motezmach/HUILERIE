const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initializeFactoryBoxes() {
  try {
    console.log('🔧 Initializing factory boxes (1-600)...')

    // Check if boxes already exist
    const existingBoxes = await prisma.box.count({
      where: {
        id: {
          in: Array.from({ length: 600 }, (_, i) => (i + 1).toString())
        }
      }
    })

    if (existingBoxes === 600) {
      console.log('✅ Factory boxes already exist')
      return
    }

    console.log(`📦 Creating ${600 - existingBoxes} factory boxes...`)

    // Create boxes in batches to avoid memory issues
    const batchSize = 100
    for (let i = 0; i < 600; i += batchSize) {
      const batch = Array.from({ length: Math.min(batchSize, 600 - i) }, (_, j) => ({
        id: (i + j + 1).toString(),
        type: 'NORMAL',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      await prisma.box.createMany({
        data: batch,
        skipDuplicates: true
      })

      console.log(`✅ Created boxes ${i + 1} to ${Math.min(i + batchSize, 600)}`)
    }

    console.log('✅ Factory boxes initialized successfully!')
    console.log('📊 Total factory boxes available: 600')

  } catch (error) {
    console.error('❌ Error initializing factory boxes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initializeFactoryBoxes() 