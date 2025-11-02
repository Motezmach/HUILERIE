import { useEffect, useRef, useCallback, useState } from 'react'

interface UseRealTimeSyncOptions {
  onSync: () => Promise<void> | void
  interval?: number // milliseconds
  enableWhenHidden?: boolean // Continue syncing when tab is hidden
  onError?: (error: Error) => void
}

/**
 * Custom hook for real-time synchronization with smart polling
 * - Auto-pauses when tab is hidden (saves resources)
 * - Auto-resumes when tab becomes visible
 * - Configurable refresh interval
 * - Tracks last sync time
 */
export function useRealTimeSync({
  onSync,
  interval = 3000, // Default: 3 seconds
  enableWhenHidden = false,
  onError
}: UseRealTimeSyncOptions) {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)

  const performSync = useCallback(async () => {
    // Don't sync if already syncing
    if (isSyncing) return

    // Don't sync if tab is hidden and not enabled
    if (!isVisibleRef.current && !enableWhenHidden) return

    try {
      setIsSyncing(true)
      await onSync()
      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Sync error:', error)
      if (onError && error instanceof Error) {
        onError(error)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [onSync, isSyncing, enableWhenHidden, onError])

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden

      if (!document.hidden) {
        // Tab became visible - sync immediately
        console.log('🔄 Tab visible - syncing immediately...')
        performSync()
      } else {
        console.log('👁️ Tab hidden - pausing sync...')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [performSync])

  // Set up polling interval
  useEffect(() => {
    // Initial sync
    performSync()

    // Start interval
    intervalRef.current = setInterval(() => {
      performSync()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interval, performSync])

  return {
    lastSyncTime,
    isSyncing,
    manualSync: performSync
  }
}


