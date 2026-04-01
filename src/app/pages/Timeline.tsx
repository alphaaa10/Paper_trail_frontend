import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '../components/Card';
import { api } from '../utils/api';
import { fallbackTimelineResponse } from '../utils/fallbackData';

interface TimelinePaper {
  paper_id: string;
  title: string;
  year: number;
  contribution: string;
  methods: string[];
  claims: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function toYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
      return Math.trunc(direct);
    }

    const fromDate = new Date(trimmed).getFullYear();
    if (Number.isFinite(fromDate)) {
      return fromDate;
    }
  }

  return null;
}

function normalizeTimelinePapers(raw: unknown): TimelinePaper[] {
  const payload = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(payload?.papers)
      ? payload?.papers
      : Array.isArray(payload?.timeline)
        ? payload?.timeline
        : Array.isArray(payload?.items)
          ? payload?.items
          : [];

  return list
    .map((entry, index) => {
      const item = asRecord(entry);
      if (!item) {
        return null;
      }

      const year = toYear(item.year ?? item.published_year ?? item.publication_year ?? item.date);
      if (year === null) {
        return null;
      }

      const title = toStringValue(item.title || item.paper_title || item.name, 'Untitled paper');
      const contribution = toStringValue(
        item.contribution || item.groq_contribution || item.contribution_sentence || item.summary,
      );
      const methods = toStringArray(item.methods || item.method_tags || item.tags);
      const claims = toStringArray(item.claims || item.evidence);
      const paperId = toStringValue(item.paper_id || item.id, `timeline-${year}-${index}`);

      return {
        paper_id: paperId,
        title,
        year,
        contribution,
        methods,
        claims,
      };
    })
    .filter((item): item is TimelinePaper => item !== null)
    .sort((a, b) => a.year - b.year);
}

export function Timeline() {
  const [papers, setPapers] = useState<TimelinePaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const yearRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    const loadTimeline = async () => {
      setIsLoading(true);
      setError(null);
      setIsUsingFallback(false);

      try {
        const payload = await api.getTimeline();
        setPapers(normalizeTimelinePapers(payload));
      } catch (loadError) {
        const detail = loadError instanceof Error ? loadError.message : 'Failed to load timeline.';
        setPapers(normalizeTimelinePapers(fallbackTimelineResponse));
        setIsUsingFallback(true);
        setError(
          `Live timeline is unavailable (${detail}). Showing sample timeline data.`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadTimeline();
  }, []);

  const papersByYear = useMemo(() => {
    const grouped = new Map<number, TimelinePaper[]>();
    for (const paper of papers) {
      const current = grouped.get(paper.year) ?? [];
      current.push(paper);
      grouped.set(paper.year, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, items]) => ({ year, items }));
  }, [papers]);

  const years = useMemo(() => papersByYear.map((entry) => entry.year), [papersByYear]);
  const earliest = years.length > 0 ? years[0] : '—';
  const latest = years.length > 0 ? years[years.length - 1] : '—';

  const toggleEvidence = (paperId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  };

  const scrollToYear = (year: number) => {
    const target = yearRefs.current[year];
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const renderTimelineCard = (paper: TimelinePaper, evidenceExpanded: boolean) => (
    <Card className="w-full">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900 break-words">{paper.title}</h3>
          <p className="text-base leading-relaxed text-gray-900 font-medium break-words">
            {paper.contribution || 'Contribution summary unavailable.'}
          </p>
        </div>

        {paper.methods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {paper.methods.map((method, methodIndex) => (
              <span
                key={`${paper.paper_id}-${method}-${methodIndex}`}
                className="px-2.5 py-1 text-xs rounded-full border border-border bg-muted text-muted-foreground"
              >
                {method}
              </span>
            ))}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => toggleEvidence(paper.paper_id)}
            className="px-3 py-2 text-sm bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors rounded"
          >
            {evidenceExpanded ? 'Hide Evidence' : 'View Evidence'}
          </button>

          {evidenceExpanded && (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
              {paper.claims.length > 0 ? (
                paper.claims.map((claim, claimIndex) => (
                  <li key={`${paper.paper_id}-claim-${claimIndex}`}>{claim}</li>
                ))
              ) : (
                <li>No evidence claims available for this paper.</li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Research Timeline</h1>
        <p className="text-gray-600 mt-1">{papers.length} papers · {earliest} — {latest}</p>
      </div>

      {isUsingFallback && error && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent>
            <p className="text-sm text-amber-900">{error}</p>
          </CardContent>
        </Card>
      )}

      {years.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-2 min-w-max">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => scrollToYear(year)}
                className="px-3 py-1.5 text-sm border border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors rounded-full"
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] gap-4 items-start">
              <div className="md:hidden">
                <Card className="animate-pulse w-full">
                  <CardContent className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="hidden md:block min-w-0">
                {index % 2 === 0 && (
                  <Card className="animate-pulse w-full">
                    <CardContent className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="hidden md:block relative min-h-[160px]">
                <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-border"></div>
                <div className="absolute left-1/2 top-10 -translate-x-1/2 w-3 h-3 rounded-full bg-border"></div>
              </div>
              <div className="hidden md:block min-w-0">
                {index % 2 === 1 && (
                  <Card className="animate-pulse w-full">
                    <CardContent className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && papers.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-gray-600">No papers extracted yet. Run a crawl first.</p>
            {error && !isUsingFallback && <p className="text-sm text-amber-700 mt-2">{error}</p>}
          </CardContent>
        </Card>
      )}

      {!isLoading && papers.length > 0 && (
        <div className="space-y-10 pb-6">
          {papersByYear.map(({ year, items }) => (
            <section
              key={year}
              ref={(element) => {
                yearRefs.current[year] = element;
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] gap-4 items-center">
                <div></div>
                <div className="relative h-16 flex items-center justify-center">
                  <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-border"></div>
                  <div className="relative z-10 px-3 py-1 bg-card border border-border rounded-full flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">{year}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {items.length}
                    </span>
                  </div>
                </div>
                <div></div>
              </div>

              <div className="space-y-4">
                {items.map((paper, index) => {
                  const isLeft = index % 2 === 0;
                  const evidenceExpanded = Boolean(expandedEvidence[paper.paper_id]);

                  return (
                    <div key={paper.paper_id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] gap-4 items-start">
                      <div className="md:hidden min-w-0">
                        {renderTimelineCard(paper, evidenceExpanded)}
                      </div>

                      <div className="hidden md:block min-w-0">
                        {isLeft ? renderTimelineCard(paper, evidenceExpanded) : <div aria-hidden="true" />}
                      </div>

                      <div className="hidden md:block relative min-h-[220px]">
                        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-border"></div>
                        <div className="absolute left-1/2 top-10 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                        {isLeft ? (
                          <div className="absolute top-[46px] left-0 right-1/2 h-px bg-border"></div>
                        ) : (
                          <div className="absolute top-[46px] left-1/2 right-0 h-px bg-border"></div>
                        )}
                      </div>

                      <div className="hidden md:block min-w-0">
                        {!isLeft ? renderTimelineCard(paper, evidenceExpanded) : <div aria-hidden="true" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
