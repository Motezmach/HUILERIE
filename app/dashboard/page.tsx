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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  RotateCcw,
  ArrowRight,
  Crown,
  Search,
  X,
  Eye,
  ExternalLink,
  Download,
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
  chkaraCount: number
  todayOilWeight?: number
  todayOliveWeight?: number
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
  const [boxSearchTerm, setBoxSearchTerm] = useState<string>('')
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [resettingBoxes, setResettingBoxes] = useState(false)
  
  // Activity modal states
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [activitySearchTerm, setActivitySearchTerm] = useState('')
  
  // Date filter state
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [dateFilterMode, setDateFilterMode] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ 
    from: new Date().toISOString().split('T')[0], 
    to: new Date().toISOString().split('T')[0] 
  })
  const [activeDateFilter, setActiveDateFilter] = useState<{ mode: 'single' | 'range'; from: string; to: string } | null>(null)

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAllActivities) {
        setShowAllActivities(false)
      }
    }

    if (showAllActivities) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [showAllActivities])

  // Initialize user and check authentication
  useEffect(() => {
    const checkAuth = () => {
    if (!isAuthenticated()) {
        console.log('❌ User not authenticated, redirecting to login')
      router.push('/login')
        return false
    }
    
    const currentUser = getCurrentUser()
    if (!currentUser) {
        console.log('❌ No user data found, redirecting to login')
      router.push('/login')
        return false
      }
      
      // Check if mobile and redirect to olive management
      const isMobile = window.innerWidth < 768 // md breakpoint
      if (isMobile) {
        console.log('📱 Mobile device detected, redirecting to olive management...')
        router.push('/olive-management')
        return false
      }
      
      setUser(currentUser)
      return true
    }
    
    // Add a small delay to prevent immediate redirects
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [router])

  // Fetch dashboard data and box details on mount
  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchBoxDetails()
    }
  }, [user])

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

  // Handle Excel export download
  const handleDownloadExcel = async () => {
    try {
      // Call the export API
      const response = await fetch('/api/export/excel', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du fichier')
      }

      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `huilerie_export_${new Date().toISOString().split('T')[0]}.xlsx`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading Excel:', error)
    }
  }

  const fetchDashboardData = async (refresh = false) => {
    try {
      const params = new URLSearchParams()
      if (refresh) params.append('refresh', 'true')
      
      // Add date filter parameters
      if (activeDateFilter) {
        if (activeDateFilter.mode === 'single') {
          params.append('date', activeDateFilter.from)
        } else {
          params.append('dateFrom', activeDateFilter.from)
          params.append('dateTo', activeDateFilter.to)
        }
      }
      
      const url = `/api/dashboard${params.toString() ? '?' + params.toString() : ''}`
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

  // Reload data when date filter changes
  useEffect(() => {
    if (activeDateFilter) {
      fetchDashboardData(true)
    }
  }, [activeDateFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchDashboardData(true), // Force refresh
      fetchBoxDetails()
    ])
  }

  const resetBoxes = async () => {
    const confirmationMessage = `Êtes-vous sûr de vouloir réinitialiser toutes les boîtes d'usine en cours d'utilisation ?\n\nCette action va :\n• Libérer toutes les boîtes d'usine actuellement utilisées\n• Les rendre disponibles pour d'autres agriculteurs\n• Exclure les boîtes Chkara (sacs) qui ne seront pas affectées\n• Mettre à jour le tableau de bord immédiatement\n\nCette action est irréversible.`

    if (!confirm(confirmationMessage)) {
      return
    }

    setResettingBoxes(true)
    try {
      const response = await fetch('/api/boxes/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reset boxes')
      }

      const result = await response.json()

      if (result.success) {
        // Show success message
        console.log('✅ Boxes reset successfully:', result.message)
        
        // Refresh dashboard data immediately
        await fetchDashboardData(true)
        
        // Refresh box details
        await fetchBoxDetails()
        
        // Show success notification (you can implement a toast system here)
        alert(result.message)
      } else {
        throw new Error(result.message || 'Failed to reset boxes')
      }
    } catch (error) {
      console.error('❌ Error resetting boxes:', error)
      alert('Erreur lors de la réinitialisation des boîtes')
    } finally {
      setResettingBoxes(false)
    }
  }

  // Date filter handlers
  const handleApplyDateFilter = async () => {
    // Set filter and close dialog immediately for instant feedback
    if (dateFilterMode === 'single') {
      setActiveDateFilter({ mode: 'single', from: singleDate, to: singleDate })
    } else {
      setActiveDateFilter({ mode: 'range', from: dateRange.from, to: dateRange.to })
    }
    setIsDateFilterOpen(false)
    
    // Data will auto-refresh via useEffect
  }

  const handleClearDateFilter = async () => {
    // Clear filter state immediately for instant UI feedback
    setActiveDateFilter(null)
    setSingleDate(new Date().toISOString().split('T')[0])
    setDateRange({ 
      from: new Date().toISOString().split('T')[0], 
      to: new Date().toISOString().split('T')[0] 
    })
    setIsDateFilterOpen(false)
    
    // Immediately fetch fresh data (will use today's data since activeDateFilter is null)
    setRefreshing(true)
    await fetchDashboardData(true)
    setRefreshing(false)
  }

  const handleQuickFilter = async (type: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth') => {
    const today = new Date()
    let from = ''
    let to = new Date().toISOString().split('T')[0]
    
    switch (type) {
      case 'today':
        from = to
        break
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        from = yesterday.toISOString().split('T')[0]
        to = from
        break
      case 'thisWeek':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        from = weekStart.toISOString().split('T')[0]
        break
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        from = monthStart.toISOString().split('T')[0]
        break
    }
    
    // Set filter and close dialog immediately
    setActiveDateFilter({ mode: 'range', from, to })
    setIsDateFilterOpen(false)
    
    // Data will auto-refresh via useEffect
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
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
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'NCHIRA':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'NORMAL':
      default:
        return 'bg-green-100 text-green-800 border-green-200'
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

  // Clear search when filter changes
  useEffect(() => {
    setBoxSearchTerm('')
  }, [boxFilter])

  // Clear activity search when modal closes
  useEffect(() => {
    if (!showAllActivities) {
      setActivitySearchTerm('')
    }
  }, [showAllActivities])

  // Filter box details based on selected filter and search term
  const filteredBoxDetails = boxDetails.filter(box => {
    // First filter by type
    const typeMatch = boxFilter === 'all' || box.type?.toUpperCase() === boxFilter.toUpperCase()
    
    // Then filter by search term (box ID)
    const searchMatch = !boxSearchTerm || 
      box.id.toLowerCase().includes(boxSearchTerm.toLowerCase()) ||
      box.id.toString().includes(boxSearchTerm)
    
    return typeMatch && searchMatch
  })

  // Filter activities based on search term (enhanced with farmer name)
  const filteredActivities = data?.recentActivity.filter(activity => {
    if (!activitySearchTerm) return true
    
    const searchTerm = activitySearchTerm.toLowerCase()
    
    // Search in description
    if (activity.description.toLowerCase().includes(searchTerm)) return true
    
    // Search in activity type
    if (activity.type.toLowerCase().includes(searchTerm)) return true
    
    // Search in amount
    if (activity.amount && activity.amount.toString().includes(searchTerm)) return true
    
    // Search in farmer name (extract from description)
    const farmerNameMatch = activity.description.match(/pour (.+?)(?:\s|$|\(|:)/)
    if (farmerNameMatch && farmerNameMatch[1].toLowerCase().includes(searchTerm)) return true
    
    // Search in box IDs (if available)
    if (activity.metadata?.boxIds) {
      const boxIds = Array.isArray(activity.metadata.boxIds) ? activity.metadata.boxIds : []
      if (boxIds.some((boxId: string) => boxId.toLowerCase().includes(searchTerm))) return true
    }
    
    // Search in box details (if available)
    if (activity.metadata?.boxDetails) {
      const boxDetails = Array.isArray(activity.metadata.boxDetails) ? activity.metadata.boxDetails : []
      if (boxDetails.some((box: any) => 
        box.id?.toLowerCase().includes(searchTerm) || 
        box.type?.toLowerCase().includes(searchTerm)
      )) return true
    }
    
    return false
  }) || []

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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadExcel}
                className="h-8 w-8 p-0 text-[#6B8E4B] hover:bg-[#6B8E4B]/10 transition-colors"
                title="Télécharger l'export Excel de toutes les données"
              >
                <Download className="w-5 h-5" />
              </Button>
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

  // Get filter display text
  const getFilterDisplayText = () => {
    if (!activeDateFilter) return "Aujourd'hui"
    
    if (activeDateFilter.mode === 'single') {
      const date = new Date(activeDateFilter.from)
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } else {
      const from = new Date(activeDateFilter.from)
      const to = new Date(activeDateFilter.to)
      if (activeDateFilter.from === activeDateFilter.to) {
        return from.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }
      return `${from.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${to.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
    }
  }

  // Enhanced metrics with detailed revenue and session information
  const metrics = [
    {
      title: activeDateFilter ? `Agriculteurs ${getFilterDisplayText()}` : "Total Agriculteurs",
      value: data.metrics.totalFarmers.toString(),
      change: data.trends.farmersChange,
      changeText: activeDateFilter 
        ? `${data.metrics.totalFarmers} ajouté(s)` 
        : (data.trends.farmersChange >= 0 ? `+${data.trends.farmersChange} aujourd'hui` : `${data.trends.farmersChange} aujourd'hui`),
      icon: Users,
      color: "text-blue-600",
      changeColor: data.trends.farmersChange >= 0 ? "text-green-600" : "text-red-600",
      changeIcon: data.trends.farmersChange >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: activeDateFilter ? `Production ${getFilterDisplayText()}` : "Production Aujourd'hui",
      value: "", // Will be custom rendered
      change: 0,
      changeText: "",
      icon: Activity,
      color: "text-yellow-600",
      isProductionCard: true, // Flag for custom rendering
      todayOilWeight: data.metrics.todayOilWeight || 0,
      todayOliveWeight: data.metrics.todayOliveWeight || 0,
    },
    // Enhanced Revenue Card
    {
      title: activeDateFilter ? `Revenus ${getFilterDisplayText()}` : "Revenus du Jour",
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadExcel}
              className="h-8 w-8 p-0 text-[#6B8E4B] hover:bg-[#6B8E4B]/10 transition-colors"
              title="Télécharger l'export Excel de toutes les données"
            >
              <Download className="w-5 h-5" />
            </Button>
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
            <Separator className="my-2" />
            <Link
              href="/huilerie"
              className="flex items-center space-x-3 px-3 py-2 text-[#8B4513] hover:bg-[#F4D03F]/10 rounded-lg transition-all duration-200 transform hover:scale-105 border border-[#F4D03F]/20"
            >
              <Crown className="w-5 h-5 text-[#F4D03F]" />
              <span className="font-semibold">HUILERIE</span>
              <Badge variant="secondary" className="ml-auto text-xs bg-[#F4D03F] text-[#8B4513]">
                Propriétaire
              </Badge>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 animate-fadeIn">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="animate-slideInUp">
                <h2 className="text-3xl font-bold text-[#2C3E50] mb-2">Tableau de bord</h2>
                <p className="text-gray-600">
                  {activeDateFilter 
                    ? `Données ${activeDateFilter.mode === 'single' ? 'du' : 'de la période'} ${getFilterDisplayText()}` 
                    : "Bon retour! Voici ce qui se passe dans votre usine aujourd'hui."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 animate-slideInDown">
                {/* Modern Date Filter Button */}
                <Button
                  onClick={() => setIsDateFilterOpen(true)}
                  variant={activeDateFilter ? "default" : "outline"}
                  className={`transition-all shadow-md ${
                    activeDateFilter 
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white border-0" 
                      : "border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {activeDateFilter ? (
                    <>
                      <span className="font-semibold">{getFilterDisplayText()}</span>
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                        Actif
                      </Badge>
                    </>
                  ) : (
                    "Filtrer par date"
                  )}
                </Button>

                {activeDateFilter && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearDateFilter}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    title="Réinitialiser le filtre"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Effacer
                  </Button>
                )}

                <Separator orientation="vertical" className="h-8 hidden md:block" />

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
                    {(metric as any).isProductionCard ? (
                      <div className="space-y-3 mt-2">
                        {/* Oil Collected */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Huile Collectée</p>
                            <p className="text-2xl font-black text-green-600 mt-1">{(metric as any).todayOilWeight?.toFixed(2) || '0.00'} <span className="text-sm font-medium">kg</span></p>
                          </div>
                          <Activity className="w-8 h-8 text-green-400 opacity-50" />
                        </div>
                        {/* Olive Collected */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                          <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Olives Collectées</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{(metric as any).todayOliveWeight?.toFixed(2) || '0.00'} <span className="text-sm font-medium">kg</span></p>
                          </div>
                          <Package className="w-8 h-8 text-amber-400 opacity-50" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline space-x-1">
                        <p className="text-2xl font-black text-[#2C3E50] group-hover:text-[#6B8E4B] transition-colors duration-300">
                          {metric.value}
                        </p>
                      </div>
                    )}
                    
                    {/* Creative Chkara Count Display */}
                    {(metric as any).chkaraCount !== undefined && (metric as any).chkaraCount > 0 && (
                      <div className="flex items-center justify-center mt-2 mb-1">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-full shadow-sm">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                            Chkara
                          </span>
                          <span className="text-xs font-black text-blue-800 bg-blue-200 px-1.5 py-0.5 rounded-full">
                            {(metric as any).chkaraCount}
                          </span>
                        </div>
                      </div>
                    )}
                    
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
                    {!metric.enhanced && !(metric as any).isProductionCard && metric.changeText && (
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
                <div className="space-y-4">
                  {/* Title and Controls Row */}
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

                  {/* Modern Search Bar Row */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#6B8E4B] transition-colors duration-200" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Rechercher par ID de boîte..."
                        value={boxSearchTerm}
                        onChange={(e) => setBoxSearchTerm(e.target.value)}
                        className="pl-10 pr-10 h-10 bg-white border-gray-200 focus:border-[#6B8E4B] focus:ring-[#6B8E4B] transition-all duration-200 hover:shadow-sm focus:shadow-md"
                      />
                      {boxSearchTerm && (
                        <button
                          onClick={() => setBoxSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Search Results Badge */}
                    {boxSearchTerm && (
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                        >
                          {filteredBoxDetails.length} résultat{filteredBoxDetails.length !== 1 ? 's' : ''}
                        </Badge>
                        {filteredBoxDetails.length === 0 && (
                          <Badge 
                            variant="outline" 
                            className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-medium"
                          >
                            Aucun résultat
                          </Badge>
                        )}
                      </div>
                    )}
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
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-[#2C3E50]">
                        Détail des Boîtes Utilisées ({filteredBoxDetails.length})
                      </h4>
                      {boxSearchTerm && (
                        <Badge variant="outline" className="text-xs bg-[#6B8E4B]/10 text-[#6B8E4B] border-[#6B8E4B]/20 animate-pulse">
                          🔍 Recherche active
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        💡 Cliquez sur un nom d'agriculteur pour le voir dans la gestion des olives
                      </Badge>
                    </div>
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
                              <TableHead className="flex-1 text-xs font-semibold">
                                <div className="flex items-center space-x-1">
                                  <span>Agriculteur</span>
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700">
                                    Cliquable
                                  </Badge>
                                </div>
                              </TableHead>
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
                                    <div className="flex items-center space-x-2 group">
                                      <div className="w-6 h-6 bg-[#6B8E4B] rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110">
                                        <User className="w-3 h-3 text-white" />
                                      </div>
                                      <Link 
                                        href={`/olive-management?farmerId=${box.currentFarmerId}`}
                                        className="text-xs font-medium text-[#2C3E50] truncate hover:text-[#6B8E4B] hover:underline transition-all duration-200 cursor-pointer group-hover:bg-[#6B8E4B]/5 px-2 py-1 rounded-md -mx-2"
                                        title={`Cliquer pour voir ${box.currentFarmer.name} dans la gestion des olives`}
                                      >
                                        <div className="flex items-center space-x-1">
                                          <span>{box.currentFarmer.name}</span>
                                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        </div>
                                      </Link>
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
                        {boxSearchTerm 
                          ? `Aucune boîte trouvée pour "${boxSearchTerm}"`
                          : boxFilter === 'all' 
                          ? 'Aucune boîte utilisée pour le moment' 
                          : `Aucune boîte de type ${getBoxTypeLabel(boxFilter)} utilisée`
                        }
                      </p>
                      {boxSearchTerm && (
                        <p className="text-xs text-gray-400 mt-1">
                          Essayez de modifier votre recherche ou de changer le filtre
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg lg:col-span-2 animate-fadeInUp transition-all duration-300 hover:shadow-xl" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Activité Récente</span>
                </CardTitle>
                  <Button
                    onClick={() => setShowAllActivities(true)}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-[#6B8E4B] hover:text-[#5A7A3F] hover:bg-[#6B8E4B]/10 transition-all duration-200 group"
                    title="Voir toutes les activités"
                  >
                    <Eye className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-sm font-medium">Voir tout</span>
                    <Badge variant="outline" className="text-xs bg-[#6B8E4B]/10 text-[#6B8E4B] border-[#6B8E4B]/20">
                      {data.recentActivity.length}
                    </Badge>
                  </Button>
                </div>
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

      {/* All Activities Modal */}
      {showAllActivities && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setShowAllActivities(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Historique Complet des Activités</h2>
                    <p className="text-sm text-white/80">
                      Toutes les activités de l'application ({data.recentActivity.length} activités)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAllActivities(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {data.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                                         <Input
                       type="text"
                       placeholder="Rechercher par nom d'agriculteur, boîte, montant..."
                       value={activitySearchTerm}
                       onChange={(e) => setActivitySearchTerm(e.target.value)}
                       className="pl-10 pr-10 h-10 bg-white border-gray-200 focus:border-[#6B8E4B] focus:ring-[#6B8E4B] transition-all duration-200"
                     />
                    {activitySearchTerm && (
                      <button
                        onClick={() => setActivitySearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                                         {activitySearchTerm && (
                       <div className="absolute -bottom-8 left-0">
                         <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                           {filteredActivities.length} résultat{filteredActivities.length !== 1 ? 's' : ''}
                         </Badge>
                       </div>
                     )}
                     
                     {/* Search Tips */}
                     {!activitySearchTerm && (
                       <div className="absolute -bottom-8 left-0">
                         <div className="flex items-center space-x-2 text-xs text-gray-500">
                           <span>💡 Recherche intelligente:</span>
                           <div className="flex items-center space-x-1">
                             <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-50 text-gray-600 border-gray-200">
                               Nom agriculteur
                             </Badge>
                             <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-50 text-gray-600 border-gray-200">
                               ID boîte
                             </Badge>
                             <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-50 text-gray-600 border-gray-200">
                               Montant
                             </Badge>
                           </div>
                         </div>
                       </div>
                     )}
                  </div>

                  {/* Activity Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Agriculteurs</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {activitySearchTerm 
                          ? filteredActivities.filter(a => a.type === 'farmer_added').length
                          : data.recentActivity.filter(a => a.type === 'farmer_added').length
                        }
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <Archive className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Traitements</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {activitySearchTerm 
                          ? filteredActivities.filter(a => a.type === 'session_completed').length
                          : data.recentActivity.filter(a => a.type === 'session_completed').length
                        }
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Sessions</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {activitySearchTerm 
                          ? filteredActivities.filter(a => a.type === 'session_created').length
                          : data.recentActivity.filter(a => a.type === 'session_created').length
                        }
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Paiements</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900 mt-1">
                        {activitySearchTerm 
                          ? filteredActivities.filter(a => a.type === 'payment_received').length
                          : data.recentActivity.filter(a => a.type === 'payment_received').length
                        }
                      </p>
                    </div>
                  </div>

                  {/* Activities List */}
                  <div className="space-y-3">
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 animate-slideInUp"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Activity Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6B8E4B]/10 to-[#F4D03F]/10 border border-[#6B8E4B]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>

                          {/* Activity Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                                                 <p className="text-sm font-semibold text-[#2C3E50] group-hover:text-[#6B8E4B] transition-colors duration-200">
                                   {activitySearchTerm ? 
                                     // Highlight search matches in description
                                     activity.description.split(new RegExp(`(${activitySearchTerm})`, 'gi')).map((part, index) => 
                                       part.toLowerCase() === activitySearchTerm.toLowerCase() ? 
                                         <span key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded font-bold">
                                           {part}
                                         </span> : part
                                     ) : 
                                     activity.description
                                   }
                                 </p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{getTimeAgo(activity.timestamp)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}</span>
                                  </div>
                                </div>
                              </div>

                                                             {/* Amount Display - Only for payment activities */}
                               {activity.type === 'payment_received' && activity.amount && (
                                 <div className="flex-shrink-0 ml-4">
                                   <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-1 rounded-full border border-green-200">
                                     <p className="text-sm font-bold text-green-700">
                                       {formatCurrency(activity.amount)}
                                     </p>
                                   </div>
                                 </div>
                               )}
                            </div>

                                                         {/* Box IDs Display - Only for completed sessions */}
                             {activity.type === 'session_completed' && (() => {
                               const boxIds = activity.metadata?.boxIds || []
                               const boxDetails = activity.metadata?.boxDetails || []
                               const hasBoxes = (Array.isArray(boxIds) && boxIds.length > 0) || (Array.isArray(boxDetails) && boxDetails.length > 0)
                               
                               if (!hasBoxes) return null
                               
                               const displayBoxes = boxDetails.length > 0 ? boxDetails : boxIds
                               const boxCount = displayBoxes.length
                               
                               return (
                                 <div className="mt-3 pt-3 border-t border-gray-100">
                                   <div className="flex items-center space-x-2 mb-2">
                                     <Package className="w-3 h-3 text-gray-500" />
                                     <span className="text-xs font-medium text-gray-600">Boîtes traitées:</span>
                                     <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                       {boxCount} boîte{boxCount > 1 ? 's' : ''}
                                     </Badge>
                                   </div>
                                   <div className="flex flex-wrap gap-1.5">
                                     {displayBoxes.map((box: any, index: number) => {
                                       // Handle both boxId strings and boxDetail objects
                                       const boxId = typeof box === 'string' ? box : box.id || box.boxId
                                       const boxType = typeof box === 'string' ? 
                                         (box.toLowerCase().includes('chkara') ? 'chkara' : 
                                          box.toLowerCase().includes('nchira') ? 'nchira' : 'normal') :
                                         (box.type || 'normal')
                                       
                                       return (
                                         <div key={index} className="group relative">
                                           <Badge 
                                             variant="outline" 
                                             className={`text-xs cursor-help transition-all duration-200 hover:scale-110 ${
                                               boxType === 'nchira' ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100' :
                                               boxType === 'chkara' ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' :
                                               'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                             }`}
                                           >
                                             {boxId}
                                           </Badge>
                                           {/* Tooltip with box type */}
                                           <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                                             {boxType.charAt(0).toUpperCase() + boxType.slice(1)}
                                           </div>
                                         </div>
                                       )
                                     })}
                                   </div>
                                 </div>
                               )
                             })()}
                           </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-8">
                       <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                       <p className="text-sm text-gray-500">
                         Aucune activité trouvée pour "{activitySearchTerm}"
                       </p>
                     </div>
                   )}
                   </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune activité</h3>
                  <p className="text-sm text-gray-500">
                    Les activités apparaîtront ici au fur et à mesure de l'utilisation de l'application
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Dernière mise à jour: {data.lastUpdated}</span>
                </div>
                <Button
                  onClick={() => setShowAllActivities(false)}
                  className="bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Date Filter Dialog */}
      {isDateFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideInUp">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center">
                    <Calendar className="w-7 h-7 mr-3" />
                    Filtrer par Période
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Sélectionnez une date ou une période pour filtrer les données
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDateFilterOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Filters */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Filtres Rapides</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleQuickFilter('today')}
                    className="h-16 flex-col border-2 border-green-300 hover:bg-green-50 hover:border-green-400 transition-all"
                  >
                    <Calendar className="w-5 h-5 text-green-600 mb-1" />
                    <span className="text-xs font-semibold text-green-700">Aujourd'hui</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickFilter('yesterday')}
                    className="h-16 flex-col border-2 border-amber-300 hover:bg-amber-50 hover:border-amber-400 transition-all"
                  >
                    <Clock className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="text-xs font-semibold text-amber-700">Hier</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickFilter('thisWeek')}
                    className="h-16 flex-col border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-all"
                  >
                    <BarChart3 className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs font-semibold text-blue-700">Cette Semaine</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickFilter('thisMonth')}
                    className="h-16 flex-col border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-all"
                  >
                    <Calendar className="w-5 h-5 text-purple-600 mb-1" />
                    <span className="text-xs font-semibold text-purple-700">Ce Mois</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Mode Selection */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Filtre Personnalisé</h4>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={dateFilterMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setDateFilterMode('single')}
                    className={`flex-1 h-12 transition-all ${
                      dateFilterMode === 'single'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'border-2 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Date Unique
                  </Button>
                  <Button
                    variant={dateFilterMode === 'range' ? 'default' : 'outline'}
                    onClick={() => setDateFilterMode('range')}
                    className={`flex-1 h-12 transition-all ${
                      dateFilterMode === 'range'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'border-2 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Période (De/À)
                  </Button>
                </div>

                {/* Date Inputs */}
                {dateFilterMode === 'single' ? (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <Label htmlFor="singleDate" className="text-sm font-semibold text-blue-800 mb-2 block">
                      Sélectionner une date
                    </Label>
                    <Input
                      id="singleDate"
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="h-12 text-base font-medium border-2 border-blue-300 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-4">
                    <div>
                      <Label htmlFor="fromDate" className="text-sm font-semibold text-blue-800 mb-2 block">
                        Date de début
                      </Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="h-12 text-base font-medium border-2 border-blue-300 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="toDate" className="text-sm font-semibold text-blue-800 mb-2 block">
                        Date de fin
                      </Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="h-12 text-base font-medium border-2 border-blue-300 focus:border-blue-500"
                      />
                    </div>
                    {/* Range preview */}
                    {dateRange.from && dateRange.to && (
                      <div className="bg-white border border-blue-300 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Période sélectionnée:</p>
                        <p className="text-sm font-bold text-blue-900">
                          {new Date(dateRange.from).toLocaleDateString('fr-FR')} → {new Date(dateRange.to).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <Button
                  onClick={handleApplyDateFilter}
                  className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg font-semibold shadow-lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Appliquer le Filtre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDateFilterOpen(false)}
                  className="px-6 h-14 border-2 border-gray-300 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}