'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  Plus,
  Calendar,
  Loader2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  MapPin,
  Package,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Edit,
  Trash2,
  Clock
} from "lucide-react"

interface CollectorGroup {
  id: string
  name: string
  isActive: boolean
  collections?: DailyCollection[]
}

interface DailyCollection {
  id: string
  groupId: string
  collectionDate: Date
  location: string
  clientName: string
  chakraCount: number
  galbaCount: number
  totalChakra: number
  pricePerChakra?: number
  totalAmount?: number
  notes?: string
  createdAt?: Date
  group?: {
    id: string
    name: string
  }
}

export default function CollectorsPage() {
  const [groups, setGroups] = useState<CollectorGroup[]>([])
  const [collections, setCollections] = useState<DailyCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false)
  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<DailyCollection | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null)
  
  const [newGroupName, setNewGroupName] = useState('')
  const [collectionForm, setCollectionForm] = useState({
    groupId: '',
    collectionDate: new Date().toISOString().split('T')[0],
    location: '',
    clientName: '',
    chakraCount: 0,
    galbaCount: 0,
    pricePerChakra: '',
    notes: ''
  })

  // Print view state
  const [showPrintView, setShowPrintView] = useState(false)
  const [printStartDate, setPrintStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of month
    return date.toISOString().split('T')[0]
  })
  const [printEndDate, setPrintEndDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1, 0) // Last day of month
    return date.toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (message: string, type: "error" | "success" | "warning") => {
    setNotification({ message, type })
  }

  // Helper function to normalize galba (convert 5+ galba to chakra)
  const normalizeQuantities = (chakra: number, galba: number) => {
    const additionalChakra = Math.floor(galba / 5)
    const remainingGalba = galba % 5
    return {
      chakraCount: chakra + additionalChakra,
      galbaCount: remainingGalba
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [groupsRes, collectionsRes] = await Promise.all([
        fetch('/api/collector-groups'),
        fetch('/api/collections')
      ])
      
      const groupsData = await groupsRes.json()
      const collectionsData = await collectionsRes.json()
      
      if (groupsData.success) {
        setGroups(groupsData.data)
      }
      if (collectionsData.success) {
        setCollections(collectionsData.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showNotification('Le nom du groupe est requis', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/collector-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName })
      })

      const data = await response.json()
      
      if (data.success) {
        setGroups([...groups, data.data])
        setIsAddGroupDialogOpen(false)
        setNewGroupName('')
        showNotification('Groupe créé avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCollection = async () => {
    if (!collectionForm.groupId || !collectionForm.location || !collectionForm.clientName) {
      showNotification('Groupe, lieu et client sont requis', 'error')
      return
    }

    // Normalize quantities before sending
    const normalized = normalizeQuantities(collectionForm.chakraCount, collectionForm.galbaCount)

    setSaving(true)
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...collectionForm,
          chakraCount: normalized.chakraCount,
          galbaCount: normalized.galbaCount,
          pricePerChakra: collectionForm.pricePerChakra ? parseFloat(collectionForm.pricePerChakra) : null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCollections([data.data, ...collections])
        setIsAddCollectionDialogOpen(false)
        setCollectionForm({
          groupId: '',
          collectionDate: new Date().toISOString().split('T')[0],
          location: '',
          clientName: '',
          chakraCount: 0,
          galbaCount: 0,
          pricePerChakra: '',
          notes: ''
        })
        showNotification('Collecte enregistrée avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de l\'enregistrement', 'error')
      }
    } catch (error) {
      console.error('Error adding collection:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditCollection = (collection: DailyCollection) => {
    setEditingCollection(collection)
    setCollectionForm({
      groupId: collection.groupId,
      collectionDate: new Date(collection.collectionDate).toISOString().split('T')[0],
      location: collection.location,
      clientName: collection.clientName,
      chakraCount: collection.chakraCount,
      galbaCount: collection.galbaCount,
      pricePerChakra: collection.pricePerChakra ? collection.pricePerChakra.toString() : '',
      notes: collection.notes || ''
    })
    setIsAddCollectionDialogOpen(true)
  }

  const handleUpdateCollection = async () => {
    if (!editingCollection) return
    
    if (!collectionForm.location || !collectionForm.clientName) {
      showNotification('Lieu et client sont requis', 'error')
      return
    }

    // Normalize quantities before sending
    const normalized = normalizeQuantities(collectionForm.chakraCount, collectionForm.galbaCount)

    setSaving(true)
    try {
      const response = await fetch(`/api/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: collectionForm.location,
          clientName: collectionForm.clientName,
          chakraCount: normalized.chakraCount,
          galbaCount: normalized.galbaCount,
          pricePerChakra: collectionForm.pricePerChakra ? parseFloat(collectionForm.pricePerChakra) : null,
          notes: collectionForm.notes || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCollections(collections.map(c => c.id === editingCollection.id ? data.data : c))
        setIsAddCollectionDialogOpen(false)
        setEditingCollection(null)
        setCollectionForm({
          groupId: '',
          collectionDate: new Date().toISOString().split('T')[0],
          location: '',
          clientName: '',
          chakraCount: 0,
          galbaCount: 0,
          pricePerChakra: '',
          notes: ''
        })
        showNotification('Collecte mise à jour avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch (error) {
      console.error('Error updating collection:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette collecte?')) return

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setCollections(collections.filter(c => c.id !== id))
        showNotification('Collecte supprimée avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate stats for selected date
  const todayCollections = collections.filter(c => 
    new Date(c.collectionDate).toISOString().split('T')[0] === selectedDate
  )

  const todayTotalChakra = todayCollections.reduce((sum, c) => sum + Number(c.totalChakra), 0)
  const todayTotalAmount = todayCollections.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0)

  // Calculate overall stats
  const totalChakraAll = collections.reduce((sum, c) => sum + Number(c.totalChakra), 0)
  const activeGroups = groups.filter(g => g.isActive)

  return (
    <div className="p-6 space-y-6">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top print:hidden">
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

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Groupes Actifs</p>
                <p className="text-3xl font-bold mt-1">{activeGroups.length}</p>
              </div>
              <Users className="w-12 h-12 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Aujourd'hui</p>
                <p className="text-3xl font-bold mt-1">{todayTotalChakra.toFixed(1)} ش</p>
                <p className="text-xs text-green-100 mt-1">{todayCollections.length} collectes</p>
              </div>
              <Package className="w-12 h-12 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Collecté</p>
                <p className="text-3xl font-bold mt-1">{totalChakraAll.toFixed(1)} ش</p>
                <p className="text-xs text-blue-100 mt-1">{collections.length} collectes</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Montant Aujourd'hui</p>
                <p className="text-3xl font-bold mt-1">{todayTotalAmount.toFixed(2)} DT</p>
              </div>
              <Package className="w-12 h-12 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsAddGroupDialogOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Groupe
          </Button>

          <Button
            onClick={() => setIsAddCollectionDialogOpen(true)}
            className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Collecte
          </Button>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-blue-200 shadow-sm">
            <Calendar className="w-4 h-4 text-blue-600" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus-visible:ring-0 h-8 w-44"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowPrintView(!showPrintView)}
            variant="outline"
            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            {showPrintView ? 'Vue Normale' : 'Rapport'}
          </Button>
          
          <Button
            onClick={loadData}
            variant="outline"
            className="border-2 border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B]/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Print View */}
      {showPrintView && (
        <Card className="print-container border-0 shadow-2xl overflow-hidden">
          <CardHeader className="print-header bg-gradient-to-r from-amber-600 to-amber-700 text-white">
            <div className="hidden print:block">
              <h1 className="text-3xl font-bold text-center text-black">
                RAPPORT DE COLLECTE DES OLIVES
              </h1>
              <p className="text-center text-lg mt-2 text-black">
                Du {new Date(printStartDate).toLocaleDateString('fr-FR')} au {new Date(printEndDate).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-center text-sm mt-1 text-gray-600">
                Imprimé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="print:hidden">
              <CardTitle className="text-2xl font-bold text-center mb-4">
                Rapport de Collecte
              </CardTitle>
              
              <div className="flex gap-4 justify-center items-center">
                <div>
                  <Label className="text-white">Date Début</Label>
                  <Input
                    type="date"
                    value={printStartDate}
                    onChange={(e) => setPrintStartDate(e.target.value)}
                    className="bg-white/20 text-white border-white/30"
                  />
                </div>
                <div>
                  <Label className="text-white">Date Fin</Label>
                  <Input
                    type="date"
                    value={printEndDate}
                    onChange={(e) => setPrintEndDate(e.target.value)}
                    className="bg-white/20 text-white border-white/30"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-white text-amber-700 hover:bg-amber-50"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 print:p-0">
            {(() => {
              const filteredCollections = collections.filter(c => {
                const date = new Date(c.collectionDate).toISOString().split('T')[0]
                return date >= printStartDate && date <= printEndDate
              })

              // Group by group
              const byGroup = filteredCollections.reduce((acc, c) => {
                const groupName = c.group?.name || 'Sans groupe'
                if (!acc[groupName]) {
                  acc[groupName] = []
                }
                acc[groupName].push(c)
                return acc
              }, {} as Record<string, DailyCollection[]>)

              return (
                <div className="space-y-6">
                  {Object.entries(byGroup).map(([groupName, groupCollections]) => {
                    // Calculate raw totals from all collections
                    const rawTotalChakra = groupCollections.reduce((sum, c) => sum + c.chakraCount, 0)
                    const rawTotalGalba = groupCollections.reduce((sum, c) => sum + c.galbaCount, 0)
                    
                    // Normalize the totals
                    const normalizedTotals = normalizeQuantities(rawTotalChakra, rawTotalGalba)
                    const totalAmount = groupCollections.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0)

                    return (
                      <div key={groupName} className="print-group-section border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className="print-group-header bg-gradient-to-r from-amber-100 to-amber-200 p-4">
                          <h3 className="text-xl font-bold text-amber-900">{groupName}</h3>
                          <div className="flex gap-6 mt-2 text-sm">
                            <span className="font-semibold">
                              Total: {normalizedTotals.chakraCount} شكارة {normalizedTotals.galbaCount > 0 && `+ ${normalizedTotals.galbaCount} ق`}
                            </span>
                            {totalAmount > 0 && <span className="font-semibold">Montant: {totalAmount.toFixed(2)} DT</span>}
                            <span className="text-gray-600">({groupCollections.length} collectes)</span>
                          </div>
                        </div>
                        
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 p-2 text-left" style={{ width: '12%' }}>Date</th>
                              <th className="border border-gray-400 p-2 text-left" style={{ width: '22%' }}>Lieu</th>
                              <th className="border border-gray-400 p-2 text-left" style={{ width: '22%' }}>Client</th>
                              <th className="border border-gray-400 p-2 text-center" style={{ width: '10%' }}>Chakra<br/>(شكارة)</th>
                              <th className="border border-gray-400 p-2 text-center" style={{ width: '10%' }}>Galba<br/>(ق)</th>
                              <th className="border border-gray-400 p-2 text-center" style={{ width: '12%' }}>Total<br/>(شكارة)</th>
                              <th className="border border-gray-400 p-2 text-right" style={{ width: '12%' }}>Montant<br/>(DT)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupCollections.map((c, idx) => {
                              const normalized = normalizeQuantities(c.chakraCount, c.galbaCount)
                              return (
                                <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-400 p-2">
                                    {new Date(c.collectionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="border border-gray-400 p-2">{c.location}</td>
                                  <td className="border border-gray-400 p-2">{c.clientName}</td>
                                  <td className="border border-gray-400 p-2 text-center font-bold">{c.chakraCount}</td>
                                  <td className="border border-gray-400 p-2 text-center font-bold">{c.galbaCount}</td>
                                  <td className="border border-gray-400 p-2 text-center font-bold text-green-700">
                                    {normalized.chakraCount}{normalized.galbaCount > 0 && ` + ${normalized.galbaCount}ق`}
                                  </td>
                                  <td className="border border-gray-400 p-2 text-right">
                                    {c.totalAmount ? `${Number(c.totalAmount).toFixed(2)}` : '-'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                  
                  {Object.keys(byGroup).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Aucune collecte pour cette période
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="print-stats mt-6 p-4 bg-gradient-to-r from-amber-50 to-blue-50 rounded-lg border-2 border-amber-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Groupes Actifs</p>
                  <p className="stat-value text-2xl font-bold text-amber-700">{activeGroups.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Collectes</p>
                  <p className="stat-value text-2xl font-bold text-blue-700">
                    {collections.filter(c => {
                      const date = new Date(c.collectionDate).toISOString().split('T')[0]
                      return date >= printStartDate && date <= printEndDate
                    }).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Période</p>
                  <p className="text-lg font-semibold">
                    {new Date(printStartDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(printEndDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main View - Today's Collections by Group */}
      {!showPrintView && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : groups.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun groupe</h3>
                <p className="text-gray-500 mb-4">Créez votre premier groupe de collecteurs</p>
                <Button
                  onClick={() => setIsAddGroupDialogOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Groupe
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeGroups.map(group => {
                const groupCollectionsToday = todayCollections.filter(c => c.groupId === group.id)
                const todayTotal = groupCollectionsToday.reduce((sum, c) => sum + Number(c.totalChakra), 0)
                
                // Sum up all chakra and galba from all collections
                const rawTodayChakra = groupCollectionsToday.reduce((sum, c) => sum + c.chakraCount, 0)
                const rawTodayGalba = groupCollectionsToday.reduce((sum, c) => sum + c.galbaCount, 0)
                
                // Normalize the totals (convert excess galba to chakra)
                const normalizedToday = normalizeQuantities(rawTodayChakra, rawTodayGalba)
                const todayChakra = normalizedToday.chakraCount
                const todayGalba = normalizedToday.galbaCount

                return (
                  <Card 
                    key={group.id}
                    className="border-0 shadow-lg hover:shadow-xl transition-all"
                  >
                    <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                      <CardTitle className="text-xl flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="w-6 h-6 mr-2" />
                          {group.name}
                        </div>
                        <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                          {todayTotal.toFixed(1)} ش
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Today's Summary */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border-2 border-amber-200">
                          <p className="text-sm font-semibold text-amber-900 mb-2">
                            {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              day: '2-digit', 
                              month: 'long' 
                            })}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-amber-300">
                              <p className="text-xs text-gray-600">Chakra</p>
                              <p className="text-2xl font-bold text-amber-700">{todayChakra}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-orange-300">
                              <p className="text-xs text-gray-600">Galba (ق)</p>
                              <p className="text-2xl font-bold text-orange-700">{todayGalba}</p>
                            </div>
                          </div>
                        </div>

                        {/* Today's Collections Details */}
                        {groupCollectionsToday.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Collectes du jour</p>
                            {groupCollectionsToday.map(collection => (
                              <div 
                                key={collection.id}
                                className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-amber-300 transition-all"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MapPin className="w-3 h-3 text-amber-600" />
                                      <span className="font-semibold text-sm">{collection.location}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 ml-5">Client: {collection.clientName}</p>
                                    {collection.createdAt && (
                                      <div className="flex items-center gap-1 ml-5 mt-1">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <p className="text-xs text-gray-500">
                                          {new Date(collection.createdAt).toLocaleDateString('fr-FR', { 
                                            day: '2-digit', 
                                            month: '2-digit',
                                            year: 'numeric'
                                          })} à {new Date(collection.createdAt).toLocaleTimeString('fr-FR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex gap-3 mt-2 ml-5">
                                      <Badge variant="outline" className="text-xs">
                                        {collection.chakraCount} ش
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {collection.galbaCount} ق
                                      </Badge>
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {Number(collection.totalChakra).toFixed(2)} ش
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditCollection(collection)}
                                      className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                                      title="Modifier"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteCollection(collection.id)}
                                      className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucune collecte aujourd'hui</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Add Group Dialog */}
      <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <Users className="w-5 h-5 mr-2 text-amber-600" />
              Nouveau Groupe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Nom du Groupe *</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Groupe A, Équipe 1..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateGroup}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Création...' : 'Créer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddGroupDialogOpen(false)}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Collection Dialog */}
      <Dialog 
        open={isAddCollectionDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingCollection(null)
            setCollectionForm({
              groupId: '',
              collectionDate: new Date().toISOString().split('T')[0],
              location: '',
              clientName: '',
              chakraCount: 0,
              galbaCount: 0,
              pricePerChakra: '',
              notes: ''
            })
          }
          setIsAddCollectionDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <Package className="w-5 h-5 mr-2 text-[#6B8E4B]" />
              {editingCollection ? 'Modifier la Collecte' : 'Nouvelle Collecte'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group">Groupe *</Label>
                <select
                  id="group"
                  value={collectionForm.groupId}
                  onChange={(e) => setCollectionForm({ ...collectionForm, groupId: e.target.value })}
                  disabled={!!editingCollection}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Sélectionner un groupe</option>
                  {activeGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {editingCollection && (
                  <p className="text-xs text-gray-500 mt-1">Le groupe ne peut pas être modifié</p>
                )}
              </div>
              <div>
                <Label htmlFor="collectionDate">Date *</Label>
                <Input
                  id="collectionDate"
                  type="date"
                  value={collectionForm.collectionDate}
                  onChange={(e) => setCollectionForm({ ...collectionForm, collectionDate: e.target.value })}
                  disabled={!!editingCollection}
                  className={editingCollection ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
                {editingCollection && (
                  <p className="text-xs text-gray-500 mt-1">La date ne peut pas être modifiée</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Lieu *</Label>
                <Input
                  id="location"
                  value={collectionForm.location}
                  onChange={(e) => setCollectionForm({ ...collectionForm, location: e.target.value })}
                  placeholder="Ex: Ferme Ahmed, Nord Village..."
                />
              </div>
              <div>
                <Label htmlFor="clientName">Client *</Label>
                <Input
                  id="clientName"
                  value={collectionForm.clientName}
                  onChange={(e) => setCollectionForm({ ...collectionForm, clientName: e.target.value })}
                  placeholder="Pour qui..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chakraCount">Chakra (شكارة) *</Label>
                <Input
                  id="chakraCount"
                  type="number"
                  min="0"
                  value={collectionForm.chakraCount}
                  onChange={(e) => setCollectionForm({ ...collectionForm, chakraCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="galbaCount">Galba (ق) *</Label>
                <Input
                  id="galbaCount"
                  type="number"
                  min="0"
                  value={collectionForm.galbaCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    if (value >= 5) {
                      // Auto-normalize: convert to chakra
                      const normalized = normalizeQuantities(collectionForm.chakraCount, value)
                      setCollectionForm({ 
                        ...collectionForm, 
                        chakraCount: normalized.chakraCount,
                        galbaCount: normalized.galbaCount
                      })
                    } else {
                      setCollectionForm({ ...collectionForm, galbaCount: value })
                    }
                  }}
                />
                <p className="text-xs text-amber-600 mt-1 font-semibold">5 ق = 1 ش (auto-converti)</p>
              </div>
              <div>
                <Label htmlFor="pricePerChakra">Prix/Chakra</Label>
                <Input
                  id="pricePerChakra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={collectionForm.pricePerChakra}
                  onChange={(e) => setCollectionForm({ ...collectionForm, pricePerChakra: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={collectionForm.notes}
                onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                placeholder="Notes optionnelles..."
              />
            </div>

            {/* Calculation Preview */}
            {(collectionForm.chakraCount > 0 || collectionForm.galbaCount > 0) && (
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <p className="text-sm font-semibold text-green-900 mb-2">Calcul:</p>
                <p className="text-2xl font-bold text-green-700">
                  Total: {(collectionForm.chakraCount + collectionForm.galbaCount / 5).toFixed(2)} شكارة
                </p>
                {collectionForm.pricePerChakra && (
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    Montant: {((collectionForm.chakraCount + collectionForm.galbaCount / 5) * parseFloat(collectionForm.pricePerChakra)).toFixed(2)} DT
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={editingCollection ? handleUpdateCollection : handleAddCollection}
                disabled={saving}
                className="flex-1 bg-[#6B8E4B] hover:bg-[#5A7A3F]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Enregistrement...' : editingCollection ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddCollectionDialogOpen(false)
                  setEditingCollection(null)
                  setCollectionForm({
                    groupId: '',
                    collectionDate: new Date().toISOString().split('T')[0],
                    location: '',
                    clientName: '',
                    chakraCount: 0,
                    galbaCount: 0,
                    pricePerChakra: '',
                    notes: ''
                  })
                }}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except print content */
          body * {
            visibility: hidden;
          }
          
          /* Only show the print view card and its contents */
          .print-container,
          .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* Page setup */
          @page {
            size: portrait;
            margin: 15mm 10mm;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          /* Hide UI elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Header styling */
          .print-header {
            background: white !important;
            color: black !important;
            border-bottom: 3px solid black !important;
            padding: 20px 0 !important;
            margin-bottom: 20px !important;
          }

          .print-header h1 {
            font-size: 28px !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 10px !important;
          }

          .print-header p {
            font-size: 16px !important;
            text-align: center !important;
            margin: 5px 0 !important;
          }

          /* Group section styling */
          .print-group-section {
            page-break-inside: avoid;
            margin-bottom: 25px !important;
            border: 2px solid black !important;
            border-radius: 0 !important;
          }

          .print-group-header {
            background: #f5f5f5 !important;
            padding: 15px !important;
            border-bottom: 2px solid black !important;
          }

          .print-group-header h3 {
            font-size: 20px !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
          }

          .print-group-header span {
            font-size: 14px !important;
            font-weight: 600 !important;
          }

          /* Table styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }

          th {
            background: #e5e5e5 !important;
            color: black !important;
            font-weight: bold !important;
            padding: 10px 8px !important;
            border: 1px solid black !important;
            text-align: left !important;
          }

          td {
            padding: 8px !important;
            border: 1px solid #666 !important;
          }

          tr:nth-child(even) {
            background: #fafafa !important;
          }

          tr:nth-child(odd) {
            background: white !important;
          }

          /* Footer/Stats styling */
          .print-stats {
            background: white !important;
            border: 2px solid black !important;
            border-radius: 0 !important;
            padding: 20px !important;
            margin-top: 30px !important;
            page-break-inside: avoid;
          }

          .print-stats p {
            color: black !important;
            margin: 5px 0 !important;
          }

          .print-stats .stat-value {
            font-size: 22px !important;
            font-weight: bold !important;
          }

          /* Ensure proper breaks */
          .print-group-section {
            page-break-after: auto;
          }

          /* Color adjustments for print */
          .text-green-700,
          .text-amber-700,
          .text-blue-700 {
            color: black !important;
            font-weight: bold !important;
          }

          /* Remove shadows and rounded corners */
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

