import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PUT /api/collector-groups/[id] - Update a collector group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, isActive } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          createErrorResponse('Le nom du groupe ne peut pas être vide'),
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const group = await prisma.collectorGroup.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(
      createSuccessResponse(group, 'Groupe mis à jour avec succès')
    )
  } catch (error) {
    console.error('Error updating collector group:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la mise à jour du groupe'),
      { status: 500 }
    )
  }
}

// DELETE /api/collector-groups/[id] - Delete a collector group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await prisma.collectorGroup.delete({
      where: { id }
    })

    return NextResponse.json(
      createSuccessResponse(null, 'Groupe supprimé avec succès')
    )
  } catch (error) {
    console.error('Error deleting collector group:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la suppression du groupe'),
      { status: 500 }
    )
  }
}

