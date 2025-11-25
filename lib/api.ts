// API Client for Olive Factory Management System
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : '/api' // Use relative path to work with any port

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

// Generic API request handler with authentication handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)
    
    // Handle authentication errors
    if (response.status === 401) {
      console.log('🔒 Authentication required, redirecting to login...')
      
      // Clear any stored authentication data
      if (typeof window !== 'undefined') {
        localStorage.clear()
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;'
        
        // Redirect to login page
        window.location.href = '/login'
      }
      
      throw new Error('Authentication required')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error
  }
}

// FARMERS API
export const farmersApi = {
  // Get all farmers with pagination and filtering
  getAll: (params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeBoxes?: boolean
    includeSessions?: boolean
  }): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.type && params.type !== 'all') searchParams.append('type', params.type)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    if (params?.includeBoxes) searchParams.append('includeBoxes', 'true')
    if (params?.includeSessions) searchParams.append('includeSessions', 'true')
    
    const query = searchParams.toString()
    return apiRequest(`/farmers${query ? `?${query}` : ''}`)
  },

  // Get single farmer
  getById: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/farmers/${id}`),

  // Create farmer
  create: (farmer: {
    name: string
    nickname?: string
    phone?: string
    type: 'small' | 'large'
  }): Promise<ApiResponse<any>> => 
    apiRequest('/farmers', {
      method: 'POST',
      body: JSON.stringify(farmer),
    }),

  // Update farmer
  update: (id: string, farmer: Partial<{
    name: string
    nickname: string
    phone: string
    type: 'small' | 'large'
  }>): Promise<ApiResponse<any>> => 
    apiRequest(`/farmers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(farmer),
    }),

  // Delete farmer
  delete: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/farmers/${id}`, {
      method: 'DELETE',
    }),

  // Get farmer's boxes
  getBoxes: (id: string): Promise<ApiResponse<any[]>> => 
    apiRequest(`/farmers/${id}/boxes`),

  // Add single box to farmer
  addBox: (id: string, box: {
    id: string
    type: 'normal' | 'nchira' | 'chkara'
    weight?: number
  }): Promise<ApiResponse<any>> => 
    apiRequest(`/farmers/${id}/boxes`, {
      method: 'POST',
      body: JSON.stringify(box),
    }),

  // Add multiple boxes to farmer
  addBoxes: (id: string, boxes: Array<{
    id: string
    type: 'normal' | 'nchira' | 'chkara'
    weight?: number
  }>): Promise<ApiResponse<any[]>> => 
    apiRequest(`/farmers/${id}/boxes`, {
      method: 'POST',
      body: JSON.stringify({ boxes }),
    }),
}

// BOXES API
export const boxesApi = {
  // Get all boxes
  getAll: (params?: {
    page?: number
    limit?: number
    farmerId?: string
    type?: string
    isProcessed?: boolean
    isSelected?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.farmerId) searchParams.append('farmerId', params.farmerId)
    if (params?.type && params.type !== 'all') searchParams.append('type', params.type)
    if (params?.isProcessed !== undefined) searchParams.append('isProcessed', params.isProcessed.toString())
    if (params?.isSelected !== undefined) searchParams.append('isSelected', params.isSelected.toString())
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    
    const query = searchParams.toString()
    return apiRequest(`/boxes${query ? `?${query}` : ''}`)
  },

  // Get available factory boxes for assignment
  getAvailable: (params?: {
    limit?: number
    offset?: number
  }): Promise<ApiResponse<{
    boxes: any[]
    total: number
    available: number
    limit: number
    offset: number
  }>> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    const query = searchParams.toString()
    return apiRequest(`/boxes/available${query ? `?${query}` : ''}`)
  },

  // Get single box
  getById: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/boxes/${id}`),

  // Create box
  create: (box: {
    id: string
    type: 'normal' | 'nchira' | 'chkara'
    weight: number
    farmerId: string
  }): Promise<ApiResponse<any>> => 
    apiRequest('/boxes', {
      method: 'POST',
      body: JSON.stringify(box),
    }),

  // Update box
  update: (id: string, box: Partial<{
    weight: number | null
    type: 'normal' | 'nchira' | 'chkara'
  }>): Promise<ApiResponse<any>> => 
    apiRequest(`/boxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(box),
    }),

  // Delete box
  delete: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/boxes/${id}`, {
      method: 'DELETE',
    }),

  // Validate box ID
  validate: (id: string, type: string, excludeBoxId?: string): Promise<ApiResponse<any>> => 
    apiRequest('/boxes/validate', {
      method: 'POST',
      body: JSON.stringify({ id, type, excludeBoxId }),
    }),

  // Bulk operations
  bulkSelect: (boxIds: string[]): Promise<ApiResponse<any>> => 
    apiRequest('/boxes', {
      method: 'PUT',
      body: JSON.stringify({ boxIds, action: 'select' }),
    }),

  bulkUnselect: (boxIds: string[]): Promise<ApiResponse<any>> => 
    apiRequest('/boxes', {
      method: 'PUT',
      body: JSON.stringify({ boxIds, action: 'unselect' }),
    }),

  bulkDelete: (boxIds: string[]): Promise<ApiResponse<any>> => 
    apiRequest('/boxes', {
      method: 'PUT',
      body: JSON.stringify({ boxIds, action: 'delete' }),
    }),
}

// SESSIONS API
export const sessionsApi = {
  // Get all sessions
  getAll: (params?: {
    page?: number
    limit?: number
    farmerId?: string
    processingStatus?: string
    paymentStatus?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeFarmer?: boolean
    includeBoxes?: boolean
  }): Promise<PaginatedResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.farmerId) searchParams.append('farmerId', params.farmerId)
    if (params?.processingStatus && params.processingStatus !== 'all') searchParams.append('processingStatus', params.processingStatus)
    if (params?.paymentStatus && params.paymentStatus !== 'all') searchParams.append('paymentStatus', params.paymentStatus)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    if (params?.includeFarmer !== undefined) searchParams.append('includeFarmer', params.includeFarmer.toString())
    if (params?.includeBoxes !== undefined) searchParams.append('includeBoxes', params.includeBoxes.toString())
    
    const query = searchParams.toString()
    return apiRequest(`/sessions${query ? `?${query}` : ''}`)
  },

  // Get single session
  getById: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}`),

  // Create session
  create: (session: {
    farmerId: string
    boxIds: string[]
    totalBoxWeight: number
    boxCount: number
    // totalPrice removed - will be calculated during payment
  }): Promise<ApiResponse<any>> => 
    apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  // Update session
  update: (id: string, session: Partial<{
    totalBoxWeight: number
    boxCount: number
    totalPrice: number
  }>): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(session),
    }),

  // Complete session
  complete: (id: string, data: {
    oilWeight: number
    processingDate: string
    paymentDate?: string
  }): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update payment with flexible pricing
  updatePayment: (id: string, data: {
    pricePerKg: number
    amountPaid: number
    paymentMethod?: string
    notes?: string
  }): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete session
  delete: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}`, {
      method: 'DELETE',
    }),

  // Reset session (for testing)
  reset: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}/reset`, {
      method: 'PUT',
    }),

  // Unpay session (revert payment)
  unpay: (id: string): Promise<ApiResponse<any>> => 
    apiRequest(`/sessions/${id}/unpay`, {
      method: 'POST',
    }),
}

// DASHBOARD API
export const dashboardApi = {
  // Get dashboard data
  getStats: (refresh?: boolean): Promise<ApiResponse<any>> => {
    const query = refresh ? '?refresh=true' : ''
    return apiRequest(`/dashboard${query}`)
  },
}

// HEALTH API
export const healthApi = {
  // Check API health
  check: (): Promise<ApiResponse<any>> => 
    apiRequest('/health'),
}
