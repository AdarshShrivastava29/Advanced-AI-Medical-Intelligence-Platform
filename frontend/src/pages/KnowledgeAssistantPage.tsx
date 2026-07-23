import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessagesSquare, SendHorizonal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ChatBubble } from '@/components/knowledge/ChatBubble';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useAskAssistant, useChatHistory, useClearChat } from '@/hooks/useKnowledge';
import { useToast } from '@/store/toastStore';
import type { ChatMessageItem } from '@/types/api';

export function KnowledgeAssistantPage() {
  const toast = useToast();
  const history = useChatHistory();
  const ask = useAskAssistant();
  const clear = useClearChat();
  const [input, setInput] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = history.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingUser, ask.isPending]);

  const send = async () => {
    const text = input.trim();
    if (!text || ask.isPending) return;
    setInput('');
    setPendingUser(text);
    try {
      await ask.mutateAsync(text);
    } catch {
      toast.error('The assistant could not respond. Please try again.');
    } finally {
      setPendingUser(null);
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Knowledge Assistant"
        description="Answers grounded only in your uploaded medical documents."
        action={
          messages.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await clear.mutateAsync();
                toast.info('Conversation cleared');
              }}
            >
              <Trash2 size={14} /> Clear
            </Button>
          )
        }
      />

      <Card className="flex h-[calc(100vh-16rem)] min-h-[26rem] flex-col p-0">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {history.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : messages.length === 0 && !pendingUser ? (
            <EmptyState
              title="Ask about your knowledge base"
              description="Upload medical PDFs, then ask a question. Answers are grounded in those documents with citations."
              icon={<MessagesSquare size={26} />}
              action={<Link to="/documents"><Button size="sm">Manage documents</Button></Link>}
            />
          ) : (
            <>
              {messages.map((message: ChatMessageItem) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {pendingUser && (
                <ChatBubble
                  message={{
                    id: 'pending-user',
                    role: 'user',
                    message: pendingUser,
                    grounded: true,
                    citations: [],
                    created_at: '',
                  }}
                />
              )}
              <AnimatePresence>
                {ask.isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300">
                      <Bot size={16} />
                    </span>
                    <div className="glass-card flex gap-1 px-4 py-3">
                      {[0, 0.15, 0.3].map((delay) => (
                        <motion.span
                          key={delay}
                          className="h-2 w-2 rounded-full bg-slate-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2 border-t border-slate-200/60 p-4 dark:border-white/10"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents…"
            aria-label="Message the knowledge assistant"
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white/70 px-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/5"
          />
          <Button type="submit" disabled={!input.trim()} loading={ask.isPending}>
            <SendHorizonal size={16} />
          </Button>
        </form>
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        The assistant only uses your uploaded documents and refuses when they lack the answer. Decision-support, not a diagnosis.
      </p>
    </PageTransition>
  );
}
