import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function exportAllData() {
  console.log('🚀 Starting data export from Prisma...')
  
  const exportDir = path.join(process.cwd(), 'data-export')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  try {
    // Export all tables
    console.log('📦 Exporting Farmers...')
    const farmers = await prisma.farmer.findMany({
      include: {
        currentBoxes: true,
        processingSessions: true,
      }
    })
    fs.writeFileSync(
      path.join(exportDir, 'farmers.json'),
      JSON.stringify(farmers, null, 2)
    )
    console.log(`✅ Exported ${farmers.length} farmers`)

    console.log('📦 Exporting Boxes...')
    const boxes = await prisma.box.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'boxes.json'),
      JSON.stringify(boxes, null, 2)
    )
    console.log(`✅ Exported ${boxes.length} boxes`)

    console.log('📦 Exporting Processing Sessions...')
    const processingSessions = await prisma.processingSession.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'processingSessions.json'),
      JSON.stringify(processingSessions, null, 2)
    )
    console.log(`✅ Exported ${processingSessions.length} processing sessions`)

    console.log('📦 Exporting Session Boxes...')
    const sessionBoxes = await prisma.sessionBox.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'sessionBoxes.json'),
      JSON.stringify(sessionBoxes, null, 2)
    )
    console.log(`✅ Exported ${sessionBoxes.length} session boxes`)

    console.log('📦 Exporting Payment Transactions...')
    const paymentTransactions = await prisma.paymentTransaction.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'paymentTransactions.json'),
      JSON.stringify(paymentTransactions, null, 2)
    )
    console.log(`✅ Exported ${paymentTransactions.length} payment transactions`)

    console.log('📦 Exporting Oil Safes...')
    const oilSafes = await prisma.oilSafe.findMany({
      include: {
        purchases: true,
        sales: true,
      }
    })
    fs.writeFileSync(
      path.join(exportDir, 'oilSafes.json'),
      JSON.stringify(oilSafes, null, 2)
    )
    console.log(`✅ Exported ${oilSafes.length} oil safes`)

    console.log('📦 Exporting Olive Purchases...')
    const olivePurchases = await prisma.olivePurchase.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'olivePurchases.json'),
      JSON.stringify(olivePurchases, null, 2)
    )
    console.log(`✅ Exported ${olivePurchases.length} olive purchases`)

    console.log('📦 Exporting Oil Sales...')
    const oilSales = await prisma.oilSale.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'oilSales.json'),
      JSON.stringify(oilSales, null, 2)
    )
    console.log(`✅ Exported ${oilSales.length} oil sales`)

    console.log('📦 Exporting Transactions...')
    const transactions = await prisma.transaction.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'transactions.json'),
      JSON.stringify(transactions, null, 2)
    )
    console.log(`✅ Exported ${transactions.length} transactions`)

    console.log('📦 Exporting Employees...')
    const employees = await prisma.employee.findMany({
      include: {
        attendance: true,
        payments: true,
      }
    })
    fs.writeFileSync(
      path.join(exportDir, 'employees.json'),
      JSON.stringify(employees, null, 2)
    )
    console.log(`✅ Exported ${employees.length} employees`)

    console.log('📦 Exporting Attendance...')
    const attendance = await prisma.attendance.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'attendance.json'),
      JSON.stringify(attendance, null, 2)
    )
    console.log(`✅ Exported ${attendance.length} attendance records`)

    console.log('📦 Exporting Employee Payments...')
    const employeePayments = await prisma.employeePayment.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'employeePayments.json'),
      JSON.stringify(employeePayments, null, 2)
    )
    console.log(`✅ Exported ${employeePayments.length} employee payments`)

    console.log('📦 Exporting Collector Groups...')
    const collectorGroups = await prisma.collectorGroup.findMany({
      include: {
        collections: true,
        payments: true,
      }
    })
    fs.writeFileSync(
      path.join(exportDir, 'collectorGroups.json'),
      JSON.stringify(collectorGroups, null, 2)
    )
    console.log(`✅ Exported ${collectorGroups.length} collector groups`)

    console.log('📦 Exporting Daily Collections...')
    const dailyCollections = await prisma.dailyCollection.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'dailyCollections.json'),
      JSON.stringify(dailyCollections, null, 2)
    )
    console.log(`✅ Exported ${dailyCollections.length} daily collections`)

    console.log('📦 Exporting Collector Payments...')
    const collectorPayments = await prisma.collectorPayment.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'collectorPayments.json'),
      JSON.stringify(collectorPayments, null, 2)
    )
    console.log(`✅ Exported ${collectorPayments.length} collector payments`)

    console.log('📦 Exporting Users...')
    const users = await prisma.user.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'users.json'),
      JSON.stringify(users, null, 2)
    )
    console.log(`✅ Exported ${users.length} users`)

    console.log('📦 Exporting Dashboard Metrics...')
    const dashboardMetrics = await prisma.dashboardMetrics.findMany()
    fs.writeFileSync(
      path.join(exportDir, 'dashboardMetrics.json'),
      JSON.stringify(dashboardMetrics, null, 2)
    )
    console.log(`✅ Exported ${dashboardMetrics.length} dashboard metrics`)

    console.log('\n✨ Export complete! All data saved to:', exportDir)
    console.log('\n📊 Summary:')
    console.log(`   - ${farmers.length} farmers`)
    console.log(`   - ${boxes.length} boxes`)
    console.log(`   - ${processingSessions.length} processing sessions`)
    console.log(`   - ${sessionBoxes.length} session boxes`)
    console.log(`   - ${paymentTransactions.length} payment transactions`)
    console.log(`   - ${oilSafes.length} oil safes`)
    console.log(`   - ${olivePurchases.length} olive purchases`)
    console.log(`   - ${oilSales.length} oil sales`)
    console.log(`   - ${transactions.length} transactions`)
    console.log(`   - ${employees.length} employees`)
    console.log(`   - ${attendance.length} attendance records`)
    console.log(`   - ${employeePayments.length} employee payments`)
    console.log(`   - ${collectorGroups.length} collector groups`)
    console.log(`   - ${dailyCollections.length} daily collections`)
    console.log(`   - ${collectorPayments.length} collector payments`)
    console.log(`   - ${users.length} users`)
    console.log(`   - ${dashboardMetrics.length} dashboard metrics`)

  } catch (error) {
    console.error('❌ Export failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

exportAllData()
  .then(() => {
    console.log('\n✅ All done! Your data is safe.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
