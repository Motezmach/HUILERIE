import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function importAllData() {
  console.log('🚀 Starting data import to Neon...')
  
  const exportDir = path.join(process.cwd(), 'data-export')
  
  if (!fs.existsSync(exportDir)) {
    throw new Error('Export directory not found! Run export-data.ts first.')
  }

  try {
    // Import in correct order (respecting foreign key constraints)
    
    // 1. Users (no dependencies)
    console.log('📥 Importing Users...')
    const users = JSON.parse(fs.readFileSync(path.join(exportDir, 'users.json'), 'utf-8'))
    for (const user of users) {
      await prisma.user.create({ data: user })
    }
    console.log(`✅ Imported ${users.length} users`)

    // 2. Farmers (no dependencies)
    console.log('📥 Importing Farmers...')
    const farmers = JSON.parse(fs.readFileSync(path.join(exportDir, 'farmers.json'), 'utf-8'))
    for (const farmer of farmers) {
      const { currentBoxes, processingSessions, ...farmerData } = farmer
      await prisma.farmer.create({ data: farmerData })
    }
    console.log(`✅ Imported ${farmers.length} farmers`)

    // 3. Boxes (depends on Farmers)
    console.log('📥 Importing Boxes...')
    const boxes = JSON.parse(fs.readFileSync(path.join(exportDir, 'boxes.json'), 'utf-8'))
    for (const box of boxes) {
      const { sessionBoxes, ...boxData } = box
      await prisma.box.create({ data: boxData })
    }
    console.log(`✅ Imported ${boxes.length} boxes`)

    // 4. Processing Sessions (depends on Farmers)
    console.log('📥 Importing Processing Sessions...')
    const processingSessions = JSON.parse(fs.readFileSync(path.join(exportDir, 'processingSessions.json'), 'utf-8'))
    for (const session of processingSessions) {
      const { paymentTransactions, sessionBoxes, ...sessionData } = session
      await prisma.processingSession.create({ data: sessionData })
    }
    console.log(`✅ Imported ${processingSessions.length} processing sessions`)

    // 5. Session Boxes (depends on ProcessingSessions and Boxes)
    console.log('📥 Importing Session Boxes...')
    const sessionBoxes = JSON.parse(fs.readFileSync(path.join(exportDir, 'sessionBoxes.json'), 'utf-8'))
    for (const sessionBox of sessionBoxes) {
      await prisma.sessionBox.create({ data: sessionBox })
    }
    console.log(`✅ Imported ${sessionBoxes.length} session boxes`)

    // 6. Payment Transactions (depends on ProcessingSessions)
    console.log('📥 Importing Payment Transactions...')
    const paymentTransactions = JSON.parse(fs.readFileSync(path.join(exportDir, 'paymentTransactions.json'), 'utf-8'))
    for (const transaction of paymentTransactions) {
      await prisma.paymentTransaction.create({ data: transaction })
    }
    console.log(`✅ Imported ${paymentTransactions.length} payment transactions`)

    // 7. Oil Safes (no dependencies)
    console.log('📥 Importing Oil Safes...')
    const oilSafes = JSON.parse(fs.readFileSync(path.join(exportDir, 'oilSafes.json'), 'utf-8'))
    for (const safe of oilSafes) {
      const { purchases, sales, ...safeData } = safe
      await prisma.oilSafe.create({ data: safeData })
    }
    console.log(`✅ Imported ${oilSafes.length} oil safes`)

    // 8. Olive Purchases (depends on OilSafes)
    console.log('📥 Importing Olive Purchases...')
    const olivePurchases = JSON.parse(fs.readFileSync(path.join(exportDir, 'olivePurchases.json'), 'utf-8'))
    for (const purchase of olivePurchases) {
      await prisma.olivePurchase.create({ data: purchase })
    }
    console.log(`✅ Imported ${olivePurchases.length} olive purchases`)

    // 9. Oil Sales (depends on OilSafes)
    console.log('📥 Importing Oil Sales...')
    const oilSales = JSON.parse(fs.readFileSync(path.join(exportDir, 'oilSales.json'), 'utf-8'))
    for (const sale of oilSales) {
      await prisma.oilSale.create({ data: sale })
    }
    console.log(`✅ Imported ${oilSales.length} oil sales`)

    // 10. Transactions (no dependencies)
    console.log('📥 Importing Transactions...')
    const transactions = JSON.parse(fs.readFileSync(path.join(exportDir, 'transactions.json'), 'utf-8'))
    for (const transaction of transactions) {
      await prisma.transaction.create({ data: transaction })
    }
    console.log(`✅ Imported ${transactions.length} transactions`)

    // 11. Employees (no dependencies)
    console.log('📥 Importing Employees...')
    const employees = JSON.parse(fs.readFileSync(path.join(exportDir, 'employees.json'), 'utf-8'))
    for (const employee of employees) {
      const { attendance, payments, ...employeeData } = employee
      await prisma.employee.create({ data: employeeData })
    }
    console.log(`✅ Imported ${employees.length} employees`)

    // 12. Attendance (depends on Employees)
    console.log('📥 Importing Attendance...')
    const attendance = JSON.parse(fs.readFileSync(path.join(exportDir, 'attendance.json'), 'utf-8'))
    for (const record of attendance) {
      await prisma.attendance.create({ data: record })
    }
    console.log(`✅ Imported ${attendance.length} attendance records`)

    // 13. Employee Payments (depends on Employees)
    console.log('📥 Importing Employee Payments...')
    const employeePayments = JSON.parse(fs.readFileSync(path.join(exportDir, 'employeePayments.json'), 'utf-8'))
    for (const payment of employeePayments) {
      await prisma.employeePayment.create({ data: payment })
    }
    console.log(`✅ Imported ${employeePayments.length} employee payments`)

    // 14. Collector Groups (no dependencies)
    console.log('📥 Importing Collector Groups...')
    const collectorGroups = JSON.parse(fs.readFileSync(path.join(exportDir, 'collectorGroups.json'), 'utf-8'))
    for (const group of collectorGroups) {
      const { collections, payments, ...groupData } = group
      await prisma.collectorGroup.create({ data: groupData })
    }
    console.log(`✅ Imported ${collectorGroups.length} collector groups`)

    // 15. Daily Collections (depends on CollectorGroups)
    console.log('📥 Importing Daily Collections...')
    const dailyCollections = JSON.parse(fs.readFileSync(path.join(exportDir, 'dailyCollections.json'), 'utf-8'))
    for (const collection of dailyCollections) {
      await prisma.dailyCollection.create({ data: collection })
    }
    console.log(`✅ Imported ${dailyCollections.length} daily collections`)

    // 16. Collector Payments (depends on CollectorGroups)
    console.log('📥 Importing Collector Payments...')
    const collectorPayments = JSON.parse(fs.readFileSync(path.join(exportDir, 'collectorPayments.json'), 'utf-8'))
    for (const payment of collectorPayments) {
      await prisma.collectorPayment.create({ data: payment })
    }
    console.log(`✅ Imported ${collectorPayments.length} collector payments`)

    // 17. Dashboard Metrics (no dependencies)
    console.log('📥 Importing Dashboard Metrics...')
    const dashboardMetrics = JSON.parse(fs.readFileSync(path.join(exportDir, 'dashboardMetrics.json'), 'utf-8'))
    for (const metric of dashboardMetrics) {
      await prisma.dashboardMetrics.create({ data: metric })
    }
    console.log(`✅ Imported ${dashboardMetrics.length} dashboard metrics`)

    console.log('\n✨ Import complete! All data is now in Neon!')
    console.log('\n📊 Summary:')
    console.log(`   - ${users.length} users`)
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
    console.log(`   - ${dashboardMetrics.length} dashboard metrics`)

  } catch (error) {
    console.error('❌ Import failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importAllData()
  .then(() => {
    console.log('\n✅ Migration to Neon complete! Your app is now running on a FREE database!')
    console.log('\n🎉 Next steps:')
    console.log('   1. Test your app to make sure everything works')
    console.log('   2. Go to Prisma dashboard and cancel your subscription')
    console.log('   3. Delete the data-export folder (optional)')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
