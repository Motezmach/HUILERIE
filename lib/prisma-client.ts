import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query'],
    })
  }
  prisma = global.prisma
}

export { prisma } 