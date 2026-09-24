'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logViolation } from '@/lib/anti-cheat/violations'
import AntiCheatOverlay from './AntiCheatOverlay'

interface AntiCheatGuardProps {
  children: React.ReactNode
  teamId: string
  teamName: string
  roundName: string
}

type ViolationType =
  | 'fullscreen_exit'
  | 'tab_switch'
  | 'window_blur'
  | 'devtools_open'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'cut_attempt'
  | 'right_click'
  | 'keyboard_shortcut'
  | 'print_attempt'
  | 'select_attempt'
  | 'drag_attempt'
  | 'context_menu'

export default function AntiCheatGuard({
  children,
  teamId,
  teamName,
  roundName,
}: AntiCheatGuardProps) {
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [overlayType, setOverlayType] = useState<ViolationType>('fullscreen_exit')
  const [violationCount, setViolationCount] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenSupported, setFullscreenSupported] = useState(true)

  const violationCountRef = useRef(0)
  const overlayVisibleRef = useRef(false)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fullscreenRetryRef = useRef<NodeJS.Timeout | null>(null)
  const devtoolsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastWindowSizeRef = useRef({
    width: typeof window !== 'undefined' ? window.outerWidth : 0,
    height: typeof window !== 'undefined' ? window.outerHeight : 0,
  })
  const guardMountedRef = useRef(true)
  const fullscreenRequestInProgressRef = useRef(false)

  // ─── FULLSCREEN ──────────────────────────────────────────────────────────────

  const requestFullscreen = useCallback(async () => {
    if (fullscreenRequestInProgressRef.current) return
    fullscreenRequestInProgressRef.current = true

    const el = document.documentElement

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen()
      } else if ((el as any).mozRequestFullScreen) {
        await (el as any).mozRequestFullScreen()
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen()
      } else {
        setFullscreenSupported(false)
      }
    } catch (err) {
      // Fullscreen blocked (mobile / iframe / browser policy)
      setFullscreenSupported(false)
    } finally {
      fullscreenRequestInProgressRef.current = false
    }
  }, [])

  const isCurrentlyFullscreen = useCallback(() => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
  }, [])

  // ─── VIOLATION HANDLER ───────────────────────────────────────────────────────

  const startFullscreenCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setCountdown(3)

    let count = 3
    countdownIntervalRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)

      if (count <= 0) {
        clearInterval(countdownIntervalRef.current!)
        countdownIntervalRef.current = null
        requestFullscreen()
        // Overlay stays until fullscreen is confirmed
        fullscreenRetryRef.current = setTimeout(() => {
          if (isCurrentlyFullscreen() && guardMountedRef.current) {
            setOverlayVisible(false)
            overlayVisibleRef.current = false
          } else {
            // Still not fullscreen — retry silently
            requestFullscreen()
          }
        }, 800)
      }
    }, 1000)
  }, [requestFullscreen, isCurrentlyFullscreen])

  const triggerViolation = useCallback(
    async (type: ViolationType) => {
      if (!guardMountedRef.current) return

      // Deduplicate rapid repeat violations of same type
      violationCountRef.current += 1
      const newCount = violationCountRef.current
      setViolationCount(newCount)
      setOverlayType(type)
      setOverlayVisible(true)
      overlayVisibleRef.current = true

      // Log to Supabase
      await logViolation({ teamId, violationType: type, roundName })

      // For fullscreen: start countdown to auto re-enter
      if (type === 'fullscreen_exit') {
        startFullscreenCountdown()
      }
    },
    [teamId, roundName, startFullscreenCountdown]
  )

  const handleFullscreenChange = useCallback(() => {
    if (!guardMountedRef.current) return

    const nowFullscreen = isCurrentlyFullscreen()
    setIsFullscreen(nowFullscreen)

    if (!nowFullscreen && fullscreenSupported) {
      triggerViolation('fullscreen_exit')
    }
  }, [isCurrentlyFullscreen, fullscreenSupported, triggerViolation])

  const dismissOverlay = useCallback(() => {
    if (overlayType === 'fullscreen_exit') return // Cannot dismiss fullscreen overlay manually
    setOverlayVisible(false)
    overlayVisibleRef.current = false
  }, [overlayType])

  // ─── TAB / VISIBILITY ────────────────────────────────────────────────────────

  const handleVisibilityChange = useCallback(() => {
    if (!guardMountedRef.current) return
    if (document.hidden) {
      triggerViolation('tab_switch')
    }
  }, [triggerViolation])

  const handleWindowBlur = useCallback(() => {
    if (!guardMountedRef.current) return
    // Small delay to avoid false positive from fullscreen change
    setTimeout(() => {
      if (!document.hasFocus() && guardMountedRef.current) {
        triggerViolation('window_blur')
      }
    }, 200)
  }, [triggerViolation])

  const handleWindowFocus = useCallback(() => {
    // When window regains focus: if overlay is for tab_switch or window_blur, dismiss after short delay
    if (
      overlayVisibleRef.current &&
      (overlayType === 'tab_switch' || overlayType === 'window_blur')
    ) {
      setTimeout(() => {
        if (guardMountedRef.current) {
          setOverlayVisible(false)
          overlayVisibleRef.current = false
        }
      }, 1500)
    }
  }, [overlayType])

  // ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────

  const BLOCKED_KEYS = new Set([
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
    'PrintScreen',
  ])

  const BLOCKED_CTRL_KEYS = new Set([
    'a','A','c','C','v','V','x','X',
    'u','U',  // view-source
    's','S',  // save
    'p','P',  // print
    'f','F',  // find
    'h','H',  // history
    'j','J',  // downloads
    'k','K',  // search (Chrome)
    'l','L',  // address bar
    'n','N',  // new window
    'r','R',  // reload (allow? No — could be used to reset quiz)
    'w','W',  // close tab
    't','T',  // new tab
    'b','B',  // bookmarks
    'g','G',  // find next
    'e','E',  // search
  ])

  const BLOCKED_SHIFT_CTRL_KEYS = new Set([
    'I','i',  // DevTools
    'J','j',  // Console
    'C','c',  // Inspector
    'K','k',  // Network
    'M','m',  // Mobile
    'P','p',  // Command palette
    'S','s',  // Screenshot
  ])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Block all function keys
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'F12') triggerViolation('devtools_open')
        if (e.key === 'F11') {
          // F11 exits fullscreen in some browsers — prevent and re-enter
          e.preventDefault()
        }
        if (e.key === 'PrintScreen') triggerViolation('keyboard_shortcut')
        return false
      }

      // Block Ctrl+? combinations
      if (e.ctrlKey && !e.altKey) {
        if (BLOCKED_CTRL_KEYS.has(e.key)) {
          e.preventDefault()
          e.stopPropagation()
          if (['c','C'].includes(e.key)) triggerViolation('copy_attempt')
          else if (['v','V'].includes(e.key)) triggerViolation('paste_attempt')
          else if (['x','X'].includes(e.key)) triggerViolation('cut_attempt')
          else if (['p','P'].includes(e.key)) triggerViolation('print_attempt')
          else triggerViolation('keyboard_shortcut')
          return false
        }

        // Ctrl+Shift combinations
        if (e.shiftKey && BLOCKED_SHIFT_CTRL_KEYS.has(e.key)) {
          e.preventDefault()
          e.stopPropagation()
          triggerViolation('devtools_open')
          return false
        }
      }

      // Block Cmd+? on Mac
      if (e.metaKey) {
        if (BLOCKED_CTRL_KEYS.has(e.key)) {
          e.preventDefault()
          e.stopPropagation()
          if (['c','C'].includes(e.key)) triggerViolation('copy_attempt')
          else if (['v','V'].includes(e.key)) triggerViolation('paste_attempt')
          else if (['x','X'].includes(e.key)) triggerViolation('cut_attempt')
          else triggerViolation('keyboard_shortcut')
          return false
        }
      }

      // Alt+Tab cannot be blocked (OS-level) but window blur covers it
      // Alt+F4 cannot be blocked but that closes the window entirely
    },
    [triggerViolation]
  )

  // ─── CLIPBOARD EVENTS ────────────────────────────────────────────────────────

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      triggerViolation('copy_attempt')
    },
    [triggerViolation]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      triggerViolation('paste_attempt')
    },
    [triggerViolation]
  )

  const handleCut = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      triggerViolation('cut_attempt')
    },
    [triggerViolation]
  )

  // ─── CONTEXT MENU ────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      triggerViolation('right_click')
      return false
    },
    [triggerViolation]
  )

  // ─── TEXT SELECTION ──────────────────────────────────────────────────────────

  const handleSelectStart = useCallback((e: Event) => {
    e.preventDefault()
    return false
  }, [])

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      triggerViolation('drag_attempt')
      return false
    },
    [triggerViolation]
  )

  // ─── DEVTOOLS DETECTION ──────────────────────────────────────────────────────

  const detectDevTools = useCallback(() => {
    // Method 1: window size differential
    const widthDiff = window.outerWidth - window.innerWidth
    const heightDiff = window.outerHeight - window.innerHeight

    // DevTools open typically creates >100px difference
    // Account for browser chrome (bookmarks bar etc) with higher threshold
    if (widthDiff > 160 || heightDiff > 160) {
      triggerViolation('devtools_open')
      return
    }

    // Method 2: console timing trick
    const startTime = performance.now()
    // eslint-disable-next-line no-console
    console.log('%c', 'font-size:0')
    const endTime = performance.now()
    // DevTools console causes significant timing delay
    if (endTime - startTime > 100) {
      triggerViolation('devtools_open')
    }
  }, [triggerViolation])

  // ─── PRINT DETECTION ─────────────────────────────────────────────────────────

  const handleBeforePrint = useCallback(
    (e: Event) => {
      e.preventDefault()
      triggerViolation('print_attempt')
      // Attempt to cancel print dialog
      window.stop()
    },
    [triggerViolation]
  )

  // ─── MOUNT / UNMOUNT ─────────────────────────────────────────────────────────

  useEffect(() => {
    guardMountedRef.current = true

    // 1. Enter fullscreen immediately on mount
    requestFullscreen()

    // 2. Fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    // 3. Visibility / tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 4. Window focus / blur
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    // 5. Keyboard
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    // 6. Clipboard
    document.addEventListener('copy', handleCopy, { capture: true })
    document.addEventListener('paste', handlePaste, { capture: true })
    document.addEventListener('cut', handleCut, { capture: true })

    // 7. Context menu
    document.addEventListener('contextmenu', handleContextMenu, { capture: true })

    // 8. Selection & drag
    document.addEventListener('selectstart', handleSelectStart, { capture: true })
    document.addEventListener('dragstart', handleDragStart, { capture: true })

    // 9. Print
    window.addEventListener('beforeprint', handleBeforePrint)
    window.onbeforeprint = handleBeforePrint as any

    // 10. DevTools polling (every 2 seconds)
    devtoolsIntervalRef.current = setInterval(detectDevTools, 2000)

    return () => {
      guardMountedRef.current = false

      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('copy', handleCopy, { capture: true })
      document.removeEventListener('paste', handlePaste, { capture: true })
      document.removeEventListener('cut', handleCut, { capture: true })
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true })
      document.removeEventListener('selectstart', handleSelectStart, { capture: true })
      document.removeEventListener('dragstart', handleDragStart, { capture: true })
      window.removeEventListener('beforeprint', handleBeforePrint)

      if (devtoolsIntervalRef.current) clearInterval(devtoolsIntervalRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      if (fullscreenRetryRef.current) clearTimeout(fullscreenRetryRef.current)
    }
  }, [
    requestFullscreen,
    handleFullscreenChange,
    handleVisibilityChange,
    handleWindowBlur,
    handleWindowFocus,
    handleKeyDown,
    handleCopy,
    handlePaste,
    handleCut,
    handleContextMenu,
    handleSelectStart,
    handleDragStart,
    handleBeforePrint,
    detectDevTools,
  ])

  // ─── CSS INJECTION (user-select none globally while mounted) ─────────────────

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'anti-cheat-styles'
    style.innerHTML = `
      *,
      *::before,
      *::after {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      input,
      textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }

      ::selection {
        background: transparent !important;
      }

      ::-moz-selection {
        background: transparent !important;
      }

      img {
        -webkit-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }

      @media print {
        html, body {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existing = document.getElementById('anti-cheat-styles')
      if (existing) existing.remove()
    }
  }, [])

  return (
    <>
      {overlayVisible && (
        <AntiCheatOverlay
          type={overlayType}
          violationCount={violationCount}
          countdown={countdown}
          onDismiss={dismissOverlay}
          teamName={teamName}
        />
      )}
      <div
        style={{ pointerEvents: overlayVisible ? 'none' : 'auto' }}
        onCopy={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </>
  )
}
