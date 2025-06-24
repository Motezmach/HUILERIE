import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'olive-oil-management-system-2024-secret-key'
const JWT_EXPIRES_IN = '7d' // Longer session for better UX
const COOKIE_NAME = 'auth-token'

export interface AuthUser {
  id: string
  username: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  role: string
  isActive: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Verify JWT token - optimized
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      isActive: true
    }
  } catch (error) {
    return null
  }
}

// Get current user from request - optimized
export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    let token: string | undefined

    if (request) {
      token = request.cookies.get(COOKIE_NAME)?.value
    } else {
      const cookieStore = cookies()
      token = cookieStore.get(COOKIE_NAME)?.value
    }

    if (!token) {
      return null
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    // Skip database check for better performance - just trust the JWT
    // Only check database if we really need fresh data
    return decoded
  } catch (error) {
    return null
  }
}

// Optimized login user - minimal database operations
export async function loginUser(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | null> {
  try {
    // Find user by username with minimal select
    const user = await prisma.user.findUnique({
      where: { username: credentials.username },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      return null
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.password)
    if (!isValidPassword) {
      return null
    }

    // Skip updating lastLoginAt for faster login - this was causing delays
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { lastLoginAt: new Date() }
    // })

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    }

    const token = generateToken(authUser)

    return { user: authUser, token }
  } catch (error) {
    console.error('Error logging in user:', error)
    return null
  }
}

// Remove logout functionality to avoid cookie conflicts
export function logoutUser(): void {
  // This is now handled by the client-side logout
}

// Simple authentication check for middleware
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  
  return verifyToken(token) !== null
}

// Cookie configuration
export function getTokenCookieConfig() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/'
  }
} 