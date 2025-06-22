import { useState, useEffect, useCallback } from 'react'
import { farmersApi, boxesApi, sessionsApi, dashboardApi } from '@/lib/api'

// Hook for managing farmers data
export function useFarmers(params?: {
  page?: number
  limit?: number
  search?: string
  type?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const [farmers, setFarmers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  const fetchFarmers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await farmersApi.getAll(params)
      setFarmers(response.data.items)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch farmers')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchFarmers()
  }, [fetchFarmers])

  const createFarmer = async (farmer: {
    name: string
    phone?: string
    type: 'small' | 'large'
  }) => {
    try {
      const response = await farmersApi.create(farmer)
      await fetchFarmers() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const updateFarmer = async (id: string, farmer: Partial<{
    name: string
    phone: string
    type: 'small' | 'large'
  }>) => {
    try {
      const response = await farmersApi.update(id, farmer)
      await fetchFarmers() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const deleteFarmer = async (id: string) => {
    try {
      const response = await farmersApi.delete(id)
      await fetchFarmers() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  return {
    farmers,
    loading,
    error,
    pagination,
    refetch: fetchFarmers,
    createFarmer,
    updateFarmer,
    deleteFarmer
  }
}

// Hook for managing single farmer data
export function useFarmer(id: string | null) {
  const [farmer, setFarmer] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFarmer = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const response = await farmersApi.getById(id)
      setFarmer(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch farmer')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchFarmer()
  }, [fetchFarmer])

  return {
    farmer,
    loading,
    error,
    refetch: fetchFarmer
  }
}

// Hook for managing farmer's boxes
export function useFarmerBoxes(farmerId: string | null) {
  const [boxes, setBoxes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBoxes = useCallback(async () => {
    if (!farmerId) return

    try {
      setLoading(true)
      setError(null)
      const response = await farmersApi.getBoxes(farmerId)
      setBoxes(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boxes')
    } finally {
      setLoading(false)
    }
  }, [farmerId])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  const addBox = async (box: {
    id: string
    type: 'normal' | 'nchira' | 'chkara'
    weight: number
  }) => {
    if (!farmerId) throw new Error('No farmer selected')
    
    try {
      const response = await farmersApi.addBox(farmerId, box)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const addBulkBoxes = async (boxes: Array<{
    id: string
    type: 'normal' | 'nchira' | 'chkara'
    weight: number
  }>) => {
    if (!farmerId) throw new Error('No farmer selected')
    
    try {
      const response = await farmersApi.addBoxes(farmerId, boxes)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  return {
    boxes,
    loading,
    error,
    refetch: fetchBoxes,
    addBox,
    addBulkBoxes
  }
}

// Hook for managing boxes data
export function useBoxes(params?: {
  page?: number
  limit?: number
  farmerId?: string
  type?: string
  isProcessed?: boolean
  isSelected?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const [boxes, setBoxes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  const fetchBoxes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await boxesApi.getAll(params)
      setBoxes(response.data.items)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boxes')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  const updateBox = async (id: string, box: Partial<{
    weight: number
    type: 'normal' | 'nchira' | 'chkara'
  }>) => {
    try {
      const response = await boxesApi.update(id, box)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const deleteBox = async (id: string) => {
    try {
      const response = await boxesApi.delete(id)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const bulkSelect = async (boxIds: string[]) => {
    try {
      const response = await boxesApi.bulkSelect(boxIds)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const bulkUnselect = async (boxIds: string[]) => {
    try {
      const response = await boxesApi.bulkUnselect(boxIds)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const bulkDelete = async (boxIds: string[]) => {
    try {
      const response = await boxesApi.bulkDelete(boxIds)
      await fetchBoxes() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  return {
    boxes,
    loading,
    error,
    pagination,
    refetch: fetchBoxes,
    updateBox,
    deleteBox,
    bulkSelect,
    bulkUnselect,
    bulkDelete
  }
}

// Hook for managing sessions data
export function useSessions(params?: {
  page?: number
  limit?: number
  farmerId?: string
  processingStatus?: string
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await sessionsApi.getAll(params)
      setSessions(response.data.items)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const createSession = async (session: {
    farmerId: string
    boxIds: string[]
    totalBoxWeight: number
    boxCount: number
    totalPrice: number
  }) => {
    try {
      const response = await sessionsApi.create(session)
      await fetchSessions() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const completeSession = async (id: string, data: {
    oilWeight: number
    processingDate: string
  }) => {
    try {
      const response = await sessionsApi.complete(id, data)
      await fetchSessions() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const updatePayment = async (id: string, data: {
    paymentStatus: 'paid' | 'pending'
  }) => {
    try {
      const response = await sessionsApi.updatePayment(id, data)
      await fetchSessions() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  const deleteSession = async (id: string) => {
    try {
      const response = await sessionsApi.delete(id)
      await fetchSessions() // Refresh list
      return response
    } catch (err) {
      throw err
    }
  }

  return {
    sessions,
    loading,
    error,
    pagination,
    refetch: fetchSessions,
    createSession,
    completeSession,
    updatePayment,
    deleteSession
  }
}

// Hook for managing dashboard data
export function useDashboard(refresh = false) {
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dashboardApi.getStats(refresh)
      setStats(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

// Hook for box ID validation
export function useBoxValidation() {
  const [validating, setValidating] = useState(false)

  const validateBoxId = async (id: string, type: string, excludeBoxId?: string) => {
    try {
      setValidating(true)
      const response = await boxesApi.validate(id, type, excludeBoxId)
      return response.data
    } catch (err) {
      throw err
    } finally {
      setValidating(false)
    }
  }

  return {
    validateBoxId,
    validating
  }
}
