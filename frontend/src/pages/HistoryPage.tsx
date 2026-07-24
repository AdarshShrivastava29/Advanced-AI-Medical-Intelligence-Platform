import { motion } from 'framer-motion';
import { ChevronRight, ScanLine, Search, ShieldAlert, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, ClassBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { Segmented } from '@/components/ui/Switch';
import {
  Pagination,
  Table,
  TableWrapper,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  type SortDirection,
} from '@/components/ui/Table';
import { useHistory } from '@/hooks/usePredictions';
import { formatDate, percent, timeAgo } from '@/lib/utils';
import type { PredictionListItem } from '@/types/api';

const PAGE_SIZE = 12;

const CLASS_FILTERS = [
  { value: 'all', label: 'All findings' },
  { value: 'PNEUMONIA', label: 'Pneumonia' },
  { value: 'NORMAL', label: 'Normal' },
] as const;

const CONFIDENCE_FILTERS = [
  { value: 'any', label: 'Any' },
  { value: 'high', label: '≥ 90%' },
  { value: 'low', label: '< 70%' },
] as const;

type ClassFilter = (typeof CLASS_FILTERS)[number]['value'];
type ConfidenceFilter = (typeof CONFIDENCE_FILTERS)[number]['value'];
type SortKey = 'created_at' | 'confidence';

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('any');
  const [oodOnly, setOodOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const { data, isLoading, isError, refetch } = useHistory(page, PAGE_SIZE);

  /**
   * Pagination is server-side; filtering and sorting refine the current page
   * client-side so the record count shown always reflects what is on screen.
   */
  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const term = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (classFilter !== 'all' && item.predicted_class.toUpperCase() !== classFilter) return false;
      if (confidenceFilter === 'high' && item.confidence < 0.9) return false;
      if (confidenceFilter === 'low' && item.confidence >= 0.7) return false;
      if (oodOnly && !item.ood_flag) return false;
      if (term && !item.id.toLowerCase().includes(term) && !item.model_arch.toLowerCase().includes(term))
        return false;
      return true;
    });

    const direction = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'confidence') return (a.confidence - b.confidence) * direction;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    });
  }, [data, query, classFilter, confidenceFilter, oodOnly, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtersActive =
    query.trim().length > 0 || classFilter !== 'all' || confidenceFilter !== 'any' || oodOnly;

  const clearFilters = () => {
    setQuery('');
    setClassFilter('all');
    setConfidenceFilter('any');
    setOodOnly(false);
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Patient records"
        title="Study history"
        description="Every chest radiograph analysed under your account, with its classification and explainability."
        meta={
          data && (
            <Badge tone="slate" size="sm">
              <span className="nums">{data.total}</span> total studies
            </Badge>
          )
        }
        action={
          <Link to="/predict">
            <Button leadingIcon={<ScanLine size={16} />}>New study</Button>
          </Link>
        }
      />

      {/* ---------------- Filter bar ---------------- */}
      <Card className="mb-6" padding="sm">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by study ID or model…"
            aria-label="Search studies"
            icon={<Search size={16} />}
            containerClassName="min-w-0 flex-1 sm:max-w-xs"
          />

          <div>
            <p className="medical-label mb-2">Finding</p>
            <Segmented
              options={CLASS_FILTERS.map((option) => ({ value: option.value, label: option.label }))}
              value={classFilter}
              onChange={setClassFilter}
              label="Filter by finding"
              size="sm"
            />
          </div>

          <div>
            <p className="medical-label mb-2">Confidence</p>
            <Segmented
              options={CONFIDENCE_FILTERS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={confidenceFilter}
              onChange={setConfidenceFilter}
              label="Filter by confidence"
              size="sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setOodOnly((value) => !value)}
            aria-pressed={oodOnly}
            className={
              oodOnly
                ? 'inline-flex h-9 items-center gap-2 rounded-xl border border-warning-500/40 bg-warning-500/10 px-3 text-sm font-medium text-warning-700 transition dark:text-warning-400'
                : 'inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-fg-muted transition hover:border-line-strong hover:text-fg'
            }
          >
            <ShieldAlert size={14} aria-hidden /> Needs review
          </button>

          {filtersActive && (
            <Button variant="ghost" size="sm" leadingIcon={<X size={14} />} onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* ---------------- Records ---------------- */}
      {isLoading ? (
        <Card>
          <SkeletonRows rows={8} />
        </Card>
      ) : isError ? (
        <Card>
          <ErrorState
            title="Could not load your study history"
            description="The records service did not respond. Nothing has been lost — retry in a moment."
            onRetry={() => void refetch()}
          />
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          <TableWrapper
            className="hidden lg:block"
            maxHeight="calc(100vh - 24rem)"
            footer={
              <Pagination
                page={data.page}
                pages={Math.max(data.pages, 1)}
                total={data.total}
                unit="studies"
                onChange={setPage}
              />
            }
          >
            <Table>
              <THead>
                <Tr>
                  <Th>Finding</Th>
                  <Th
                    sortable
                    direction={sortKey === 'confidence' ? sortDir : null}
                    onSort={() => toggleSort('confidence')}
                  >
                    Confidence
                  </Th>
                  <Th>Model</Th>
                  <Th>Status</Th>
                  <Th
                    sortable
                    direction={sortKey === 'created_at' ? sortDir : null}
                    onSort={() => toggleSort('created_at')}
                    align="right"
                  >
                    Analysed
                  </Th>
                  <Th align="right">
                    <span className="sr-only">Open</span>
                  </Th>
                </Tr>
              </THead>
              <TBody striped>
                {rows.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </TBody>
            </Table>

            {rows.length === 0 && (
              <EmptyState
                art="search"
                title="No studies match these filters"
                description="Widen the finding or confidence filter to see more of this page."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            )}
          </TableWrapper>

          {/* Mobile / tablet card list */}
          <div className="space-y-3 lg:hidden">
            {rows.map((item, index) => (
              <HistoryCard key={item.id} item={item} delay={index * 0.03} />
            ))}
            {rows.length === 0 && (
              <Card>
                <EmptyState
                  art="search"
                  title="No studies match these filters"
                  description="Widen the finding or confidence filter to see more."
                  action={
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  }
                />
              </Card>
            )}
            <Card padding="none">
              <Pagination
                page={data.page}
                pages={Math.max(data.pages, 1)}
                total={data.total}
                unit="studies"
                onChange={setPage}
                className="border-t-0"
              />
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            art="records"
            title="No studies analysed yet"
            description="Once you analyse a chest radiograph it appears here with its classification, Grad-CAM overlay and report."
            action={
              <Link to="/predict">
                <Button leadingIcon={<ScanLine size={16} />}>Analyse your first study</Button>
              </Link>
            }
            hint="PNG or JPEG · up to 10 MB"
          />
        </Card>
      )}
    </PageTransition>
  );
}

function confidenceTone(value: number): 'green' | 'amber' | 'red' {
  if (value >= 0.9) return 'green';
  if (value >= 0.7) return 'amber';
  return 'red';
}

function HistoryRow({ item }: { item: PredictionListItem }) {
  return (
    <Tr interactive>
      <Td>
        <div className="flex items-center gap-3">
          <ClassBadge label={item.predicted_class} size="sm" />
          {item.ood_flag && (
            <Badge tone="amber" size="sm">
              <ShieldAlert size={12} aria-hidden /> OOD
            </Badge>
          )}
        </div>
      </Td>
      <Td>
        <div className="w-36">
          <ConfidenceMeter
            value={item.confidence}
            tone={confidenceTone(item.confidence)}
            size="sm"
            label={percent(item.confidence)}
            hideValue
          />
        </div>
      </Td>
      <Td>
        <span className="text-sm text-fg-muted">{item.model_arch}</span>
      </Td>
      <Td>
        <Badge tone={item.ood_flag ? 'amber' : 'green'} size="sm" dot>
          {item.ood_flag ? 'Needs review' : 'Complete'}
        </Badge>
      </Td>
      <Td align="right">
        <span className="block text-sm text-fg">{timeAgo(item.created_at)}</span>
        <span className="block text-[11px] text-fg-subtle">{formatDate(item.created_at)}</span>
      </Td>
      <Td align="right">
        <Link
          to={`/history/${item.id}`}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 transition hover:bg-brand-600/10 dark:text-accent-300"
        >
          Open <ChevronRight size={14} aria-hidden />
        </Link>
      </Td>
    </Tr>
  );
}

function HistoryCard({ item, delay }: { item: PredictionListItem; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/history/${item.id}`} className="block rounded-2xl">
        <Card interactive padding="sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ClassBadge label={item.predicted_class} size="sm" />
              {item.ood_flag && (
                <Badge tone="amber" size="sm">
                  <ShieldAlert size={12} aria-hidden /> OOD
                </Badge>
              )}
            </div>
            <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(item.created_at)}</span>
          </div>

          <div className="mt-3">
            <ConfidenceMeter
              value={item.confidence}
              tone={confidenceTone(item.confidence)}
              size="sm"
              label="Confidence"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="truncate text-xs text-fg-subtle">{item.model_arch}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-accent-300">
              Open <ChevronRight size={14} aria-hidden />
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
