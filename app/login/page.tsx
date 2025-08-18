'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Eye, EyeOff, Leaf, Lock, User, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { login, saveUser, isAuthenticated, type LoginCredentials } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    username: '',
    password: ''
  })

  // Check if user is already authenticated - only once on mount
  useEffect(() => {
    if (!authChecked) {
      setAuthChecked(true)
      
      // Add a small delay to prevent immediate redirect
      const timer = setTimeout(() => {
        if (isAuthenticated()) {
          const isMobile = window.innerWidth < 768 // md breakpoint
          const redirectPath = isMobile ? '/olive-management' : '/dashboard'
          console.log(`✅ User already authenticated, redirecting to ${redirectPath}...`)
          router.push(redirectPath)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [authChecked, router])

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (message: string, type: 'error' | 'success') => {
    setNotification({ message, type })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginForm.username || !loginForm.password) {
      showNotification('Veuillez remplir tous les champs', 'error')
      return
    }

    setLoading(true)
    try {
      console.log('🔄 Starting login process...')
      const result = await login(loginForm)
      
      if (result.success && result.user) {
        console.log('✅ Login successful, user:', result.user)
        
        // Save user data immediately
        saveUser(result.user)
        showNotification(result.message, 'success')
        
        // Clear the form
        setLoginForm({ username: '', password: '' })
        
        const isMobile = window.innerWidth < 768 // md breakpoint
        const redirectPath = isMobile ? '/olive-management' : '/dashboard'
        console.log(`🔄 Redirecting to ${redirectPath}...`)
        
        // Small delay to ensure state is saved, then redirect
        setTimeout(() => {
          router.push(redirectPath)
        }, 100)
        
      } else {
        console.log('❌ Login failed:', result.message)
        showNotification(result.message, 'error')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      showNotification('Erreur lors de la connexion', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.3) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="relative w-full max-w-md animate-fadeInUp">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full mb-6 shadow-lg">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Système de Gestion
          </h1>
          <p className="text-gray-600">
            Usine d'Huile d'Olive
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <Alert className={`mb-6 animate-slideInDown ${
            notification.type === 'error' 
              ? 'border-red-200 bg-red-50' 
              : 'border-green-200 bg-green-50'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <AlertDescription className={
              notification.type === 'error' ? 'text-red-700' : 'text-green-700'
            }>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-900">
              Connexion Administrateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom d'utilisateur
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez votre mot de passe"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 pr-12"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Système réservé aux administrateurs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        .animate-slideInDown {
          animation: slideInDown 0.4s ease-out;
        }
      `}</style>
    </div>
  )
} 