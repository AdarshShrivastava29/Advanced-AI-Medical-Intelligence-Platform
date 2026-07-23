import { motion } from 'framer-motion';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useDeleteDocument, useDocuments, useUploadDocument } from '@/hooks/useKnowledge';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/store/toastStore';
import type { DocumentResponse } from '@/types/api';

const STATUS_TONE = {
  uploaded: 'slate',
  processing: 'amber',
  indexed: 'green',
  failed: 'red',
} as const;

export function DocumentsPage() {
  const toast = useToast();
  const { data, isLoading } = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF document.');
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success('Document queued for ingestion');
    } catch {
      toast.error('Upload failed — it may be a duplicate or too large.');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Knowledge Base"
        description="Upload medical PDFs to power the grounded assistant."
      />

      <Card className="mb-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition',
            dragging ? 'border-brand-500 bg-brand-500/5' : 'border-slate-300 hover:border-brand-400 dark:border-white/15',
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            {upload.isPending ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
          </span>
          <p className="font-medium">{upload.isPending ? 'Uploading…' : 'Drop a PDF, or click to browse'}</p>
          <p className="text-sm text-slate-500">Medical guidelines, papers, references — up to 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
            {data.items.map((doc, index) => (
              <DocumentRow key={doc.id} doc={doc} delay={index * 0.03} onDelete={() => remove.mutate(doc.id)} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No documents yet"
            description="Upload a medical PDF to build your knowledge base."
            icon={<FileText size={26} />}
          />
        )}
      </Card>
    </PageTransition>
  );
}

function DocumentRow({
  doc,
  delay,
  onDelete,
}: {
  doc: DocumentResponse;
  delay: number;
  onDelete: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="flex items-center justify-between gap-3 py-3.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
          <FileText size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{doc.title}</p>
          <p className="text-xs text-slate-500">
            {doc.status === 'indexed'
              ? `${doc.chunk_count} chunks · ${doc.pages} pages`
              : doc.status === 'failed'
                ? (doc.error ?? 'Ingestion failed')
                : 'Processing…'}{' '}
            · {formatDate(doc.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={STATUS_TONE[doc.status]}>
          {doc.status === 'processing' && <Loader2 size={11} className="animate-spin" />}
          {doc.status}
        </Badge>
        <button
          onClick={onDelete}
          aria-label={`Delete ${doc.title}`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-risk-high/10 hover:text-risk-high"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.li>
  );
}
