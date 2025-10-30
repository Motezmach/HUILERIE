import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { name, phone, position, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (position !== undefined) updateData.position = position?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(
      createSuccessResponse(employee, 'Employé mis à jour avec succès')
    )
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour de l\'employé'),
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.employee.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Employé supprimé avec succès')
    )
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression de l\'employé'),
      { status: 500 }
    )
  }
}



