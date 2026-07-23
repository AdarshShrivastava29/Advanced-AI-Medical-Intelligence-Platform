import { motion } from 'framer-motion';
import { Bot, FileText, User } from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';
import type { ChatMessageItem } from '@/types/api';

/** A single chat message bubble (user or assistant), with optional citations. */
export function ChatBubble({ message }: { message: ChatMessageItem }) {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-xl',
          isUser ? 'bg-brand-500 text-white' : 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </span>
      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-brand-500 text-white'
              : message.grounded
                ? 'glass-card'
                : 'border border-risk-moderate/30 bg-risk-moderate/10 text-slate-700 dark:text-slate-200',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.message}</p>
          ) : (
            <article className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5">
              <Markdown remarkPlugins={[remarkGfm]}>{message.message}</Markdown>
            </article>
          )}
        </div>

        {!isUser && message.citations.length > 0 && (
          <div>
            <button
              onClick={() => setShowSources((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              <FileText size={12} /> {message.citations.length} source
              {message.citations.length > 1 ? 's' : ''}
            </button>
            {showSources && (
              <ul className="mt-2 space-y-1.5">
                {message.citations.map((c) => (
                  <li key={`${c.chunk_id}-${c.index}`} className="rounded-lg bg-white/50 p-2 text-xs dark:bg-white/5">
                    <span className="font-medium">
                      [{c.index}] {c.filename} · p.{c.page}
                    </span>
                    <p className="mt-1 text-slate-500">{c.snippet}…</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
