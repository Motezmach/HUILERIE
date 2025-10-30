import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/collector-groups - Get all collector groups
export async function GET(request: NextRequest) {
  try {
    const groups = await prisma.collectorGroup.findMany({
      include: {
        collections: {
          orderBy: {
            collectionDate: 'desc'
          },
          take: 10 // Last 10 collections per group
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(
      createSuccessResponse(groups, 'Groupes récupérés avec succès')
    )
  } catch (error) {
    console.error('Error fetching collector groups:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la récupération des groupes'),
      { status: 500 }
    )
  }
}

// POST /api/collector-groups - Create a new collector group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        createErrorResponse('Le nom du groupe est requis'),
        { status: 400 }
      )
    }

    // Check if group name already exists
    const existingGroup = await prisma.collectorGroup.findUnique({
      where: { name: name.trim() }
    })

    if (existingGroup) {
      return NextResponse.json(
        createErrorResponse('Un groupe avec ce nom existe déjà'),
        { status: 400 }
      )
    }

    const group = await prisma.collectorGroup.create({
      data: {
        name: name.trim()
      }
    })

    return NextResponse.json(
      createSuccessResponse(group, 'Groupe créé avec succès'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating collector group:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la création du groupe'),
      { status: 500 }
    )
  }
}

