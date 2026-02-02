'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatSidebar } from './chat-sidebar'

interface ChatWidgetProps {
  orgId: string
  memberId: string
  clienteId: string
  brandColor?: string
  orgName?: string
  orgLogoUrl?: string | null
}

const TOOLTIPS = [
  'Como posso ajudar?',
  'Fale com nossa equipe!',
]

export function ChatWidget({ orgId, memberId, clienteId, brandColor, orgName, orgLogoUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipIndex, setTooltipIndex] = useState(0)
  const [shouldPulse, setShouldPulse] = useState(false)

  const color = brandColor || '#2563EB'

  // Tooltip cycle: every 15s, show for 5s
  useEffect(() => {
    if (isOpen) {
      setTooltipVisible(false)
      return
    }

    const interval = setInterval(() => {
      setTooltipIndex(prev => (prev + 1) % TOOLTIPS.length)
      setTooltipVisible(true)

      setTimeout(() => {
        setTooltipVisible(false)
      }, 5000)
    }, 15000)

    // Show first tooltip after 3s
    const initialTimeout = setTimeout(() => {
      setTooltipVisible(true)
      setTimeout(() => setTooltipVisible(false), 5000)
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [isOpen])

  // Pulse animation every 30s
  useEffect(() => {
    if (isOpen) return

    const interval = setInterval(() => {
      setShouldPulse(true)
      setTimeout(() => setShouldPulse(false), 2000)
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
    if (!isOpen) setUnreadCount(0)
  }, [isOpen])

  const handleNewMessage = useCallback(() => {
    if (!isOpen) {
      setUnreadCount(prev => prev + 1)
    }
  }, [isOpen])

  return (
    <>
      {/* Chat Sidebar Panel */}
      <ChatSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        orgId={orgId}
        memberId={memberId}
        clienteId={clienteId}
        brandColor={color}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        onNewMessage={handleNewMessage}
      />

      {/* Floating Widget Container */}
      <div className="chat-widget-container" style={{ zIndex: 9999 }}>
        {/* Tooltip */}
        <div
          className={`chat-widget-tooltip ${tooltipVisible && !isOpen ? 'chat-widget-tooltip-visible' : ''}`}
        >
          <span>{TOOLTIPS[tooltipIndex]}</span>
          <div className="chat-widget-tooltip-arrow" style={{ borderLeftColor: 'white' }} />
        </div>

        {/* Floating Button */}
        <button
          onClick={handleToggle}
          className={`chat-widget-button ${shouldPulse ? 'chat-widget-pulse' : ''}`}
          style={{ backgroundColor: color }}
          aria-label={isOpen ? 'Fechar chat' : 'Abrir chat'}
          title={isOpen ? 'Fechar chat' : 'Abrir chat'}
        >
          {/* Icon transitions */}
          <span className={`chat-widget-icon ${isOpen ? 'chat-widget-icon-hidden' : ''}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className={`chat-widget-icon ${!isOpen ? 'chat-widget-icon-hidden' : ''}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>

          {/* Unread Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="chat-widget-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Scoped CSS */}
      <style jsx global>{`
        .chat-widget-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 640px) {
          .chat-widget-container {
            bottom: 80px;
            right: 16px;
          }
          .chat-widget-button {
            width: 52px;
            height: 52px;
          }
        }

        .chat-widget-button {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }

        .chat-widget-button:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(0, 0, 0, 0.12);
        }

        .chat-widget-button:active {
          transform: scale(0.95);
        }

        .chat-widget-icon {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .chat-widget-icon-hidden {
          opacity: 0;
          transform: rotate(90deg) scale(0.5);
        }

        .chat-widget-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #EF4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 2px solid white;
          animation: chat-badge-bounce 0.4s ease;
        }

        .chat-widget-tooltip {
          position: absolute;
          right: 72px;
          bottom: 12px;
          background: white;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 16px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
          opacity: 0;
          transform: translateX(16px);
          transition: opacity 0.4s ease, transform 0.4s ease;
          pointer-events: none;
        }

        .chat-widget-tooltip-visible {
          opacity: 1;
          transform: translateX(0);
        }

        .chat-widget-tooltip-arrow {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 6px solid white;
        }

        @keyframes chat-widget-pulse-anim {
          0% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 12px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(37, 99, 235, 0); }
        }

        .chat-widget-pulse {
          animation: chat-widget-pulse-anim 1.5s ease-in-out;
        }

        @keyframes chat-badge-bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  )
}
