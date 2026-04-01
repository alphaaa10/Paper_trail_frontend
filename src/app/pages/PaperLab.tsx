import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import ReactMarkdown from 'react-markdown';
import { api, type PlagiarismReportResponse } from '../utils/api';
import { fallbackPlagiarismReport } from '../utils/fallbackData';

const PAPER_SKELETON = `# Persuasive System Design Does Matter: A Systematic Review of Adherence to Web-Based Interventions

**Type:** Original Research Paper  
**Authors:** [Your Name], [Co-Author Name]  
**Affiliation:** [University / Lab / Organization]

## Abstract
**Background:** Web-based interventions are increasingly used in health and behavioral domains, yet sustained user adherence remains inconsistent.  
**Objective:** This study examines which persuasive system design elements are most strongly associated with improved adherence in web-based interventions.  
**Methods:** We conducted a systematic review and structured synthesis of intervention studies, extracting design features, implementation patterns, and adherence outcomes.  
**Results:** Features such as reminders, self-monitoring, and guided support were frequently linked to stronger engagement and completion outcomes.  
**Conclusions:** Persuasive design decisions significantly influence intervention adherence and should be treated as a primary design variable in future systems.

**Keywords:** persuasive design, digital health, intervention adherence, systematic review

## 1. Introduction
Adherence is a central challenge in web-based intervention systems. While intervention content quality matters, design-level persuasion mechanisms can substantially impact how users start, continue, and complete programs.

**Contributions of this paper:**
- We provide a structured overview of persuasive elements used in intervention design.
- We map design elements to observed adherence outcomes.
- We propose practical guidance for future intervention builders.

## 2. Related Work
Prior literature has explored digital intervention efficacy, engagement models, and technology acceptance frameworks. However, cross-study synthesis of concrete persuasive design elements remains limited.

## 3. Methodology
**Study design:** Systematic review with predefined inclusion and exclusion criteria.  
**Data sources:** [Databases used], [date ranges], [search query strategy].  
**Extraction protocol:** Two-pass extraction for intervention features, target population, and adherence metrics.

## 4. Results
Across included studies, persuasive features such as **goal setting**, **social support**, and **automated reminders** appeared repeatedly in higher-adherence interventions.

## 5. Discussion
Findings suggest that adherence is not solely a user motivation issue but also a product-design issue. Persuasive design should be integrated early in intervention architecture decisions.

## 6. Limitations
- Heterogeneous adherence metrics across studies.
- Potential publication bias.
- Limited longitudinal evidence in some intervention categories.

## 7. Conclusion
Persuasive system design is a meaningful predictor of adherence in web-based interventions and deserves stronger methodological attention in future research.

## References
[1] Add your cited papers here in your preferred citation style.
`;

function toPercent(value: number): string {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return `${Math.round(clamped)}%`;
}

function normalizeReport(
  payload: PlagiarismReportResponse,
  fileName: string,
): PlagiarismReportResponse {
  return {
    ...payload,
    input_file_name: payload.input_file_name || fileName,
    analyzed_at: payload.analyzed_at || new Date().toISOString(),
    overall_similarity: Number.isFinite(payload.overall_similarity) ? payload.overall_similarity : 0,
    risk_level: payload.risk_level || 'low',
    summary: payload.summary || 'No summary available.',
    top_matches: Array.isArray(payload.top_matches) ? payload.top_matches : [],
    recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
  };
}

function toFallbackReport(fileName: string): PlagiarismReportResponse {
  return {
    ...fallbackPlagiarismReport,
    input_file_name: fileName,
    analyzed_at: new Date().toISOString(),
  };
}

export function PaperLab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [report, setReport] = useState<PlagiarismReportResponse | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftPaper, setDraftPaper] = useState(PAPER_SKELETON);

  const riskStyle = useMemo(() => {
    if (!report) {
      return 'bg-gray-100 text-gray-700 border-gray-200';
    }

    if (report.risk_level === 'high') {
      return 'bg-red-100 text-red-800 border-red-200';
    }

    if (report.risk_level === 'medium') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }

    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }, [report]);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload a PDF before analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsUsingFallback(false);

    try {
      const payload = await api.analyzeUploadedPaper(selectedFile);
      setReport(normalizeReport(payload, selectedFile.name));
    } catch (analysisError) {
      const detail = analysisError instanceof Error ? analysisError.message : 'Failed to analyze PDF.';
      setError(`Live plagiarism endpoint unavailable (${detail}). Showing demo report.`);
      setIsUsingFallback(true);
      setReport(toFallbackReport(selectedFile.name));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadDraft = () => {
    const blob = new Blob([draftPaper], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'my-research-draft.md';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paper Lab</h1>
          <p className="text-gray-600 mt-1">
            Upload your own paper PDF, compare it with crawled papers, and draft a new paper from a ready-to-edit skeleton.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditorOpen((prev) => !prev)}
          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 transition-colors rounded"
        >
          Write your own paper
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Similarity Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setReport(null);
                setError(null);
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing || !selectedFile}
              className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze against crawled PDFs'}
            </button>
          </div>

          {selectedFile && (
            <p className="text-sm text-gray-600">
              Uploaded file: <span className="font-medium text-gray-800">{selectedFile.name}</span>
            </p>
          )}

          {error && (
            <p className="text-sm text-amber-700">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Plagiarism Context Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isUsingFallback && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Demo mode: this report is using fallback dummy data.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Input File</p>
                <p className="text-sm font-medium text-gray-800 mt-1 break-words">{report.input_file_name}</p>
              </div>
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Overall Similarity</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{toPercent(report.overall_similarity)}</p>
              </div>
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Risk Level</p>
                <p className={`inline-flex mt-1 px-2 py-1 border text-xs font-semibold uppercase ${riskStyle}`}>
                  {report.risk_level}
                </p>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4 bg-white">
              <p className="text-sm text-gray-700">{report.summary}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Top Source Matches</h3>
              {report.top_matches.length === 0 ? (
                <p className="text-sm text-gray-500">No matched sources returned by backend.</p>
              ) : (
                report.top_matches.map((match) => (
                  <div key={`${match.paper_id}-${match.title}`} className="border border-gray-200 rounded p-4 space-y-3 bg-white">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm font-semibold text-gray-900 break-words">{match.title}</p>
                      <p className="text-xs text-gray-600">Similarity: {toPercent(match.similarity)}</p>
                    </div>
                    <p className="text-xs text-gray-500">Paper ID: {match.paper_id}{match.year ? ` • ${match.year}` : ''}</p>

                    <div className="space-y-2">
                      {match.matched_passages.slice(0, 3).map((passage, index) => (
                        <div key={`${match.paper_id}-passage-${index}`} className="border border-gray-200 rounded p-3 bg-gray-50">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {passage.section || 'Matched passage'} • {Math.round((passage.similarity || 0) * 100)}%
                          </p>
                          <p className="text-sm text-gray-700"><span className="font-medium">Your text:</span> {passage.input_excerpt}</p>
                          <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Source:</span> {passage.source_excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900">Recommendations</h3>
              {report.recommendations.length === 0 ? (
                <p className="text-sm text-gray-500">No recommendations available.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {report.recommendations.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isEditorOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Write Your Own Paper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraftPaper(PAPER_SKELETON)}
                className="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded"
              >
                Reset placeholder
              </button>
              <button
                type="button"
                onClick={handleDownloadDraft}
                className="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded"
              >
                Download draft
              </button>
            </div>

            <textarea
              value={draftPaper}
              onChange={(event) => setDraftPaper(event.target.value)}
              rows={24}
              className="w-full border-2 border-gray-300 bg-white p-4 text-sm text-gray-800 font-mono leading-6 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/40"
            />

            <div className="border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Live paper preview</p>
              <article className="prose prose-slate max-w-none prose-headings:font-bold prose-p:leading-relaxed">
                <ReactMarkdown>{draftPaper}</ReactMarkdown>
              </article>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
