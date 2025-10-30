'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Crown,
  Archive,
  Users,
  ArrowLeft,
  Download,
  Star,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Package
} from "lucide-react"
import { getCurrentUser } from '@/lib/auth-client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function HuilerieLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    // Check if user has already entered the premium password in this session
    const huilerieAuth = sessionStorage.getItem('huilerieAuth')
    if (huilerieAuth === '9999') {
      setShowPasswordDialog(false)
    }
  }, [])

  const handlePasswordSubmit = () => {
    if (password === '9999') {
      sessionStorage.setItem('huilerieAuth', '9999')
      setShowPasswordDialog(false)
      setPasswordError('')
    } else {
      setPasswordError('Mot de passe incorrect')
      setPassword('')
    }
  }

  const handleBackToDashboard = () => {
    // Clear the session auth when leaving
    sessionStorage.removeItem('huilerieAuth')
    router.push('/dashboard')
  }

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch('/api/export/excel', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du fichier')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `huilerie_export_${new Date().toISOString().split('T')[0]}.xlsx`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading Excel:', error)
    }
  }

  // Password Dialog
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2C3E50] via-[#34495E] to-[#2C3E50] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-[#F4D03F]">
          <CardHeader className="text-center bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#F4D03F] to-[#F39C12] rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold flex items-center justify-center">
              <Lock className="w-6 h-6 mr-2" />
              Section Propriétaire
            </CardTitle>
            <p className="text-sm text-white/80 mt-2">Accès Restreint - Code Requis</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Code d'accès
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="Entrez le code"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {passwordError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePasswordSubmit}
                  className="flex-1 bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35]"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Déverrouiller
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const navItems = [
    { href: '/huilerie', label: 'Citerne', icon: Archive },
    { href: '/huilerie/employees', label: 'Employés', icon: Users },
    { href: '/huilerie/collectors', label: 'Collecteurs', icon: Package },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF5E6] via-[#F8F4E8] to-[#F5F1E3]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F4D03F] to-[#F39C12] rounded-lg flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">HUILERIE MASMOUDI</h1>
                <p className="text-white/80 text-sm">Section Propriétaire</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadExcel}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
                title="Télécharger l'export Excel de toutes les données"
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Star className="w-3 h-3 mr-1" />
                Propriétaire
              </Badge>
              <Button
                onClick={handleBackToDashboard}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 min-h-[calc(100vh-80px)] p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] text-white shadow-md'
                      : 'text-[#2C3E50] hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

