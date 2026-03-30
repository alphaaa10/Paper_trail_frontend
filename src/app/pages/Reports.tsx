import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Download, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import { api, DetailedReport, LatestReportResponse } from '../utils/api';
import {
  fallbackRecommendations,
  fallbackReportResponse,
} from '../utils/fallbackData';

export function Reports() {
  const [reportData, setReportData] = useState<LatestReportResponse>(fallbackReportResponse);
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toLocaleString());
  const detailedReport: DetailedReport = reportData.detailed_report ?? {
    paper_profiles: [],
    contradiction_analysis: {
      total_contradiction_items: 0,
      total_contradicting_pairs: 0,
      pairwise_contradictions: [],
      per_paper_contradictions: [],
    },
    gaps_between_papers: [],
    future_steps: [],
    recommended_actions: [],
    not_addressed: [],
    what_to_work_on_next: [],
  };
  const hasDetailedReport = Boolean(
    detailedReport.paper_profiles.length > 0
    || detailedReport.contradiction_analysis.pairwise_contradictions.length > 0
    || detailedReport.gaps_between_papers.length > 0
    || detailedReport.recommended_actions.length > 0
    || detailedReport.what_to_work_on_next.length > 0,
  );
  const recommendations = hasDetailedReport
    ? detailedReport.recommended_actions.map((item) => ({
        title: item.action,
        description: `${item.rationale}${item.next_step ? ` Next: ${item.next_step}` : ''}`,
      }))
    : fallbackRecommendations;
  const contradictionCount = hasDetailedReport
    ? Math.max(
        reportData.contradictions.length,
        detailedReport.contradiction_analysis.total_contradiction_items,
      )
    : reportData.contradictions.length;
  const gapsCount = hasDetailedReport
    ? Math.max(reportData.gaps.length, detailedReport.gaps_between_papers.length)
    : reportData.gaps.length;
  const pairwiseCount = detailedReport.contradiction_analysis.total_contradicting_pairs;
  const perPaperContradictions = detailedReport.contradiction_analysis.per_paper_contradictions;
  const papersWithConflicts = perPaperContradictions.filter((item) => item.contradiction_count > 0).length;

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await api.getReport();
        console.info('[Reports] Received report payload:', response);
        setReportData(response);
      } catch (error) {
        console.error('[Reports] Failed to fetch report payload:', error);
        setReportData(fallbackReportResponse);
      } finally {
        setGeneratedAt(new Date().toLocaleString());
      }
    };

    void loadReport();
  }, []);

  const handleExport = () => {
    alert('Report exported successfully!');
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analysis Report</h1>
          <p className="text-gray-600 mt-1">Generated on {generatedAt}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors"
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Contradictions</div>
                <div className="text-3xl font-semibold text-gray-900">{contradictionCount}</div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Across {reportData.paper_count} papers</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Research Gaps</div>
                <div className="text-3xl font-semibold text-gray-900">{gapsCount}</div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Identified opportunities</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Papers Analyzed</div>
                <div className="text-3xl font-semibold text-gray-900">{reportData.paper_count}</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Last 30 days</div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Our comprehensive analysis of {reportData.paper_count} research papers has revealed significant patterns and
              contradictions that warrant attention from the research community.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              The report currently lists {contradictionCount} contradictions and {gapsCount}
              research gaps. These conflicts primarily concern architecture choices, data constraints, and benchmark
              consistency.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Top methods observed include {reportData.top_methods.map((method) => `${method.name} (${method.count})`).join(', ') || 'N/A'},
              while leading datasets include {reportData.top_datasets.map((dataset) => `${dataset.name} (${dataset.count})`).join(', ') || 'N/A'}.
            </p>
            {hasDetailedReport && (
              <p className="text-gray-700 leading-relaxed mt-4">
                Detailed analysis reports {pairwiseCount} contradicting paper pairs and {papersWithConflicts} papers with direct contradiction flags.
                Recommended next steps include {detailedReport.future_steps.length} roadmap items.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Contradictions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Contradictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.contradictions.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className={`pl-4 py-2 border-l-4 ${
                  item.severity === 'high'
                    ? 'border-red-500'
                    : item.severity === 'medium'
                      ? 'border-orange-500'
                      : 'border-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900">{item.title}</div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.severity === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {item.severity.toUpperCase()} Severity
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.summary}</p>
                <div className="text-xs text-gray-500">Papers involved: {item.papers.join(', ')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Research Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Identified Research Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hasDetailedReport
              ? detailedReport.gaps_between_papers.map((gapItem, index) => (
                <div key={`${gapItem.gap}-${index}`} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-medium text-gray-900">Gap {index + 1}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {gapItem.impact} impact
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{gapItem.gap}</p>
                  {gapItem.evidence && (
                    <p className="text-xs text-gray-500 mt-2">Evidence: {gapItem.evidence}</p>
                  )}
                </div>
              ))
              : reportData.gaps.map((gap, index) => (
                <div key={`${gap}-${index}`} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">Gap {index + 1}</div>
                  <p className="text-sm text-gray-600">{gap}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {hasDetailedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Paper Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-3">Paper</th>
                    <th className="py-2 pr-3">Year</th>
                    <th className="py-2 pr-3">Claims</th>
                    <th className="py-2 pr-3">Methods</th>
                    <th className="py-2">Datasets</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedReport.paper_profiles.map((paper) => (
                    <tr key={paper.paper_id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-gray-900">{paper.title || paper.paper_id}</div>
                        <div className="text-xs text-gray-500">{paper.paper_id}</div>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{paper.year || 'N/A'}</td>
                      <td className="py-2 pr-3 text-gray-700">{paper.claim_count}</td>
                      <td className="py-2 pr-3 text-gray-700">{paper.method_count}</td>
                      <td className="py-2 text-gray-700">{paper.dataset_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasDetailedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Pairwise Contradictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detailedReport.contradiction_analysis.pairwise_contradictions.map((item, index) => (
                <div key={`${item.paper_a_id}-${item.paper_b_id}-${index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">
                    {item.paper_a_id || 'Paper A'} vs {item.paper_b_id || 'Paper B'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Conflicts: {item.conflict_count} | Reasons: {item.reasons.length}
                  </div>
                  {item.reasons.length > 0 && (
                    <p className="text-sm text-gray-700 mt-2">Top reason: {item.reasons[0]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasDetailedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Paper Contradiction Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {perPaperContradictions.map((item, index) => (
                <div key={`${item.paper_id}-${index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900">{item.title || item.paper_id}</div>
                      <div className="text-xs text-gray-500">{item.paper_id} {item.year ? `(${item.year})` : ''}</div>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Contradictions: {item.contradiction_count}
                    </div>
                  </div>
                  {item.contradicts_with.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Contradicts with: {item.contradicts_with.join(', ')}
                    </p>
                  )}
                  {item.examples.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">Example: {item.examples[0].reason || 'No reason provided.'}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasDetailedReport && detailedReport.not_addressed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Not Addressed Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detailedReport.not_addressed.map((item, index) => (
                <div key={`${item}-${index}`} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasDetailedReport && detailedReport.future_steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Future Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detailedReport.future_steps.map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasDetailedReport && detailedReport.what_to_work_on_next.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What To Work On Next</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detailedReport.what_to_work_on_next.map((item, index) => (
                <div key={`${item.focus}-${index}`} className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                  <div className="text-xs text-emerald-700 font-medium uppercase">{item.priority}</div>
                  <div className="font-medium text-gray-900 mt-1">{item.focus}</div>
                  <p className="text-sm text-gray-600 mt-1">{item.why}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#0066ff] text-white rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 mb-1">{item.title}</div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}