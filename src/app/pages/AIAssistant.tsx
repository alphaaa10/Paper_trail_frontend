import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import {
  Send,
  Bot,
  User,
  Loader2,
  Copy,
  ExternalLink,
  Sparkles,
  Quote,
  FileText,
  Funnel,
} from 'lucide-react';
import {
  api,
  CitationAwareChatResponse,
  CitationAwareClaim,
  CitationResponse,
} from '../utils/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citationData?: CitationAwareChatResponse;
}

interface QuickAction {
  label: string;
  prompt: string;
  tone: string;
}

function normalizeAnswerContent(raw: string): string {
  const normalized = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return 'No answer was returned.';
  }

  return normalized;
}

function titleCase(input: string): string {
  return input
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

function normalizeCitations(citations: CitationAwareClaim[]): CitationAwareClaim[] {
  const unique = new Map<string, CitationAwareClaim>();

  citations.forEach((citation) => {
    const key = `${citation.paper_id}::${citation.claim_text}`;
    if (!unique.has(key)) {
      unique.set(key, citation);
      return;
    }

    const current = unique.get(key);
    if (!current) {
      return;
    }

    if ((citation.relevance_score || 0) > (current.relevance_score || 0)) {
      unique.set(key, citation);
    }
  });

  return Array.from(unique.values()).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}

function toPercent(score: number): string {
  const safe = Number.isFinite(score) ? score : 0;
  const bounded = Math.max(0, Math.min(1, safe));
  return `${Math.round(bounded * 100)}%`;
}

function getCitationPdfUrl(citationPayload: CitationResponse): string {
  const rawPath = (citationPayload.pdf_url || citationPayload.pdf_path || '').trim();
  if (!rawPath) {
    return '';
  }

  if (/^https?:\/\//i.test(rawPath) || /^file:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedPath = rawPath.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(normalizedPath)) {
    return `file:///${normalizedPath}`;
  }

  return normalizedPath;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        "Ask any research question and I will return a structured answer first, followed by source citations.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [paperIdsInput, setPaperIdsInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isResolvingCitation, setIsResolvingCitation] = useState(false);
  const [activeCitationKey, setActiveCitationKey] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      label: 'Landscape Brief',
      prompt: 'Give me a structured landscape brief: dominant findings, methods, and unresolved gaps.',
      tone: 'Synthesis',
    },
    {
      label: 'Method Tradeoffs',
      prompt: 'Compare the most common methods and explain where each fails.',
      tone: 'Comparison',
    },
    {
      label: 'Contradiction Drilldown',
      prompt: 'List major contradictions and explain likely reasons behind each one.',
      tone: 'Conflict',
    },
    {
      label: 'Next Research Bets',
      prompt: 'Propose highest-impact next steps based on the extracted corpus.',
      tone: 'Planning',
    },
  ];

  function parsePaperIds(raw: string): string[] {
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  async function copyCitation(paperId: string, claimText: string): Promise<void> {
    const text = `[${paperId}] ${claimText}`;
    try {
      await navigator.clipboard.writeText(text);
      setStatusText('Citation copied to clipboard.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Clipboard write failed.';
      setStatusText(`Copy failed: ${detail}`);
    }
  }

  async function jumpToCitation(paperId: string, claimText: string): Promise<void> {
    const citationKey = `${paperId}:${claimText}`;
    setActiveCitationKey(citationKey);
    setIsResolvingCitation(true);
    setStatusText('Resolving citation location...');

    try {
      const citation = await api.getCitation({
        paper_id: paperId,
        claim_text: claimText,
      });

      const url = getCitationPdfUrl(citation);
      const page = Number.isFinite(citation.page_number) ? citation.page_number : 1;
      if (url) {
        window.open(`${url}#page=${page}`, '_blank', 'noopener,noreferrer');
        setStatusText(`Opened ${paperId} at page ${page}.`);
      } else {
        setStatusText(`Citation found for ${paperId}, but no PDF URL/path was returned.`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Could not resolve PDF location.';
      setStatusText(`Citation lookup failed: ${detail}`);
    } finally {
      setActiveCitationKey(null);
      setIsResolvingCitation(false);
    }
  }

  const handleSend = async (content: string) => {
    const question = content.trim();
    if (!question || isTyping) return;

    const paperIds = parsePaperIds(paperIdsInput);
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setStatusText('Generating answer with citations...');

    try {
      const response = await api.askCitationQuestion({
        question,
        paper_ids: paperIds,
        require_citations: true,
      });

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: normalizeAnswerContent(response.answer || response.answer_with_citations || ''),
        timestamp: new Date(),
        citationData: {
          ...response,
          citations: normalizeCitations(response.citations || []),
          answer: normalizeAnswerContent(response.answer || ''),
          answer_with_citations: normalizeAnswerContent(response.answer_with_citations || ''),
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatusText(
        `Generated ${response.citations.length} citation(s) from ${response.papers_considered} paper(s) in ${response.mode} mode.`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Failed to get an answer.';
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Request failed: ${detail}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatusText(`Request failed: ${detail}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant' && message.citationData);

  const latestCitationCount = latestAssistant?.citationData?.citations.length || 0;

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-10">
      <div className="pointer-events-none absolute -top-6 -left-6 h-40 w-40 rounded-full bg-[#e8dcc3]/60 blur-2xl" />
      <div className="pointer-events-none absolute -right-4 top-20 h-44 w-44 rounded-full bg-[#cdb483]/40 blur-2xl" />

      <Card className="relative overflow-hidden border-[#d5c4a4] bg-gradient-to-br from-[#fffdfa] via-[#f8f2e8] to-[#efe6d7]">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 border border-[#dbc6a1] bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#8f7237]">
                <Sparkles className="h-3.5 w-3.5" />
                Citation-grounded assistant
              </p>
              <h1 className="text-3xl leading-tight text-[#2a1f12] md:text-4xl [font-family:Georgia,'Times_New_Roman',serif]">
                Ask better questions. Read clearer answers.
              </h1>
              <p className="max-w-2xl text-sm text-[#6f592b] md:text-base">
                Every response is rendered in a structured reading format first. Evidence appears after that in a dedicated citations block.
              </p>
              {statusText && <p className="text-sm font-medium text-[#7b5b1b]">{statusText}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-[320px]">
              <div className="border border-[#dbc6a1] bg-white/85 p-3">
                <div className="text-[11px] uppercase tracking-wide text-[#9a7438]">Messages</div>
                <div className="mt-1 text-xl font-semibold text-[#2f2614]">{messages.length}</div>
              </div>
              <div className="border border-[#dbc6a1] bg-white/85 p-3">
                <div className="text-[11px] uppercase tracking-wide text-[#9a7438]">Latest Citations</div>
                <div className="mt-1 text-xl font-semibold text-[#2f2614]">{latestCitationCount}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.prompt)}
            className="group border border-[#d8ccb8] bg-white/90 p-4 text-left transition-colors hover:border-[#a97e35] hover:bg-[#fcf7ee]"
          >
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#9a7438]">{action.tone}</div>
            <div className="mt-1 text-sm font-semibold text-[#2f2614] group-hover:text-[#5f4316]">{action.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="h-[680px] border-[#d8ccb8] bg-white/95 p-0">
          <CardHeader className="border-b border-[#e8e1d2] px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-[#2f2614]">
              <Bot className="h-5 w-5 text-[#8e6a2a]" />
              Conversation
            </CardTitle>
          </CardHeader>

          <CardContent className="flex h-[calc(100%-78px)] min-h-0 flex-col p-0">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#d6c29f] bg-[#f4ead8]">
                      <Bot className="h-4 w-4 text-[#7b5b1b]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[86%] border p-4 ${
                      message.role === 'user'
                        ? 'border-[#ac8340] bg-[#7f5d1d] text-[#fff9ef]'
                        : 'border-[#e2d6c1] bg-[#fbf8f2] text-[#2f2614]'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-1.5 border border-[#dccfb3] bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[#8f7237]">
                            <FileText className="h-3.5 w-3.5" />
                            Formatted response
                          </div>
                          <div className="prose prose-sm max-w-none text-[#3a2d15]">
                            <ReactMarkdown>{normalizeAnswerContent(message.content)}</ReactMarkdown>
                          </div>
                        </div>

                        {message.citationData && (
                          <div className="space-y-3 border-t border-[#e6dbc7] pt-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8f7237]">
                              <span className="inline-flex items-center gap-1 border border-[#dccfb3] bg-white px-2 py-1">
                                <Quote className="h-3 w-3" />
                                Sources and citations
                              </span>
                              <span className="inline-flex border border-[#dccfb3] bg-white px-2 py-1">
                                Mode: {titleCase(message.citationData.mode || 'unknown')}
                              </span>
                              <span className="inline-flex border border-[#dccfb3] bg-white px-2 py-1">
                                Papers: {message.citationData.papers_considered}
                              </span>
                            </div>

                            {message.citationData.citations.length > 0 ? (
                              <div className="space-y-2">
                                {message.citationData.citations.map((citation, index) => {
                                  const citationKey = `${citation.paper_id}:${citation.claim_text}`;
                                  const isCurrentCitation = isResolvingCitation && activeCitationKey === citationKey;
                                  return (
                                    <div key={citationKey} className="border border-[#e1d6c2] bg-white p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <strong className="text-xs text-[#2f2614]">
                                          [{index + 1}] {citation.paper_id}
                                        </strong>
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                          <span className="border border-[#d8ccb8] bg-[#f8f2e7] px-2 py-0.5 text-[#6f592b]">
                                            {titleCase(citation.section || 'claim')}
                                          </span>
                                          <span className="border border-[#cdb483] bg-[#f3e6cc] px-2 py-0.5 text-[#5f4316]">
                                            {toPercent(citation.relevance_score || 0)}
                                          </span>
                                        </div>
                                      </div>

                                      <p className="mt-2 border-l-2 border-[#d2c2a6] bg-[#fcf8f0] p-2 text-xs italic text-[#5f4a23]">
                                        &quot;{citation.claim_text}&quot;
                                      </p>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void copyCitation(citation.paper_id, citation.claim_text)}
                                          className="inline-flex items-center gap-1 border border-[#d8ccb8] bg-[#f7f0e2] px-2 py-1 text-xs text-[#4d3b1d] transition-colors hover:bg-[#eddcbc]"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                          Copy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void jumpToCitation(citation.paper_id, citation.claim_text)}
                                          disabled={isCurrentCitation}
                                          className="inline-flex items-center gap-1 border border-[#d8ccb8] bg-[#f7f0e2] px-2 py-1 text-xs text-[#4d3b1d] transition-colors hover:bg-[#eddcbc] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {isCurrentCitation ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          )}
                                          Open PDF
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[#8f7237]">No backing claims were returned for this answer.</p>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-[#8f7237]">{message.timestamp.toLocaleTimeString()}</div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</div>
                        <div className="mt-2 text-xs text-[#eedcb9]">{message.timestamp.toLocaleTimeString()}</div>
                      </>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#ac8340] bg-[#6d4f19]">
                      <User className="h-4 w-4 text-[#fff9ef]" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center border border-[#d6c29f] bg-[#f4ead8]">
                    <Bot className="h-4 w-4 text-[#7b5b1b]" />
                  </div>
                  <div className="border border-[#e2d6c1] bg-[#fbf8f2] p-4 text-sm text-[#8f7237]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing structured answer and citations...
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#e8e1d2] p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px]">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-[#8f7237]">Your Question</label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                      placeholder="Ask about findings, methods, gaps, or contradictions..."
                      className="w-full border border-[#d8ccb8] bg-[#fffdfa] px-4 py-3 text-[#2f2614] focus:outline-none focus:ring-2 focus:ring-[#b89a5f]"
                      disabled={isTyping}
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-[#8f7237]">
                      <Funnel className="h-3.5 w-3.5" />
                      Optional paper filter
                    </label>
                    <input
                      type="text"
                      value={paperIdsInput}
                      onChange={(e) => setPaperIdsInput(e.target.value)}
                      placeholder="p1, p2, p3"
                      className="w-full border border-[#d8ccb8] bg-[#fffdfa] px-4 py-3 text-[#2f2614] focus:outline-none focus:ring-2 focus:ring-[#b89a5f]"
                      disabled={isTyping}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isTyping}
                  className="inline-flex items-center gap-2 border border-[#8f6a2a] bg-[#7f5d1d] px-5 py-2.5 text-sm font-semibold text-[#fff9ef] transition-colors hover:bg-[#6d4f19] disabled:cursor-not-allowed disabled:border-[#d2c2a6] disabled:bg-[#d2c2a6]"
                >
                  <Send className="h-4 w-4" />
                  Send question
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#d8ccb8] bg-white/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#2f2614]">Response Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[#6f592b]">
              <p>1. Answer is shown in formatted reading mode.</p>
              <p>2. Citations appear afterward in an evidence block.</p>
              <p>3. Citation cards include section, relevance, and PDF jump actions.</p>
            </CardContent>
          </Card>

          <Card className="border-[#d8ccb8] bg-white/95">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#2f2614]">Tips For Better Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[#6f592b]">
              <p>Ask for a structure, like key findings, caveats, and next steps.</p>
              <p>Constrain by paper IDs when comparing specific works.</p>
              <p>Request contradictions with reasons, not only a list.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}