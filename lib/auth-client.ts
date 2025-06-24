'use client'

import Cookies from 'js-cookie'

export interface User {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  role: string
}

export interface LoginCredentials {
  username: string
  password: string
}

const COOKIE_NAME = 'auth-token'

// Optimized login function
export async function login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; message: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    const result = await response.json()

    if (result.success && result.data?.user) {
      return {
        success: true,
        user: result.data.user,
        message: result.message || 'Connexion réussie'
      }
    } else {
      return {
        success: false,
        message: result.message || 'Erreur de connexion'
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: 'Erreur de connexion au serveur'
    }
  }
}

// Enhanced logout function
export async function logout(): Promise<{ success: boolean; message: string }> {
  try {
    // Clear client-side storage immediately
    localStorage.removeItem('user')
    localStorage.clear() // Clear all localStorage
    Cookies.remove(COOKIE_NAME, { path: '/' })
    Cookies.remove(COOKIE_NAME, { path: '/', domain: window.location.hostname })
    Cookies.remove(COOKIE_NAME) // Remove without options as fallback
    
    // Call logout API
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Force page reload to clear any remaining state
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
    
    return {
      success: true,
      message: 'Déconnexion réussie'
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Even if API call fails, clear everything and redirect
    localStorage.removeItem('user')
    localStorage.clear()
    Cookies.remove(COOKIE_NAME, { path: '/' })
    Cookies.remove(COOKIE_NAME, { path: '/', domain: window.location.hostname })
    Cookies.remove(COOKIE_NAME)
    
    // Force page reload
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
    
    return {
      success: true,
      message: 'Déconnexion réussie'
    }
  }
}

// Fast authentication check - use localStorage since HttpOnly cookies can't be read by JS
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if we have user data in localStorage
  const userStr = localStorage.getItem('user')
  return !!userStr && userStr.length > 0
}

// Get current user from localStorage
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch (error) {
    console.error('Error getting current user:', error)
  }
  
  return null
}

// Save user to localStorage
export function saveUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

// Clear user from localStorage
export function clearUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
    localStorage.clear()
    Cookies.remove(COOKIE_NAME, { path: '/' })
    Cookies.remove(COOKIE_NAME, { path: '/', domain: window.location.hostname })
    Cookies.remove(COOKIE_NAME)
  }
}

// Fast redirect to login if not authenticated
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    window.location.href = '/login'
    return false
  }
  return true
}

// Check authentication status and redirect accordingly
export function checkAuthAndRedirect(): void {
  if (typeof window !== 'undefined') {
    const isAuth = isAuthenticated()
    const currentPath = window.location.pathname
    
    if (!isAuth && currentPath !== '/login') {
      window.location.href = '/login'
    } else if (isAuth && currentPath === '/login') {
      window.location.href = '/dashboard'
    }
  }
} 