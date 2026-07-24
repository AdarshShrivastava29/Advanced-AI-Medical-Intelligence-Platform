import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { ProgressBar } from '@/components/ui/Progress';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
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

const STATUS_LABEL = {
  uploaded: 'Queued',
  processing: 'Indexing',
  indexed: 'Indexed',
  failed: 'Failed',
} as const;

type StatusFilter = 'all' | DocumentResponse['status'];

export function DocumentsPage() {
  const toast = useToast();
  const { data, isLoading } = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<DocumentResponse | null>(null);

  const documents = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: documents.length,
      indexed: documents.filter((doc) => doc.status === 'indexed').length,
      processing: documents.filter((doc) => doc.status === 'processing' || doc.status === 'uploaded')
        .length,
      failed: documents.filter((doc) => doc.status === 'failed').length,
    }),
    [documents],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'processing'
          ? doc.status === 'processing' || doc.status === 'uploaded'
          : doc.status === filter);
      const matchesQuery =
        term.length === 0 ||
        doc.title.toLowerCase().includes(term) ||
        doc.filename.toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [documents, filter, query]);

  const totalChunks = useMemo(
    () => documents.reduce((sum, doc) => sum + doc.chunk_count, 0),
    [documents],
  );

  const tabs: TabItem<StatusFilter>[] = [
    { value: 'all', label: 'All', badge: <Count value={counts.all} /> },
    { value: 'indexed', label: 'Indexed', badge: <Count value={counts.indexed} /> },
    { value: 'processing', label: 'Processing', badge: <Count value={counts.processing} /> },
    { value: 'failed', label: 'Failed', badge: <Count value={counts.failed} /> },
  ];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF documents can be indexed.');
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success('Document queued for ingestion');
    } catch {
      toast.error('Upload failed — it may be a duplicate or exceed the size limit.');
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Knowledge base"
        title="Clinical documents"
        description="Medical literature indexed for the grounded knowledge assistant."
        meta={
          <>
            <Badge tone="brand" size="sm">
              <Database size={11} aria-hidden /> {counts.indexed} indexed
            </Badge>
            <Badge tone="slate" size="sm">
              <span className="nums">{totalChunks.toLocaleString()}</span> retrievable chunks
            </Badge>
          </>
        }
        action={
          <Button
            leadingIcon={<Upload size={16} />}
            onClick={() => inputRef.current?.click()}
            loading={upload.isPending}
          >
            Upload PDF
          </Button>
        }
      />

      {/* ---------------- Upload zone ---------------- */}
      <Card className="mb-5">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF document"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 ease-premium',
            dragging
              ? 'border-brand-600 bg-brand-600/[0.06] dark:border-accent-400 dark:bg-accent-400/[0.08]'
              : 'border-line-strong hover:border-brand-500 hover:bg-surface-muted',
          )}
        >
          <motion.span
            animate={dragging ? { scale: 1.08, y: -3 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600/10 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-accent-400/10 dark:text-accent-300 dark:ring-accent-400/20"
          >
            {upload.isPending ? (
              <Loader2 className="animate-spin" size={24} aria-hidden />
            ) : (
              <Upload size={24} aria-hidden />
            )}
          </motion.span>

          <div className="max-w-md">
            <p className="font-display text-base font-semibold text-fg">
              {upload.isPending
                ? 'Uploading document…'
                : dragging
                  ? 'Release to upload'
                  : 'Drop a clinical PDF here'}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              Guidelines, review articles and departmental protocols. Text is extracted, chunked and
              embedded so the assistant can cite it.
            </p>
          </div>

          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            PDF only · max 10 MB
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            tabIndex={-1}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>

        {upload.isPending && (
          <div className="mt-4">
            <ProgressBar value={0} indeterminate size="sm" label="Upload progress" />
          </div>
        )}
      </Card>

      {/* ---------------- Library ---------------- */}
      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
          <Tabs
            items={tabs}
            value={filter}
            onChange={setFilter}
            variant="pill"
            size="sm"
            aria-label="Filter documents by status"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            icon={<Search size={15} />}
            containerClassName="w-full sm:w-64"
          />
        </div>

        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((doc, index) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  delay={index * 0.035}
                  onDelete={() => setPendingDelete(doc)}
                />
              ))}
            </div>
          ) : documents.length > 0 ? (
            <EmptyState
              art="search"
              title="No matching documents"
              description="Adjust the status filter or search for a different title."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              art="documents"
              title="Your knowledge base is empty"
              description="Upload medical PDFs to give the assistant a corpus it can retrieve from and cite."
              action={
                <Button leadingIcon={<Upload size={16} />} onClick={() => inputRef.current?.click()}>
                  Upload your first document
                </Button>
              }
              hint="PDF only · max 10 MB"
            />
          )}
        </div>
      </Card>

      {/* Destructive confirmation — deletion removes the document from retrieval. */}
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Remove this document?"
        description={pendingDelete?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leadingIcon={<Trash2 size={15} />}
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Remove document
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          Its indexed chunks will no longer be retrievable, and the assistant will stop citing it.
          Existing conversation history is unaffected.
        </p>
      </Dialog>
    </PageTransition>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-fg/[0.08] px-1.5 text-[10px] font-semibold text-fg-muted nums">
      {value}
    </span>
  );
}

function DocumentCard({
  doc,
  delay,
  onDelete,
}: {
  doc: DocumentResponse;
  delay: number;
  onDelete: () => void;
}) {
  const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col rounded-2xl border border-line bg-surface-muted p-4 transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-500/10 text-danger-600 ring-1 ring-inset ring-danger-500/15 dark:text-danger-500">
            <FileText size={19} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fg" title={doc.title}>
              {doc.title}
            </h3>
            <p className="truncate text-[11px] text-fg-subtle" title={doc.filename}>
              {doc.filename}
            </p>
          </div>
        </div>

        <IconButton
          label={`Remove ${doc.title}`}
          icon={<Trash2 size={15} />}
          size="icon-sm"
          onClick={onDelete}
          className="shrink-0 opacity-0 transition-opacity hover:text-danger-600 focus-visible:opacity-100 group-hover:opacity-100"
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-fg-subtle">Pages</dt>
          <dd className="mt-0.5 text-sm font-semibold text-fg nums">{doc.pages || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-fg-subtle">Chunks</dt>
          <dd className="mt-0.5 text-sm font-semibold text-fg nums">{doc.chunk_count || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-fg-subtle">Version</dt>
          <dd className="mt-0.5 text-sm font-semibold text-fg nums">v{doc.version}</dd>
        </div>
      </dl>

      {isProcessing && (
        <div className="mt-3">
          <ProgressBar value={0} indeterminate size="xs" label={`Indexing ${doc.title}`} />
        </div>
      )}

      {doc.status === 'failed' && doc.error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-danger-500/[0.07] p-2 text-[11px] leading-relaxed text-danger-700 dark:text-danger-500">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden />
          {doc.error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Badge tone={STATUS_TONE[doc.status]} size="sm">
          {doc.status === 'processing' && <Loader2 size={10} className="animate-spin" aria-hidden />}
          {doc.status === 'indexed' && <CheckCircle2 size={10} aria-hidden />}
          {STATUS_LABEL[doc.status]}
        </Badge>
        <span className="truncate text-[11px] text-fg-subtle">{formatDate(doc.created_at)}</span>
      </div>

      {doc.status === 'indexed' && doc.embedding_provider && (
        <p className="mt-2 truncate text-[10px] uppercase tracking-wider text-fg-subtle">
          {doc.embedding_provider}
          {doc.vector_db ? ` · ${doc.vector_db}` : ''}
        </p>
      )}
    </motion.article>
  );
}
