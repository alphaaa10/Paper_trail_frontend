import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import {
  api,
  type BrowseSessionsResponse,
  type BrowseStatusPaper,
  type BrowseStatusResponse,
} from '../utils/api';

type BrowseUiStatus = 'idle' | 'running' | 'done' | 'error';

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

function normalizeBrowseSessions(payload: BrowseSessionsResponse): BrowseSessionsResponse['sessions'] {
  if (Array.isArray((payload as unknown as { sessions?: unknown[] }).sessions)) {
    return payload.sessions;
  }
  return [];
}

export function BrowseResearch() {
  const pollTimerRef = useRef<number | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<BrowseUiStatus>('idle');
  const [sessions, setSessions] = useState<BrowseSessionsResponse['sessions']>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [rawSnapshot, setRawSnapshot] = useState('');
  const [renderedSnapshot, setRenderedSnapshot] = useState('');
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw'>('rendered');
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [papersFound, setPapersFound] = useState<BrowseStatusPaper[]>([]);
  const [queriesDone, setQueriesDone] = useState(0);
  const [queriesTotal, setQueriesTotal] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const payload = await api.getBrowseSessions();
      setSessions(normalizeBrowseSessions(payload));
    } catch {
      // Ignore session list errors to avoid blocking start/run actions.
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const applyStatusResponse = useCallback((payload: BrowseStatusResponse) => {
    const nextStatus = payload.status.toLowerCase();
    if (nextStatus === 'running') {
      setStatus('running');
    } else if (nextStatus === 'done') {
      setStatus('done');
      clearPollTimer();
    } else if (nextStatus === 'error') {
      setStatus('error');
      clearPollTimer();
    } else {
      setStatus('idle');
    }

    setSessionId(payload.session_id || sessionId);
    setCurrentUrl(payload.current_url || '');
    setQueriesDone(payload.queries_done || 0);
    setQueriesTotal(payload.queries_total || 0);
    setLogs(Array.isArray(payload.log) ? payload.log : []);
    setPapersFound(Array.isArray(payload.papers_found) ? payload.papers_found : []);

    const rawXml = payload.raw_xml || decodeBase64Text(payload.screenshot_base64 || '');
    const renderedHtml = payload.rendered_html || decodeBase64Text(payload.rendered_html_base64 || '');
    setRawSnapshot(rawXml);
    setRenderedSnapshot(renderedHtml);

    if (!renderedHtml && rawXml) {
      setTabWarning('Backend rendered HTML is missing. Rendering directly from raw XML.');
    } else {
      setTabWarning(null);
    }
  }, [clearPollTimer, sessionId]);

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

  const startPolling = useCallback((activeSessionId: string) => {
    clearPollTimer();
    pollTimerRef.current = window.setInterval(() => {
      void pollStatus(activeSessionId);
    }, 1500);
  }, [clearPollTimer, pollStatus]);

  const startSession = useCallback(async () => {
    clearPollTimer();
    setIsStarting(true);
    setError(null);
    setSessionId('');
    setStatus('idle');
    setCurrentUrl('');
    setRawSnapshot('');
    setRenderedSnapshot('');
    setLogs([]);
    setPapersFound([]);
    setQueriesDone(0);
    setQueriesTotal(0);

    try {
      const startPayload = await api.browseStart();
      setSessionId(startPayload.session_id);
      setSelectedSession(startPayload.session_id);
      await refreshSessions();
    } catch (startError) {
      const detail = startError instanceof Error ? startError.message : 'Failed to start browse session.';
      setError(detail);
      setStatus('idle');
    } finally {
      setIsStarting(false);
    }
  }, [clearPollTimer, refreshSessions]);

  const runSession = useCallback(async () => {
    if (!sessionId) {
      setError('Create or resume a session before running.');
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const payload = await api.browseRun(sessionId);
      setStatus(payload.status === 'running' ? 'running' : 'idle');
      await pollStatus(sessionId);
      startPolling(sessionId);
    } catch (runError) {
      const detail = runError instanceof Error ? runError.message : 'Failed to run browse session.';
      setError(detail);
      setStatus('error');
      clearPollTimer();
    } finally {
      setIsRunning(false);
    }
  }, [clearPollTimer, pollStatus, sessionId, startPolling]);

  const resumeSession = useCallback(async () => {
    const targetSession = selectedSession || sessionId;
    if (!targetSession) {
      setError('Select a session to resume.');
      return;
    }
    setError(null);
    setSessionId(targetSession);
    await pollStatus(targetSession);
    const payload = await api.browseStatus(targetSession);
    if (payload.status.toLowerCase() === 'running') {
      setStatus('running');
      startPolling(targetSession);
    }
  }, [pollStatus, selectedSession, sessionId, startPolling]);

  useEffect(() => {
    void refreshSessions();
    return () => {
      clearPollTimer();
    };
  }, [clearPollTimer, refreshSessions]);

  const recentLogs = useMemo(() => logs.slice(-5).reverse(), [logs]);
  const hasSnapshot = Boolean(renderedSnapshot || rawSnapshot);
  const renderedDoc = renderedSnapshot || (rawSnapshot ? buildXmlPreviewHtml(rawSnapshot) : '');

  const statusLabel = status === 'running'
    ? 'Running'
    : status === 'done'
      ? 'Completed'
      : status === 'error'
        ? 'Error'
        : 'Idle';

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Browse Research</h1>
          <p className="text-gray-600 mt-1">Start, run, and resume arXiv browse sessions with raw and rendered snapshots.</p>
          {sessionId && <p className="text-xs text-gray-500 mt-2">Session: {sessionId}</p>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={status === 'running' ? 'running' : status === 'done' ? 'completed' : status === 'error' ? 'error' : 'idle'}
            label={statusLabel}
          />
          <button
            type="button"
            onClick={() => void startSession()}
            className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isStarting}
          >
            {isStarting ? 'Starting...' : 'Start Session'}
          </button>
          <button
            type="button"
            onClick={() => void runSession()}
            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isRunning || !sessionId}
          >
            {isRunning ? 'Running...' : 'Run Session'}
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

      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="session-select" className="text-sm text-gray-700">Resume Session</label>
            <select
              id="session-select"
              value={selectedSession}
              onChange={(event) => setSelectedSession(event.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="">Select a session</option>
              {sessions.map((item) => (
                <option key={item.session_id} value={item.session_id}>
                  {item.session_id.slice(0, 8)}... ({item.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void resumeSession()}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 disabled:text-gray-400"
              disabled={!selectedSession}
            >
              Resume
            </button>
          </div>
          <button
            type="button"
            onClick={() => void refreshSessions()}
            className="text-sm text-[#0066ff] hover:underline"
            disabled={isLoadingSessions}
          >
            {isLoadingSessions ? 'Refreshing sessions...' : 'Refresh sessions'}
          </button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Live Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('rendered')}
                className={`px-3 py-1.5 text-sm border ${activeTab === 'rendered' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                Rendered
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1.5 text-sm border ${activeTab === 'raw' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                Raw Text
              </button>
            </div>

            {tabWarning && activeTab === 'rendered' && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{tabWarning}</div>
            )}

            <div className="border border-gray-200 bg-gray-50 min-h-[420px] overflow-hidden">
              {activeTab === 'rendered' && renderedDoc ? (
                <iframe
                  title="Rendered arXiv preview"
                  srcDoc={renderedDoc}
                  className="w-full h-[420px] bg-white"
                />
              ) : activeTab === 'raw' && rawSnapshot ? (
                <pre className="text-xs text-slate-700 p-4 whitespace-pre-wrap max-h-[420px] overflow-auto">{rawSnapshot}</pre>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {(isStarting || isRunning || status === 'running') && <Loader2 className="w-4 h-4 animate-spin" />}
                  Waiting for first arXiv snapshot...
                </div>
              )}
            </div>

            {!hasSnapshot && status === 'idle' && (
              <div className="text-sm text-gray-500">Start a session, run it, then open Rendered or Raw Text.</div>
            )}

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
              <div className="text-sm font-medium text-gray-700 mb-1">Progress</div>
              <div className="text-sm text-gray-800">
                {queriesDone} / {queriesTotal || 0} queries completed
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
                    {paper.url && (
                      <a href={paper.url} target="_blank" rel="noreferrer" className="text-xs text-[#0066ff] hover:underline">
                        Open abstract
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No papers found yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
