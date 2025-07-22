'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Lock,
  Crown,
  Factory,
  ShoppingBag,
  Truck,
  Warehouse,
  Scale,
  Calculator,
  FileText,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Star,
  Award,
  Droplets,
  Play,
  Minus,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { logout, getCurrentUser } from '@/lib/auth-client'

interface FactoryMetrics {
  totalOliveReceived: number
  totalOilProduced: number
  totalRevenue: number
  totalExpenses: number
  profit: number
  profitMargin: number
  boxesInUse: number
  totalBoxes: number
  processingSessions: number
  completedSessions: number
}

interface ProcessingSession {
  id: string
  date: string
  oliveWeight: number
  oilWeight: number
  efficiency: number
  revenue: number
  cost: number
  profit: number
  status: 'pending' | 'processing' | 'completed'
}

interface Box {
  id: string
  weight: number
  status: 'empty' | 'filled' | 'processing'
  assignedTo: string
  assignedAt: string
}

export default function HuileriePage() {
  const router = useRouter()
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)

  // Mock data for factory metrics
  const [metrics, setMetrics] = useState<FactoryMetrics>({
    totalOliveReceived: 15420.5,
    totalOilProduced: 3084.1,
    totalRevenue: 154205.0,
    totalExpenses: 123364.0,
    profit: 30841.0,
    profitMargin: 20.0,
    boxesInUse: 45,
    totalBoxes: 100,
    processingSessions: 12,
    completedSessions: 8
  })

  const [sessions, setSessions] = useState<ProcessingSession[]>([
    {
      id: '1',
      date: '2025-01-17',
      oliveWeight: 1250.0,
      oilWeight: 250.0,
      efficiency: 20.0,
      revenue: 12500.0,
      cost: 10000.0,
      profit: 2500.0,
      status: 'completed'
    },
    {
      id: '2',
      date: '2025-01-16',
      oliveWeight: 980.0,
      oilWeight: 196.0,
      efficiency: 20.0,
      revenue: 9800.0,
      cost: 7840.0,
      profit: 1960.0,
      status: 'completed'
    }
  ])

  const [boxes, setBoxes] = useState<Box[]>([
    { id: '1', weight: 25.5, status: 'filled', assignedTo: 'Session #1', assignedAt: '2025-01-17' },
    { id: '2', weight: 0, status: 'empty', assignedTo: '', assignedAt: '' },
    { id: '3', weight: 30.2, status: 'processing', assignedTo: 'Session #2', assignedAt: '2025-01-17' }
  ])

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    if (!currentUser) {
      router.push('/login')
    }
  }, [])

  const handlePasswordSubmit = () => {
    if (password === '9999') {
      setShowPasswordDialog(false)
      setPasswordError('')
    } else {
      setPasswordError('Mot de passe incorrect')
      setPassword('')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login'
    } catch (error) {
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(1)} kg`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'processing': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'processing': return <Cog className="w-4 h-4 animate-spin" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  // Password Dialog
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#6B8E4B] via-[#5A7A3F] to-[#4A6A35] flex items-center justify-center p-4">
        <Card className="w-96 animate-scaleIn shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Crown Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F4D03F] to-[#F39C12] rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#2C3E50]">Section HUILERIE</h2>
                <p className="text-gray-600">Accès réservé aux propriétaires</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    className="pl-10 h-12 text-center font-mono text-lg tracking-widest"
                    autoFocus
                  />
                </div>
                
                {passwordError && (
                  <Alert className="border-red-500 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handlePasswordSubmit}
                  className="w-full h-12 bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Accéder à la section propriétaire
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#6B8E4B] transition-colors">
                  ← Retour au tableau de bord
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Star className="w-3 h-3 mr-1" />
                Propriétaire
              </Badge>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg border-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#6B8E4B] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="olive" className="data-[state=active]:bg-[#6B8E4B] data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Gestion Olives
            </TabsTrigger>
            <TabsTrigger value="oil" className="data-[state=active]:bg-[#6B8E4B] data-[state=active]:text-white">
              <Droplets className="w-4 h-4 mr-2" />
              Gestion Huile
            </TabsTrigger>
            <TabsTrigger value="finance" className="data-[state=active]:bg-[#6B8E4B] data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Finances
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Revenus Totaux</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(metrics.totalRevenue)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Huile Produite</p>
                      <p className="text-2xl font-bold text-blue-800">{formatWeight(metrics.totalOilProduced)}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Olives Reçues</p>
                      <p className="text-2xl font-bold text-orange-800">{formatWeight(metrics.totalOliveReceived)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Marge Bénéficiaire</p>
                      <p className="text-2xl font-bold text-purple-800">{metrics.profitMargin}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Box Utilization */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Warehouse className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Utilisation des Boîtes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Boîtes utilisées</span>
                    <span className="text-sm text-gray-600">{metrics.boxesInUse}/{metrics.totalBoxes}</span>
                  </div>
                  <Progress value={(metrics.boxesInUse / metrics.totalBoxes) * 100} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>0 boîtes</span>
                    <span>{((metrics.boxesInUse / metrics.totalBoxes) * 100).toFixed(1)}% utilisées</span>
                    <span>{metrics.totalBoxes} boîtes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cog className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Sessions Récentes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                          <Cog className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Session #{session.id}</p>
                          <p className="text-sm text-gray-600">{session.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatWeight(session.oilWeight)}</p>
                        <p className="text-sm text-gray-600">Efficacité: {session.efficiency}%</p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {getStatusIcon(session.status)}
                        <span className="ml-1 capitalize">{session.status}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Olive Management Tab */}
          <TabsContent value="olive" className="space-y-6">
            {/* Olive Reception Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Olives Reçues Aujourd'hui</p>
                      <p className="text-2xl font-bold text-green-800">1,250.5 kg</p>
                      <p className="text-xs text-green-600">+15% vs hier</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">En Attente de Traitement</p>
                      <p className="text-2xl font-bold text-orange-800">8 Sessions</p>
                      <p className="text-xs text-orange-600">2,450 kg olives</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Olive Reception Form */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Réception d'Olives</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Agriculteur (Optionnel)</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner agriculteur ou laisser vide" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sans agriculteur</SelectItem>
                        <SelectItem value="farmer1">Ahmed Ben Ali</SelectItem>
                        <SelectItem value="farmer2">Fatma Mansouri</SelectItem>
                        <SelectItem value="farmer3">Mohamed Karray</SelectItem>
                        <SelectItem value="farmer4">Salma Trabelsi</SelectItem>
                        <SelectItem value="farmer5">Hassan Ben Salem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Poids Olives (kg)</Label>
                    <Input placeholder="0.00" className="mt-1" />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Prix d'achat (DT/kg)</Label>
                    <Input placeholder="0.15" className="mt-1" />
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Enregistrer Réception
                  </Button>
                  <Button variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Processing Queue */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cog className="w-5 h-5 text-[#6B8E4B]" />
                  <span>File d'Attente de Traitement</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 1, farmer: "Ahmed Ben Ali", weight: 450.5, price: 0.15, date: "2025-01-17", status: "en_attente", totalValue: 67.58 },
                    { id: 2, farmer: "Fatma Mansouri", weight: 320.0, price: 0.15, date: "2025-01-17", status: "en_cours", totalValue: 48.00 },
                    { id: 3, farmer: "Mohamed Karray", weight: 280.5, price: 0.15, date: "2025-01-16", status: "en_attente", totalValue: 42.08 },
                    { id: 4, farmer: "Salma Trabelsi", weight: 195.0, price: 0.15, date: "2025-01-16", status: "en_attente", totalValue: 29.25 },
                    { id: 5, farmer: "Sans agriculteur", weight: 125.0, price: 0.15, date: "2025-01-15", status: "en_attente", totalValue: 18.75 }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{item.farmer}</p>
                          <p className="text-sm text-gray-600">{item.date} • {item.weight} kg • {item.price} DT/kg</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(item.totalValue)}</p>
                          <p className="text-xs text-gray-600">Valeur totale</p>
                        </div>
                        <Badge className={
                          item.status === 'en_cours' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }>
                          {item.status === 'en_cours' ? 'En cours' : 'En attente'}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Oil Management Tab */}
          <TabsContent value="oil" className="space-y-6">
            {/* Production Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Production Aujourd'hui</p>
                      <p className="text-2xl font-bold text-orange-800">250.5 kg</p>
                      <p className="text-xs text-orange-600">+12% vs hier</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Efficacité Moyenne</p>
                      <p className="text-2xl font-bold text-blue-800">20.3%</p>
                      <p className="text-xs text-blue-600">+0.5% cette semaine</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Stock Disponible</p>
                      <p className="text-2xl font-bold text-green-800">1,250 kg</p>
                      <p className="text-xs text-green-600">15 bidons de 80L</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <Warehouse className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Ventes du Jour</p>
                      <p className="text-2xl font-bold text-purple-800">180 kg</p>
                      <p className="text-xs text-purple-600">2,250 DT</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processing Control */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cog className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Contrôle de Traitement</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Processing */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-800">Démarrer Traitement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-green-700">Session #</Label>
                        <Input placeholder="Auto-généré" className="mt-1" disabled />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-700">Olives à traiter (kg)</Label>
                        <Input placeholder="0.00" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-green-700">Température (°C)</Label>
                        <Input placeholder="25-30" className="mt-1" />
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Play className="w-4 h-4 mr-2" />
                        Démarrer Traitement
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Processing Status */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-800">État du Traitement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Phase 1: Broyage</span>
                          <Badge className="bg-green-100 text-green-800">Terminé</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Phase 2: Malaxage</span>
                          <Badge className="bg-orange-100 text-orange-800">En cours</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Phase 3: Extraction</span>
                          <Badge className="bg-gray-100 text-gray-800">En attente</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Phase 4: Filtration</span>
                          <Badge className="bg-gray-100 text-gray-800">En attente</Badge>
                        </div>
                      </div>
                      <Progress value={45} className="h-2" />
                      <p className="text-xs text-gray-600">45% complété • 25 minutes restantes</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Oil Sales */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Ventes d'Huile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sales Form */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Nouvelle Vente</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Client</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client1">Restaurant Al Medina</SelectItem>
                            <SelectItem value="client2">Épicerie Centrale</SelectItem>
                            <SelectItem value="client3">Particulier - Ahmed</SelectItem>
                            <SelectItem value="new">Nouveau client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Quantité (kg)</Label>
                        <Input placeholder="0.00" className="mt-1" />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Prix unitaire (DT/kg)</Label>
                        <Input placeholder="12.50" className="mt-1" />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Type d'emballage</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bidon">Bidon 5L</SelectItem>
                            <SelectItem value="bidon10">Bidon 10L</SelectItem>
                            <SelectItem value="bidon20">Bidon 20L</SelectItem>
                            <SelectItem value="vrac">Vrac</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Enregistrer Vente
                      </Button>
                    </div>
                  </div>

                  {/* Recent Sales */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Ventes Récentes</h4>
                    <div className="space-y-3">
                      {[
                        { client: "Restaurant Al Medina", qty: 50, price: 12.50, date: "2025-01-17" },
                        { client: "Épicerie Centrale", qty: 25, price: 12.00, date: "2025-01-17" },
                        { client: "Particulier - Ahmed", qty: 10, price: 13.00, date: "2025-01-16" },
                        { client: "Restaurant Al Medina", qty: 30, price: 12.50, date: "2025-01-16" }
                      ].map((sale, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{sale.client}</p>
                            <p className="text-xs text-gray-600">{sale.date} • {sale.qty} kg</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{sale.price} DT/kg</p>
                            <p className="text-xs text-gray-600">{(sale.qty * sale.price).toFixed(2)} DT</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Control */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Contrôle Qualité</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Paramètres Physiques</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Acidité (%)</span>
                        <Badge className="bg-green-100 text-green-800">0.8%</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Indice de peroxyde</span>
                        <Badge className="bg-green-100 text-green-800">8.5</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Humidité (%)</span>
                        <Badge className="bg-green-100 text-green-800">0.2%</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Paramètres Organoleptiques</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fruité</span>
                        <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Amertume</span>
                        <Badge className="bg-green-100 text-green-800">Moyenne</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Piquant</span>
                        <Badge className="bg-green-100 text-green-800">Léger</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Actions</h4>
                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Nouveau Test Qualité
                      </Button>
                      <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Rapport Qualité
                      </Button>
                      <Button className="w-full justify-start bg-orange-600 hover:bg-orange-700">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Alerte Qualité
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Revenus Totaux</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(metrics.totalRevenue)}</p>
                      <p className="text-xs text-green-600">+8% ce mois</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700">Dépenses Totales</p>
                      <p className="text-2xl font-bold text-red-800">{formatCurrency(metrics.totalExpenses)}</p>
                      <p className="text-xs text-red-600">+5% ce mois</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Bénéfice Net</p>
                      <p className="text-2xl font-bold text-purple-800">{formatCurrency(metrics.profit)}</p>
                      <p className="text-xs text-purple-600">+12% ce mois</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Trésorerie</p>
                      <p className="text-2xl font-bold text-blue-800">{formatCurrency(45000)}</p>
                      <p className="text-xs text-blue-600">Solde actuel</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Management */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Gestion des Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add Transaction */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Nouvelle Transaction</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revenue">Revenu</SelectItem>
                            <SelectItem value="expense">Dépense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Catégorie</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vente_huile">Vente d'huile</SelectItem>
                            <SelectItem value="vente_olives">Vente d'olives</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="electricite">Électricité</SelectItem>
                            <SelectItem value="eau">Eau</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="salaires">Salaires</SelectItem>
                            <SelectItem value="fournitures">Fournitures</SelectItem>
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="autres">Autres</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <Input placeholder="Description de la transaction" className="mt-1" />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Montant (DT)</Label>
                        <Input placeholder="0.00" className="mt-1" />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Date</Label>
                        <Input type="date" className="mt-1" />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Réinitialiser
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Actions Rapides</h4>
                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau Revenu
                      </Button>
                      
                      <Button className="w-full justify-start bg-red-600 hover:bg-red-700">
                        <Minus className="w-4 h-4 mr-2" />
                        Nouvelle Dépense
                      </Button>
                      
                      <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Rapport Financier
                      </Button>
                      
                      <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                        <Calculator className="w-4 h-4 mr-2" />
                        Calculatrice
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Transactions Récentes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: "revenue", category: "Vente d'huile", description: "Restaurant Al Medina", amount: 625.00, date: "2025-01-17" },
                    { type: "expense", category: "Électricité", description: "Facture mensuelle", amount: -180.50, date: "2025-01-17" },
                    { type: "revenue", category: "Vente d'huile", description: "Épicerie Centrale", amount: 300.00, date: "2025-01-16" },
                    { type: "expense", category: "Maintenance", description: "Réparation presse", amount: -450.00, date: "2025-01-16" },
                    { type: "revenue", category: "Services", description: "Traitement olives", amount: 150.00, date: "2025-01-15" },
                    { type: "expense", category: "Fournitures", description: "Bidons et emballages", amount: -75.25, date: "2025-01-15" }
                  ].map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'revenue' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {transaction.type === 'revenue' ? (
                            <TrendingUp className="w-5 h-5 text-white" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.category} • {transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'revenue' ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Financial Reports */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-[#6B8E4B]" />
                  <span>Rapports Financiers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Rapports Mensuels</h4>
                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Janvier 2025
                      </Button>
                      <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Décembre 2024
                      </Button>
                      <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Novembre 2024
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Rapports Annuels</h4>
                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                        <FileText className="w-4 h-4 mr-2" />
                        2024 - Annuel
                      </Button>
                      <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                        <FileText className="w-4 h-4 mr-2" />
                        2023 - Annuel
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Analyses</h4>
                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analyse des Revenus
                      </Button>
                      <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Analyse des Dépenses
                      </Button>
                      <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Rapport de Rentabilité
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 