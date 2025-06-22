// Core entity types
export interface Farmer {
  id: string
  name: string
  phone?: string
  type: "small" | "large"
  dateAdded: string
  pricePerKg: number
  boxes: Box[]
  createdAt?: Date
  updatedAt?: Date
}

export interface Box {
  id: string
  type: "nchira" | "chkara" | "normal"
  weight: number
  selected: boolean
  farmerId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ProcessingSession {
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
  createdAt?: Date
  updatedAt?: Date
}

export interface ProcessedFarmer {
  id: string
  name: string
  phone?: string
  type: "small" | "large"
  pricePerKg: number
  sessions: ProcessingSession[]
  totalAmountDue: number
  totalAmountPaid: number
  paymentStatus: "paid" | "pending"
  lastProcessingDate: string
  createdAt?: Date
  updatedAt?: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form types
export interface FarmerFormData {
  name: string
  phone?: string
  type: "small" | "large"
}

export interface BoxFormData {
  id: string
  type: "nchira" | "chkara" | "normal"
  weight: number
  farmerId: string
}

export interface SessionFormData {
  oilWeight: number
  date: string
  sessionId: string
}

// Filter and search types
export interface FarmerFilters {
  search?: string
  type?: "all" | "small" | "large"
  paymentStatus?: "all" | "paid" | "pending"
}

export interface BoxFilters {
  type?: "all" | "nchira" | "chkara" | "normal"
  farmerId?: string
}

// Dashboard metrics
export interface DashboardMetrics {
  totalFarmers: number
  totalBoxes: number
  activeBoxes: number
  pendingExtractions: number
  todayRevenue: number
  totalRevenue: number
  averageOilExtraction: number
}

// Notification types
export interface Notification {
  id: string
  message: string
  type: "success" | "error" | "warning" | "info"
  timestamp: Date
  read: boolean
}

// Invoice data
export interface InvoiceData {
  session: ProcessingSession
  farmer: ProcessedFarmer
  companyInfo: {
    name: string
    address: string
    phone: string
  }
}
