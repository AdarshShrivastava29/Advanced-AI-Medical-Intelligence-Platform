import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CornerDownLeft,
  Database,
  FileText,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AssistantAvatar, ChatBubble } from '@/components/knowledge/ChatBubble';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useAskAssistant, useChatHistory, useClearChat, useDocuments } from '@/hooks/useKnowledge';
import { useToast } from '@/store/toastStore';
import type { ChatMessageItem } from '@/types/api';

const SUGGESTED_PROMPTS = [
  'What are the radiographic hallmarks of bacterial pneumonia?',
  'Summarise the management pathway for community-acquired pneumonia.',
  'Which findings distinguish viral from bacterial infiltrates?',
  'What follow-up imaging is recommended after treatment?',
];

const GUARDRAILS: [string, string][] = [
  ['Grounded retrieval', 'Passages are retrieved from your documents before any answer is written.'],
  ['Explicit refusal', 'When the literature lacks an answer, the assistant says so instead of guessing.'],
  ['Page-level citations', 'Every grounded response links back to the exact source page.'],
];

export function KnowledgeAssistantPage() {
  const toast = useToast();
  const history = useChatHistory();
  const documents = useDocuments();
  const ask = useAskAssistant();
  const clear = useClearChat();
  const [input, setInput] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = history.data ?? [];
  const indexedDocs = useMemo(
    () => (documents.data?.items ?? []).filter((doc) => doc.status === 'indexed'),
    [documents.data],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingUser, ask.isPending]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || ask.isPending) return;
    setInput('');
    setPendingUser(question);
    try {
      await ask.mutateAsync(question);
    } catch {
      toast.error('The assistant could not respond. Please try again.');
    } finally {
      setPendingUser(null);
    }
  };

  const hasConversation = messages.length > 0 || Boolean(pendingUser);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clinical knowledge"
        title="Knowledge Assistant"
        description="Answers grounded strictly in the medical literature indexed by your department."
        meta={
          <>
            <Badge tone="brand" size="sm">
              <Database size={11} aria-hidden /> {indexedDocs.length} indexed document
              {indexedDocs.length === 1 ? '' : 's'}
            </Badge>
            <Badge tone="green" size="sm" dot>
              Retrieval-grounded
            </Badge>
          </>
        }
        action={
          messages.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Trash2 size={14} />}
              loading={clear.isPending}
              onClick={async () => {
                await clear.mutateAsync();
                toast.info('Conversation cleared');
              }}
            >
              Clear conversation
            </Button>
          )
        }
      />

      <div className="grid gap-5 xl:grid-cols-4">
        {/* ---------------- Conversation ---------------- */}
        <Card padding="none" className="flex h-[calc(100vh-20rem)] min-h-[32rem] flex-col xl:col-span-3">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {history.isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                    <Skeleton className="h-20 flex-1 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : !hasConversation ? (
              <div className="flex h-full flex-col items-center justify-center">
                <EmptyState
                  art="assistant"
                  title="Ask your knowledge base"
                  description={
                    indexedDocs.length > 0
                      ? 'Every answer is retrieved from your indexed literature and returned with page-level citations. The assistant declines when the documents do not contain the answer.'
                      : 'Upload medical PDFs first — the assistant only answers from documents your department has indexed.'
                  }
                  action={
                    indexedDocs.length === 0 ? (
                      <Link to="/documents">
                        <Button leadingIcon={<BookOpen size={16} />}>Manage knowledge base</Button>
                      </Link>
                    ) : undefined
                  }
                />

                {indexedDocs.length > 0 && (
                  <div className="w-full max-w-2xl">
                    <p className="medical-label mb-3 text-center">Suggested questions</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void send(prompt)}
                          className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface-muted p-3 text-left text-sm text-fg-muted transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-brand-500/40 hover:text-fg hover:shadow-card"
                        >
                          <Sparkles
                            size={14}
                            aria-hidden
                            className="mt-0.5 shrink-0 text-brand-700 dark:text-accent-300"
                          />
                          <span className="leading-relaxed">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <AssistantAvatar />
                      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 shadow-card">
                        <span className="flex gap-1" aria-hidden>
                          {[0, 0.16, 0.32].map((delay) => (
                            <motion.span
                              key={delay}
                              className="h-1.5 w-1.5 rounded-full bg-brand-700 dark:bg-accent-400"
                              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                              transition={{ duration: 1.1, repeat: Infinity, delay }}
                            />
                          ))}
                        </span>
                        <span className="text-xs text-fg-muted">Searching your documents…</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-line bg-surface-muted p-3 sm:p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
              className="rounded-2xl border border-line bg-surface p-2 shadow-sm transition-colors focus-within:border-brand-500"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder="Ask about your indexed medical literature…"
                aria-label="Message the knowledge assistant"
                className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
              />
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="hidden items-center gap-1.5 text-[11px] text-fg-subtle sm:flex">
                  <CornerDownLeft size={11} aria-hidden /> Enter to send · Shift + Enter for a new line
                </p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim()}
                  loading={ask.isPending}
                  trailingIcon={!ask.isPending && <SendHorizonal size={15} />}
                  className="ml-auto"
                >
                  Ask
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* ---------------- Side rail ---------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              eyebrow="Retrieval scope"
              title="Indexed sources"
              subtitle="Only these documents can be cited"
              icon={<Database size={19} />}
              action={
                <Link to="/documents">
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </Link>
              }
              divided
            />
            {documents.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 rounded-xl" />
                ))}
              </div>
            ) : indexedDocs.length > 0 ? (
              <ul className="space-y-1.5">
                {indexedDocs.slice(0, 6).map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2.5 rounded-xl bg-surface-muted px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-danger-500/10 text-danger-600 dark:text-danger-500">
                      <FileText size={13} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-fg">{doc.title}</p>
                      <p className="text-[11px] text-fg-subtle nums">
                        {doc.pages} pages · {doc.chunk_count} chunks
                      </p>
                    </div>
                  </li>
                ))}
                {indexedDocs.length > 6 && (
                  <li className="px-3 pt-1 text-[11px] text-fg-subtle">
                    +{indexedDocs.length - 6} more indexed
                  </li>
                )}
              </ul>
            ) : (
              <EmptyState
                art="documents"
                title="Nothing indexed yet"
                description="Upload PDFs to give the assistant something to cite."
                action={
                  <Link to="/documents">
                    <Button size="sm">Upload documents</Button>
                  </Link>
                }
                className="py-8"
              />
            )}
          </Card>

          <Card>
            <CardHeader
              eyebrow="Guardrails"
              title="How answers are produced"
              icon={<ShieldCheck size={19} />}
              divided
            />
            <ul className="space-y-3 text-xs leading-relaxed text-fg-muted">
              {GUARDRAILS.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700 dark:bg-accent-400"
                    aria-hidden
                  />
                  <span>
                    <strong className="font-semibold text-fg">{title}.</strong> {body}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-surface-muted p-3 text-[11px] leading-relaxed text-fg-subtle">
              Decision-support only. The assistant does not diagnose, and its answers must be verified
              against primary sources before informing care.
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
