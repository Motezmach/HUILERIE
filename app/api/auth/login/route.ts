import { NextRequest, NextResponse } from 'next/server'
import { loginUser, getTokenCookieConfig } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        createErrorResponse('Nom d\'utilisateur et mot de passe sont requis'),
        { status: 400 }
      )
    }

    // Attempt to login
    const result = await loginUser({ username, password })
    
    if (!result) {
      return NextResponse.json(
        createErrorResponse('Nom d\'utilisateur ou mot de passe incorrect'),
        { status: 401 }
      )
    }

    const { user, token } = result

    // Create response with user data
    const response = NextResponse.json(
      createSuccessResponse(
        { 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        },
        'Connexion réussie'
      ),
      { status: 200 }
    )

    // Set authentication cookie
    const cookieConfig = getTokenCookieConfig()
    console.log('🍪 Setting auth cookie with config:', cookieConfig)
    console.log('🔑 Token being set:', token.substring(0, 20) + '...')
    
    response.cookies.set({
      ...cookieConfig,
      value: token
    })

    console.log('✅ Cookie set successfully in response')
    return response
  } catch (error) {
    console.error('Error in login route:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la connexion'),
      { status: 500 }
    )
  }
} 