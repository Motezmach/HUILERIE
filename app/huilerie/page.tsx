'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Lock,
  Crown,
  Factory,
  Droplets,
  Star,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  ArrowLeft,
  Download,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Archive,
  BarChart3,
  Calendar,
  Loader2,
  Edit,
  Trash2,
  X,
  Save,
  RefreshCw,
  Printer,
  List,
} from "lucide-react"
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'

interface OilSafe {
  id: string
  name: string
  capacity: number
  currentStock: number
  description?: string
  isActive: boolean
  availableCapacity: number
  utilizationPercentage: number
  purchaseCount: number
  saleCount: number
  pendingOilCount: number
  createdAt: Date
  updatedAt: Date
}

interface Purchase {
  id: string
  purchaseDate: Date
  farmerName: string
  farmerPhone?: string
  oliveWeight: number
  pricePerKg: number
  totalCost: number
  oilProduced: number | null
  yieldPercentage: number | null
  safeId: string
  safeName: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  isPendingOil: boolean
}

export default function HuileriePage() {
  const router = useRouter()
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Data states
  const [safes, setSafes] = useState<OilSafe[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedSafe, setSelectedSafe] = useState<OilSafe | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // UI states
  const [isCreateSafeOpen, setIsCreateSafeOpen] = useState(false)
  const [isCreatePurchaseOpen, setIsCreatePurchaseOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null)
  const [showAllPurchases, setShowAllPurchases] = useState(false)
  const [printingSafe, setPrintingSafe] = useState(false)
  const [printingAllPurchases, setPrintingAllPurchases] = useState(false)
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [addingOilToPurchaseId, setAddingOilToPurchaseId] = useState<string | null>(null)
  const [addOilForm, setAddOilForm] = useState({ oilProduced: '' })
  
  // Forms
  const [safeForm, setSafeForm] = useState({
    name: '',
    capacity: '',
    description: ''
  })
  
  const [purchaseForm, setPurchaseForm] = useState({
    farmerName: '',
    farmerPhone: '',
    oliveWeight: '',
    pricePerKg: '',
    oilProduced: '',
    safeId: '',
    notes: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  })

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    if (!currentUser) {
      router.push('/login')
    }
  }, [])

  // Load data after password is verified
  useEffect(() => {
    if (!showPasswordDialog) {
      loadSafes()
      loadPurchases()
    }
  }, [showPasswordDialog])

  const handlePasswordSubmit = () => {
    if (password === '9999') {
      setShowPasswordDialog(false)
      setPasswordError('')
    } else {
      setPasswordError('Mot de passe incorrect')
      setPassword('')
    }
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  // Handle Excel export download
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

  const showNotification = (message: string, type: "error" | "success" | "warning") => {
    setNotification({ message, type })
  }

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Print handlers
  const handlePrintSafe = () => {
    setPrintingSafe(true)
    setTimeout(() => {
      window.print()
      setPrintingSafe(false)
    }, 100)
  }

  const handlePrintAllPurchases = () => {
    setPrintingAllPurchases(true)
    setTimeout(() => {
      window.print()
      setPrintingAllPurchases(false)
    }, 100)
  }

  const loadSafes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stock/safes')
      const data = await response.json()
      
      if (data.success) {
        setSafes(data.data)
      } else {
        showNotification(data.error || 'Erreur lors du chargement des coffres', 'error')
      }
    } catch (error) {
      console.error('Error loading safes:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadPurchases = async (safeId?: string) => {
    try {
      const url = safeId ? `/api/stock/purchases?safeId=${safeId}` : '/api/stock/purchases'
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setPurchases(data.data)
      } else {
        showNotification(data.error || 'Erreur lors du chargement des achats', 'error')
      }
    } catch (error) {
      console.error('Error loading purchases:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const handleCreateSafe = async () => {
    if (!safeForm.name.trim()) {
      showNotification('Le nom du coffre est requis', 'error')
      return
    }

    const capacity = parseFloat(safeForm.capacity)
    if (isNaN(capacity) || capacity <= 0) {
      showNotification('La capacité doit être supérieure à 0', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/stock/safes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: safeForm.name.trim(),
          capacity: capacity,
          description: safeForm.description.trim() || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSafes([...safes, data.data])
        setIsCreateSafeOpen(false)
        setSafeForm({ name: '', capacity: '', description: '' })
        showNotification('Coffre créé avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      console.error('Error creating safe:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCreatePurchase = async () => {
    if (!purchaseForm.farmerName.trim()) {
      showNotification('Le nom du fournisseur est requis', 'error')
      return
    }

    const oliveWeight = parseFloat(purchaseForm.oliveWeight)
    const pricePerKg = parseFloat(purchaseForm.pricePerKg)
    const oilProduced = purchaseForm.oilProduced ? parseFloat(purchaseForm.oilProduced) : null

    if (isNaN(oliveWeight) || oliveWeight <= 0) {
      showNotification('Le poids des olives doit être supérieur à 0', 'error')
      return
    }

    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      showNotification('Le prix par kg doit être supérieur à 0', 'error')
      return
    }

    // Oil is optional - can be null for pending production
    if (oilProduced !== null && (isNaN(oilProduced) || oilProduced <= 0)) {
      showNotification('La quantité d\'huile produite doit être supérieure à 0', 'error')
      return
    }

    if (!purchaseForm.safeId) {
      showNotification('Veuillez sélectionner un coffre', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/stock/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerName: purchaseForm.farmerName.trim(),
          farmerPhone: purchaseForm.farmerPhone.trim() || null,
          oliveWeight: oliveWeight,
          pricePerKg: pricePerKg,
          oilProduced: oilProduced,
          safeId: purchaseForm.safeId,
          notes: purchaseForm.notes.trim() || null,
          purchaseDate: purchaseForm.purchaseDate
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPurchases([data.data, ...purchases])
        setIsCreatePurchaseOpen(false)
        setPurchaseForm({
          farmerName: '',
          farmerPhone: '',
          oliveWeight: '',
          pricePerKg: '',
          oilProduced: '',
          safeId: '',
          notes: '',
          purchaseDate: new Date().toISOString().split('T')[0]
        })
        showNotification('Achat enregistré avec succès!', 'success')
        loadSafes() // Reload to update stock levels
      } else {
        showNotification(data.error || 'Erreur lors de l\'enregistrement', 'error')
      }
    } catch (error) {
      console.error('Error creating purchase:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchaseId(purchase.id)
    setEditForm({
      farmerName: purchase.farmerName,
      farmerPhone: purchase.farmerPhone || '',
      oliveWeight: purchase.oliveWeight.toString(),
      pricePerKg: purchase.pricePerKg.toString(),
      oilProduced: purchase.oilProduced ? purchase.oilProduced.toString() : '',
      notes: purchase.notes || '',
      purchaseDate: new Date(purchase.purchaseDate).toISOString().split('T')[0]
    })
  }

  const handleSavePurchase = async (purchaseId: string) => {
    const oliveWeight = parseFloat(editForm.oliveWeight)
    const pricePerKg = parseFloat(editForm.pricePerKg)
    const oilProduced = parseFloat(editForm.oilProduced)

    if (!editForm.farmerName.trim()) {
      showNotification('Le nom du fournisseur est requis', 'error')
      return
    }

    if (isNaN(oliveWeight) || oliveWeight <= 0) {
      showNotification('Le poids des olives doit être supérieur à 0', 'error')
      return
    }

    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      showNotification('Le prix par kg doit être supérieur à 0', 'error')
      return
    }

    if (isNaN(oilProduced) || oilProduced <= 0) {
      showNotification('La quantité d\'huile produite doit être supérieure à 0', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/stock/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerName: editForm.farmerName.trim(),
          farmerPhone: editForm.farmerPhone.trim() || null,
          oliveWeight: oliveWeight,
          pricePerKg: pricePerKg,
          oilProduced: oilProduced,
          notes: editForm.notes.trim() || null,
          purchaseDate: editForm.purchaseDate
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Update purchases list
        setPurchases(purchases.map(p => p.id === purchaseId ? data.data : p))
        setEditingPurchaseId(null)
        setEditForm({})
        showNotification('Achat mis à jour avec succès!', 'success')
        // Reload safes to update stock levels
        loadSafes()
      } else {
        showNotification(data.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch (error) {
      console.error('Error updating purchase:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPurchaseId(null)
    setEditForm({})
  }

  const handleAddOilToPurchase = async (purchaseId: string) => {
    const oilProduced = parseFloat(addOilForm.oilProduced)

    if (isNaN(oilProduced) || oilProduced <= 0) {
      showNotification('La quantité d\'huile produite doit être supérieure à 0', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/stock/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oilProduced: oilProduced
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Update purchases list
        setPurchases(purchases.map(p => p.id === purchaseId ? data.data : p))
        setAddingOilToPurchaseId(null)
        setAddOilForm({ oilProduced: '' })
        showNotification('Huile ajoutée avec succès!', 'success')
        // Reload safes to update stock levels and pending count
        loadSafes()
      } else {
        showNotification(data.error || 'Erreur lors de l\'ajout de l\'huile', 'error')
      }
    } catch (error) {
      console.error('Error adding oil:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  // Calculate totals from real data
  const totalCapacity = safes.reduce((sum, s) => sum + s.capacity, 0)
  const totalStock = safes.reduce((sum, s) => sum + s.currentStock, 0)
  const totalPurchases = purchases.length
  const totalInvestment = purchases.reduce((sum, p) => sum + p.totalCost, 0)
  const totalOilProduced = purchases.reduce((sum, p) => sum + (p.oilProduced || 0), 0)
  const purchasesWithOil = purchases.filter(p => p.oilProduced !== null)
  const averageYield = purchasesWithOil.length > 0
    ? purchasesWithOil.reduce((sum, p) => sum + (p.yieldPercentage || 0), 0) / purchasesWithOil.length
    : 0

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

  // Main Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF5E6] via-[#F8F4E8] to-[#F5F1E3]">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Alert
            className={`${
              notification.type === "error"
                ? "border-red-500 bg-red-50"
                : notification.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-green-500 bg-green-50"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        </div>
      )}

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

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Overview Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-blue-100 text-sm">Coffres Actifs</p>
                  <p className="text-3xl font-bold mt-1">{safes.filter(s => s.isActive).length}</p>
                  <p className="text-blue-100 text-xs mt-1">Total: {safes.length}</p>
                    </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Archive className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-green-100 text-sm">Stock Total</p>
                  <p className="text-3xl font-bold mt-1">{totalStock.toFixed(1)}</p>
                  <p className="text-green-100 text-xs mt-1">kg d'huile</p>
                    </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Droplets className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-purple-100 text-sm">Achats</p>
                  <p className="text-3xl font-bold mt-1">{totalPurchases}</p>
                  <p className="text-purple-100 text-xs mt-1">transactions</p>
                    </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-amber-100 text-sm">Investissement</p>
                  <p className="text-2xl font-bold mt-1">{totalInvestment.toFixed(2)}</p>
                  <p className="text-amber-100 text-xs mt-1">DT dépensés</p>
                    </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          <Button
            onClick={() => setIsCreateSafeOpen(true)}
            className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un Coffre
          </Button>
          <Button
            onClick={() => setIsCreatePurchaseOpen(true)}
            disabled={safes.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Nouvel Achat
          </Button>
          <Button
            onClick={() => {
              setShowAllPurchases(true)
              setSelectedSafe(null)
              loadPurchases()
            }}
            disabled={purchases.length === 0}
            variant="outline"
            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            <List className="w-4 h-4 mr-2" />
            Tous les Achats ({totalPurchases})
          </Button>
          <Button
            onClick={() => { 
              loadSafes(); 
              loadPurchases(); 
              setSelectedSafe(null);
              setShowAllPurchases(false);
            }}
            variant="outline"
            className="border-2 border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B]/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
                  </div>

        {/* Safes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#6B8E4B]" />
            <span className="ml-3 text-gray-600">Chargement...</span>
                  </div>
        ) : safes.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun coffre créé</h3>
              <p className="text-gray-500 mb-4">Créez votre premier coffre pour commencer à stocker de l'huile</p>
              <Button
                onClick={() => setIsCreateSafeOpen(true)}
                className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer le Premier Coffre
              </Button>
              </CardContent>
            </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safes.map(safe => (
              <Card 
                key={safe.id} 
                className={`border-0 shadow-lg cursor-pointer transition-all duration-300 ${
                  selectedSafe?.id === safe.id 
                    ? 'ring-4 ring-[#6B8E4B] ring-offset-2 scale-105 shadow-2xl bg-gradient-to-br from-white to-green-50' 
                    : 'hover:shadow-xl hover:scale-[1.02]'
                }`}
                onClick={() => {
                  setSelectedSafe(safe)
                  loadPurchases(safe.id)
                  setShowAllPurchases(false)
                }}
              >
                <CardHeader className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <Archive className="w-5 h-5 mr-2" />
                      {safe.name}
                      {safe.pendingOilCount > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="ml-2 bg-amber-500 text-white font-bold animate-pulse"
                          title={`${safe.pendingOilCount} achat(s) en attente d'huile`}
                        >
                          ! {safe.pendingOilCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {safe.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  {safe.description && (
                    <p className="text-sm text-white/80 mt-2">{safe.description}</p>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Capacity Progress */}
                        <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Utilisation</span>
                        <span className="text-sm font-bold text-[#2C3E50]">
                          {safe.utilizationPercentage.toFixed(1)}%
                        </span>
                        </div>
                      <Progress 
                        value={safe.utilizationPercentage} 
                        className="h-3"
                      />
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>{safe.currentStock.toFixed(1)} kg</span>
                        <span>{safe.capacity.toFixed(1)} kg</span>
                      </div>
                      </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-700 mb-1">Disponible</p>
                        <p className="text-lg font-bold text-blue-900">
                          {safe.availableCapacity.toFixed(1)} kg
                        </p>
                    </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-purple-700 mb-1">Achats</p>
                        <p className="text-lg font-bold text-purple-900">
                          {safe.purchaseCount}
                        </p>
                    </div>
                  </div>

                    {/* Action Hint */}
                    <div className="text-center pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Cliquez pour voir les détails
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
        )}

        {/* Selected Safe Details */}
        {selectedSafe && !showAllPurchases && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#2C3E50] to-[#34495E] text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Détails du Coffre: {selectedSafe.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrintSafe}
                    className="text-white hover:bg-white/20"
                    title="Imprimer les achats de ce coffre"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSafe(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              </CardHeader>
            <CardContent className="p-6">
              {/* Safe Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-700 mb-1">Stock Actuel</p>
                  <p className="text-2xl font-bold text-green-900">{selectedSafe.currentStock.toFixed(2)} kg</p>
                  </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-700 mb-1">Capacité Restante</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedSafe.availableCapacity.toFixed(2)} kg</p>
                  </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-700 mb-1">Taux d'utilisation</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedSafe.utilizationPercentage.toFixed(1)}%</p>
                  </div>
                  </div>
                  
              {/* Purchases for this safe */}
                  <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#2C3E50]">
                    Historique des Achats ({purchases.filter(p => p.safeId === selectedSafe.id).length})
                  </h3>
                  </div>
                  
                {purchases.filter(p => p.safeId === selectedSafe.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Aucun achat pour ce coffre</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {purchases.filter(p => p.safeId === selectedSafe.id).map(purchase => {
                      const isEditing = editingPurchaseId === purchase.id
                      const calculatedYield = isEditing && editForm.oliveWeight && editForm.oilProduced
                        ? ((parseFloat(editForm.oilProduced) / parseFloat(editForm.oliveWeight)) * 100).toFixed(1)
                        : (purchase.yieldPercentage || 0).toFixed(1)
                      const calculatedTotal = isEditing && editForm.oliveWeight && editForm.pricePerKg
                        ? (parseFloat(editForm.oliveWeight) * parseFloat(editForm.pricePerKg)).toFixed(2)
                        : purchase.totalCost.toFixed(2)

                      const isPending = purchase.isPendingOil
                      
                      return (
                        <Card 
                          key={purchase.id} 
                          className={`border ${
                            isEditing 
                              ? 'border-blue-400 ring-2 ring-blue-200' 
                              : isPending 
                                ? 'border-amber-400 bg-amber-50/50 hover:bg-amber-50' 
                                : 'border-gray-200'
                          } hover:shadow-md transition-all ${isPending && !isEditing ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (isPending && !isEditing) {
                              setAddingOilToPurchaseId(purchase.id)
                              setAddOilForm({ oilProduced: '' })
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            {isEditing ? (
                              // Edit Mode
                              <div className="space-y-4">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                  <h4 className="font-semibold text-blue-600 flex items-center">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Mode Édition
                                  </h4>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSavePurchase(purchase.id)}
                                      disabled={creating}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      disabled={creating}
                                    >
                                      <X className="w-4 h-4" />
                  </Button>
                </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-gray-600">Fournisseur</Label>
                                    <Input
                                      value={editForm.farmerName}
                                      onChange={(e) => setEditForm({...editForm, farmerName: e.target.value})}
                                      className="mt-1"
                                    />
                        </div>
                        <div>
                                    <Label className="text-xs text-gray-600">Téléphone</Label>
                                    <Input
                                      value={editForm.farmerPhone}
                                      onChange={(e) => setEditForm({...editForm, farmerPhone: e.target.value})}
                                      className="mt-1"
                                    />
                        </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Poids Olives (kg)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editForm.oliveWeight}
                                      onChange={(e) => setEditForm({...editForm, oliveWeight: e.target.value})}
                                      className="mt-1"
                                    />
                      </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Prix/kg (DT)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editForm.pricePerKg}
                                      onChange={(e) => setEditForm({...editForm, pricePerKg: e.target.value})}
                                      className="mt-1"
                                    />
                        </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Huile Produite (kg)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editForm.oilProduced}
                                      onChange={(e) => setEditForm({...editForm, oilProduced: e.target.value})}
                                      className="mt-1"
                                    />
                      </div>
                    <div>
                                    <Label className="text-xs text-gray-600">Date</Label>
                                    <Input
                                      type="date"
                                      value={editForm.purchaseDate}
                                      onChange={(e) => setEditForm({...editForm, purchaseDate: e.target.value})}
                                      className="mt-1"
                                    />
                    </div>
                    </div>

                    <div>
                                  <Label className="text-xs text-gray-600">Notes</Label>
                                  <Textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                                    rows={2}
                                    className="mt-1"
                                  />
                    </div>

                                {/* Live Calculations */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <p className="text-xs text-blue-700 mb-2 font-semibold">Calculs Automatiques</p>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                                      <span className="text-gray-600">Coût Total:</span>
                                      <span className="font-bold ml-2 text-amber-700">{calculatedTotal} DT</span>
                    </div>
                    <div>
                                      <span className="text-gray-600">Rendement:</span>
                                      <span className="font-bold ml-2 text-green-700">{calculatedYield}%</span>
                    </div>
                    </div>
                  </div>
            </div>
                            ) : (
                              // View Mode
                              <>
                                {/* Pending Oil Banner */}
                                {isPending && (
                                  <div className="mb-4 p-3 bg-amber-100 border border-amber-400 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                                        <p className="text-sm font-semibold text-amber-800">
                                          En attente de production d'huile
                                        </p>
                                      </div>
                                      <Badge className="bg-amber-500 text-white">
                                        Cliquez pour ajouter
                                      </Badge>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                                    <p className="text-sm text-gray-600">Fournisseur</p>
                                    <p className="font-semibold text-[#2C3E50]">{purchase.farmerName}</p>
                                    {purchase.farmerPhone && (
                                      <p className="text-xs text-gray-500">{purchase.farmerPhone}</p>
                                    )}
                      </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Date</p>
                                    <p className="font-semibold">{new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Olives Achetées</p>
                                    <p className="font-semibold">{purchase.oliveWeight.toFixed(2)} kg</p>
                                    <p className="text-xs text-gray-500">{purchase.pricePerKg.toFixed(2)} DT/kg</p>
                      </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Huile Produite</p>
                                    {isPending ? (
                                      <div className="flex items-center">
                                        <p className="font-semibold text-amber-600">En attente</p>
                                        <AlertCircle className="w-4 h-4 ml-2 text-amber-500" />
                                      </div>
                                    ) : (
                                      <>
                                        <p className="font-semibold text-green-600">{purchase.oilProduced?.toFixed(2)} kg</p>
                                        <p className="text-xs text-gray-500">Rendement: {purchase.yieldPercentage?.toFixed(1)}%</p>
                                      </>
                                    )}
                      </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Coût Total</p>
                                    <p className="font-bold text-amber-600">{purchase.totalCost.toFixed(2)} DT</p>
                      </div>
                                  {purchase.notes && (
                                    <div>
                                      <p className="text-sm text-gray-600">Notes</p>
                                      <p className="text-sm text-gray-800">{purchase.notes}</p>
                                    </div>
                                  )}
                    </div>

                                {/* Edit Button - Only show if not pending */}
                                {!isPending && (
                                  <div className="mt-4 pt-4 border-t flex justify-end">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditPurchase(purchase)
                                      }}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Modifier
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                    </CardContent>
                  </Card>
                      )
                    })}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
        )}

        {/* All Purchases View */}
        {showAllPurchases && purchases.length > 0 && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center">
                  <List className="w-5 h-5 mr-2" />
                  Tous les Achats ({purchases.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrintAllPurchases}
                    className="text-white hover:bg-white/20"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllPurchases(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                    </div>
                    </div>
              </CardHeader>
                <CardContent className="p-6">
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {purchases.map(purchase => {
                  const purchaseSafe = safes.find(s => s.id === purchase.safeId)
                  return (
                    <Card key={purchase.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Purchase Info */}
                      <div>
                                      <div className="flex items-center gap-2 mb-2">
                              <Archive className="w-4 h-4 text-[#6B8E4B]" />
                              <Badge 
                                variant="secondary" 
                                className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] text-white cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  const safe = safes.find(s => s.id === purchase.safeId)
                                  if (safe) {
                                    setSelectedSafe(safe)
                                    setShowAllPurchases(false)
                                    loadPurchases(safe.id)
                                  }
                                }}
                                title="Cliquer pour voir ce coffre"
                              >
                                {purchase.safeName}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">Fournisseur</p>
                            <p className="font-semibold text-[#2C3E50]">{purchase.farmerName}</p>
                            {purchase.farmerPhone && (
                              <p className="text-xs text-gray-500">{purchase.farmerPhone}</p>
                            )}
                      </div>

                          {/* Date & Quantities */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-600">Date</p>
                              <p className="font-semibold">{new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Olives Achetées</p>
                              <p className="font-semibold">{purchase.oliveWeight.toFixed(2)} kg</p>
                              <p className="text-xs text-gray-500">{purchase.pricePerKg.toFixed(2)} DT/kg</p>
                            </div>
                      </div>

                          {/* Oil & Cost */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-600">Huile Produite</p>
                              {purchase.oilProduced ? (
                                <>
                                  <p className="font-semibold text-green-600">{purchase.oilProduced.toFixed(2)} kg</p>
                                  <p className="text-xs text-gray-500">Rendement: {purchase.yieldPercentage?.toFixed(1)}%</p>
                                </>
                              ) : (
                                <p className="font-semibold text-amber-600">En attente</p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Coût Total</p>
                              <p className="font-bold text-amber-600">{purchase.totalCost.toFixed(2)} DT</p>
                            </div>
                      </div>
                        </div>
                        {purchase.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">Notes</p>
                            <p className="text-sm text-gray-800">{purchase.notes}</p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                  )
                })}
                  </div>

              {/* Summary Stats for All Purchases */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-[#2C3E50] mb-4">Résumé Global</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-700 mb-1">Total Olives</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {purchases.reduce((sum, p) => sum + p.oliveWeight, 0).toFixed(2)} kg
                    </p>
                          </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-700 mb-1">Total Huile</p>
                    <p className="text-2xl font-bold text-green-900">
                      {totalOilProduced.toFixed(2)} kg
                    </p>
                          </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-amber-700 mb-1">Investissement</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {totalInvestment.toFixed(2)} DT
                    </p>
                        </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-purple-700 mb-1">Rendement Moyen</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {averageYield.toFixed(1)}%
                    </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {/* Analytics Card */}
        {purchases.length > 0 && !showAllPurchases && !selectedSafe && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#F4D03F] to-[#F39C12]">
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Statistiques Globales
                </CardTitle>
              </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-2">Huile Totale Produite</p>
                  <p className="text-3xl font-bold text-green-600">{totalOilProduced.toFixed(2)} kg</p>
                      </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-2">Investissement Total</p>
                  <p className="text-3xl font-bold text-amber-600">{totalInvestment.toFixed(2)} DT</p>
                      </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-600 mb-2">Rendement Moyen</p>
                  <p className="text-3xl font-bold text-blue-600">{averageYield.toFixed(1)}%</p>
                      </div>
                    </div>
            </CardContent>
          </Card>
        )}
                  </div>

      {/* Print Views */}
      {printingSafe && selectedSafe && (
        <PrintSafePurchases 
          safe={selectedSafe} 
          purchases={purchases.filter(p => p.safeId === selectedSafe.id)}
        />
      )}

      {printingAllPurchases && (
        <PrintAllPurchases 
          purchases={purchases}
          safes={safes}
        />
      )}

      {/* Add Oil to Purchase Dialog */}
      <Dialog open={!!addingOilToPurchaseId} onOpenChange={() => {
        setAddingOilToPurchaseId(null)
        setAddOilForm({ oilProduced: '' })
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-600 flex items-center">
              <Droplets className="w-5 h-5 mr-2" />
              Ajouter l'Huile Produite
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {addingOilToPurchaseId && purchases.find(p => p.id === addingOilToPurchaseId) && (
              <>
                {/* Purchase Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Informations de l'achat:</p>
                  <div className="text-sm text-amber-800 space-y-1">
                    <p><strong>Fournisseur:</strong> {purchases.find(p => p.id === addingOilToPurchaseId)?.farmerName}</p>
                    <p><strong>Olives:</strong> {purchases.find(p => p.id === addingOilToPurchaseId)?.oliveWeight.toFixed(2)} kg</p>
                    <p><strong>Date:</strong> {new Date(purchases.find(p => p.id === addingOilToPurchaseId)!.purchaseDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {/* Oil Input */}
                <div>
                  <Label htmlFor="oilProduced" className="text-sm font-medium">Huile Produite (kg) *</Label>
                  <Input
                    id="oilProduced"
                    type="number"
                    step="0.01"
                    value={addOilForm.oilProduced}
                    onChange={(e) => setAddOilForm({ oilProduced: e.target.value })}
                    placeholder="Ex: 90"
                    className="mt-2"
                    autoFocus
                  />
                  {addOilForm.oilProduced && purchases.find(p => p.id === addingOilToPurchaseId) && (
                    <p className="text-xs text-gray-500 mt-2">
                      Rendement: {((parseFloat(addOilForm.oilProduced) / purchases.find(p => p.id === addingOilToPurchaseId)!.oliveWeight) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleAddOilToPurchase(addingOilToPurchaseId)}
                    disabled={creating}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {creating ? 'Enregistrement...' : 'Enregistrer l\'Huile'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddingOilToPurchaseId(null)
                      setAddOilForm({ oilProduced: '' })
                    }}
                    disabled={creating}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Safe Dialog */}
      <Dialog open={isCreateSafeOpen} onOpenChange={setIsCreateSafeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <Archive className="w-5 h-5 mr-2 text-[#6B8E4B]" />
              Créer un Nouveau Coffre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
                      <div>
              <Label htmlFor="safeName">Nom du Coffre *</Label>
              <Input
                id="safeName"
                value={safeForm.name}
                onChange={(e) => setSafeForm({...safeForm, name: e.target.value})}
                placeholder="Ex: Coffre Principal A"
              />
                      </div>
                      <div>
              <Label htmlFor="capacity">Capacité (kg) *</Label>
              <Input
                id="capacity"
                type="number"
                step="0.01"
                value={safeForm.capacity}
                onChange={(e) => setSafeForm({...safeForm, capacity: e.target.value})}
                placeholder="Ex: 1000"
              />
                      </div>
                      <div>
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea
                id="description"
                value={safeForm.description}
                onChange={(e) => setSafeForm({...safeForm, description: e.target.value})}
                placeholder="Ex: Coffre pour huile extra vierge"
                rows={3}
              />
                      </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateSafe}
                disabled={creating}
                className="flex-1 bg-[#6B8E4B] hover:bg-[#5A7A3F]"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {creating ? 'Création...' : 'Créer le Coffre'}
                      </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateSafeOpen(false)}
                disabled={creating}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
                      </Button>
                    </div>
                  </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Dialog */}
      <Dialog open={isCreatePurchaseOpen} onOpenChange={setIsCreatePurchaseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
              Enregistrer un Nouvel Achat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                <Label htmlFor="farmerName">Nom du Fournisseur *</Label>
                <Input
                  id="farmerName"
                  value={purchaseForm.farmerName}
                  onChange={(e) => setPurchaseForm({...purchaseForm, farmerName: e.target.value})}
                  placeholder="Ex: Ahmed Ben Mohamed"
                />
                    </div>
              <div>
                <Label htmlFor="farmerPhone">Téléphone</Label>
                <Input
                  id="farmerPhone"
                  value={purchaseForm.farmerPhone}
                  onChange={(e) => setPurchaseForm({...purchaseForm, farmerPhone: e.target.value})}
                  placeholder="Ex: 12345678"
                />
                    </div>
                  </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                <Label htmlFor="oliveWeight">Poids des Olives (kg) *</Label>
                <Input
                  id="oliveWeight"
                  type="number"
                  step="0.01"
                  value={purchaseForm.oliveWeight}
                  onChange={(e) => setPurchaseForm({...purchaseForm, oliveWeight: e.target.value})}
                  placeholder="Ex: 500"
                />
                    </div>
                    <div>
                <Label htmlFor="pricePerKg">Prix par kg (DT) *</Label>
                <Input
                  id="pricePerKg"
                  type="number"
                  step="0.01"
                  value={purchaseForm.pricePerKg}
                  onChange={(e) => setPurchaseForm({...purchaseForm, pricePerKg: e.target.value})}
                  placeholder="Ex: 2.50"
                />
                    </div>
                    </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="oilProduced">Huile Produite (kg) <span className="text-amber-600">(optionnel)</span></Label>
                <Input
                  id="oilProduced"
                  type="number"
                  step="0.01"
                  value={purchaseForm.oilProduced}
                  onChange={(e) => setPurchaseForm({...purchaseForm, oilProduced: e.target.value})}
                  placeholder="Ex: 90 (laisser vide si en attente)"
                  className={!purchaseForm.oilProduced ? 'border-amber-300' : ''}
                />
                {purchaseForm.oliveWeight && purchaseForm.oilProduced && (
                  <p className="text-xs text-gray-500 mt-1">
                    Rendement: {((parseFloat(purchaseForm.oilProduced) / parseFloat(purchaseForm.oliveWeight)) * 100).toFixed(1)}%
                  </p>
                )}
                {!purchaseForm.oilProduced && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Laissez vide pour ajouter l'huile plus tard
                  </p>
                )}
              </div>
                      <div>
                <Label htmlFor="safeId">Coffre de Stockage *</Label>
                <Select value={purchaseForm.safeId} onValueChange={(value) => setPurchaseForm({...purchaseForm, safeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un coffre" />
                          </SelectTrigger>
                          <SelectContent>
                    {safes.filter(s => s.isActive).map(safe => (
                      <SelectItem key={safe.id} value={safe.id}>
                        {safe.name} - Disponible: {safe.availableCapacity.toFixed(1)} kg
                      </SelectItem>
                    ))}
                          </SelectContent>
                        </Select>
                      </div>
                      </div>
                      
                      <div>
              <Label htmlFor="purchaseDate">Date d'Achat</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseForm.purchaseDate}
                onChange={(e) => setPurchaseForm({...purchaseForm, purchaseDate: e.target.value})}
              />
                      </div>
                      
                      <div>
              <Label htmlFor="notes">Notes (optionnelles)</Label>
              <Textarea
                id="notes"
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({...purchaseForm, notes: e.target.value})}
                placeholder="Ex: Olives de bonne qualité"
                rows={3}
              />
                      </div>
                      
            {/* Calculation Preview */}
            {purchaseForm.oliveWeight && purchaseForm.pricePerKg && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-semibold mb-2">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                    <span className="text-gray-600">Coût Total:</span>
                    <span className="font-bold ml-2 text-amber-900">
                      {(parseFloat(purchaseForm.oliveWeight) * parseFloat(purchaseForm.pricePerKg)).toFixed(2)} DT
                    </span>
                      </div>
                  {purchaseForm.oilProduced && (
                      <div>
                      <span className="text-gray-600">Rendement:</span>
                      <span className="font-bold ml-2 text-green-700">
                        {((parseFloat(purchaseForm.oilProduced) / parseFloat(purchaseForm.oliveWeight)) * 100).toFixed(1)}%
                      </span>
                      </div>
                  )}
                      </div>
                    </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleCreatePurchase}
                disabled={creating}
                className={`flex-1 ${
                  !purchaseForm.oilProduced 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {creating ? 'Enregistrement...' : !purchaseForm.oilProduced ? 'Enregistrer (Sans Huile)' : 'Enregistrer l\'Achat'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreatePurchaseOpen(false)}
                disabled={creating}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
                        </Button>
                      </div>
                    </div>
        </DialogContent>
      </Dialog>
                  </div>
  )
}

// Print Component for Single Safe Purchases
const PrintSafePurchases = ({ safe, purchases }: { safe: OilSafe; purchases: Purchase[] }) => {
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0)
  const totalOlives = purchases.reduce((sum, p) => sum + p.oliveWeight, 0)
  const totalOil = purchases.reduce((sum, p) => sum + (p.oilProduced || 0), 0)
  const purchasesWithOil = purchases.filter(p => p.oilProduced !== null)
  const avgYield = purchasesWithOil.length > 0 
    ? purchasesWithOil.reduce((sum, p) => sum + (p.yieldPercentage || 0), 0) / purchasesWithOil.length 
    : 0

  return (
    <div className="print-safe-purchases">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-safe-purchases,
          .print-safe-purchases * {
            visibility: visible;
          }
          .print-safe-purchases {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            background: white;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
        .safe-header {
          border-bottom: 3px solid #6B8E4B;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .safe-title {
          font-size: 24px;
          font-weight: bold;
          color: #2C3E50;
          margin-bottom: 5px;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .print-table th {
          background: #6B8E4B;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #5A7A3F;
        }
        .print-table td {
          padding: 8px;
          border: 1px solid #ddd;
          font-size: 11px;
        }
        .print-table tbody tr:nth-child(even) {
          background: #f8f8f8;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .stat-box {
          border: 2px solid #6B8E4B;
          padding: 15px;
          text-align: center;
          border-radius: 8px;
          background: #f0f5eb;
        }
        .stat-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #2C3E50;
        }
      `}} />
      
                    <div>
        {/* Header */}
        <div className="safe-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#6B8E4B', marginBottom: '5px' }}>
                HUILERIE MASMOUDI
              </h1>
              <p style={{ fontSize: '12px', color: '#666' }}>Section Propriétaire - Gestion de Stock</p>
                    </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', color: '#666' }}>Date d'impression:</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}
              </p>
                  </div>
                </div>
        </div>

        {/* Safe Info */}
        <div style={{ background: '#f0f5eb', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #6B8E4B' }}>
          <h2 className="safe-title">Coffre: {safe.name}</h2>
          {safe.description && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{safe.description}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '15px' }}>
                    <div>
              <p style={{ fontSize: '11px', color: '#666' }}>Capacité Totale</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{safe.capacity.toFixed(2)} kg</p>
                        </div>
                        <div>
              <p style={{ fontSize: '11px', color: '#666' }}>Stock Actuel</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{safe.currentStock.toFixed(2)} kg</p>
                        </div>
                    <div>
              <p style={{ fontSize: '11px', color: '#666' }}>Utilisation</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#9333ea' }}>{safe.utilizationPercentage.toFixed(1)}%</p>
                      </div>
                      </div>
                    </div>

        {/* Summary Stats */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Total Achats</div>
            <div className="stat-value">{purchases.length}</div>
                    </div>
          <div className="stat-box">
            <div className="stat-label">Total Olives</div>
            <div className="stat-value">{totalOlives.toFixed(1)} kg</div>
                    </div>
          <div className="stat-box">
            <div className="stat-label">Total Huile</div>
            <div className="stat-value">{totalOil.toFixed(1)} kg</div>
                  </div>
          <div className="stat-box">
            <div className="stat-label">Investissement</div>
            <div className="stat-value">{totalCost.toFixed(0)} DT</div>
            </div>
                      </div>
                      
        {/* Purchases Table */}
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#2C3E50', marginTop: '20px', marginBottom: '10px' }}>
          Historique des Achats ({purchases.length})
        </h3>
        
        {purchases.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Aucun achat enregistré pour ce coffre
          </p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Téléphone</th>
                <th>Olives (kg)</th>
                <th>Prix/kg</th>
                <th>Huile (kg)</th>
                <th>Rendement</th>
                <th>Coût Total</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase, index) => (
                <tr key={purchase.id}>
                  <td style={{ fontWeight: 'bold' }}>
                    {new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{purchase.farmerName}</td>
                  <td>{purchase.farmerPhone || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {purchase.oliveWeight.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {purchase.pricePerKg.toFixed(2)} DT
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                    {purchase.oilProduced ? purchase.oilProduced.toFixed(2) : 'En attente'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    {purchase.yieldPercentage ? purchase.yieldPercentage.toFixed(1) + '%' : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#d97706' }}>
                    {purchase.totalCost.toFixed(2)} DT
                  </td>
                  <td style={{ fontSize: '10px' }}>{purchase.notes || '-'}</td>
                </tr>
              ))}
              {/* Summary Row */}
              <tr style={{ background: '#f0f5eb', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ textAlign: 'right' }}>TOTAUX:</td>
                <td style={{ textAlign: 'right', color: '#2C3E50' }}>
                  {totalOlives.toFixed(2)} kg
                </td>
                <td style={{ textAlign: 'center' }}>-</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>
                  {totalOil.toFixed(2)} kg
                </td>
                <td style={{ textAlign: 'center', color: '#9333ea' }}>
                  {avgYield.toFixed(1)}%
                </td>
                <td style={{ textAlign: 'right', color: '#d97706' }}>
                  {totalCost.toFixed(2)} DT
                </td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '2px solid #6B8E4B', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#2C3E50' }}>
            HUILERIE MASMOUDI - Gestion Professionnelle de Stock d'Huile
          </p>
          <p style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
            Document généré automatiquement - {purchases.length} achat(s) pour le coffre "{safe.name}"
          </p>
                </div>
                      </div>
                      </div>
  )
}

// Print Component for All Purchases
const PrintAllPurchases = ({ purchases, safes }: { purchases: Purchase[]; safes: OilSafe[] }) => {
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0)
  const totalOlives = purchases.reduce((sum, p) => sum + p.oliveWeight, 0)
  const totalOil = purchases.reduce((sum, p) => sum + (p.oilProduced || 0), 0)
  const purchasesWithOil = purchases.filter(p => p.oilProduced !== null)
  const avgYield = purchasesWithOil.length > 0 
    ? purchasesWithOil.reduce((sum, p) => sum + (p.yieldPercentage || 0), 0) / purchasesWithOil.length 
    : 0

  return (
    <div className="print-all-purchases">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-all-purchases,
          .print-all-purchases * {
            visibility: visible;
          }
          .print-all-purchases {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15mm;
            background: white;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }
        .all-header {
          border-bottom: 3px solid #9333ea;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .purchases-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          font-size: 9px;
        }
        .purchases-table th {
          background: #9333ea;
          color: white;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #7e22ce;
          font-size: 9px;
        }
        .purchases-table td {
          padding: 5px 4px;
          border: 1px solid #ddd;
          font-size: 8px;
        }
        .purchases-table tbody tr:nth-child(even) {
          background: #faf5ff;
        }
        .purchases-table tfoot tr {
          background: #f0f5eb;
          font-weight: bold;
          border-top: 3px solid #6B8E4B;
        }
        .summary-box {
          background: #f0f5eb;
          border: 2px solid #6B8E4B;
          padding: 10px;
          margin: 12px 0;
          border-radius: 6px;
        }
        .print-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid #9333ea;
          text-align: center;
        }
      `}} />
      
      <div>
        {/* Header */}
        <div className="all-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#9333ea', marginBottom: '4px' }}>
                HUILERIE MASMOUDI
              </h1>
              <p style={{ fontSize: '10px', color: '#666' }}>Section Propriétaire - Tous les Achats</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9px', color: '#666' }}>Date d'impression:</p>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        {/* Global Summary */}
        <div className="summary-box">
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#2C3E50', marginBottom: '8px' }}>
            Résumé Global ({purchases.length} achats)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>Total Olives</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{totalOlives.toFixed(1)} kg</p>
            </div>
            <div>
              <p style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>Total Huile</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>{totalOil.toFixed(1)} kg</p>
            </div>
            <div>
              <p style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>Rendement Moyen</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#9333ea' }}>{avgYield.toFixed(1)}%</p>
            </div>
            <div>
              <p style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>Investissement Total</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#d97706' }}>{totalCost.toFixed(0)} DT</p>
            </div>
          </div>
        </div>

        {/* All Purchases Table */}
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#2C3E50', marginTop: '12px', marginBottom: '6px' }}>
          Liste Complète des Achats
        </h3>
        
        <table className="purchases-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>N°</th>
              <th style={{ width: '9%' }}>Date</th>
              <th style={{ width: '13%' }}>Coffre</th>
              <th style={{ width: '15%' }}>Fournisseur</th>
              <th style={{ width: '10%' }}>Téléphone</th>
              <th style={{ width: '9%' }}>Olives (kg)</th>
              <th style={{ width: '8%' }}>Prix/kg</th>
              <th style={{ width: '9%' }}>Huile (kg)</th>
              <th style={{ width: '8%' }}>Rend.</th>
              <th style={{ width: '9%' }}>Coût (DT)</th>
              <th style={{ width: '5%' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase, index) => (
              <tr key={purchase.id}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {new Date(purchase.purchaseDate).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ fontWeight: 'bold', color: '#6B8E4B' }}>{purchase.safeName}</td>
                <td style={{ fontWeight: 'bold' }}>{purchase.farmerName}</td>
                <td>{purchase.farmerPhone || '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {purchase.oliveWeight.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {purchase.pricePerKg.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                  {purchase.oilProduced ? purchase.oilProduced.toFixed(2) : 'En attente'}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {purchase.yieldPercentage ? purchase.yieldPercentage.toFixed(1) + '%' : '-'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#d97706' }}>
                  {purchase.totalCost.toFixed(2)}
                </td>
                <td style={{ fontSize: '7px' }}>{purchase.notes ? (purchase.notes.length > 15 ? purchase.notes.substring(0, 15) + '...' : purchase.notes) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>TOTAUX:</td>
              <td style={{ textAlign: 'right', color: '#2C3E50', fontSize: '9px', fontWeight: 'bold' }}>
                {totalOlives.toFixed(2)} kg
              </td>
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'right', color: '#16a34a', fontSize: '9px', fontWeight: 'bold' }}>
                {totalOil.toFixed(2)} kg
              </td>
              <td style={{ textAlign: 'center', color: '#9333ea', fontSize: '9px', fontWeight: 'bold' }}>
                {avgYield.toFixed(1)}%
              </td>
              <td style={{ textAlign: 'right', color: '#d97706', fontSize: '9px', fontWeight: 'bold' }}>
                {totalCost.toFixed(2)} DT
              </td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="print-footer">
          <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#2C3E50' }}>
            HUILERIE MASMOUDI - Rapport Complet des Achats d'Olives
          </p>
          <p style={{ fontSize: '8px', color: '#666', marginTop: '3px' }}>
            Document généré automatiquement - {purchases.length} achat(s) enregistré(s)
          </p>
        </div>
      </div>
    </div>
  )
} 
