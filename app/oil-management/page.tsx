"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  Eye,
  Download,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { sessionsApi, farmersApi } from "@/lib/api"
import { logout, getCurrentUser } from '@/lib/auth-client'
import { formatFarmerDisplayName, formatFarmerInvoiceName } from '@/lib/utils'

interface ProcessedFarmer {
  id: string
  name: string
  nickname?: string
  phone: string
  type: "small" | "large"
  pricePerKg: number
  sessions: ProcessingSession[]
  totalAmountDue: number
  totalAmountPaid: number
  paymentStatus: "paid" | "pending" // Simplified: removed "partial"
  lastProcessingDate: string
}

interface ProcessingSession {
  id: string
  date: string
  oilWeight: number
  totalPrice: number | null  // Can be null until price is set during payment
  boxCount: number
  boxIds: string[]
  boxDetails?: Array<{
    id: string
    type: string
    weight: number
  }>
  totalBoxWeight: number
  processingStatus: "pending" | "processed"
  paymentStatus: "unpaid" | "paid" | "partial"
  farmerId: string
  sessionNumber: string
  paymentDate?: string
  createdAt: string
  pricePerKg: number | null  // Can be null until set during payment
  amountPaid?: number        // Track partial payments
  remainingAmount?: number   // Track remaining balance
  notes?: string             // Session notes
}

export default function OilManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFarmer, setSelectedFarmer] = useState<ProcessedFarmer | null>(null)
  const [editingSession, setEditingSession] = useState<ProcessingSession | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending_oil" | "pending_payment">("all")
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    oilWeight: "",
    date: "",
    paymentDate: "",
    notes: "",
  })
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(
    null,
  )
  const [showDeleteFarmerConfirm, setShowDeleteFarmerConfirm] = useState<string | null>(null)
  const [showDeleteSessionConfirm, setShowDeleteSessionConfirm] = useState<string | null>(null)
  const [printingSession, setPrintingSession] = useState<ProcessingSession | null>(null)
  const [printingAllSessions, setPrintingAllSessions] = useState<ProcessedFarmer | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [isBulkPaymentDialogOpen, setIsBulkPaymentDialogOpen] = useState(false)
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    pricePerKg: "",
    paymentDate: new Date().toISOString().split('T')[0],
    amountPaid: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"farmers" | "sessions">("farmers")

  // New payment modal states
  const [paymentSession, setPaymentSession] = useState<ProcessingSession | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    pricePerKg: "",
    isFullPayment: true,
    customAmount: "",
    paymentMethod: "",
    notes: ""
  })
  const [calculatedTotal, setCalculatedTotal] = useState(0)

  // Session details modal states
  const [sessionDetailsModal, setSessionDetailsModal] = useState<ProcessingSession | null>(null)
  const [sessionPaymentHistory, setSessionPaymentHistory] = useState<any[]>([])
  const [loadingSessionDetails, setLoadingSessionDetails] = useState(false)

  const [processedFarmers, setProcessedFarmers] = useState<ProcessedFarmer[]>([])

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    
    // Load sessions on component mount
    loadSessions()
  }, [])

  // Clear selected sessions when farmer changes
  useEffect(() => {
    setSelectedSessions(new Set())
  }, [selectedFarmer?.id])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      // Fallback redirect
      window.location.href = '/login'
    }
  }

  // Handle Excel export download
  const handleDownloadCSV = async () => {
    try {
      showNotification("Génération de l'export Excel en cours...", "success")
      
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
      
      showNotification("Export Excel téléchargé avec succès!", "success")
    } catch (error) {
      console.error('Error downloading Excel:', error)
      showNotification("Erreur lors du téléchargement de l'export", "error")
    }
  }

  // Load sessions and group by farmers
  const loadSessions = async () => {
    try {
      setLoading(true)
      
      // Get all sessions with farmer data
      const response = await sessionsApi.getAll({
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeFarmer: true,
        includeBoxes: true
      })

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
              nickname: session.farmer?.nickname || null,
              phone: session.farmer?.phone || "",
              type: session.farmer?.type || "small",
              pricePerKg: 0, // Not used anymore - pricing is per-session
              sessions: [],
              totalAmountDue: 0,
      totalAmountPaid: 0,
              paymentStatus: "pending" as const,
              lastProcessingDate: ""
            }
          }

          const transformedSession: ProcessingSession = {
            id: session.id,
            date: session.processingDate ? new Date(session.processingDate).toISOString().split('T')[0] : "",
            oilWeight: Number(session.oilWeight) || 0,
            totalPrice: session.totalPrice ? Number(session.totalPrice) : null,
            boxCount: session.boxCount,
            boxIds: session.sessionBoxes?.map((sb: any) => sb.boxId) || [],
            boxDetails: session.sessionBoxes?.map((sb: any) => ({
              id: sb.boxId,
              type: sb.boxType?.toLowerCase() || 'normal',
              weight: Number(sb.boxWeight) || 0
            })) || [],
            totalBoxWeight: Number(session.totalBoxWeight),
            processingStatus: (Number(session.oilWeight) > 0 || session.processingStatus === 'PROCESSED' || session.processingStatus === 'processed') ? "processed" : "pending",
            paymentStatus: session.paymentStatus === 'PAID' || session.paymentStatus === 'paid' ? "paid" : 
                          session.paymentStatus === 'PARTIAL' || session.paymentStatus === 'partial' ? "partial" : "unpaid",
            farmerId: session.farmerId,
            sessionNumber: session.sessionNumber || session.id,
            paymentDate: session.paymentDate ? new Date(session.paymentDate).toISOString().split('T')[0] : undefined,
            createdAt: session.createdAt,
            pricePerKg: session.pricePerKg ? Number(session.pricePerKg) : null,
            amountPaid: Number(session.amountPaid || 0),
            remainingAmount: Number(session.remainingAmount || 0),
            notes: session.notes || undefined,
          }

          acc[farmerId].sessions.push(transformedSession)
          // Only add to totals if session has a price set
          if (session.totalPrice) {
            acc[farmerId].totalAmountDue += Number(session.totalPrice)
          }
          // Add amountPaid for any session that has payment status (paid or partial)
          if (session.paymentStatus === 'paid' || session.paymentStatus === 'PAID' || 
              session.paymentStatus === 'partial' || session.paymentStatus === 'PARTIAL') {
            const amountToAdd = Number(session.amountPaid || 0)
            acc[farmerId].totalAmountPaid += amountToAdd
          }
          acc[farmerId].lastProcessingDate = session.createdAt

          return acc
        }, {})

        // Convert to array and calculate payment status
        const processedFarmersArray = Object.values(groupedByFarmer).map((farmer: any) => {
          // SIMPLIFIED FARMER STATUS LOGIC (matching backend):
          // Check if ANY session is not fully paid
          const hasUnpaidSessions = farmer.sessions.some((s: ProcessingSession) => {
            // Session is considered unpaid if:
            // 1. No price set yet (new session) - totalPrice is null
            // 2. Payment status is not 'paid'
            // 3. Has remaining amount > 0
            return (
              s.totalPrice === null || 
              s.paymentStatus !== 'paid' || 
              (s.remainingAmount || 0) > 0
            )
          })
          
          // Simple status logic: 'pending' if ANY session is unpaid, 'paid' if ALL are paid
          const farmerPaymentStatus = hasUnpaidSessions ? 'pending' : 'paid'
          
          console.log('👨‍🌾 Frontend Farmer Status Calculation:', {
            farmerName: farmer.name,
            totalSessions: farmer.sessions.length,
            hasUnpaidSessions,
            totalAmountDue: farmer.totalAmountDue,
            totalAmountPaid: farmer.totalAmountPaid,
            calculatedStatus: farmerPaymentStatus,
            sessionStatuses: farmer.sessions.map((s: ProcessingSession) => ({
              id: s.sessionNumber,
              totalPrice: s.totalPrice,
              paymentStatus: s.paymentStatus,
              remainingAmount: s.remainingAmount,
              isUnpaid: (
                s.totalPrice === null || 
                s.paymentStatus !== 'paid' || 
                (s.remainingAmount || 0) > 0
              )
            }))
          })
          
          return {
          ...farmer,
            paymentStatus: farmerPaymentStatus,
          sessions: farmer.sessions.sort((a: ProcessingSession, b: ProcessingSession) => 
            new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
          )
          }
        })

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

        // Return the processed farmers array for immediate use in other functions
        return processedFarmersArray
      } else {
        showNotification("Erreur lors du chargement des sessions", "error")
        return []
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      showNotification("Erreur de connexion au serveur", "error")
      return []
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
                nickname: farmer.nickname || null,
              phone: farmer.phone || "",
                type: farmer.type,
                pricePerKg: 0, // Not used anymore - pricing is per-session
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
                pricePerKg: targetSession.pricePerKg || null, // Only use session price, not farmer price
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
    // Enhanced payment filter logic
    let matchesPayment = true
    if (paymentFilter === "paid") {
      matchesPayment = farmer.paymentStatus === "paid"
    } else if (paymentFilter === "pending_oil") {
      // Has sessions waiting for oil weight (processingStatus === "pending")
      matchesPayment = farmer.sessions.some(s => s.processingStatus === "pending")
    } else if (paymentFilter === "pending_payment") {
      // Has processed sessions but not paid (processingStatus === "processed" but paymentStatus !== "paid")
      matchesPayment = farmer.sessions.some(s => 
        (s.processingStatus === "processed" || s.oilWeight > 0) && 
        s.paymentStatus !== "paid"
      )
    }
    
    const matchesToday = showTodayOnly ? new Date(farmer.lastProcessingDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0] : true
    return matchesSearch && matchesPayment && matchesToday
  })

  // Auto-select first farmer when today filter is activated
  const handleTodayFilterToggle = () => {
    const newShowTodayOnly = !showTodayOnly
    setShowTodayOnly(newShowTodayOnly)
    
    // If activating today filter, auto-select first today's farmer
    if (newShowTodayOnly) {
      const todaysFarmers = processedFarmers.filter(farmer => {
        const matchesSearch = farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesToday = new Date(farmer.lastProcessingDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
        
        // Apply same payment filter logic
        let matchesPayment = true
        if (paymentFilter === "paid") {
          matchesPayment = farmer.paymentStatus === "paid"
        } else if (paymentFilter === "pending_oil") {
          matchesPayment = farmer.sessions.some(s => s.processingStatus === "pending")
        } else if (paymentFilter === "pending_payment") {
          matchesPayment = farmer.sessions.some(s => 
            (s.processingStatus === "processed" || s.oilWeight > 0) && 
            s.paymentStatus !== "paid"
          )
        }
        
        return matchesSearch && matchesPayment && matchesToday
      })
      
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
      notes: session.notes || "",
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
      // Complete the session with oil weight, processing date, optional payment date, and notes
      const completeResponse = await sessionsApi.complete(editingSession.id, {
        oilWeight: oilWeight,
        processingDate: sessionForm.date,
        paymentDate: sessionForm.paymentDate || undefined,
        notes: sessionForm.notes || undefined
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
        notes: sessionForm.notes || undefined,
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
          .reduce((sum, s) => sum + (s.totalPrice || 0), 0)
        
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
              .reduce((sum, s) => sum + (s.totalPrice || 0), 0)
            
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
      setSessionForm({ oilWeight: "", date: "", paymentDate: "", notes: "" })
      
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

  // Calculate total price in real-time based on price per kg
  useEffect(() => {
    if (paymentSession && paymentForm.pricePerKg) {
      const pricePerKg = parseFloat(paymentForm.pricePerKg) || 0
      const total = paymentSession.totalBoxWeight * pricePerKg
      setCalculatedTotal(total)
    } else {
      setCalculatedTotal(0)
    }
  }, [paymentSession, paymentForm.pricePerKg])

  const handleOpenPaymentModal = (session: ProcessingSession) => {
    console.log('🔍 Opening payment modal for session:', {
      sessionId: session.id,
      pricePerKg: session.pricePerKg,
      totalPrice: session.totalPrice,
      sessionData: session
    })
    
    setPaymentSession(session)
    
    // Pre-fill price if already set from previous payment
    const existingPrice = session.pricePerKg ? session.pricePerKg.toString() : ""
    
    console.log('💰 Setting payment form with existing price:', existingPrice)
    
    setPaymentForm({
      pricePerKg: existingPrice,
      isFullPayment: true,
      customAmount: "",
      paymentMethod: "",
      notes: ""
    })
    
    // Calculate total if price exists
    if (session.pricePerKg) {
      const total = session.totalBoxWeight * session.pricePerKg
      setCalculatedTotal(total)
      console.log('📊 Calculated total from existing price:', {
        totalBoxWeight: session.totalBoxWeight,
        pricePerKg: session.pricePerKg,
        calculatedTotal: total
      })
    } else {
      setCalculatedTotal(0)
      console.log('❌ No existing price found, setting calculated total to 0')
    }
  }

  const handleProcessPayment = async () => {
    if (!paymentSession || !selectedFarmer) return

    // For partial payments, use existing price; for new payments, validate price input
    const pricePerKg = paymentSession.pricePerKg || parseFloat(paymentForm.pricePerKg)
    if (!pricePerKg || pricePerKg <= 0) {
      showNotification("Veuillez saisir un prix par kg valide", "error")
      return
    }

    // Calculate payment amount based on payment type and session status
    let amountPaid = 0
    if (paymentSession.paymentStatus === "partial") {
      // For partial payments, use remaining amount or custom amount
      amountPaid = paymentForm.isFullPayment 
        ? (paymentSession.remainingAmount || 0)
        : parseFloat(paymentForm.customAmount) || 0
    } else {
      // For new payments, use full total or custom amount
      const totalPrice = paymentSession.totalBoxWeight * pricePerKg
      amountPaid = paymentForm.isFullPayment 
        ? totalPrice 
        : parseFloat(paymentForm.customAmount) || 0
    }

    if (amountPaid <= 0) {
      showNotification("Veuillez saisir un montant de paiement valide", "error")
      return
    }

    // Validate payment doesn't exceed remaining amount for partial payments
    if (paymentSession.paymentStatus === "partial" && amountPaid > (paymentSession.remainingAmount || 0)) {
      showNotification(`Le montant ne peut pas dépasser le montant restant (${(paymentSession.remainingAmount || 0).toFixed(3)} DT)`, "error")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/sessions/${paymentSession.id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pricePerKg: pricePerKg,
          amountPaid: amountPaid,
          paymentMethod: paymentForm.paymentMethod || null,
          notes: paymentForm.notes || null
        })
      })
              
      const data = await response.json()

      if (data.success) {
        // Show immediate feedback
        showNotification("Paiement en cours de traitement...", "success")
        
        // Immediately update UI state with the returned session data
        updateSessionInState({
          id: paymentSession.id,
          totalPrice: data.data.totalPrice,
          pricePerKg: data.data.pricePerKg,
          amountPaid: data.data.amountPaid,
          remainingAmount: data.data.remainingAmount,
          paymentStatus: data.data.paymentStatus,
          paymentDate: data.data.paymentDate
        })
        
        // Close payment modal
        setPaymentSession(null)
        
        // Show final success notification
        setTimeout(() => {
          showNotification(data.message, "success")
        }, 100)

        // Optional: Reload sessions in background for data consistency (reduced delay)
        setTimeout(async () => {
          const updatedFarmers = await loadSessions()
          // Update selected farmer with fresh data if still selected
          if (selectedFarmer) {
            const updatedFarmer = updatedFarmers.find(f => f.id === selectedFarmer.id)
            if (updatedFarmer) {
              setSelectedFarmer(updatedFarmer)
            }
          }
        }, 2000)
      } else {
        showNotification(data.error || "Erreur lors du traitement du paiement", "error")
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showNotification("Erreur de connexion au serveur", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAsPaid = async (sessionId: string) => {
    // Find the session and open payment modal
    const session = selectedFarmer?.sessions.find(s => s.id === sessionId)
    if (session) {
      // Don't open payment modal if session is already fully paid
      if (session.paymentStatus === "paid") {
        showNotification("Cette session est déjà entièrement payée", "warning")
        return
      }
      
      handleOpenPaymentModal(session)
    }
  }

  // Load detailed session information including payment history
  const handleOpenSessionDetails = async (session: ProcessingSession) => {
    setLoadingSessionDetails(true)
    setSessionDetailsModal(session)
    
    try {
      // Fetch detailed session data including payment transactions
      const response = await fetch(`/api/sessions/${session.id}`)
      const data = await response.json()
      
      if (data.success) {
        // Extract payment history from the session data
        const paymentHistory = data.data.paymentTransactions || []
        setSessionPaymentHistory(paymentHistory)
        
        console.log('📋 Session Details Loaded:', {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          paymentHistory: paymentHistory.length,
          sessionData: data.data
        })
      } else {
        console.error('Failed to load session details:', data.error)
        setSessionPaymentHistory([])
      }
    } catch (error) {
      console.error('Error loading session details:', error)
      setSessionPaymentHistory([])
    } finally {
      setLoadingSessionDetails(false)
    }
  }

  const handleDeleteFarmer = async (farmerId: string) => {
    setSaving(true)
    try {
      const response = await farmersApi.delete(farmerId)

      if (response.success) {
        // Remove farmer from local state
    setProcessedFarmers(prev => prev.filter(f => f.id !== farmerId))
        
        // Clear selection if this farmer was selected
        if (selectedFarmer?.id === farmerId) {
          setSelectedFarmer(null)
        }
        
    setShowDeleteFarmerConfirm(null)
        showNotification("Agriculteur et toutes ses sessions supprimés avec succès!", "success")
      } else {
        showNotification(response.error || "Erreur lors de la suppression", "error")
      }
    } catch (error) {
      console.error('Error deleting farmer:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setSaving(true)
    try {
      // Find the farmer who owns this session and get session details
      const farmerOfDeletedSession = processedFarmers.find(f => 
        f.sessions.some(s => s.id === sessionId)
      )
      
      const sessionToDelete = farmerOfDeletedSession?.sessions.find(s => s.id === sessionId)
      const isLastSessionForFarmer = farmerOfDeletedSession && farmerOfDeletedSession.sessions.length === 1
      const wasSelectedFarmer = selectedFarmer && farmerOfDeletedSession?.id === selectedFarmer.id

      console.log('🗑️ Deleting session:', {
        sessionId,
        sessionNumber: sessionToDelete?.sessionNumber,
        farmerName: farmerOfDeletedSession?.name,
        paymentStatus: sessionToDelete?.paymentStatus,
        amountPaid: sessionToDelete?.amountPaid,
        isLastSession: isLastSessionForFarmer
      })

      const response = await sessionsApi.delete(sessionId)

      if (response.success) {
        // Check if refund is needed
        const refundInfo = response.data
        
        // Reload sessions to get fresh data
        await loadSessions()

        // Prepare success message based on what happened
        let message = "Session supprimée avec succès!"
        
        if (refundInfo?.wasPartiallyPaid && refundInfo?.refundAmount > 0) {
          message += ` 💰 Remboursement nécessaire: ${refundInfo.refundAmount.toFixed(3)} DT`
        }
        
        if (refundInfo?.boxesReleased > 0) {
          message += ` 📦 ${refundInfo.boxesReleased} boîtes libérées`
        }

        if (wasSelectedFarmer && isLastSessionForFarmer) {
          setSelectedFarmer(null)
          message += " L'agriculteur n'apparaît plus dans la liste car il n'a plus de sessions."
        }

        showNotification(message, "success")
    setShowDeleteSessionConfirm(null)
      } else {
        showNotification(response.error || "Erreur lors de la suppression", "error")
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      showNotification('Erreur de connexion au serveur', 'error')
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

  const handlePrintAllSessions = (farmer: ProcessedFarmer) => {
    setPrintingAllSessions(farmer)
    // Trigger print after a short delay to allow the component to render
    setTimeout(() => {
      window.print()
      // Close the print component after printing
      setTimeout(() => {
        setPrintingAllSessions(null)
      }, 500)
    }, 100)
  }

  // Bulk payment handlers
  const handleToggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  const handleSelectAllUnpaidSessions = () => {
    if (!selectedFarmer) return
    
    const unpaidSessions = selectedFarmer.sessions.filter(s => 
      (s.oilWeight > 0 || s.processingStatus === "processed") && 
      s.paymentStatus === "unpaid"
    )
    
    if (selectedSessions.size === unpaidSessions.length) {
      // Deselect all
      setSelectedSessions(new Set())
    } else {
      // Select all unpaid
      setSelectedSessions(new Set(unpaidSessions.map(s => s.id)))
    }
  }

  const handleOpenBulkPayment = () => {
    if (selectedSessions.size === 0) return
    
    // Calculate suggested price based on selected sessions
    const sessionsToProcess = selectedFarmer?.sessions.filter(s => selectedSessions.has(s.id)) || []
    const avgPrice = sessionsToProcess.reduce((sum, s) => sum + (s.pricePerKg || 0), 0) / sessionsToProcess.length
    
    setBulkPaymentForm({
      pricePerKg: avgPrice > 0 ? avgPrice.toFixed(3) : "",
      paymentDate: new Date().toISOString().split('T')[0],
      amountPaid: ""
    })
    setIsBulkPaymentDialogOpen(true)
  }

  const handleSendToBase = () => {
    if (!selectedFarmer || selectedSessions.size === 0) return

    const sessionIds = Array.from(selectedSessions)
    const sessionsToConvert = selectedFarmer.sessions.filter(s => sessionIds.includes(s.id))
    
    // Calculate totals
    const totalOliveWeight = sessionsToConvert.reduce((sum, s) => sum + s.totalBoxWeight, 0)
    const totalOilWeight = sessionsToConvert.reduce((sum, s) => sum + s.oilWeight, 0)
    
    // Prepare data to pass to Citerne page
    const purchaseData = {
      farmerName: selectedFarmer.name,
      farmerPhone: selectedFarmer.phone || '',
      oliveWeight: totalOliveWeight.toString(),
      oilProduced: totalOilWeight.toString(),
      sessionIds: sessionIds,
      farmerId: selectedFarmer.id
    }
    
    // Store in sessionStorage for the Citerne page to pick up
    sessionStorage.setItem('pendingPurchase', JSON.stringify(purchaseData))
    
    // Navigate to Citerne page
    window.location.href = '/huilerie?openPurchase=true'
  }

  const handleBulkPayment = async () => {
    if (!selectedFarmer || selectedSessions.size === 0) return

    const pricePerKg = parseFloat(bulkPaymentForm.pricePerKg)
    const customAmount = bulkPaymentForm.amountPaid ? parseFloat(bulkPaymentForm.amountPaid) : null

    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      showNotification("Le prix par kg doit être supérieur à 0", "error")
      return
    }

    if (customAmount !== null && (isNaN(customAmount) || customAmount < 0)) {
      showNotification("Le montant payé ne peut pas être négatif", "error")
      return
    }

    setSaving(true)
    try {
      const sessionIds = Array.from(selectedSessions)
      const sessionsToProcess = selectedFarmer.sessions.filter(s => sessionIds.includes(s.id))
      
      // Calculate totals based on OLIVE weight (not oil weight)
      const totalOliveWeight = sessionsToProcess.reduce((sum, session) => sum + session.totalBoxWeight, 0)
      const totalOilWeight = sessionsToProcess.reduce((sum, session) => sum + session.oilWeight, 0)
      const totalBoxes = sessionsToProcess.reduce((sum, session) => sum + session.boxCount, 0)
      const allBoxIds = sessionsToProcess.flatMap(session => session.boxIds)
      
      // Calculate total price based on olive weight
      const totalPrice = totalOliveWeight * pricePerKg
      const amountPaid = customAmount !== null ? customAmount : totalPrice
      
      // Determine payment status
      const paymentStatus = amountPaid >= totalPrice ? 'paid' : 'partial'

      // Create one combined session via API
      const response = await fetch('/api/sessions/bulk-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: selectedFarmer.id,
          sessionIds: sessionIds,
          pricePerKg: pricePerKg,
          amountPaid: amountPaid,
          paymentDate: bulkPaymentForm.paymentDate,
          totalBoxWeight: totalOliveWeight,
          totalOilWeight: totalOilWeight,
          boxCount: totalBoxes,
          boxIds: allBoxIds
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du paiement groupé')
      }

      // Close dialog first for immediate feedback
      setIsBulkPaymentDialogOpen(false)
      setSelectedSessions(new Set())
      
      // Show success notification immediately
      showNotification(
        `${sessionIds.length} sessions groupées en 1 session ${paymentStatus === 'paid' ? 'payée' : 'partiellement payée'}`, 
        "success"
      )
      
      // Reload data and immediately update selected farmer
      const updatedFarmers = await loadSessions()
      
      // Find and reselect farmer from the fresh data
      const updatedFarmer = updatedFarmers.find(f => f.id === selectedFarmer.id)
      if (updatedFarmer) {
        setSelectedFarmer(updatedFarmer)
      }
    } catch (error) {
      console.error('Error processing bulk payment:', error)
      showNotification(error instanceof Error ? error.message : 'Erreur lors du paiement groupé', 'error')
    } finally {
      setSaving(false)
    }
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
    } else if (session.paymentStatus === "partial") {
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
          Paiement partiel
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
    } else if (session.paymentStatus === "partial") {
      return "border-blue-200 bg-blue-50"
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
          
          .partial-payment-section {
            background-color: #FEF3C7 !important;
            border: 2px solid #F59E0B !important;
            padding: 12px !important;
            margin-bottom: 15px !important;
            border-radius: 6px !important;
          }
          
          .partial-payment-title {
            color: #92400E !important;
            font-weight: bold !important;
            font-size: 14px !important;
            margin-bottom: 8px !important;
          }
          
          .payment-amount-box {
            background-color: white !important;
            border: 1px solid #D1D5DB !important;
            padding: 8px !important;
            border-radius: 4px !important;
            text-align: center !important;
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
            <p className="font-semibold text-lg">{formatFarmerInvoiceName(farmer.name)}</p>
            {farmer.phone && <p className="text-gray-600">{farmer.phone}</p>}
            <p className="text-sm text-gray-600 mt-2">
              <strong>Tarif:</strong> {session.pricePerKg ? session.pricePerKg.toFixed(3) : 'Non défini'} DT/kg
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
              <span className={
                session.paymentStatus === "paid" 
                  ? "text-green-600 font-semibold" 
                  : session.paymentStatus === "partial" 
                    ? "text-blue-600 font-semibold"
                    : "text-orange-600 font-semibold"
              }>
                {session.paymentStatus === "paid" 
                  ? "✓ Payé intégralement" 
                  : session.paymentStatus === "partial" 
                    ? "◐ Paiement partiel"
                    : "◯ En attente"
                }
              </span>
            </p>
            
            {/* Show payment details for partial and paid sessions */}
            {(session.paymentStatus === "partial" || session.paymentStatus === "paid") && session.totalPrice && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Montant total:</span>
                    <span className="font-semibold ml-1">{session.totalPrice.toFixed(3)} DT</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant payé:</span>
                    <span className="font-semibold ml-1 text-green-600">{(session.amountPaid || 0).toFixed(3)} DT</span>
                  </div>
                  {session.paymentStatus === "partial" && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Reste à payer:</span>
                      <span className="font-semibold ml-1 text-red-600">{(session.remainingAmount || 0).toFixed(3)} DT</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {session.paymentDate && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Dernière date de paiement:</strong> {new Date(session.paymentDate).toLocaleDateString('fr-FR')}
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
                Numéros des boîtes ({session.boxCount} boîte{session.boxCount > 1 ? 's' : ''}):
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
              <td className="font-semibold">{session.pricePerKg ? session.pricePerKg.toFixed(3) : 'Non défini'}</td>
              <td className="font-bold text-lg">{session.totalPrice ? session.totalPrice.toFixed(3) : 'Non défini'}</td>
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
                  <span className="font-semibold">{session.totalPrice ? session.totalPrice.toFixed(3) : 'Non défini'} DT</span>
                </div>
              </div>
              <div className="total-section bg-[#F4D03F] p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL À PAYER:</span>
                  <span className="text-xl font-bold text-[#2C3E50]">{session.totalPrice ? session.totalPrice.toFixed(3) : 'Non défini'} DT</span>
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

      {/* Partial Payment Notice */}
      {session.paymentStatus === "partial" && session.totalPrice && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded p-4 section-spacing partial-payment-section">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center partial-payment-title">
            <span className="inline-block w-6 h-6 bg-yellow-500 text-white rounded-full text-center text-sm mr-2">!</span>
            Paiement Partiel en Cours
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border border-yellow-200 payment-amount-box">
              <p className="text-yellow-700 font-medium">Montant Total:</p>
              <p className="text-xl font-bold text-yellow-900">{session.totalPrice.toFixed(3)} DT</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200 payment-amount-box">
              <p className="text-green-700 font-medium">Déjà Payé:</p>
              <p className="text-xl font-bold text-green-800">{(session.amountPaid || 0).toFixed(3)} DT</p>
            </div>
            <div className="bg-white p-3 rounded border border-red-200 payment-amount-box">
              <p className="text-red-700 font-medium">Reste à Payer:</p>
              <p className="text-xl font-bold text-red-800">{(session.remainingAmount || 0).toFixed(3)} DT</p>
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

  const PrintAllSessions = ({ farmer }: { farmer: ProcessedFarmer }) => {
    // Calculate summary statistics
    const completedSessions = farmer.sessions.filter(s => s.oilWeight > 0 || s.processingStatus === "processed")
    const paidSessions = completedSessions.filter(s => s.paymentStatus === "paid")
    const partialSessions = completedSessions.filter(s => s.paymentStatus === "partial")
    const unpaidSessions = completedSessions.filter(s => s.paymentStatus === "unpaid")
    
    const totalBoxes = farmer.sessions.reduce((sum, s) => sum + s.boxCount, 0)
    const totalBoxWeight = farmer.sessions.reduce((sum, s) => sum + s.totalBoxWeight, 0)
    const totalOilWeight = completedSessions.reduce((sum, s) => sum + s.oilWeight, 0)
    const averageYield = totalBoxWeight > 0 ? (totalOilWeight / totalBoxWeight) * 100 : 0
    
    return (
      <div className="print-all-sessions">
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
            
            .print-all-sessions, .print-all-sessions * {
              visibility: visible;
            }
            
            .print-all-sessions {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 12mm !important;
              box-sizing: border-box !important;
              font-size: 10px !important;
              line-height: 1.2 !important;
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
            
            .sessions-table {
              width: 100% !important;
              font-size: 8px !important;
              border-collapse: collapse !important;
              margin: 8px 0 !important;
            }
            
            .sessions-table th,
            .sessions-table td {
              border: 1px solid #333 !important;
              padding: 4px 3px !important;
              text-align: center !important;
              vertical-align: middle !important;
            }
            
            .sessions-table th {
              background-color: #6B8E4B !important;
              color: white !important;
              font-weight: bold !important;
              font-size: 9px !important;
            }
            
            .print-header-title {
              font-size: 20px !important;
              margin-bottom: 10px !important;
              font-weight: bold !important;
            }
            
            .farmer-info-box {
              background-color: #f3f4f6 !important;
              border: 2px solid #6B8E4B !important;
              padding: 8px !important;
              border-radius: 4px !important;
              margin-bottom: 10px !important;
            }
            
            .stats-grid {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 6px !important;
              margin: 8px 0 !important;
            }
            
            .stat-box {
              border: 1px solid #d1d5db !important;
              padding: 6px !important;
              text-align: center !important;
              border-radius: 3px !important;
              background-color: #f9fafb !important;
            }
            
            .stat-label {
              font-size: 8px !important;
              color: #6b7280 !important;
              margin-bottom: 2px !important;
            }
            
            .stat-value {
              font-size: 12px !important;
              font-weight: bold !important;
              color: #1f2937 !important;
            }
            
            .summary-section {
              background-color: #fef3c7 !important;
              border: 2px solid #f59e0b !important;
              padding: 8px !important;
              border-radius: 4px !important;
              margin-top: 10px !important;
            }
            
            .summary-title {
              font-size: 12px !important;
              font-weight: bold !important;
              color: #92400e !important;
              margin-bottom: 6px !important;
              text-align: center !important;
            }
            
            .summary-grid {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8px !important;
            }
            
            .summary-item {
              text-align: center !important;
              background-color: white !important;
              border: 1px solid #d1d5db !important;
              padding: 6px !important;
              border-radius: 3px !important;
            }
            
            .print-footer {
              margin-top: 10px !important;
              padding-top: 8px !important;
              border-top: 2px solid #6B8E4B !important;
              text-align: center !important;
              font-size: 8px !important;
            }
            
            .status-badge {
              padding: 2px 6px !important;
              border-radius: 3px !important;
              font-size: 7px !important;
              font-weight: bold !important;
            }
            
            .status-paid {
              background-color: #d1fae5 !important;
              color: #065f46 !important;
            }
            
            .status-partial {
              background-color: #dbeafe !important;
              color: #1e40af !important;
            }
            
            .status-unpaid {
              background-color: #fef3c7 !important;
              color: #92400e !important;
            }
            
            .status-pending {
              background-color: #fed7aa !important;
              color: #9a3412 !important;
            }
          }
          
          .print-all-sessions {
            display: none;
          }
          
          @media print {
            .print-all-sessions {
              display: block !important;
            }
          }
          `
        }} />

        <div>
          {/* Header */}
          <div className="border-b-2 border-[#6B8E4B] pb-2 mb-3 flex justify-between items-start">
            <div>
              <h1 className="print-header-title text-2xl font-bold text-[#2C3E50]">HUILERIE MASMOUDI</h1>
              <p className="text-xs text-gray-600">Adresse: Tunis, Mahdia</p>
              <p className="text-xs text-gray-600">Rapport de Sessions Complètes</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Date d'impression:</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>

          {/* Farmer Information */}
          <div className="farmer-info-box">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#2C3E50] mb-1">
                  {formatFarmerInvoiceName(farmer.name)}
                </h2>
                <p className="text-xs text-gray-600">
                  {farmer.phone && <><strong>Téléphone:</strong> {farmer.phone}</>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 mb-1"><strong>Nombre total de sessions:</strong></p>
                <p className="text-2xl font-bold text-[#2C3E50]">{farmer.sessions.length}</p>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="stats-grid">
            <div className="stat-box" style={{ backgroundColor: '#d1fae5', borderColor: '#10b981' }}>
              <div className="stat-label" style={{ color: '#065f46' }}>Payées</div>
              <div className="stat-value" style={{ color: '#065f46' }}>{paidSessions.length}</div>
            </div>
            <div className="stat-box" style={{ backgroundColor: '#dbeafe', borderColor: '#3b82f6' }}>
              <div className="stat-label" style={{ color: '#1e40af' }}>Partielles</div>
              <div className="stat-value" style={{ color: '#1e40af' }}>{partialSessions.length}</div>
            </div>
            <div className="stat-box" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
              <div className="stat-label" style={{ color: '#92400e' }}>Non payées</div>
              <div className="stat-value" style={{ color: '#92400e' }}>{unpaidSessions.length}</div>
            </div>
            <div className="stat-box" style={{ backgroundColor: '#fed7aa', borderColor: '#ea580c' }}>
              <div className="stat-label" style={{ color: '#9a3412' }}>En attente</div>
              <div className="stat-value" style={{ color: '#9a3412' }}>{farmer.sessions.length - completedSessions.length}</div>
            </div>
          </div>

          {/* Sessions Table */}
          <table className="sessions-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>N° Session</th>
                <th style={{ width: '10%' }}>Date</th>
                <th style={{ width: '7%' }}>Boîtes</th>
                <th style={{ width: '10%' }}>Poids Total (kg)</th>
                <th style={{ width: '10%' }}>Huile (kg)</th>
                <th style={{ width: '8%' }}>Rendement</th>
                <th style={{ width: '10%' }}>Prix/kg (DT)</th>
                <th style={{ width: '10%' }}>Total (DT)</th>
                <th style={{ width: '10%' }}>Payé (DT)</th>
                <th style={{ width: '10%' }}>Reste (DT)</th>
                <th style={{ width: '7%' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {farmer.sessions.map((session, index) => {
                const isProcessed = session.oilWeight > 0 || session.processingStatus === "processed"
                const yield_percent = session.totalBoxWeight > 0 ? (session.oilWeight / session.totalBoxWeight) * 100 : 0
                
                return (
                  <tr key={session.id}>
                    <td style={{ fontWeight: 'bold' }}>{session.sessionNumber}</td>
                    <td>{session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>{session.boxCount}</td>
                    <td>{session.totalBoxWeight.toFixed(2)}</td>
                    <td style={{ fontWeight: 'bold' }}>{isProcessed ? session.oilWeight.toFixed(2) : '-'}</td>
                    <td>{isProcessed ? `${yield_percent.toFixed(1)}%` : '-'}</td>
                    <td>{session.pricePerKg ? session.pricePerKg.toFixed(3) : '-'}</td>
                    <td style={{ fontWeight: 'bold' }}>
                      {session.totalPrice ? session.totalPrice.toFixed(3) : '-'}
                    </td>
                    <td style={{ color: '#065f46', fontWeight: 'bold' }}>
                      {(session.amountPaid || 0).toFixed(3)}
                    </td>
                    <td style={{ color: session.remainingAmount && session.remainingAmount > 0 ? '#dc2626' : '#6b7280', fontWeight: 'bold' }}>
                      {(session.remainingAmount || 0).toFixed(3)}
                    </td>
                    <td>
                      {!isProcessed ? (
                        <span className="status-badge status-pending">En attente</span>
                      ) : session.paymentStatus === "paid" ? (
                        <span className="status-badge status-paid">Payé</span>
                      ) : session.paymentStatus === "partial" ? (
                        <span className="status-badge status-partial">Partiel</span>
                      ) : (
                        <span className="status-badge status-unpaid">Non payé</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-title">RÉCAPITULATIF FINANCIER</div>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="text-xs text-gray-600 mb-1">Montant Total Dû</div>
                <div className="text-lg font-bold text-[#2C3E50]">{farmer.totalAmountDue.toFixed(3)} DT</div>
              </div>
              <div className="summary-item">
                <div className="text-xs text-green-700 mb-1">Total Payé</div>
                <div className="text-lg font-bold text-green-600">{farmer.totalAmountPaid.toFixed(3)} DT</div>
              </div>
              <div className="summary-item">
                <div className="text-xs text-red-700 mb-1">Montant Restant</div>
                <div className="text-lg font-bold text-red-600">
                  {(farmer.totalAmountDue - farmer.totalAmountPaid).toFixed(3)} DT
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-amber-300">
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <p className="text-gray-600 mb-1">Total Boîtes</p>
                  <p className="font-bold text-sm">{totalBoxes}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Poids Total Olives</p>
                  <p className="font-bold text-sm">{totalBoxWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Total Huile</p>
                  <p className="font-bold text-sm">{totalOilWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Rendement Moyen</p>
                  <p className="font-bold text-sm">{averageYield.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="print-footer">
            <p className="font-semibold text-[#2C3E50] mb-1">
              HUILERIE MASMOUDI - Votre partenaire pour une huile d'olive de qualité
            </p>
            <p className="text-gray-500">
              Document généré automatiquement - Pour toute question, veuillez contacter l'huilerie
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Function to immediately update session and farmer in UI state
  const updateSessionInState = (updatedSessionData: any) => {
    if (!selectedFarmer) return

    console.log('🔄 Updating session in state:', {
      sessionId: updatedSessionData.id,
      newData: updatedSessionData
    })

    // Update the session in selected farmer
    setSelectedFarmer(prevFarmer => {
      if (!prevFarmer) return prevFarmer
      
      const updatedSessions = prevFarmer.sessions.map(s => 
        s.id === updatedSessionData.id ? {
          ...s,
          ...updatedSessionData,
          totalPrice: updatedSessionData.totalPrice,
          pricePerKg: updatedSessionData.pricePerKg,
          amountPaid: updatedSessionData.amountPaid,
          remainingAmount: updatedSessionData.remainingAmount,
          paymentStatus: updatedSessionData.paymentStatus,
          paymentDate: updatedSessionData.paymentDate
        } : s
      )
      
      // Recalculate farmer totals
      const totalAmountDue = updatedSessions
        .filter(s => s.totalPrice !== null)
        .reduce((sum, s) => sum + (s.totalPrice || 0), 0)
      
      const totalAmountPaid = updatedSessions
        .reduce((sum, s) => sum + (s.amountPaid || 0), 0)
      
      // SIMPLIFIED FARMER STATUS LOGIC (matching backend):
      // Check if ANY session is not fully paid
      const hasUnpaidSessions = updatedSessions.some((s: ProcessingSession) => {
        return (
          s.totalPrice === null || 
          s.paymentStatus !== 'paid' || 
          (s.remainingAmount || 0) > 0
        )
      })
      
      // Simple status logic: 'pending' if ANY session is unpaid, 'paid' if ALL are paid
      const farmerPaymentStatus = hasUnpaidSessions ? 'pending' : 'paid'

      console.log('👨‍🌾 Immediate UI Update - Farmer Status:', {
        farmerName: prevFarmer.name,
        oldTotalPaid: prevFarmer.totalAmountPaid,
        newTotalPaid: totalAmountPaid,
        totalAmountDue: totalAmountDue,
        oldStatus: prevFarmer.paymentStatus,
        newStatus: farmerPaymentStatus,
        hasUnpaidSessions: hasUnpaidSessions
      })
      
      return {
        ...prevFarmer,
        sessions: updatedSessions,
        totalAmountDue,
        totalAmountPaid,
        paymentStatus: farmerPaymentStatus
      }
    })

    // Update the farmer in processed farmers list
    setProcessedFarmers(prevFarmers => 
      prevFarmers.map(farmer => {
        if (farmer.id === selectedFarmer.id) {
          const updatedSessions = farmer.sessions.map(s => 
            s.id === updatedSessionData.id ? {
              ...s,
              ...updatedSessionData,
              totalPrice: updatedSessionData.totalPrice,
              pricePerKg: updatedSessionData.pricePerKg,
              amountPaid: updatedSessionData.amountPaid,
              remainingAmount: updatedSessionData.remainingAmount,
              paymentStatus: updatedSessionData.paymentStatus,
              paymentDate: updatedSessionData.paymentDate
            } : s
          )
          
          // Recalculate farmer totals
          const totalAmountDue = updatedSessions
            .filter(s => s.totalPrice !== null)
            .reduce((sum, s) => sum + (s.totalPrice || 0), 0)
          
          const totalAmountPaid = updatedSessions
            .reduce((sum, s) => sum + (s.amountPaid || 0), 0)
          
          // SIMPLIFIED FARMER STATUS LOGIC (matching backend):
          // Check if ANY session is not fully paid
          const hasUnpaidSessions = updatedSessions.some((s: ProcessingSession) => {
            return (
              s.totalPrice === null || 
              s.paymentStatus !== 'paid' || 
              (s.remainingAmount || 0) > 0
            )
          })
          
          // Simple status logic: 'pending' if ANY session is unpaid, 'paid' if ALL are paid
          const farmerPaymentStatus = hasUnpaidSessions ? 'pending' : 'paid'
          
          return {
            ...farmer,
            sessions: updatedSessions,
            totalAmountDue,
            totalAmountPaid,
            paymentStatus: farmerPaymentStatus
          }
        }
        return farmer
      })
    )
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadCSV}
              className="h-8 w-8 p-0 text-[#6B8E4B] hover:bg-[#6B8E4B]/10 transition-colors"
              title="Télécharger l'export Excel de toutes les données"
            >
              <Download className="w-5 h-5" />
            </Button>
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
                <Select value={paymentFilter} onValueChange={(value: any) => setPaymentFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending_oil">En attente huile</SelectItem>
                    <SelectItem value="pending_payment">En attente paiement</SelectItem>
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
                        <h3 className="font-semibold text-[#2C3E50]">{formatFarmerDisplayName(farmer.name, farmer.nickname)}</h3>
                        <p className="text-sm text-gray-600">{farmer.sessions.length} sessions</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-medium text-[#2C3E50]">
                            {farmer.totalAmountDue.toFixed(3)} DT
                          </span>
                          <Badge 
                            variant={farmer.paymentStatus === "paid" ? "default" : "destructive"}
                            className={farmer.paymentStatus === "paid" ? "bg-green-600 hover:bg-green-700" : ""}
                          >
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
                        <p className="font-semibold">{formatFarmerDisplayName(selectedFarmer.name, selectedFarmer.nickname)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold">{selectedFarmer.phone || "Non renseigné"}</p>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintAllSessions(selectedFarmer)}
                            className="border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Imprimer</span>
                            <span className="sm:hidden">Imprimer</span>
                          </Button>
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
                          {selectedFarmer.totalAmountDue.toFixed(3)} DT
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total payé</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedFarmer.totalAmountPaid.toFixed(3)} DT
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Indicators */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-green-800 mb-1">Traité et payé</div>
                        <div className="text-lg font-bold text-green-600">
                          {selectedFarmer.sessions.filter(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "paid").length}
                        </div>
                        <div className="text-xs text-green-600">Sessions complètes</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-blue-800 mb-1">Paiement partiel</div>
                        <div className="text-lg font-bold text-blue-600">
                          {selectedFarmer.sessions.filter(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "partial").length}
                        </div>
                        <div className="text-xs text-blue-600">En cours de paiement</div>
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
                        <div className="text-xs text-orange-600">Manque huile poids</div>
                      </div>
                    </div>
                  </CardContent>

                  {/* Bulk Payment Actions */}
                  {selectedFarmer.sessions.some(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "unpaid") && (
                    <CardContent className="border-t border-gray-200 bg-gradient-to-r from-yellow-50 to-white">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSelectAllUnpaidSessions}
                            className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {selectedSessions.size === selectedFarmer.sessions.filter(s => (s.oilWeight > 0 || s.processingStatus === "processed") && s.paymentStatus === "unpaid").length
                              ? "Tout désélectionner"
                              : "Tout sélectionner"}
                          </Button>
                          {selectedSessions.size > 0 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              {selectedSessions.size} sélectionnée(s)
                            </Badge>
                          )}
                        </div>
                        {selectedSessions.size > 0 && (
                          <>
                            <Button
                              size="sm"
                              onClick={handleOpenBulkPayment}
                              className="bg-green-600 hover:bg-green-700 shadow-md"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marquer comme payé ({selectedSessions.size})
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSendToBase}
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Envoyer vers Base ({selectedSessions.size})
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  )}

                  <CardContent>
                    <div className="space-y-4">
                      {selectedFarmer.sessions.map((session) => {
                        const isUnpaidProcessed = (session.oilWeight > 0 || session.processingStatus === "processed") && session.paymentStatus === "unpaid"
                        const isSelected = selectedSessions.has(session.id)
                        
                        return (
                        <Card
                          key={session.id}
                          className={`transition-all hover:shadow-md ${getSessionBorderClass(session)} ${
                            isSelected ? 'ring-2 ring-yellow-500 bg-yellow-50/30' : isUnpaidProcessed ? 'cursor-pointer' : 'cursor-pointer'
                          }`}
                          onClick={(e) => {
                            // If clicking on checkbox, don't trigger card click
                            if ((e.target as HTMLElement).closest('.session-checkbox')) {
                              return
                            }
                            
                            if (session.paymentStatus === "paid") {
                              handleOpenSessionDetails(session)
                            } else {
                              handleEditSession(session)
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                              <div className="flex items-center space-x-3">
                                {isUnpaidProcessed && (
                                  <div className="session-checkbox">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleSessionSelection(session.id)}
                                      className="border-yellow-500 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                                <h4 className="font-semibold text-[#2C3E50]">Session {session.sessionNumber}</h4>
                                {getSessionStatusBadge(session)}
                              </div>
                              <div className="flex items-center space-x-2">
                                {session.paymentStatus === "paid" ? (
                                  <div className="text-sm text-green-600 font-medium hidden sm:block">
                                    <Eye className="w-3 h-3 inline mr-1" />
                                    Cliquer pour voir les détails
                                  </div>
                                ) : (
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
                                  Total: {session.totalPrice ? session.totalPrice.toFixed(3) : 'Non défini'} DT
                                </p>
                                {/* Show payment progress for partial payments */}
                                {session.paymentStatus === "partial" && session.totalPrice && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-green-600">Payé:</span>
                                      <span className="font-semibold text-green-700">{(session.amountPaid || 0).toFixed(3)} DT</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-red-600">Reste:</span>
                                      <span className="font-semibold text-red-700">{(session.remainingAmount || 0).toFixed(3)} DT</span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ 
                                          width: `${Math.min(100, ((session.amountPaid || 0) / session.totalPrice) * 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {Math.round(((session.amountPaid || 0) / session.totalPrice) * 100)}% payé
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Session Notes */}
                            {session.notes && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                <div className="flex items-start space-x-1.5">
                                  <AlertCircle className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Note:</p>
                                    <p className="text-xs text-blue-900 leading-tight">{session.notes}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div></div>
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
                                  {(session.paymentStatus === "unpaid" || session.paymentStatus === "partial") && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarkAsPaid(session.id)
                                      }}
                                      className={`${
                                        session.paymentStatus === "partial" 
                                          ? "bg-blue-600 hover:bg-blue-700" 
                                          : "bg-green-600 hover:bg-green-700"
                                      } flex-1 sm:flex-none`}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      {session.paymentStatus === "partial" ? (
                                        <>
                                          <span className="hidden sm:inline">Continuer le paiement</span>
                                          <span className="sm:hidden">Paiement</span>
                                        </>
                                      ) : (
                                        <>
                                      <span className="hidden sm:inline">Marquer comme payé</span>
                                      <span className="sm:hidden">Payé</span>
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        )
                      })}
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
                <Label htmlFor="oilWeight" className="text-gray-700 flex items-center gap-2">
                  Poids d'huile extraite (kg) *
                  {editingSession.oilWeight === 0 && (
                    <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50 text-xs">
                      Requis
                    </Badge>
                  )}
                  {editingSession.oilWeight > 0 && (
                    <span className="text-sm text-gray-500">
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
                  className={`bg-white text-gray-900 transition-all ${
                    editingSession.oilWeight === 0 
                      ? 'border-2 border-red-500 focus:border-red-600 focus:ring-red-500 shadow-sm shadow-red-200' 
                      : ''
                  }`}
                />
                {editingSession.oilWeight === 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Ce champ doit être rempli pour traiter la session
                  </p>
                )}
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
              <div>
                <Label htmlFor="sessionNotes" className="text-gray-700">
                  Notes (optionnel)
                </Label>
                <textarea
                  id="sessionNotes"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ajouter des notes pour cette session..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B8E4B] focus:border-transparent bg-white text-gray-900"
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



      {/* Delete Farmer Confirmation Modal */}
      {showDeleteFarmerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md text-gray-900 mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Supprimer l'agriculteur</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-800 font-medium mb-2">⚠️ Action irréversible</p>
              <p className="text-gray-600 mb-3">Cette action supprimera définitivement :</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 mb-3">
                <li>• L'agriculteur et toutes ses informations</li>
                <li>• Toutes ses sessions de traitement</li>
                <li>• Tout l'historique des paiements</li>
                <li>• Les boîtes seront libérées et redeviennent disponibles</li>
              </ul>
              <p className="text-red-600 font-medium text-sm">Cette action ne peut pas être annulée.</p>
            </div>
              <div className="flex space-x-2">
                <Button
                onClick={() => handleDeleteFarmer(showDeleteFarmerConfirm)} 
                disabled={saving}
                variant="destructive" 
                className="bg-red-600 hover:bg-red-700 text-white"
                >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteFarmerConfirm(null)} 
                disabled={saving}
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
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
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Supprimer la session</h3>
              </div>
            <div className="mb-6">
              {(() => {
                // Find session details for better confirmation message
                const sessionToDelete = processedFarmers
                  .flatMap(f => f.sessions)
                  .find(s => s.id === showDeleteSessionConfirm)
                
                const farmerOfSession = processedFarmers.find(f => 
                  f.sessions.some(s => s.id === showDeleteSessionConfirm)
                )

                return (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-blue-800">Session à supprimer:</p>
                      <p className="text-sm text-blue-700">
                        {sessionToDelete?.sessionNumber} - {farmerOfSession?.name}
                      </p>
                      {sessionToDelete?.paymentStatus === 'partial' && (
                        <p className="text-sm text-orange-700 mt-1">
                          ⚠️ Paiement partiel: {(sessionToDelete.amountPaid || 0).toFixed(3)} DT à rembourser
                        </p>
                      )}
          </div>
                    
                    <p className="text-gray-800 font-medium mb-2">⚠️ Cette action supprimera :</p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 mb-3">
                      <li>• Cette session de traitement uniquement</li>
                      <li>• L'historique des paiements de cette session</li>
                      <li>• Les boîtes utilisées redeviendront disponibles</li>
                      {sessionToDelete?.paymentStatus === 'partial' && (
                        <li className="text-orange-600">• ⚠️ Un remboursement sera nécessaire</li>
                      )}
                    </ul>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-green-700">
                        ✅ Les autres sessions de cet agriculteur ne seront pas affectées
                      </p>
                    </div>
                    
                    <p className="text-orange-600 font-medium text-sm">
                      Seules les sessions non entièrement payées peuvent être supprimées.
                    </p>
                  </>
                )
              })()}
            </div>
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
                {saving ? 'Suppression...' : 'Supprimer cette session'}
                </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteSessionConfirm(null)} 
                disabled={saving} 
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
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

      {/* Print All Sessions Component - Hidden until print is triggered */}
      {printingAllSessions && (
        <PrintAllSessions farmer={printingAllSessions} />
      )}

      {/* Enhanced Payment Modal */}
      {paymentSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Traitement du paiement</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentSession(null)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Session Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Session: {paymentSession.sessionNumber}</p>
                  <p className="text-gray-600">Agriculteur: {selectedFarmer ? formatFarmerDisplayName(selectedFarmer.name, selectedFarmer.nickname) : ''}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Poids total: {paymentSession.totalBoxWeight} kg</p>
                  <p className="text-gray-600">Nombre de boîtes: {paymentSession.boxCount}</p>
                </div>
              </div>

              {/* Payment Status and History */}
              {paymentSession.paymentStatus === "partial" && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-800">Paiement partiel en cours</h4>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                      Partiel
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Total dû:</p>
                      <p className="text-blue-800 font-bold">{paymentSession.totalPrice?.toFixed(3) || 'N/A'} DT</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Déjà payé:</p>
                      <p className="text-green-700 font-bold">{(paymentSession.amountPaid || 0).toFixed(3)} DT</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Reste à payer:</p>
                      <p className="text-red-700 font-bold">{(paymentSession.remainingAmount || 0).toFixed(3)} DT</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show if this is first payment (unpaid) */}
              {paymentSession.paymentStatus === "unpaid" && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                      Premier paiement
                    </Badge>
                    <span className="text-orange-700 text-sm">Définissez le prix et effectuez le premier paiement</span>
                  </div>
                </div>
              )}

              {/* Show if fully paid */}
              {paymentSession.paymentStatus === "paid" && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                        ✓ Payé intégralement
                      </Badge>
                      <span className="text-green-700 text-sm">Cette session est entièrement payée</span>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 text-sm">Total payé:</p>
                      <p className="text-green-800 font-bold">{(paymentSession.amountPaid || 0).toFixed(3)} DT</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Per Kg Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="pricePerKg" className="text-gray-700 font-medium">
                  Prix par kg (DT) *
                  {paymentSession.pricePerKg && (
                    <span className="ml-2 text-sm text-blue-600 font-normal">
                      (Prix déjà défini: {paymentSession.pricePerKg.toFixed(3)} DT/kg)
                    </span>
                  )}
                </Label>
                
                {/* Show locked price for partial payments */}
                {paymentSession.pricePerKg && paymentSession.paymentStatus !== "unpaid" ? (
                  <div className="mt-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Prix fixé:</span>
                      <span className="font-bold text-lg text-gray-900">{paymentSession.pricePerKg.toFixed(3)} DT/kg</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Le prix ne peut plus être modifié après le premier paiement
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {/* Preset prices */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.250, 0.230, 0.200, 0.180].map((price) => (
                        <Button
                          key={price}
                          type="button"
                          variant={paymentForm.pricePerKg === price.toString() ? "default" : "outline"}
                          className={`h-12 ${
                            paymentForm.pricePerKg === price.toString()
                              ? "bg-[#6B8E4B] hover:bg-[#5A7A3F] text-white"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => setPaymentForm(prev => ({ ...prev, pricePerKg: price.toString() }))}
                        >
                          {price.toFixed(3)} DT
                        </Button>
                      ))}
                    </div>
                    {/* Custom price input */}
                    <div>
                      <Label className="text-sm text-gray-600">Ou saisissez un prix personnalisé:</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Ex: 0.180"
                        value={paymentForm.pricePerKg}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, pricePerKg: e.target.value }))}
                        className="mt-1 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Total Calculation */}
              {calculatedTotal > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800 font-medium">Total calculé:</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {calculatedTotal.toFixed(3)} DT
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    {paymentSession.totalBoxWeight} kg × {paymentForm.pricePerKg} DT/kg
                  </p>
                </div>
              )}

              {/* Payment Amount Selection */}
              {calculatedTotal > 0 && (
                <div>
                  <Label className="text-gray-700 font-medium">Montant du paiement</Label>
                  <div className="mt-2 space-y-3">
                    {/* For partial payments, show remaining amount */}
                    {paymentSession.paymentStatus === "partial" && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-yellow-800 font-medium">Montant restant à payer:</span>
                          <span className="text-xl font-bold text-yellow-900">
                            {(paymentSession.remainingAmount || 0).toFixed(3)} DT
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Vous pouvez payer le montant complet restant ou effectuer un autre paiement partiel
                        </p>
                      </div>
                    )}

                    {/* Full payment checkbox - adjust text for partial payments */}
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="fullPayment"
                        checked={paymentForm.isFullPayment}
                        onCheckedChange={(checked) => 
                          setPaymentForm(prev => ({ 
                            ...prev, 
                            isFullPayment: checked as boolean,
                            customAmount: checked ? "" : prev.customAmount
                          }))
                        }
                      />
                      <Label htmlFor="fullPayment" className="text-gray-700">
                        {paymentSession.paymentStatus === "partial" 
                          ? `Payer le montant restant (${(paymentSession.remainingAmount || 0).toFixed(3)} DT)`
                          : `Paiement complet (${calculatedTotal.toFixed(3)} DT)`
                        }
                      </Label>
                    </div>

                    {/* Partial payment input */}
                    {!paymentForm.isFullPayment && (
                      <div>
                        <Label className="text-sm text-gray-600">Montant partiel (DT):</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max={paymentSession.paymentStatus === "partial" 
                            ? (paymentSession.remainingAmount || 0) 
                            : calculatedTotal
                          }
                          placeholder={paymentSession.paymentStatus === "partial" 
                            ? `Max: ${(paymentSession.remainingAmount || 0).toFixed(3)}` 
                            : `Max: ${calculatedTotal.toFixed(3)}`
                          }
                          value={paymentForm.customAmount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, customAmount: e.target.value }))}
                          className="mt-1 bg-white text-gray-900 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        {paymentForm.customAmount && parseFloat(paymentForm.customAmount) > 0 && (
                          <div className="mt-2 space-y-1">
                            {paymentSession.paymentStatus === "partial" ? (
                              <p className="text-sm text-blue-600">
                                Nouveau reste à payer: {((paymentSession.remainingAmount || 0) - parseFloat(paymentForm.customAmount)).toFixed(3)} DT
                              </p>
                            ) : (
                              <p className="text-sm text-orange-600">
                                Reste à payer: {(calculatedTotal - parseFloat(paymentForm.customAmount)).toFixed(3)} DT
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod" className="text-gray-700">
                    Méthode de paiement (optionnel)
                  </Label>
                  <Select 
                    value={paymentForm.paymentMethod} 
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="bank">Virement bancaire</SelectItem>
                      <SelectItem value="check">Chèque</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-gray-700">
                    Notes (optionnel)
                  </Label>
                  <Input
                    id="notes"
                    placeholder="Notes sur le paiement..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 pt-4 border-t">
                <Button
                  onClick={handleProcessPayment}
                  disabled={saving || !paymentForm.pricePerKg || calculatedTotal <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Traitement...' : 
                   paymentForm.isFullPayment ? 'Confirmer le paiement complet' : 'Confirmer le paiement partiel'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentSession(null)} 
                  disabled={saving}
                  className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {sessionDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-gray-900 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-green-600" />
                Détails de la session
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSessionDetailsModal(null)
                  setSessionPaymentHistory([])
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Session Overview */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Informations de la session</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Session:</span> <span className="font-medium">{sessionDetailsModal.sessionNumber}</span></p>
                    <p><span className="text-gray-600">Agriculteur:</span> <span className="font-medium">{selectedFarmer ? formatFarmerDisplayName(selectedFarmer.name, selectedFarmer.nickname) : ''}</span></p>
                    <p><span className="text-gray-600">Date de création:</span> <span className="font-medium">{new Date(sessionDetailsModal.createdAt).toLocaleDateString('fr-FR')}</span></p>
                    <p><span className="text-gray-600">Date de traitement:</span> <span className="font-medium">{sessionDetailsModal.date || 'Non définie'}</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Statut et montants</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Statut:</span> {getSessionStatusBadge(sessionDetailsModal)}</p>
                    <p><span className="text-gray-600">Prix par kg:</span> <span className="font-bold text-green-600">{sessionDetailsModal.pricePerKg?.toFixed(3) || 'Non défini'} DT/kg</span></p>
                    <p><span className="text-gray-600">Montant total:</span> <span className="font-bold text-blue-600">{sessionDetailsModal.totalPrice?.toFixed(3) || 'Non défini'} DT</span></p>
                    <p><span className="text-gray-600">Montant payé:</span> <span className="font-bold text-green-600">{(sessionDetailsModal.amountPaid || 0).toFixed(3)} DT</span></p>
                    {sessionDetailsModal.paymentStatus === "partial" && (
                      <p><span className="text-gray-600">Reste à payer:</span> <span className="font-bold text-red-600">{(sessionDetailsModal.remainingAmount || 0).toFixed(3)} DT</span></p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Details */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
              {/* Box Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-blue-600" />
                  Boîtes traitées
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Nombre de boîtes:</span> <span className="font-medium">{sessionDetailsModal.boxCount}</span></p>
                  <p><span className="text-gray-600">Poids total des olives:</span> <span className="font-medium">{sessionDetailsModal.totalBoxWeight} kg</span></p>
                  <p><span className="text-gray-600">Huile extraite:</span> <span className="font-medium text-green-600">{sessionDetailsModal.oilWeight > 0 ? `${sessionDetailsModal.oilWeight} kg` : 'Non extraite'}</span></p>
                  {sessionDetailsModal.oilWeight > 0 && (
                    <p><span className="text-gray-600">Rendement:</span> <span className="font-medium text-green-600">{((sessionDetailsModal.oilWeight / sessionDetailsModal.totalBoxWeight) * 100).toFixed(1)}%</span></p>
                  )}
                </div>
                
                {/* Box IDs */}
                {sessionDetailsModal.boxIds && sessionDetailsModal.boxIds.length > 0 && (
                  <div className="mt-3">
                    <p className="text-gray-600 text-sm mb-2">Numéros des boîtes:</p>
                    <div className="flex flex-wrap gap-1">
                      {sessionDetailsModal.boxIds.map((boxId, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                          {boxId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            

            {/* Payment History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                Historique des paiements
                <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                  {sessionPaymentHistory.length} transaction{sessionPaymentHistory.length > 1 ? 's' : ''}
                </Badge>
              </h4>

              {loadingSessionDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Chargement de l'historique...</span>
                </div>
              ) : sessionPaymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {sessionPaymentHistory.map((transaction, index) => (
                    <div key={transaction.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Date</p>
                          <p className="font-semibold">{new Date(transaction.paymentDate || transaction.createdAt).toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs text-gray-500">{new Date(transaction.paymentDate || transaction.createdAt).toLocaleTimeString('fr-FR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Montant</p>
                          <p className="font-bold text-green-600 text-lg">{Number(transaction.amount || 0).toFixed(3)} DT</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Méthode</p>
                          <p className="font-semibold">{transaction.paymentMethod || 'Non spécifiée'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Notes</p>
                          <p className="font-medium text-gray-800">{transaction.notes || 'Aucune note'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucun historique de paiement disponible</p>
                  <p className="text-sm">Les détails des paiements apparaîtront ici</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 mt-6 pt-4 border-t">
              {sessionDetailsModal.paymentStatus !== "paid" && (
                <Button
                  onClick={() => {
                    setSessionDetailsModal(null)
                    setSessionPaymentHistory([])
                    handleMarkAsPaid(sessionDetailsModal.id)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continuer le paiement
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSessionDetailsModal(null)
                  setSessionPaymentHistory([])
                }}
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Payment Dialog */}
      {isBulkPaymentDialogOpen && selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-lg">
              <h3 className="text-2xl font-bold flex items-center">
                <CheckCircle className="w-6 h-6 mr-2" />
                Paiement Groupé - {selectedSessions.size} Session(s)
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {selectedFarmer.name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Sessions Summary */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Sessions sélectionnées
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFarmer.sessions
                    .filter(s => selectedSessions.has(s.id))
                    .map(session => (
                      <div key={session.id} className="flex items-center justify-between bg-white border border-yellow-200 rounded p-2 text-sm">
                        <div>
                          <span className="font-semibold">Session {session.sessionNumber}</span>
                          <span className="text-gray-500 ml-2">{session.oilWeight} kg</span>
                        </div>
                        <span className="text-gray-600">{session.totalBoxWeight} kg olives</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Calculation Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Calculs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total olives:</span>
                    <span className="font-bold text-blue-700">
                      {selectedFarmer.sessions
                        .filter(s => selectedSessions.has(s.id))
                        .reduce((sum, s) => sum + s.totalBoxWeight, 0)
                        .toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total huile produite:</span>
                    <span className="font-bold text-green-700">
                      {selectedFarmer.sessions
                        .filter(s => selectedSessions.has(s.id))
                        .reduce((sum, s) => sum + s.oilWeight, 0)
                        .toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total boîtes:</span>
                    <span className="font-bold text-gray-700">
                      {selectedFarmer.sessions
                        .filter(s => selectedSessions.has(s.id))
                        .reduce((sum, s) => sum + s.boxCount, 0)} boîtes
                    </span>
                  </div>
                  {bulkPaymentForm.pricePerKg && (
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
                      <span className="text-gray-800">Montant total:</span>
                      <span className="text-green-600">
                        {(
                          selectedFarmer.sessions
                            .filter(s => selectedSessions.has(s.id))
                            .reduce((sum, s) => sum + s.totalBoxWeight, 0) *
                          parseFloat(bulkPaymentForm.pricePerKg)
                        ).toFixed(3)} DT
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Ces sessions seront combinées en une seule</p>
                    <p className="text-green-700">
                      Les {selectedSessions.size} sessions sélectionnées seront groupées en 1 session {' '}
                      {bulkPaymentForm.amountPaid && parseFloat(bulkPaymentForm.amountPaid) < (
                        selectedFarmer.sessions
                          .filter(s => selectedSessions.has(s.id))
                          .reduce((sum, s) => sum + s.totalBoxWeight, 0) * 
                        (bulkPaymentForm.pricePerKg ? parseFloat(bulkPaymentForm.pricePerKg) : 0)
                      ) ? (
                        <Badge className="bg-blue-500">partiellement payée</Badge>
                      ) : (
                        <Badge className="bg-green-500">entièrement payée</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulkPricePerKg" className="text-sm font-medium flex items-center">
                    Prix par kg d'olives *
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                      Appliqué au total des olives
                    </Badge>
                  </Label>
                  <Input
                    id="bulkPricePerKg"
                    type="number"
                    step="0.001"
                    value={bulkPaymentForm.pricePerKg}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, pricePerKg: e.target.value })}
                    placeholder="Ex: 0.200"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ce prix sera multiplié par le poids total des olives ({selectedFarmer.sessions
                      .filter(s => selectedSessions.has(s.id))
                      .reduce((sum, s) => sum + s.totalBoxWeight, 0)
                      .toFixed(2)} kg)
                  </p>
                </div>

                <div>
                  <Label htmlFor="bulkPaymentDate" className="text-sm font-medium">
                    Date de paiement *
                  </Label>
                  <Input
                    id="bulkPaymentDate"
                    type="date"
                    value={bulkPaymentForm.paymentDate}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentDate: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="bulkAmountPaid" className="text-sm font-medium flex items-center">
                    Montant payé (optionnel)
                    <Badge variant="outline" className="ml-2 text-xs">
                      Laisser vide pour paiement complet
                    </Badge>
                  </Label>
                  <Input
                    id="bulkAmountPaid"
                    type="number"
                    step="0.001"
                    value={bulkPaymentForm.amountPaid}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, amountPaid: e.target.value })}
                    placeholder="Laisser vide pour paiement complet"
                    className="mt-2"
                  />
                  {bulkPaymentForm.amountPaid && bulkPaymentForm.pricePerKg && (
                    <p className="text-xs text-amber-600 mt-1">
                      Paiement partiel: Les sessions seront marquées comme partiellement payées
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleBulkPayment}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirmer le paiement
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkPaymentDialogOpen(false)}
                  disabled={saving}
                  className="px-6"
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
