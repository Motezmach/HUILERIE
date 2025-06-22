import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateBoxIdSchema } from '@/lib/validations'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/boxes/validate - Validate box ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = validateBoxIdSchema.parse(body)
    
    const { id, type, excludeBoxId } = validatedData
    
    // Validate box ID format based on type
    let isValidFormat = false
    let formatError = ''
    
    if (type === 'chkara') {
      isValidFormat = id.startsWith('Chkara') && /^Chkara\d+$/.test(id)
      formatError = 'L\'ID Chkara doit être au format "Chkara" suivi d\'un numéro'
    } else {
      // For normal and nchira boxes, ID should be a number between 1-600
      const numId = parseInt(id)
      isValidFormat = !isNaN(numId) && numId >= 1 && numId <= 600
      formatError = 'L\'ID doit être un numéro entre 1 et 600'
    }
    
    if (!isValidFormat) {
      return NextResponse.json(
        createErrorResponse(formatError),
        { status: 400 }
      )
    }
    
    // Check if ID already exists (excluding specified box if provided)
    const whereClause: any = { id }
    if (excludeBoxId) {
      whereClause.NOT = { id: excludeBoxId }
    }
    
    const existingBox = await prisma.box.findFirst({
      where: whereClause
    })
    
    if (existingBox) {
      return NextResponse.json(
        createErrorResponse(`L'ID ${id} est déjà utilisé`),
        { status: 400 }
      )
    }
    
    // If Chkara type, suggest next available ID
    let suggestedId = id
    if (type === 'chkara') {
      const existingChkaraBoxes = await prisma.box.findMany({
        where: {
          id: { startsWith: 'Chkara' }
        },
        select: { id: true }
      })
      
      if (existingChkaraBoxes.length > 0) {
        const chkaraNums = existingChkaraBoxes
          .map((box: any) => parseInt(box.id.replace('Chkara', '')))
          .filter((num: number) => !isNaN(num))
          .sort((a: number, b: number) => a - b)
        
        let chkaraCounter = 1
        for (const num of chkaraNums) {
          if (num === chkaraCounter) {
            chkaraCounter++
          } else {
            break
          }
        }
        
        suggestedId = `Chkara${chkaraCounter}`
      } else {
        suggestedId = 'Chkara1'
      }
    }
    
    return NextResponse.json(
      createSuccessResponse({
        isValid: true,
        id,
        suggestedId: type === 'chkara' ? suggestedId : id
      }, 'ID de boîte valide')
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Données invalides: ' + (error as any).errors.map((e: any) => e.message).join(', ')),
        { status: 400 }
      )
    }
    
    console.error('Error validating box ID:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la validation de l\'ID'),
      { status: 500 }
    )
  }
}
