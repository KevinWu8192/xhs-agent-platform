'use client'

// ─────────────────────────────────────────────────────────────
//  useXHSSession — XHS login session hook
//
//  Encapsulates:
//    • Initial status check on mount
//    • QR modal open/close state
//    • Status refresh after successful login
//
//  Usage:
//    const { status, isLoading, refreshStatus, openQRModal, QRModal } =
//      useXHSSession(userId)
//
//    Then render {QRModal} anywhere in the JSX tree.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, createElement } from 'react'
import { XHSQRModal } from '@/components/xhs-qr-modal'

export type XHSSessionStatus = 'unknown' | 'logged_in' | 'not_logged_in'

export interface UseXHSSessionReturn {
  /** Current login status */
  status: XHSSessionStatus
  /** True while the initial status check is in flight */
  isLoading: boolean
  /** Re-fetch status from the server */
  refreshStatus: () => Promise<void>
  /** Open the QR login modal */
  openQRModal: () => void
  /** Render this element somewhere in your JSX tree to mount the modal */
  QRModal: React.ReactElement | null
}

export function useXHSSession(userId: string): UseXHSSessionReturn {
  const [status, setStatus] = useState<XHSSessionStatus>('unknown')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ── Fetch current status ───────────────────────────────────

  const refreshStatus = useCallback(async () => {
    if (!userId) {
      // userId not yet loaded — stay in loading state, don't flash 'not_logged_in'
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/xhs/status?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) {
        setStatus('not_logged_in')
        return
      }
      const data = await res.json()
      setStatus(data.status === 'logged_in' ? 'logged_in' : 'not_logged_in')
    } catch {
      // Network error; default to not_logged_in so we show the login prompt
      setStatus('not_logged_in')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Run once on mount (or when userId changes)
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // ── Modal handlers ─────────────────────────────────────────

  const openQRModal = useCallback(() => setIsModalOpen(true), [])
  const closeQRModal = useCallback(() => setIsModalOpen(false), [])

  const handleLoginSuccess = useCallback(() => {
    setStatus('logged_in')
    setIsModalOpen(false)
  }, [])

  // ── Build the modal element ────────────────────────────────

  const QRModal = userId
    ? createElement(XHSQRModal, {
        userId,
        isOpen: isModalOpen,
        onClose: closeQRModal,
        onLoginSuccess: handleLoginSuccess,
      })
    : null

  return {
    status,
    isLoading,
    refreshStatus,
    openQRModal,
    QRModal,
  }
}

export default useXHSSession
