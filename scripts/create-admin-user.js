const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔧 Creating default admin user...')

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists')
      return
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash('admin123', 12)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@olive-oil.com',
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN',
        isActive: true
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Username: admin')
    console.log('Password: admin123')
    console.log('⚠️  Please change the password after first login')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser() 