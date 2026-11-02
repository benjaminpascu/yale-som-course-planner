import { useCallback, useEffect, useRef, useState } from 'react'
import {
  COMPARE_STORAGE_KEY,
  loadCompareStore,
  persistCompareStore,
} from '../../lib/compareStorage'

/**
 * Compare Courses state, saved to localStorage on every change. Reloads when
 * another tab saves, so two open tabs don't overwrite each other. If the saved
 * data comes from a newer version of the app, this page stops saving (so it
 * can't overwrite that data) and asks the student to reload.
 */
export function useCompareStore() {
  const [initial] = useState(() => loadCompareStore())
  const [store, setStore] = useState(initial.store)
  const [recovered, setRecovered] = useState(initial.recovered)
  const [saveFailed, setSaveFailed] = useState(false)
  const [outdated, setOutdated] = useState(Boolean(initial.newerVersion))
  const outdatedRef = useRef(Boolean(initial.newerVersion))
  const storeRef = useRef(initial.store)

  const update = useCallback((fn) => {
    if (outdatedRef.current) return
    const next = fn(storeRef.current)
    if (next === storeRef.current) return
    storeRef.current = next
    setStore(next)
    setSaveFailed(!persistCompareStore(next))
  }, [])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== COMPARE_STORAGE_KEY) return
      const { store: latest, recovered: unreadable, newerVersion } = loadCompareStore()
      if (newerVersion) {
        outdatedRef.current = true
        setOutdated(true)
        return
      }
      // Never swap in an empty store because the other tab's data couldn't be read.
      if (unreadable) return
      storeRef.current = latest
      setStore(latest)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const dismissRecovered = useCallback(() => setRecovered(false), [])

  return { store, update, saveFailed, recovered, dismissRecovered, outdated }
}
