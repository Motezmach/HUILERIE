import { NextResponse } from 'next/server'
import { createSuccessResponse } from '@/lib/utils'

export async function POST() {
  try {
    const response = NextResponse.json(
      createSuccessResponse(null, 'Déconnexion réussie'),
      { status: 200 }
    )

    // Clear authentication cookie completely
    response.cookies.set({
      name: 'auth-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      expires: new Date(0) // Set to past date to ensure deletion
    })

    return response
  } catch (error) {
    console.error('Error in logout route:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
} 