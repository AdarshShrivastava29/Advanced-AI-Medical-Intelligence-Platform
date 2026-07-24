import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Copy, FileText, ShieldAlert, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { copyText } from '@/lib/download';
import { cn, percent } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import type { ChatMessageItem, Citation } from '@/types/api';

/** Assistant identity mark — a stethoscope glyph, not a generic robot. */
export function AssistantAvatar() {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-700 to-clinical-700 text-white shadow-sm"
      aria-hidden
    >
      <Stethoscope size={18} />
    </span>
  );
}

/** Citation card: filename, page, relevance and the matched snippet. */
function CitationCard({ citation }: { citation: Citation }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-danger-500/10 text-danger-600 dark:text-danger-400">
            <FileText size={14} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{citation.filename}</p>
            <p className="text-[11px] text-fg-subtle">Page {citation.page}</p>
          </div>
        </div>
        <Badge tone="slate" size="sm" className="shrink-0">
          <span className="nums">{percent(citation.score, 0)}</span> match
        </Badge>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">“{citation.snippet}…”</p>
    </li>
  );
}

/** A single chat message (clinician or assistant), with grounded citations. */
export function ChatBubble({ message }: { message: ChatMessageItem }) {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {isUser ? <Avatar name={user?.full_name ?? 'You'} size="sm" /> : <AssistantAvatar />}

      <div className={cn('flex min-w-0 max-w-[min(46rem,86%)] flex-col gap-2', isUser && 'items-end')}>
        {/* Author line */}
        <span className="flex items-center gap-2 px-1 text-[11px] font-medium text-fg-subtle">
          {isUser ? 'You' : 'Clinical assistant'}
          {!isUser && !message.grounded && (
            <Badge tone="amber" size="sm">
              <ShieldAlert size={12} aria-hidden /> Ungrounded
            </Badge>
          )}
        </span>

        {/* Message body */}
        <div
          className={cn(
            'group relative rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'rounded-tr-sm bg-brand-700 text-white'
              : message.grounded
                ? 'rounded-tl-sm border border-line bg-surface text-fg elevation-1'
                : 'rounded-tl-sm border border-warning-500/30 bg-warning-500/[0.07] text-fg',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
          ) : (
            <div
              className="prose prose-sm max-w-none text-fg
                prose-p:my-2 prose-p:leading-relaxed prose-p:text-fg-muted
                prose-headings:font-display prose-headings:text-fg
                prose-strong:text-fg prose-li:my-0.5 prose-li:text-fg-muted
                prose-code:rounded prose-code:bg-surface-sunken prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8125rem] prose-code:before:content-none prose-code:after:content-none
                dark:prose-invert"
            >
              <Markdown remarkPlugins={[remarkGfm]}>{message.message}</Markdown>
            </div>
          )}

          {!isUser && (
            <button
              type="button"
              onClick={async () => {
                const ok = await copyText(message.message);
                if (ok) toast.success('Answer copied');
                else toast.error('Copy failed');
              }}
              aria-label="Copy answer"
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-fg-subtle opacity-0 shadow-sm transition-opacity hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Copy size={14} aria-hidden />
            </button>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations.length > 0 && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setShowSources((value) => !value)}
              aria-expanded={showSources}
              className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-xs font-medium text-brand-700 transition hover:underline dark:text-accent-300"
            >
              <FileText size={12} aria-hidden />
              {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
              <ChevronDown
                size={14}
                aria-hidden
                className={cn('transition-transform duration-200', showSources && 'rotate-180')}
              />
            </button>

            <AnimatePresence initial={false}>
              {showSources && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-2 grid gap-2 overflow-hidden sm:grid-cols-2"
                >
                  {message.citations.map((citation) => (
                    <CitationCard key={`${citation.chunk_id}-${citation.index}`} citation={citation} />
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
