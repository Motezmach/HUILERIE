'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Package,
  Cog,
  DollarSign,
  Plus,
  Settings,
  BarChart3,
  Archive,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  RefreshCw,
  Activity,
  Calendar,
  Target,
  Filter,
  User,
  Box,
  CheckCircle,
  PauseCircle,
  XCircle,
  CreditCard,
  Banknote,
  Timer,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { logout, getCurrentUser, isAuthenticated } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

interface DashboardMetrics {
  totalFarmers: number
  totalBoxes: number
  activeBoxes: number
  pendingExtractions: number
  todayRevenue: number
  totalRevenue: number
  averageOilExtraction: number
  metricDate: string
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  amount?: number
  metadata?: any
}

interface BoxUtilization {
  used: number
  total: number
  percentage: number
}

interface DashboardTrends {
  farmersChange: number
  revenueChange: number
}

interface SessionStatusCounts {
  pending: number
  processed: number
  paid: number
  unpaidProcessed: number
}

interface BoxDetail {
  id: string
  type: string
  status: string
  currentFarmerId?: string
  currentFarmer?: {
    name: string
  }
  currentWeight?: number
  assignedAt?: string
}

interface DashboardData {
  metrics: DashboardMetrics
  recentActivity: RecentActivity[]
  boxUtilization: BoxUtilization
  trends: DashboardTrends
  sessionStatusCounts?: SessionStatusCounts
  lastUpdated: string
  fromCache: boolean
  dataTimestamp: number
  debug?: any
}

export default function Dashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [user, setUser] = useState<any>(null)
  
  // Box table states
  const [boxDetails, setBoxDetails] = useState<BoxDetail[]>([])
  const [boxFilter, setBoxFilter] = useState<string>('all')
  const [loadingBoxes, setLoadingBoxes] = useState(true)

  // Initialize user and check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    if (!currentUser) {
      router.push('/login')
    }
  }, [])

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout process...')
      
      // Clear authentication immediately
      await logout()
      
      console.log('✅ Logout completed, redirecting...')
      
      // Force hard redirect to ensure clean state
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Logout error:', error)
      
      // Force clear everything even if logout fails
      localStorage.clear()
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;'
      
      // Force redirect
      window.location.href = '/login'
    }
  }

  const fetchDashboardData = async (refresh = false) => {
    try {
      const url = `/api/dashboard${refresh ? '?refresh=true' : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch dashboard data`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
        setLastRefresh(new Date())
        console.log('✅ Dashboard data updated:', {
          totalFarmers: result.data.metrics.totalFarmers,
          boxUtilization: `${result.data.boxUtilization.used}/${result.data.boxUtilization.total}`,
          todayRevenue: result.data.metrics.todayRevenue,
          fromCache: result.data.fromCache
        })
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchBoxDetails = async () => {
    try {
      setLoadingBoxes(true)
      const response = await fetch('/api/boxes?status=IN_USE&includeCurrentFarmer=true&limit=100')
      
      if (!response.ok) {
        throw new Error('Failed to fetch box details')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setBoxDetails(result.data?.items || [])
      }
    } catch (err) {
      console.error('❌ Box details fetch error:', err)
    } finally {
      setLoadingBoxes(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchBoxDetails()
    
    // Set up automatic refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...')
      fetchDashboardData(false) // Refresh without showing loading state
      fetchBoxDetails() // Also refresh box details
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchDashboardData(true), // Force refresh
      fetchBoxDetails()
    ])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session_created':
        return <Plus className="w-4 h-4 text-blue-500" />
      case 'session_completed':
        return <Cog className="w-4 h-4 text-green-500" />
      case 'payment_received':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'farmer_added':
        return <Users className="w-4 h-4 text-blue-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'À l\'instant'
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`
  }

  const getBoxTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CHKARA':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'NCHIRA':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'NORMAL':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getBoxTypeLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CHKARA':
        return 'Chkara'
      case 'NCHIRA':
        return 'Nchira'
      case 'NORMAL':
      default:
        return 'Normal'
    }
  }

  // Filter box details based on selected filter
  const filteredBoxDetails = boxDetails.filter(box => {
    if (boxFilter === 'all') return true
    return box.type?.toUpperCase() === boxFilter.toUpperCase()
  })

  // Calculate box type statistics
  const boxTypeStats = ['NORMAL', 'NCHIRA', 'CHKARA'].map(type => {
    const typeBoxes = boxDetails.filter(box => box.type?.toUpperCase() === type)
    return {
      type,
      count: typeBoxes.length,
      label: getBoxTypeLabel(type)
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF5E6] transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-[#6B8E4B] rounded-lg flex items-center justify-center animate-pulse">
                <span className="text-white font-bold text-sm">HM</span>
              </div>
              <h1 className="text-2xl font-bold text-[#2C3E50]">HUILERIE MASMOUDI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-[#F4D03F] text-[#8B4513] border-[#F4D03F]">
                Gestionnaire d'usine
              </Badge>
              <div className="w-8 h-8 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">AM</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 min-h-screen animate-slideInLeft">
            <nav className="p-4 space-y-2">
              <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg transition-all duration-200 hover:bg-[#5A7A3F]">
                <BarChart3 className="w-5 h-5" />
                <span>Tableau de bord</span>
              </Link>
              <Link
                href="/olive-management"
                className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <Users className="w-5 h-5" />
                <span>Gestion des olives</span>
              </Link>
              <Link
                href="/oil-management"
                className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <Archive className="w-5 h-5" />
                <span>Gestion de l'huile</span>
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 animate-fadeIn">
            <div className="mb-6">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Ultra Modern Themed Loading Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className={`group relative overflow-hidden border-0 bg-white shadow-lg animate-pulse stagger-${i}`}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6B8E4B] to-[#F4D03F] opacity-75"></div>
                  <CardContent className="p-5 relative">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#6B8E4B]/20 to-[#6B8E4B]/30" />
                        <Skeleton className="h-4 w-4 rounded bg-gray-200" />
                      </div>
                      <Skeleton className="h-3 w-28 bg-[#6B8E4B]/20 rounded" />
                      <Skeleton className="h-8 w-20 bg-gradient-to-r from-[#2C3E50]/30 to-[#6B8E4B]/30 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full bg-gradient-to-r from-[#6B8E4B]/10 to-[#F4D03F]/10 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-6 w-full bg-orange-100 rounded-md" />
                          <Skeleton className="h-6 w-full bg-green-100 rounded-md" />
                          <Skeleton className="h-6 w-full bg-red-100 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Loading Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-0 shadow-lg animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDF5E6] flex items-center justify-center animate-fadeIn">
        <Card className="w-96 animate-scaleIn">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchDashboardData(true)} className="bg-[#6B8E4B] hover:bg-[#5A7A3F] transition-all duration-200">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // Enhanced metrics with detailed revenue and session information
  const metrics = [
    {
      title: "Total Agriculteurs",
      value: data.metrics.totalFarmers.toString(),
      change: data.trends.farmersChange,
      changeText: data.trends.farmersChange >= 0 ? `+${data.trends.farmersChange} aujourd'hui` : `${data.trends.farmersChange} aujourd'hui`,
      icon: Users,
      color: "text-blue-600",
      changeColor: data.trends.farmersChange >= 0 ? "text-green-600" : "text-red-600",
      changeIcon: data.trends.farmersChange >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: "Boîtes Disponibles",
      value: data.metrics.activeBoxes.toString(),
      change: data.boxUtilization.percentage,
      changeText: `${data.boxUtilization.used}/${data.boxUtilization.total} utilisées`,
      icon: Package,
      color: "text-yellow-600",
    },
    // Enhanced Revenue Card
    {
      title: "Revenus du Jour",
      value: formatCurrency(data.metrics.todayRevenue),
      change: data.trends.revenueChange,
      changeText: data.trends.revenueChange >= 0 ? `+${formatCurrency(data.trends.revenueChange)}` : formatCurrency(data.trends.revenueChange),
      icon: DollarSign,
      color: "text-green-600",
      changeColor: data.trends.revenueChange >= 0 ? "text-green-600" : "text-red-600",
      changeIcon: data.trends.revenueChange >= 0 ? TrendingUp : TrendingDown,
      // Additional revenue details
      subtitle: "Revenus Total",
      subtitleValue: formatCurrency(data.metrics.totalRevenue),
      enhanced: true
    },
    // Enhanced Extractions Card
    {
      title: "Sessions de Traitement",
      value: data.sessionStatusCounts ? 
        data.sessionStatusCounts.processed.toString() :
        data.metrics.pendingExtractions.toString(),
      changeText: "Sessions traitées",
      icon: Cog,
      color: "text-orange-600",
      // Session status breakdown
      enhanced: true,
      sessionStats: data.sessionStatusCounts ? {
        pending: data.sessionStatusCounts.pending || 0,
        processed: data.sessionStatusCounts.processed || 0,
        paid: data.sessionStatusCounts.paid || 0,
        unpaidProcessed: data.sessionStatusCounts.unpaidProcessed || 0,
      } : {
        pending: data.metrics.pendingExtractions,
        processed: 0,
        paid: 0,
        unpaidProcessed: 0,
      }
    },
  ]

  return (
    <div className="min-h-screen bg-[#FDF5E6] transition-all duration-300 ease-in-out">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-[#6B8E4B] rounded-lg flex items-center justify-center transition-transform duration-200 hover:scale-110">
              <span className="text-white font-bold text-sm">HM</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">HUILERIE MASMOUDI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-[#F4D03F] text-[#8B4513] border-[#F4D03F] animate-pulse">
              {user?.role || 'Gestionnaire d\'usine'}
            </Badge>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#6B8E4B] rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110">
                <span className="text-white text-sm font-medium">
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : 'AM'}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen animate-slideInLeft">
          <nav className="p-4 space-y-2">
            <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg transition-all duration-200 hover:bg-[#5A7A3F] transform hover:scale-105">
              <BarChart3 className="w-5 h-5" />
              <span>Tableau de bord</span>
            </Link>
            <Link
              href="/olive-management"
              className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <Users className="w-5 h-5" />
              <span>Gestion des olives</span>
            </Link>
            <Link
              href="/oil-management"
              className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <Archive className="w-5 h-5" />
              <span>Gestion de l'huile</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 animate-fadeIn">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="animate-slideInUp">
                <h2 className="text-3xl font-bold text-[#2C3E50] mb-2">Tableau de bord</h2>
                <p className="text-gray-600">Bon retour! Voici ce qui se passe dans votre usine aujourd'hui.</p>
              </div>
              <div className="flex items-center space-x-4 animate-slideInDown">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Dernière mise à jour: {lastRefresh ? formatDate(lastRefresh.toISOString()) : formatDate(data.lastUpdated)}</span>
                  {data.fromCache && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 animate-pulse">
                      Cache
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B] hover:text-white transition-all duration-200 transform hover:scale-105"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Actualisation...' : 'Actualiser'}
                </Button>
              </div>
            </div>
          </div>

          {/* Ultra Modern Themed Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric, index) => (
              <Card key={index} className="group relative overflow-hidden border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1 animate-slideInUp" style={{ animationDelay: `${index * 100}ms` }}>
                {/* Themed top border */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${metric.color.replace('text-', 'bg-').replace('-600', '-500')} opacity-90 group-hover:opacity-100 transition-all duration-300`}></div>
                
                <CardContent className="p-5 relative">
                  <div className="space-y-3">
                    {/* Header with Icon and Change Indicator */}
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${metric.color.replace('text-', 'bg-').replace('-600', '-50')} border border-opacity-20 ${metric.color.replace('text-', 'border-').replace('-600', '-200')} group-hover:scale-110 transition-transform duration-300`}>
                        <metric.icon className={`w-6 h-6 ${metric.color} drop-shadow-sm`} />
                      </div>
                      {!metric.enhanced && metric.changeIcon && (
                        <div className="flex items-center space-x-1">
                          <metric.changeIcon className={`w-4 h-4 ${metric.changeColor} opacity-75 group-hover:opacity-100 transition-all duration-300`} />
                        </div>
                      )}
                    </div>
                    
                    {/* Title with Application Theme */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#6B8E4B] uppercase tracking-widest leading-tight">
                        {metric.title}
                      </p>
                    </div>
                    
                    {/* Main Value with Enhanced Styling */}
                    <div className="flex items-baseline space-x-1">
                      <p className="text-2xl font-black text-[#2C3E50] group-hover:text-[#6B8E4B] transition-colors duration-300">
                        {metric.value}
                      </p>
                    </div>
                    
                    {/* Enhanced Revenue Details with Theme Colors */}
                    {metric.enhanced && metric.subtitle && (
                      <div className="flex items-center justify-between py-2.5 px-3 bg-gradient-to-r from-[#6B8E4B]/5 to-[#F4D03F]/5 rounded-lg border border-[#6B8E4B]/10 mt-3">
                        <span className="text-xs font-bold text-[#6B8E4B] uppercase tracking-wider">{metric.subtitle}</span>
                        <span className="text-sm font-black text-[#2C3E50]">{metric.subtitleValue}</span>
                      </div>
                    )}

                    {/* Session Stats - Vertical Compact Layout */}
                    {metric.enhanced && metric.sessionStats && (
                      <div className="space-y-1.5 pt-2 mt-2 border-t border-[#6B8E4B]/10">
                        {/* En Attente */}
                        <div className="flex items-center justify-between py-1.5 px-2 bg-orange-50 rounded-md border border-orange-100">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-400 shadow-sm"></div>
                            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">En Attente</span>
                          </div>
                          <span className="text-xs font-black text-orange-600">{metric.sessionStats.pending}</span>
                        </div>
                        
                        {/* Payé */}
                        <div className="flex items-center justify-between py-1.5 px-2 bg-green-50 rounded-md border border-green-100">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm"></div>
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Payé</span>
                          </div>
                          <span className="text-xs font-black text-green-600">{metric.sessionStats.paid}</span>
                        </div>
                        
                        {/* Non payé */}
                        <div className="flex items-center justify-between py-1.5 px-2 bg-red-50 rounded-md border border-red-100">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm"></div>
                            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Non payé</span>
                          </div>
                          <span className="text-xs font-black text-red-600">{metric.sessionStats.unpaidProcessed}</span>
                        </div>
                      </div>
                    )}

                    {/* Regular Change Text with Theme Colors */}
                    {!metric.enhanced && (
                      <div className="flex items-center space-x-1 pt-1">
                        <p className={`text-xs font-bold ${metric.changeColor || 'text-[#6B8E4B]'} uppercase tracking-wider`}>
                          {metric.changeText}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced Box Utilization and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Enhanced Box Utilization with Table */}
            <Card className="border-0 shadow-lg lg:col-span-2 animate-fadeInUp transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-[#6B8E4B]" />
                    <span>Utilisation des Boîtes</span>
                  </CardTitle>
                  <div className="flex items-center space-x-3">
                    {/* Box Type Stats */}
                    <div className="flex items-center space-x-2">
                      {boxTypeStats.map((stat, index) => (
                        <Badge
                          key={stat.type}
                          variant="secondary"
                          className={`text-xs ${getBoxTypeColor(stat.type)} animate-slideInRight transition-all duration-300 hover:scale-110`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {stat.label}: {stat.count}
                        </Badge>
                      ))}
                    </div>
                    {/* Filter */}
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={boxFilter} onValueChange={setBoxFilter}>
                        <SelectTrigger className="w-36 h-8 transition-all duration-200 hover:shadow-md">
                          <SelectValue placeholder="Filtrer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="nchira">Nchira</SelectItem>
                          <SelectItem value="chkara">Chkara</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Boîtes utilisées</span>
                    <span className="text-sm text-gray-600">{data.boxUtilization.used}/{data.boxUtilization.total}</span>
                  </div>
                  <Progress value={data.boxUtilization.percentage} className="h-3 transition-all duration-1000 ease-out" />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>0 boîtes</span>
                    <span className="animate-pulse">{data.boxUtilization.percentage}% utilisées</span>
                    <span>{data.boxUtilization.total} boîtes</span>
                  </div>
                </div>

                {/* Detailed Box Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#2C3E50]">
                      Détail des Boîtes Utilisées ({filteredBoxDetails.length})
                    </h4>
                    {loadingBoxes && (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#6B8E4B]" />
                    )}
                  </div>
                  
                  {filteredBoxDetails.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
                      <ScrollArea className="h-64 custom-scrollbar">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="w-20 text-xs font-semibold">ID Boîte</TableHead>
                              <TableHead className="w-24 text-xs font-semibold">Type</TableHead>
                              <TableHead className="flex-1 text-xs font-semibold">Agriculteur</TableHead>
                              <TableHead className="w-24 text-xs font-semibold">Poids</TableHead>
                              <TableHead className="w-32 text-xs font-semibold">Assignée le</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBoxDetails.map((box, index) => (
                              <TableRow key={box.id} className="hover:bg-gray-50 transition-all duration-200 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms` }}>
                                <TableCell className="font-mono text-xs">
                                  <div className="flex items-center space-x-1">
                                    <Box className="w-3 h-3 text-gray-400" />
                                    <span>#{box.id}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${getBoxTypeColor(box.type)} transition-all duration-200 hover:scale-110`}
                                  >
                                    {getBoxTypeLabel(box.type)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {box.currentFarmer ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-6 h-6 bg-[#6B8E4B] rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110">
                                        <User className="w-3 h-3 text-white" />
                                      </div>
                                      <span className="text-xs font-medium text-[#2C3E50] truncate">
                                        {box.currentFarmer.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Non assignée</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {box.currentWeight ? (
                                    <span className="font-medium">{Number(box.currentWeight).toFixed(1)} kg</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">
                                  {box.assignedAt ? (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDate(box.assignedAt)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 animate-fadeIn">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300 animate-bounce" />
                      <p className="text-sm">
                        {boxFilter === 'all' 
                          ? 'Aucune boîte utilisée pour le moment' 
                          : `Aucune boîte de type ${getBoxTypeLabel(boxFilter)} utilisée`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg lg:col-span-2 animate-fadeInUp transition-all duration-300 hover:shadow-xl" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Activité Récente</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={activity.id} className="flex items-start space-x-3 animate-slideInLeft transition-all duration-200 hover:bg-gray-50 p-2 rounded-lg" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C3E50] truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {getTimeAgo(activity.timestamp)}
                          </p>
                          {activity.amount && (
                            <p className="text-xs font-medium text-green-600 animate-pulse">
                              {formatCurrency(activity.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {data.recentActivity.length === 0 && (
                    <div className="text-center py-4 animate-fadeIn">
                      <p className="text-sm text-gray-500">Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg animate-fadeInUp transition-all duration-300 hover:shadow-xl" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#6B8E4B]" />
                <span>Actions Rapides</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/olive-management">
                  <Button className="w-full bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white h-12 transition-all duration-200 transform hover:scale-105 animate-slideInUp" style={{ animationDelay: '500ms' }}>
                    <Users className="w-5 h-5 mr-2" />
                    Gestion des Olives
                  </Button>
                </Link>
                <Link href="/oil-management">
                  <Button className="w-full bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white h-12 transition-all duration-200 transform hover:scale-105 animate-slideInUp" style={{ animationDelay: '600ms' }}>
                    <Archive className="w-5 h-5 mr-2" />
                    Gestion de l'Huile
                  </Button>
                </Link>
                <Button 
                  onClick={handleRefresh}
                  variant="outline" 
                  className="w-full border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B] hover:text-white h-12 transition-all duration-200 transform hover:scale-105 animate-slideInUp"
                  disabled={refreshing}
                  style={{ animationDelay: '700ms' }}
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualiser les Données
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}