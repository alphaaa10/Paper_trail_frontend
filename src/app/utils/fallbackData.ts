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
  PlagiarismReportResponse,
  TimelineResponse,
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
  paper_display_names: [
    { paper_id: 'paper_1ba6db38d4c86a5e', display_name: 'Traffic Forecasting GNN Study' },
    { paper_id: 'paper_2ba6db38d4c86a5e', display_name: 'Urban Mobility Meta Review' },
  ],
  executive_summary_json: {
    highlights: ['Two core papers disagree on robustness under sparse data.'],
  },
  executive_summary_markdown: '## Knowledge Graph Summary\n\n- Major contradiction on data sparsity assumptions.',
  knowledge_graph: {
    nodes: [
      {
        id: 'paper_1ba6db38d4c86a5e',
        title: 'Traffic Forecasting GNN Study',
        key_methodology: 'Spatiotemporal GNN',
        main_contribution: 'Improves MAE under dense supervision.',
        tags: ['gnn', 'traffic'],
      },
      {
        id: 'paper_2ba6db38d4c86a5e',
        title: 'Urban Mobility Meta Review',
        key_methodology: 'Meta-analysis',
        main_contribution: 'Reports inconsistent gains under sparse splits.',
        tags: ['meta-analysis', 'robustness'],
      },
    ],
    edges: [
      {
        source: 'paper_1ba6db38d4c86a5e',
        target: 'paper_2ba6db38d4c86a5e',
        relationship: 'CONTRADICTS',
        explanation: 'Conflicting claims about sparse supervision outcomes.',
        confidence: 0.86,
      },
    ],
  },
  reactflow_graph: {
    nodes: [
      {
        id: 'paper_1ba6db38d4c86a5e',
        data: {
          label: 'Traffic Forecasting GNN Study',
          description: 'Dense supervision gains',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'paper_2ba6db38d4c86a5e',
        data: {
          label: 'Urban Mobility Meta Review',
          description: 'Sparse split skepticism',
        },
        position: { x: 320, y: 60 },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'paper_1ba6db38d4c86a5e',
        target: 'paper_2ba6db38d4c86a5e',
        label: 'CONTRADICTS',
      },
    ],
  },
  saved_files: {
    executive_summary_json: 'data/feature/exec_summary.json',
    knowledge_graph_json: 'data/feature/knowledge_graph.json',
    reactflow_graph_json: 'data/feature/reactflow_graph.json',
  },
  mode: 'knowledge-graph',
};

export const fallbackAnalyzeResponse: AnalyzeResponse = {
  report_path: 'data/reports/latest_report.json',
  paper_count: 8,
  claim_count: 90,
  contradiction_count: 6,
  gaps: ['Several contradictory claims need manual verification.'],
};

export const fallbackTimelineResponse: TimelineResponse = {
  years: ['2023', '2024', '2025'],
  papers: [
    {
      paper_id: 'paper_timeline_001',
      title: 'Cyberbullying Risk and Mental Health Outcomes Among Sexual Minority College Students',
      year: '2025',
      contribution:
        'This study reports elevated cyberbullying exposure and associated increases in depressive symptoms and suicide risk indicators in vulnerable student populations.',
      methods: ['propensity score matching', 'causal mediation analysis', 'survey research'],
      claims: [
        'Sexual minority students in the sample reported higher cyberbullying incidence than peers.',
        'Cyberbullying exposure was associated with significantly higher depression scores.',
        'Mediation analysis suggested social support partially reduced adverse outcomes.',
      ],
    },
    {
      paper_id: 'paper_timeline_002',
      title: 'Association Between Posting WeChat Moments and Depressive Symptoms in Middle-Aged and Older Adults',
      year: '2025',
      contribution:
        'Frequent social posting behavior was correlated with depressive symptom patterns, with effects varying by social engagement and offline support.',
      methods: ['longitudinal survey', 'regression analysis'],
      claims: [
        'Higher posting frequency was linked to elevated symptom scores in low-support cohorts.',
        'Participants with high offline support showed weaker negative associations.',
      ],
    },
    {
      paper_id: 'paper_timeline_003',
      title: 'Systematic Review of Digital Harassment Interventions in University Settings',
      year: '2024',
      contribution:
        'The review identified intervention strategies with strongest evidence around peer-led reporting workflows and rapid counseling referral.',
      methods: ['systematic review', 'evidence grading'],
      claims: [
        'Interventions combining reporting and counseling had higher adoption rates.',
        'Most studies lacked long-term follow-up beyond one semester.',
      ],
    },
    {
      paper_id: 'paper_timeline_004',
      title: 'Cross-Campus Benchmark for Early Warning Signals of Student Mental Health Deterioration',
      year: '2023',
      contribution:
        'This benchmark introduced a reproducible protocol for comparing early warning models across multiple institutions.',
      methods: ['benchmarking', 'time-series modeling'],
      claims: [
        'Temporal models outperformed static baselines for short-term risk prediction.',
        'Data drift across campuses significantly reduced transfer performance.',
      ],
    },
  ],
  papers_by_year: {
    '2023': [
      {
        paper_id: 'paper_timeline_004',
        title: 'Cross-Campus Benchmark for Early Warning Signals of Student Mental Health Deterioration',
        year: '2023',
        contribution:
          'This benchmark introduced a reproducible protocol for comparing early warning models across multiple institutions.',
        methods: ['benchmarking', 'time-series modeling'],
        claims: [
          'Temporal models outperformed static baselines for short-term risk prediction.',
          'Data drift across campuses significantly reduced transfer performance.',
        ],
      },
    ],
    '2024': [
      {
        paper_id: 'paper_timeline_003',
        title: 'Systematic Review of Digital Harassment Interventions in University Settings',
        year: '2024',
        contribution:
          'The review identified intervention strategies with strongest evidence around peer-led reporting workflows and rapid counseling referral.',
        methods: ['systematic review', 'evidence grading'],
        claims: [
          'Interventions combining reporting and counseling had higher adoption rates.',
          'Most studies lacked long-term follow-up beyond one semester.',
        ],
      },
    ],
    '2025': [
      {
        paper_id: 'paper_timeline_001',
        title: 'Cyberbullying Risk and Mental Health Outcomes Among Sexual Minority College Students',
        year: '2025',
        contribution:
          'This study reports elevated cyberbullying exposure and associated increases in depressive symptoms and suicide risk indicators in vulnerable student populations.',
        methods: ['propensity score matching', 'causal mediation analysis', 'survey research'],
        claims: [
          'Sexual minority students in the sample reported higher cyberbullying incidence than peers.',
          'Cyberbullying exposure was associated with significantly higher depression scores.',
          'Mediation analysis suggested social support partially reduced adverse outcomes.',
        ],
      },
      {
        paper_id: 'paper_timeline_002',
        title: 'Association Between Posting WeChat Moments and Depressive Symptoms in Middle-Aged and Older Adults',
        year: '2025',
        contribution:
          'Frequent social posting behavior was correlated with depressive symptom patterns, with effects varying by social engagement and offline support.',
        methods: ['longitudinal survey', 'regression analysis'],
        claims: [
          'Higher posting frequency was linked to elevated symptom scores in low-support cohorts.',
          'Participants with high offline support showed weaker negative associations.',
        ],
      },
    ],
  },
  total_papers: 4,
  year_range: {
    earliest: '2023',
    latest: '2025',
  },
};

export const fallbackPlagiarismReport: PlagiarismReportResponse = {
  input_file_name: 'sample-user-paper.pdf',
  analyzed_at: new Date().toISOString(),
  overall_similarity: 31,
  risk_level: 'medium',
  summary:
    'Prototype similarity scan found moderate overlap with two crawled papers, concentrated in background and method-description phrasing.',
  top_matches: [
    {
      paper_id: 'paper_1ba6db38d4c86a5e',
      title: 'Graph Neural Networks for Traffic Forecasting',
      year: '2024',
      similarity: 42,
      matched_passages: [
        {
          input_excerpt: 'We model traffic flow with a spatiotemporal graph where edges represent road proximity.',
          source_excerpt: 'Traffic forecasting is framed as a spatiotemporal graph problem with proximity-based connectivity.',
          similarity: 0.81,
          section: 'Method',
        },
        {
          input_excerpt: 'The baseline comparison includes recurrent and transformer models under identical splits.',
          source_excerpt: 'We compare graph models against recurrent and transformer baselines using the same data splits.',
          similarity: 0.74,
          section: 'Experiments',
        },
      ],
    },
    {
      paper_id: 'paper_4ba6db38d4c86a5e',
      title: 'ML Meta-Analysis for Forecast Robustness',
      year: '2025',
      similarity: 26,
      matched_passages: [
        {
          input_excerpt: 'Prior work reports inconsistent robustness under sparse data conditions.',
          source_excerpt: 'Meta-analysis indicates inconsistent model robustness when training data is sparse.',
          similarity: 0.69,
          section: 'Related Work',
        },
      ],
    },
  ],
  recommendations: [
    'Rewrite matched method sentences using original wording and explicit novelty claims.',
    'Add direct citations near overlapping background statements.',
    'Expand discussion of dataset split choices to differentiate from prior work.',
  ],
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
  report: {
    executive_summary: 'The final report highlights unresolved disagreement across model depth and data regime assumptions.',
    executive_summary_json: {
      key_takeaways: ['Sparse-data robustness remains disputed.'],
      confidence_band: 'medium-high',
    },
    executive_summary_markdown: '## Executive Summary\n\n- Contradictions remain on model depth and sparse-data stability.\n- Recommended to run controlled replications.',
  },
  papers_considered: 8,
  unanswered_question_count: 3,
  decision_topic_count: 5,
  contradicting_paper_count: 4,
  recent_works_count: 6,
  individual_paper_summaries: [
    {
      paper_id: 'paper_1ba6db38d4c86a5e',
      title: 'Graph Neural Networks for Traffic Forecasting',
      summary: 'Strong gains under dense supervision; weaker in sparse conditions.',
    },
  ],
  cross_paper_analysis: [
    'Most disagreements are tied to training split design and normalization differences.',
  ],
  critical_insights: [
    'Benchmark protocol variance is likely the largest source of contradictory outcomes.',
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
