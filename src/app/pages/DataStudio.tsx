import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Play, Eye, FileText, Download, Loader2 } from 'lucide-react';
import { api, PaperSummary } from '../utils/api';
import {
  buildFallbackCrawlResponse,
  buildFallbackExtractPaperResponse,
  fallbackExtractAllResponse,
  fallbackPapersResponse,
} from '../utils/fallbackData';

interface PaperRow extends PaperSummary {
  extracted: boolean;
}

const DATA_STUDIO_STATE_KEY = 'data-studio-state-v1';

interface DataStudioState {
  query: string;
  maxPapers: number;
  logs: string[];
  papers: PaperRow[];
}

function buildDefaultPapers(): PaperRow[] {
  return fallbackPapersResponse.papers.map((paper) => ({ ...paper, extracted: false }));
}

function loadPersistedState(): DataStudioState | null {
  try {
    const raw = sessionStorage.getItem(DATA_STUDIO_STATE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DataStudioState;
    if (!parsed || !Array.isArray(parsed.papers) || !Array.isArray(parsed.logs)) {
      return null;
    }

    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      maxPapers: typeof parsed.maxPapers === 'number' ? parsed.maxPapers : 10,
      logs: parsed.logs,
      papers: parsed.papers,
    };
  } catch {
    return null;
  }
}

export function DataStudio() {
  const persistedState = loadPersistedState();
  const [query, setQuery] = useState(persistedState?.query ?? '');
  const [maxPapers, setMaxPapers] = useState(persistedState?.maxPapers ?? 10);
  const [isCrawling, setIsCrawling] = useState(false);
  const [logs, setLogs] = useState<string[]>(persistedState?.logs ?? []);
  const [papers, setPapers] = useState<PaperRow[]>(
    persistedState?.papers ?? buildDefaultPapers(),
  );

  const loadPapers = async () => {
    try {
      const response = await api.listPapers();
      setPapers(response.papers.map((paper) => ({ ...paper, extracted: false })));
    } catch {
      setPapers(fallbackPapersResponse.papers.map((paper) => ({ ...paper, extracted: false })));
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Papers API unavailable. Using fallback data.`]);
    }
  };

  useEffect(() => {
    void loadPapers();
  }, []);

  useEffect(() => {
    try {
      const snapshot: DataStudioState = {
        query,
        maxPapers,
        logs,
        papers,
      };
      sessionStorage.setItem(DATA_STUDIO_STATE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures and keep page behavior unchanged.
    }
  }, [query, maxPapers, logs, papers]);

  const handleCrawl = async () => {
    setIsCrawling(true);
    setLogs([]);

    try {
      const response = await api.crawl({
        question: query,
        topic_count: 4,
        limit_per_source: 5,
        max_papers: maxPapers,
        concurrency: 4,
      });

      setLogs([
        `[${new Date().toLocaleTimeString()}] Crawl started for query: "${query}"`,
        `[${new Date().toLocaleTimeString()}] Discovered: ${response.discovered}`,
        `[${new Date().toLocaleTimeString()}] Deduped: ${response.deduped}`,
        `[${new Date().toLocaleTimeString()}] Attempted: ${response.attempted}`,
        `[${new Date().toLocaleTimeString()}] Saved: ${response.saved} | Skipped: ${response.skipped} | Failed: ${response.failed}`,
      ]);
    } catch {
      const fallbackResponse = buildFallbackCrawlResponse({
        question: query,
        max_papers: maxPapers,
      });
      setLogs([
        `[${new Date().toLocaleTimeString()}] Crawl API unavailable. Using fallback response.`,
        `[${new Date().toLocaleTimeString()}] Discovered: ${fallbackResponse.discovered}`,
        `[${new Date().toLocaleTimeString()}] Saved: ${fallbackResponse.saved} | Failed: ${fallbackResponse.failed}`,
      ]);
    } finally {
      await loadPapers();
      setIsCrawling(false);
    }
  };

  const handleExtract = async (paperId: string) => {
    try {
      await api.extractPaper(paperId);
    } catch {
      buildFallbackExtractPaperResponse(paperId);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Extract API unavailable. Marked ${paperId} as extracted (fallback).`]);
    }

    setPapers((prev) => prev.map((paper) => (paper.paper_id === paperId ? { ...paper, extracted: true } : paper)));
  };

  const handleExtractAll = async () => {
    try {
      await api.extractAll();
    } catch {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Extract-all API unavailable. Using fallback response with ${fallbackExtractAllResponse.processed_count} processed papers.`,
      ]);
    }

    setPapers((prev) => prev.map((paper) => ({ ...paper, extracted: true })));
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Crawl Form */}
      <Card>
        <CardHeader>
          <CardTitle>Crawl Research Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., neural networks, AI safety, machine learning"
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a2e]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Papers: {maxPapers}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={maxPapers}
                onChange={(e) => setMaxPapers(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleCrawl}
              disabled={isCrawling || !query}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a3a2e] text-white hover:bg-[#234136] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Crawl
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-48 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Papers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Papers ({papers.length})</CardTitle>
            <button
              onClick={handleExtractAll}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3a2e] text-white rounded-lg hover:bg-[#234136] transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Extract All
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Year</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Source</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => (
                  <tr key={paper.paper_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{paper.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{paper.year}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{paper.source}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        paper.extracted 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {paper.extracted ? 'Extracted' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {!paper.extracted && (
                          <button
                            onClick={() => void handleExtract(paper.paper_id)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Extract claims"
                          >
                            <FileText className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="View paper"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}