import {
  AnalyzeResponse,
  CrawlRequest,
  CrawlResponse,
  DebateRequest,
  ExtractAllResponse,
  ExtractPaperResponse,
  HeatmapResponse,
  LatestReportResponse,
  ListPapersResponse,
} from './api';

export const fallbackPaperIds = [
  'paper_1ba6db38d4c86a5e',
  'paper_2ba6db38d4c86a5e',
  'paper_3ba6db38d4c86a5e',
  'paper_4ba6db38d4c86a5e',
  'paper_5ba6db38d4c86a5e',
];

export const fallbackPaperTitles: Record<string, string> = {
  paper_1ba6db38d4c86a5e: 'Graph Neural Networks for Traffic Forecasting',
  paper_2ba6db38d4c86a5e: 'Deep Learning Review for Urban Mobility',
  paper_3ba6db38d4c86a5e: 'AI Safety Study for Autonomous Transport',
  paper_4ba6db38d4c86a5e: 'ML Meta-Analysis for Forecast Robustness',
  paper_5ba6db38d4c86a5e: 'Transformer Baselines for Time-Series Routing',
};

export const fallbackPapersResponse: ListPapersResponse = {
  count: 5,
  papers: [
    {
      paper_id: 'paper_1ba6db38d4c86a5e',
      title: fallbackPaperTitles.paper_1ba6db38d4c86a5e,
      year: '2024',
      source: 'openalex',
      pdf_path: 'data/pdf/paper_1ba6db38d4c86a5e.pdf',
      metadata_path: 'data/metadata/paper_1ba6db38d4c86a5e.json',
    },
    {
      paper_id: 'paper_2ba6db38d4c86a5e',
      title: fallbackPaperTitles.paper_2ba6db38d4c86a5e,
      year: '2024',
      source: 'semantic-scholar',
      pdf_path: 'data/pdf/paper_2ba6db38d4c86a5e.pdf',
      metadata_path: 'data/metadata/paper_2ba6db38d4c86a5e.json',
    },
    {
      paper_id: 'paper_3ba6db38d4c86a5e',
      title: fallbackPaperTitles.paper_3ba6db38d4c86a5e,
      year: '2025',
      source: 'arxiv',
      pdf_path: 'data/pdf/paper_3ba6db38d4c86a5e.pdf',
      metadata_path: 'data/metadata/paper_3ba6db38d4c86a5e.json',
    },
    {
      paper_id: 'paper_4ba6db38d4c86a5e',
      title: fallbackPaperTitles.paper_4ba6db38d4c86a5e,
      year: '2025',
      source: 'openalex',
      pdf_path: 'data/pdf/paper_4ba6db38d4c86a5e.pdf',
      metadata_path: 'data/metadata/paper_4ba6db38d4c86a5e.json',
    },
    {
      paper_id: 'paper_5ba6db38d4c86a5e',
      title: fallbackPaperTitles.paper_5ba6db38d4c86a5e,
      year: '2026',
      source: 'arxiv',
      pdf_path: 'data/pdf/paper_5ba6db38d4c86a5e.pdf',
      metadata_path: 'data/metadata/paper_5ba6db38d4c86a5e.json',
    },
  ],
};

export const fallbackHeatmapResponse: HeatmapResponse = {
  paper_ids: ['paper_1ba6db38d4c86a5e', 'paper_2ba6db38d4c86a5e'],
  mode: 'groq',
  matrix: [
    [
      {
        from: 'paper_1ba6db38d4c86a5e',
        to: 'paper_1ba6db38d4c86a5e',
        contradicts: false,
        contradictions: [],
      },
      {
        from: 'paper_1ba6db38d4c86a5e',
        to: 'paper_2ba6db38d4c86a5e',
        contradicts: true,
        contradictions: [
          'Paper A reports improvement while Paper B reports no improvement in similar setup.',
        ],
      },
    ],
    [
      {
        from: 'paper_2ba6db38d4c86a5e',
        to: 'paper_1ba6db38d4c86a5e',
        contradicts: true,
        contradictions: ['Paper B does not confirm the gain claimed by Paper A.'],
      },
      {
        from: 'paper_2ba6db38d4c86a5e',
        to: 'paper_2ba6db38d4c86a5e',
        contradicts: false,
        contradictions: [],
      },
    ],
  ],
};

export const fallbackAnalyzeResponse: AnalyzeResponse = {
  report_path: 'data/reports/latest_report.json',
  paper_count: 8,
  claim_count: 90,
  contradiction_count: 6,
  gaps: ['Several contradictory claims need manual verification.'],
};

export const fallbackReportResponse: LatestReportResponse = {
  paper_count: 8,
  claim_count: 90,
  top_methods: [{ name: 'transformer', count: 5 }],
  top_datasets: [{ name: 'METR-LA', count: 4 }],
  contradictions: [
    {
      title: 'Network Depth vs. Performance',
      severity: 'high',
      summary:
        'Papers disagree on whether deeper GNN stacks improve forecasting consistently.',
      papers: [
        'paper_1ba6db38d4c86a5e',
        'paper_2ba6db38d4c86a5e',
        'paper_5ba6db38d4c86a5e',
      ],
    },
    {
      title: 'Training Data Requirements',
      severity: 'medium',
      summary:
        'Conflicting results on minimal dataset size required for robust convergence.',
      papers: ['paper_3ba6db38d4c86a5e', 'paper_4ba6db38d4c86a5e'],
    },
  ],
  gaps: [
    'Long-term model stability under changing traffic patterns remains under-studied.',
    'Cross-domain generalization for multi-city transfer has limited evidence.',
    'Energy efficiency trade-offs are rarely benchmarked consistently.',
  ],
};

export const fallbackRecommendations = [
  {
    title: 'Conduct Systematic Replication Studies',
    description:
      'Address high-severity contradictions through controlled replication with standardized benchmarks.',
  },
  {
    title: 'Establish Benchmark Consistency',
    description:
      'Create unified evaluation protocols to ensure comparable results across studies and reduce methodological drift.',
  },
  {
    title: 'Focus on Identified Gaps',
    description:
      'Prioritize long-term stability, cross-domain generalization, and energy efficiency in upcoming workstreams.',
  },
];

export const fallbackRecentActivities = [
  {
    id: 1,
    action: 'Extracted claims from paper',
    detail: fallbackPaperTitles.paper_1ba6db38d4c86a5e,
    time: '2 min ago',
  },
  {
    id: 2,
    action: 'Found contradictions',
    detail: '2 cross-paper conflicts',
    time: '15 min ago',
  },
  {
    id: 3,
    action: 'Completed crawl',
    detail: 'Saved 8 papers',
    time: '1 hour ago',
  },
  {
    id: 4,
    action: 'Generated report',
    detail: 'Contradiction analysis',
    time: '2 hours ago',
  },
];

export const fallbackDebateRequest: DebateRequest = {
  paper_id_A: 'paper_1ba6db38d4c86a5e',
  paper_id_B: 'paper_2ba6db38d4c86a5e',
};

export const fallbackDebateText = [
  'A1: Paper A shows better MAE on METR-LA under dense supervision.',
  'B1: Paper B finds no consistent gain under sparse data splits.',
  'A2: The gain may depend on feature scaling and graph sparsity settings.',
  'Conclusion: Contradiction remains; setup sensitivity is likely the cause.',
].join('\n\n');

export function buildFallbackCrawlResponse(request: CrawlRequest): CrawlResponse {
  return {
    query: request.query || request.question || 'graph neural networks traffic forecasting',
    topics: ['graph neural network', 'traffic forecasting'],
    discovered: Math.max(request.max_papers ?? 10, 10),
    deduped: Math.max((request.max_papers ?? 10) - 1, 1),
    attempted: request.max_papers ?? 10,
    saved: Math.max((request.max_papers ?? 10) - 2, 1),
    skipped: 1,
    failed: 1,
    results: [
      {
        paper_id: 'paper_1ba6db38d4c86a5e',
        status: 'saved',
        reason: '',
        pdf_path: 'data/pdf/paper_1ba6db38d4c86a5e.pdf',
        metadata_path: 'data/metadata/paper_1ba6db38d4c86a5e.json',
      },
    ],
  };
}

export function buildFallbackExtractPaperResponse(paperId: string): ExtractPaperResponse {
  return {
    paper_id: paperId,
    extracted_path: `data/extracted/${paperId}.json`,
    claim_count: 12,
    method_count: 4,
    dataset_count: 3,
  };
}

export const fallbackExtractAllResponse: ExtractAllResponse = {
  processed_count: 3,
  skipped_count: 1,
  processed: [
    {
      paper_id: 'paper_1ba6db38d4c86a5e',
      claim_count: 12,
      method_count: 4,
      dataset_count: 3,
    },
  ],
  skipped: [
    {
      paper_id: 'paper_deadbeefdeadbe',
      reason: 'PDF file not found',
    },
  ],
};
