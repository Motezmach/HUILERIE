import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0'
    }

    return NextResponse.json(createSuccessResponse(status, 'Service en bonne santé'))
  } catch (error) {
    console.error('Health check failed:', error)
    
    const status = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(
      createErrorResponse('Service indisponible'),
      { status: 503 }
    )
  }
}
