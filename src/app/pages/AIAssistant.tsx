import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Send, Bot, User, Loader2, Copy, ExternalLink } from 'lucide-react';
import { api, CitationAwareChatResponse, CitationResponse } from '../utils/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citationData?: CitationAwareChatResponse;
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
      content: "Hello! Ask any research question and I will answer using your extracted papers. You can optionally filter context with comma-separated paper IDs.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [paperIdsInput, setPaperIdsInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isResolvingCitation, setIsResolvingCitation] = useState(false);
  const [activeCitationKey, setActiveCitationKey] = useState<string | null>(null);

  const quickActions = [
    { label: 'Summarize findings', prompt: 'What are the main findings across the extracted papers?' },
    { label: 'Methods comparison', prompt: 'Compare the most common methods and their tradeoffs.' },
    { label: 'Contradictions', prompt: 'What are the strongest contradictions in the extracted corpus?' },
    { label: 'Research gaps', prompt: 'What are the key research gaps suggested by these papers?' },
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
        content: response.answer || 'No answer generated.',
        timestamp: new Date(),
        citationData: response,
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Research Assistant</h1>
        <p className="text-gray-600 mt-1">Citation-aware Q&A over extracted papers with explicit claim traceability</p>
        {statusText && (
          <p className="text-sm text-[#1a3a2e] mt-2">{statusText}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickAction(action.prompt)}
            className="p-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-[#1a3a2e] transition-colors text-left"
          >
            <div className="text-sm font-medium text-gray-900">{action.label}</div>
          </button>
        ))}
      </div>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col overflow-hidden">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#1a3a2e]" />
            Chat Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-[#1a3a2e] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-[#1a3a2e] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </div>
                  {message.role === 'assistant' && message.citationData && (
                    <div className="mt-4 space-y-3">
                      <div className="text-xs text-gray-600">
                        Mode: {message.citationData.mode} | Papers considered: {message.citationData.papers_considered}
                      </div>

                      {message.citationData.citations.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {message.citationData.citations.map((citation, index) => {
                            const citationKey = `${citation.paper_id}:${citation.claim_text}`;
                            const isCurrentCitation = isResolvingCitation && activeCitationKey === citationKey;
                            return (
                              <div key={citationKey} className="border border-gray-200 rounded-md bg-white p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <strong className="text-xs text-gray-900">
                                    [{index + 1}] {citation.paper_id}
                                  </strong>
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="px-2 py-0.5 rounded bg-teal-700 text-white capitalize">{citation.section || 'claim'}</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">{((citation.relevance_score || 0) * 100).toFixed(0)}%</span>
                                  </div>
                                </div>

                                <p className="text-xs text-gray-700 italic bg-gray-50 border-l-2 border-gray-300 p-2 rounded">
                                  "{citation.claim_text}"
                                </p>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => void copyCitation(citation.paper_id, citation.claim_text)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void jumpToCitation(citation.paper_id, citation.claim_text)}
                                    disabled={isCurrentCitation}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isCurrentCitation ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    )}
                                    PDF
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">No backing claims were returned for this answer.</p>
                      )}

                      <details className="bg-white border border-gray-200 rounded-md p-2">
                        <summary className="text-xs font-medium text-gray-800 cursor-pointer">Formatted View</summary>
                        <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                          {message.citationData.answer_with_citations || message.citationData.answer}
                        </pre>
                      </details>
                    </div>
                  )}
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-[#a3c4b5]' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#1a3a2e] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Ask any question about your extracted papers..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a2e]"
                disabled={isTyping}
              />
              <input
                type="text"
                value={paperIdsInput}
                onChange={(e) => setPaperIdsInput(e.target.value)}
                placeholder="Optional paper_ids: p1, p2"
                className="w-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a2e]"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                className="px-6 py-3 bg-[#1a3a2e] text-white rounded-lg hover:bg-[#234136] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Assistant Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-medium">1</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Contradiction Analysis</div>
                <p className="text-sm text-gray-600">
                  Ask direct questions about conflicting findings across extracted papers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-medium">2</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Trigger Workflows</div>
                <p className="text-sm text-gray-600">
                  Limit context using optional paper IDs when you need focused answers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-medium">3</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Research Insights</div>
                <p className="text-sm text-gray-600">
                  Get corpus-level summaries, method comparisons, and gap analysis
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-orange-600 font-medium">4</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Context-Aware Help</div>
                <p className="text-sm text-gray-600">
                  Responses include cited/context paper IDs and backend mode details
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}