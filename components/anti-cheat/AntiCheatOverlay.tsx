'use client'

import { useState } from 'react'

interface AntiCheatOverlayProps {
  type: string
  violationCount: number
  countdown: number
  onDismiss: () => void
  teamName: string
}

const VIOLATION_CONTENT: Record<string, {
  icon: string
  title: string
  messages: string[]
  dismissable: boolean
}> = {
  fullscreen_exit: {
    icon: '🖥️',
    title: 'Fullscreen Exited',
    messages: [
      'Get back in there. The exam is watching.',
      'Trying to escape? The vault remembers.',
      'Fullscreen is not optional. Nice try though.',
    ],
    dismissable: false,
  },
  tab_switch: {
    icon: '👀',
    title: 'Tab Switch Detected',
    messages: [
      'We saw that. The algorithm never blinks.',
      'Tab switching during an exam? Bold move.',
      'Other tabs cannot help you. Trust your brain.',
    ],
    dismissable: true,
  },
  window_blur: {
    icon: '🚨',
    title: 'Window Lost Focus',
    messages: [
      'Eyes on the screen, agent.',
      'The exam noticed you left. It is not happy.',
      'Focus lost. Violation logged. Carry on.',
    ],
    dismissable: true,
  },
  devtools_open: {
    icon: '🔍',
    title: 'DevTools Detected',
    messages: [
      'DevTools at a coding competition? Points for creativity.',
      'Inspecting the source will not save your score.',
      'The answer is not in the console. We checked.',
    ],
    dismissable: true,
  },
  copy_attempt: {
    icon: '📋',
    title: 'Copy Attempt Blocked',
    messages: [
      'Ctrl+C does nothing here. Carry on.',
      'The clipboard is on vacation during exams.',
      'Copy blocked. Your integrity is intact.',
    ],
    dismissable: true,
  },
  paste_attempt: {
    icon: '📌',
    title: 'Paste Attempt Blocked',
    messages: [
      'Nothing to paste here. You got this.',
      'Paste blocked. Think for yourself.',
      'The answer cannot be pasted. It must be earned.',
    ],
    dismissable: true,
  },
  cut_attempt: {
    icon: '✂️',
    title: 'Cut Attempt Blocked',
    messages: [
      'Nothing to cut here.',
      'Scissors not allowed in this exam room.',
      'Cut blocked. Move along.',
    ],
    dismissable: true,
  },
  right_click: {
    icon: '🖱️',
    title: 'Right-Click Blocked',
    messages: [
      'The context menu is in a meeting.',
      'Right-click is disabled. Left-click still works.',
      'No menu for you. Back to the questions.',
    ],
    dismissable: true,
  },
  keyboard_shortcut: {
    icon: '⌨️',
    title: 'Shortcut Blocked',
    messages: [
      'That shortcut is blocked. The keyboard is watching.',
      'Shortcut denied. Use your brain instead.',
      'Key combo blocked. Violation logged.',
    ],
    dismissable: true,
  },
  print_attempt: {
    icon: '🖨️',
    title: 'Print Attempt Blocked',
    messages: [
      'Printing the exam? Impressive audacity.',
      'Print blocked. The paper cannot help you.',
      'No printing allowed. Digital only.',
    ],
    dismissable: true,
  },
  drag_attempt: {
    icon: '🚫',
    title: 'Drag Attempt Blocked',
    messages: [
      'Dragging is disabled during the exam.',
      'No dragging allowed. Type your answers.',
      'Drag blocked.',
    ],
    dismissable: true,
  },
}

export default function AntiCheatOverlay({
  type,
  violationCount,
  countdown,
  onDismiss,
  teamName,
}: AntiCheatOverlayProps) {
  const [messageIndex] = useState(() => Math.floor(Math.random() * 3))
  const content = VIOLATION_CONTENT[type] ?? VIOLATION_CONTENT['keyboard_shortcut']
  const isFullscreen = type === 'fullscreen_exit'

  const warningLevel =
    violationCount >= 5
      ? 'danger'
      : violationCount >= 3
      ? 'warning'
      : 'info'

  const warningColors = {
    info: { bg: '#1e3a5f', border: '#3b82f6', badge: '#dbeafe', badgeText: '#1e40af' },
    warning: { bg: '#7c2d12', border: '#f97316', badge: '#ffedd5', badgeText: '#9a3412' },
    danger: { bg: '#450a0a', border: '#ef4444', badge: '#fee2e2', badgeText: '#991b1b' },
  }

  const colors = warningColors[warningLevel]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: colors.bg,
          border: `3px solid ${colors.border}`,
          borderRadius: '20px',
          padding: '48px 40px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          animation: 'overlayShake 0.4s ease',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: '64px', marginBottom: '20px', lineHeight: 1 }}>
          {content.icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 900,
            color: 'white',
            marginBottom: '10px',
            letterSpacing: '-0.02em',
          }}
        >
          {content.title}
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          {content.messages[messageIndex]}
        </div>

        {/* Violation count badge */}
        <div
          style={{
            background: colors.badge,
            color: colors.badgeText,
            borderRadius: '10px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '24px',
            display: 'inline-block',
          }}
        >
          {violationCount >= 5
            ? `⚠️ WARNING: ${violationCount} violations — Team flagged to admin`
            : violationCount >= 3
            ? `⚠️ Violation ${violationCount} — Admin has been alerted`
            : `Violation #${violationCount} — Logged to admin`}
        </div>

        {/* Fullscreen countdown */}
        {isFullscreen && (
          <div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#60a5fa',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            >
              {countdown}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '0',
              }}
            >
              Re-entering fullscreen automatically...
            </div>
          </div>
        )}

        {/* Dismiss button (non-fullscreen violations) */}
        {content.dismissable && (
          <button
            onClick={onDismiss}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              borderRadius: '10px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Got it, back to exam 😇
          </button>
        )}

        {/* Team name small */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace',
          }}
        >
          TEAM: {teamName ? teamName.toUpperCase() : 'UNKNOWN'} · VIOLATION LOGGED
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes overlayShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-10px); }
          30%  { transform: translateX(10px); }
          45%  { transform: translateX(-8px); }
          60%  { transform: translateX(8px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
