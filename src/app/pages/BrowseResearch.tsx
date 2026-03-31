import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface BrowseStartResponse {
  session_id: string;
  queries?: string[];
  report_gaps?: string[];
}

interface BrowsePaper {
  title: string;
  paper_id: string;
}

interface BrowseStatusResponse {
  session_id?: string;
  status?: string;
  current_url?: string;
  url?: string;
  screenshot_base64?: string;
  screenshot_b64?: string;
  screenshot?: string;
  logs?: unknown[];
  papers_found?: BrowsePaper[];
  report_gaps?: string[];
  gaps?: string[];
  queries?: string[];
}

interface ApiErrorResponse {
  detail?: string;
}

async function ensureResponseOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let detail = `API error: ${response.status}`;
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    if (payload?.detail) {
      detail = payload.detail;
    }
  } catch {
    // Keep default error message when payload is not JSON.
  }

  throw new Error(detail);
}

async function postJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  await ensureResponseOk(response);
  return (await response.json()) as TResponse;
}

async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  await ensureResponseOk(response);
  return (await response.json()) as TResponse;
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

function formatScreenshotSource(base64Payload: string): string {
  if (!base64Payload) {
    return '';
  }

  if (base64Payload.startsWith('data:image')) {
    return base64Payload;
  }

  return `data:image/png;base64,${base64Payload}`;
}

export function BrowseResearch() {
  const pollTimerRef = useRef<number | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<'researching' | 'done' | 'idle'>('idle');
  const [currentUrl, setCurrentUrl] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [papersFound, setPapersFound] = useState<BrowsePaper[]>([]);
  const [reportGaps, setReportGaps] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyStatusResponse = useCallback((payload: BrowseStatusResponse) => {
    const nextStatus = (payload.status || '').toLowerCase();
    if (nextStatus === 'done') {
      setStatus('done');
      clearPollTimer();
    } else {
      setStatus('researching');
    }

    const url = payload.current_url || payload.url || '';
    setCurrentUrl(url);

    const screenshot = payload.screenshot_base64 || payload.screenshot_b64 || payload.screenshot || '';
    setScreenshotBase64(screenshot);

    if (Array.isArray(payload.logs)) {
      setLogs(payload.logs.map(normalizeLogEntry).filter(Boolean));
    }

    if (Array.isArray(payload.papers_found)) {
      setPapersFound(payload.papers_found);
    }

    if (Array.isArray(payload.report_gaps)) {
      setReportGaps(payload.report_gaps);
    } else if (Array.isArray(payload.gaps)) {
      setReportGaps(payload.gaps);
    } else if (Array.isArray(payload.queries)) {
      setReportGaps(payload.queries);
    }
  }, [clearPollTimer]);

  const pollStatus = useCallback(async (activeSessionId: string) => {
    try {
      const payload = await getJson<BrowseStatusResponse>(`/browse/status/${encodeURIComponent(activeSessionId)}`);
      applyStatusResponse(payload);
    } catch (pollError) {
      const detail = pollError instanceof Error ? pollError.message : 'Failed to poll browse status.';
      setError(detail);
      clearPollTimer();
    }
  }, [applyStatusResponse, clearPollTimer]);

  const startSession = useCallback(async () => {
    clearPollTimer();
    setIsStarting(true);
    setError(null);
    setSessionId('');
    setStatus('researching');
    setCurrentUrl('');
    setScreenshotBase64('');
    setLogs([]);
    setPapersFound([]);
    setReportGaps([]);

    try {
      const startPayload = await postJson<BrowseStartResponse>('/browse/start');
      setSessionId(startPayload.session_id);
      if (Array.isArray(startPayload.report_gaps)) {
        setReportGaps(startPayload.report_gaps);
      } else if (Array.isArray(startPayload.queries)) {
        setReportGaps(startPayload.queries);
      }

      await postJson<unknown>(`/browse/run/${encodeURIComponent(startPayload.session_id)}`);
      await pollStatus(startPayload.session_id);

      pollTimerRef.current = window.setInterval(() => {
        void pollStatus(startPayload.session_id);
      }, 1500);
    } catch (startError) {
      const detail = startError instanceof Error ? startError.message : 'Failed to start browse session.';
      setError(detail);
      setStatus('idle');
    } finally {
      setIsStarting(false);
    }
  }, [clearPollTimer, pollStatus]);

  useEffect(() => {
    void startSession();
    return () => {
      clearPollTimer();
    };
  }, [startSession, clearPollTimer]);

  const screenshotSource = useMemo(() => formatScreenshotSource(screenshotBase64), [screenshotBase64]);
  const recentLogs = useMemo(() => logs.slice(-5).reverse(), [logs]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Browse Research</h1>
          <p className="text-gray-600 mt-1">Live browsing session to discover papers and close report gaps</p>
          {sessionId && <p className="text-xs text-gray-500 mt-2">Session: {sessionId}</p>}
        </div>
        {status === 'done' && (
          <button
            type="button"
            onClick={() => void startSession()}
            className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isStarting}
          >
            Start New Session
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
            <CardTitle>Live Browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-gray-200 bg-gray-50 min-h-[360px] flex items-center justify-center overflow-hidden">
              {screenshotSource ? (
                <img src={screenshotSource} alt="Live browsing screenshot" className="w-full h-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {(isStarting || status === 'researching') && <Loader2 className="w-4 h-4 animate-spin" />}
                  Waiting for first screenshot...
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
              <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
              <div className="text-sm text-gray-800">
                {status === 'done' ? 'Done' : 'Researching...'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Recent Logs</div>
              <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-48 overflow-y-auto space-y-1">
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
            <CardTitle>Discovered Papers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-700">
              Papers discovered: <span className="font-semibold text-gray-900">{papersFound.length}</span>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
              {papersFound.length > 0 ? (
                papersFound.map((paper) => (
                  <div key={paper.paper_id} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
                    <div className="font-medium text-gray-900 text-sm">{paper.title || 'Untitled paper'}</div>
                    <div className="text-xs text-gray-500">{paper.paper_id}</div>
                    <button
                      type="button"
                      onClick={() => console.log('Pin to corpus', paper.paper_id)}
                      className="px-3 py-1.5 text-xs bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors"
                    >
                      Pin to corpus
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No papers found yet.</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Researching these gaps:</div>
              <div className="space-y-2">
                {reportGaps.length > 0 ? (
                  reportGaps.map((gap, index) => (
                    <div key={`${gap}-${index}`} className="text-sm text-gray-700 p-2 rounded bg-slate-50 border border-slate-200">
                      {gap}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No gaps listed yet.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
