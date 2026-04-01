// API Configuration
export const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000';
export const NGROK_API_BASE_URL = 'https://cdc4-103-218-100-74.ngrok-free.app';
export const API_BASE_URL_STORAGE_KEY = 'api-base-url';

export function getConfiguredApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return LOCAL_API_BASE_URL;
  }

  const saved = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  if (saved === NGROK_API_BASE_URL || saved === LOCAL_API_BASE_URL) {
    return saved;
  }

  return LOCAL_API_BASE_URL;
}

const API_BASE_URL = getConfiguredApiBaseUrl();
const REQUEST_CACHE_TTL_MS = 5 * 60 * 1000;

interface ApiErrorResponse {
  detail?: string;
}

interface CacheEntry {
  timestamp: number;
  value: unknown;
}

const requestCache = new Map<string, CacheEntry>();

function buildCacheKey(method: string, path: string, body?: unknown): string {
  const serializedBody = body ? JSON.stringify(body) : '';
  return `${method}:${path}:${serializedBody}`;
}

function getCachedValue<T>(key: string): T | null {
  const entry = requestCache.get(key);
  if (!entry) {
    return null;
  }

  const isExpired = Date.now() - entry.timestamp > REQUEST_CACHE_TTL_MS;
  if (isExpired) {
    requestCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function setCachedValue<T>(key: string, value: T): void {
  requestCache.set(key, {
    timestamp: Date.now(),
    value,
  });
}

function invalidateCacheByPath(pathPrefix: string): void {
  for (const key of requestCache.keys()) {
    if (key.includes(`:${pathPrefix}:`)) {
      requestCache.delete(key);
    }
  }
}

function invalidateReadModelCache(): void {
  invalidateCacheByPath('/papers');
  invalidateCacheByPath('/report');
  invalidateCacheByPath('/analyze');
  invalidateCacheByPath('/feature/heatmap');
}

export interface CrawlRequest {
  query?: string;
  question?: string;
  topic_count?: number;
  limit_per_source?: number;
  max_papers?: number;
  concurrency?: number;
}

export interface CrawlResult {
  paper_id: string;
  status: string;
  reason: string;
  pdf_path: string;
  metadata_path: string;
}

export interface CrawlResponse {
  query: string;
  topics: string[];
  discovered: number;
  deduped: number;
  attempted: number;
  saved: number;
  skipped: number;
  failed: number;
  results: CrawlResult[];
}

export interface PaperSummary {
  paper_id: string;
  title: string;
  year: string;
  source: string;
  pdf_path: string;
  metadata_path: string;
}

export interface ListPapersResponse {
  count: number;
  papers: PaperSummary[];
}

export interface ExtractPaperResponse {
  paper_id: string;
  extracted_path: string;
  claim_count: number;
  method_count: number;
  dataset_count: number;
}

export interface ExtractAllItem {
  paper_id: string;
  claim_count: number;
  method_count: number;
  dataset_count: number;
}

export interface ExtractAllSkippedItem {
  paper_id: string;
  reason: string;
}

export interface ExtractAllResponse {
  processed_count: number;
  skipped_count: number;
  processed: ExtractAllItem[];
  skipped: ExtractAllSkippedItem[];
}

export interface AnalyzeResponse {
  report_path: string;
  paper_count: number;
  claim_count: number;
  contradiction_count: number;
  gaps: string[];
  detailed_report?: DetailedReport;
  report?: LatestReportResponse;
}

export interface ReportContradiction {
  title: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  papers: string[];
}

export interface ReportNamedCount {
  name: string;
  count: number;
}

export interface DetailedReportPaperProfile {
  paper_id: string;
  title: string;
  year: string;
  claim_count: number;
  method_count: number;
  dataset_count: number;
}

interface DetailedContradictionExample {
  paper_a_id: string;
  paper_b_id: string;
  claim_a: string;
  claim_b: string;
  reason: string;
}

export interface DetailedPairwiseContradiction {
  paper_a_id: string;
  paper_b_id: string;
  conflict_count: number;
  reasons: string[];
  examples: DetailedContradictionExample[];
}

export interface DetailedPerPaperContradiction {
  paper_id: string;
  title: string;
  year: string;
  contradiction_count: number;
  contradicts_with: string[];
  examples: DetailedContradictionExample[];
}

export interface DetailedGapItem {
  gap: string;
  impact: 'low' | 'medium' | 'high';
  evidence: string;
}

export interface DetailedRecommendedAction {
  priority: string;
  action: string;
  rationale: string;
  next_step: string;
}

export interface DetailedWorkNext {
  priority: string;
  focus: string;
  why: string;
}

export interface DetailedReport {
  paper_profiles: DetailedReportPaperProfile[];
  contradiction_analysis: {
    total_contradiction_items: number;
    total_contradicting_pairs: number;
    pairwise_contradictions: DetailedPairwiseContradiction[];
    per_paper_contradictions: DetailedPerPaperContradiction[];
  };
  gaps_between_papers: DetailedGapItem[];
  future_steps: string[];
  recommended_actions: DetailedRecommendedAction[];
  not_addressed: string[];
  what_to_work_on_next: DetailedWorkNext[];
}

export interface LatestReportResponse {
  paper_count: number;
  claim_count: number;
  top_methods: ReportNamedCount[];
  top_datasets: ReportNamedCount[];
  contradictions: ReportContradiction[];
  gaps: string[];
  detailed_report?: DetailedReport;
  report?: {
    executive_summary: string;
    executive_summary_json: Record<string, unknown>;
    executive_summary_markdown: string;
  };
  papers_considered: number;
  unanswered_question_count: number;
  decision_topic_count: number;
  contradicting_paper_count: number;
  recent_works_count: number;
  individual_paper_summaries: Array<string | Record<string, unknown>>;
  cross_paper_analysis: Array<string | Record<string, unknown>>;
  critical_insights: Array<string | Record<string, unknown>>;
}

export interface HeatmapRequest {
  paper_ids: string[];
  target_research_finding?: string;
  top_k?: number;
  save_files?: boolean;
}

export interface PaperDisplayName {
  paper_id: string;
  display_name: string;
}

export interface ContradictionCell {
  from: string;
  to: string;
  contradicts: boolean;
  contradictions: string[];
}

export interface HeatmapResponse {
  paper_ids: string[];
  paper_display_names: PaperDisplayName[];
  executive_summary_json: Record<string, unknown>;
  executive_summary_markdown: string;
  knowledge_graph: {
    nodes: Array<{
      id: string;
      title: string;
      node_type?: string;
      problem_statement?: string;
      top_claims?: string[];
      key_methodology: string;
      top_methods?: string[];
      top_datasets?: string[];
      topic_keywords?: string[];
      main_contribution: string;
      claim_count?: number;
      method_count?: number;
      dataset_count?: number;
      year?: string;
      source?: string;
      tags: string[];
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationship: string;
      explanation: string;
      confidence: number;
      evidence?: Record<string, unknown>;
    }>;
  };
  reactflow_graph: {
    nodes: Array<{
      id: string;
      data: {
        label: string;
        description: string;
        node_type?: string;
        tags?: string[];
        year?: string;
      };
      position: {
        x: number;
        y: number;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label: string;
      data?: {
        confidence?: number;
        explanation?: string;
        relationship?: string;
        evidence?: Record<string, unknown>;
      };
    }>;
  };
  saved_files: {
    executive_summary_json: string;
    knowledge_graph_json: string;
    reactflow_graph_json: string;
    knowledge_graph_payload_log_json?: string;
  };
  stats?: {
    total_nodes?: number;
    total_edges?: number;
    per_type_node_totals?: Record<string, number>;
  };
  relationship_counts?: Record<string, number>;
  generation_log?: Array<Record<string, unknown>>;
  mode: string;
}

export interface CitationRequest {
  paper_id: string;
  claim_text: string;
}

export interface CitationResponse {
  paper_id: string;
  claim_text: string;
  pdf_path: string;
  page_number: number;
  bbox: number[];
  paper_display_name?: string;
  pdf_url?: string;
  highlights?: Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }>;
  coordinate_space?: string;
}

export interface DebateRequest {
  paper_id_A?: string;
  paper_id_B?: string;
  paper_ids?: string[];
}

export interface DebateLogicalReasoning {
  premise_A: string;
  premise_B: string;
  inference: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface StructuredDebateAxisResult {
  axis: string;
  description: string;
  paper_A: {
    score: number;
    reasoning: string;
  };
  paper_B: {
    score: number;
    reasoning: string;
  };
  winner: 'A' | 'B' | 'Tie';
  score_diff: number;
  evidence?: {
    paper_A_claims: string[];
    paper_B_claims: string[];
  };
  logical_reasoning?: DebateLogicalReasoning;
}

export interface StructuredDebateContradictionReport {
  contradiction_count: number;
  claim_level_contradictions: Array<{
    paper_A_claim: string;
    paper_B_claim: string;
    logical_reasoning: string;
    confidence: 'medium' | 'high';
  }>;
  axis_tensions: Array<{
    axis: string;
    description: string;
    winner: 'A' | 'B' | 'Tie';
    score_diff: number;
    logical_reasoning?: DebateLogicalReasoning;
  }>;
}

export interface StructuredDebatePairResult {
  paper_A: {
    id: string;
    title: string;
    display_name?: string;
  };
  paper_B: {
    id: string;
    title: string;
    display_name?: string;
  };
  axes_analysis: Record<string, StructuredDebateAxisResult>;
  verdict_card: {
    winner?: string;
    winner_id?: string;
    winner_title?: string;
    winner_display_name?: string;
    paper_A?: {
      id?: string;
      title?: string;
      display_name?: string;
      strongest_axis?: string;
    };
    paper_B?: {
      id?: string;
      title?: string;
      display_name?: string;
      strongest_axis?: string;
    };
    [key: string]: unknown;
  };
  live_debate?: {
    text: string;
    mode?: string;
  };
  contradiction_report?: StructuredDebateContradictionReport;
}

export interface StructuredDebateMultiResponse {
  paper_ids: string[];
  paper_display_names: Array<{ paper_id: string; display_name: string }>;
  pair_count: number;
  pairs_evaluated: string[];
  pair_debates: StructuredDebatePairResult[];
  summary: {
    papers_considered: number;
    total_pairwise_contradictions: number;
    live_debate_mode?: string;
    most_conflicting_pairs: Array<{
      pair_key: string;
      paper_A: string;
      paper_B: string;
      paper_A_name: string;
      paper_B_name: string;
      contradiction_count: number;
    }>;
  };
}

export interface AskRequest {
  question: string;
  paper_ids?: string[];
}

export interface AskResponse {
  question: string;
  answer: string;
  cited_paper_ids: string[];
  papers_considered: number;
  context_paper_ids: string[];
  mode: string;
}

export interface CitationAwareChatRequest {
  question: string;
  paper_ids?: string[];
  require_citations?: boolean;
}

export interface CitationAwareClaim {
  paper_id: string;
  claim_text: string;
  section: string;
  relevance_score: number;
}

export interface CitationAwareChatResponse {
  question: string;
  answer: string;
  citations: CitationAwareClaim[];
  answer_with_citations: string;
  papers_considered: number;
  mode: string;
}

export interface LogFileEntry {
  file_name: string;
  size_bytes: number;
  modified_at: string;
}

export interface LogFilesResponse {
  files: LogFileEntry[];
  latest: string | null;
}

export interface LogFileResponse {
  file_name: string;
  tail: number;
  total_lines: number;
  truncated: boolean;
  content: string;
}

export interface LogsRecentResponse {
  entries: Array<{
    timestamp: string;
    level: string;
    message: string;
    [key: string]: unknown;
  }>;
  total: number;
  limit: number;
}

export interface ExtractAllStatusResponse {
  status: string;
  processed_count: number;
  skipped_count: number;
  total_count: number;
  in_progress: boolean;
  last_updated: string;
}

export interface FinalReportRequest {
  target_research_finding: string;
  top_k?: number;
  paper_ids?: string[];
}

export interface CrawlReportRequest {
  query?: string;
  question?: string;
  topic_count?: number;
  limit_per_source?: number;
  max_papers?: number;
  concurrency?: number;
  target_research_finding?: string;
  top_k?: number;
}

export interface CrawlReportResponse {
  crawl_result: CrawlResponse;
  analysis_result: AnalyzeResponse;
  report: LatestReportResponse;
}

export interface MostAccurateRequest {
  paper_ids: string[];
  question?: string;
}

export interface MostAccurateResponse {
  most_accurate_paper_id: string;
  title: string;
  confidence_score: number;
  reasoning: string;
  evidence: string[];
}

export interface DebatesListResponse {
  debates: Array<{
    debate_id: string;
    paper_id_A: string;
    paper_id_B: string;
    created_at: string;
    summary?: string;
  }>;
  total: number;
}

export interface DebateDetailResponse {
  debate_id: string;
  paper_id_A: string;
  paper_id_B: string;
  paper_A_title?: string;
  paper_B_title?: string;
  created_at: string;
  debate_text: string;
  structured_debate?: StructuredDebatePairResult;
}

export interface BrowseStartRequest {
  session_id?: string;
}

export interface BrowseStartResponse {
  session_id: string;
  queries: string[];
}

export interface BrowseRunResponse {
  session_id: string;
  status: string;
}

export interface BrowseStatusPaper {
  paper_id: string;
  title: string;
  url?: string;
}

export interface BrowseStatusResponse {
  session_id: string;
  status: string;
  current_url: string;
  raw_xml?: string;
  rendered_html?: string;
  screenshot_base64: string;
  rendered_html_base64?: string;
  papers_found: BrowseStatusPaper[];
  log: string[];
  queries_done: number;
  queries_total: number;
}

export interface BrowseSessionsResponse {
  sessions: Array<{
    session_id: string;
    created_at: string;
    status: string;
    papers_found?: number;
  }>;
  total: number;
}

export interface TimelinePaper {
  paper_id: string;
  title: string;
  year: string;
  contribution: string;
  methods: string[];
  claims: string[];
}

export interface TimelineResponse {
  years: string[];
  papers: TimelinePaper[];
  papers_by_year: Record<string, TimelinePaper[]>;
  total_papers: number;
  year_range: {
    earliest: string;
    latest: string;
  };
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
    // ignore JSON parsing issues and keep default message
  }

  throw new Error(detail);
}

async function getJson<T>(path: string, options?: { skipCache?: boolean }): Promise<T> {
  const skipCache = options?.skipCache === true;
  const key = buildCacheKey('GET', path);
  if (!skipCache) {
    const cached = getCachedValue<T>(key);
    if (cached) {
      return cached;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`);
  await ensureResponseOk(response);
  const parsed = (await response.json()) as T;
  if (!skipCache) {
    setCachedValue(key, parsed);
  }
  return parsed;
}

async function postJson<TRequest, TResponse>(
  path: string,
  body?: TRequest,
  options?: { useCache?: boolean },
): Promise<TResponse> {
  const useCache = options?.useCache === true;
  const key = buildCacheKey('POST', path, body);

  if (useCache) {
    const cached = getCachedValue<TResponse>(key);
    if (cached) {
      return cached;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  await ensureResponseOk(response);
  const parsed = (await response.json()) as TResponse;
  if (useCache) {
    setCachedValue(key, parsed);
  }
  return parsed;
}

function parseSseTokens(streamText: string): string {
  const normalized = streamText.includes('\\n')
    ? streamText.replace(/\\n/g, '\n')
    : streamText;
  const tokens: string[] = [];
  const lines = normalized.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as { token?: string };
      if (parsed.token) {
        tokens.push(parsed.token);
      }
    } catch {
      // Some backends return SSE chunks merged in one line; extract every data payload.
      const mergedMatches = payload.matchAll(/(?:^|\n)data:\s*([^\n]+)/g);
      let foundMerged = false;
      for (const match of mergedMatches) {
        const candidate = match[1]?.trim();
        if (!candidate || candidate === '[DONE]') {
          continue;
        }
        try {
          const parsedCandidate = JSON.parse(candidate) as { token?: string };
          if (parsedCandidate.token) {
            tokens.push(parsedCandidate.token);
            foundMerged = true;
          }
        } catch {
          // ignore unparseable merged chunks
        }
      }

      if (!foundMerged) {
        // Try extracting token text from malformed JSON-like payloads.
        const tokenMatch = payload.match(/"token"\s*:\s*"([\s\S]*)"\s*}?$/);
        if (tokenMatch?.[1]) {
          tokens.push(tokenMatch[1]);
        } else {
          // Last fallback for plain-text chunk output.
          tokens.push(payload.replace(/^data:\s*/g, ''));
        }
      }
    }
  }

  return tokens.join('').trim();
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function toImpact(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'medium';
}

function toDebateConfidence(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'medium';
}

function toDebateWinner(value: unknown): 'A' | 'B' | 'Tie' {
  const normalized = toStringValue(value).toUpperCase();
  if (normalized === 'A' || normalized === 'B' || normalized === 'TIE') {
    return normalized === 'TIE' ? 'Tie' : normalized;
  }
  return 'Tie';
}

function toContradictionConfidence(value: unknown): 'medium' | 'high' {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === 'high') {
    return 'high';
  }
  return 'medium';
}

function normalizePaperDisplayNames(value: unknown): PaperDisplayName[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const payload = asRecord(entry);
      if (!payload) {
        return null;
      }
      const paperId = toStringValue(payload.paper_id);
      const displayName = toStringValue(payload.display_name);
      if (!paperId) {
        return null;
      }

      return {
        paper_id: paperId,
        display_name: displayName,
      };
    })
    .filter((entry): entry is PaperDisplayName => entry !== null);
}

function normalizeDebateLogicalReasoning(value: unknown): DebateLogicalReasoning | undefined {
  const payload = asRecord(value);
  if (!payload) {
    return undefined;
  }

  return {
    premise_A: toStringValue(payload.premise_A),
    premise_B: toStringValue(payload.premise_B),
    inference: toStringValue(payload.inference),
    confidence: toDebateConfidence(payload.confidence),
  };
}

function normalizeStructuredDebateAxis(value: unknown): StructuredDebateAxisResult | null {
  const payload = asRecord(value);
  if (!payload) {
    return null;
  }

  const paperA = asRecord(payload.paper_A);
  const paperB = asRecord(payload.paper_B);
  const evidence = asRecord(payload.evidence);

  return {
    axis: toStringValue(payload.axis),
    description: toStringValue(payload.description),
    paper_A: {
      score: toNumber(paperA?.score),
      reasoning: toStringValue(paperA?.reasoning),
    },
    paper_B: {
      score: toNumber(paperB?.score),
      reasoning: toStringValue(paperB?.reasoning),
    },
    winner: toDebateWinner(payload.winner),
    score_diff: toNumber(payload.score_diff),
    // Keep claims arrays optional to avoid forcing empty blocks when backend omits evidence.
    evidence: evidence
      ? {
          paper_A_claims: toStringArray(evidence.paper_A_claims),
          paper_B_claims: toStringArray(evidence.paper_B_claims),
        }
      : undefined,
    logical_reasoning: normalizeDebateLogicalReasoning(payload.logical_reasoning),
  };
}

function normalizeStructuredDebateAxes(value: unknown): Record<string, StructuredDebateAxisResult> {
  const payload = asRecord(value);
  if (!payload) {
    return {};
  }

  const normalized: Record<string, StructuredDebateAxisResult> = {};
  for (const [key, axisValue] of Object.entries(payload)) {
    const parsed = normalizeStructuredDebateAxis(axisValue);
    if (parsed) {
      normalized[key] = parsed;
    }
  }
  return normalized;
}

function normalizeStructuredDebateContradictionReport(
  value: unknown,
): StructuredDebateContradictionReport | undefined {
  const payload = asRecord(value);
  if (!payload) {
    return undefined;
  }

  const claimLevel = Array.isArray(payload.claim_level_contradictions)
    ? payload.claim_level_contradictions
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) {
            return null;
          }

          return {
            paper_A_claim: toStringValue(item.paper_A_claim),
            paper_B_claim: toStringValue(item.paper_B_claim),
            logical_reasoning: toStringValue(item.logical_reasoning),
            confidence: toContradictionConfidence(item.confidence),
          };
        })
        .filter((entry): entry is StructuredDebateContradictionReport['claim_level_contradictions'][number] => entry !== null)
    : [];

  const axisTensions = Array.isArray(payload.axis_tensions)
    ? payload.axis_tensions
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) {
            return null;
          }

          const normalizedTension: StructuredDebateContradictionReport['axis_tensions'][number] = {
            axis: toStringValue(item.axis),
            description: toStringValue(item.description),
            winner: toDebateWinner(item.winner),
            score_diff: toNumber(item.score_diff),
            logical_reasoning: normalizeDebateLogicalReasoning(item.logical_reasoning),
          };

          return normalizedTension;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  return {
    contradiction_count: toNumber(payload.contradiction_count),
    claim_level_contradictions: claimLevel,
    axis_tensions: axisTensions,
  };
}

function normalizeStructuredDebatePairResult(value: unknown): StructuredDebatePairResult | null {
  const payload = asRecord(value);
  if (!payload) {
    return null;
  }

  const paperA = asRecord(payload.paper_A);
  const paperB = asRecord(payload.paper_B);
  const verdictCard = asRecord(payload.verdict_card) ?? {};
  const verdictPaperA = asRecord(verdictCard.paper_A);
  const verdictPaperB = asRecord(verdictCard.paper_B);
  const liveDebate = asRecord(payload.live_debate);

  return {
    paper_A: {
      id: toStringValue(paperA?.id ?? paperA?.paper_id),
      title: toStringValue(paperA?.title),
      display_name: toStringValue(paperA?.display_name) || undefined,
    },
    paper_B: {
      id: toStringValue(paperB?.id ?? paperB?.paper_id),
      title: toStringValue(paperB?.title),
      display_name: toStringValue(paperB?.display_name) || undefined,
    },
    axes_analysis: normalizeStructuredDebateAxes(payload.axes_analysis),
    verdict_card: {
      ...verdictCard,
      winner: toStringValue(verdictCard.winner),
      winner_id: toStringValue(verdictCard.winner_id),
      winner_title: toStringValue(verdictCard.winner_title),
      winner_display_name: toStringValue(verdictCard.winner_display_name) || undefined,
      paper_A: verdictPaperA
        ? {
            id: toStringValue(verdictPaperA.id),
            title: toStringValue(verdictPaperA.title),
            display_name: toStringValue(verdictPaperA.display_name) || undefined,
            strongest_axis: toStringValue(verdictPaperA.strongest_axis) || undefined,
          }
        : undefined,
      paper_B: verdictPaperB
        ? {
            id: toStringValue(verdictPaperB.id),
            title: toStringValue(verdictPaperB.title),
            display_name: toStringValue(verdictPaperB.display_name) || undefined,
            strongest_axis: toStringValue(verdictPaperB.strongest_axis) || undefined,
          }
        : undefined,
    },
    live_debate: liveDebate
      ? {
          text: toStringValue(liveDebate.text),
          mode: toStringValue(liveDebate.mode) || undefined,
        }
      : undefined,
    contradiction_report: normalizeStructuredDebateContradictionReport(payload.contradiction_report),
  };
}

function normalizeStructuredDebateMultiResponse(value: unknown): StructuredDebateMultiResponse {
  const payload = asRecord(value) ?? {};
  const summary = asRecord(payload.summary) ?? {};
  const pairDebates = Array.isArray(payload.pair_debates)
    ? payload.pair_debates
        .map(normalizeStructuredDebatePairResult)
        .filter((entry): entry is StructuredDebatePairResult => entry !== null)
    : [];

  const mostConflictingPairs = Array.isArray(summary.most_conflicting_pairs)
    ? summary.most_conflicting_pairs
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) {
            return null;
          }

          return {
            pair_key: toStringValue(item.pair_key),
            paper_A: toStringValue(item.paper_A),
            paper_B: toStringValue(item.paper_B),
            paper_A_name: toStringValue(item.paper_A_name),
            paper_B_name: toStringValue(item.paper_B_name),
            contradiction_count: toNumber(item.contradiction_count),
          };
        })
        .filter((entry): entry is StructuredDebateMultiResponse['summary']['most_conflicting_pairs'][number] => entry !== null)
    : [];

  return {
    paper_ids: toStringArray(payload.paper_ids),
    paper_display_names: normalizePaperDisplayNames(payload.paper_display_names),
    pair_count: toNumber(payload.pair_count, pairDebates.length),
    pairs_evaluated: toStringArray(payload.pairs_evaluated),
    pair_debates: pairDebates,
    summary: {
      papers_considered: toNumber(summary.papers_considered),
      total_pairwise_contradictions: toNumber(summary.total_pairwise_contradictions),
      live_debate_mode: toStringValue(summary.live_debate_mode) || undefined,
      most_conflicting_pairs: mostConflictingPairs,
    },
  };
}

function normalizeStructuredDebateResponse(
  value: unknown,
): StructuredDebatePairResult | StructuredDebateMultiResponse {
  const payload = asRecord(value) ?? {};
  if (Array.isArray(payload.pair_debates) || Array.isArray(payload.paper_display_names)) {
    return normalizeStructuredDebateMultiResponse(payload);
  }

  const parsedPair = normalizeStructuredDebatePairResult(payload);
  if (parsedPair) {
    return parsedPair;
  }

  return normalizeStructuredDebateMultiResponse(payload);
}

function normalizeHeatmapResponse(value: unknown): HeatmapResponse {
  const payload = asRecord(value) ?? {};
  console.info('[api.normalizeHeatmapResponse] Raw /feature/heatmap keys:', Object.keys(payload));
  const knowledgeGraphPayload = asRecord(
    payload.knowledge_graph ?? payload.knowledgeGraph ?? payload.graph,
  ) ?? {};
  const reactflowPayload = asRecord(
    payload.reactflow_graph ?? payload.reactFlowGraph ?? payload.reactflow ?? payload.flow_graph,
  ) ?? {};
  const savedFilesPayload = asRecord(payload.saved_files) ?? {};

  const knowledgeNodes = Array.isArray(knowledgeGraphPayload.nodes)
    ? knowledgeGraphPayload.nodes
        .map((node) => {
          const item = asRecord(node);
          if (!item) {
            return null;
          }

          const id = toStringValue(item.id ?? item.paper_id ?? item.node_id);
          if (!id) {
            return null;
          }

          return {
            id,
            title: toStringValue(item.title ?? item.label),
            node_type: toStringValue(item.node_type) || undefined,
            problem_statement: toStringValue(item.problem_statement) || undefined,
            top_claims: toStringArray(item.top_claims),
            key_methodology: toStringValue(item.key_methodology),
            top_methods: toStringArray(item.top_methods),
            top_datasets: toStringArray(item.top_datasets),
            topic_keywords: toStringArray(item.topic_keywords),
            main_contribution: toStringValue(item.main_contribution),
            claim_count: toNumber(item.claim_count, -1) >= 0 ? toNumber(item.claim_count) : undefined,
            method_count: toNumber(item.method_count, -1) >= 0 ? toNumber(item.method_count) : undefined,
            dataset_count: toNumber(item.dataset_count, -1) >= 0 ? toNumber(item.dataset_count) : undefined,
            year: toStringValue(item.year) || undefined,
            source: toStringValue(item.source) || undefined,
            tags: toStringArray(item.tags),
          };
        })
        .filter((node): node is NonNullable<typeof node> => node !== null)
    : [];

  const knowledgeEdges = Array.isArray(knowledgeGraphPayload.edges)
    ? knowledgeGraphPayload.edges
        .map((edge) => {
          const item = asRecord(edge);
          if (!item) {
            return null;
          }

          const source = toStringValue(item.source ?? item.from);
          const target = toStringValue(item.target ?? item.to);
          if (!source || !target) {
            return null;
          }

          return {
            source,
            target,
            relationship: toStringValue(item.relationship ?? item.type ?? item.label),
            explanation: toStringValue(item.explanation),
            confidence: toNumber(item.confidence),
            evidence: asRecord(item.evidence) ?? undefined,
          };
        })
        .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
    : [];

  const reactflowNodes = Array.isArray(reactflowPayload.nodes)
    ? reactflowPayload.nodes
        .map((node, index) => {
          const item = asRecord(node);
          if (!item) {
            return null;
          }

          const nodeData = asRecord(item.data) ?? {};
          const nodePosition = asRecord(item.position) ?? {};
          const id = toStringValue(item.id ?? item.paper_id ?? item.node_id);
          if (!id) {
            return null;
          }

          return {
            id,
            data: {
              label: toStringValue(nodeData.label ?? item.label ?? item.title) || id,
              description: toStringValue(
                nodeData.description ?? item.description ?? item.main_contribution ?? item.key_methodology,
              ),
              node_type: toStringValue(nodeData.node_type ?? item.node_type) || undefined,
              tags: toStringArray(nodeData.tags ?? item.tags),
              year: toStringValue(nodeData.year ?? item.year) || undefined,
            },
            position: {
              x: toNumber(nodePosition.x, (index % 4) * 260),
              y: toNumber(nodePosition.y, Math.floor(index / 4) * 180),
            },
          };
        })
        .filter((node): node is NonNullable<typeof node> => node !== null)
    : [];

  const reactflowEdges = Array.isArray(reactflowPayload.edges)
    ? reactflowPayload.edges
        .map((edge, index) => {
          const item = asRecord(edge);
          if (!item) {
            return null;
          }

          const source = toStringValue(item.source ?? item.from);
          const target = toStringValue(item.target ?? item.to);
          if (!source || !target) {
            return null;
          }

          const id = toStringValue(item.id) || `${source}-${target}-${index}`;
          return {
            id,
            source,
            target,
            label: toStringValue(item.label ?? item.relationship ?? item.type),
            data: {
              confidence: toNumber(item.confidence, -1) >= 0 ? toNumber(item.confidence) : undefined,
              explanation: toStringValue(item.explanation) || undefined,
              relationship: toStringValue(item.relationship ?? item.type) || undefined,
              evidence: asRecord(item.evidence) ?? undefined,
            },
          };
        })
        .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
    : [];

  const normalizedReactflowNodes = reactflowNodes.length > 0
    ? reactflowNodes
    : knowledgeNodes.map((node, index) => ({
        id: node.id,
        data: {
          label: node.title || node.id,
          description: node.main_contribution || node.key_methodology,
        },
        position: {
          x: (index % 4) * 260,
          y: Math.floor(index / 4) * 180,
        },
      }));

  const normalizedReactflowEdges = reactflowEdges.length > 0
    ? reactflowEdges
    : knowledgeEdges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.relationship,
      }));

  const executiveSummaryJson = asRecord(payload.executive_summary_json) ?? {};
  const normalizedPaperDisplayNames = normalizePaperDisplayNames(payload.paper_display_names);
  const statsPayload = asRecord(payload.stats) ?? {};
  const relationshipCountsPayload = asRecord(payload.relationship_counts) ?? {};
  const generationLog = Array.isArray(payload.generation_log)
    ? payload.generation_log
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
    : [];
  const perTypeNodeTotalsPayload = asRecord(statsPayload.per_type_node_totals) ?? {};
  const perTypeNodeTotals: Record<string, number> = {};
  for (const [key, value] of Object.entries(perTypeNodeTotalsPayload)) {
    perTypeNodeTotals[key] = toNumber(value);
  }
  const relationshipCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries(relationshipCountsPayload)) {
    relationshipCounts[key] = toNumber(value);
  }

  console.info('[api.normalizeHeatmapResponse] Parsed graph sizes:', {
    paperIds: toStringArray(payload.paper_ids).length,
    knowledgeNodes: knowledgeNodes.length,
    knowledgeEdges: knowledgeEdges.length,
    reactflowNodes: normalizedReactflowNodes.length,
    reactflowEdges: normalizedReactflowEdges.length,
  });

  return {
    paper_ids: toStringArray(payload.paper_ids),
    paper_display_names: normalizedPaperDisplayNames,
    executive_summary_json: executiveSummaryJson,
    executive_summary_markdown: toStringValue(payload.executive_summary_markdown),
    knowledge_graph: {
      nodes: knowledgeNodes,
      edges: knowledgeEdges,
    },
    reactflow_graph: {
      nodes: normalizedReactflowNodes,
      edges: normalizedReactflowEdges,
    },
    saved_files: {
      executive_summary_json: toStringValue(savedFilesPayload.executive_summary_json),
      knowledge_graph_json: toStringValue(savedFilesPayload.knowledge_graph_json),
      reactflow_graph_json: toStringValue(savedFilesPayload.reactflow_graph_json),
      knowledge_graph_payload_log_json: toStringValue(savedFilesPayload.knowledge_graph_payload_log_json) || undefined,
    },
    stats: {
      total_nodes: toNumber(statsPayload.total_nodes, normalizedReactflowNodes.length),
      total_edges: toNumber(statsPayload.total_edges, normalizedReactflowEdges.length),
      per_type_node_totals: perTypeNodeTotals,
    },
    relationship_counts: relationshipCounts,
    generation_log: generationLog,
    mode: toStringValue(payload.mode),
  };
}

function normalizeMixedContentBlocks(value: unknown): Array<string | Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text || null;
      }

      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      return payload;
    })
    .filter((item): item is string | Record<string, unknown> => item !== null);
}

function normalizeReportSection(
  directValue: unknown,
  executiveSummaryJson: Record<string, unknown>,
  sectionKey: string,
): Array<string | Record<string, unknown>> {
  const directBlocks = normalizeMixedContentBlocks(directValue);
  if (directBlocks.length > 0) {
    return directBlocks;
  }

  const nestedValue = executiveSummaryJson[sectionKey];
  const nestedBlocks = normalizeMixedContentBlocks(nestedValue);
  if (nestedBlocks.length > 0) {
    return nestedBlocks;
  }

  const nestedRecord = asRecord(nestedValue);
  if (nestedRecord) {
    return [nestedRecord];
  }

  const nestedText = toStringValue(nestedValue);
  return nestedText ? [nestedText] : [];
}

function normalizeCitationResponse(value: unknown): CitationResponse {
  const payload = asRecord(value) ?? {};
  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) {
            return null;
          }

          return {
            x0: toNumber(item.x0),
            y0: toNumber(item.y0),
            x1: toNumber(item.x1),
            y1: toNumber(item.y1),
          };
        })
        .filter((entry): entry is NonNullable<CitationResponse['highlights']>[number] => entry !== null)
    : undefined;

  return {
    paper_id: toStringValue(payload.paper_id),
    claim_text: toStringValue(payload.claim_text),
    pdf_path: toStringValue(payload.pdf_path),
    page_number: toNumber(payload.page_number, 1),
    bbox: Array.isArray(payload.bbox) ? payload.bbox.map((item) => toNumber(item)) : [],
    paper_display_name: toStringValue(payload.paper_display_name) || undefined,
    pdf_url: toStringValue(payload.pdf_url) || undefined,
    highlights,
    coordinate_space: toStringValue(payload.coordinate_space) || undefined,
  };
}

export function getPaperDisplayName(
  paperId: string,
  paperDisplayNames?: Array<{ paper_id: string; display_name: string }>,
  fallbackLabel?: string,
): string {
  const matched = paperDisplayNames?.find((entry) => entry.paper_id === paperId)?.display_name?.trim();
  if (matched) {
    return matched;
  }
  return fallbackLabel || paperId;
}

export function buildPaperDisplayNameMap(
  paperDisplayNames?: Array<{ paper_id: string; display_name: string }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of paperDisplayNames || []) {
    if (!entry?.paper_id) {
      continue;
    }
    map[entry.paper_id] = entry.display_name || entry.paper_id;
  }
  return map;
}

export function getDebatePaperLabel(
  paper: { id?: string; paper_id?: string; title?: string; display_name?: string } | null | undefined,
): string {
  if (!paper) {
    return '';
  }
  return paper.display_name || paper.title || paper.id || paper.paper_id || '';
}

export function getStructuredDebatePairs(
  response: StructuredDebatePairResult | StructuredDebateMultiResponse,
): StructuredDebatePairResult[] {
  return 'pair_debates' in response ? response.pair_debates : [response];
}

function emptyDetailedReport(): DetailedReport {
  return {
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
}

function normalizeDetailedExample(value: unknown): DetailedContradictionExample | null {
  const payload = asRecord(value);
  if (!payload) {
    return null;
  }

  return {
    paper_a_id: toStringValue(payload.paper_a_id),
    paper_b_id: toStringValue(payload.paper_b_id),
    claim_a: toStringValue(payload.claim_a),
    claim_b: toStringValue(payload.claim_b),
    reason: toStringValue(payload.reason),
  };
}

function normalizeDetailedPairwiseContradictions(value: unknown): DetailedPairwiseContradiction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      const examples = Array.isArray(payload.examples)
        ? payload.examples
            .map(normalizeDetailedExample)
            .filter((entry): entry is DetailedContradictionExample => entry !== null)
        : [];

      return {
        paper_a_id: toStringValue(payload.paper_a_id),
        paper_b_id: toStringValue(payload.paper_b_id),
        conflict_count: toNumber(payload.conflict_count),
        reasons: toStringArray(payload.reasons),
        examples,
      };
    })
    .filter((item): item is DetailedPairwiseContradiction => item !== null);
}

function normalizeDetailedPerPaperContradictions(value: unknown): DetailedPerPaperContradiction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      const examples = Array.isArray(payload.examples)
        ? payload.examples
            .map(normalizeDetailedExample)
            .filter((entry): entry is DetailedContradictionExample => entry !== null)
        : [];

      return {
        paper_id: toStringValue(payload.paper_id),
        title: toStringValue(payload.title),
        year: toStringValue(payload.year),
        contradiction_count: toNumber(payload.contradiction_count),
        contradicts_with: toStringArray(payload.contradicts_with),
        examples,
      };
    })
    .filter((item): item is DetailedPerPaperContradiction => item !== null);
}

function normalizeDetailedPaperProfiles(value: unknown): DetailedReportPaperProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      return {
        paper_id: toStringValue(payload.paper_id),
        title: toStringValue(payload.title),
        year: toStringValue(payload.year),
        claim_count: toNumber(payload.claim_count),
        method_count: toNumber(payload.method_count),
        dataset_count: toNumber(payload.dataset_count),
      };
    })
    .filter((item): item is DetailedReportPaperProfile => item !== null);
}

function normalizeDetailedGaps(value: unknown): DetailedGapItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      return {
        gap: toStringValue(payload.gap),
        impact: toImpact(payload.impact),
        evidence: toStringValue(payload.evidence),
      };
    })
    .filter((item): item is DetailedGapItem => item !== null);
}

function normalizeDetailedRecommendedActions(value: unknown): DetailedRecommendedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      return {
        priority: toStringValue(payload.priority),
        action: toStringValue(payload.action),
        rationale: toStringValue(payload.rationale),
        next_step: toStringValue(payload.next_step),
      };
    })
    .filter((item): item is DetailedRecommendedAction => item !== null);
}

function normalizeDetailedWorkNext(value: unknown): DetailedWorkNext[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const payload = asRecord(item);
      if (!payload) {
        return null;
      }

      return {
        priority: toStringValue(payload.priority),
        focus: toStringValue(payload.focus),
        why: toStringValue(payload.why),
      };
    })
    .filter((item): item is DetailedWorkNext => item !== null);
}

function normalizeDetailedReport(raw: unknown): DetailedReport {
  const payload = asRecord(raw);
  if (!payload) {
    return emptyDetailedReport();
  }

  const contradictionAnalysis = asRecord(payload.contradiction_analysis);
  const pairwise = normalizeDetailedPairwiseContradictions(
    contradictionAnalysis?.pairwise_contradictions,
  );
  const perPaper = normalizeDetailedPerPaperContradictions(
    contradictionAnalysis?.per_paper_contradictions,
  );

  // Keep fallback counts deterministic while allowing backend-provided numbers when present.
  const totalContradictionItems = toNumber(
    contradictionAnalysis?.total_contradiction_items,
    pairwise.reduce((sum, entry) => sum + entry.conflict_count, 0),
  );
  const totalContradictingPairs = toNumber(
    contradictionAnalysis?.total_contradicting_pairs,
    pairwise.length,
  );

  return {
    paper_profiles: normalizeDetailedPaperProfiles(payload.paper_profiles),
    contradiction_analysis: {
      total_contradiction_items: totalContradictionItems,
      total_contradicting_pairs: totalContradictingPairs,
      pairwise_contradictions: pairwise,
      per_paper_contradictions: perPaper,
    },
    gaps_between_papers: normalizeDetailedGaps(payload.gaps_between_papers),
    future_steps: toStringArray(payload.future_steps),
    recommended_actions: normalizeDetailedRecommendedActions(payload.recommended_actions),
    not_addressed: toStringArray(payload.not_addressed),
    what_to_work_on_next: normalizeDetailedWorkNext(payload.what_to_work_on_next),
  };
}

function normalizeNamedCounts(
  value: unknown,
  keyCandidates: string[],
): ReportNamedCount[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          const name = typeof item[0] === 'string' ? item[0].trim() : '';
          const count = toNumber(item[1]);
          return name ? { name, count } : null;
        }

        if (item && typeof item === 'object') {
          const payload = item as Record<string, unknown>;
          const matchedKey = keyCandidates.find((key) => typeof payload[key] === 'string');
          const nameValue = (matchedKey ? payload[matchedKey] : payload.name) as string | undefined;
          const count = toNumber(payload.count ?? payload.value ?? payload.total);
          const name = typeof nameValue === 'string' ? nameValue.trim() : '';
          return name ? { name, count } : null;
        }

        return null;
      })
      .filter((item): item is ReportNamedCount => item !== null);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, rawCount]) => ({
        name: name.trim(),
        count: toNumber(rawCount),
      }))
      .filter((item) => item.name.length > 0);
  }

  return [];
}

function normalizeSeverity(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'medium';
}

function normalizeContradictions(value: unknown): ReportContradiction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const summary = item.trim();
        if (!summary) {
          return null;
        }
        return {
          title: 'Contradiction',
          severity: 'medium' as const,
          summary,
          papers: [],
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const payload = item as Record<string, unknown>;
      const pairwiseA = asRecord(payload.paper_a);
      const pairwiseB = asRecord(payload.paper_b);
      if (pairwiseA || pairwiseB || payload.paper_a_id || payload.paper_b_id) {
        const paperAId = toStringValue(
          pairwiseA?.paper_id ?? payload.paper_a_id ?? payload.from_paper_id,
        );
        const paperBId = toStringValue(
          pairwiseB?.paper_id ?? payload.paper_b_id ?? payload.to_paper_id,
        );
        const reason = toStringValue(payload.reason);
        const claimA = toStringValue(payload.claim_a);
        const claimB = toStringValue(payload.claim_b);
        const synthesizedSummary = claimA && claimB
          ? `Claim mismatch: "${claimA}" vs "${claimB}".`
          : 'Pairwise contradiction detected between selected papers.';

        return {
          title: 'Contradiction',
          severity: 'medium',
          summary: reason || synthesizedSummary,
          papers: [paperAId, paperBId].filter(Boolean),
        };
      }

      const title = String(payload.title ?? payload.topic ?? payload.claim ?? 'Contradiction').trim();
      const summary = String(payload.summary ?? payload.description ?? payload.reasoning ?? '').trim();
      const papers = toStringArray(payload.papers ?? payload.paper_ids ?? payload.involved_papers);

      if (!title && !summary) {
        return null;
      }

      return {
        title: title || 'Contradiction',
        severity: normalizeSeverity(payload.severity),
        summary: summary || title || 'No details provided.',
        papers,
      };
    })
    .filter((item): item is ReportContradiction => item !== null);
}

function normalizeLatestReportResponse(raw: unknown): LatestReportResponse {
  const payload = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const nestedReport = asRecord(payload.report);

  const paperCount = toNumber(payload.paper_count ?? payload.total_papers ?? payload.papers_analyzed);
  const claimCount = toNumber(payload.claim_count ?? payload.total_claims ?? payload.claims_count);
  const topMethods = normalizeNamedCounts(
    payload.top_methods ?? payload.methods ?? payload.method_counts,
    ['method', 'label', 'key'],
  );
  const topDatasets = normalizeNamedCounts(
    payload.top_datasets ?? payload.datasets ?? payload.dataset_counts,
    ['dataset', 'label', 'key'],
  );
  const contradictions = normalizeContradictions(
    payload.contradictions
      ?? payload.key_contradictions
      ?? payload.conflicts
      ?? payload.pairwise_contradictions,
  );
  const gaps = toStringArray(payload.gaps ?? payload.research_gaps ?? payload.open_questions);
  const detailedReport = normalizeDetailedReport(
    payload.detailed_report
      ?? payload.detailedReport
      ?? nestedReport?.detailed_report,
  );
  const reportPayload = asRecord(payload.report) ?? {};
  const executiveSummary = toStringValue(
    reportPayload.executive_summary ?? payload.executive_summary,
  );
  const executiveSummaryJson = asRecord(
    reportPayload.executive_summary_json ?? payload.executive_summary_json,
  ) ?? {};
  const executiveSummaryMarkdown = toStringValue(
    reportPayload.executive_summary_markdown ?? payload.executive_summary_markdown,
  );
  const individualPaperSummaries = normalizeReportSection(
    payload.individual_paper_summaries,
    executiveSummaryJson,
    'individual_paper_summaries',
  );
  const crossPaperAnalysis = normalizeReportSection(
    payload.cross_paper_analysis,
    executiveSummaryJson,
    'cross_paper_analysis',
  );
  const criticalInsights = normalizeReportSection(
    payload.critical_insights,
    executiveSummaryJson,
    'critical_insights',
  );

  return {
    paper_count: paperCount,
    claim_count: claimCount,
    top_methods: topMethods,
    top_datasets: topDatasets,
    contradictions,
    gaps,
    detailed_report: detailedReport,
    report: {
      executive_summary: executiveSummary,
      executive_summary_json: executiveSummaryJson,
      executive_summary_markdown: executiveSummaryMarkdown,
    },
    papers_considered: toNumber(payload.papers_considered, paperCount),
    unanswered_question_count: toNumber(payload.unanswered_question_count),
    decision_topic_count: toNumber(payload.decision_topic_count),
    contradicting_paper_count: toNumber(payload.contradicting_paper_count),
    recent_works_count: toNumber(payload.recent_works_count),
    individual_paper_summaries: individualPaperSummaries,
    cross_paper_analysis: crossPaperAnalysis,
    critical_insights: criticalInsights,
  };
}

export const api = {
  getHealth(): Promise<{ status: string }> {
    return getJson<{ status: string }>('/health');
  },

  getHealthCrawler(): Promise<{ status: string; [key: string]: unknown }> {
    return getJson<{ status: string; [key: string]: unknown }>('/health/crawler');
  },

  crawl(payload: CrawlRequest): Promise<CrawlResponse> {
    return postJson<CrawlRequest, CrawlResponse>('/crawl', payload).then((result) => {
      invalidateReadModelCache();
      return result;
    });
  },

  listPapers(): Promise<ListPapersResponse> {
    return getJson<ListPapersResponse>('/papers');
  },

  extractPaper(paperId: string): Promise<ExtractPaperResponse> {
    return postJson<undefined, ExtractPaperResponse>(`/extract/${paperId}`).then((result) => {
      invalidateReadModelCache();
      return result;
    });
  },

  extractAll(): Promise<ExtractAllResponse> {
    return postJson<undefined, ExtractAllResponse>('/extract-all').then((result) => {
      invalidateReadModelCache();
      return result;
    });
  },

  analyze(paperIds: string[]): Promise<AnalyzeResponse> {
    return postJson<{ paper_ids: string[] }, AnalyzeResponse>('/analyze', {
      paper_ids: paperIds,
    }, { useCache: true }).then((result) => {
      invalidateCacheByPath('/report');
      return result;
    });
  },

  async fetchFinalReport(): Promise<LatestReportResponse> {
    // Report data can change frequently after analysis runs; skip cache to avoid stale UI.
    const response = await fetch(`${API_BASE_URL}/report`);
    await ensureResponseOk(response);
    const payload = (await response.json()) as unknown;
    const normalized = normalizeLatestReportResponse(payload);
    console.info('[api.fetchFinalReport] Raw /report payload:', payload);
    console.info('[api.fetchFinalReport] Normalized report payload:', normalized);
    return normalized;
  },

  async generateKnowledgeGraph(payload: HeatmapRequest): Promise<HeatmapResponse> {
    const dedupedPaperIds = Array.from(new Set(payload.paper_ids.map((item) => item.trim()).filter(Boolean)));
    if (dedupedPaperIds.length < 2) {
      throw new Error('Please select at least 2 paper IDs to generate a knowledge graph.');
    }

    console.info('[api.generateKnowledgeGraph] Request payload:', {
      paper_ids: dedupedPaperIds,
      target_research_finding: payload.target_research_finding,
      top_k: payload.top_k,
      save_files: payload.save_files,
    });

    const response = await postJson<HeatmapRequest, unknown>('/feature/heatmap', {
      ...payload,
      paper_ids: dedupedPaperIds,
    }, { useCache: true });
    const normalized = normalizeHeatmapResponse(response);
    console.info('[api.generateKnowledgeGraph] Normalized payload summary:', {
      paper_ids: normalized.paper_ids.length,
      knowledge_nodes: normalized.knowledge_graph.nodes.length,
      knowledge_edges: normalized.knowledge_graph.edges.length,
      reactflow_nodes: normalized.reactflow_graph.nodes.length,
      reactflow_edges: normalized.reactflow_graph.edges.length,
      mode: normalized.mode,
    });
    return normalized;
  },

  async getReport(): Promise<LatestReportResponse> {
    return api.fetchFinalReport();
  },

  async getHeatmap(paperIds: string[]): Promise<HeatmapResponse> {
    return api.generateKnowledgeGraph({
      paper_ids: paperIds,
    });
  },

  async getCitation(payload: CitationRequest): Promise<CitationResponse> {
    const response = await postJson<CitationRequest, unknown>('/feature/citation', payload, { useCache: true });
    return normalizeCitationResponse(response);
  },

  async runStructuredDebate(
    payload: DebateRequest,
  ): Promise<StructuredDebatePairResult | StructuredDebateMultiResponse> {
    const response = await postJson<DebateRequest, unknown>('/feature/structured-debate', payload);
    return normalizeStructuredDebateResponse(response);
  },

  async runStructuredDebateMulti(payload: DebateRequest): Promise<StructuredDebateMultiResponse> {
    const response = await postJson<DebateRequest, unknown>('/feature/structured-debate-multi', payload);
    const normalized = normalizeStructuredDebateResponse(response);
    if ('pair_debates' in normalized) {
      return normalized;
    }

    return {
      paper_ids: [normalized.paper_A.id, normalized.paper_B.id].filter(Boolean),
      paper_display_names: [
        {
          paper_id: normalized.paper_A.id,
          display_name: normalized.paper_A.display_name || normalized.paper_A.title || normalized.paper_A.id,
        },
        {
          paper_id: normalized.paper_B.id,
          display_name: normalized.paper_B.display_name || normalized.paper_B.title || normalized.paper_B.id,
        },
      ].filter((entry) => entry.paper_id),
      pair_count: 1,
      pairs_evaluated: [
        [normalized.paper_A.id, normalized.paper_B.id].filter(Boolean).join('__vs__'),
      ].filter(Boolean),
      pair_debates: [normalized],
      summary: {
        papers_considered: [normalized.paper_A.id, normalized.paper_B.id].filter(Boolean).length,
        total_pairwise_contradictions: normalized.contradiction_report?.contradiction_count || 0,
        live_debate_mode: normalized.live_debate?.mode,
        most_conflicting_pairs: [
          {
            pair_key: [normalized.paper_A.id, normalized.paper_B.id].filter(Boolean).join('__vs__'),
            paper_A: normalized.paper_A.id,
            paper_B: normalized.paper_B.id,
            paper_A_name: normalized.paper_A.display_name || normalized.paper_A.title || normalized.paper_A.id,
            paper_B_name: normalized.paper_B.display_name || normalized.paper_B.title || normalized.paper_B.id,
            contradiction_count: normalized.contradiction_report?.contradiction_count || 0,
          },
        ],
      },
    };
  },

  askQuestion(payload: AskRequest): Promise<AskResponse> {
    return postJson<AskRequest, AskResponse>('/feature/ask', payload, { useCache: true });
  },

  askCitationQuestion(payload: CitationAwareChatRequest): Promise<CitationAwareChatResponse> {
    return postJson<CitationAwareChatRequest, CitationAwareChatResponse>('/feature/citation-chat', payload, { useCache: true });
  },

  getLogFiles(): Promise<LogFilesResponse> {
    return getJson<LogFilesResponse>('/logs/files');
  },

  async getLogFile(fileName: string, tail = 300): Promise<LogFileResponse> {
    const params = new URLSearchParams({ tail: String(tail) });
    const encodedFileName = encodeURIComponent(fileName);
    return getJson<LogFileResponse>(`/logs/file/${encodedFileName}?${params.toString()}`);
  },

  streamLogUrl(fileName = 'latest.log', follow = true): string {
    const params = new URLSearchParams({ file_name: fileName, follow: String(follow) });
    return `${API_BASE_URL}/logs/stream?${params.toString()}`;
  },

  async runDebate(payload: DebateRequest): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/feature/debate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    await ensureResponseOk(response);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payloadJson = (await response.json()) as {
        debate?: string;
        answer?: string;
        text?: string;
        output?: string;
      };
      return (
        payloadJson.debate ||
        payloadJson.answer ||
        payloadJson.text ||
        payloadJson.output ||
        ''
      ).trim();
    }

    const streamText = await response.text();
    const parsedSse = parseSseTokens(streamText);
    if (parsedSse) {
      return parsedSse;
    }

    return streamText.trim();
  },

  async getLogsRecent(limit = 100): Promise<LogsRecentResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return getJson<LogsRecentResponse>(`/logs/recent?${params.toString()}`);
  },

  extractAllBackground(): Promise<{ task_id: string; status: string }> {
    return postJson<undefined, { task_id: string; status: string }>(
      '/extract-all/background',
    );
  },

  getExtractAllStatus(): Promise<ExtractAllStatusResponse> {
    return getJson<ExtractAllStatusResponse>('/extract-all/status');
  },

  async finalReport(payload: FinalReportRequest): Promise<LatestReportResponse> {
    const response = await postJson<FinalReportRequest, unknown>(
      '/final-report',
      payload,
    );
    return normalizeLatestReportResponse(response);
  },

  crawlReport(payload: CrawlReportRequest): Promise<CrawlReportResponse> {
    return postJson<CrawlReportRequest, CrawlReportResponse>(
      '/crawl-report',
      payload,
    ).then((result) => {
      invalidateReadModelCache();
      return result;
    });
  },

  async getCitationOpen(paperId: string, claimText: string): Promise<CitationResponse> {
    const params = new URLSearchParams({
      paper_id: paperId,
      claim_text: claimText,
    });
    const response = await fetch(
      `${API_BASE_URL}/feature/citation/open?${params.toString()}`,
    );
    await ensureResponseOk(response);
    const payload = (await response.json()) as unknown;
    return normalizeCitationResponse(payload);
  },

  async getMostAccurate(
    payload: MostAccurateRequest,
  ): Promise<MostAccurateResponse> {
    return postJson<MostAccurateRequest, MostAccurateResponse>(
      '/feature/most-accurate',
      payload,
      { useCache: true },
    );
  },

  getDebatesList(): Promise<DebatesListResponse> {
    return getJson<DebatesListResponse>('/feature/debates');
  },

  getDebateById(debateId: string): Promise<DebateDetailResponse> {
    const encodedId = encodeURIComponent(debateId);
    return getJson<DebateDetailResponse>(`/feature/debates/${encodedId}`);
  },

  getBrowseSessions(): Promise<BrowseSessionsResponse> {
    return getJson<BrowseSessionsResponse>('/browse/sessions', { skipCache: true });
  },

  getTimeline(): Promise<TimelineResponse> {
    return getJson<TimelineResponse>('/timeline', { skipCache: true });
  },

  browseStart(payload?: BrowseStartRequest): Promise<BrowseStartResponse> {
    return postJson<BrowseStartRequest | undefined, BrowseStartResponse>('/browse/start', payload);
  },

  browseRun(sessionId: string): Promise<BrowseRunResponse> {
    const encodedSessionId = encodeURIComponent(sessionId);
    return postJson<undefined, BrowseRunResponse>(`/browse/run/${encodedSessionId}`);
  },

  browseStatus(sessionId: string): Promise<BrowseStatusResponse> {
    const encodedSessionId = encodeURIComponent(sessionId);
    return getJson<BrowseStatusResponse>(`/browse/status/${encodedSessionId}`, { skipCache: true });
  },

};
