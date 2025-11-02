import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    const where: any = {}
    
    if (employeeId) {
      where.employeeId = employeeId
    }
    
    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      const endDate = new Date(targetDate)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: targetDate, lte: endDate }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const formattedAttendance = attendance.map(att => ({
      id: att.id,
      employeeId: att.employeeId,
      employeeName: att.employee.name,
      date: att.date,
      status: att.status.toLowerCase(),
      notes: att.notes
    }))

    return NextResponse.json(
      createSuccessResponse(formattedAttendance, 'Présences récupérées avec succès')
    )
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des présences'),
      { status: 500 }
    )
  }
}

// POST /api/attendance - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, date, status, notes } = body

    if (!employeeId) {
      return NextResponse.json(
        createErrorResponse('L\'ID de l\'employé est requis'),
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        createErrorResponse('La date est requise'),
        { status: 400 }
      )
    }

    if (!status || !['present', 'absent', 'half_day'].includes(status.toLowerCase())) {
      return NextResponse.json(
        createErrorResponse('Statut invalide (present, absent ou half_day)'),
        { status: 400 }
      )
      }

    // Parse date and set to start of day
    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    // Upsert (create or update if exists)
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employeeId,
          date: attendanceDate
        }
      },
      update: {
        status: status.toUpperCase(),
        notes: notes?.trim() || null
      },
      create: {
        employeeId: employeeId,
        date: attendanceDate,
        status: status.toUpperCase(),
        notes: notes?.trim() || null
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(
      createSuccessResponse({
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: attendance.employee.name,
        date: attendance.date,
        status: attendance.status.toLowerCase(),
        notes: attendance.notes
      }, 'Présence enregistrée avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de l\'enregistrement de la présence'),
      { status: 500 }
    )
  }
}



