"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Package,
  Search,
  Filter,
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
  Edit,
  Trash2,
  ShoppingBag,
  Save,
  X,
  Loader2,
  Grid3X3,
  List,
  SquareIcon,
  CheckSquare,
  PackagePlus,
  Menu,
  ArrowLeft,
  Printer,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { farmersApi, boxesApi, sessionsApi } from "@/lib/api"
import { transformFarmerFromDb, transformBoxFromDb, generateSessionNumber } from "@/lib/utils"
import { logout, getCurrentUser } from '@/lib/auth-client'
import { Separator } from "@/components/ui/separator"
import { formatFarmerDisplayName } from '@/lib/utils'

interface Farmer {
  id: string
  name: string
  phone: string
  type: "small" | "large"
  dateAdded: string
  pricePerKg: number
  boxes: Box[]
  nickname?: string
}

interface Box {
  id: string
  type: "nchira" | "chkara" | "normal"
  weight: number
  selected: boolean
  status: "available" | "in_use"
  currentFarmerId?: string
}

interface BulkBoxEntry {
  id: string
  weight: string
  idError?: string
  weightError?: string
}

interface ProcessingSession {
  id: string
  date: string
  oilWeight: number
  totalPrice: number
  boxCount: number
  boxIds: string[]
  totalBoxWeight: number
  processingStatus: "pending" | "processed"
  paymentStatus: "unpaid" | "paid"
  farmerId: string
}

export default function OliveManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [isAddFarmerOpen, setIsAddFarmerOpen] = useState(false)
  const [isEditFarmerOpen, setIsEditFarmerOpen] = useState(false)
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false)
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
  const [editingBox, setEditingBox] = useState<Box | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(
    null,
  )
  const [bulkStep, setBulkStep] = useState(1)
  const [bulkCount, setBulkCount] = useState("")
  const [bulkBoxes, setBulkBoxes] = useState<BulkBoxEntry[]>([])
  const [user, setUser] = useState<any>(null)
  const [deletingFarmerId, setDeletingFarmerId] = useState<string | null>(null)
  const [boxViewMode, setBoxViewMode] = useState<"grid" | "list">("grid")
  const [isBulkWeightsOpen, setIsBulkWeightsOpen] = useState(false)
  const [missingWeightEntries, setMissingWeightEntries] = useState<{ id: string; type: Box["type"]; weight: string; error?: string }[]>([])
  const bulkWeightRefs = useRef<Array<HTMLInputElement | null>>([])
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"farmers" | "boxes">("farmers")
  const [printingFarmers, setPrintingFarmers] = useState(false)

  // Form states
  const [farmerForm, setFarmerForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    type: "small" as "small" | "large",
  })
  
  // Add validation errors state
  const [farmerFormErrors, setFarmerFormErrors] = useState<{
    name?: string
    phone?: string
  }>({})

  const [boxForm, setBoxForm] = useState({
    id: "",
    type: "normal" as "nchira" | "chkara" | "normal",
    weight: "",
  })
  const [boxFormErrors, setBoxFormErrors] = useState<{ id?: string; weight?: string }>({})

  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const rebuildProcessedRef = useRef(false)

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      console.log('❌ No user found in olive management, redirecting to login')
      window.location.href = '/login'
      return
    }
    setUser(currentUser)
  }, [])

  // Handle URL parameters for pre-selecting a farmer
  useEffect(() => {
    const farmerId = searchParams.get('farmerId')
    if (farmerId && farmers.length > 0) {
      const farmer = farmers.find(f => f.id === farmerId)
      if (farmer) {
        handleFarmerSelection(farmer)
      }
    }
  }, [searchParams, farmers])

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

  // Load farmers from API
  const loadFarmers = async () => {
    try {
      setLoading(true)
      const response = await farmersApi.getAll({
        limit: 100, // Load more farmers at once
        sortBy: 'name',
        sortOrder: 'asc',
        includeBoxes: true  // Include boxes data
      })

      if (response.success) {
        const transformedFarmers = response.data.items.map(transformFarmerFromDb)

        setFarmers(transformedFarmers)
      } else {
        showNotification('Erreur lors du chargement des agriculteurs', 'error')
      }
    } catch (error) {
      console.error('Error loading farmers:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load single farmer with boxes
  const reloadFarmer = async (farmerId: string) => {
    try {
      const response = await farmersApi.getById(farmerId)
      
      if (response.success && response.data) {
        const updatedFarmer = transformFarmerFromDb(response.data)
        
        // Ensure boxes array exists and is properly formatted
        if (!updatedFarmer.boxes) {
          updatedFarmer.boxes = []
        }
        
        // Update farmers list
        setFarmers((prev) =>
          prev.map((farmer) =>
            farmer.id === farmerId ? updatedFarmer : farmer
          )
        )
        
        console.log(`Reloaded farmer ${updatedFarmer.name} with ${updatedFarmer.boxes.length} boxes`)
        return updatedFarmer
      } else {
        console.error('Failed to reload farmer:', response.error)
      }
    } catch (error) {
      console.error('Error reloading farmer:', error)
    }
    return null
  }

  // Load farmers on component mount
  useEffect(() => {
    loadFarmers()
    // Reset rebuild processed flag on mount
    rebuildProcessedRef.current = false
    
    // Cleanup function to reset ref on unmount
    return () => {
      rebuildProcessedRef.current = false
    }
  }, [])

  // Auto-select first farmer after farmers are loaded (only once)
  useEffect(() => {
    if (farmers.length > 0 && !selectedFarmer && !loading) {
      console.log('Auto-selecting first farmer in olive management:', farmers[0].name)
      setSelectedFarmer(farmers[0])
    }
  }, [farmers, selectedFarmer, loading])

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Handle rebuild farmer selection
  useEffect(() => {
    // Skip if already processed or if we don't have rebuild data
    const rebuildFarmerId = localStorage.getItem("rebuildFarmerId")
    if (!rebuildFarmerId || rebuildProcessedRef.current) {
      return
    }

    console.log('=== OLIVE MANAGEMENT REBUILD CHECK ===')
    const rebuildFarmerName = localStorage.getItem("rebuildFarmerName")
    
    console.log('Rebuild data from localStorage:', { rebuildFarmerId, rebuildFarmerName })
    console.log('Current state:', { farmersCount: farmers.length, loading, selectedFarmer: selectedFarmer?.name })
    
    // Only proceed if we have rebuild data and farmers are loaded
    if (farmers.length > 0 && !loading) {
      console.log('Attempting to rebuild farmer:', { rebuildFarmerId, rebuildFarmerName, farmersCount: farmers.length })
      console.log('Available farmers:', farmers.map(f => ({ id: f.id, name: f.name })))
      
      const farmer = farmers.find((f) => f.id === rebuildFarmerId)
      if (farmer) {
        console.log('✅ Found farmer for rebuild:', farmer.name)
        // Only auto-select if no farmer is currently selected
        if (!selectedFarmer) {
          setSelectedFarmer(farmer)
          showNotification(`Agriculteur ${farmer.name} sélectionné pour reconstruction`, "success")
        } else {
          showNotification(`Agriculteur ${farmer.name} disponible pour reconstruction`, "success")
        }
        
        // Clear localStorage immediately after successful selection
        localStorage.removeItem("rebuildFarmerId")
        localStorage.removeItem("rebuildFarmerName")
        rebuildProcessedRef.current = true
        console.log('✅ Cleared localStorage after successful rebuild')
      } else {
        console.log('❌ Farmer not found in current farmers list:', { 
          rebuildFarmerId, 
          availableFarmers: farmers.map(f => ({ id: f.id, name: f.name }))
        })
        
        // If we have the farmer name from localStorage, show it in the error message
        const farmerDisplayName = rebuildFarmerName || "cet agriculteur"
        showNotification(`${farmerDisplayName} a été supprimé. Vous devez créer l'agriculteur à nouveau.`, "warning")
        
        // Clear localStorage immediately after showing error
        localStorage.removeItem("rebuildFarmerId")
        localStorage.removeItem("rebuildFarmerName")
        rebuildProcessedRef.current = true
        console.log('❌ Cleared localStorage after rebuild error')
      }
    } else {
      console.log('Rebuild conditions not met:', {
        hasRebuildId: !!rebuildFarmerId,
        hasFarmers: farmers.length > 0,
        notLoading: !loading
      })
    }
    console.log('=== OLIVE MANAGEMENT REBUILD CHECK END ===')
  }, [farmers, loading]) // Removed selectedFarmer from dependencies to prevent loops

  const showNotification = (message: string, type: "error" | "success" | "warning") => {
    setNotification({ message, type })
  }

  const getBoxIcon = (type: Box["type"]) => {
    switch (type) {
      case "nchira":
        return <Package className="w-6 h-6 text-red-500" />
      case "chkara":
        return <Package className="w-6 h-6 text-blue-500" />
      case "normal":
        return <Package className="w-6 h-6 text-[#6B8E4B]" />
    }
  }

  const getBoxColor = (type: Box["type"]) => {
    switch (type) {
      case "nchira":
        return "border-red-200 bg-red-50"
      case "chkara":
        return "border-blue-200 bg-blue-50"
      case "normal":
        return "border-green-200 bg-green-50"
    }
  }

  const getAllUsedBoxIds = (): string[] => {
    const allIds: string[] = []
    farmers.forEach((farmer) => {
      farmer.boxes.forEach((box) => {
        if (!box.id.startsWith("Chkara")) {
          allIds.push(box.id)
        }
      })
    })
    return allIds
  }

  const getNextChkaraId = (): string => {
    const chkaraIds = farmers
      .flatMap((farmer) => farmer.boxes)
      .filter((box) => box.id.startsWith("Chkara"))
      .map((box) => Number.parseInt(box.id.replace("Chkara", "")))
      .sort((a, b) => a - b)

    let nextId = 1
    for (const id of chkaraIds) {
      if (id === nextId) {
        nextId++
      } else {
        break
      }
    }
    return `Chkara${nextId}`
  }

  const validateBoxId = (id: string, excludeBoxId?: string): string | null => {
    if (!id) return "L'ID de la boîte est requis"

    const numId = Number.parseInt(id)
    if (isNaN(numId) || numId < 1 || numId > 600) {
      return "L'ID de la boîte doit être entre 1 et 600"
    }

    const usedIds = getAllUsedBoxIds()
    if (excludeBoxId) {
      const index = usedIds.indexOf(excludeBoxId)
      if (index > -1) usedIds.splice(index, 1)
    }

    if (usedIds.includes(id)) {
      return "Cet ID de boîte est déjà utilisé"
    }

    return null
  }

  // Helper function to check if a date is today
  const isToday = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Filter and search logic
  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      const term = searchTerm.toLowerCase()
      const matchesName = farmer.name.toLowerCase().includes(term)
      const matchesPhone = farmer.phone?.toLowerCase().includes(term)
      const matchesSearch = matchesName || matchesPhone

      // Filter by treatment status instead of farmer type
      let matchesFilter = true
      if (filterType === "needs-treatment") {
        // Farmers who have boxes without weight or are missing boxes (RED CARDS)
        matchesFilter = hasBoxesWithoutWeight(farmer) || farmer.boxes.length === 0
      } else if (filterType === "ready") {
        // Farmers who have all boxes with weights and at least one box (NORMAL CARDS)
        matchesFilter = farmer.boxes.length > 0 && !hasBoxesWithoutWeight(farmer)
      }
      // "all" shows everyone

      // Filter by today's date if showTodayOnly is true
      const matchesToday = showTodayOnly ? isToday(farmer.dateAdded) : true

      return matchesSearch && matchesFilter && matchesToday
    })
  }, [farmers, searchTerm, filterType, showTodayOnly])

  // Auto-select first farmer when today filter is activated
  const handleTodayFilterToggle = () => {
    setShowTodayOnly(!showTodayOnly)
  }

  // Validation function for farmer form
  const validateFarmerForm = () => {
    const errors: { name?: string; phone?: string } = {}
    
    // Name validation: 2 words, each with 3+ letters
    if (!farmerForm.name.trim()) {
      errors.name = "Le nom est requis"
    } else {
      const words = farmerForm.name.trim().split(/\s+/)
      if (words.length < 2) {
        errors.name = "Le nom doit contenir au moins 2 mots"
      } else if (words.some(word => word.length < 3)) {
        errors.name = "Chaque mot doit contenir au moins 3 lettres"
      }
    }
    
    // Phone validation: exactly 8 digits (if provided)
    if (farmerForm.phone.trim()) {
      if (!/^[0-9]{8}$/.test(farmerForm.phone.trim())) {
        errors.phone = "Le numéro doit contenir exactement 8 chiffres"
      }
    }
    
    setFarmerFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddFarmer = async () => {
    // Validate form before submitting
    if (!validateFarmerForm()) {
      return
    }

    setCreating(true)
    try {
      const response = await farmersApi.create({
        name: farmerForm.name.trim(),
        nickname: farmerForm.nickname.trim() || undefined,
        phone: farmerForm.phone.trim() || undefined,
      type: farmerForm.type,
      })

      if (response.success) {
        const newFarmer = transformFarmerFromDb(response.data)
        
        // Add to farmers list with empty boxes initially
        const farmerWithBoxes = {
          ...newFarmer,
          boxes: []
        }

        setFarmers((prev) => [...prev, farmerWithBoxes])
        setFarmerForm({ name: "", nickname: "", phone: "", type: "small" })
        setFarmerFormErrors({}) // Clear errors on success
    setIsAddFarmerOpen(false)
        showNotification(`Agriculteur ${newFarmer.name} ajouté avec succès`, "success")
      } else {
        showNotification(response.error || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      console.error('Error creating farmer:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleEditFarmer = async () => {
    if (!selectedFarmer) return

    // Validate form before submitting
    if (!validateFarmerForm()) {
      return
    }

    setCreating(true)
    try {
      const response = await farmersApi.update(selectedFarmer.id, {
        name: farmerForm.name.trim(),
        nickname: farmerForm.nickname.trim() || undefined,
        phone: farmerForm.phone.trim() || undefined,
        type: farmerForm.type
        // Removed pricePerKg - pricing is now per-session
      })

      if (response.success) {
        const updatedFarmer = transformFarmerFromDb(response.data)
        
        // Preserve the current boxes state if API doesn't return boxes
        const currentFarmer = farmers.find(f => f.id === selectedFarmer.id)
        if (currentFarmer && (!updatedFarmer.boxes || updatedFarmer.boxes.length === 0) && currentFarmer.boxes.length > 0) {
          updatedFarmer.boxes = currentFarmer.boxes
        }
        
        setFarmers((prev) => prev.map((f) => (f.id === selectedFarmer.id ? updatedFarmer : f)))
        
        // Update selected farmer reference
        setSelectedFarmer(updatedFarmer)
        setFarmerForm({ name: "", nickname: "", phone: "", type: "small" })
        setFarmerFormErrors({}) // Clear errors on success
    setIsEditFarmerOpen(false)
    showNotification("Agriculteur mis à jour avec succès!", "success")
      } else {
        showNotification(response.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch (error) {
      console.error('Error updating farmer:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteFarmer = async (farmerId: string) => {
    const farmerToDelete = farmers.find(f => f.id === farmerId)
    if (!farmerToDelete) return

    const boxCount = farmerToDelete.boxes.length
    const confirmationMessage = boxCount > 0 
      ? `Êtes-vous sûr de vouloir supprimer "${farmerToDelete.name}" ?\n\nCette action va :\n• Supprimer l'agriculteur de la base de données\n• Libérer ${boxCount} boîte(s) pour d'autres agriculteurs\n• Supprimer toutes les sessions de traitement associées`
      : `Êtes-vous sûr de vouloir supprimer "${farmerToDelete.name}" ?`

    if (!confirm(confirmationMessage)) {
      return
    }

    setDeletingFarmerId(farmerId)
    try {
      const response = await farmersApi.delete(farmerId)

      if (response.success) {
        // Immediate UI updates
        setFarmers((prev) => prev.filter((farmer) => farmer.id !== farmerId))
        
        // Clear selected farmer if it was the deleted one
        if (selectedFarmer?.id === farmerId) {
          setSelectedFarmer(null)
        }

        // Show success message with box count
        const successMessage = response.message || "Agriculteur supprimé avec succès!"
        showNotification(successMessage, "success")

        // Reload farmers list to get fresh data (including updated box counts)
        setTimeout(() => {
          loadFarmers().catch(console.error)
        }, 500)

      } else {
        showNotification(response.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting farmer:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setDeletingFarmerId(null)
    }
  }

  // Box CRUD operations
  const handleAddBox = async () => {
    if (!selectedFarmer) {
      showNotification("Veuillez sélectionner un agriculteur avant d'ajouter une boîte", "warning")
      return
    }

    // Clear previous errors
    setBoxFormErrors({})

    // Client-side validation before API call
    // Validate ID for non-Chkara
      if (boxForm.type !== "chkara") {
      const rawId = (boxForm.id || "").trim()
      if (!rawId) {
        setBoxFormErrors((prev) => ({ ...prev, id: "L'ID de la boîte est requis" }))
          return
        }

      const numId = Number.parseInt(rawId)
        if (isNaN(numId) || numId < 1 || numId > 600) {
        setBoxFormErrors((prev) => ({ ...prev, id: "L'ID de la boîte doit être entre 1 et 600" }))
          return
        }

      const duplicateMsg = validateBoxId(rawId)
      if (duplicateMsg) {
        setBoxFormErrors((prev) => ({ ...prev, id: duplicateMsg }))
        return
      }
      }

      // Validate weight
    let weightVal: number | undefined = undefined
    if (boxForm.weight.trim()) {
      weightVal = Number.parseFloat(boxForm.weight)
      if (isNaN(weightVal) || weightVal <= 0) {
        // Ignore invalid weight when provided; allow empty or correct later
        weightVal = undefined
      }
    }

    setCreating(true)
    try {
      // For Chkara boxes, generate the ID automatically
      let boxId = boxForm.type === "chkara" ? getNextChkaraId() : boxForm.id

      // Enhanced validation for non-Chkara boxes
      if (boxForm.type !== "chkara") {
        if (!boxId || boxId.trim() === "") {
          setBoxFormErrors((prev) => ({ ...prev, id: "L'ID de la boîte est requis" }))
        setCreating(false)
        return
        }

        // Normalize ID
        boxId = boxId.trim()
    }

      const response = await farmersApi.addBox(selectedFarmer.id, {
      id: boxId,
      type: boxForm.type,
        weight: weightVal,
      })

      if (response.success) {
        // Show notification if weight was missing
        if (!weightVal) {
          showNotification(`Boîte ${boxId} ajoutée sans poids. Vous devrez ajouter le poids plus tard.`, "warning")
        }
        
        // Transform the response data properly
        const newBox = transformBoxFromDb(response.data)

        // Update farmers list immediately
        setFarmers(prev => prev.map(farmer => 
          farmer.id === selectedFarmer.id 
            ? { ...farmer, boxes: [...farmer.boxes, newBox] }
            : farmer
        ))

        // Update selected farmer immediately
        setSelectedFarmer(prev => prev ? {
          ...prev,
          boxes: [...prev.boxes, newBox]
        } : null)

        // Reset form and close dialog
    setBoxForm({ id: "", type: "normal", weight: "" })
        setBoxFormErrors({})
    setIsAddBoxOpen(false)

        // Show success notification with box details
        if (weightVal) {
        const boxTypeText = boxForm.type === "chkara" ? "Sac Chkara" : `Boîte ${boxId}`
        showNotification(`${boxTypeText} assignée avec succès à ${selectedFarmer.name}!`, "success")
        }

        // Reload farmer data in background to ensure consistency (but don't await it)
        reloadFarmer(selectedFarmer.id).catch(console.error)
      } else {
        // Enhanced error handling with specific messages
        const errorMessage = response.error || 'Erreur lors de l\'assignation'
        
        // Map backend errors to field-level errors where possible
        if (errorMessage.includes("n'existe pas dans l'inventaire") || errorMessage.includes("range") || errorMessage.includes("600")) {
          setBoxFormErrors((prev) => ({ ...prev, id: "L'ID de la boîte doit être entre 1 et 600" }))
        } else if (errorMessage.includes("n'est pas disponible") || errorMessage.includes("déjà utilisé") || errorMessage.includes("already exists")) {
          setBoxFormErrors((prev) => ({ ...prev, id: "Cet ID de boîte est déjà utilisé" }))
        } else {
          showNotification(errorMessage, 'error')
        }
      }
    } catch (error) {
      console.error('Error creating box:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleEditBox = async () => {
    if (!selectedFarmer || !editingBox) return

    setCreating(true)
    try {
      // Parse weight: treat empty, 0 or invalid as missing (null)
      const trimmed = boxForm.weight.trim()
      let parsedWeight: number | null = null
      if (trimmed) {
        const num = Number.parseFloat(trimmed)
        if (!isNaN(num) && num > 0) {
          parsedWeight = num
        } else {
          parsedWeight = null
        }
      }

      const updateData: any = {
        weight: parsedWeight,
        type: boxForm.type,
      }

      // Add ID to update if it's different and not a Chkara type
      if (boxForm.type !== "chkara" && boxForm.id !== editingBox.id && boxForm.id.trim()) {
        updateData.id = boxForm.id.trim()
      }

      const response = await boxesApi.update(editingBox.id, updateData)

      if (response.success) {
        // Update the box in local state immediately
        const updatedBox = {
      ...editingBox,
      weight: parsedWeight ?? 0,
          type: boxForm.type,
          id: updateData.id || editingBox.id
    }

        // Update farmers list immediately
        setFarmers(prev => prev.map(farmer => 
        farmer.id === selectedFarmer.id
          ? {
              ...farmer,
                boxes: farmer.boxes.map(box => 
                  box.id === editingBox.id ? updatedBox : box
                )
            }
            : farmer
        ))

        // Update selected farmer immediately
        setSelectedFarmer(prev => prev ? {
            ...prev,
          boxes: prev.boxes.map(box => 
            box.id === editingBox.id ? updatedBox : box
    )
        } : null)

    setEditingBox(null)
    setBoxForm({ id: "", type: "normal", weight: "" })
        showNotification(`Boîte ${updatedBox.id} mise à jour avec succès!`, "success")
        
        // Reload farmer data in background to ensure consistency
        reloadFarmer(selectedFarmer.id).catch(console.error)
      } else {
        showNotification(response.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch (error) {
      console.error('Error updating box:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBox = async (boxId: string) => {
    if (!selectedFarmer) return

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette boîte?")) {
      return
    }

    try {
      const response = await boxesApi.delete(boxId)

      if (response.success) {
        // Remove the box from local state immediately
        const updatedBoxes = selectedFarmer.boxes.filter(box => box.id !== boxId)
        
        setFarmers(prev => prev.map(farmer => 
          farmer.id === selectedFarmer.id
            ? { 
                ...farmer, 
                boxes: updatedBoxes
              }
            : farmer
        ))

        // Update selected farmer immediately
        setSelectedFarmer(prev => prev ? {
              ...prev,
          boxes: updatedBoxes
        } : null)
        
        showNotification(`Boîte ${boxId} libérée avec succès! Elle est maintenant disponible pour d'autres agriculteurs.`, "success")
        
        // Reload farmer data in background to ensure consistency (but don't await it)
        reloadFarmer(selectedFarmer.id).catch(console.error)
      } else {
        showNotification(response.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting box:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const handleBoxSelection = (farmerId: string, boxId: string) => {
    // Only allow selection of boxes that are IN_USE by this farmer

    setFarmers((prev) =>
      prev.map((farmer) =>
        farmer.id === farmerId
          ? {
              ...farmer,
              boxes: farmer.boxes.map((box) => (box.id === boxId && box.status === "in_use" ? { ...box, selected: !box.selected } : box)),
            }
          : farmer,
      ),
    )

    if (selectedFarmer?.id === farmerId) {
      setSelectedFarmer((prev) =>
        prev
          ? {
              ...prev,
              boxes: prev.boxes.map((box) => (box.id === boxId && box.status === "in_use" ? { ...box, selected: !box.selected } : box)),
            }
          : null,
      )
    }
  }

  const handleSelectAll = () => {
    if (!selectedFarmer) return

    // Only select boxes that are IN_USE by this farmer
    const inUseBoxes = selectedFarmer.boxes.filter(box => box.status === "in_use")
    const allInUseSelected = inUseBoxes.every((box) => box.selected)
    const newSelectedState = !allInUseSelected

    setFarmers((prev) =>
      prev.map((farmer) =>
        farmer.id === selectedFarmer.id
          ? {
              ...farmer,
              boxes: farmer.boxes.map((box) => ({ ...box, selected: box.status === "in_use" ? newSelectedState : false })),
            }
          : farmer,
      ),
    )

    setSelectedFarmer((prev) =>
      prev
        ? {
            ...prev,
            boxes: prev.boxes.map((box) => ({ ...box, selected: box.status === "in_use" ? newSelectedState : false })),
          }
        : null,
    )
  }

  // Bulk add operations
  const handleBulkStepNext = () => {
    if (bulkStep === 1) {
      const count = Number.parseInt(bulkCount)
      if (count > 0 && count <= 50) {
        const entries: BulkBoxEntry[] = Array.from({ length: count }, () => ({
          id: "",
          weight: "",
        }))
        setBulkBoxes(entries)
        setBulkStep(2)
      }
    }
  }

  const updateBulkBox = (index: number, field: "id" | "weight", value: string) => {
    setBulkBoxes((prev) => {
      // Update the changed field first
      const next = prev.map((box, i) => {
        if (i !== index) return box
        const updated: BulkBoxEntry = { ...box, [field]: value }
        // Validate only the edited field here; do not clear the other field's error
        if (field === "id") {
          const idTrim = value.trim()
          if (!idTrim) {
            updated.idError = "L'ID est requis"
          } else {
            const numId = parseInt(idTrim)
            if (isNaN(numId) || numId < 1 || numId > 600) {
              updated.idError = "L'ID doit être entre 1 et 600"
            } else {
              const isUsedByThisFarmer = selectedFarmer?.boxes.some(b => b.id === idTrim && b.status === "in_use")
              if (isUsedByThisFarmer) {
                updated.idError = "Cette boîte est déjà utilisée par cet agriculteur"
              } else {
                const isUsedByOtherFarmer = farmers.some(f => f.id !== selectedFarmer?.id && f.boxes.some(b => b.id === idTrim && b.status === "in_use"))
                if (isUsedByOtherFarmer) {
                  updated.idError = "Cette boîte est utilisée par un autre agriculteur"
                } else {
                  updated.idError = undefined
                }
              }
            }
          }
        } else if (field === "weight") {
          const wtTrim = value.trim()
          if (!wtTrim) {
            updated.weightError = undefined // optional
          } else {
            const weight = parseFloat(wtTrim)
            if (isNaN(weight)) {
              updated.weightError = undefined // ignore non-numeric in number input
            } else if (weight > 1000) {
              updated.weightError = "Le poids semble trop élevé (max 1000 kg)"
            } else if (weight <= 0) {
              // treat 0 or negative as missing (no error)
              updated.weightError = undefined
            } else {
              updated.weightError = undefined
            }
            }
          }
          return updated
      })

      // After updating the specific field, enforce duplicate ID detection across the whole batch
      const idCounts: Record<string, number> = {}
      next.forEach((b) => {
        const idTrim = (b.id || "").trim()
        if (idTrim) idCounts[idTrim] = (idCounts[idTrim] || 0) + 1
      })

      const withDupes = next.map((b) => {
        const idTrim = (b.id || "").trim()
        if (idTrim && idCounts[idTrim] > 1) {
          // Only set duplicate message if there isn't already a more specific id error
          if (!b.idError) {
            return { ...b, idError: "ID en double dans ce lot" }
          }
          return b
        }
        // Clear the duplicate message if it was previously set and no longer applies
        if (b.idError === "ID en double dans ce lot") {
          return { ...b, idError: undefined }
        }
        return b
      })

      return withDupes
    })
  }

  const handleBulkAdd = async () => {
    if (!selectedFarmer) return

    // Guard client-side: prevent submit if any errors
    if (bulkBoxes.some((b) => b.idError || b.weightError || !b.id)) {
      showNotification("Veuillez corriger les erreurs avant de soumettre.", "warning")
      return
    }

    const validBoxes = bulkBoxes.filter((box) => !box.idError && !box.weightError && box.id)
    if (validBoxes.length === 0) {
      showNotification("Aucune boîte valide à ajouter", "error")
      return
    }

    // Check for duplicate IDs within the bulk operation
    const boxIds = validBoxes.map(box => box.id)
    const duplicateIds = boxIds.filter((id, index) => boxIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      // Mark duplicates inline and block submission
      setBulkBoxes(prev => prev.map(b => {
        if (duplicateIds.includes(b.id)) {
          return { ...b, idError: "ID en double dans ce lot" }
        }
        return b
      }))
      showNotification(`IDs en double détectés: ${duplicateIds.join(', ')}`, "warning")
      return
    }

    setCreating(true)
    try {
      const boxesToCreate = validBoxes.map((box) => ({
        id: box.id,
        type: "normal" as const,
        weight: box.weight ? Number.parseFloat(box.weight) : undefined,
      }))

      const response = await farmersApi.addBoxes(selectedFarmer.id, boxesToCreate)

      if (response.success) {
        // Transform the new boxes from the response
        const newBoxes = response.data.map((boxData: any) => transformBoxFromDb(boxData))
        
        // Update farmers list immediately with new boxes
        setFarmers(prev => prev.map(farmer => 
          farmer.id === selectedFarmer.id 
            ? { ...farmer, boxes: [...farmer.boxes, ...newBoxes] }
            : farmer
        ))

        // Update selected farmer immediately with new boxes
        setSelectedFarmer(prev => prev ? {
          ...prev,
          boxes: [...prev.boxes, ...newBoxes]
        } : null)

        console.log(`✅ Added ${newBoxes.length} boxes immediately to farmer ${selectedFarmer.name}`)
        
        // Also reload farmer data from server to ensure consistency
        await reloadFarmer(selectedFarmer.id)

        setBulkStep(1)
        setBulkCount("")
        setBulkBoxes([])
        setIsBulkAddOpen(false)
        showNotification(`${response.data.length} boîtes ajoutées avec succès!`, "success")
      } else {
        showNotification(response.error || 'Erreur lors de la création en lot', 'error')
      }
    } catch (error: any) {
      console.error('Error bulk creating boxes:', error)
      
      // Handle specific error messages
      if (error.message && error.message.includes("n'existe pas dans l'inventaire")) {
        showNotification('Erreur: Certaines boîtes ne sont pas disponibles dans l\'inventaire de l\'usine. Veuillez vérifier les IDs.', 'error')
      } else if (error.message && error.message.includes("n'est pas disponible")) {
        showNotification('Erreur: Certaines boîtes sont déjà utilisées par d\'autres agriculteurs.', 'error')
      } else {
        showNotification('Erreur de connexion au serveur', 'error')
      }
    } finally {
      setCreating(false)
    }
  }

  const getSelectedBoxes = (farmer: Farmer) => farmer.boxes.filter((box) => box.selected && box.status === "in_use")

  // Helper function to check if box is available for this farmer
  const isBoxInUse = (box: Box, farmerId: string) => box.status === "in_use" && box.currentFarmerId === farmerId
  const isBoxAvailable = (box: Box) => box.status === "available"

  const handleCompleteProcessing = async (farmer: Farmer) => {
    const selectedBoxes = getSelectedBoxes(farmer)
    console.log('Selected boxes for processing:', selectedBoxes)
    
    if (selectedBoxes.length === 0) {
      showNotification("Veuillez sélectionner au moins une boîte à traiter", "warning")
      return
    }

    // Check if any selected boxes are not in use by this farmer
    const invalidBoxes = selectedBoxes.filter(box => box.status !== "in_use")
    if (invalidBoxes.length > 0) {
      showNotification("Certaines boîtes ne sont pas en cours d'utilisation", "error")
      return
    }

    // Check if any selected boxes don't have weight
    const boxesWithoutWeight = selectedBoxes.filter(box => !box.weight || box.weight === 0)
    if (boxesWithoutWeight.length > 0) {
      showNotification(`${boxesWithoutWeight.length} boîte(s) sélectionnée(s) n'ont pas de poids. Veuillez ajouter le poids avant de continuer.`, "warning")
      return
    }

    // Calculate total weight (price will be set during payment)
    const totalBoxWeight = selectedBoxes.reduce((sum, box) => sum + box.weight, 0)

    setCreating(true)
    try {
      // Create session via API
      const response = await sessionsApi.create({
        farmerId: farmer.id,
      boxIds: selectedBoxes.map((box) => box.id),
      totalBoxWeight: totalBoxWeight,
        boxCount: selectedBoxes.length,
        // totalPrice will be calculated during payment process
      })

      if (response.success) {
        // Remove processed boxes from farmer's view immediately (they become available for others)
        const remainingBoxes = farmer.boxes.filter(box => 
          !selectedBoxes.some(sb => sb.id === box.id)
    )

        // Update local state immediately
        setFarmers(prev => prev.map(f => 
          f.id === farmer.id 
            ? { ...f, boxes: remainingBoxes }
            : f
        ))
        
        if (selectedFarmer?.id === farmer.id) {
          setSelectedFarmer(prev => prev ? { ...prev, boxes: remainingBoxes } : null)
        }
        
        // Reload farmer data to get any other updates
        await reloadFarmer(farmer.id)

    showNotification(
          `Session créée avec succès! ${selectedBoxes.length} boîtes libérées et disponibles pour d'autres agriculteurs.`,
      "success",
    )

        // Navigate to oil management with farmer ID for auto-selection
    setTimeout(() => {
          router.push(`/oil-management?farmerId=${farmer.id}&sessionId=${response.data.id}`)
        }, 2000)
      } else {
        showNotification(response.error || 'Erreur lors de la création de la session', 'error')
      }
    } catch (error) {
      console.error('Error creating processing session:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const openEditFarmer = (farmer: Farmer) => {
    setFarmerForm({
      name: farmer.name,
      nickname: farmer.nickname || "", // Add nickname field with fallback
      phone: farmer.phone,
      type: farmer.type,
    })
    setIsEditFarmerOpen(true)
  }

  const openEditBox = (box: Box) => {
    setBoxForm({
      id: box.id,
      type: box.type,
      weight: box.weight.toString(),
    })
    setEditingBox(box)
  }

  // Handle farmer selection with proper async handling
  const handleFarmerSelection = async (farmer: Farmer) => {
    // Prevent reloading if the same farmer is already selected
    if (selectedFarmer?.id === farmer.id) {
      console.log('Farmer already selected, skipping reload:', farmer.name)
      return
    }
    
    // Set the farmer immediately for UI responsiveness
    setSelectedFarmer(farmer)
    
    // On mobile, switch to boxes view when farmer is selected
    if (window.innerWidth < 768) { // md breakpoint
      setMobileView("boxes")
    }
    
    // Then reload the farmer data in the background to ensure we have fresh data
    try {
      const updatedFarmer = await reloadFarmer(farmer.id)
      if (updatedFarmer) {
        // Update selected farmer with fresh data
        setSelectedFarmer(updatedFarmer)
      }
    } catch (error) {
      console.error('Error reloading farmer data:', error)
      // If reload fails, we still have the farmer data from the list
    }
  }

  // Helper function to check if farmer has boxes without weight (determines RED CARD)
  function hasBoxesWithoutWeight(farmer: Farmer): boolean {
    return farmer.boxes.some(box => 
      box.status === "in_use" && (!box.weight || box.weight === 0)
    )
  }

  const openBulkWeightsDialog = (farmer: Farmer) => {
    const missing = farmer.boxes
      .filter(b => b.status === "in_use" && (!b.weight || b.weight === 0))
      .map(b => ({ id: b.id, type: b.type, weight: "", error: "Requis" }))
    if (missing.length === 0) return
    setMissingWeightEntries(missing)
    setIsBulkWeightsOpen(true)
    // Focus first input after dialog opens
    setTimeout(() => {
      if (bulkWeightRefs.current[0]) bulkWeightRefs.current[0].focus()
    }, 50)
  }

  const updateMissingWeight = (index: number, value: string) => {
    setMissingWeightEntries(prev => prev.map((entry, i) => {
      if (i !== index) return entry
      const wt = value.trim()
      let err: string | undefined
      if (!wt) {
        err = "Requis"
      } else {
        const num = parseFloat(wt)
        if (isNaN(num)) err = "Invalide"
        else if (num <= 0) err = "> 0"
        else if (num > 1000) err = "> 1000"
        else err = undefined
      }
      return { ...entry, weight: value, error: err }
    }))
  }

  const focusNextMissing = (index: number) => {
    const next = index + 1
    if (bulkWeightRefs.current[next]) {
      bulkWeightRefs.current[next]?.focus()
      bulkWeightRefs.current[next]?.select?.()
    }
  }

  const handleSaveAllWeights = async () => {
    if (!selectedFarmer) return
    // Validate all
    let valid = true
    setMissingWeightEntries(prev => prev.map(e => {
      const wt = e.weight.trim()
      let err: string | undefined
      if (!wt) err = "Requis"
      else {
        const num = parseFloat(wt)
        if (isNaN(num) || num <= 0) err = "> 0"
        else if (num > 1000) err = "> 1000"
      }
      if (err) valid = false
      return { ...e, error: err }
    }))
    if (!valid) return

    setCreating(true)
    try {
      // Create weight update promises
      const weightUpdates = missingWeightEntries.map(e => 
        boxesApi.update(e.id, { weight: parseFloat(e.weight) })
      )
      
      // Update local state immediately for instant UI feedback
      const weightMap = new Map(missingWeightEntries.map(e => [e.id, parseFloat(e.weight)]))
      
      // Update farmers list immediately
      setFarmers(prev => prev.map(farmer => 
        farmer.id === selectedFarmer.id
          ? {
              ...farmer,
              boxes: farmer.boxes.map(box => 
                weightMap.has(box.id) ? { ...box, weight: weightMap.get(box.id)! } : box
              )
            }
          : farmer
      ))

      // Update selected farmer immediately
      setSelectedFarmer(prev => prev ? {
        ...prev,
        boxes: prev.boxes.map(box => 
          weightMap.has(box.id) ? { ...box, weight: weightMap.get(box.id)! } : box
        )
      } : null)

      // Execute API updates
      await Promise.all(weightUpdates)
      
      // Small delay to ensure UI updates are visible
      await new Promise(resolve => setTimeout(resolve, 100))
      
      showNotification(`${missingWeightEntries.length} poids mis à jour avec succès`, "success")
      setIsBulkWeightsOpen(false)
      setMissingWeightEntries([])
      
      // Reload farmer data in background to ensure server consistency
      reloadFarmer(selectedFarmer.id).catch(console.error)
    } catch (err) {
      console.error('Bulk weight update failed', err)
      showNotification('Erreur lors de la mise à jour des poids', 'error')
      
      // If API update failed, reload farmer to revert local changes
      reloadFarmer(selectedFarmer.id).catch(console.error)
    } finally {
      setCreating(false)
    }
  }

  // Bulk delete selected boxes (release to AVAILABLE)
  const handleBulkDeleteSelectedBoxes = async (farmer: Farmer) => {
    const selectedBoxes = getSelectedBoxes(farmer)
    if (selectedBoxes.length === 0) {
      showNotification("Veuillez sélectionner au moins une boîte à supprimer", "warning")
      return
    }

    const confirmMsg = `Libérer ${selectedBoxes.length} boîte(s) sélectionnée(s) ?\n\nElles deviendront disponibles pour d'autres agriculteurs.`
    if (!confirm(confirmMsg)) return

    setCreating(true)
    try {
      await Promise.all(selectedBoxes.map(b => boxesApi.delete(b.id)))

      // Update local state: remove the deleted boxes
      const remaining = farmer.boxes.filter(b => !selectedBoxes.some(sb => sb.id === b.id))

      setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...f, boxes: remaining } : f))
      if (selectedFarmer?.id === farmer.id) {
        setSelectedFarmer(prev => prev ? { ...prev, boxes: remaining } : null)
      }

      showNotification(`${selectedBoxes.length} boîte(s) libérée(s) avec succès`, "success")
      // Background refresh
      reloadFarmer(farmer.id).catch(console.error)
    } catch (err) {
      console.error('Bulk delete failed', err)
      showNotification('Erreur lors de la suppression des boîtes sélectionnées', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF5E6]">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 w-96">
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
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 bg-[#6B8E4B] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HM</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-[#2C3E50] truncate">HUILERIE MASMOUDI</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Badge variant="outline" className="bg-[#F4D03F] text-[#8B4513] border-[#F4D03F] text-xs sm:text-sm hidden sm:block">
              Gestionnaire d'usine
            </Badge>
            <div className="w-8 h-8 bg-[#6B8E4B] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AM</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#6B8E4B] text-white">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Olives</span>
          </div>
          <Link
            href="/oil-management"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span className="text-sm font-medium">Huile</span>
          </Link>
        </div>
      </div>

      <div className="flex relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Tableau de bord</span>
            </Link>
            <Link
              href="/olive-management"
              className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg"
            >
              <Users className="w-5 h-5" />
              <span>Gestion des olives</span>
            </Link>
            <Link
              href="/oil-management"
              className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileSidebarOpen(false)}>
            <aside className="w-64 bg-white h-full border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2C3E50]">Menu</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <nav className="p-4 space-y-2">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Tableau de bord</span>
                </Link>
                <Link
                  href="/olive-management"
                  className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  <span>Gestion des olives</span>
                </Link>
                <Link
                  href="/oil-management"
                  className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <Archive className="w-5 h-5" />
                  <span>Gestion de l'huile</span>
                </Link>
                <Separator className="my-2" />
                <Link
                  href="/huilerie"
                  className="flex items-center space-x-3 px-3 py-2 text-[#8B4513] hover:bg-[#F4D03F]/10 rounded-lg transition-all duration-200 border border-[#F4D03F]/20"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <Crown className="w-5 h-5 text-[#F4D03F]" />
                  <span className="font-semibold">HUILERIE</span>
                  <Badge variant="secondary" className="ml-auto text-xs bg-[#F4D03F] text-[#8B4513]">
                    Propriétaire
                  </Badge>
                </Link>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Mobile View Toggle */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <Button
                variant={mobileView === "farmers" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("farmers")}
                className={mobileView === "farmers" ? "bg-[#6B8E4B] text-white" : ""}
              >
                <Users className="w-4 h-4 mr-2" />
                Agriculteurs ({filteredFarmers.length})
              </Button>
              <Button
                variant={mobileView === "boxes" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("boxes")}
                disabled={!selectedFarmer}
                className={mobileView === "boxes" ? "bg-[#6B8E4B] text-white" : ""}
              >
                <Package className="w-4 h-4 mr-2" />
                Boîtes {selectedFarmer && `(${selectedFarmer.boxes.length})`}
              </Button>
              {selectedFarmer && mobileView === "boxes" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView("farmers")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Left Panel - Farmers List */}
          <div className={`${mobileView === "farmers" ? "block" : "hidden"} md:block w-full md:w-1/3 p-4 md:p-6 border-r border-gray-200 overflow-y-auto`}>
            <div className="mb-6">
              <div className="space-y-4 mb-4">
                {/* Header with title and add button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#2C3E50]">Agriculteurs</h2>
                  <Dialog open={isAddFarmerOpen} onOpenChange={setIsAddFarmerOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter agriculteur
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-full sm:max-w-md mx-4 p-4 sm:p-6">
                      <DialogHeader className="pb-3 border-b border-gray-200">
                        <DialogTitle className="text-lg font-semibold">
                          Ajouter un agriculteur
                        </DialogTitle>
                      </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div>
                        <Label htmlFor="name">Nom *</Label>
                        <Input
                          id="name"
                          value={farmerForm.name}
                          onChange={(e) => {
                            setFarmerForm((prev) => ({ ...prev, name: e.target.value }))
                            // Clear error when user starts typing
                            if (farmerFormErrors.name) {
                              setFarmerFormErrors(prev => ({ ...prev, name: undefined }))
                            }
                          }}
                          className={farmerFormErrors.name ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {farmerFormErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{farmerFormErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="nickname">Surnom</Label>
                        <Input
                          id="nickname"
                          value={farmerForm.nickname}
                          onChange={(e) => setFarmerForm((prev) => ({ ...prev, nickname: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          value={farmerForm.phone}
                          onChange={(e) => {
                            setFarmerForm((prev) => ({ ...prev, phone: e.target.value }))
                            // Clear error when user starts typing
                            if (farmerFormErrors.phone) {
                              setFarmerFormErrors(prev => ({ ...prev, phone: undefined }))
                            }
                          }}
                          className={farmerFormErrors.phone ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {farmerFormErrors.phone && (
                          <p className="text-red-500 text-xs mt-1">{farmerFormErrors.phone}</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <Button 
                          onClick={handleAddFarmer} 
                          disabled={creating}
                          className="bg-[#6B8E4B] hover:bg-[#5A7A3F] flex-1"
                        >
                          {creating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                          <Save className="w-4 h-4 mr-2" />
                          )}
                          {creating ? 'Création...' : 'Enregistrer'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsAddFarmerOpen(false)} 
                          disabled={creating}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>

                {/* Today filter button and Print icon on same line */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant={showTodayOnly ? "default" : "outline"}
                    onClick={handleTodayFilterToggle}
                    className={`transition-all duration-200 ${
                      showTodayOnly 
                        ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-sm" 
                        : "border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 hover:shadow-sm"
                    }`}
                    title={showTodayOnly ? "Afficher tous les agriculteurs" : "Afficher uniquement les agriculteurs d'aujourd'hui"}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Aujourd'hui
                    {showTodayOnly && (
                      <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                        {filteredFarmers.length}
                      </span>
                    )}
                  </Button>
                  
                  {/* Print button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPrintingFarmers(true)
                      setTimeout(() => {
                        window.print()
                        setTimeout(() => {
                          setPrintingFarmers(false)
                        }, 500)
                      }, 100)
                    }}
                    className="h-10 w-10 p-0 text-gray-500 hover:text-[#6B8E4B] hover:bg-[#6B8E4B]/10 transition-colors"
                    title="Imprimer la liste des agriculteurs"
                  >
                    <Printer className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="space-y-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par nom ou ID de boîte..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les agriculteurs</SelectItem>
                    <SelectItem value="needs-treatment">Besoin de traitement</SelectItem>
                    <SelectItem value="ready">Prêts pour traitement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Farmers List */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6B8E4B]" />
                  <span className="ml-2 text-gray-600">Chargement des agriculteurs...</span>
                </div>
              ) : filteredFarmers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucun agriculteur trouvé</p>
                  <p className="text-sm">Créez votre premier agriculteur pour commencer</p>
                </div>
              ) : (
                filteredFarmers.map((farmer) => (
                <Card
                  key={farmer.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    hasBoxesWithoutWeight(farmer)
                      ? (
                          selectedFarmer?.id === farmer.id
                            ? "ring-2 ring-red-500 bg-red-50 border border-red-300"
                            : "bg-red-50 border border-red-300 hover:bg-red-100"
                        )
                      : (
                          selectedFarmer?.id === farmer.id
                            ? "ring-2 ring-[#6B8E4B] bg-[#6B8E4B]/5"
                            : ""
                        )
                  }`}
                  onClick={() => {
                    handleFarmerSelection(farmer)
                    if (hasBoxesWithoutWeight(farmer)) {
                      openBulkWeightsDialog(farmer)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {farmer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#2C3E50]">{formatFarmerDisplayName(farmer.name, farmer.nickname)}</h3>
                        <p className="text-sm text-gray-600">{farmer.phone || "Pas de téléphone"}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{farmer.boxes.length} boîtes</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditFarmer(farmer)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFarmer(farmer.id)
                          }}
                          disabled={deletingFarmerId === farmer.id}
                        >
                          {deletingFarmerId === farmer.id ? (
                            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Farmer Management */}
          <div className={`${mobileView === "boxes" ? "block" : "hidden"} md:block flex-1 p-4 md:p-6 overflow-y-auto`}>
            {selectedFarmer ? (
              <div className="space-y-6">
                {/* Farmer Details Form */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-[#2C3E50]">Détails de l'agriculteur</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <Input value={formatFarmerDisplayName(selectedFarmer.name, selectedFarmer.nickname)} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <Input value={selectedFarmer.phone || "Non renseigné"} readOnly />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Boxes Gallery */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[#2C3E50]">Gestion des boîtes</CardTitle>
                        
                        {/* Mobile: Show back button */}
                        <div className="md:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMobileView("farmers")}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* View Toggle Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBoxViewMode(boxViewMode === "grid" ? "list" : "grid")}
                            className="border-gray-300 text-gray-600 hover:bg-gray-100"
                          >
                            {boxViewMode === "grid" ? (
                              <>
                                <List className="w-4 h-4 mr-2" />
                                Vue liste
                              </>
                            ) : (
                              <>
                                <Grid3X3 className="w-4 h-4 mr-2" />
                                Vue grille
                              </>
                            )}
                          </Button>
                          
                          {selectedFarmer.boxes.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSelectAll}
                              className="border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B] hover:text-white"
                            >
                              {selectedFarmer.boxes.every((box) => box.selected) ? (
                                <>
                                  <SquareIcon className="w-4 h-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Désélectionner tout</span>
                                  <span className="sm:hidden">Désél. tout</span>
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="w-4 h-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Sélectionner tout</span>
                                  <span className="sm:hidden">Sél. tout</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                        <Dialog open={isAddBoxOpen} onOpenChange={(isOpen) => {
                          setIsAddBoxOpen(isOpen)
                          if (!isOpen) {
                            setBoxForm({ id: "", type: "normal", weight: "" })
                            setBoxFormErrors({})
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter boîte
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-full sm:max-w-md mx-4 p-4 sm:p-6">
                            <DialogHeader className="pb-4 border-b border-gray-200">
                              <DialogTitle className="text-lg sm:text-xl font-bold text-center sm:text-left">
                                Ajouter une nouvelle boîte
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="boxType">Type de boîte</Label>
                                <Select
                                  value={boxForm.type}
                                  onValueChange={(value: "nchira" | "chkara" | "normal") =>
                                    setBoxForm((prev) => ({ ...prev, type: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="nchira">Nchira (Boîte rouge)</SelectItem>
                                    <SelectItem value="chkara">Chkara (Sac - ID automatique)</SelectItem>
                                    <SelectItem value="normal">Boîte normale</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {boxForm.type !== "chkara" && (
                                <div>
                                  <Label htmlFor="boxId">ID de la boîte (1-600)</Label>
                                  <Input
                                    id="boxId"
                                    type="number"
                                    min="1"
                                    max="600"
                                    value={boxForm.id}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      setBoxForm((prev) => ({ ...prev, id: value }))
                                      // Live-clear error when user edits
                                      if (boxFormErrors.id) {
                                        setBoxFormErrors((prev) => ({ ...prev, id: undefined }))
                                      }
                                    }}
                                    placeholder="Saisir l'ID de la boîte (1-600)"
                                    className={boxFormErrors.id ? "border-red-500 focus-visible:ring-red-500" : undefined}
                                    aria-invalid={!!boxFormErrors.id}
                                    aria-describedby={boxFormErrors.id ? "boxId-error" : undefined}
                                  />
                                  {boxFormErrors.id && (
                                    <div id="boxId-error" className="mt-1 flex items-center text-sm text-red-600">
                                      <AlertCircle className="w-4 h-4 mr-1" />
                                      <span>{boxFormErrors.id}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {boxForm.type === "chkara" && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <p className="text-sm text-blue-700">
                                    Les boîtes Chkara obtiennent des IDs automatiques: {getNextChkaraId()}
                                  </p>
                                </div>
                              )}
                              <div>
                                <Label htmlFor="boxWeight">Poids (kg)</Label>
                                <p className="text-xs text-gray-500 mb-1">Optionnel - peut être ajouté plus tard</p>
                                <Input
                                  id="boxWeight"
                                  type="number"
                                  step="0.1"
                                  value={boxForm.weight}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setBoxForm((prev) => ({ ...prev, weight: value }))
                                    // Live-clear error when user edits
                                    if (boxFormErrors.weight) {
                                      setBoxFormErrors((prev) => ({ ...prev, weight: undefined }))
                                    }
                                  }}
                                  placeholder="Saisir le poids en kg (optionnel)"
                                  className={boxFormErrors.weight ? "border-red-500 focus-visible:ring-red-500" : undefined}
                                  aria-invalid={!!boxFormErrors.weight}
                                  aria-describedby={boxFormErrors.weight ? "boxWeight-error" : undefined}
                                />
                                {boxFormErrors.weight && (
                                  <div id="boxWeight-error" className="mt-1 flex items-center text-sm text-red-600">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    <span>{boxFormErrors.weight}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button onClick={handleAddBox} className="bg-[#6B8E4B] hover:bg-[#5A7A3F]" disabled={creating}>
                                  <Save className="w-4 h-4 mr-2" />
                                  {creating ? 'Enregistrement...' : 'Enregistrer boîte'}
                                </Button>
                                <Button variant="outline" onClick={() => setIsAddBoxOpen(false)}>
                                  <X className="w-4 h-4 mr-2" />
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#F4D03F] text-[#8B4513] hover:bg-[#F4D03F]"
                            >
                              <PackagePlus className="w-4 h-4 mr-2" />
                              Ajout en lot
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-full sm:max-w-2xl md:max-w-4xl max-h-[95vh] overflow-hidden mx-2 sm:mx-4 p-3 sm:p-6">
                            <DialogHeader className="pb-4 border-b border-gray-200">
                              {/* Mobile: Show back button for Step 2 */}
                              {bulkStep === 2 && (
                                <div className="sm:hidden mb-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setBulkStep(1)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2"
                                  >
                                    <ArrowLeft className="w-5 h-5 mr-2" />
                                    Retour à l'étape 1
                                  </Button>
                                </div>
                              )}
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <DialogTitle className="text-lg sm:text-xl font-bold text-center sm:text-left">
                                  Ajouter des boîtes en lot
                                </DialogTitle>
                                
                                {/* Enhanced Step Indicator */}
                                <div className="flex items-center justify-center sm:justify-end gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${bulkStep >= 1 ? 'bg-[#6B8E4B] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                      1
                                    </div>
                                    <div className={`w-6 h-1 rounded ${bulkStep >= 2 ? 'bg-[#6B8E4B]' : 'bg-gray-200'}`}></div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${bulkStep >= 2 ? 'bg-[#6B8E4B] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                      2
                                    </div>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-medium ${bulkStep === 1 ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-green-300 text-green-700 bg-green-50'}`}
                                  >
                                    {bulkStep === 1 ? 'Quantité' : 'Configuration'}
                                  </Badge>
                                </div>
                              </div>
                            </DialogHeader>

                            {bulkStep === 1 && (
                              <div className="space-y-6 py-4 overflow-y-auto">
                                {/* Step 1 - Mobile Enhanced */}
                                <div className="text-center sm:text-left">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Combien de boîtes voulez-vous ajouter ?
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-4">
                                    Vous pouvez ajouter jusqu'à 50 boîtes à la fois
                                  </p>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <Label htmlFor="bulkCount" className="text-base font-medium text-gray-900 block mb-3">
                                      Nombre de boîtes (1-50)
                                    </Label>
                                    <Input
                                      id="bulkCount"
                                      type="number"
                                      min="1"
                                      max="50"
                                      value={bulkCount}
                                      onChange={(e) => setBulkCount(e.target.value)}
                                      placeholder="Ex: 10"
                                      className="text-lg h-12 text-center sm:text-left border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {bulkCount && Number.parseInt(bulkCount) > 0 && (
                                      <div className="mt-3 text-center">
                                        <Badge className="bg-green-100 text-green-800 border-green-300">
                                          ✓ {bulkCount} boîte{Number.parseInt(bulkCount) > 1 ? 's' : ''} à configurer
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Quick Select Buttons for Mobile */}
                                  <div className="sm:hidden">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Sélection rapide :</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[5, 10, 20].map((num) => (
                                        <Button
                                          key={num}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setBulkCount(num.toString())}
                                          className="h-12 text-base"
                                        >
                                          {num}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 sm:space-x-2 pt-4 border-t border-gray-200">
                                  <Button
                                    onClick={handleBulkStepNext}
                                    disabled={!bulkCount || Number.parseInt(bulkCount) <= 0}
                                    className="bg-[#6B8E4B] hover:bg-[#5A7A3F] h-12 text-base font-medium flex-1 sm:flex-none"
                                  >
                                    <ArrowRight className="w-5 h-5 mr-2" />
                                    Étape suivante
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setIsBulkAddOpen(false)}
                                    className="h-12 text-base flex-1 sm:flex-none"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            )}

                                                        {bulkStep === 2 && (
                              <div className="space-y-4 overflow-hidden relative">
                                {/* Step 2 Header - Mobile Enhanced */}
                                <div className="space-y-3">
                                  <div className="text-center sm:text-left">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Configuration des boîtes
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Saisissez l'ID et le poids pour chaque boîte
                                    </p>
                                  </div>
                                  
                                  {/* Progress Section - Mobile Optimized */}
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <span className="text-sm font-medium text-gray-700 text-center sm:text-left">
                                        Progression: {bulkBoxes.filter((b) => b.id && b.weight).length} / {bulkBoxes.length} boîtes
                                      </span>
                                      <Progress
                                        value={(bulkBoxes.filter((b) => b.id && b.weight).length / bulkBoxes.length) * 100}
                                        className="w-full sm:w-32 h-2"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Scrollable Boxes Container - Mobile Enhanced */}
                                <div className="overflow-y-auto max-h-72 sm:max-h-96 -mx-1 pb-20 sm:pb-4">
                                  <div className="grid grid-cols-1 gap-3 px-1">
                                     {bulkBoxes.map((box, index) => (
                                       <Card key={index} className={`p-3 sm:p-4 ${box.idError || box.weightError ? "border-red-300 bg-red-50" : "border-gray-200"} shadow-sm`}>
                                         <div className="space-y-4">
                                           {/* Box Header */}
                                           <div className="flex items-center justify-between">
                                             <h4 className="font-semibold text-base text-gray-900">
                                               Boîte #{index + 1}
                                             </h4>
                                             {!box.idError && !box.weightError && box.id && box.weight && (
                                               <Badge className="bg-green-100 text-green-800 text-xs">
                                                 ✓ Complète
                                               </Badge>
                                             )}
                                           </div>
                                           
                                           {/* ID Input */}
                                           <div>
                                             <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                               ID de la boîte (1-600) *
                                             </Label>
                                             <Input
                                               type="number"
                                               min="1"
                                               max="600"
                                               value={box.id}
                                               onChange={(e) => updateBulkBox(index, "id", e.target.value)}
                                               placeholder="Ex: 123"
                                               className={`h-11 text-base ${box.idError ? "border-red-500 focus-visible:ring-red-500" : "border-gray-300 focus:border-blue-500"}`}
                                             />
                                             {box.idError && (
                                               <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 p-2 rounded">
                                                 <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                 <span>{box.idError}</span>
                                               </div>
                                             )}
                                           </div>
                                           
                                           {/* Weight Input */}
                                           <div>
                                             <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                               Poids (kg)
                                             </Label>
                                             <Input
                                               type="number"
                                               step="0.1"
                                               value={box.weight}
                                               onChange={(e) => updateBulkBox(index, "weight", e.target.value)}
                                               placeholder="Ex: 25.5"
                                               className={`h-11 text-base ${box.weightError ? "border-red-500 focus-visible:ring-red-500" : "border-gray-300 focus:border-blue-500"}`}
                                             />
                                             {box.weightError && (
                                               <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 p-2 rounded">
                                                 <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                 <span>{box.weightError}</span>
                                               </div>
                                             )}
                                           </div>
                                         </div>
                                       </Card>
                                                                        ))}
                                   </div>
                                 </div>



                                {/* Mobile Floating Action Button */}
                                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
                                  <div className="max-w-sm mx-auto space-y-3">
                                    <Button
                                      onClick={handleBulkAdd}
                                      disabled={bulkBoxes.some((b) => b.idError || b.weightError || !b.id)}
                                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Save className="w-6 h-6 mr-3" />
                                      {bulkBoxes.some((b) => b.idError || b.weightError || !b.id) ? (
                                        <>Complétez les boîtes</>
                                      ) : (
                                        <>Ajouter {bulkBoxes.filter((b) => !b.idError && !b.weightError && b.id).length} boîte{bulkBoxes.filter((b) => !b.idError && !b.weightError && b.id).length > 1 ? 's' : ''}</>
                                      )}
                                    </Button>
                                    
                                    {/* Mobile Progress Indicator */}
                                    {bulkBoxes.some((b) => b.idError || b.weightError || !b.id) && (
                                      <div className="text-center">
                                        <p className="text-xs text-orange-600 font-medium">
                                          ⚠ {bulkBoxes.filter((b) => b.idError || b.weightError || !b.id).length} boîte(s) à corriger
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons - Mobile Enhanced */}
                                <div className="space-y-4 pt-6 border-t border-gray-200">
                                                                                                        {/* Desktop Button Layout - Enhanced Visibility */}
                                   <div className="hidden sm:block">
                                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                                       {/* Desktop Submit Button - Prominent */}
                                       <Button
                                         onClick={handleBulkAdd}
                                         disabled={bulkBoxes.some((b) => b.idError || b.weightError || !b.id)}
                                         className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                       >
                                         <Save className="w-6 h-6 mr-3" />
                                         {bulkBoxes.some((b) => b.idError || b.weightError || !b.id) ? (
                                           <>Complétez les boîtes pour continuer</>
                                         ) : (
                                           <>Ajouter toutes les boîtes ({bulkBoxes.filter((b) => !b.idError && !b.weightError && b.id).length})</>
                                         )}
                                       </Button>
                                       
                                       {/* Desktop Navigation Buttons */}
                                       <div className="flex items-center justify-center gap-4">
                                         <Button 
                                           variant="outline" 
                                           onClick={() => setBulkStep(1)}
                                           className="h-11 text-base font-medium border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                                         >
                                           <ArrowLeft className="w-4 h-4 mr-2" />
                                           Retour à l'étape 1
                                         </Button>
                                         <Button 
                                           variant="outline" 
                                           onClick={() => setIsBulkAddOpen(false)}
                                           className="h-11 text-base font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                                         >
                                           <X className="w-4 h-4 mr-2" />
                                           Annuler
                                         </Button>
                                       </div>
                                       
                                       {/* Desktop Progress Indicator */}
                                       {bulkBoxes.some((b) => b.idError || b.weightError || !b.id) && (
                                         <div className="text-center">
                                           <p className="text-sm text-orange-600 font-medium">
                                             ⚠ {bulkBoxes.filter((b) => b.idError || b.weightError || !b.id).length} boîte(s) nécessitent une correction
                                           </p>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                  
                                  {/* Mobile Navigation Buttons */}
                                  <div className="sm:hidden">
                                    <div className="grid grid-cols-2 gap-3">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setBulkStep(1)}
                                        className="h-12 text-base font-medium border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                                      >
                                        <ArrowLeft className="w-5 h-5 mr-2" />
                                        Retour
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setIsBulkAddOpen(false)}
                                        className="h-12 text-base font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                                      >
                                        <X className="w-5 h-5 mr-2" />
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedFarmer.boxes.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune boîte</h3>
                        <p className="text-gray-500 mb-4">
                          Cet agriculteur n'a pas encore de boîtes enregistrées
                        </p>
                        <Dialog open={isAddBoxOpen} onOpenChange={(isOpen) => {
                          setIsAddBoxOpen(isOpen)
                          if (!isOpen) {
                            setBoxForm({ id: "", type: "normal", weight: "" })
                            setBoxFormErrors({})
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter la première boîte
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    ) : (
                      <>
                        {/* Grid View */}
                        {boxViewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                      {selectedFarmer.boxes.map((box) => (
                        <Card
                          key={box.id}
                            className={`transition-all ${
                              box.status !== "in_use" 
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed" 
                                : `cursor-pointer ${getBoxColor(box.type)} ${
                            box.selected ? "ring-2 ring-[#F4D03F] bg-[#F4D03F]/10" : "hover:shadow-md"
                                  }`
                          }`}
                            onClick={() => box.status === "in_use" && handleBoxSelection(selectedFarmer.id, box.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge
                                variant="outline"
                                className={
                                    box.status !== "in_use"
                                      ? "border-gray-400 text-gray-600"
                                      : box.type === "nchira"
                                    ? "border-red-300 text-red-700"
                                    : box.type === "chkara"
                                      ? "border-blue-300 text-blue-700"
                                      : "border-green-300 text-green-700"
                                }
                              >
                                  {box.status !== "in_use" ? (box.status === "available" ? "Disponible" : "Traitée") : box.type}
                              </Badge>
                              <Checkbox
                                checked={box.selected}
                                  disabled={box.status !== "in_use"}
                                  onCheckedChange={() => box.status === "in_use" && handleBoxSelection(selectedFarmer.id, box.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="text-center mb-3">
                              {getBoxIcon(box.type)}
                                <p className={`font-semibold mt-2 ${box.status !== "in_use" ? 'text-gray-500' : 'text-[#2C3E50]'}`}>{box.id}</p>
                                <p className={`text-sm ${box.status !== "in_use" ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {box.weight && box.weight > 0 ? `${box.weight} kg` : (
                                    <span className="text-orange-600 flex items-center justify-center">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Poids manquant
                                    </span>
                                  )}
                                </p>
                                {box.status !== "in_use" && (
                                  <p className="text-xs text-orange-600 mt-1 font-medium">✓ {box.status === "available" ? "Disponible" : "Traitée"}</p>
                                )}
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                  disabled={box.status !== "in_use"}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditBox(box)
                                }}
                                className="flex-1"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                  disabled={box.status !== "in_use"}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteBox(box.id)
                                }}
                                className="flex-1"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    )}

                    {/* List View */}
                    {boxViewMode === "list" && (
                      <div className="space-y-2 mb-6">
                        {selectedFarmer.boxes.map((box) => (
                          <Card
                            key={box.id}
                            className={`transition-all ${
                              box.status !== "in_use"
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                                : `cursor-pointer ${getBoxColor(box.type)} ${
                                    box.selected ? "ring-2 ring-[#F4D03F] bg-[#F4D03F]/10" : "hover:shadow-md"
                                  }`
                            }`}
                            onClick={() => box.status === "in_use" && handleBoxSelection(selectedFarmer.id, box.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <Checkbox
                                    checked={box.selected}
                                    disabled={box.status !== "in_use"}
                                    onCheckedChange={() => box.status === "in_use" && handleBoxSelection(selectedFarmer.id, box.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex items-center space-x-3">
                                    {getBoxIcon(box.type)}
                                    <div>
                                      <p className={`font-semibold ${box.status !== "in_use" ? 'text-gray-500' : 'text-[#2C3E50]'}`}>{box.id}</p>
                                      <p className={`text-sm ${box.status !== "in_use" ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {box.weight && box.weight > 0 ? `${box.weight} kg` : (
                                          <span className="text-orange-600 flex items-center">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Poids manquant
                                          </span>
                                        )}
                                      </p>
                                      {box.status !== "in_use" && (
                                        <p className="text-xs text-orange-600 font-medium">✓ {box.status === "available" ? "Disponible" : "Traitée"}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      box.status !== "in_use"
                                        ? "border-gray-400 text-gray-600"
                                        : box.type === "nchira"
                                          ? "border-red-300 text-red-700"
                                          : box.type === "chkara"
                                            ? "border-blue-300 text-blue-700"
                                            : "border-green-300 text-green-700"
                                    }
                                  >
                                    {box.status !== "in_use" ? (box.status === "available" ? "Disponible" : "Traitée") : box.type}
                                  </Badge>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={box.status !== "in_use"}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditBox(box)
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={box.status !== "in_use"}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteBox(box.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                                                 ))}
                       </div>
                     )}
                     </>
                    )}

                    {/* Processing Controls */}
                    {getSelectedBoxes(selectedFarmer).length > 0 && (
                      <div className="bg-gradient-to-r from-[#6B8E4B]/10 to-[#F4D03F]/10 rounded-lg p-6 border-2 border-[#6B8E4B]/20">
                        {(() => {
                          const selectedBoxes = getSelectedBoxes(selectedFarmer)
                          const boxesWithWeight = selectedBoxes.filter(box => box.weight && box.weight > 0)
                          const boxesWithoutWeight = selectedBoxes.filter(box => !box.weight || box.weight === 0)
                          
                          return (
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-[#2C3E50] text-base lg:text-lg">
                              {selectedBoxes.length} boîtes sélectionnées pour le traitement
                            </p>
                            {boxesWithoutWeight.length > 0 && (
                              <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                <p className="text-sm text-orange-700 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {boxesWithoutWeight.length} boîte(s) sans poids - ajoutez le poids avant de continuer
                                </p>
                              </div>
                            )}
                            <p className="text-gray-600 mb-2 text-sm lg:text-base">
                              Poids total: {boxesWithWeight.reduce((sum, box) => sum + box.weight, 0)}{" "}
                              kg
                              {boxesWithoutWeight.length > 0 && (
                                <span className="text-orange-600 ml-1">
                                  ({boxesWithoutWeight.length} boîte(s) sans poids)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              Valeur estimée:{" "}
                              {(
                                boxesWithWeight.reduce((sum, box) => sum + box.weight, 0) *
                                selectedFarmer.pricePerKg
                              ).toFixed(2)}{" "}
                              DT
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                      <Button
                              onClick={() => handleBulkDeleteSelectedBoxes(selectedFarmer)}
                            disabled={creating}
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50 text-sm lg:text-base"
                              title="Libérer les boîtes sélectionnées"
                            >
                              {creating ? (
                                <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
                              )}
                              <span className="hidden sm:inline">Supprimer la sélection</span>
                              <span className="sm:hidden">Supprimer</span>
                            </Button>
                            <Button
                              onClick={() => handleCompleteProcessing(selectedFarmer)}
                              disabled={creating || boxesWithoutWeight.length > 0}
                            className="bg-[#F4D03F] hover:bg-[#E6C547] text-[#8B4513] text-sm lg:text-lg px-4 sm:px-6 py-2 sm:py-3 h-auto"
                          >
                            {creating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                                <span className="hidden sm:inline">Création de la session...</span>
                                <span className="sm:hidden">Création...</span>
                              </>
                            ) : (
                              <>
                            <ArrowRight className="w-4 h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">{boxesWithoutWeight.length > 0 ? "Ajouter les poids manquants" : "Terminer le traitement"}</span>
                                <span className="sm:hidden">{boxesWithoutWeight.length > 0 ? "Ajouter poids" : "Terminer"}</span>
                              </>
                            )}
                          </Button>
                        </div>
                        </div>
                          )
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Sélectionner un agriculteur</h3>
                  <p className="text-gray-500">
                    Choisissez un agriculteur dans la liste pour gérer ses boîtes d'olives
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Farmer Dialog */}
      <Dialog open={isEditFarmerOpen} onOpenChange={setIsEditFarmerOpen}>
        <DialogContent className="max-w-full sm:max-w-md mx-4 p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">
              Modifier l'agriculteur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label htmlFor="editName">Nom *</Label>
              <Input
                id="editName"
                value={farmerForm.name}
                onChange={(e) => {
                  setFarmerForm((prev) => ({ ...prev, name: e.target.value }))
                  // Clear error when user starts typing
                  if (farmerFormErrors.name) {
                    setFarmerFormErrors(prev => ({ ...prev, name: undefined }))
                  }
                }}
                className={farmerFormErrors.name ? "border-red-500 focus:border-red-500" : ""}
              />
              {farmerFormErrors.name && (
                <p className="text-red-500 text-xs mt-1">{farmerFormErrors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editNickname">Surnom</Label>
              <Input
                id="editNickname"
                value={farmerForm.nickname}
                onChange={(e) => setFarmerForm((prev) => ({ ...prev, nickname: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Téléphone</Label>
              <Input
                id="editPhone"
                value={farmerForm.phone}
                onChange={(e) => {
                  setFarmerForm((prev) => ({ ...prev, phone: e.target.value }))
                  // Clear error when user starts typing
                  if (farmerFormErrors.phone) {
                    setFarmerFormErrors(prev => ({ ...prev, phone: undefined }))
                  }
                }}
                className={farmerFormErrors.phone ? "border-red-500 focus:border-red-500" : ""}
              />
              {farmerFormErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{farmerFormErrors.phone}</p>
              )}
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <Button onClick={handleEditFarmer} className="bg-[#6B8E4B] hover:bg-[#5A7A3F] flex-1">
                <Save className="w-4 h-4 mr-2" />
                Mettre à jour
              </Button>
              <Button variant="outline" onClick={() => setIsEditFarmerOpen(false)} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Box Dialog */}
      <Dialog open={!!editingBox} onOpenChange={(open) => !open && setEditingBox(null)}>
        <DialogContent className="max-w-full sm:max-w-md mx-4 p-4 sm:p-6">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg sm:text-xl font-bold text-center sm:text-left">
              Modifier la boîte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editBoxType">Type de boîte</Label>
              <Select
                value={boxForm.type}
                onValueChange={(value: "nchira" | "chkara" | "normal") =>
                  setBoxForm((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nchira">Nchira (Boîte rouge)</SelectItem>
                  <SelectItem value="chkara">Chkara (Sac)</SelectItem>
                  <SelectItem value="normal">Boîte normale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {boxForm.type !== "chkara" && (
              <div>
                <Label htmlFor="editBoxId">ID de la boîte (1-600)</Label>
                <Input
                  id="editBoxId"
                  type="number"
                  min="1"
                  max="600"
                  value={boxForm.id}
                  onChange={(e) => setBoxForm((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="Saisir l'ID de la boîte"
                />
              </div>
            )}
            {boxForm.type === "chkara" && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  {editingBox?.type === "chkara"
                    ? `Les boîtes Chkara ont des IDs fixes qui ne peuvent pas être modifiés: ${editingBox?.id}`
                    : `Changer vers Chkara assignera un nouvel ID: ${getNextChkaraId()}`}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="editBoxWeight">Poids (kg)</Label>
              <Input
                id="editBoxWeight"
                type="number"
                step="0.1"
                value={boxForm.weight}
                onChange={(e) => setBoxForm((prev) => ({ ...prev, weight: e.target.value }))}
                placeholder="Saisir le poids en kg"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleEditBox} 
                disabled={creating}
                className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                <Save className="w-4 h-4 mr-2" />
                Mettre à jour la boîte
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditingBox(null)}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Missing Weights Dialog - Mobile Enhanced */}
      <Dialog open={isBulkWeightsOpen} onOpenChange={(open) => {
        setIsBulkWeightsOpen(open)
        if (!open) {
          setMissingWeightEntries([])
        }
      }}>
        <DialogContent className="max-w-full sm:max-w-4xl mx-2 sm:mx-4 p-3 sm:p-6 max-h-[95vh] overflow-hidden">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg sm:text-xl font-bold text-center sm:text-left text-gray-900">
              ⚖️ Compléter les poids manquants
            </DialogTitle>
            
            {/* Mobile Progress Header */}
            <div className="space-y-3 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm text-gray-600 text-center sm:text-left">
                  📦 Boîtes sans poids: <span className="font-semibold text-blue-600">{missingWeightEntries.length}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(missingWeightEntries.filter(e => !e.error && e.weight.trim()).length / Math.max(1, missingWeightEntries.length)) * 100} 
                    className="flex-1 sm:w-32 h-2 sm:h-3" 
                  />
                  <span className="text-xs sm:text-sm text-gray-500 min-w-fit">
                    {missingWeightEntries.filter(e => !e.error && e.weight.trim()).length}/{missingWeightEntries.length}
                  </span>
                </div>
              </div>
              
              {/* Mobile Status Indicator */}
              {missingWeightEntries.some(e => e.error || !e.weight.trim()) ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-orange-700">
                    ⚠️ <span className="font-medium">{missingWeightEntries.filter(e => e.error || !e.weight.trim()).length}</span> poids à compléter
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-green-700">
                    ✅ <span className="font-medium">Tous les poids sont complétés!</span>
                  </p>
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex flex-col overflow-hidden">
                         {/* Scrollable Content Area - Mobile Enhanced */}
             <div 
               className="overflow-y-auto py-4 space-y-4 border border-gray-200 rounded-lg bg-gray-50/30" 
               style={{
                 maxHeight: 'calc(95vh - 280px)', // Account for header, footer, and mobile FAB
                 minHeight: '300px',
                 scrollbarWidth: 'thin',
                 scrollbarColor: '#CBD5E0 #F7FAFC'
               }}
             >
                             {/* Scroll Indicator for Mobile */}
               <div className="sm:hidden text-center pb-2">
                 <div className="space-y-2">
                   <p className="text-xs text-gray-500 bg-blue-50 inline-block px-3 py-1 rounded-full border border-blue-200">
                     📱 Faites défiler pour voir toutes les boîtes
                   </p>
                   {missingWeightEntries.length > 3 && (
                     <p className="text-xs text-blue-600 font-medium">
                       ↕️ {missingWeightEntries.length} boîtes au total
                     </p>
                   )}
                 </div>
               </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-20 sm:pb-4">
                {missingWeightEntries.map((entry, index) => (
                  <Card key={entry.id} className={`p-3 sm:p-4 transition-all duration-200 ${
                    entry.error 
                      ? 'border-orange-300 bg-orange-50 shadow-orange-100' 
                      : entry.weight.trim() 
                        ? 'border-green-300 bg-green-50 shadow-green-100' 
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}>
                    <div className="space-y-3">
                      {/* Box Header - Mobile Enhanced */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                          📦 Boîte {entry.id}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-1 font-medium capitalize ${
                            entry.type === 'chkara' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'
                          }`}
                        >
                          {entry.type}
                        </Badge>
                      </div>
                      
                      {/* Weight Input - Mobile Enhanced */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          ⚖️ Poids (kg)
                        </Label>
                        <div className="relative">
                          <Input
                            ref={(el) => { bulkWeightRefs.current[index] = el }}
                            type="number"
                            step="0.1"
                            value={entry.weight}
                            onChange={(e) => updateMissingWeight(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Advance when valid
                                const num = parseFloat(entry.weight)
                                if (!isNaN(num) && num > 0) {
                                  focusNextMissing(index)
                                }
                              }
                            }}
                            placeholder="Ex: 25.5"
                            className={`h-11 sm:h-10 text-base sm:text-sm ${
                              entry.error 
                                ? "border-orange-500 focus-visible:ring-orange-500 bg-orange-50" 
                                : entry.weight.trim()
                                  ? "border-green-500 focus-visible:ring-green-500 bg-green-50"
                                  : "border-gray-300 focus-visible:ring-blue-500"
                            }`}
                          />
                          {entry.weight.trim() && !entry.error && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        
                        {/* Error Message - Mobile Enhanced */}
                        {entry.error && (
                          <div className="bg-orange-100 border border-orange-200 rounded-md p-2">
                            <div className="flex items-center text-xs text-orange-700">
                              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="font-medium">
                                {entry.error === 'Requis' ? 'Poids requis' : 
                                 entry.error === '> 0' ? 'Doit être > 0 kg' : 
                                 entry.error === '> 1000' ? 'Maximum 1000 kg' : 'Valeur invalide'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                                    </Card>
                ))}
              </div>
              
              {/* Bottom scroll indicator - shows when there's content below */}
              <div className="sm:hidden sticky bottom-0 pointer-events-none">
                <div className="h-8 bg-gradient-to-t from-gray-50/80 to-transparent flex items-end justify-center pb-1">
                  {missingWeightEntries.length > 3 && (
                    <div className="text-xs text-gray-400 animate-bounce">
                      ⬇️ Plus de boîtes ci-dessous
                    </div>
                  )}
                </div>
              </div>
            </div>
            
                        {/* Mobile Floating Action Button */}
             <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
               <div className="max-w-sm mx-auto space-y-3">
                 {/* Scroll indicator when there are many boxes */}
                 {missingWeightEntries.length > 3 && (
                   <div className="text-center pb-1">
                     <p className="text-xs text-blue-600 font-medium animate-pulse">
                       ↕️ Faites défiler pour voir toutes les {missingWeightEntries.length} boîtes
                     </p>
                   </div>
                 )}
                 
                 <Button
                   onClick={handleSaveAllWeights}
                   disabled={creating || missingWeightEntries.some(e => e.error || !e.weight.trim())}
                   className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                 >
                   {creating ? (
                     <>
                       <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                       Sauvegarde...
                     </>
                   ) : (
                     <>
                       <Save className="w-6 h-6 mr-3" />
                       {missingWeightEntries.some(e => e.error || !e.weight.trim()) ? (
                         <>Complétez les poids ({missingWeightEntries.filter(e => !e.error && e.weight.trim()).length}/{missingWeightEntries.length})</>
                       ) : (
                         <>Enregistrer tous les poids</>
                       )}
                     </>
                   )}
                 </Button>
                 
                 {/* Mobile Progress */}
                 {missingWeightEntries.some(e => e.error || !e.weight.trim()) && (
                   <div className="text-center">
                     <p className="text-xs text-orange-600 font-medium">
                       ⚠️ {missingWeightEntries.filter(e => e.error || !e.weight.trim()).length} poids restant(s)
                     </p>
                   </div>
                 )}
               </div>
             </div>
            
            {/* Desktop Actions - Enhanced */}
            <div className="hidden sm:block pt-4 border-t border-gray-200">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Desktop Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      📊 Progression: <span className="font-semibold text-blue-600">
                        {missingWeightEntries.filter(e => !e.error && e.weight.trim()).length}
                      </span> / {missingWeightEntries.length} complétés
                    </span>
                    {missingWeightEntries.length > 0 && (
                      <Badge variant="outline" className={`text-xs ${
                        missingWeightEntries.filter(e => !e.error && e.weight.trim()).length === missingWeightEntries.length
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-orange-100 text-orange-700 border-orange-300'
                      }`}>
                        {missingWeightEntries.filter(e => !e.error && e.weight.trim()).length === missingWeightEntries.length
                          ? '✅ Terminé'
                          : `⏳ ${missingWeightEntries.length - missingWeightEntries.filter(e => !e.error && e.weight.trim()).length} restant(s)`
                        }
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Desktop Action Buttons */}
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBulkWeightsOpen(false)}
                    className="h-11 px-6 text-base font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSaveAllWeights} 
                    disabled={creating || missingWeightEntries.some(e => e.error || !e.weight.trim())} 
                    className="h-11 px-8 text-base font-bold bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        {missingWeightEntries.some(e => e.error || !e.weight.trim()) ? (
                          <>Complétez d'abord tous les poids</>
                        ) : (
                          <>Enregistrer tous les poids</>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print All Farmers Component - Hidden until print is triggered */}
      {printingFarmers && (
        <PrintAllFarmers farmers={filteredFarmers} />
      )}
    </div>
  )
}

const PrintAllFarmers = ({ farmers }: { farmers: Farmer[] }) => {
  return (
    <div className="print-all-farmers">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-all-farmers, .print-all-farmers * {
            visibility: visible;
          }
          
          .print-all-farmers {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            font-family: Arial, sans-serif !important;
            background: white !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .farmers-table {
            width: 100% !important;
            font-size: 10px !important;
            border-collapse: collapse !important;
            margin: 10px 0 !important;
          }
          
          .farmers-table th,
          .farmers-table td {
            border: 1px solid #333 !important;
            padding: 8px 6px !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          
          .farmers-table th {
            background-color: #6B8E4B !important;
            color: white !important;
            font-weight: bold !important;
            font-size: 11px !important;
          }
          
          .print-header-title {
            font-size: 22px !important;
            margin-bottom: 10px !important;
            font-weight: bold !important;
          }
          
          .print-footer {
            margin-top: 15px !important;
            padding-top: 10px !important;
            border-top: 2px solid #6B8E4B !important;
            text-align: center !important;
            font-size: 9px !important;
          }
          
          .stats-summary {
            background-color: #f3f4f6 !important;
            border: 2px solid #6B8E4B !important;
            padding: 10px !important;
            border-radius: 4px !important;
            margin-bottom: 15px !important;
          }
        }
        
        .print-all-farmers {
          display: none;
        }
        
        @media print {
          .print-all-farmers {
            display: block !important;
          }
        }
        `
      }} />

      <div>
        {/* Header */}
        <div className="border-b-2 border-[#6B8E4B] pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="print-header-title text-2xl font-bold text-[#2C3E50]">HUILERIE MASMOUDI</h1>
            <p className="text-sm text-gray-600">Adresse: Tunis, Mahdia</p>
            <p className="text-sm text-gray-600 font-semibold">Liste des Agriculteurs</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Date d'impression:</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
            <p className="text-xs text-gray-500">{new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="stats-summary mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Total Agriculteurs</p>
            <p className="text-2xl font-bold text-[#2C3E50]">{farmers.length}</p>
          </div>
        </div>

        {/* Farmers Table */}
        <table className="farmers-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>N°</th>
              <th style={{ width: '30%' }}>Nom Complet</th>
              <th style={{ width: '20%' }}>Surnom</th>
              <th style={{ width: '18%' }}>Téléphone</th>
              <th style={{ width: '12%' }}>Boîtes</th>
              <th style={{ width: '12%' }}>Date d'ajout</th>
            </tr>
          </thead>
          <tbody>
            {farmers.map((farmer, index) => (
              <tr key={farmer.id}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ fontWeight: 'bold' }}>{farmer.name}</td>
                <td>{farmer.nickname || '-'}</td>
                <td>{farmer.phone || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {farmer.boxes?.length || 0}
                </td>
                <td>{new Date(farmer.dateAdded).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="print-footer">
          <p className="font-semibold text-[#2C3E50] mb-1">
            HUILERIE MASMOUDI - Votre partenaire pour une huile d'olive de qualité
          </p>
          <p className="text-gray-500">
            Document généré automatiquement - {farmers.length} agriculteur(s) répertorié(s)
          </p>
        </div>
      </div>
    </div>
  )
}
