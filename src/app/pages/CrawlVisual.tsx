import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { api, BrowseStatusResponse } from '../utils/api';

type CrawlVisualStatus = 'idle' | 'running' | 'done' | 'error';
type CrawlVisualPhase = 'Searching' | 'Downloading' | 'Extracting' | 'Done';

interface CrawlVisualPaper {
  paper_id: string;
  title: string;
  status: string;
}

interface RouteState {
  query?: string;
  maxPapers?: number;
  limitPerSource?: number;
}

function decodeBase64Text(base64Payload: string): string {
  if (!base64Payload) {
    return '';
  }

  try {
    const binary = window.atob(base64Payload);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildXmlPreviewHtml(xmlText: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>arXiv XML Preview</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #111827; }
      h2 { margin: 0 0 12px 0; font-size: 16px; }
      pre { margin: 0; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #ffffff; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h2>Rendered from raw XML</h2>
    <pre>${escapeHtml(xmlText)}</pre>
  </body>
</html>`;
}

function normalizeLogEntry(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const payload = value as Record<string, unknown>;
    const message = typeof payload.message === 'string' ? payload.message : '';
    const event = typeof payload.event === 'string' ? payload.event : '';
    const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';
    const line = [timestamp, event, message].filter(Boolean).join(' | ');
    if (line) {
      return line;
    }
  }

  return String(value ?? '');
}

function normalizePaper(value: unknown): CrawlVisualPaper | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const paperId = typeof payload.paper_id === 'string' ? payload.paper_id : '';
  if (!paperId) {
    return null;
  }

  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title
    : paperId;

  const status = typeof payload.status === 'string' && payload.status.trim()
    ? payload.status.toLowerCase()
    : 'discovered';

  return {
    paper_id: paperId,
    title,
    status,
  };
}

function normalizePhase(status: CrawlVisualStatus, statusText: string, phaseText: string): CrawlVisualPhase {
  if (status === 'done') {
    return 'Done';
  }

  const normalized = `${phaseText} ${statusText}`.toLowerCase();
  if (normalized.includes('extract')) {
    return 'Extracting';
  }
  if (normalized.includes('download')) {
    return 'Downloading';
  }
  return 'Searching';
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'extracted') {
    return 'bg-green-100 text-green-700';
  }
  if (normalized === 'saved') {
    return 'bg-blue-100 text-blue-700';
  }
  if (normalized === 'downloading') {
    return 'bg-yellow-100 text-yellow-700';
  }
  if (normalized === 'failed') {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-700';
}

export function CrawlVisual() {
  const location = useLocation();
  const routeState = (location.state as RouteState | null) ?? null;
  const initialQuery = (routeState?.query || '').trim();
  const initialMaxPapers = typeof routeState?.maxPapers === 'number' ? routeState.maxPapers : 10;
  const initialLimitPerSource = typeof routeState?.limitPerSource === 'number' ? routeState.limitPerSource : 5;

  const pollTimerRef = useRef<number | null>(null);
  const [query] = useState(initialQuery);
  const [maxPapers] = useState(initialMaxPapers);
  const [limitPerSource] = useState(initialLimitPerSource);
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<CrawlVisualStatus>('idle');
  const [phase, setPhase] = useState<CrawlVisualPhase>('Searching');
  const [currentUrl, setCurrentUrl] = useState('');
  const [rawSnapshot, setRawSnapshot] = useState('');
  const [renderedSnapshot, setRenderedSnapshot] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [papers, setPapers] = useState<CrawlVisualPaper[]>([]);
  const [stats, setStats] = useState({ discovered: 0, downloaded: 0, extracted: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyStatusResponse = useCallback((payload: BrowseStatusResponse) => {
    const normalizedStatus = (payload.status || '').toLowerCase();
    const nextStatus: CrawlVisualStatus = normalizedStatus === 'done'
      ? 'done'
      : normalizedStatus === 'error'
        ? 'error'
        : 'running';

    setStatus(nextStatus);
    if (nextStatus === 'done' || nextStatus === 'error') {
      clearPollTimer();
    }

    const statusText = payload.status || '';
    const phaseValue = normalizePhase(nextStatus, statusText, '');
    setPhase(phaseValue);

    setCurrentUrl(payload.current_url || '');
    const rawXml = payload.raw_xml || decodeBase64Text(payload.screenshot_base64 || '');
    const renderedHtml = payload.rendered_html || decodeBase64Text(payload.rendered_html_base64 || '');
    setRawSnapshot(rawXml);
    setRenderedSnapshot(renderedHtml);

    const normalizedLogs = Array.isArray(payload.log)
      ? payload.log.map(normalizeLogEntry).filter(Boolean)
      : [];
    setLogs(normalizedLogs);

    const normalizedPapers = Array.isArray(payload.papers_found)
      ? payload.papers_found.map(normalizePaper).filter((item): item is CrawlVisualPaper => item !== null)
      : [];
    setPapers(normalizedPapers);

    setStats({
      discovered: normalizedPapers.length,
      downloaded: normalizedPapers.filter((p) => p.status === 'saved' || p.status === 'extracted').length,
      extracted: normalizedPapers.filter((p) => p.status === 'extracted').length,
      failed: normalizedPapers.filter((p) => p.status === 'failed').length,
    });

    if (nextStatus === 'error') {
      setError((prev) => prev ?? 'Browse session failed.');
    }
  }, [clearPollTimer]);

  const pollStatus = useCallback(async (activeSessionId: string) => {
    try {
      const payload = await api.browseStatus(activeSessionId);
      applyStatusResponse(payload);
    } catch (pollError) {
      const detail = pollError instanceof Error ? pollError.message : 'Failed to poll browse status.';
      setError(detail);
      setStatus('error');
      clearPollTimer();
    }
  }, [applyStatusResponse, clearPollTimer]);

  const startRun = useCallback(async () => {
    clearPollTimer();
    setError(null);
    setSessionId('');
    setStatus('running');
    setPhase('Searching');
    setCurrentUrl('');
    setRawSnapshot('');
    setRenderedSnapshot('');
    setLogs([]);
    setPapers([]);
    setStats({ discovered: 0, downloaded: 0, extracted: 0, failed: 0 });

    try {
      const startPayload = await api.browseStart();
      setSessionId(startPayload.session_id);

      await api.browseRun(startPayload.session_id);
      await pollStatus(startPayload.session_id);

      pollTimerRef.current = window.setInterval(() => {
        void pollStatus(startPayload.session_id);
      }, 1500);
    } catch (startError) {
      const detail = startError instanceof Error ? startError.message : 'Failed to start browse session.';
      setError(detail);
      setStatus('error');
      clearPollTimer();
    }
  }, [clearPollTimer, limitPerSource, maxPapers, pollStatus, query]);

  useEffect(() => {
    if (!query) {
      setStatus('error');
      setError('No query provided. Start from Data Studio with a search query.');
    }

    return () => {
      clearPollTimer();
    };
  }, [clearPollTimer, query]);

  const renderedDoc = useMemo(
    () => renderedSnapshot || (rawSnapshot ? buildXmlPreviewHtml(rawSnapshot) : ''),
    [rawSnapshot, renderedSnapshot],
  );
  const recentLogs = useMemo(() => logs.slice(-8).reverse(), [logs]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Crawl Visual</h1>
          <p className="text-gray-600 mt-1">Agent is researching</p>
          {query && <p className="text-xs text-gray-500 mt-2">Query: {query}</p>}
          <p className="text-xs text-gray-500 mt-1">Max papers: {maxPapers} | Limit/source: {limitPerSource}</p>
          {sessionId && <p className="text-xs text-gray-500 mt-1">Session: {sessionId}</p>}
        </div>
        {query && (
          <button
            type="button"
            onClick={() => void startRun()}
            className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors"
          >
            {status === 'idle' ? 'Start Run' : 'Run Again'}
          </button>
        )}
      </div>

      {error && (
        <Card>
          <CardContent>
            <p className="text-sm text-amber-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Agent is researching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-gray-200 bg-gray-50 min-h-[360px] flex items-center justify-center overflow-hidden">
              {renderedDoc ? (
                <iframe
                  title="Rendered arXiv preview"
                  srcDoc={renderedDoc}
                  className="w-full h-[360px] bg-white"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Waiting for rendered snapshot...
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Current URL</div>
              {currentUrl ? (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#0066ff] hover:underline break-all"
                >
                  {currentUrl}
                </a>
              ) : (
                <div className="text-sm text-gray-500">No URL yet</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Phase</div>
              <div className="text-sm text-gray-800">{phase}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Logs</div>
              <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-52 overflow-y-auto space-y-1">
                {recentLogs.length > 0 ? (
                  recentLogs.map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))
                ) : (
                  <div>No logs yet</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Papers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs text-gray-500">Discovered</div>
                <div className="text-lg font-semibold text-gray-900">{stats.discovered}</div>
              </div>
              <div className="p-2 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs text-gray-500">Downloaded</div>
                <div className="text-lg font-semibold text-gray-900">{stats.downloaded}</div>
              </div>
              <div className="p-2 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs text-gray-500">Extracted</div>
                <div className="text-lg font-semibold text-gray-900">{stats.extracted}</div>
              </div>
              <div className="p-2 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs text-gray-500">Failed</div>
                <div className="text-lg font-semibold text-gray-900">{stats.failed}</div>
              </div>
            </div>

            <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
              {papers.length > 0 ? (
                papers.map((paper) => (
                  <div key={paper.paper_id} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
                    <div className="font-medium text-gray-900 text-sm">{paper.title || paper.paper_id}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500 truncate">{paper.paper_id}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(paper.status)}`}>
                        {paper.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">Waiting for papers...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
