"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  Users,
  Printer,
  CheckCircle,
  Search,
  BarChart3,
  Archive,
  AlertCircle,
  Save,
  X,
  RotateCcw,
  Trash2,
  Edit,
  LogOut,
  Calendar,
  Crown,
  Menu,
  ArrowLeft,
  FileText,
  Package,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { sessionsApi, farmersApi } from "@/lib/api"
import { logout, getCurrentUser } from '@/lib/auth-client'

interface ProcessedFarmer {
  id: string
  name: string
  phone: string
  type: "small" | "large"
  pricePerKg: number
  sessions: ProcessingSession[]
  totalAmountDue: number
  totalAmountPaid: number
  paymentStatus: "paid" | "pending"
  lastProcessingDate: string
}

interface ProcessingSession {
  id: string
  date: string
  oilWeight: number
  totalPrice: number
  boxCount: number
  boxIds: string[]
  boxDetails?: Array<{
    id: string
    type: string
    weight: number
  }>
  totalBoxWeight: number
  processingStatus: "pending" | "processed"
  paymentStatus: "unpaid" | "paid"
  farmerId: string
  sessionNumber: string
  paymentDate?: string
  createdAt: string
  pricePerKg: number
}

export default function OilManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFarmer, setSelectedFarmer] = useState<ProcessedFarmer | null>(null)
  const [editingSession, setEditingSession] = useState<ProcessingSession | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    oilWeight: "",
    date: "",
    paymentDate: "",
  })
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(
    null,
  )
  const [showPaymentConfirm, setShowPaymentConfirm] = useState<string | null>(null)
  const [showDeleteFarmerConfirm, setShowDeleteFarmerConfirm] = useState<string | null>(null)
  const [showDeleteSessionConfirm, setShowDeleteSessionConfirm] = useState<string | null>(null)
  const [printingSession, setPrintingSession] = useState<ProcessingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"farmers" | "sessions">("farmers")

  const [processedFarmers, setProcessedFarmers] = useState<ProcessedFarmer[]>([])

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      console.log('❌ No user found in oil management, redirecting to login')
      window.location.href = '/login'
      return
    }
    setUser(currentUser)
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

  // Load sessions and group by farmers
  const loadSessions = async () => {
    try {
      setLoading(true)
      console.log('Loading sessions with parameters:', {
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeFarmer: true,
        includeBoxes: false
      })
      
      // Get all sessions with farmer data
      const response = await sessionsApi.getAll({
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeFarmer: true,
        includeBoxes: true
      })

      console.log('Sessions API response:', response)

      if (response.success) {
        // Group sessions by farmer using farmer data from API response
        const sessionsWithFarmers = response.data.items

        // Group sessions by farmer and create ProcessedFarmer objects
        const groupedByFarmer = sessionsWithFarmers.reduce((acc: any, session: any) => {
          const farmerId = session.farmerId
          
          if (!acc[farmerId]) {
            // Create farmer entry if it doesn't exist
            acc[farmerId] = {
              id: session.farmer?.id || farmerId,
              name: session.farmer?.name || "Agriculteur inconnu",
              phone: session.farmer?.phone || "",
              type: session.farmer?.type || "small",
              pricePerKg: Number(session.farmer?.pricePerKg) || 0.15,
              sessions: [],
              totalAmountDue: 0,
      totalAmountPaid: 0,
              paymentStatus: "pending" as const,
              lastProcessingDate: ""
            }
          }

          // Debug logging for box IDs
          console.log('Session data:', session.id, {
            sessionBoxes: session.sessionBoxes,
            boxIdsExtracted: session.sessionBoxes?.map((sb: any) => sb.boxId) || []
          })

          const transformedSession: ProcessingSession = {
            id: session.id,
            date: session.processingDate ? new Date(session.processingDate).toISOString().split('T')[0] : "",
            oilWeight: Number(session.oilWeight) || 0,
            totalPrice: Number(session.totalPrice),
            boxCount: session.boxCount,
            boxIds: session.sessionBoxes?.map((sb: any) => sb.boxId) || [],
            boxDetails: session.sessionBoxes?.map((sb: any) => ({
              id: sb.boxId,
              type: sb.boxType?.toLowerCase() || 'normal',
              weight: Number(sb.boxWeight) || 0
            })) || [],
            totalBoxWeight: Number(session.totalBoxWeight),
            processingStatus: (Number(session.oilWeight) > 0 || session.processingStatus === 'PROCESSED' || session.processingStatus === 'processed') ? "processed" : "pending",
            paymentStatus: (session.paymentStatus === 'PAID' || session.paymentStatus === 'paid') ? "paid" : "unpaid",
            farmerId: session.farmerId,
            sessionNumber: session.sessionNumber || session.id,
            paymentDate: session.paymentDate ? new Date(session.paymentDate).toISOString().split('T')[0] : undefined,
            createdAt: session.createdAt,
            pricePerKg: Number(session.pricePerKg) || Number(session.farmer?.pricePerKg) || 0.15,
          }

          // Debug the transformed session
          console.log('Transformed session boxIds:', transformedSession.boxIds)

          // Payment status transformation is now case-insensitive

          acc[farmerId].sessions.push(transformedSession)
          acc[farmerId].totalAmountDue += session.totalPrice
          if (session.paymentStatus === 'paid' || session.paymentStatus === 'PAID') {
            acc[farmerId].totalAmountPaid += session.totalPrice
          }
          acc[farmerId].lastProcessingDate = session.createdAt

          return acc
        }, {})

        // Convert to array and calculate payment status
        const processedFarmersArray = Object.values(groupedByFarmer).map((farmer: any) => ({
          ...farmer,
          paymentStatus: farmer.totalAmountPaid >= farmer.totalAmountDue ? "paid" : "pending",
          sessions: farmer.sessions.sort((a: ProcessingSession, b: ProcessingSession) => 
            new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
          )
        }))

        setProcessedFarmers(processedFarmersArray)

        // Auto-select farmer if farmerId is provided in URL
        const farmerIdFromUrl = searchParams.get('farmerId')
        const sessionIdFromUrl = searchParams.get('sessionId')
        
        // Handle auto-selection if farmerId is provided in URL
        if (farmerIdFromUrl) {
          console.log('Auto-selecting farmer with ID:', farmerIdFromUrl)
          console.log('Available farmers:', processedFarmersArray.map(f => ({ id: f.id, name: f.name })))
          
          // Clear URL parameters after processing
          window.history.replaceState({}, '', '/oil-management')
          
          // First, check if farmer already exists in processed farmers
          const existingFarmer = processedFarmersArray.find(f => f.id === farmerIdFromUrl)
          
          if (existingFarmer) {
            // Farmer exists, select them
            setSelectedFarmer(existingFarmer)
            
            // If session ID is also provided, auto-select it for editing
            if (sessionIdFromUrl) {
              const targetSession = existingFarmer.sessions.find((s: ProcessingSession) => s.id === sessionIdFromUrl)
              if (targetSession && targetSession.processingStatus === 'pending') {
                setEditingSession(targetSession)
                setSessionForm({
                  oilWeight: "",
                  date: new Date().toISOString().split('T')[0], // Auto-fill today's date
                  paymentDate: "",
                })
                showNotification(
                  `Agriculteur ${existingFarmer.name} sélectionné automatiquement. Vous pouvez maintenant traiter sa session.`,
                  "success"
                )
              }
            } else {
              showNotification(
                `Agriculteur ${existingFarmer.name} sélectionné automatiquement.`,
                "success"
              )
            }
          } else {
            // Farmer not found in processed farmers, create new entry
            await handleNewFarmerSession(farmerIdFromUrl, sessionIdFromUrl, processedFarmersArray)
          }
        }
      } else {
        showNotification("Erreur lors du chargement des sessions", "error")
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      showNotification("Erreur de connexion au serveur", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle new farmer with first session
  const handleNewFarmerSession = async (farmerId: string, sessionId: string | null, currentFarmers: ProcessedFarmer[] = []) => {
    try {
      console.log('Creating new farmer entry for:', farmerId, 'with session:', sessionId)
      
      // Get farmer data
      const farmerResponse = await farmersApi.getById(farmerId)
      if (!farmerResponse.success) {
        console.error('Farmer not found:', farmerId)
        showNotification("Agriculteur non trouvé", "error")
        return
      }

      const farmer = farmerResponse.data
      console.log('Found farmer data:', farmer)

      // Get the specific session if provided
      if (sessionId) {
        const sessionResponse = await sessionsApi.getAll({
          farmerId: farmerId,
          limit: 500,
          includeFarmer: true,
          includeBoxes: true
        })

        if (sessionResponse.success) {
          const sessions = sessionResponse.data.items
          const targetSession = sessions.find((s: any) => s.id === sessionId)

          if (targetSession) {
            // Create new ProcessedFarmer entry
              const newProcessedFarmer: ProcessedFarmer = {
                id: farmer.id,
                name: farmer.name,
              phone: farmer.phone || "",
                type: farmer.type,
                pricePerKg: farmer.pricePerKg,
              sessions: [{
                id: targetSession.id,
                date: targetSession.processingDate ? new Date(targetSession.processingDate).toISOString().split('T')[0] : "",
                oilWeight: targetSession.oilWeight || 0,
                totalPrice: targetSession.totalPrice,
                boxCount: targetSession.boxCount,
                boxIds: targetSession.sessionBoxes?.map((sb: any) => sb.boxId) || [],
                boxDetails: targetSession.sessionBoxes?.map((sb: any) => ({
                  id: sb.boxId,
                  type: sb.boxType?.toLowerCase() || 'normal',
                  weight: Number(sb.boxWeight) || 0
                })) || [],
                totalBoxWeight: targetSession.totalBoxWeight,
                processingStatus: (targetSession.oilWeight > 0 || targetSession.processingStatus === 'PROCESSED' || targetSession.processingStatus === 'processed') ? "processed" : "pending",
                paymentStatus: (targetSession.paymentStatus === 'PAID' || targetSession.paymentStatus === 'paid') ? "paid" : "unpaid",
                farmerId: targetSession.farmerId,
                sessionNumber: targetSession.sessionNumber || targetSession.id,
                paymentDate: targetSession.paymentDate ? new Date(targetSession.paymentDate).toISOString().split('T')[0] : undefined,
                createdAt: targetSession.createdAt,
                pricePerKg: targetSession.pricePerKg || farmer.pricePerKg,
              }],
              totalAmountDue: targetSession.totalPrice,
              totalAmountPaid: (targetSession.paymentStatus === 'paid' || targetSession.paymentStatus === 'PAID') ? targetSession.totalPrice : 0,
              paymentStatus: (targetSession.paymentStatus === 'paid' || targetSession.paymentStatus === 'PAID') ? "paid" : "pending",
              lastProcessingDate: targetSession.createdAt,
            }

            // Add to processed farmers list
            const updatedFarmers = [...currentFarmers, newProcessedFarmer]
            setProcessedFarmers(updatedFarmers)
            
            // Auto-select the farmer and session
            setSelectedFarmer(newProcessedFarmer)
            
                         if (newProcessedFarmer.sessions[0].processingStatus === 'pending') {
               setEditingSession(newProcessedFarmer.sessions[0])
               setSessionForm({
                 oilWeight: "",
                 date: new Date().toISOString().split('T')[0], // Auto-fill today's date
                 paymentDate: "",
               })
              showNotification(
                `Nouvel agriculteur ${farmer.name} ajouté et sélectionné. Vous pouvez maintenant traiter sa première session.`,
                "success"
              )
            } else {
              showNotification(
                `Agriculteur ${farmer.name} ajouté et sélectionné automatiquement.`,
                "success"
              )
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling new farmer session:', error)
      showNotification("Erreur lors de la gestion du nouvel agriculteur", "error")
    }
  }

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Load sessions on component mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-select first farmer after farmers are loaded
  useEffect(() => {
    if (processedFarmers.length > 0 && !selectedFarmer) {
      console.log('Auto-selecting first farmer in oil management:', processedFarmers[0].name)
      setSelectedFarmer(processedFarmers[0])
    }
  }, [processedFarmers, selectedFarmer])

  // Reset selected farmer when component mounts (page navigation)
  useEffect(() => {
    setSelectedFarmer(null)
  }, [])

  // Filter farmers based on search (by name or box ID) and payment status
  const filteredFarmers = processedFarmers.filter((farmer) => {
    const term = searchTerm.trim().toLowerCase()
    const isNumericTerm = /^\d+$/.test(term)
    let matchesSearch = true
    if (term) {
      const matchesName = farmer.name.toLowerCase().includes(term)
      let matchesBoxId = false
      const allBoxIds = farmer.sessions.flatMap((s) => s.boxIds || [])
      if (isNumericTerm) {
        matchesBoxId = allBoxIds.some((id) => {
          const idLower = id.toLowerCase()
          if (/^\d+$/.test(idLower)) return idLower === term
          const numericPart = idLower.replace(/\D/g, '')
          return numericPart === term
        })
      } else {
        matchesBoxId = allBoxIds.some((id) => id.toLowerCase().includes(term))
      }
      matchesSearch = matchesName || matchesBoxId
    }
    const matchesPayment = paymentFilter === "all" || farmer.paymentStatus === paymentFilter
    const matchesToday = showTodayOnly ? new Date(farmer.lastProcessingDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0] : true
    return matchesSearch && matchesPayment && matchesToday
  })

  // Auto-select first farmer when today filter is activated
  const handleTodayFilterToggle = () => {
    const newShowTodayOnly = !showTodayOnly
    setShowTodayOnly(newShowTodayOnly)
    
    // If activating today filter, auto-select first today's farmer
    if (newShowTodayOnly) {
      const todaysFarmers = processedFarmers.filter(farmer => 
        farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (paymentFilter === "all" || farmer.paymentStatus === paymentFilter) &&
        new Date(farmer.lastProcessingDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      )
      
      if (todaysFarmers.length > 0) {
        setSelectedFarmer(todaysFarmers[0])
      }
    }
  }

  const showNotification = (message: string, type: "error" | "success" | "warning") => {
    setNotification({ message, type })
  }

  const handleEditSession = (session: ProcessingSession) => {
    setEditingSession(session)
    setSessionForm({
      oilWeight: session.oilWeight > 0 ? session.oilWeight.toString() : "",
      date: session.date || new Date().toISOString().split('T')[0], // Auto-fill today's date if empty
      paymentDate: session.paymentDate || "",
    })
  }

  const handleSaveSession = async () => {
    if (!editingSession || !selectedFarmer) return

    const oilWeight = parseFloat(sessionForm.oilWeight)
    if (isNaN(oilWeight) || oilWeight <= 0) {
      showNotification("Veuillez saisir un poids d'huile valide supérieur à 0", "error")
      return
    }

    if (!sessionForm.date) {
      showNotification("Veuillez saisir une date de traitement", "error")
      return
    }

    // Validate date is not in the future
    const selectedDate = new Date(sessionForm.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (selectedDate > today) {
      showNotification("La date de traitement ne peut pas être dans le futur", "error")
      return
    }

    setSaving(true)
    try {
      // Complete the session with oil weight, processing date, and optional payment date
      const completeResponse = await sessionsApi.complete(editingSession.id, {
        oilWeight: oilWeight,
        processingDate: sessionForm.date,
        paymentDate: sessionForm.paymentDate || undefined
      })

      if (!completeResponse.success) {
        showNotification(completeResponse.error || "Erreur lors de la mise à jour", "error")
        return
      }

      // Immediately update the session in the UI to show changes
      const updatedSession = {
      ...editingSession,
        oilWeight: oilWeight,
      date: sessionForm.date,
        processingStatus: "processed" as const,
        paymentStatus: sessionForm.paymentDate ? "paid" as const : "unpaid" as const,
        paymentDate: sessionForm.paymentDate || undefined,
      }

      // Update the selected farmer's sessions immediately
      setSelectedFarmer(prevFarmer => {
        if (!prevFarmer) return prevFarmer
        const updatedSessions = prevFarmer.sessions.map(s => 
          s.id === editingSession.id ? updatedSession : s
        )
        
        // Recalculate totals
        const totalAmountPaid = updatedSessions
          .filter(s => s.paymentStatus === 'paid')
          .reduce((sum, s) => sum + s.totalPrice, 0)
        
        return {
          ...prevFarmer,
          sessions: updatedSessions,
          totalAmountPaid,
          paymentStatus: totalAmountPaid >= prevFarmer.totalAmountDue ? "paid" : "pending"
        }
      })

      // Update the processed farmers list immediately
      setProcessedFarmers(prevFarmers => 
        prevFarmers.map(farmer => {
          if (farmer.id === selectedFarmer.id) {
            const updatedSessions = farmer.sessions.map(s => 
              s.id === editingSession.id ? updatedSession : s
            )
            
            const totalAmountPaid = updatedSessions
              .filter(s => s.paymentStatus === 'paid')
              .reduce((sum, s) => sum + s.totalPrice, 0)
            
            return {
              ...farmer,
              sessions: updatedSessions,
              totalAmountPaid,
              paymentStatus: totalAmountPaid >= farmer.totalAmountDue ? "paid" : "pending"
            }
          }
          return farmer
        })
    )

      // Clear form and close modal
    setEditingSession(null)
      setSessionForm({ oilWeight: "", date: "", paymentDate: "" })
      
      const successMessage = sessionForm.paymentDate 
        ? "Session mise à jour et marquée comme payée!"
        : "Session traitée avec succès!"
      showNotification(successMessage, "success")

      // Reload sessions in background to ensure data consistency
      setTimeout(() => {
        loadSessions()
      }, 1000)
      
    } catch (error) {
      console.error('Error updating session:', error)
      showNotification("Erreur de connexion au serveur", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAsPaid = async (sessionId: string) => {
    if (!selectedFarmer) return

    setSaving(true)
    try {
      const response = await sessionsApi.updatePayment(sessionId, {
        status: 'paid'
      })

      if (response.success) {
        // Immediately update the UI
        const currentDate = new Date().toISOString().split('T')[0]
        
        // Update selected farmer's sessions
        setSelectedFarmer(prevFarmer => {
          if (!prevFarmer) return prevFarmer
          const updatedSessions = prevFarmer.sessions.map(s => 
            s.id === sessionId ? { ...s, paymentStatus: "paid" as const, paymentDate: currentDate } : s
          )
          
          const totalAmountPaid = updatedSessions
            .filter(s => s.paymentStatus === 'paid')
            .reduce((sum, s) => sum + s.totalPrice, 0)
          
          return {
            ...prevFarmer,
            sessions: updatedSessions,
            totalAmountPaid,
            paymentStatus: totalAmountPaid >= prevFarmer.totalAmountDue ? "paid" : "pending"
          }
        })

        // Update processed farmers list
        setProcessedFarmers(prevFarmers => 
          prevFarmers.map(farmer => {
            if (farmer.id === selectedFarmer.id) {
              const updatedSessions = farmer.sessions.map(s => 
                s.id === sessionId ? { ...s, paymentStatus: "paid" as const, paymentDate: currentDate } : s
              )
              
              const totalAmountPaid = updatedSessions
                .filter(s => s.paymentStatus === 'paid')
                .reduce((sum, s) => sum + s.totalPrice, 0)
              
              return {
              ...farmer,
                sessions: updatedSessions,
                totalAmountPaid,
                paymentStatus: totalAmountPaid >= farmer.totalAmountDue ? "paid" : "pending"
              }
            }
            return farmer
          })
    )

    setShowPaymentConfirm(null)
        showNotification("Paiement marqué comme effectué!", "success")

        // Reload sessions in background to ensure consistency
        setTimeout(() => {
          loadSessions()
        }, 1000)
      } else {
        showNotification(response.error || "Erreur lors de la mise à jour du paiement", "error")
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      showNotification("Erreur de connexion au serveur", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFarmer = (farmerId: string) => {
    // For now, just clear the farmer from local state
    // In a real implementation, you'd delete all their sessions
    setProcessedFarmers(prev => prev.filter(f => f.id !== farmerId))
    setShowDeleteFarmerConfirm(null)
    showNotification("Agriculteur supprimé", "success")
  }

  const handleDeleteSession = async (sessionId: string) => {
    setSaving(true)
    try {
      const response = await sessionsApi.delete(sessionId)

      if (response.success) {
        // Reload sessions to get fresh data
        await loadSessions()

    setShowDeleteSessionConfirm(null)
    showNotification("Session supprimée avec succès!", "success")
      } else {
        showNotification(response.error || "Erreur lors de la suppression", "error")
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      showNotification("Erreur de connexion au serveur", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleRebuild = async (farmerId: string) => {
    try {
      console.log('=== REBUILD DEBUG START ===')
      console.log('Rebuilding farmer with ID:', farmerId)
      console.log('Current processed farmers:', processedFarmers.map(f => ({ id: f.id, name: f.name })))
      
      // Validate the farmer ID format
      if (!farmerId || typeof farmerId !== 'string') {
        console.error('Invalid farmer ID provided:', farmerId)
        showNotification("ID d'agriculteur invalide", "error")
        return
      }
      
      // First check if farmer still exists
      console.log('Calling farmersApi.getById with:', farmerId)
      const response = await farmersApi.getById(farmerId)
      
      console.log('Farmer API response:', response)
      
      if (response.success && response.data) {
        console.log('Farmer found:', response.data)
        
        // Farmer exists, redirect to olive management with farmer selected
        localStorage.setItem("rebuildFarmerId", farmerId)
        localStorage.setItem("rebuildFarmerName", response.data.name)
        
        console.log('Stored in localStorage:', {
          rebuildFarmerId: localStorage.getItem("rebuildFarmerId"),
          rebuildFarmerName: localStorage.getItem("rebuildFarmerName")
        })
        
        console.log('Redirecting to olive management for farmer:', response.data.name)
        showNotification(`Redirection vers la gestion des olives pour ${response.data.name}`, "success")
        
        // Use a small delay to ensure notification is shown before redirect
        setTimeout(() => {
          console.log('Executing redirect to /olive-management')
          router.push('/olive-management')
        }, 500)
      } else {
        // Farmer doesn't exist anymore
        console.error('Farmer not found in API response:', response)
        
        // Check if the farmer exists in our current processed farmers list as a fallback
        const localFarmer = processedFarmers.find(f => f.id === farmerId)
        if (localFarmer) {
          console.log('Found farmer in local processed farmers list:', localFarmer.name)
          localStorage.setItem("rebuildFarmerId", farmerId)
          localStorage.setItem("rebuildFarmerName", localFarmer.name)
          
          showNotification(`Redirection vers la gestion des olives pour ${localFarmer.name} (mode hors ligne)`, "warning")
          
          setTimeout(() => {
            console.log('Executing fallback redirect to /olive-management')
            router.push('/olive-management')
          }, 500)
        } else {
          showNotification("Cet agriculteur a été supprimé. Vous devez le créer à nouveau.", "error")
        }
      }
      console.log('=== REBUILD DEBUG END ===')
    } catch (error) {
      console.error('=== REBUILD ERROR ===')
      console.error('Error checking farmer:', error)
      console.error('Farmer ID that failed:', farmerId)
      console.error('Error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      })
      showNotification("Erreur lors de la vérification de l'agriculteur", "error")
    }
  }

  const handlePrintReceipt = (session: ProcessingSession) => {
    setPrintingSession(session)
  }

  const getSessionStatusBadge = (session: ProcessingSession) => {
    // Check if session has oil weight (indicates processing)
    const isProcessed = session.oilWeight > 0 || session.processingStatus === "processed"
    
    if (!isProcessed) {
      return (
        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
          En attente
        </Badge>
      )
    }
    
    // Session is processed, now check payment status
    if (session.paymentStatus === "paid") {
    return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
          Traité et payé
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-800 bg-yellow-50">
          Traité non payé
      </Badge>
    )
    }
  }

  const getSessionBorderClass = (session: ProcessingSession) => {
    // Check if session has oil weight (indicates processing)
    const isProcessed = session.oilWeight > 0 || session.processingStatus === "processed"
    
    if (!isProcessed) {
      return "border-orange-200 bg-orange-50"
    }
    
    // Session is processed, now check payment status
    if (session.paymentStatus === "paid") {
      return "border-green-200 bg-green-50"
    } else {
      return "border-yellow-200 bg-yellow-50"
    }
  }

  const PrintInvoice = ({ session, farmer }: { session: ProcessingSession; farmer: ProcessedFarmer }) => (
    <div className="print-invoice">
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
          
          .print-invoice, .print-invoice * {
            visibility: visible;
          }
          
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
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
          
          .print-table {
            font-size: 10px !important;
            border-collapse: collapse !important;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #333 !important;
            padding: 6px 4px !important;
            text-align: center !important;
          }
          
          .print-table th {
            background-color: #6B8E4B !important;
            color: white !important;
            font-weight: bold !important;
          }
          
          .print-header {
            font-size: 14px !important;
            margin-bottom: 15px !important;
          }
          
          .company-name {
            font-size: 22px !important;
            font-weight: bold !important;
            color: #2C3E50 !important;
          }
          
          .invoice-title {
            font-size: 18px !important;
            font-weight: bold !important;
            color: #2C3E50 !important;
          }
          
          .total-section {
            background-color: #F4D03F !important;
            padding: 8px !important;
            border-radius: 3px !important;
            font-weight: bold !important;
          }
          
          .section-spacing {
            margin-bottom: 12px !important;
          }
        }
        
        .print-invoice {
          background: white;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          color: #000;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #333;
          padding: 8px 6px;
          text-align: center;
        }
        
        .print-table th {
          background-color: #6B8E4B;
          color: white;
          font-weight: bold;
        }
        
        .print-table .description-cell {
          text-align: left !important;
        }
        `
      }} />

      {/* Header */}
      <div className="border-b-2 border-[#6B8E4B] pb-3 mb-4 print-header section-spacing">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="company-name text-2xl font-bold text-[#2C3E50] mb-2">HUILERIE MASMOUDI</h1>
            <div className="text-sm text-gray-700">
              <p><strong>Adresse:</strong> Tunis, Mahdia</p>
              <p><strong>Téléphone:</strong> 27408877</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="invoice-title text-xl font-bold text-[#2C3E50] mb-2">FACTURE</h2>
            <div className="bg-[#F4D03F] px-4 py-2 rounded border">
              <p className="font-semibold">N° {session.sessionNumber}</p>
              <p className="text-sm">Date: {session.date || new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-2 gap-6 mb-4 section-spacing">
        <div>
          <h3 className="text-base font-semibold text-[#2C3E50] mb-2 border-b border-gray-300 pb-1">Facturé à:</h3>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="font-semibold text-lg">{farmer.name.split(' ')[0]}</p>
            {farmer.phone && <p className="text-gray-600">{farmer.phone}</p>}
            <p className="text-sm text-gray-600 mt-2">
              <strong>Tarif:</strong> {session.pricePerKg.toFixed(2)} DT/kg
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#2C3E50] mb-2 border-b border-gray-300 pb-1">Détails de la session:</h3>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="mb-1">
              <strong>Session:</strong> {session.sessionNumber}
            </p>
            <p className="mb-1">
              <strong>Date de traitement:</strong> {session.date || "Non spécifiée"}
            </p>
            <p className="mb-1">
              <strong>Statut paiement:</strong>{" "}
              <span className={session.paymentStatus === "paid" ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                {session.paymentStatus === "paid" ? "✓ Payé" : "En attente"}
              </span>
            </p>
            {session.paymentDate && (
              <p className="text-sm text-gray-600">
                <strong>Date de paiement:</strong> {new Date(session.paymentDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Box Details */}
      <div className="mb-4 section-spacing">
        <h3 className="text-base font-semibold text-[#2C3E50] mb-2 border-b border-gray-300 pb-1">Boîtes traitées</h3>
        <div className="border border-gray-300 p-3 bg-gray-50 rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-gray-700 mb-2">
                IDs des boîtes ({session.boxCount} boîte{session.boxCount > 1 ? 's' : ''}):
              </p>
              <div className="flex flex-wrap gap-1">
                {session.boxIds && session.boxIds.length > 0 ? (
                  session.boxIds.map((boxId, index) => (
                    <span key={index} className="inline-block bg-blue-100 border border-blue-300 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {boxId}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">Aucune boîte enregistrée</span>
                )}
              </div>
            </div>
            
            {session.boxDetails && session.boxDetails.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Détail des poids:</p>
                <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
                  {session.boxDetails.map((box, index) => (
                    <div key={index} className="flex justify-between bg-white px-2 py-1 rounded border">
                      <span><strong>{box.id}</strong> ({box.type}):</span>
                      <span className="font-semibold">{box.weight} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="mb-4 section-spacing">
        <h3 className="text-base font-semibold text-[#2C3E50] mb-2 border-b border-gray-300 pb-1">Détails du service</h3>
        <table className="print-table w-full">
          <thead>
            <tr>
              <th className="description-cell">Description</th>
              <th>Quantité<br/>(boîtes)</th>
              <th>Poids total<br/>(kg)</th>
              <th>Prix unitaire<br/>(DT/kg)</th>
              <th>Total<br/>(DT)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="description-cell">
                <div className="text-left">
                  <p className="font-semibold">Extraction d'huile d'olive</p>
                  <p className="text-xs text-gray-600">Session: {session.sessionNumber}</p>
                  {session.oilWeight > 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Huile extraite: {session.oilWeight} kg
                    </p>
                  )}
                  {session.date && (
                    <p className="text-xs text-gray-600">Date: {session.date}</p>
                  )}
                </div>
              </td>
              <td className="font-semibold">{session.boxCount}</td>
              <td className="font-semibold">{session.totalBoxWeight.toFixed(1)}</td>
              <td className="font-semibold">{session.pricePerKg.toFixed(2)}</td>
              <td className="font-bold text-lg">{session.totalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mb-4 section-spacing">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="border border-gray-300 rounded">
              <div className="bg-gray-100 p-2 border-b border-gray-300">
                <div className="flex justify-between">
                  <span className="font-medium">Sous-total:</span>
                  <span className="font-semibold">{session.totalPrice.toFixed(2)} DT</span>
                </div>
              </div>
              <div className="total-section bg-[#F4D03F] p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL À PAYER:</span>
                  <span className="text-xl font-bold text-[#2C3E50]">{session.totalPrice.toFixed(2)} DT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Summary - Only if oil weight exists */}
      {session.oilWeight > 0 && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded p-3 section-spacing">
          <h4 className="font-semibold text-green-800 mb-2">Résumé du traitement</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Poids olives:</p>
              <p className="font-semibold">{session.totalBoxWeight.toFixed(1)} kg</p>
            </div>
            <div>
              <p className="text-gray-600">Huile extraite:</p>
              <p className="font-semibold text-green-700">{session.oilWeight.toFixed(1)} kg</p>
            </div>
            <div>
              <p className="text-gray-600">Rendement:</p>
              <p className="font-semibold">{((session.oilWeight / session.totalBoxWeight) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-[#6B8E4B] pt-3 text-center">
        <p className="text-sm text-gray-600 mb-1">
          <strong>Merci pour votre confiance!</strong>
        </p>
        <p className="text-xs text-gray-500 mb-1">
          Cette facture est générée électroniquement et ne nécessite pas de signature.
        </p>
        <p className="text-sm font-semibold text-[#2C3E50]">
          HUILERIE MASMOUDI - Votre partenaire pour une huile d'olive de qualité
        </p>
        <div className="mt-2 text-xs text-gray-400">
          <p>Facture générée le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </div>
    </div>
  )

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
              {user?.role || 'Gestionnaire d\'usine'}
            </Badge>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : 'AM'}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center space-x-2">
          <Link
            href="/olive-management"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Olives</span>
          </Link>
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#6B8E4B] text-white">
            <Archive className="w-4 h-4" />
            <span className="text-sm font-medium">Huile</span>
          </div>
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
              className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Gestion des olives</span>
            </Link>
            <Link
              href="/oil-management"
              className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg"
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
                  className="flex items-center space-x-3 px-3 py-2 text-[#2C3E50] hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  <span>Gestion des olives</span>
                </Link>
                <Link
                  href="/oil-management"
                  className="flex items-center space-x-3 px-3 py-2 bg-[#6B8E4B] text-white rounded-lg"
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
                variant={mobileView === "sessions" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("sessions")}
                disabled={!selectedFarmer}
                className={mobileView === "sessions" ? "bg-[#6B8E4B] text-white" : ""}
              >
                <FileText className="w-4 h-4 mr-2" />
                Sessions {selectedFarmer && `(${selectedFarmer.sessions.length})`}
              </Button>
              {selectedFarmer && mobileView === "sessions" && (
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

          {/* Left Panel - Processed Farmers */}
          <div className={`${mobileView === "farmers" ? "block" : "hidden"} md:block w-full md:w-1/3 p-4 md:p-6 border-r border-gray-200 overflow-y-auto`}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-[#2C3E50]">Agriculteurs traités</h2>
                  <Button
                    size="sm"
                    variant={showTodayOnly ? "default" : "outline"}
                    onClick={handleTodayFilterToggle}
                    className={`transition-all ${
                      showTodayOnly 
                        ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                        : "border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                    }`}
                    title={showTodayOnly ? "Afficher tous les agriculteurs" : "Afficher uniquement les agriculteurs traités aujourd'hui"}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Aujourd'hui
                    {showTodayOnly && (
                      <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                        {filteredFarmers.length}
                      </span>
                    )}
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
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
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
                  <Archive className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucun agriculteur traité trouvé</p>
                  <p className="text-sm">Les sessions de traitement apparaîtront ici</p>
                </div>
              ) : (
                filteredFarmers.map((farmer) => (
                <Card
                  key={farmer.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFarmer?.id === farmer.id ? "ring-2 ring-[#6B8E4B] bg-[#6B8E4B]/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedFarmer(farmer)
                    // On mobile, switch to sessions view when farmer is selected
                    if (window.innerWidth < 768) { // md breakpoint
                      setMobileView("sessions")
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#6B8E4B] rounded-full flex items-center justify-center">
                        {farmer.paymentStatus === "paid" ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white font-medium text-sm">
                            {farmer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#2C3E50]">{farmer.name}</h3>
                        <p className="text-sm text-gray-600">{farmer.sessions.length} sessions</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-medium text-[#2C3E50]">
                            {farmer.totalAmountDue.toFixed(2)} DT
                          </span>
                          <Badge variant={farmer.paymentStatus === "paid" ? "default" : "destructive"}>
                            {farmer.paymentStatus === "paid" ? "Payé" : "En attente"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteFarmerConfirm(farmer.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Oil Processing Details */}
          <div className={`${mobileView === "sessions" ? "block" : "hidden"} md:block flex-1 p-4 md:p-6 overflow-y-auto`}>
            {selectedFarmer ? (
              <div className="space-y-6">
                {/* Farmer Info */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-[#2C3E50]">Informations de l'agriculteur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nom</p>
                        <p className="font-semibold">{selectedFarmer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold">{selectedFarmer.phone || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold">
                          {selectedFarmer.type === "large" ? "Grand agriculteur" : "Petit agriculteur"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Prix par kg</p>
                        <p className="font-semibold">{selectedFarmer.pricePerKg} DT</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Processing History */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
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
                          <CardTitle className="text-[#2C3E50]">Sessions de traitement</CardTitle>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRebuild(selectedFarmer.id)}
                          className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Reconstruire</span>
                          <span className="sm:hidden">Reconstruire</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Farmer Statistics Component */}
                  <CardContent className="p-6 border-b">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center mb-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total des sessions</p>
                        <p className="text-2xl font-bold text-[#2C3E50]">{selectedFarmer.sessions.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total dû</p>
                        <p className="text-2xl font-bold text-[#2C3E50]">
                          {selectedFarmer.totalAmountDue.toFixed(2)} DT
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total payé</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedFarmer.totalAmountPaid.toFixed(2)} DT
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Indicators */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-green-800 mb-1">Traité et payé</div>
                        <div className="text-lg font-bold text-green-600">
                          {selectedFarmer.sessions.filter(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "paid").length}
                        </div>
                        <div className="text-xs text-green-600">Sessions complètes</div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-yellow-800 mb-1">Traité non payé</div>
                        <div className="text-lg font-bold text-yellow-600">
                          {selectedFarmer.sessions.filter(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "unpaid").length}
                        </div>
                        <div className="text-xs text-yellow-600">En attente de paiement</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-orange-800 mb-1">En attente</div>
                        <div className="text-lg font-bold text-orange-600">
                          {selectedFarmer.sessions.filter(s => s.oilWeight === 0 && s.processingStatus !== "processed").length}
                        </div>
                        <div className="text-xs text-orange-600">À traiter</div>
                      </div>
                    </div>
                  </CardContent>

                  <CardContent>
                    <div className="space-y-4">
                      {selectedFarmer.sessions.map((session) => (
                        <Card
                          key={session.id}
                          className={`${session.paymentStatus !== "paid" ? "cursor-pointer" : "cursor-default"} transition-all hover:shadow-md ${getSessionBorderClass(session)}`}
                          onClick={() => session.paymentStatus !== "paid" && handleEditSession(session)}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-semibold text-[#2C3E50]">Session {session.sessionNumber}</h4>
                                {getSessionStatusBadge(session)}
                              </div>
                              <div className="flex items-center space-x-2">
                                {session.paymentStatus !== "paid" && (
                                  <div className="text-sm text-blue-600 font-medium hidden sm:block">
                                    <Edit className="w-3 h-3 inline mr-1" />
                                    Cliquer pour modifier
                                  </div>
                                )}
                                {session.paymentStatus !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDeleteSessionConfirm(session.id)
                                  }}
                                  className="flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Nombre de boîtes</p>
                                <p className="font-semibold">{session.boxCount} boîtes</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Poids total des boîtes</p>
                                <p className="font-semibold">{session.totalBoxWeight} kg</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Poids d'huile</p>
                                <p className="font-semibold">
                                  {session.oilWeight > 0 ? `${session.oilWeight} kg` : "Non saisi"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Date de traitement</p>
                                <p className="font-semibold">{session.date || "Non saisie"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Date de paiement</p>
                                <p className="font-semibold">
                                  {session.paymentDate ? new Date(session.paymentDate).toLocaleDateString('fr-FR') : "Non payé"}
                                </p>
                            </div>
                              <div>
                              <p className="text-sm text-gray-600">Boîtes traitées</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                  {session.boxDetails && session.boxDetails.length > 0 ? (
                                    session.boxDetails.map((box, index) => (
                                      <div key={index} className="group relative">
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs cursor-help ${
                                            box.type === 'nchira' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                              box.type === 'chkara' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                              'bg-green-50 border-green-200 text-green-700'
                                          }`}
                                        >
                                          {box.id}
                                        </Badge>
                                        {/* Tooltip with detailed info */}
                                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                                          {box.type.charAt(0).toUpperCase() + box.type.slice(1)} - {box.weight}kg
                                        </div>
                                      </div>
                                    ))
                                  ) : session.boxIds && session.boxIds.length > 0 ? (
                                    // Fallback to basic box IDs if detailed info is not available
                                    session.boxIds.map((boxId, index) => (
                                      <Badge key={index} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                    {boxId}
                                  </Badge>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      <span>Aucune boîte trouvée</span>
                                      <button 
                                        onClick={() => console.log('Debug session:', session)}
                                        className="ml-2 text-xs underline text-blue-500"
                                      >
                                        Debug
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {session.boxDetails && session.boxDetails.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Total: {session.boxDetails.reduce((sum, box) => sum + box.weight, 0).toFixed(1)}kg
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-lg font-bold text-[#2C3E50]">
                                  Total: {session.totalPrice.toFixed(2)} DT
                                </p>
                              </div>
                              {(session.processingStatus === "processed" || session.oilWeight > 0) && (
                                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handlePrintReceipt(session)
                                    }}
                                    className="border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B] hover:text-white flex-1 sm:flex-none"
                                  >
                                    <Printer className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Imprimer</span>
                                    <span className="sm:hidden">Imprimer</span>
                                  </Button>
                                  {session.paymentStatus === "unpaid" && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowPaymentConfirm(session.id)
                                      }}
                                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      <span className="hidden sm:inline">Marquer comme payé</span>
                                      <span className="sm:hidden">Payé</span>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Sélectionnez un agriculteur</h3>
                  <p>Choisissez un agriculteur dans la liste pour voir ses sessions de traitement</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSession.oilWeight > 0 ? "Modifier les détails de traitement" : "Saisir les détails de traitement"}
              </h3>
              {editingSession.oilWeight > 0 && (
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                  Déjà traité
                </Badge>
              )}
                      </div>

            {/* Session Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                  <p className="font-medium text-gray-700">Session: {editingSession.sessionNumber}</p>
                  <p className="text-gray-600">Créée le: {new Date(editingSession.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                  <p className="font-medium text-gray-700">Boîtes traitées: {editingSession.boxCount}</p>
                  <p className="text-gray-600">Poids total: {editingSession.totalBoxWeight} kg</p>
                      </div>
                    </div>
              {editingSession.boxIds && editingSession.boxIds.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700 mb-2">Boîtes traitées:</p>
                  <div className="flex flex-wrap gap-1">
                    {editingSession.boxDetails && editingSession.boxDetails.length > 0 ? (
                      editingSession.boxDetails.map((box, index) => (
                        <div key={index} className="group relative">
                          <Badge 
                            variant="outline" 
                            className={`text-xs cursor-help ${
                              box.type === 'nchira' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                              box.type === 'chkara' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                              'bg-green-50 border-green-200 text-green-700'
                            }`}
                          >
                            {box.id}
                          </Badge>
                          {/* Tooltip with detailed info */}
                          <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                            {box.type.charAt(0).toUpperCase() + box.type.slice(1)} - {box.weight}kg
              </div>
                        </div>
                      ))
                    ) : (
                      // Fallback to basic box IDs
                      editingSession.boxIds.map((boxId, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                          {boxId}
                        </Badge>
                      ))
                    )}
                </div>
                  {editingSession.boxDetails && editingSession.boxDetails.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong className="text-gray-700">Détails:</strong> {editingSession.boxDetails.map(box => 
                        `${box.id} (${box.type}, ${box.weight}kg)`
                      ).join(', ')}
              </div>
            )}
          </div>
              )}
      </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="oilWeight" className="text-gray-700">
                  Poids d'huile extraite (kg) *
                  {editingSession.oilWeight > 0 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Précédent: {editingSession.oilWeight} kg)
                    </span>
                  )}
                </Label>
                <Input
                  id="oilWeight"
                  type="number"
                  step="0.1"
                  value={sessionForm.oilWeight}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, oilWeight: e.target.value }))}
                  placeholder={editingSession.oilWeight > 0 ? `Modifier: ${editingSession.oilWeight}` : "Ex: 12.5"}
                  className="bg-white text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="date" className="text-gray-700">Date de traitement *</Label>
                <Input
                  id="date"
                  type="date"
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-white text-gray-900"
                  title="Date de traitement de la session"
                />
              </div>
              <div>
                <Label htmlFor="paymentDate" className="text-gray-700">Date de paiement (optionnel)</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={sessionForm.paymentDate}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  placeholder="Laisser vide si non payé"
                  className="bg-white text-gray-900"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                <Button
                  onClick={handleSaveSession}
                  disabled={saving}
                  className="bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white flex-1 sm:flex-none"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                  <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button variant="outline" onClick={() => setEditingSession(null)} disabled={saving} className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none">
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md text-gray-900 mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirmer le paiement</h3>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir marquer cette session comme payée ?</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                <Button
                  onClick={() => handleMarkAsPaid(showPaymentConfirm)}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
                >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Traitement...' : 'Confirmer'}
                </Button>
              <Button variant="outline" onClick={() => setShowPaymentConfirm(null)} disabled={saving} className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Annuler
                </Button>
              </div>
          </div>
        </div>
      )}

      {/* Delete Farmer Confirmation Modal */}
      {showDeleteFarmerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md text-gray-900 mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Supprimer l'agriculteur</h3>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cet agriculteur et toutes ses sessions ?</p>
              <div className="flex space-x-2">
              <Button onClick={() => handleDeleteFarmer(showDeleteFarmerConfirm)} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
                </Button>
              <Button variant="outline" onClick={() => setShowDeleteFarmerConfirm(null)} className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Annuler
                </Button>
              </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteSessionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md text-gray-900 mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Supprimer la session</h3>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette session de traitement ?</p>
              <div className="flex space-x-2">
                <Button
                onClick={() => handleDeleteSession(showDeleteSessionConfirm!)}
                disabled={saving}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Suppression...' : 'Supprimer'}
                </Button>
              <Button variant="outline" onClick={() => setShowDeleteSessionConfirm(null)} disabled={saving} className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Annuler
                </Button>
              </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printingSession && selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print">
              <h3 className="text-lg font-semibold">Aperçu de la facture</h3>
              <div className="flex space-x-2">
                <Button
                  onClick={() => window.print()}
                  className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
                <Button variant="outline" onClick={() => setPrintingSession(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Fermer
                </Button>
              </div>
            </div>
            <PrintInvoice session={printingSession} farmer={selectedFarmer} />
          </div>
        </div>
      )}
    </div>
  )
}
