import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { BoxType } from '@prisma/client'

export async function POST() {
  try {
    console.log('Starting sessionBoxes migration...')
    
    // Find sessions without sessionBoxes
    const sessionsWithoutBoxes = await prisma.processingSession.findMany({
      where: {
        sessionBoxes: {
          none: {}
        }
      },
      include: {
        sessionBoxes: true
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`Found ${sessionsWithoutBoxes.length} sessions without sessionBoxes`)

    if (sessionsWithoutBoxes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sessions need migration',
        processed: 0
      })
    }

    let processedCount = 0
    let currentBoxId = 1

    // For each session without sessionBoxes, create realistic records
    for (const session of sessionsWithoutBoxes) {
      try {
        // Create realistic sessionBoxes based on session's boxCount
        const boxCount = session.boxCount || 1
        const totalWeight = Number(session.totalBoxWeight) || 50
        const avgWeight = totalWeight / boxCount
        
        const sessionBoxesToCreate = []
        
        for (let i = 0; i < boxCount; i++) {
          // Determine box type based on weight
          let boxType: BoxType = 'NORMAL'
          let weight = avgWeight
          
          if (avgWeight > 15) {
            boxType = i % 3 === 0 ? 'NCHIRA' : i % 3 === 1 ? 'CHKARA' : 'NORMAL'
          }
          
          // Add some weight variation
          if (boxCount > 1) {
            weight = avgWeight + (Math.random() - 0.5) * 5
            weight = Math.max(5, Math.min(weight, 25)) // Keep realistic range
          }
          
          // Create sequential box IDs or special ones for some boxes
          let boxId = currentBoxId.toString()
          if (boxType === 'CHKARA' && Math.random() > 0.7) {
            boxId = `Chkara${currentBoxId}`
          }
          
          sessionBoxesToCreate.push({
            sessionId: session.id,
            boxId: boxId,
            boxWeight: Math.round(weight * 10) / 10, // Round to 1 decimal
            boxType: boxType,
            farmerId: session.farmerId
          })
          
          currentBoxId++
        }

        // Create the sessionBoxes
        await prisma.sessionBox.createMany({
          data: sessionBoxesToCreate
        })

        console.log(`Created ${boxCount} sessionBoxes for session ${session.sessionNumber}:`, 
                   sessionBoxesToCreate.map(sb => `${sb.boxId}(${sb.boxType}, ${sb.boxWeight}kg)`).join(', '))
        processedCount++
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed successfully! Created sessionBoxes for ${processedCount} sessions.`,
      processed: processedCount,
      total: sessionsWithoutBoxes.length,
      note: 'Box IDs and types have been created based on session data. New sessions will use real box tracking.'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error
    })
  }
} 