import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Play, X, Loader2 } from 'lucide-react';
import {
  api,
  CitationResponse,
  getConfiguredApiBaseUrl,
  getDebatePaperLabel,
  PaperSummary,
  StructuredDebateMultiResponse,
} from '../utils/api';
import {
  fallbackDebateRequest,
  fallbackDebateText,
  fallbackPapersResponse,
} from '../utils/fallbackData';

interface DebateTurn {
  label: string;
  content: string;
}

interface HighlightBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface DebateChatMessage {
  id: string;
  speaker: string;
  content: string;
  paperId?: string;
  citeClaim?: string;
  style: 'a' | 'b' | 'system';
}

function TypingText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    setVisibleText('');

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return <>{visibleText}</>;
}

function normalizeDebateText(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\{"token":\s*"/g, '')
    .replace(/"}\s*/g, '')
    .replace(/\n\s*data:\s*/g, '\n')
    .replace(/\s+event:\s*done\s*$/i, '')
    .trim();
}

function parseDebateTurns(raw: string): DebateTurn[] {
  const cleaned = normalizeDebateText(raw);
  if (!cleaned) {
    return [];
  }

  const markers = [...cleaned.matchAll(/\b(A\d+|B\d+|Verdict):/g)];
  if (markers.length === 0) {
    return [{ label: 'Debate', content: cleaned }];
  }

  const turns: DebateTurn[] = [];
  for (let index = 0; index < markers.length; index++) {
    const current = markers[index];
    const next = markers[index + 1];
    const label = current[1];
    const start = current.index ?? 0;
    const contentStart = start + current[0].length;
    const contentEnd = next?.index ?? cleaned.length;
    const content = cleaned.slice(contentStart, contentEnd).trim();
    if (content) {
      turns.push({ label, content });
    }
  }

  return turns;
}

const API_BASE_URL = getConfiguredApiBaseUrl();

export function Investigation() {
  const [papers, setPapers] = useState<PaperSummary[]>(fallbackPapersResponse.papers);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isDebating, setIsDebating] = useState(false);
  const [debateText, setDebateText] = useState('');
  const [debateChat, setDebateChat] = useState<DebateChatMessage[]>([]);
  const [multiDebateResult, setMultiDebateResult] = useState<StructuredDebateMultiResponse | null>(null);
  const [debateSource, setDebateSource] = useState<'live' | 'fallback' | null>(null);
  const [debateError, setDebateError] = useState<string | null>(null);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [isResolvingCitation, setIsResolvingCitation] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [citation, setCitation] = useState<CitationResponse | null>(null);
  const debateTurns = useMemo(() => parseDebateTurns(debateText), [debateText]);
  const paperTitleMap = useMemo(() => {
    const entries = papers.map((paper) => [paper.paper_id, paper.title] as const);
    return Object.fromEntries(entries);
  }, [papers]);
  const selectedPaperNames = useMemo(
    () => selectedPapers.map((paperId) => paperTitleMap[paperId] || paperId),
    [paperTitleMap, selectedPapers],
  );

  const streamedChatMessages = useMemo<DebateChatMessage[]>(() => {
    return debateTurns.map((turn, index) => {
      const isPaperA = turn.label.startsWith('A');
      const isPaperB = turn.label.startsWith('B');

      return {
        id: `${turn.label}-${index}`,
        speaker: isPaperA
          ? selectedPaperNames[0] || 'Paper 1'
          : isPaperB
            ? selectedPaperNames[1] || 'Paper 2'
            : 'Verdict',
        content: turn.content,
        paperId: isPaperA ? selectedPapers[0] : isPaperB ? selectedPapers[1] : undefined,
        citeClaim: isPaperA || isPaperB ? turn.content : undefined,
        style: isPaperA ? 'a' : isPaperB ? 'b' : 'system',
      };
    });
  }, [debateTurns, selectedPaperNames, selectedPapers]);

  const displayedChatMessages = debateChat.length > 0 ? debateChat : streamedChatMessages;

  const highlightBoxes = useMemo<HighlightBox[]>(() => {
    if (!citation) {
      return [];
    }

    if (citation.highlights && citation.highlights.length > 0) {
      return citation.highlights;
    }

    if (citation.bbox && citation.bbox.length === 4) {
      const [x0, y0, x1, y1] = citation.bbox;
      return [{ x0, y0, x1, y1 }];
    }

    return [];
  }, [citation]);

  useEffect(() => {
    const loadPapers = async () => {
      setIsLoadingPapers(true);
      try {
        const response = await api.listPapers();
        if (response.papers.length > 0) {
          setPapers(response.papers);
        }
      } catch {
        setPapers(fallbackPapersResponse.papers);
      } finally {
        setIsLoadingPapers(false);
      }
    };

    void loadPapers();
  }, []);

  const togglePaper = (id: string) => {
    setSelectedPapers((prev) => {
      if (prev.includes(id)) {
        setSelectionError(null);
        return prev.filter((paperId) => paperId !== id);
      }

      setSelectionError(null);
      return [...prev, id];
    });
  };

  const runDebate = async () => {
    if (selectedPapers.length < 2) {
      setSelectionError('Select at least 2 papers to run debate.');
      return;
    }

    setIsDebating(true);
    setDebateText('');
    setDebateChat([]);
    setMultiDebateResult(null);
    setDebateSource(null);
    setDebateError(null);
    setCitationError(null);
    setSelectionError(null);

    const payload = {
      paper_id_A: selectedPapers[0] ?? fallbackDebateRequest.paper_id_A,
      paper_id_B: selectedPapers[1] ?? fallbackDebateRequest.paper_id_B,
      paper_ids: selectedPapers,
    };

    try {
      if (selectedPapers.length > 2) {
        const structuredDebate = await api.runStructuredDebateMulti(payload);
        if (structuredDebate.pair_debates.length > 0) {
          setMultiDebateResult(structuredDebate);
          setDebateText('');
          setDebateSource('live');
        } else {
          setDebateText(fallbackDebateText);
          setDebateSource('fallback');
          setDebateError('Structured debate returned no chat entries; showing fallback sample text.');
        }
      } else {
        const streamedDebate = await api.runDebate(payload);
        if (streamedDebate.trim().length > 0) {
          setMultiDebateResult(null);
          setDebateText(streamedDebate);
          setDebateSource('live');
        } else {
          setDebateText(fallbackDebateText);
          setDebateSource('fallback');
          setDebateError('Debate API returned an empty response; showing fallback sample text.');
        }
      }
    } catch (error) {
      setDebateText(fallbackDebateText);
      setDebateSource('fallback');
      setDebateError(error instanceof Error ? error.message : 'Debate API request failed.');
    }

    setCitation(null);
    setIsDebating(false);
  };

  function getCitationPdfUrls(citationPayload: CitationResponse): string[] {
    const pdfUrl = (citationPayload.pdf_url || '').trim();
    if (pdfUrl) {
      return [pdfUrl];
    }

    const rawPath = (citationPayload.pdf_path || '').trim();
    if (!rawPath) {
      return [];
    }

    const normalizedPath = rawPath.replace(/\\/g, '/');
    if (/^https?:\/\//i.test(normalizedPath)) {
      return [normalizedPath];
    }

    const fileName = normalizedPath.split('/').pop() || '';
    if (!fileName) {
      return [];
    }

    return [`${API_BASE_URL}/pdf/${encodeURIComponent(fileName)}`];
  }

  function openCitationPdf(citationPayload: CitationResponse, targetWindow?: Window | null): boolean {
    const baseUrls = getCitationPdfUrls(citationPayload);
    if (baseUrls.length === 0) {
      return false;
    }

    const page = Number.isFinite(citationPayload.page_number) ? citationPayload.page_number : 1;
    const primaryPageUrl = `${baseUrls[0]}#page=${page}`;

    if (targetWindow) {
      try {
        targetWindow.location.href = primaryPageUrl;
        return true;
      } catch {
        // Fall through to direct open when reusing target window fails.
      }
    }

    const opened = window.open(primaryPageUrl, '_blank');
    return opened !== null;
  }

  const handleChatMessageClick = async (message: DebateChatMessage) => {
    if (!message.paperId || !message.citeClaim || !message.citeClaim.trim()) {
      setCitationError('This message does not contain a citation-ready claim.');
      return;
    }

    setCitationError(null);
    setIsResolvingCitation(true);
    // Open a placeholder tab synchronously so popup blockers do not block the final PDF navigation.
    const popupWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const citationResponse = await api.getCitation({
        paper_id: message.paperId,
        claim_text: message.citeClaim.trim(),
      });
      setCitation(citationResponse);
      const opened = openCitationPdf(citationResponse, popupWindow);
      if (!opened) {
        setCitationError('Could not open PDF tab. If backend returns file:/// paths, serve PDFs over http://127.0.0.1:8000/data/pdf/... or allow local file access in browser settings.');
      }
    } catch (error) {
      popupWindow?.close();
      setCitation(null);
      setCitationError(error instanceof Error ? error.message : 'Could not resolve citation for this claim.');
    } finally {
      setIsResolvingCitation(false);
    }
  };

  const handleClear = () => {
    setSelectedPapers([]);
    setDebateText('');
    setDebateChat([]);
    setMultiDebateResult(null);
    setDebateSource(null);
    setDebateError(null);
    setCitation(null);
    setCitationError(null);
    setSelectionError(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Deep Investigation</h1>
        <p className="text-gray-600 mt-1">Analyze contradictions and debates between papers</p>
      </div>

      {/* Paper Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Papers for Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoadingPapers && (
              <div className="text-sm text-gray-500">Loading papers...</div>
            )}
            {papers.map((paper) => (
              <label
                key={paper.paper_id}
                className="flex items-center gap-3 p-3 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedPapers.includes(paper.paper_id)}
                  onChange={() => togglePaper(paper.paper_id)}
                  className="w-4 h-4 text-[#0066ff] rounded focus:ring-[#0066ff]"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{paper.title}</div>
                  <div className="text-sm text-gray-500">{paper.year}</div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => void runDebate()}
              disabled={selectedPapers.length < 2 || isDebating}
              className="flex items-center gap-2 px-6 py-3 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isDebating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Debate Analysis
                </>
              )}
            </button>
            
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5" />
              Clear
            </button>
          </div>
          
          {selectionError && (
            <p className="text-sm text-amber-600 mt-3">{selectionError}</p>
          )}

          {selectedPapers.length > 2 && (
            <p className="text-sm text-blue-600 mt-3">
              Multi-paper mode enabled. Results are shown as pairwise chat threads.
            </p>
          )}

          {selectedPapers.length < 2 && !selectionError && selectedPapers.length > 0 && (
            <p className="text-sm text-amber-600 mt-3">
              Select at least 2 papers to run debate analysis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Debate Panel */}
      {(debateText || displayedChatMessages.length > 0 || (multiDebateResult?.pair_debates.length ?? 0) > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Debate Chat</CardTitle>
              {isDebating && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Streaming...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {debateSource === 'fallback' && (
              <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Showing fallback debate text. Live API was not used successfully.
                {debateError ? ` Reason: ${debateError}` : ''}
              </div>
            )}

            {debateSource === 'live' && (
              <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                Live debate response loaded from API.
              </div>
            )}

            <div className="space-y-3">
              {multiDebateResult ? multiDebateResult.pair_debates.map((pair, pairIndex) => {
                const paperALabel = getDebatePaperLabel(pair.paper_A) || pair.paper_A.id || 'Paper A';
                const paperBLabel = getDebatePaperLabel(pair.paper_B) || pair.paper_B.id || 'Paper B';
                const paperOneSpeaker = `Paper 1 - ${paperALabel}`;
                const paperTwoSpeaker = `Paper 2 - ${paperBLabel}`;
                const pairSummary = typeof pair.verdict_card.narrative === 'string'
                  ? pair.verdict_card.narrative
                  : `Pair ${pairIndex + 1}: ${paperALabel} vs ${paperBLabel}`;
                const contradictionSnippets = (pair.contradiction_report?.claim_level_contradictions || [])
                  .slice(0, 2)
                  .map((item) => `${paperALabel}: ${item.paper_A_claim}\n${paperBLabel}: ${item.paper_B_claim}`)
                  .join('\n\n');
                const liveMode = (pair.live_debate?.mode || multiDebateResult.summary.live_debate_mode || '').toLowerCase();
                const liveText = (pair.live_debate?.text || '').trim();
                const mainDebateText = pair.live_debate
                  ? (liveText || contradictionSnippets || pairSummary)
                  : pairSummary;
                const parsedMainTurns = parseDebateTurns(mainDebateText);
                const modeBadgeText = liveMode || 'unknown';
                const axisEntries = Object.entries(pair.axes_analysis);

                return (
                  <div
                    key={`${pair.paper_A.id}-${pair.paper_B.id}-${pairIndex}`}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-sm font-semibold text-gray-800">
                        {paperALabel} vs {paperBLabel}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${liveMode === 'groq' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {modeBadgeText}
                      </span>
                    </div>

                    {liveMode === 'fallback' && (
                      <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        Limited quality fallback used.
                      </div>
                    )}

                    <div className="space-y-2">
                      {parsedMainTurns.map((turn, turnIndex) => {
                        const isA = turn.label.startsWith('A');
                        const isB = turn.label.startsWith('B');
                        const speaker = isA ? paperOneSpeaker : isB ? paperTwoSpeaker : 'Moderator';
                        const bubbleStyle = isA
                          ? 'bg-blue-50 border-blue-200'
                          : isB
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200';

                        return (
                          <div key={`${pairIndex}-turn-${turnIndex}`} className={`rounded-md border p-3 ${bubbleStyle}`}>
                            <div className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-1">
                              {speaker}
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{turn.content}</p>
                          </div>
                        );
                      })}
                    </div>

                    <details className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Contradiction Report
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div className="text-xs text-gray-500">
                          Count: {pair.contradiction_report?.contradiction_count ?? 0}
                        </div>
                        {(pair.contradiction_report?.claim_level_contradictions || []).map((item, itemIndex) => (
                          <div key={`${pairIndex}-claim-${itemIndex}`} className="rounded-md border border-gray-200 bg-white p-3">
                            <div className="text-xs text-gray-600 mb-1">{paperOneSpeaker}</div>
                            <p className="text-sm text-gray-800">{item.paper_A_claim}</p>
                            <div className="text-xs text-gray-600 mt-2 mb-1">{paperTwoSpeaker}</div>
                            <p className="text-sm text-gray-800">{item.paper_B_claim}</p>
                            <div className="mt-2 text-xs text-gray-600">Reasoning: {item.logical_reasoning}</div>
                            <div className="text-xs text-gray-500">Confidence: {item.confidence}</div>
                          </div>
                        ))}
                      </div>
                    </details>

                    <details className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Axes Analysis
                      </summary>
                      <div className="mt-3 space-y-3">
                        {axisEntries.map(([axisKey, axis]) => (
                          <div key={`${pairIndex}-${axisKey}`} className="rounded-md border border-gray-200 bg-white p-3">
                            <div className="text-sm font-medium text-gray-800">{axis.description || axis.axis || axisKey}</div>
                            <div className="text-xs text-gray-500 mt-1">Winner: {axis.winner} | Score diff: {axis.score_diff}</div>
                            <div className="mt-2 text-xs text-gray-600">{paperOneSpeaker} premise:</div>
                            <p className="text-sm text-gray-800">{axis.logical_reasoning?.premise_A || 'Not provided.'}</p>
                            <div className="mt-2 text-xs text-gray-600">{paperTwoSpeaker} premise:</div>
                            <p className="text-sm text-gray-800">{axis.logical_reasoning?.premise_B || 'Not provided.'}</p>
                            <div className="mt-2 text-xs text-gray-600">Inference:</div>
                            <p className="text-sm text-gray-800">{axis.logical_reasoning?.inference || 'Not provided.'}</p>
                            <div className="text-xs text-gray-500">Confidence: {axis.logical_reasoning?.confidence || 'medium'}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              }) : displayedChatMessages.map((message) => {
                const cardStyle = message.style === 'a'
                  ? 'border-blue-200 bg-blue-50'
                  : message.style === 'b'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50';
                const canCite = Boolean(message.paperId && message.citeClaim);

                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      if (canCite) {
                        void handleChatMessageClick(message);
                      }
                    }}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${canCite ? 'hover:ring-2 hover:ring-[#0066ff] cursor-pointer' : 'cursor-default'} ${cardStyle}`}
                    title={canCite ? 'Click to view citation in PDF' : 'No citation available for this message'}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                        {message.speaker}
                      </span>
                      <span className="text-xs text-gray-500">{canCite ? 'Click to cite' : 'Info'}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      <TypingText text={message.content} />
                    </p>
                  </button>
                );
              })}

              {!multiDebateResult && displayedChatMessages.length === 0 && debateText && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 min-h-64">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {debateText}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Citation Viewer Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Citation Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          {isResolvingCitation && (
            <div className="mb-4 flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Resolving citation for selected claim...
            </div>
          )}

          {citationError && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {citationError}
            </div>
          )}

          {citation ? (
            <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Paper:</span> {citation.paper_display_name || citation.paper_id}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Claim:</span> {citation.claim_text}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">PDF Path:</span> {citation.pdf_path}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Page:</span> {citation.page_number}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openCitationPdf(citation)}
                  className="px-3 py-2 text-sm bg-[#0066ff] text-white rounded hover:bg-[#0052cc] transition-colors"
                >
                  Open PDF at Page {citation.page_number}
                </button>
              </div>

              {highlightBoxes.length > 0 && (
                <div className="pt-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Highlight Overlay Preview</div>
                  <div className="relative w-full h-64 rounded-lg border border-blue-200 bg-white overflow-hidden">
                    {(() => {
                      const maxX = Math.max(...highlightBoxes.map((box) => box.x1), 1);
                      const maxY = Math.max(...highlightBoxes.map((box) => box.y1), 1);

                      return highlightBoxes.map((box, index) => {
                        const left = (box.x0 / maxX) * 100;
                        const top = (box.y0 / maxY) * 100;
                        const width = ((box.x1 - box.x0) / maxX) * 100;
                        const height = ((box.y1 - box.y0) / maxY) * 100;

                        return (
                          <div
                            key={`${box.x0}-${box.y0}-${index}`}
                            className="absolute border-2 border-amber-500 bg-amber-200/40"
                            style={{
                              left: `${Math.max(left, 0)}%`,
                              top: `${Math.max(top, 0)}%`,
                              width: `${Math.max(width, 1)}%`,
                              height: `${Math.max(height, 1)}%`,
                            }}
                          />
                        );
                      });
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {citation.coordinate_space ? `Coordinate space: ${citation.coordinate_space}` : 'Coordinate space not provided by backend.'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">
                Click any debate/claim card to open citation and PDF page
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}