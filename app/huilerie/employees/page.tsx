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
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Loader2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  User,
  Phone,
  Briefcase,
  BarChart3,
  Printer,
  ChevronLeft,
  ChevronRight,
  MinusCircle,
  Wallet,
  DollarSign
} from "lucide-react"

interface Employee {
  id: string
  name: string
  phone?: string
  position?: string
  hireDate: Date
  isActive: boolean
  recentAttendance: Attendance[]
  payments?: EmployeePayment[]
}

interface Attendance {
  id: string
  date: Date
  status: 'present' | 'absent' | 'half_day'
  notes?: string
}

interface EmployeePayment {
  id: string
  employeeId: string
  amount: number
  paymentDate: Date
  notes?: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payments, setPayments] = useState<EmployeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<Employee | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null)
  
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    phone: '',
    position: ''
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    notes: ''
  })

  // Print state
  const [showPrintView, setShowPrintView] = useState(false)
  const [printMonth, setPrintMonth] = useState(new Date())

  useEffect(() => {
    loadEmployees()
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

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const [employeesRes, paymentsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/employee-payments')
      ])
      
      const employeesData = await employeesRes.json()
      const paymentsData = await paymentsRes.json()
      
      if (employeesData.success) {
        setEmployees(employeesData.data)
      } else {
        showNotification(employeesData.error || 'Erreur lors du chargement', 'error')
      }

      if (paymentsData.success) {
        setPayments(paymentsData.data)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedEmployeeForPayment || !paymentForm.amount) {
      showNotification('Veuillez remplir le montant', 'error')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/employee-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeForPayment.id,
          amount: parseFloat(paymentForm.amount),
          notes: paymentForm.notes || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPayments([...payments, data.data])
        setIsAddPaymentDialogOpen(false)
        setSelectedEmployeeForPayment(null)
        setPaymentForm({ amount: '', notes: '' })
        showNotification('Paiement enregistré avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de l\'enregistrement', 'error')
      }
    } catch (error) {
      console.error('Error adding payment:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      return
    }

    try {
      const response = await fetch(`/api/employee-payments/${paymentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setPayments(payments.filter(p => p.id !== paymentId))
        showNotification('Paiement supprimé avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const handleCreateEmployee = async () => {
    if (!employeeForm.name.trim()) {
      showNotification('Le nom est requis', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm)
      })

      const data = await response.json()
      
      if (data.success) {
        setEmployees([...employees, { ...data.data, recentAttendance: [] }])
        setIsCreateDialogOpen(false)
        setEmployeeForm({ name: '', phone: '', position: '' })
        showNotification('Employé créé avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return

    setCreating(true)
    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm)
      })

      const data = await response.json()
      
      if (data.success) {
        setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...e, ...data.data } : e))
        setEditingEmployee(null)
        setEmployeeForm({ name: '', phone: '', position: '' })
        showNotification('Employé mis à jour avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la mise à jour', 'error')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé?')) return

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setEmployees(employees.filter(e => e.id !== id))
        showNotification('Employé supprimé avec succès!', 'success')
      } else {
        showNotification(data.error || 'Erreur lors de la suppression', 'error')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const handleMarkAttendance = async (employeeId: string, status: 'present' | 'absent' | 'half_day') => {
    // Optimistic update - update UI immediately before API call
    const tempAttendanceRecord = {
      id: `temp-${Date.now()}`, // Temporary ID
      date: new Date(selectedDate + 'T00:00:00.000Z'),
      status: status,
      notes: undefined
    }

    // Update UI instantly
    setEmployees(prevEmployees => prevEmployees.map(emp => {
      if (emp.id === employeeId) {
        const newAttendance = emp.recentAttendance.filter(a => {
          const attDate = new Date(a.date).toISOString().split('T')[0]
          return attDate !== selectedDate
        })
        return { 
          ...emp, 
          recentAttendance: [tempAttendanceRecord, ...newAttendance]
        }
      }
      return emp
    }))

    // Then make the API call
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: selectedDate,
          status
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Replace temp record with real one from server
        const realAttendanceRecord = {
          id: data.data.id,
          date: new Date(selectedDate + 'T00:00:00.000Z'),
          status: status,
          notes: data.data.notes || undefined
        }

        setEmployees(prevEmployees => prevEmployees.map(emp => {
          if (emp.id === employeeId) {
            const newAttendance = emp.recentAttendance.filter(a => {
              const attDate = new Date(a.date).toISOString().split('T')[0]
              return attDate !== selectedDate
            })
            return { 
              ...emp, 
              recentAttendance: [realAttendanceRecord, ...newAttendance]
            }
          }
          return emp
        }))
      } else {
        // Revert optimistic update on error
        loadEmployees()
        showNotification(data.error || 'Erreur lors de l\'enregistrement', 'error')
      }
    } catch (error) {
      // Revert optimistic update on error
      loadEmployees()
      showNotification('Erreur de connexion au serveur', 'error')
    }
  }

  const getAttendanceForDate = (employee: Employee, date: string) => {
    return employee.recentAttendance.find(a => {
      // Ensure we're comparing dates as YYYY-MM-DD strings
      const attDate = new Date(a.date)
      const attDateStr = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}-${String(attDate.getDate()).padStart(2, '0')}`
      return attDateStr === date
    })
  }

  const activeEmployees = employees.filter(e => e.isActive)
  const todayPresent = activeEmployees.filter(e => {
    const att = getAttendanceForDate(e, selectedDate)
    return att?.status === 'present'
  }).length
  const todayHalfDay = activeEmployees.filter(e => {
    const att = getAttendanceForDate(e, selectedDate)
    return att?.status === 'half_day'
  }).length
  const todayAbsent = activeEmployees.filter(e => {
    const att = getAttendanceForDate(e, selectedDate)
    return att?.status === 'absent'
  }).length

  // Print helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => i + 1)
  }

  const getAttendanceStatusForDay = (employee: Employee, year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const att = getAttendanceForDate(employee, dateStr)
    if (!att) return ''
    if (att.status === 'present') return 'P'
    if (att.status === 'half_day') return 'H'
    if (att.status === 'absent') return 'A'
    return ''
  }

  const handlePrint = () => {
    window.print()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setPrintMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

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
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

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


      {/* Actions Bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[#6B8E4B] to-[#5A7A3F] hover:from-[#5A7A3F] hover:to-[#4A6A35] text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un Employé
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
            {showPrintView ? 'Vue Normale' : 'Feuille de Présence'}
          </Button>
          
          <Button
            onClick={loadEmployees}
            variant="outline"
            className="border-2 border-[#6B8E4B] text-[#6B8E4B] hover:bg-[#6B8E4B]/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Print View - Monthly Attendance Grid */}
      {showPrintView && (
        <Card className="border-0 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
            <div className="flex items-center justify-between print:hidden">
              <Button
                onClick={() => navigateMonth('prev')}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <CardTitle className="text-2xl font-bold text-center">
                Feuille de Présence - {printMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              
              <Button
                onClick={() => navigateMonth('next')}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="hidden print:block">
              <h1 className="text-3xl font-bold text-center text-black">
                FEUILLE DE PRÉSENCE DES EMPLOYÉS
              </h1>
              <p className="text-center text-lg mt-2 text-black">
                {printMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </p>
            </div>

            <div className="flex gap-2 mt-4 print:hidden">
              <Button
                onClick={handlePrint}
                className="flex-1 bg-white text-purple-700 hover:bg-purple-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 print:p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 print:bg-white">
                    <th className="border-2 border-gray-400 p-2 text-left font-bold bg-purple-100 print:bg-gray-200 sticky left-0 z-10 min-w-[150px]">
                      EMPLOYÉ
                    </th>
                    {getDaysInMonth(printMonth).map(day => (
                      <th 
                        key={day} 
                        className="border-2 border-gray-400 p-2 text-center font-bold min-w-[35px] max-w-[35px]"
                      >
                        {day}
                      </th>
                    ))}
                    <th className="border-2 border-gray-400 p-2 text-center font-bold bg-green-100 print:bg-gray-200 min-w-[50px]">
                      P
                    </th>
                    <th className="border-2 border-gray-400 p-2 text-center font-bold bg-gray-200 print:bg-gray-200 min-w-[50px]">
                      H
                    </th>
                    <th className="border-2 border-gray-400 p-2 text-center font-bold bg-red-100 print:bg-gray-200 min-w-[50px]">
                      A
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={getDaysInMonth(printMonth).length + 4} className="border-2 border-gray-400 p-8 text-center text-gray-500">
                        Aucun employé actif
                      </td>
                    </tr>
                  ) : (
                    activeEmployees.map((employee, idx) => {
                      const year = printMonth.getFullYear()
                      const month = printMonth.getMonth()
                      const days = getDaysInMonth(printMonth)
                      
                      let presentCount = 0
                      let halfDayCount = 0
                      let absentCount = 0
                      
                      days.forEach(day => {
                        const status = getAttendanceStatusForDay(employee, year, month, day)
                        if (status === 'P') presentCount++
                        if (status === 'H') halfDayCount++
                        if (status === 'A') absentCount++
                      })

                      return (
                        <tr key={employee.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-white'}>
                          <td className="border-2 border-gray-400 p-2 font-semibold sticky left-0 bg-inherit z-10">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-purple-600 print:hidden" />
                              <div>
                                <div className="font-bold">{employee.name}</div>
                                {employee.position && (
                                  <div className="text-xs text-gray-500">{employee.position}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {days.map(day => {
                            const status = getAttendanceStatusForDay(employee, year, month, day)
                            const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
                            
                            return (
                              <td 
                                key={day} 
                                className={`border-2 border-gray-400 p-1 text-center font-bold ${
                                  status === 'P' 
                                    ? 'bg-green-100 text-green-800 print:bg-green-200' 
                                    : status === 'H'
                                      ? 'bg-gray-300 text-gray-800 print:bg-gray-300'
                                      : status === 'A' 
                                        ? 'bg-red-100 text-red-800 print:bg-red-200' 
                                        : isWeekend 
                                          ? 'bg-gray-100 print:bg-gray-100' 
                                          : ''
                                }`}
                              >
                                {status}
                              </td>
                            )
                          })}
                          <td className="border-2 border-gray-400 p-2 text-center font-bold bg-green-50 text-green-800">
                            {presentCount}
                          </td>
                          <td className="border-2 border-gray-400 p-2 text-center font-bold bg-gray-200 text-gray-800">
                            {halfDayCount}
                          </td>
                          <td className="border-2 border-gray-400 p-2 text-center font-bold bg-red-50 text-red-800">
                            {absentCount}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 print:border-black print:bg-white print:mt-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 print:text-black">Total Employés</p>
                  <p className="text-2xl font-bold text-purple-700 print:text-black">{activeEmployees.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 print:text-black">Légende</p>
                  <div className="flex justify-center gap-2 mt-1 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 border-2 border-green-400">P = Présent</Badge>
                    <Badge className="bg-gray-300 text-gray-800 border-2 border-gray-500">H = 1/2 Jour</Badge>
                    <Badge className="bg-red-100 text-red-800 border-2 border-red-400">A = Absent</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 print:text-black">Date d'impression</p>
                  <p className="text-lg font-semibold print:text-black">
                    {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Grid */}
      {!showPrintView && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B8E4B]" />
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : employees.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun employé</h3>
                <p className="text-gray-500 mb-4">Ajoutez votre premier employé pour commencer</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#6B8E4B] hover:bg-[#5A7A3F]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un Employé
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEmployees.map(employee => {
            const todayAttendance = getAttendanceForDate(employee, selectedDate)
            const isPresent = todayAttendance?.status === 'present'
            const isHalfDay = todayAttendance?.status === 'half_day'
            const isAbsent = todayAttendance?.status === 'absent'
            
            // Calculate total P/H/A for this employee (all time)
            const totalPresent = employee.recentAttendance.filter(a => a.status === 'present').length
            const totalHalfDay = employee.recentAttendance.filter(a => a.status === 'half_day').length
            const totalAbsent = employee.recentAttendance.filter(a => a.status === 'absent').length
            
            return (
              <Card 
                key={employee.id}
                className={`border-0 shadow-lg transition-all hover:shadow-xl ${
                  isPresent ? 'ring-2 ring-green-400 bg-green-50/30' :
                  isHalfDay ? 'ring-2 ring-gray-400 bg-gray-50/30' :
                  isAbsent ? 'ring-2 ring-red-400 bg-red-50/30' : ''
                }`}
              >
                <CardHeader className="bg-gradient-to-r from-[#2C3E50] to-[#34495E] text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      {employee.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* P/H/A Counters */}
                      <div className="flex gap-1">
                        <Badge className="bg-green-600 text-white text-xs px-2 py-1">
                          P: {totalPresent}
                        </Badge>
                        <Badge className="bg-gray-600 text-white text-xs px-2 py-1">
                          H: {totalHalfDay}
                        </Badge>
                        <Badge className="bg-red-600 text-white text-xs px-2 py-1">
                          A: {totalAbsent}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingEmployee(employee)
                          setEmployeeForm({
                            name: employee.name,
                            phone: employee.phone || '',
                            position: employee.position || ''
                          })
                        }}
                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-white hover:bg-red-500/20 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {employee.phone && (
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                        <Phone className="w-3 h-3 mr-1" />
                        {employee.phone}
                      </Badge>
                    )}
                    {employee.position && (
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {employee.position}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Attendance Status */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3 font-semibold">
                      {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: '2-digit', 
                        month: 'long' 
                      })}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => handleMarkAttendance(employee.id, 'present')}
                        className={`h-16 ${
                          isPresent
                            ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-400'
                            : 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-6 h-6 mb-1" />
                          <span className="text-xs font-bold">P</span>
                          <span className="text-[10px]">Présent</span>
                        </div>
                      </Button>
                      <Button
                        onClick={() => handleMarkAttendance(employee.id, 'half_day')}
                        className={`h-16 ${
                          isHalfDay
                            ? 'bg-gray-600 hover:bg-gray-700 text-white ring-2 ring-gray-400'
                            : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <MinusCircle className="w-6 h-6 mb-1" />
                          <span className="text-xs font-bold">H</span>
                          <span className="text-[10px]">1/2 Jour</span>
                        </div>
                      </Button>
                      <Button
                        onClick={() => handleMarkAttendance(employee.id, 'absent')}
                        className={`h-16 ${
                          isAbsent
                            ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400'
                            : 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <XCircle className="w-6 h-6 mb-1" />
                          <span className="text-xs font-bold">A</span>
                          <span className="text-[10px]">Absent</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Historique récent (7 jours)</p>
                    <div className="flex gap-1">
                      {Array.from({ length: 7 }, (_, i) => {
                        // Use selectedDate as base to avoid timezone issues
                        const baseDateParts = selectedDate.split('-')
                        const baseYear = parseInt(baseDateParts[0])
                        const baseMonth = parseInt(baseDateParts[1]) - 1 // Month is 0-indexed
                        const baseDay = parseInt(baseDateParts[2])
                        
                        // Calculate target date by subtracting days
                        const targetDate = new Date(baseYear, baseMonth, baseDay - (6 - i))
                        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
                        const att = getAttendanceForDate(employee, dateStr)
                        
                        return (
                          <div
                            key={`${employee.id}-${dateStr}-${att?.status || 'none'}`}
                            className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold ${
                              att?.status === 'present' 
                                ? 'bg-green-500 text-white' 
                                : att?.status === 'half_day'
                                  ? 'bg-gray-500 text-white'
                                  : att?.status === 'absent'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-gray-400'
                            }`}
                            title={`${targetDate.toLocaleDateString('fr-FR')} - ${
                              att?.status === 'present' ? 'Présent' : att?.status === 'half_day' ? '1/2 Jour' : att?.status === 'absent' ? 'Absent' : 'Non marqué'
                            }`}
                          >
                            {att?.status === 'present' ? 'P' : att?.status === 'half_day' ? 'H' : att?.status === 'absent' ? 'A' : '-'}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Tracking Section */}
                  <div className="pt-4 border-t">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-2 border-green-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-green-700" />
                          <h3 className="text-xs font-bold text-green-900">Paiements</h3>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeForPayment(employee)
                            setIsAddPaymentDialogOpen(true)
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Payer
                        </Button>
                      </div>
                      
                      {(() => {
                        const employeePayments = payments.filter(p => p.employeeId === employee.id)
                        const totalPaid = employeePayments.reduce((sum, p) => sum + Number(p.amount), 0)
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-white p-2 rounded border border-green-300 text-center">
                                <p className="text-[10px] text-gray-600">Total Payé</p>
                                <p className="text-sm font-bold text-green-600">{totalPaid.toFixed(2)} DT</p>
                              </div>
                              <div className="bg-white p-2 rounded border border-green-300 text-center">
                                <p className="text-[10px] text-gray-600">Paiements</p>
                                <p className="text-sm font-bold text-gray-700">{employeePayments.length}</p>
                              </div>
                            </div>
                            
                            {/* Payment History */}
                            {employeePayments.length > 0 && (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                <p className="text-[10px] text-gray-600 font-semibold uppercase mb-1">Historique</p>
                                {employeePayments
                                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                                  .slice(0, 5)
                                  .map(payment => (
                                    <div 
                                      key={payment.id}
                                      className="flex justify-between items-center bg-white p-2 rounded border border-green-200 text-xs group hover:border-green-300 transition-colors"
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <DollarSign className="w-3 h-3 text-green-600" />
                                        <div className="flex-1">
                                          <p className="font-bold text-green-700">{Number(payment.amount).toFixed(2)} DT</p>
                                          {payment.notes && (
                                            <p className="text-xs font-bold text-gray-700">"{payment.notes}"</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <p className="text-[10px] text-gray-600">
                                            {new Date(payment.paymentDate).toLocaleDateString('fr-FR', { 
                                              day: '2-digit', 
                                              month: '2-digit'
                                            })}
                                          </p>
                                          <p className="text-[9px] text-gray-400">
                                            {new Date(payment.paymentDate).toLocaleTimeString('fr-FR', { 
                                              hour: '2-digit', 
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeletePayment(payment.id)}
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Supprimer ce paiement"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Employee Dialog */}
      <Dialog 
        open={isCreateDialogOpen || !!editingEmployee} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setEditingEmployee(null)
            setEmployeeForm({ name: '', phone: '', position: '' })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <User className="w-5 h-5 mr-2 text-[#6B8E4B]" />
              {editingEmployee ? 'Modifier l\'Employé' : 'Ajouter un Employé'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nom Complet *</Label>
              <Input
                id="name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="Ex: Ahmed Ben Mohamed"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="Ex: 12345678"
              />
            </div>
            <div>
              <Label htmlFor="position">Poste</Label>
              <Input
                id="position"
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                placeholder="Ex: Opérateur de presse"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
                disabled={creating}
                className="flex-1 bg-[#6B8E4B] hover:bg-[#5A7A3F]"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {creating ? 'Enregistrement...' : editingEmployee ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setEditingEmployee(null)
                  setEmployeeForm({ name: '', phone: '', position: '' })
                }}
                disabled={creating}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog 
        open={isAddPaymentDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployeeForPayment(null)
            setPaymentForm({ amount: '', notes: '' })
          }
          setIsAddPaymentDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2C3E50] flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Enregistrer un Paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedEmployeeForPayment && (
              <Alert className="bg-green-50 border-green-300">
                <Wallet className="w-4 h-4 text-green-700" />
                <AlertDescription className="text-green-800">
                  Paiement pour: <strong>{selectedEmployeeForPayment.name}</strong>
                  {selectedEmployeeForPayment.position && (
                    <span className="text-sm"> • {selectedEmployeeForPayment.position}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="paymentAmount">Montant (DT) *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Ex: 150.00"
                className="text-lg font-bold"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notes (optionnel)</Label>
              <Input
                id="paymentNotes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Ex: Salaire du mois, prime..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddPayment}
                disabled={creating || !paymentForm.amount}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {creating ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddPaymentDialogOpen(false)
                  setSelectedEmployeeForPayment(null)
                  setPaymentForm({ amount: '', notes: '' })
                }}
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



