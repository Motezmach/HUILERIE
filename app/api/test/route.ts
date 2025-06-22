import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple test endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Test endpoint body:', body)
    
    return NextResponse.json({
      success: true,
      data: { received: body },
      message: 'Test successful'
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // First, check if any sessionBoxes exist at all
    const sessionBoxCount = await prisma.sessionBox.count()
    
    // Get all sessionBoxes
    const allSessionBoxes = await prisma.sessionBox.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    // Test query to check sessionBoxes data
    const sessions = await prisma.processingSession.findMany({
      take: 5,
      include: {
        sessionBoxes: {
          select: {
            id: true,
            boxId: true,
            boxWeight: true,
            boxType: true,
            farmerId: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('=== SESSION BOXES DEBUG ===')
    console.log('Total sessionBoxes in database:', sessionBoxCount)
    console.log('Recent sessionBoxes:', allSessionBoxes)
    console.log('Sessions with their sessionBoxes:', sessions.map(s => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      sessionBoxes: s.sessionBoxes
    })))

    return NextResponse.json({
      success: true,
      debug: {
        totalSessionBoxes: sessionBoxCount,
        recentSessionBoxes: allSessionBoxes,
        sessionsWithBoxes: sessions.map(s => ({
          id: s.id,
          sessionNumber: s.sessionNumber,
          boxCount: s.boxCount,
          sessionBoxes: s.sessionBoxes,
          sessionBoxesCount: s.sessionBoxes.length
        }))
      }
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error
    })
  }
}
