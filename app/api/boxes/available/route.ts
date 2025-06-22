import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createSuccessResponse, 
  createErrorResponse
} from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/boxes/available - Get all available factory boxes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Get available boxes (not assigned to any farmer)
    const [availableBoxes, totalCount] = await Promise.all([
      prisma.box.findMany({
        where: { 
          status: 'AVAILABLE',
          // Exclude Chkara boxes as they are created on-demand
          type: { not: 'CHKARA' }
        },
        orderBy: [
          { 
            id: 'asc' // Sort numerically by converting to number
          }
        ],
        take: limit,
        skip: offset
      }),
      prisma.box.count({
        where: { 
          status: 'AVAILABLE',
          type: { not: 'CHKARA' }
        }
      })
    ])

    // Format the response
    const formattedBoxes = availableBoxes.map((box: any) => ({
      id: box.id,
      type: box.type.toLowerCase(),
      status: box.status.toLowerCase(),
      createdAt: box.createdAt
    }))

    // Sort numerically (since IDs are "1", "2", ..., "600")
    formattedBoxes.sort((a, b) => {
      const numA = parseInt(a.id)
      const numB = parseInt(b.id)
      return numA - numB
    })

    return NextResponse.json(
      createSuccessResponse({
        boxes: formattedBoxes,
        total: totalCount,
        available: totalCount,
        limit,
        offset
      }, `${totalCount} boîtes disponibles pour assignation`)
    )
  } catch (error) {
    console.error('Error fetching available boxes:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des boîtes disponibles'),
      { status: 500 }
    )
  }
} 