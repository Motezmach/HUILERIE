import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/employees - Get all employees
export async function GET(request: NextRequest) {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        attendance: {
          orderBy: {
            date: 'desc'
          },
          take: 30 // Last 30 days
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      position: emp.position,
      hireDate: emp.hireDate,
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
      recentAttendance: emp.attendance.map(att => ({
        id: att.id,
        date: att.date,
        status: att.status.toLowerCase(),
        notes: att.notes
      }))
    }))

    return NextResponse.json(
      createSuccessResponse(formattedEmployees, 'Employés récupérés avec succès')
    )
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des employés'),
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, position } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        createErrorResponse('Le nom de l\'employé est requis'),
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        position: position?.trim() || null
      }
    })

    return NextResponse.json(
      createSuccessResponse(employee, 'Employé créé avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création de l\'employé'),
      { status: 500 }
    )
  }
}



