import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionSchema, sessionsQuerySchema } from '@/lib/validations'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createPaginatedResponse,
  generateSessionNumber,
  updateFarmerTotals,
  getDateRange
} from '@/lib/utils'
import { triggerDashboardUpdate } from '@/lib/dashboard-cache'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

// GET /api/sessions - Get all processing sessions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters with better error handling
    let query
    try {
      query = sessionsQuerySchema.parse(Object.fromEntries(searchParams))
    } catch (parseError) {
      console.error('Query validation error:', parseError)
      return NextResponse.json(
        createErrorResponse('Paramètres de requête invalides'),
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {}
    
    if (query.farmerId) {
      where.farmerId = query.farmerId
    }
    
    if (query.processingStatus !== 'all') {
      where.processingStatus = query.processingStatus.toUpperCase()
    }
    
    if (query.paymentStatus !== 'all') {
      where.paymentStatus = query.paymentStatus.toUpperCase()
    }

    // Date filtering
    if (query.dateFrom || query.dateTo) {
      try {
      const { from, to } = getDateRange(query.dateFrom, query.dateTo)
      where.createdAt = {
        gte: from,
        lte: to
        }
      } catch (dateError) {
        console.error('Date range error:', dateError)
        return NextResponse.json(
          createErrorResponse('Plage de dates invalide'),
          { status: 400 }
        )
      }
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (query.sortBy === 'createdAt') orderBy.createdAt = query.sortOrder
    else if (query.sortBy === 'processingDate') orderBy.processingDate = query.sortOrder
    else if (query.sortBy === 'totalPrice') orderBy.totalPrice = query.sortOrder
    else if (query.sortBy === 'sessionNumber') orderBy.sessionNumber = query.sortOrder

    // Execute queries with error handling
    let sessions, total
    try {
      [sessions, total] = await Promise.all([
      prisma.processingSession.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          farmer: query.includeFarmer ? {
            select: {
              id: true,
              name: true,
              nickname: true,
              phone: true,
              type: true,
              pricePerKg: true
            }
          } : false,
          sessionBoxes: query.includeBoxes ? {
              select: {
                id: true,
                boxId: true,
                boxWeight: true,
                boxType: true,
                farmerId: true,
                createdAt: true
            }
          } : false
        },
        orderBy
      }),
      prisma.processingSession.count({ where })
    ])
    } catch (dbError) {
      console.error('Database query error:', dbError)
      return NextResponse.json(
        createErrorResponse('Erreur de base de données'),
        { status: 500 }
      )
    }

    // Format response data with safe number conversion
    const formattedSessions = sessions.map((session: any) => {
      try {
        // Debug logging for sessionBoxes
        console.log('Raw session data:', session.id, {
          hasSessionBoxes: !!session.sessionBoxes,
          sessionBoxesLength: session.sessionBoxes?.length || 0,
          sessionBoxesData: session.sessionBoxes
        })

        const formatted = {
      ...session,
          processingStatus: session.processingStatus?.toLowerCase() || 'pending',
          paymentStatus: session.paymentStatus?.toLowerCase() || 'unpaid',
          oilWeight: session.oilWeight ? Number(session.oilWeight) : 0,
          totalBoxWeight: session.totalBoxWeight ? Number(session.totalBoxWeight) : 0,
          totalPrice: session.totalPrice ? Number(session.totalPrice) : 0,
          pricePerKg: session.pricePerKg ? Number(session.pricePerKg) : null, // Return null, not 0.15
          paymentDate: session.paymentDate || null, // Explicitly include paymentDate
          amountPaid: session.amountPaid ? Number(session.amountPaid) : 0,
          remainingAmount: session.remainingAmount ? Number(session.remainingAmount) : 0,
      farmer: query.includeFarmer && session.farmer ? {
        ...session.farmer,
            type: session.farmer.type?.toLowerCase() || 'small',
            pricePerKg: session.farmer.pricePerKg ? Number(session.farmer.pricePerKg) : null // Return null, not 0.15
      } : undefined,
          sessionBoxes: query.includeBoxes && session.sessionBoxes ? session.sessionBoxes.map((sb: any) => ({
            id: sb.id,
            boxId: sb.boxId,
            boxWeight: sb.boxWeight ? Number(sb.boxWeight) : 0,
            boxType: sb.boxType?.toLowerCase() || 'normal',
            farmerId: sb.farmerId,
            createdAt: sb.createdAt
          })) : []  // Always return an array, even if empty
        }

        // Debug the formatted result
        console.log('Formatted session boxes:', session.id, {
          sessionBoxes: formatted.sessionBoxes,
          includeBoxes: query.includeBoxes
        })

        return formatted
      } catch (formatError) {
        console.error('Session formatting error:', formatError, session)
        // Return minimal session data if formatting fails
        return {
          id: session.id,
          farmerId: session.farmerId,
          sessionNumber: session.sessionNumber || session.id,
          processingStatus: 'pending',
          paymentStatus: 'unpaid',
          oilWeight: 0,
          totalBoxWeight: 0,
          totalPrice: 0,
          boxCount: session.boxCount || 0,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      }
    })

    return NextResponse.json(
      createPaginatedResponse(formattedSessions, total, query.page, query.limit)
    )
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des sessions'),
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new processing session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createSessionSchema.parse(body)

    // Check if farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id: validatedData.farmerId }
    })

    if (!farmer) {
      return NextResponse.json(
        createErrorResponse('Agriculteur non trouvé'),
        { status: 404 }
      )
    }

    // Check if all boxes exist and are currently assigned to this farmer
    const boxes = await prisma.box.findMany({
      where: {
        id: { in: validatedData.boxIds },
        currentFarmerId: validatedData.farmerId,
        status: 'IN_USE'  // Only boxes that are currently in use by this farmer
      }
    })

    if (boxes.length !== validatedData.boxIds.length) {
      const foundBoxIds = boxes.map(box => box.id)
      const missingBoxIds = validatedData.boxIds.filter(id => !foundBoxIds.includes(id))
      
      return NextResponse.json(
        createErrorResponse(`Certaines boîtes ne sont pas disponibles ou n'appartiennent pas à cet agriculteur: ${missingBoxIds.join(', ')}`),
        { status: 400 }
      )
    }

    // Generate unique session number
    const sessionNumber = await generateSessionNumber(prisma)

    // Create session in transaction for data consistency
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the processing session
      const session = await tx.processingSession.create({
        data: {
          farmerId: validatedData.farmerId,
          sessionNumber,
          totalBoxWeight: validatedData.totalBoxWeight,
          boxCount: validatedData.boxCount,
          oilUnit: 'kg', // Default unit for new sessions
          // totalPrice and pricePerKg will be set during payment process
          // totalPrice: null (default)
          // pricePerKg: null (default)
        }
      })

      // Create session boxes records for traceability (THIS IS CRUCIAL!)
      const sessionBoxes = await Promise.all(
        boxes.map((box: any) =>
          tx.sessionBox.create({
            data: {
              sessionId: session.id,
              boxId: box.id,
              boxWeight: Number(box.currentWeight || 0),
              boxType: box.type,
              farmerId: validatedData.farmerId
            }
          })
        )
      )

      // PROFESSIONAL LOGIC: Change box status from IN_USE to AVAILABLE
      // This makes boxes reusable by other farmers immediately
      await tx.box.updateMany({
        where: { 
          id: { in: validatedData.boxIds } 
        },
        data: {
          status: 'AVAILABLE',           // Box becomes available for other farmers
          currentFarmerId: null,         // Remove farmer assignment
          currentWeight: null,           // Clear weight
          assignedAt: null,              // Clear assignment date
          isSelected: false              // Reset selection
        }
      })

      // Update farmer's last processing date
      await tx.farmer.update({
        where: { id: validatedData.farmerId },
        data: { lastProcessingDate: new Date() }
      })

      return { session, sessionBoxes }
    })

    // Update farmer totals
    await updateFarmerTotals(validatedData.farmerId, prisma)

    // Trigger dashboard update
    await triggerDashboardUpdate(`Created session ${sessionNumber} for farmer ${validatedData.farmerId}`)

    // Format response with proper data types
    const formattedSession = {
      ...result.session,
      processingStatus: result.session.processingStatus.toLowerCase(),
      paymentStatus: result.session.paymentStatus.toLowerCase(),
      oilWeight: Number(result.session.oilWeight),
      totalBoxWeight: Number(result.session.totalBoxWeight),
      totalPrice: Number(result.session.totalPrice),
      pricePerKg: Number(result.session.pricePerKg),
      // Include session boxes for immediate frontend display
      sessionBoxes: result.sessionBoxes.map((sb: any) => ({
        id: sb.id,
        boxId: sb.boxId,
        boxWeight: Number(sb.boxWeight),
        boxType: sb.boxType.toLowerCase(),
        farmerId: sb.farmerId,
        createdAt: sb.createdAt
      }))
    }

    return NextResponse.json(
      createSuccessResponse(formattedSession, `Session créée avec succès! ${boxes.length} boîtes sont maintenant disponibles pour d'autres agriculteurs.`),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error creating session:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création de la session'),
      { status: 500 }
    )
  }
}
