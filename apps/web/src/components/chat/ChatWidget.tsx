import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Minus } from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { ChatWindow } from './ChatWindow'

interface ChatWidgetProps {
  outingId: string
}

export function ChatWidget({ outingId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const isOpenRef = useRef(isOpen)

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setUnread(0)
  }, [isOpen])

  useEffect(() => {
    const socket = getSocket()
    function onMessage() {
      if (!isOpenRef.current) setUnread(n => n + 1)
    }
    socket.on('chat:message', onMessage)
    return () => {
      socket.off('chat:message', onMessage)
    }
  }, [])

  return (
    <>
      {/* Panel — always mounted so socket room stays joined and cache stays warm */}
      <div
        className={`fixed bottom-20 right-6 z-50 w-80 sm:w-96 shadow-2xl rounded-2xl overflow-hidden border bg-background flex flex-col transition-all duration-200
          ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        style={{ height: '480px' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Group Chat</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Chat body */}
        <div className="flex-1 min-h-0">
          <ChatWindow outingId={outingId}>
            <ChatWindow.MessageList />
            <ChatWindow.Input />
          </ChatWindow>
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center"
        style={{ height: '52px', width: '52px' }}
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}

        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </>
  )
}
