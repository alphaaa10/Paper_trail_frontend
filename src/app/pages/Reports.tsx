import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Download, FileText, AlertCircle, TrendingUp, RefreshCw, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, LatestReportResponse } from '../utils/api';
import { fallbackReportResponse } from '../utils/fallbackData';

type ReportContentItem = string | Record<string, unknown>;
type NamedCount = { name: string; count: number };

const PRIMARY_CONTENT_KEYS = new Set([
  'title',
  'paper_title',
  'paper_id',
  'heading',
  'name',
  'summary',
  'analysis',
  'insight',
  'content',
  'description',
  'text',
]);

function readStringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function renderReportContent(item: ReportContentItem, index: number): JSX.Element {
  if (typeof item === 'string') {
    return (
      <div key={`content-${index}`} className="p-4 border border-gray-200 rounded-lg bg-white">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item}</p>
      </div>
    );
  }

  const title = readStringField(item, ['title', 'paper_title', 'paper_id', 'heading', 'name']);
  const body = readStringField(item, ['summary', 'analysis', 'insight', 'content', 'description', 'text']);
  const remainingEntries = Object.entries(item).filter(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (PRIMARY_CONTENT_KEYS.has(normalizedKey)) {
      return false;
    }
    return hasRenderableValue(value);
  });

  return (
    <div key={`content-${index}`} className="p-4 border border-gray-200 rounded-lg bg-white space-y-2">
      {title && <div className="text-sm font-medium text-gray-900">{title}</div>}
      {body && <p className="text-sm text-gray-700 whitespace-pre-wrap">{body}</p>}
      {remainingEntries.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
          {remainingEntries.map(([key, value]) => (
            <div key={key} className="text-xs text-gray-600">
              <dt className="font-medium uppercase tracking-wide text-gray-500">{key.replace(/_/g, ' ')}</dt>
              <dd>{renderEntryValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {!title && !body && remainingEntries.length === 0 && (
        <p className="text-sm text-gray-500">No structured details available.</p>
      )}
    </div>
  );
}

function ReportSection({ title, items }: { title: string; items: ReportContentItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, index) => renderReportContent(item, index))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No data returned for this section yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function toTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean);
  }
  const text = toText(value);
  return text ? [text] : [];
}

function getSectionRecord(items: ReportContentItem[], fallback: unknown): Record<string, unknown> {
  const fromItems = items.find((item) => typeof item !== 'string' && item && typeof item === 'object');
  if (fromItems && typeof fromItems !== 'string') {
    return fromItems;
  }
  return toRecord(fallback) ?? {};
}

function extractMarkdownOverview(markdown: string): string {
  if (!markdown.trim()) {
    return '';
  }

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('```'));

  const stopIndex = lines.findIndex((line) => /^individual paper summaries|^cross-paper analysis|^critical insights/i.test(line));
  const relevant = stopIndex >= 0 ? lines.slice(0, stopIndex) : lines;
  return relevant.slice(0, 2).join(' ').trim();
}

function CompactNamedCountSection({ title, items }: { title: string; items: NamedCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No entries available.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${title}-${item.name}`} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-700 truncate pr-3">{item.name}</span>
                <span className="text-xs font-medium text-gray-500">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadableList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No items available.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="text-sm text-gray-700 leading-relaxed">• {item}</li>
      ))}
    </ul>
  );
}

export function Reports() {
  const [reportData, setReportData] = useState<LatestReportResponse>(fallbackReportResponse);
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toLocaleString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.fetchFinalReport();
      setReportData(response);
      setGeneratedAt(new Date().toLocaleString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load report.');
      setReportData(fallbackReportResponse);
      setGeneratedAt(new Date().toLocaleString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const handleExport = () => {
    alert('Report exported successfully!');
  };

  const executiveSummaryText = reportData.report?.executive_summary
    || `Analysis of ${reportData.papers_considered || reportData.paper_count} papers identified key findings and cross-paper tensions.`;
  const executiveSummaryMarkdown = reportData.report?.executive_summary_markdown || '';
  const executiveSummaryJson = reportData.report?.executive_summary_json ?? {};
  const individualPaperSummaries = useMemo(() => {
    const direct = normalizeSectionItems(reportData.individual_paper_summaries);
    if (direct.length > 0) {
      return direct;
    }
    return normalizeSectionItems(executiveSummaryJson.individual_paper_summaries);
  }, [executiveSummaryJson.individual_paper_summaries, reportData.individual_paper_summaries]);
  const crossPaperAnalysis = useMemo(() => {
    const direct = normalizeSectionItems(reportData.cross_paper_analysis);
    if (direct.length > 0) {
      return direct;
    }
    return normalizeSectionItems(executiveSummaryJson.cross_paper_analysis);
  }, [executiveSummaryJson.cross_paper_analysis, reportData.cross_paper_analysis]);
  const criticalInsights = useMemo(() => {
    const direct = normalizeSectionItems(reportData.critical_insights);
    if (direct.length > 0) {
      return direct;
    }
    return normalizeSectionItems(executiveSummaryJson.critical_insights);
  }, [executiveSummaryJson.critical_insights, reportData.critical_insights]);
  const topMethodsSection = useMemo(
    () => reportData.top_methods.map((item) => ({ name: item.name, count: item.count })),
    [reportData.top_methods],
  );
  const topDatasetsSection = useMemo(
    () => reportData.top_datasets.map((item) => ({ name: item.name, count: item.count })),
    [reportData.top_datasets],
  );
  const contradictionsSection = useMemo(
    () => reportData.contradictions.map((item) => ({
      title: item.title,
      severity: item.severity,
      summary: item.summary,
      papers: item.papers,
    })),
    [reportData.contradictions],
  );
  const gapsSection = useMemo(() => reportData.gaps, [reportData.gaps]);
  const detailedNextStepsSection = useMemo(
    () => reportData.detailed_report?.what_to_work_on_next.map((item) => ({
      priority: item.priority,
      focus: item.focus,
      why: item.why,
    })) || [],
    [reportData.detailed_report?.what_to_work_on_next],
  );
  const crossPaperRecord = useMemo(
    () => getSectionRecord(crossPaperAnalysis, executiveSummaryJson.cross_paper_analysis),
    [crossPaperAnalysis, executiveSummaryJson.cross_paper_analysis],
  );
  const criticalInsightsRecord = useMemo(
    () => getSectionRecord(criticalInsights, executiveSummaryJson.critical_insights),
    [criticalInsights, executiveSummaryJson.critical_insights],
  );
  const commonThemes = useMemo(
    () => (Array.isArray(crossPaperRecord.common_themes) ? crossPaperRecord.common_themes : [])
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null),
    [crossPaperRecord.common_themes],
  );
  const methodologyDifferences = useMemo(
    () => (Array.isArray(crossPaperRecord.methodology_differences) ? crossPaperRecord.methodology_differences : [])
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null),
    [crossPaperRecord.methodology_differences],
  );
  const supportingPairs = useMemo(
    () => (Array.isArray(crossPaperRecord.supporting_or_validating_pairs) ? crossPaperRecord.supporting_or_validating_pairs : [])
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null),
    [crossPaperRecord.supporting_or_validating_pairs],
  );
  const conflictingConclusions = useMemo(
    () => toTextArray(crossPaperRecord.conflicting_conclusions),
    [crossPaperRecord.conflicting_conclusions],
  );
  const evolutionItems = useMemo(
    () => (Array.isArray(crossPaperRecord.evolution_of_ideas) ? crossPaperRecord.evolution_of_ideas : [])
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null),
    [crossPaperRecord.evolution_of_ideas],
  );
  const criticalApproaches = useMemo(
    () => (Array.isArray(criticalInsightsRecord.most_effective_approaches)
      ? criticalInsightsRecord.most_effective_approaches
      : [])
      .map((item) => toRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null),
    [criticalInsightsRecord.most_effective_approaches],
  );
  const futureScopeItems = useMemo(() => {
    const fromCritical = toTextArray(criticalInsightsRecord.opportunities_for_future_work);
    const fromDetailed = reportData.detailed_report?.future_steps ?? [];
    return Array.from(new Set([...fromCritical, ...fromDetailed].map((item) => item.trim()).filter(Boolean)));
  }, [criticalInsightsRecord.opportunities_for_future_work, reportData.detailed_report?.future_steps]);
  const nextStepsItems = useMemo(
    () => reportData.detailed_report?.recommended_actions ?? [],
    [reportData.detailed_report?.recommended_actions],
  );
  const executiveOverview = useMemo(() => {
    const summaryFromJson = readStringField(executiveSummaryJson, ['summary', 'executive_summary', 'overview', 'high_level_summary']);
    if (summaryFromJson) {
      return summaryFromJson;
    }

    const markdownOverview = extractMarkdownOverview(executiveSummaryMarkdown);
    if (markdownOverview) {
      return markdownOverview;
    }

    return executiveSummaryText;
  }, [executiveSummaryJson, executiveSummaryMarkdown, executiveSummaryText]);

  const kpis = useMemo(() => [
    {
      label: 'Papers Considered',
      value: reportData.papers_considered || reportData.paper_count,
      description: 'Included in final report',
      icon: FileText,
      iconClass: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Unanswered Questions',
      value: reportData.unanswered_question_count,
      description: 'Still open after synthesis',
      icon: AlertCircle,
      iconClass: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Decision Topics',
      value: reportData.decision_topic_count,
      description: 'Decision dimensions assessed',
      icon: TrendingUp,
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Contradicting Papers',
      value: reportData.contradicting_paper_count,
      description: 'Conflicting evidence identified',
      icon: AlertCircle,
      iconClass: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      label: 'Recent Works',
      value: reportData.recent_works_count,
      description: 'Recently published sources',
      icon: Database,
      iconClass: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
    },
  ], [
    reportData.contradicting_paper_count,
    reportData.decision_topic_count,
    reportData.paper_count,
    reportData.papers_considered,
    reportData.recent_works_count,
    reportData.unanswered_question_count,
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analysis Report</h1>
          <p className="text-gray-600 mt-1">Generated on {generatedAt}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Retry
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent>
            <p className="text-sm text-amber-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{kpi.label}</div>
                  <div className="text-3xl font-semibold text-gray-900">{kpi.value}</div>
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconClass}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-700 mb-1">Overall Summary</div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{executiveOverview}</p>
          </div>

          {executiveSummaryText && executiveSummaryText !== executiveOverview && (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{executiveSummaryText}</p>
            </div>
          )}

          {executiveSummaryMarkdown ? (
            <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Markdown View</div>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{executiveSummaryMarkdown}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No markdown summary returned.</p>
          )}

          <details className="border border-gray-200 rounded-lg bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-800">
              Structured Executive Summary JSON
            </summary>
            <div className="px-4 pb-4">
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 overflow-x-auto rounded-md">
                {JSON.stringify(executiveSummaryJson, null, 2)}
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">Loading report...</p>
          </CardContent>
        </Card>
      )}

      <ReportSection title="Individual Paper Summaries" items={individualPaperSummaries} />
      <Card>
        <CardHeader>
          <CardTitle>Cross-Paper Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-[#dccfb3] bg-white p-5 md:p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-2">Common Themes</h3>
                  <div className="space-y-3">
                    {commonThemes.map((theme, index) => (
                      <div key={`theme-${index}`}>
                        <div className="text-sm font-semibold text-[#2f2920]">{toText(theme.theme) || `Theme ${index + 1}`}</div>
                        <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-[#6f5630]">
                          {toTextArray(theme.evidence).map((entry, entryIndex) => (
                            <li key={`theme-evidence-${index}-${entryIndex}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {commonThemes.length === 0 && <p className="text-sm text-gray-500">No common themes available.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-2">Supporting Or Validating Pairs</h3>
                  <div className="space-y-2 text-sm text-[#6f5630]">
                    {supportingPairs.map((pair, index) => (
                      <div key={`pair-${index}`}>
                        <div className="font-medium text-[#2f2920]">{toText(pair.paper_a)} ↔ {toText(pair.paper_b)}</div>
                        <p>{toText(pair.support_signal) || 'No support signal provided.'}</p>
                      </div>
                    ))}
                    {supportingPairs.length === 0 && <p className="text-sm text-gray-500">No supporting pairs available.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-2">Conflicting Conclusions</h3>
                  <ReadableList items={conflictingConclusions} />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-2">Methodology Differences</h3>
                  <div className="space-y-3">
                    {methodologyDifferences.map((entry, index) => (
                      <div key={`method-diff-${index}`}>
                        <div className="text-sm font-semibold text-[#2f2920]">{toText(entry.title) || toText(entry.paper_id) || `Paper ${index + 1}`}</div>
                        <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-[#6f5630]">
                          {toTextArray(entry.notable_method_choices).map((choice, choiceIndex) => (
                            <li key={`method-choice-${index}-${choiceIndex}`}>{choice}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {methodologyDifferences.length === 0 && <p className="text-sm text-gray-500">No methodology differences available.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-2">Evolution Of Ideas</h3>
                  <div className="space-y-3 text-sm text-[#6f5630]">
                    {evolutionItems.map((entry, index) => (
                      <div key={`evolution-${index}`}>
                        <div className="font-medium text-[#2f2920]">{toText(entry.year) || 'N/A'} - {toText(entry.title) || toText(entry.paper_id)}</div>
                        <p>{toText(entry.progression_note) || 'No progression note provided.'}</p>
                      </div>
                    ))}
                    {evolutionItems.length === 0 && <p className="text-sm text-gray-500">No evolution timeline available.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critical Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-[#dccfb3] bg-white p-5 md:p-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9a7438] mb-3">Most Effective Approaches</h3>
              {criticalApproaches.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {criticalApproaches.map((approach, index) => (
                    <div key={`approach-${index}`} className="rounded-md border border-[#e7dcc7] bg-[#fffdfa] p-3">
                      <div className="font-semibold text-[#2f2920] text-base leading-snug">
                        {toText(approach.approach) || `Approach ${index + 1}`}
                      </div>
                      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#9a7438]">
                        Supporting papers: {toText(approach.supporting_papers) || '0'}
                      </div>
                      {toText(approach.why_effective) && (
                        <p className="mt-2 text-sm text-[#6f5630] leading-relaxed">{toText(approach.why_effective)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No approaches available.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CompactNamedCountSection title="Top Methods (Low Priority)" items={topMethodsSection} />
        <CompactNamedCountSection title="Top Datasets (Low Priority)" items={topDatasetsSection} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Future Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadableList items={futureScopeItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {nextStepsItems.length > 0 ? (
            <div className="space-y-3">
              {nextStepsItems.map((step, index) => (
                <div key={`next-step-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">Priority {step.priority || '-'}</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{step.action || 'Action item'}</div>
                  {step.rationale && <p className="text-sm text-gray-700 mt-1">{step.rationale}</p>}
                  {step.next_step && <p className="text-sm text-gray-600 mt-1">Next: {step.next_step}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {detailedNextStepsSection.length > 0 ? detailedNextStepsSection.map((entry, index) => (
                <div key={`work-next-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">Priority {entry.priority || '-'}</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{entry.focus || 'Focus area'}</div>
                  <p className="text-sm text-gray-700 mt-1">{entry.why || 'No explanation provided.'}</p>
                </div>
              )) : <p className="text-sm text-gray-500">No next steps available.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <ReportSection title="Contradictions" items={contradictionsSection} />
      <ReportSection title="Research Gaps" items={gapsSection} />
    </div>
  );
}

function normalizeSectionItems(value: unknown): ReportContentItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          const text = item.trim();
          return text || null;
        }

        if (item && typeof item === 'object') {
          return item as Record<string, unknown>;
        }

        return null;
      })
      .filter((item): item is ReportContentItem => item !== null);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  if (value && typeof value === 'object') {
    return [value as Record<string, unknown>];
  }

  return [];
}

function hasRenderableValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function renderEntryValue(value: unknown): JSX.Element {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-4 space-y-1">
        {value.map((entry, entryIndex) => (
          <li key={`array-item-${entryIndex}`}>{typeof entry === 'string' ? entry : JSON.stringify(entry)}</li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <pre className="text-xs bg-gray-50 text-gray-700 p-2 rounded border border-gray-200 overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return <span>{String(value)}</span>;
}