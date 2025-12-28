import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProcessingSession } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Get today's date as string in YYYY-MM-DD format
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

// Currency formatting
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} DT`
}

// Weight formatting: max 2 decimal places, remove trailing zeros
export function formatWeight(weight: number): string {
  const rounded = Math.round(weight * 100) / 100 // Round to 2 decimal places
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, '')
}

// Box ID validation
export function validateBoxId(id: string, excludeId?: string): string | null {
  if (!id) return "L'ID de la boîte est requis"

  const numId = Number.parseInt(id)
  if (isNaN(numId) || numId < 1 || numId > 600) {
    return "L'ID de la boîte doit être entre 1 et 600"
  }

  return null
}

// Generate next Chkara ID
export function getNextChkaraId(existingIds: string[]): string {
  const chkaraIds = existingIds
    .filter((id) => id.startsWith("Chkara"))
    .map((id) => Number.parseInt(id.replace("Chkara", "")))
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

// Calculate processing metrics
export function calculateProcessingMetrics(sessions: ProcessingSession[]) {
  const totalSessions = sessions.length
  const completedSessions = sessions.filter((s) => s.processingStatus === "processed").length
  const paidSessions = sessions.filter((s) => s.paymentStatus === "paid").length
  const totalRevenue = sessions.reduce((sum, s) => sum + s.totalPrice, 0)
  const totalOilExtracted = sessions.reduce((sum, s) => sum + s.oilWeight, 0)
  const totalBoxesProcessed = sessions.reduce((sum, s) => sum + s.boxCount, 0)

  return {
    totalSessions,
    completedSessions,
    paidSessions,
    totalRevenue,
    totalOilExtracted,
    totalBoxesProcessed,
    averageOilPerSession: totalSessions > 0 ? totalOilExtracted / totalSessions : 0,
    completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    paymentRate: totalSessions > 0 ? (paidSessions / totalSessions) * 100 : 0,
  }
}

// Local storage utilities
export function saveToLocalStorage(key: string, data: any): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export function getFromLocalStorage<T>(key: string): T | null {
  if (typeof window !== "undefined") {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
  return null
}

export function removeFromLocalStorage(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(key)
  }
}

// API utilities
export function createApiUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
  const url = new URL(`${baseUrl}${endpoint}`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  return url.toString()
}

// Error handling
export function handleApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.message) {
    return error.message
  }
  return "Une erreur inattendue s'est produite"
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Box type utilities
export function getBoxTypeLabel(type: string): string {
  switch (type) {
    case "nchira":
      return "Nchira (Rouge)"
    case "chkara":
      return "Chkara (Sac)"
    case "normal":
      return "Boîte normale"
    default:
      return type
  }
}

export function getBoxTypeColor(type: string): string {
  switch (type) {
    case "nchira":
      return "border-red-200 bg-red-50"
    case "chkara":
      return "border-blue-200 bg-blue-50"
    case "normal":
      return "border-green-200 bg-green-50"
    default:
      return "border-gray-200 bg-gray-50"
  }
}

// Farmer type utilities
export function getFarmerTypeLabel(type: string): string {
  switch (type) {
    case "small":
      return "Petit agriculteur"
    case "large":
      return "Grand agriculteur"
    default:
      return type
  }
}

// Farmer display utilities
export function formatFarmerDisplayName(name: string, nickname?: string | null): string {
  if (nickname && nickname.trim()) {
    return `${name} (${nickname.trim()})`
  }
  return name
}

export function formatFarmerInvoiceName(name: string): string {
  // For invoices, always use only the official name, never the nickname
  return name
}

// Backend utility functions for API responses
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  }
}

export function createErrorResponse(error: string, details?: any) {
  return {
    success: false,
    error,
    details
  }
}

export function createPaginatedResponse<T>(items: T[], total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  
  return {
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }
}

// Session number generator
export async function generateSessionNumber(prisma: any): Promise<string> {
  // Get all session numbers and find the highest one
  const allSessions = await prisma.processingSession.findMany({
    where: {
      sessionNumber: {
        startsWith: 'S#'
      }
    },
    select: {
      sessionNumber: true
    }
  })
  
  let maxNumber = 0
  for (const session of allSessions) {
    const match = session.sessionNumber.match(/S#(\d+)/)
    if (match) {
      const num = parseInt(match[1])
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  }
  
  const nextNumber = maxNumber + 1
  
  // Double-check this number doesn't exist (extra safety)
  const existingSession = await prisma.processingSession.findUnique({
    where: { sessionNumber: `S#${nextNumber}` }
  })
  
  if (existingSession) {
    // If somehow it exists, add a random suffix
    return `S#${nextNumber}-${Date.now().toString().slice(-4)}`
  }
  
  return `S#${nextNumber}`
}

// Transform database farmer to frontend format
export function transformFarmerFromDb(farmer: any) {
  return {
    ...farmer,
    type: farmer.type.toLowerCase(),
    paymentStatus: farmer.paymentStatus.toLowerCase(),
    pricePerKg: Number(farmer.pricePerKg),
    totalAmountDue: Number(farmer.totalAmountDue),
    totalAmountPaid: Number(farmer.totalAmountPaid),
    boxes: farmer.boxes?.map((box: any) => ({
      ...box,
      type: box.type.toLowerCase(),
      weight: Number(box.currentWeight || 0),
      selected: box.isSelected || false,
      status: box.status.toLowerCase(),
      currentFarmerId: box.currentFarmerId
    })) || []  // Ensure boxes is always an array
  }
}

// Transform database box to frontend format
export function transformBoxFromDb(box: any) {
  return {
    ...box,
    type: box.type.toLowerCase(),
    weight: Number(box.currentWeight || 0),
    selected: box.isSelected || false,
    status: box.status.toLowerCase(),
    currentFarmerId: box.currentFarmerId,
    createdAt: box.createdAt,
    assignedAt: box.assignedAt
  }
}

// Transform database session to frontend format
export function transformSessionFromDb(session: any) {
  return {
    ...session,
    processingStatus: session.processingStatus.toLowerCase(),
    paymentStatus: session.paymentStatus.toLowerCase(),
    oilWeight: Number(session.oilWeight),
    totalBoxWeight: Number(session.totalBoxWeight),
    totalPrice: Number(session.totalPrice)
  }
}

// Date range utility for filtering
export function getDateRange(dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) {
    // If both dates are provided, use them
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999) // End of day
    return { from, to }
  } else if (dateFrom) {
    // If only from date is provided, use same day range
    const from = new Date(dateFrom)
    const to = new Date(dateFrom)
    to.setHours(23, 59, 59, 999) // End of day
    return { from, to }
  } else {
    // Default to current month
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { from, to }
  }
}

// Update farmer totals after session changes
export async function updateFarmerTotals(farmerId: string, prisma: any) {
  const sessions = await prisma.processingSession.findMany({
    where: { farmerId }
  })
  
  // Calculate total amount due (only from sessions that have a price set)
  const totalAmountDue = sessions
    .filter((session: any) => session.totalPrice !== null)
    .reduce((sum: number, session: any) => sum + Number(session.totalPrice || 0), 0)
  
  // Calculate total amount paid (sum of all amountPaid from all sessions)
  const totalAmountPaid = sessions
    .reduce((sum: number, session: any) => sum + Number(session.amountPaid || 0), 0)
  
  // SIMPLIFIED FARMER STATUS LOGIC:
  // Check if ANY session is not fully paid
  const hasUnpaidSessions = sessions.some((session: any) => {
    // Session is considered unpaid if:
    // 1. No price set yet (new session) - totalPrice is null
    // 2. Payment status is not PAID
    // 3. Has remaining amount > 0
    return (
      session.totalPrice === null || 
      session.paymentStatus !== 'PAID' || 
      Number(session.remainingAmount || 0) > 0
    )
  })
  
  // Simple status logic:
  // - If ANY session is unpaid → PENDING
  // - If ALL sessions are paid AND amounts match → PAID
  const paymentStatus = hasUnpaidSessions ? 'PENDING' : 'PAID'
  
  console.log('👨‍🌾 Simplified Farmer Status Update:', {
    farmerId,
    totalSessions: sessions.length,
    hasUnpaidSessions,
    totalAmountDue,
    totalAmountPaid,
    calculatedStatus: paymentStatus,
    sessionStatuses: sessions.map((s: any) => ({
      id: s.sessionNumber || s.id,
      totalPrice: s.totalPrice,
      paymentStatus: s.paymentStatus,
      remainingAmount: s.remainingAmount,
      isUnpaid: (
        s.totalPrice === null || 
        s.paymentStatus !== 'PAID' || 
        Number(s.remainingAmount || 0) > 0
      )
    }))
  })
  
  return await prisma.farmer.update({
    where: { id: farmerId },
    data: {
      totalAmountDue,
      totalAmountPaid,
      paymentStatus
    }
  })
}
