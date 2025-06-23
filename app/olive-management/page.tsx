"use client"

import { useState, useEffect } from "react"
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
  BarChart3,
  Archive,
  Edit,
  Trash2,
  ShoppingBag,
  Save,
  X,
  AlertCircle,
  PackagePlus,
  CheckSquare,
  SquareIcon,
  ArrowRight,
  Loader2,
  Grid3X3,
  List,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { farmersApi, boxesApi, sessionsApi } from "@/lib/api"
import { transformFarmerFromDb, transformBoxFromDb, generateSessionNumber, calculatePricePerKg } from "@/lib/utils"

interface Farmer {
  id: string
  name: string
  phone: string
  type: "small" | "large"
  dateAdded: string
  pricePerKg: number
  boxes: Box[]
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
  error?: string
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
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
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

  // Form states
  const [farmerForm, setFarmerForm] = useState({
    name: "",
    phone: "",
    type: "small" as "small" | "large",
  })
  const [boxForm, setBoxForm] = useState({
    id: "",
    type: "normal" as "nchira" | "chkara" | "normal",
    weight: "",
  })

  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [boxViewMode, setBoxViewMode] = useState<"grid" | "list">("grid")

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
    console.log('=== OLIVE MANAGEMENT REBUILD CHECK ===')
    const rebuildFarmerId = localStorage.getItem("rebuildFarmerId")
    const rebuildFarmerName = localStorage.getItem("rebuildFarmerName")
    
    console.log('Rebuild data from localStorage:', { rebuildFarmerId, rebuildFarmerName })
    console.log('Current state:', { farmersCount: farmers.length, loading, selectedFarmer: selectedFarmer?.name })
    
    if (rebuildFarmerId && farmers.length > 0 && !loading) {
      console.log('Attempting to rebuild farmer:', { rebuildFarmerId, rebuildFarmerName, farmersCount: farmers.length })
      console.log('Available farmers:', farmers.map(f => ({ id: f.id, name: f.name })))
      
      const farmer = farmers.find((f) => f.id === rebuildFarmerId)
      if (farmer) {
        console.log('✅ Found farmer for rebuild:', farmer.name)
        setSelectedFarmer(farmer)
        showNotification(`Agriculteur ${farmer.name} sélectionné pour reconstruction`, "success")
        
        // Clear localStorage after successful selection
        localStorage.removeItem("rebuildFarmerId")
        localStorage.removeItem("rebuildFarmerName")
        console.log('✅ Cleared localStorage after successful rebuild')
      } else {
        console.log('❌ Farmer not found in current farmers list:', { 
          rebuildFarmerId, 
          availableFarmers: farmers.map(f => ({ id: f.id, name: f.name }))
        })
        
        // If we have the farmer name from localStorage, show it in the error message
        const farmerDisplayName = rebuildFarmerName || "cet agriculteur"
        showNotification(`${farmerDisplayName} a été supprimé. Vous devez créer l'agriculteur à nouveau.`, "warning")
        
        // Clear localStorage after showing error
        localStorage.removeItem("rebuildFarmerId")
        localStorage.removeItem("rebuildFarmerName")
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
  }, [farmers, loading])

  const showNotification = (message: string, type: "error" | "success" | "warning") => {
    setNotification({ message, type })
  }

  const getBoxIcon = (type: Box["type"]) => {
    switch (type) {
      case "nchira":
        return <Package className="w-6 h-6 text-red-500" />
      case "chkara":
        return <ShoppingBag className="w-6 h-6 text-blue-500" />
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

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch = farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || farmer.type === filterType
    return matchesSearch && matchesFilter
  })

  // Farmer CRUD operations
  const handleAddFarmer = async () => {
    if (!farmerForm.name.trim()) {
      showNotification("Le nom de l'agriculteur est requis", "error")
      return
    }

    setCreating(true)
    try {
      const response = await farmersApi.create({
        name: farmerForm.name.trim(),
        phone: farmerForm.phone.trim() || undefined,
      type: farmerForm.type,
      })

      if (response.success) {
        const newFarmer = transformFarmerFromDb({
          ...response.data,
          boxes: []
        })

    setFarmers((prev) => [...prev, newFarmer])
    setFarmerForm({ name: "", phone: "", type: "small" })
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
    if (!selectedFarmer || !farmerForm.name.trim()) {
      showNotification("Le nom de l'agriculteur est requis", "error")
      return
    }

    setCreating(true)
    try {
      const response = await farmersApi.update(selectedFarmer.id, {
        name: farmerForm.name.trim(),
        phone: farmerForm.phone.trim() || undefined,
              type: farmerForm.type,
        pricePerKg: selectedFarmer.pricePerKg
      })

      if (response.success) {
        const updatedFarmer = transformFarmerFromDb(response.data)
        
        // Preserve the current boxes state if API doesn't return boxes
        const currentFarmer = farmers.find(f => f.id === selectedFarmer.id)
        if (currentFarmer && (!updatedFarmer.boxes || updatedFarmer.boxes.length === 0) && currentFarmer.boxes.length > 0) {
          updatedFarmer.boxes = currentFarmer.boxes
        }
        
        setFarmers((prev) =>
          prev.map((farmer) =>
            farmer.id === selectedFarmer.id ? updatedFarmer : farmer
          )
        )
        
        setSelectedFarmer(updatedFarmer)
    setFarmerForm({ name: "", phone: "", type: "small" })
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet agriculteur?")) {
      return
    }

    try {
      const response = await farmersApi.delete(farmerId)

      if (response.success) {
      setFarmers((prev) => prev.filter((farmer) => farmer.id !== farmerId))
      if (selectedFarmer?.id === farmerId) {
        setSelectedFarmer(null)
      }
      showNotification("Agriculteur supprimé avec succès!", "success")
      } else {
        showNotification(response.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting farmer:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  // Box CRUD operations
  const handleAddBox = async () => {
    if (!selectedFarmer || !boxForm.weight) return

    setCreating(true)
    try {
      // For Chkara boxes, generate the ID automatically
      let boxId = boxForm.type === "chkara" ? getNextChkaraId() : boxForm.id

      // Enhanced validation for non-Chkara boxes
      if (boxForm.type !== "chkara") {
        if (!boxId || boxId.trim() === "") {
          showNotification("L'ID de la boîte est requis", "error")
          setCreating(false)
          return
        }

        // Validate ID range (1-600)
        const numId = parseInt(boxId.trim())
        if (isNaN(numId) || numId < 1 || numId > 600) {
          showNotification("L'ID de la boîte doit être entre 1 et 600", "error")
          setCreating(false)
          return
        }

        // Check if ID is already used
        const validationError = validateBoxId(boxId.trim())
      if (validationError) {
        showNotification(validationError, "error")
          setCreating(false)
        return
      }

        boxId = boxId.trim()
      }

      // Validate weight
      const weight = Number.parseFloat(boxForm.weight)
      if (isNaN(weight) || weight <= 0) {
        showNotification("Veuillez saisir un poids valide supérieur à 0", "error")
        setCreating(false)
        return
    }

      const response = await farmersApi.addBox(selectedFarmer.id, {
      id: boxId,
      type: boxForm.type,
        weight: weight,
      })

      if (response.success) {
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
    setIsAddBoxOpen(false)

        // Show success notification with box details
        const boxTypeText = boxForm.type === "chkara" ? "Sac Chkara" : `Boîte ${boxId}`
        showNotification(`${boxTypeText} assignée avec succès à ${selectedFarmer.name}!`, "success")

        // Reload farmer data in background to ensure consistency (but don't await it)
        reloadFarmer(selectedFarmer.id).catch(console.error)
      } else {
        // Enhanced error handling with specific messages
        const errorMessage = response.error || 'Erreur lors de l\'assignation'
        
        if (errorMessage.includes("n'existe pas dans l'inventaire")) {
          showNotification(`Boîte ${boxId} n'existe pas dans l'inventaire de l'usine (IDs disponibles: 1-600)`, "error")
        } else if (errorMessage.includes("n'est pas disponible")) {
          showNotification(`Boîte ${boxId} n'est pas disponible (déjà utilisée par un autre agriculteur)`, "error")
        } else if (errorMessage.includes("déjà utilisé") || errorMessage.includes("already exists")) {
          showNotification(`L'ID ${boxId} est déjà utilisé. Veuillez choisir un autre ID entre 1 et 600.`, "error")
        } else if (errorMessage.includes("600") || errorMessage.includes("range")) {
          showNotification("L'ID de la boîte doit être entre 1 et 600", "error")
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
    if (!selectedFarmer || !editingBox || !boxForm.weight) return

    setCreating(true)
    try {
      const updateData: any = {
        weight: Number.parseFloat(boxForm.weight),
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
      weight: Number.parseFloat(boxForm.weight),
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
    setBulkBoxes((prev) =>
      prev.map((box, i) => {
        if (i === index) {
          const updated = { ...box, [field]: value }
          if (field === "id" && value.trim()) {
            // Enhanced validation for bulk box IDs
            const numId = parseInt(value.trim())
            if (isNaN(numId) || numId < 1 || numId > 600) {
              updated.error = "L'ID doit être entre 1 et 600"
            } else {
              updated.error = validateBoxId(value.trim()) || undefined
            }
          } else if (field === "id" && !value.trim()) {
            updated.error = "L'ID est requis"
          } else if (field === "weight" && value.trim()) {
            const weight = parseFloat(value.trim())
            if (isNaN(weight) || weight <= 0) {
              updated.error = "Le poids doit être supérieur à 0"
            } else {
              updated.error = undefined
            }
          }
          return updated
        }
        return box
      }),
    )
  }

  const handleBulkAdd = async () => {
    if (!selectedFarmer) return

    const validBoxes = bulkBoxes.filter((box) => !box.error && box.id && box.weight)
    if (validBoxes.length === 0) {
      showNotification("Aucune boîte valide à ajouter", "error")
      return
    }

    setCreating(true)
    try {
      const boxesToCreate = validBoxes.map((box) => ({
      id: box.id,
        type: "normal" as const,
      weight: Number.parseFloat(box.weight),
      }))

      const response = await farmersApi.addBoxes(selectedFarmer.id, boxesToCreate)

      if (response.success) {
        // Reload farmer to get fresh data with all boxes
        await reloadFarmer(selectedFarmer.id)

    setBulkStep(1)
    setBulkCount("")
    setBulkBoxes([])
    setIsBulkAddOpen(false)
        showNotification(`${response.data.length} boîtes ajoutées avec succès!`, "success")
      } else {
        showNotification(response.error || 'Erreur lors de la création en lot', 'error')
      }
    } catch (error) {
      console.error('Error bulk creating boxes:', error)
      showNotification('Erreur de connexion au serveur', 'error')
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

    // Calculate total weight and price
    const totalBoxWeight = selectedBoxes.reduce((sum, box) => sum + box.weight, 0)
    const totalPrice = totalBoxWeight * farmer.pricePerKg

    setCreating(true)
    try {
      // Create session via API
      const response = await sessionsApi.create({
        farmerId: farmer.id,
      boxIds: selectedBoxes.map((box) => box.id),
      totalBoxWeight: totalBoxWeight,
        boxCount: selectedBoxes.length,
        totalPrice: totalPrice
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
    // Set the farmer immediately for UI responsiveness
    setSelectedFarmer(farmer)
    
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-[#6B8E4B] rounded-lg flex items-center justify-center">
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
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex">
          {/* Left Panel - Farmers List */}
          <div className="w-1/3 p-6 border-r border-gray-200">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[#2C3E50]">Agriculteurs</h2>
                <Dialog open={isAddFarmerOpen} onOpenChange={setIsAddFarmerOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter agriculteur
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un nouvel agriculteur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nom *</Label>
                        <Input
                          id="name"
                          value={farmerForm.name}
                          onChange={(e) => setFarmerForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Saisir le nom de l'agriculteur"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Téléphone (optionnel)</Label>
                        <Input
                          id="phone"
                          value={farmerForm.phone}
                          onChange={(e) => setFarmerForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="Saisir le numéro de téléphone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type d'agriculteur</Label>
                        <Select
                          value={farmerForm.type}
                          onValueChange={(value: "small" | "large") =>
                            setFarmerForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Petit agriculteur (0.15 DT/kg)</SelectItem>
                            <SelectItem value="large">Grand agriculteur (0.20 DT/kg)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleAddFarmer} 
                          disabled={creating}
                          className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
                        >
                          {creating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                          <Save className="w-4 h-4 mr-2" />
                          )}
                          {creating ? 'Création...' : 'Enregistrer agriculteur'}
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddFarmerOpen(false)} disabled={creating}>
                          <X className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search & Filter */}
              <div className="space-y-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher des agriculteurs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les agriculteurs</SelectItem>
                    <SelectItem value="small">Petits agriculteurs</SelectItem>
                    <SelectItem value="large">Grands agriculteurs</SelectItem>
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
                    selectedFarmer?.id === farmer.id ? "ring-2 ring-[#6B8E4B] bg-[#6B8E4B]/5" : ""
                  }`}
                  onClick={() => handleFarmerSelection(farmer)}
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
                        <h3 className="font-semibold text-[#2C3E50]">{farmer.name}</h3>
                        <p className="text-sm text-gray-600">{farmer.phone || "Pas de téléphone"}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{farmer.boxes.length} boîtes</span>
                          <Badge variant={farmer.type === "large" ? "default" : "secondary"} className="text-xs">
                            {farmer.pricePerKg} DT/kg
                          </Badge>
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
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
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
          <div className="flex-1 p-6">
            {selectedFarmer ? (
              <div className="space-y-6">
                {/* Farmer Details Form */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-[#2C3E50]">Détails de l'agriculteur</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <Input value={selectedFarmer.name} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <Input value={selectedFarmer.phone || "Non renseigné"} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type d'agriculteur</label>
                        <Input
                          value={selectedFarmer.type === "large" ? "Grand agriculteur" : "Petit agriculteur"}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prix par kg</label>
                        <Input value={`${selectedFarmer.pricePerKg} DT`} readOnly />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Boxes Gallery */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <CardTitle className="text-[#2C3E50]">Gestion des boîtes</CardTitle>
                        
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
                                <SquareIcon className="w-4 h-4 mr-2" />
                                Désélectionner tout
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Sélectionner tout
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Dialog open={isAddBoxOpen} onOpenChange={setIsAddBoxOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter boîte
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Ajouter une nouvelle boîte</DialogTitle>
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
                                    onChange={(e) => setBoxForm((prev) => ({ ...prev, id: e.target.value }))}
                                    placeholder="Saisir l'ID de la boîte (1-600)"
                                  />
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
                                <Input
                                  id="boxWeight"
                                  type="number"
                                  step="0.1"
                                  value={boxForm.weight}
                                  onChange={(e) => setBoxForm((prev) => ({ ...prev, weight: e.target.value }))}
                                  placeholder="Saisir le poids en kg"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <Button onClick={handleAddBox} className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                                  <Save className="w-4 h-4 mr-2" />
                                  Enregistrer boîte
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
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Ajouter des boîtes en lot</DialogTitle>
                            </DialogHeader>

                            {bulkStep === 1 && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="bulkCount">Nombre de boîtes à ajouter (max 50)</Label>
                                  <Input
                                    id="bulkCount"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={bulkCount}
                                    onChange={(e) => setBulkCount(e.target.value)}
                                    placeholder="Saisir le nombre de boîtes"
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={handleBulkStepNext}
                                    disabled={!bulkCount || Number.parseInt(bulkCount) <= 0}
                                    className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
                                  >
                                    Étape suivante
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            )}

                            {bulkStep === 2 && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-semibold">Saisir les détails des boîtes</h3>
                                  <Progress
                                    value={(bulkBoxes.filter((b) => b.id && b.weight).length / bulkBoxes.length) * 100}
                                    className="w-32"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                  {bulkBoxes.map((box, index) => (
                                    <Card key={index} className={`p-4 ${box.error ? "border-red-300 bg-red-50" : ""}`}>
                                      <div className="space-y-3">
                                        <h4 className="font-medium">Boîte #{index + 1}</h4>
                                        <div>
                                          <Label>ID de la boîte (1-600)</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="600"
                                            value={box.id}
                                            onChange={(e) => updateBulkBox(index, "id", e.target.value)}
                                            placeholder="ID de la boîte"
                                          />
                                          {box.error && <p className="text-xs text-red-600 mt-1">{box.error}</p>}
                                        </div>
                                        <div>
                                          <Label>Poids (kg)</Label>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            value={box.weight}
                                            onChange={(e) => updateBulkBox(index, "weight", e.target.value)}
                                            placeholder="Poids"
                                          />
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>

                                <div className="flex space-x-2">
                                  <Button
                                    onClick={handleBulkAdd}
                                    disabled={bulkBoxes.some((b) => b.error || !b.id || !b.weight)}
                                    className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    Ajouter toutes les boîtes
                                  </Button>
                                  <Button variant="outline" onClick={() => setBulkStep(1)}>
                                    Retour
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
                        <Dialog open={isAddBoxOpen} onOpenChange={setIsAddBoxOpen}>
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
                    <div className="grid grid-cols-3 gap-4 mb-6">
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
                                <p className={`text-sm ${box.status !== "in_use" ? 'text-gray-400' : 'text-gray-600'}`}>{box.weight} kg</p>
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
                                      <p className={`text-sm ${box.status !== "in_use" ? 'text-gray-400' : 'text-gray-600'}`}>{box.weight} kg</p>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#2C3E50] text-lg">
                              {getSelectedBoxes(selectedFarmer).length} boîtes sélectionnées pour le traitement
                            </p>
                            <p className="text-gray-600 mb-2">
                              Poids total: {getSelectedBoxes(selectedFarmer).reduce((sum, box) => sum + box.weight, 0)}{" "}
                              kg
                            </p>
                            <p className="text-sm text-gray-600">
                              Valeur estimée:{" "}
                              {(
                                getSelectedBoxes(selectedFarmer).reduce((sum, box) => sum + box.weight, 0) *
                                selectedFarmer.pricePerKg
                              ).toFixed(2)}{" "}
                              DT
                            </p>
                          </div>
                          <Button
                            onClick={() => handleCompleteProcessing(selectedFarmer)}
                            disabled={creating}
                            className="bg-[#F4D03F] hover:bg-[#E6C547] text-[#8B4513] text-lg px-6 py-3 h-auto"
                          >
                            {creating ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Création de la session...
                              </>
                            ) : (
                              <>
                            <ArrowRight className="w-5 h-5 mr-2" />
                            Terminer le traitement
                              </>
                            )}
                          </Button>
                        </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'agriculteur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Nom *</Label>
              <Input
                id="editName"
                value={farmerForm.name}
                onChange={(e) => setFarmerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Saisir le nom de l'agriculteur"
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Téléphone (optionnel)</Label>
              <Input
                id="editPhone"
                value={farmerForm.phone}
                onChange={(e) => setFarmerForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Saisir le numéro de téléphone"
              />
            </div>
            <div>
              <Label htmlFor="editType">Type d'agriculteur</Label>
              <Select
                value={farmerForm.type}
                onValueChange={(value: "small" | "large") => setFarmerForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petit agriculteur (0.15 DT/kg)</SelectItem>
                  <SelectItem value="large">Grand agriculteur (0.20 DT/kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editPricePerKg">Prix par kg (DT) *</Label>
              <Input
                id="editPricePerKg"
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                value={selectedFarmer?.pricePerKg || 0.15}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value) || 0.15
                  setSelectedFarmer(prev => prev ? { ...prev, pricePerKg: newPrice } : null)
                }}
                placeholder="Prix par kilogramme"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez modifier le prix personnalisé pour cet agriculteur
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleEditFarmer} className="bg-[#6B8E4B] hover:bg-[#5A7A3F]">
                <Save className="w-4 h-4 mr-2" />
                Mettre à jour l'agriculteur
              </Button>
              <Button variant="outline" onClick={() => setIsEditFarmerOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Box Dialog */}
      <Dialog open={!!editingBox} onOpenChange={(open) => !open && setEditingBox(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la boîte</DialogTitle>
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
    </div>
  )
}
