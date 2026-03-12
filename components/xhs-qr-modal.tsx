'use client'

// ─────────────────────────────────────────────────────────────
//  XHSQRModal — 小红书二维码登录弹窗
//  Shows a scannable QR code, polls login status, handles
//  all states: loading / qr_ready / scanning / logged_in /
//  expired / error
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────

type ModalStatus =
  | 'loading'
  | 'qr_ready'
  | 'scanning'
  | 'logged_in'
  | 'expired'
  | 'error'

export interface XHSQRModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: () => void
}

// QR code expires after 3 minutes (180 seconds)
const QR_TTL_SECONDS = 180
const POLL_INTERVAL_MS = 2000

// ─────────────────────────────────────────────────────────────

export function XHSQRModal({ userId, isOpen, onClose, onLoginSuccess }: XHSQRModalProps) {
  const [status, setStatus] = useState<ModalStatus>('loading')
  const [qrImageBase64, setQrImageBase64] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL_SECONDS)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Helpers ────────────────────────────────────────────────

  function clearPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  function clearCountdown() {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }
  function clearAutoClose() {
    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null }
  }
  function clearAll() {
    clearPolling()
    clearCountdown()
    clearAutoClose()
  }

  // ── Fetch QR code ──────────────────────────────────────────

  const fetchQRCode = useCallback(async () => {
    setStatus('loading')
    setQrImageBase64(null)
    setSessionId(null)
    setErrorMessage(null)
    setSecondsLeft(QR_TTL_SECONDS)
    clearAll()

    // Reset server session state before requesting new QR
    try {
      await fetch(`/api/xhs/reset?user_id=${encodeURIComponent(userId)}`)
    } catch {
      // Non-fatal — continue even if reset fails
    }

    try {
      const res = await fetch('/api/xhs/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`获取二维码失败 (${res.status}): ${text}`)
      }

      const data = await res.json()

      if (data.status === 'already_logged_in') {
        setStatus('logged_in')
        autoCloseRef.current = setTimeout(() => {
          onLoginSuccess()
          onClose()
        }, 1500)
        return
      }

      if (data.status === 'qr_ready') {
        setQrImageBase64(data.qr_image_base64)
        setSessionId(data.session_id ?? null)
        setStatus('qr_ready')
        startCountdown()
        startPolling()
        return
      }

      throw new Error('意外的服务器响应')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : '获取二维码时出现未知错误')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Countdown ──────────────────────────────────────────────

  function startCountdown() {
    clearCountdown()
    setSecondsLeft(QR_TTL_SECONDS)
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearCountdown()
          clearPolling()
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Polling login status ───────────────────────────────────

  function startPolling() {
    clearPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/xhs/status?user_id=${encodeURIComponent(userId)}`)
        if (!res.ok) return

        const data = await res.json()
        const loginStatus: string = data.status

        if (loginStatus === 'pending') {
          // User has scanned but not yet confirmed
          setStatus('scanning')
        } else if (loginStatus === 'logged_in') {
          clearAll()
          setStatus('logged_in')
          autoCloseRef.current = setTimeout(() => {
            onLoginSuccess()
            onClose()
          }, 1500)
        } else if (loginStatus === 'expired') {
          clearAll()
          setStatus('expired')
        }
        // 'not_started' — keep waiting, no state change
      } catch {
        // Network hiccup; keep polling
      }
    }, POLL_INTERVAL_MS)
  }

  // ── Lifecycle ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      // Reset ALL internal state synchronously before fetching so the modal
      // never briefly shows stale state from a previous session on reopen.
      clearAll()
      setStatus('loading')
      setQrImageBase64(null)
      setSessionId(null)
      setErrorMessage(null)
      setSecondsLeft(QR_TTL_SECONDS)
      fetchQRCode()
    } else {
      clearAll()
      // Reset server-side session on modal close
      if (userId) {
        fetch(`/api/xhs/reset?user_id=${encodeURIComponent(userId)}`).catch(() => {})
      }
      // Reset state so next open starts fresh
      setStatus('loading')
      setQrImageBase64(null)
      setSessionId(null)
      setErrorMessage(null)
      setSecondsLeft(QR_TTL_SECONDS)
    }
    return () => clearAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => clearAll(), [])

  // ── Early return if not open ───────────────────────────────

  if (!isOpen) return null

  // ── Countdown display ──────────────────────────────────────

  const countdownMinutes = Math.floor(secondsLeft / 60)
  const countdownSeconds = secondsLeft % 60
  const countdownLabel = `${countdownMinutes}:${String(countdownSeconds).padStart(2, '0')} 后过期`

  // ── Render ─────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white shadow-card-lg overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            {/* XHS logo placeholder */}
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-base font-bold leading-none">
              小
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">小红书登录</p>
              <p className="text-xs text-white/75 leading-tight">扫码授权，获取真实数据</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white text-lg leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col items-center px-6 py-8 gap-5">

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-400 rounded-full animate-spin" />
              <p className="text-sm text-neutral-500">正在获取二维码...</p>
            </div>
          )}

          {/* QR Ready */}
          {status === 'qr_ready' && qrImageBase64 && (
            <>
              {/* QR image */}
              <div className="w-[200px] h-[200px] bg-white rounded-2xl p-3 shadow-card border border-neutral-100 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${qrImageBase64}`}
                  alt="小红书登录二维码"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Instruction */}
              <p className="text-sm font-medium text-neutral-700 text-center">
                请用小红书 App 扫码登录
              </p>

              {/* Countdown */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse-gentle" />
                <span>{countdownLabel}</span>
              </div>

              {/* Session ID hint (hidden from main UX but useful for debug) */}
              {sessionId && (
                <p className="hidden text-2xs text-neutral-300">{sessionId}</p>
              )}
            </>
          )}

          {/* Scanning — user scanned but not yet confirmed */}
          {status === 'scanning' && (
            <div className="flex flex-col items-center gap-4 py-6">
              {/* Dimmed QR with overlay */}
              {qrImageBase64 && (
                <div className="relative w-[200px] h-[200px] bg-white rounded-2xl p-3 shadow-card border border-neutral-100 opacity-40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${qrImageBase64}`}
                    alt="二维码"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-400 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
                <p className="text-sm font-medium text-neutral-700">扫码成功，等待确认...</p>
                <p className="text-xs text-neutral-400">请在小红书 App 中点击确认登录</p>
              </div>
            </div>
          )}

          {/* Logged in */}
          {status === 'logged_in' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="text-5xl">✅</span>
              <p className="text-base font-semibold text-rose-500">登录成功！</p>
              <p className="text-xs text-neutral-400">正在跳转...</p>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl">
                ⏱️
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700">二维码已过期</p>
                <p className="text-xs text-neutral-400 mt-1">请重新获取二维码后扫码登录</p>
              </div>
              <button
                onClick={fetchQRCode}
                className={[
                  'h-9 px-5 rounded-xl',
                  'bg-gradient-to-r from-rose-500 to-pink-500',
                  'text-white text-sm font-medium',
                  'shadow-sm hover:shadow-glow-sm',
                  'transition-all duration-150 active:scale-[0.98]',
                ].join(' ')}
              >
                重新获取
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">
                ⚠️
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700">获取二维码失败</p>
                {errorMessage && (
                  <p className="text-xs text-neutral-400 mt-1 max-w-[220px] leading-relaxed">{errorMessage}</p>
                )}
              </div>
              <button
                onClick={fetchQRCode}
                className={[
                  'h-9 px-5 rounded-xl',
                  'bg-gradient-to-r from-rose-500 to-pink-500',
                  'text-white text-sm font-medium',
                  'shadow-sm hover:shadow-glow-sm',
                  'transition-all duration-150 active:scale-[0.98]',
                ].join(' ')}
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default XHSQRModal
