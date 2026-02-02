'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/hooks/use-auth'
import { Avatar } from '@/components/ui/avatar'
import type { Message } from '@/types/database'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
  memberId: string
  clienteId: string
  brandColor: string
  orgName?: string
  orgLogoUrl?: string | null
  onNewMessage?: () => void
}

interface AutoMessage {
  id: string
  text: string
  isAuto: true
  created_at: string
}

const WELCOME_MESSAGE: AutoMessage = {
  id: 'auto-welcome',
  text: 'Olá! 👋 Como posso ajudar? Estamos aqui para tirar suas dúvidas sobre seus conteúdos.',
  isAuto: true,
  created_at: new Date().toISOString(),
}

const FOLLOWUP_MESSAGE: AutoMessage = {
  id: 'auto-followup',
  text: 'Fique à vontade para enviar sua dúvida! Responderemos o mais breve possível. 😊',
  isAuto: true,
  created_at: new Date().toISOString(),
}

export function ChatSidebar({
  isOpen,
  onClose,
  orgId,
  memberId,
  clienteId,
  brandColor,
  orgName,
  orgLogoUrl,
  onNewMessage,
}: ChatSidebarProps) {
  const { messages, loading, sendMessage } = useChat({ orgId, clienteId, channelType: 'cliente' })
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [showFollowup, setShowFollowup] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMsgCount = useRef(messages.length)
  const followupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedAt = useRef<number>(0)

  // Track when chat is opened
  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true)
    }
    if (isOpen) {
      openedAt.current = Date.now()
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, hasBeenOpened])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showFollowup])

  // Track new messages for unread badge
  useEffect(() => {
    if (messages.length > prevMsgCount.current && !isOpen) {
      onNewMessage?.()
    }
    prevMsgCount.current = messages.length
  }, [messages.length, isOpen, onNewMessage])

  // Followup message after 5 minutes with no team response
  useEffect(() => {
    if (!isOpen) {
      if (followupTimer.current) {
        clearTimeout(followupTimer.current)
        followupTimer.current = null
      }
      return
    }

    // Check if there's any team response since chat opened
    const hasTeamResponse = messages.some(
      m => m.sender_id !== user?.id && new Date(m.created_at).getTime() > openedAt.current
    )

    if (!hasTeamResponse && !showFollowup) {
      followupTimer.current = setTimeout(() => {
        setShowFollowup(true)
      }, 5 * 60 * 1000) // 5 minutes
    }

    return () => {
      if (followupTimer.current) {
        clearTimeout(followupTimer.current)
        followupTimer.current = null
      }
    }
  }, [isOpen, messages, user?.id, showFollowup])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const msg = text.trim()
    setText('')
    await sendMessage(msg)
  }

  const showWelcome = messages.length === 0 && !loading
  const allMessages = messages

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="chat-sidebar-backdrop"
          onClick={onClose}
          style={{ zIndex: 9998 }}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`chat-sidebar-panel ${isOpen ? 'chat-sidebar-open' : ''}`}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="chat-sidebar-header" style={{ backgroundColor: brandColor }}>
          <div className="chat-sidebar-header-info">
            <div className="chat-sidebar-header-avatar">
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt={orgName || 'Equipe'} className="chat-sidebar-logo" />
              ) : (
                <div className="chat-sidebar-logo-fallback" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  💬
                </div>
              )}
            </div>
            <div>
              <div className="chat-sidebar-header-title">Chat com a equipe</div>
              <div className="chat-sidebar-header-status">
                <span className="chat-sidebar-status-dot" />
                Responderemos em breve
              </div>
            </div>
          </div>
          <button onClick={onClose} className="chat-sidebar-close" aria-label="Fechar chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="chat-sidebar-messages">
          {loading ? (
            <div className="chat-sidebar-loading">
              <div className="chat-sidebar-spinner" />
              <span>Carregando mensagens...</span>
            </div>
          ) : (
            <>
              {/* Welcome auto message */}
              {showWelcome && (
                <div className="chat-sidebar-msg-row chat-sidebar-msg-left">
                  <div className="chat-sidebar-msg-avatar">
                    {orgLogoUrl ? (
                      <img src={orgLogoUrl} alt="Equipe" className="chat-sidebar-msg-avatar-img" />
                    ) : (
                      <div className="chat-sidebar-msg-avatar-fallback" style={{ backgroundColor: brandColor }}>
                        🤖
                      </div>
                    )}
                  </div>
                  <div className="chat-sidebar-msg-content">
                    <div className="chat-sidebar-msg-name">Assistente</div>
                    <div className="chat-sidebar-bubble chat-sidebar-bubble-left">
                      {WELCOME_MESSAGE.text}
                    </div>
                  </div>
                </div>
              )}

              {/* Real messages */}
              {allMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                const sender = msg.sender
                return (
                  <div
                    key={msg.id}
                    className={`chat-sidebar-msg-row ${isMe ? 'chat-sidebar-msg-right' : 'chat-sidebar-msg-left'}`}
                  >
                    {!isMe && (
                      <div className="chat-sidebar-msg-avatar">
                        <Avatar
                          name={sender?.display_name || 'Equipe'}
                          src={sender?.avatar_url}
                          size="sm"
                          color={brandColor}
                        />
                      </div>
                    )}
                    <div className="chat-sidebar-msg-content">
                      <div className={`chat-sidebar-msg-meta ${isMe ? 'chat-sidebar-msg-meta-right' : ''}`}>
                        <span className="chat-sidebar-msg-name">
                          {isMe ? 'Você' : sender?.display_name || 'Equipe'}
                        </span>
                        <span className="chat-sidebar-msg-time">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`chat-sidebar-bubble ${isMe ? 'chat-sidebar-bubble-right' : 'chat-sidebar-bubble-left'}`}
                        style={isMe ? { backgroundColor: brandColor } : undefined}
                      >
                        {msg.text}
                      </div>
                    </div>
                    {isMe && (
                      <div className="chat-sidebar-msg-avatar">
                        <Avatar
                          name="Você"
                          src={null}
                          size="sm"
                          color={brandColor}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Followup auto message */}
              {showFollowup && (
                <div className="chat-sidebar-msg-row chat-sidebar-msg-left chat-sidebar-fade-in">
                  <div className="chat-sidebar-msg-avatar">
                    <div className="chat-sidebar-msg-avatar-fallback" style={{ backgroundColor: brandColor }}>
                      🤖
                    </div>
                  </div>
                  <div className="chat-sidebar-msg-content">
                    <div className="chat-sidebar-msg-name">Assistente</div>
                    <div className="chat-sidebar-bubble chat-sidebar-bubble-left">
                      {FOLLOWUP_MESSAGE.text}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="chat-sidebar-footer">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="chat-sidebar-input"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="chat-sidebar-send"
            style={{ backgroundColor: text.trim() ? brandColor : '#D1D5DB' }}
            aria-label="Enviar mensagem"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        {/* Powered by */}
        <div className="chat-sidebar-powered">
          ✨ Powered by Content Studio
        </div>
      </div>

      <style jsx global>{`
        .chat-sidebar-backdrop {
          display: none;
        }

        @media (max-width: 480px) {
          .chat-sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
          }
        }

        .chat-sidebar-panel {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 380px;
          max-height: 560px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .chat-sidebar-open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        @media (max-width: 480px) {
          .chat-sidebar-panel {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            max-height: 85vh;
            border-radius: 16px 16px 0 0;
          }
        }

        .chat-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          color: white;
          flex-shrink: 0;
        }

        .chat-sidebar-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-sidebar-header-avatar {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .chat-sidebar-logo {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
        }

        .chat-sidebar-logo-fallback {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .chat-sidebar-header-title {
          font-size: 15px;
          font-weight: 600;
        }

        .chat-sidebar-header-status {
          font-size: 12px;
          opacity: 0.85;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .chat-sidebar-status-dot {
          width: 8px;
          height: 8px;
          background: #4ADE80;
          border-radius: 50%;
          display: inline-block;
        }

        .chat-sidebar-close {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .chat-sidebar-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .chat-sidebar-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 280px;
          max-height: 360px;
          background: #F9FAFB;
        }

        .chat-sidebar-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #9CA3AF;
          font-size: 13px;
        }

        .chat-sidebar-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #E5E7EB;
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: chat-spin 0.6s linear infinite;
        }

        @keyframes chat-spin {
          to { transform: rotate(360deg); }
        }

        .chat-sidebar-msg-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .chat-sidebar-msg-left {
          justify-content: flex-start;
        }

        .chat-sidebar-msg-right {
          justify-content: flex-end;
        }

        .chat-sidebar-msg-avatar {
          flex-shrink: 0;
        }

        .chat-sidebar-msg-avatar-img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .chat-sidebar-msg-avatar-fallback {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
        }

        .chat-sidebar-msg-content {
          max-width: 75%;
        }

        .chat-sidebar-msg-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
        }

        .chat-sidebar-msg-meta-right {
          justify-content: flex-end;
        }

        .chat-sidebar-msg-name {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
        }

        .chat-sidebar-msg-time {
          font-size: 10px;
          color: #9CA3AF;
        }

        .chat-sidebar-bubble {
          padding: 10px 14px;
          font-size: 14px;
          line-height: 1.45;
          word-break: break-word;
        }

        .chat-sidebar-bubble-left {
          background: white;
          color: #1F2937;
          border-radius: 14px 14px 14px 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        .chat-sidebar-bubble-right {
          color: white;
          border-radius: 14px 14px 4px 14px;
        }

        .chat-sidebar-footer {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #F3F4F6;
          background: white;
          flex-shrink: 0;
        }

        .chat-sidebar-input {
          flex: 1;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #F9FAFB;
        }

        .chat-sidebar-input:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: white;
        }

        .chat-sidebar-input::placeholder {
          color: #9CA3AF;
        }

        .chat-sidebar-send {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          flex-shrink: 0;
        }

        .chat-sidebar-send:not(:disabled):hover {
          transform: scale(1.05);
        }

        .chat-sidebar-send:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .chat-sidebar-powered {
          text-align: center;
          padding: 6px;
          font-size: 10px;
          color: #D1D5DB;
          background: white;
          flex-shrink: 0;
        }

        .chat-sidebar-fade-in {
          animation: chat-fade-in 0.5s ease;
        }

        @keyframes chat-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
