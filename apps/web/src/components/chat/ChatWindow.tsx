import {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  type FormEvent,
} from 'react'
import { useMessages } from '@/hooks/useMessages'
import { useChatRoom } from '@/hooks/useChatRoom'
import { sendMessage } from '@/api/chat'
import { Message } from './Message'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizonal } from 'lucide-react'

interface ChatWindowContextProps {
  outingId: string
}

const ChatWindowContext = createContext<ChatWindowContextProps | null>(null)

function useChatWindowContext() {
  const ctx = useContext(ChatWindowContext)
  if (!ctx) {
    throw new Error('This ctx should be use within ChatWindow')
  } else {
    return ctx
  }
}
function ChatWindow({ outingId, children }: { outingId: string; children: React.ReactNode }) {
  useChatRoom(outingId)
  const contextValue = useMemo(() => ({ outingId }), [outingId])

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <ChatWindowContext.Provider value={contextValue}>{children}</ChatWindowContext.Provider>
    </div>
  )
}

function MessageList() {
  const { outingId } = useChatWindowContext()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(outingId)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Pages are newest-first per page; reverse the flattened list for oldest-first display
  const messages = (data?.pages ?? []).flatMap(p => p.messages).reverse()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {hasNextPage && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
          </Button>
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No messages yet. Say hello!
        </p>
      )}

      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}

      <div ref={bottomRef} />
    </div>
  )
}

function Input() {
  const { outingId } = useChatWindowContext()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(outingId, { body: body.trim() })
      setBody('')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2 items-end">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message… (Enter to send, Shift+Enter for new line)"
        className="resize-none min-h-[40px] max-h-[120px]"
        rows={1}
      />
      <Button type="submit" size="icon" disabled={!body.trim() || sending}>
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  )
}

ChatWindow.MessageList = MessageList
ChatWindow.Input = Input

export { ChatWindow }
