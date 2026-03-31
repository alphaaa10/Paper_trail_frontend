import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  type NodeProps,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { api, HeatmapResponse, PaperSummary } from '../utils/api';
import { fallbackPapersResponse } from '../utils/fallbackData';

function isConflictLabel(label: string): boolean {
  return label.toUpperCase().includes('CONTRADICTS');
}

const NODE_WIDTH = 400;
const NODE_HEIGHT = 5;
const LAYER_GAP_X = 100;
const LAYER_GAP_Y = 20;
type DisplayMode = 'compact' | 'balanced' | 'exhaustive';

type VisualCategory = 'paper' | 'method' | 'dataset' | 'theme' | 'claim' | 'evidence' | 'gap' | 'timeline' | 'default';

function normalizeNodeType(type: string | undefined, label: string, description: string): string {
  const explicit = type?.trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const merged = `${label} ${description}`.toLowerCase();
  if (/(paper|study|trial|article|publication)/.test(merged)) {
    return 'paper';
  }
  if (/(method|protocol|baseline|design|model)/.test(merged)) {
    return 'method';
  }
  if (/(dataset|corpus|benchmark|data source)/.test(merged)) {
    return 'dataset';
  }
  if (/(theme|topic|cluster|dimension)/.test(merged)) {
    return 'theme';
  }
  if (/(claim|conclusion|insight|hypothesis)/.test(merged)) {
    return 'claim';
  }
  if (/(evidence|finding|result|support|metric)/.test(merged)) {
    return 'evidence';
  }
  if (/(gap|limitation|risk|unknown|future)/.test(merged)) {
    return 'gap';
  }
  if (/(timeline|evolution|year|phase)/.test(merged)) {
    return 'timeline';
  }

  return 'default';
}

function nodeTypeBaseLevel(type: string): number {
  if (type === 'paper') {
    return 0;
  }
  if (type === 'method') {
    return 1;
  }
  if (type === 'dataset' || type === 'theme') {
    return 2;
  }
  if (type === 'claim' || type === 'evidence') {
    return 3;
  }
  if (type === 'timeline' || type === 'gap') {
    return 4;
  }
  return 3;
}

type HierarchyNode = {
  id: string;
  label: string;
  description: string;
  nodeType: string;
};

function buildTypeHierarchyLayout(
  nodes: HierarchyNode[],
  edges: Array<{ source: string; target: string }>,
  selectedPaperOrder: Map<string, number>,
): Map<string, { x: number; y: number }> {
  const ids = new Set(nodes.map((n) => n.id));
  const predecessors = new Map<string, string[]>();
  for (const node of nodes) {
    predecessors.set(node.id, []);
  }

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      continue;
    }
    predecessors.get(edge.target)?.push(edge.source);
  }

  const levels = new Map<string, number>();
  for (const node of nodes) {
    levels.set(node.id, nodeTypeBaseLevel(node.nodeType));
  }

  // Relaxation pass to push descendants below ancestors while respecting base type levels.
  for (let pass = 0; pass < nodes.length + 2; pass += 1) {
    for (const node of nodes) {
      const parentLevels = (predecessors.get(node.id) || []).map((id) => levels.get(id) || 0);
      const inheritedLevel = parentLevels.length > 0 ? Math.max(...parentLevels) + 1 : 0;
      const baseLevel = nodeTypeBaseLevel(node.nodeType);
      const nextLevel = Math.max(baseLevel, inheritedLevel);
      if ((levels.get(node.id) || 0) < nextLevel) {
        levels.set(node.id, nextLevel);
      }
    }
  }

  // Pin chosen papers to the topmost layer so users always see selected papers first.
  for (const node of nodes) {
    if (selectedPaperOrder.has(node.id)) {
      levels.set(node.id, 0);
    }
  }

  const grouped = new Map<number, HierarchyNode[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) || 0;
    const bucket = grouped.get(level) || [];
    bucket.push(node);
    grouped.set(level, bucket);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const orderedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);

  for (const level of orderedLevels) {
    const levelNodes = grouped.get(level) || [];

    levelNodes.sort((a, b) => {
      const selectedA = selectedPaperOrder.get(a.id);
      const selectedB = selectedPaperOrder.get(b.id);
      if (selectedA !== undefined || selectedB !== undefined) {
        if (selectedA === undefined) {
          return 1;
        }
        if (selectedB === undefined) {
          return -1;
        }
        return selectedA - selectedB;
      }

      const aParents = predecessors.get(a.id) || [];
      const bParents = predecessors.get(b.id) || [];

      const aParentX = aParents.length > 0
        ? aParents.reduce((sum, parentId) => sum + (positions.get(parentId)?.x || 0), 0) / aParents.length
        : 0;
      const bParentX = bParents.length > 0
        ? bParents.reduce((sum, parentId) => sum + (positions.get(parentId)?.x || 0), 0) / bParents.length
        : 0;

      if (aParentX !== bParentX) {
        return aParentX - bParentX;
      }
      return a.label.localeCompare(b.label);
    });

    const totalWidth = (levelNodes.length - 1) * (NODE_WIDTH + LAYER_GAP_X);
    levelNodes.forEach((node, index) => {
      const x = index * (NODE_WIDTH + LAYER_GAP_X) - totalWidth / 2;
      const y = level * (NODE_HEIGHT + LAYER_GAP_Y);
      positions.set(node.id, { x, y });
    });
  }

  return positions;
}

function detectNodeCategory(label: string, description: string, explicitType?: string): VisualCategory {
  const normalizedType = explicitType?.trim().toLowerCase();
  if (normalizedType === 'paper') {
    return 'paper';
  }
  if (normalizedType === 'method') {
    return 'method';
  }
  if (normalizedType === 'dataset') {
    return 'dataset';
  }
  if (normalizedType === 'theme') {
    return 'theme';
  }
  if (normalizedType === 'claim') {
    return 'claim';
  }
  if (normalizedType === 'evidence') {
    return 'evidence';
  }
  if (normalizedType === 'gap') {
    return 'gap';
  }
  if (normalizedType === 'timeline') {
    return 'timeline';
  }

  const text = `${label} ${description}`.toLowerCase();
  if (/(paper|study|trial|article|publication)/.test(text)) {
    return 'paper';
  }
  if (/(method|protocol|trial|design|baseline|model)/.test(text)) {
    return 'method';
  }
  if (/(dataset|corpus|benchmark|data source)/.test(text)) {
    return 'dataset';
  }
  if (/(theme|topic|cluster|concept|dimension)/.test(text)) {
    return 'theme';
  }
  if (/(evidence|result|finding|support|dataset|metric)/.test(text)) {
    return 'evidence';
  }
  if (/(gap|limitation|future|risk|unknown)/.test(text)) {
    return 'gap';
  }
  if (/(year|evolution|timeline|phase)/.test(text)) {
    return 'timeline';
  }
  if (/(claim|hypothesis|conclusion|insight|summary)/.test(text)) {
    return 'claim';
  }
  return 'default';
}

function getNodeVisuals(category: VisualCategory): { border: string; background: string; chip: string } {
  switch (category) {
    case 'paper':
      return { border: '#93c5fd', background: '#eef6ff', chip: '#1d4ed8' };
    case 'claim':
      return { border: '#9fc5f8', background: '#eaf3ff', chip: '#3b82f6' };
    case 'method':
      return { border: '#d8b4fe', background: '#f7efff', chip: '#8b5cf6' };
    case 'dataset':
      return { border: '#86efac', background: '#effdf3', chip: '#15803d' };
    case 'theme':
      return { border: '#fcd34d', background: '#fffaeb', chip: '#b45309' };
    case 'evidence':
      return { border: '#99f6e4', background: '#ecfffb', chip: '#0f766e' };
    case 'gap':
      return { border: '#fecaca', background: '#fff2f2', chip: '#dc2626' };
    case 'timeline':
      return { border: '#fde68a', background: '#fffae6', chip: '#b45309' };
    default:
      return { border: '#cbd5e1', background: '#f8fafc', chip: '#475569' };
  }
}

function getEdgeVisuals(label: string): { stroke: string; dashed: boolean } {
  const value = label.toLowerCase();
  if (value.includes('contradict')) {
    return { stroke: '#dc2626', dashed: false };
  }
  if (value.includes('support') || value.includes('validate')) {
    return { stroke: '#0f766e', dashed: false };
  }
  if (value.includes('improves_upon') || value.includes('extends')) {
    return { stroke: '#2563eb', dashed: false };
  }
  if (value.includes('weak') || value.includes('related') || value.includes('association')) {
    return { stroke: '#64748b', dashed: true };
  }
  return { stroke: '#7c8da6', dashed: false };
}

function InsightNode({ data }: NodeProps<{ label: string; description: string; category: VisualCategory; nodeType?: string; year?: string }>) {
  const visuals = getNodeVisuals(data.category);

  return (
    <div
      style={{
        border: `1px solid ${visuals.border}`,
        background: visuals.background,
        borderRadius: 10,
        padding: '8px 10px',
        width: 220,
        minHeight: 56,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 6, height: 6 }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.25, textAlign: 'center' }}>
        {data.label}
      </div>
      {data.description ? (
        <div style={{ marginTop: 5, fontSize: 10, color: '#475569', lineHeight: 1.25, textAlign: 'center' }}>
          {data.description}
        </div>
      ) : null}
      {data.year ? (
        <div style={{ marginTop: 6, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
          Year: {data.year}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 8,
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 999,
          background: `${visuals.chip}1a`,
          color: visuals.chip,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {data.nodeType || data.category}
      </div>
    </div>
  );
}

const nodeTypes = {
  insightNode: InsightNode,
};

export function GraphAnalysis() {
  const [papers, setPapers] = useState<PaperSummary[]>(fallbackPapersResponse.papers);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('balanced');
  const [strictNodeLimit, setStrictNodeLimit] = useState(120);
  const [strictEdgeLimit, setStrictEdgeLimit] = useState(220);
  const [targetFinding, setTargetFinding] = useState('');
  const [topK, setTopK] = useState(10);
  const [saveFiles, setSaveFiles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<HeatmapResponse | null>(null);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        const response = await api.listPapers();
        if (response.papers.length > 0) {
          setPapers(response.papers);
        }
      } catch {
        // Keep fallback papers in place when API fails.
      }
    };

    void loadPapers();
  }, []);

  const effectivePaperIds = useMemo(
    () => Array.from(new Set(selectedPaperIds.map((item) => item.trim()).filter(Boolean))),
    [selectedPaperIds],
  );
  const selectedPaperOrder = useMemo(() => {
    const map = new Map<string, number>();
    effectivePaperIds.forEach((paperId, index) => {
      map.set(paperId, index);
    });
    return map;
  }, [effectivePaperIds]);

  const paperDisplayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const paper of papers) {
      map.set(paper.paper_id, paper.title || paper.paper_id);
    }
    for (const item of graphData?.paper_display_names || []) {
      map.set(item.paper_id, item.display_name || item.paper_id);
    }
    return map;
  }, [graphData?.paper_display_names, papers]);

  const modeConfig = useMemo(() => {
    if (displayMode === 'compact') {
      return {
        maxNodes: 120,
        maxEdges: 260,
        maxParallelEdges: 1,
        labelLength: 18,
        showMiniMapUpTo: 80,
      };
    }

    if (displayMode === 'exhaustive') {
      return {
        maxNodes: 280,
        maxEdges: 1200,
        maxParallelEdges: 3,
        labelLength: 30,
        showMiniMapUpTo: 200,
      };
    }

    return {
      maxNodes: 180,
      maxEdges: 600,
      maxParallelEdges: 2,
      labelLength: 24,
      showMiniMapUpTo: 120,
    };
  }, [displayMode]);

  const effectiveNodeLimit = useMemo(() => Math.max(1, strictNodeLimit), [strictNodeLimit]);
  const effectiveEdgeLimit = useMemo(() => Math.max(1, strictEdgeLimit), [strictEdgeLimit]);

  const boundedGraph = useMemo(() => {
    if (!graphData) {
      return {
        nodes: [] as HeatmapResponse['reactflow_graph']['nodes'],
        edges: [] as HeatmapResponse['reactflow_graph']['edges'],
        totalNodes: 0,
        totalEdges: 0,
        truncated: false,
      };
    }

    const sourceNodes = graphData.reactflow_graph.nodes;
    const sourceEdges = graphData.reactflow_graph.edges;
    const totalNodes = sourceNodes.length;
    const totalEdges = sourceEdges.length;
    const selectedSet = new Set(effectivePaperIds);

    // Selected papers must be visible first regardless of generic slicing.
    const requiredPaperNodes = sourceNodes.filter((node) => selectedSet.has(node.id));
    const optionalNodes = sourceNodes.filter((node) => !selectedSet.has(node.id));

    const hardNodeCap = Math.min(modeConfig.maxNodes, effectiveNodeLimit);
    const hardEdgeCap = Math.min(modeConfig.maxEdges, effectiveEdgeLimit);

    if (totalNodes <= hardNodeCap && totalEdges <= hardEdgeCap) {
      return {
        nodes: [...requiredPaperNodes, ...optionalNodes],
        edges: sourceEdges,
        totalNodes,
        totalEdges,
        truncated: false,
      };
    }

    const baseNodes = [...requiredPaperNodes, ...optionalNodes];
    const nodes = baseNodes.slice(0, Math.max(requiredPaperNodes.length, hardNodeCap));
    const visibleNodeIds = new Set(nodes.map((node) => node.id));
    const edges = sourceEdges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .slice(0, hardEdgeCap);

    return {
      nodes,
      edges,
      totalNodes,
      totalEdges,
      truncated: true,
    };
  }, [effectiveEdgeLimit, effectiveNodeLimit, effectivePaperIds, graphData, modeConfig.maxEdges, modeConfig.maxNodes]);

  const reactFlowNodes = useMemo<Node[]>(() => {
    if (!graphData) {
      return [];
    }

    const layoutPositions = buildTypeHierarchyLayout(
      boundedGraph.nodes.map((node) => ({
        id: node.id,
        label: node.data.label || paperDisplayNameMap.get(node.id) || node.id,
        description: node.data.description || '',
        nodeType: selectedPaperOrder.has(node.id)
          ? 'paper'
          : normalizeNodeType(
              node.data.node_type,
              node.data.label || paperDisplayNameMap.get(node.id) || node.id,
              node.data.description || '',
            ),
      })),
      boundedGraph.edges.map((edge) => ({ source: edge.source, target: edge.target })),
      selectedPaperOrder,
    );

    return boundedGraph.nodes.map((node) => ({
      id: node.id,
      type: 'insightNode',
      data: {
        label: node.data.label || paperDisplayNameMap.get(node.id) || node.id,
        description: node.data.description,
        nodeType: node.data.node_type,
        year: node.data.year,
        category: detectNodeCategory(
          node.data.label || paperDisplayNameMap.get(node.id) || node.id,
          node.data.description || '',
          selectedPaperOrder.has(node.id) ? 'paper' : node.data.node_type,
        ),
      },
      position: layoutPositions.get(node.id) || node.position,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        width: 230,
      },
    }));
  }, [boundedGraph.edges, boundedGraph.nodes, graphData, paperDisplayNameMap, selectedPaperOrder]);

  const reactFlowEdges = useMemo<Edge[]>(() => {
    if (!graphData) {
      return [];
    }

    const pairGroupIndex = new Map<string, number>();
    const sourceFanIndex = new Map<string, number>();

    return boundedGraph.edges.map((edge, edgeIndex) => {
      const label = edge.label || '';
      const conflict = isConflictLabel(label);
      const edgeVisual = getEdgeVisuals(label);

      const pairKey = `${edge.source}->${edge.target}`;
      const pairIndex = pairGroupIndex.get(pairKey) || 0;
      pairGroupIndex.set(pairKey, pairIndex + 1);

      const sourceKey = edge.source;
      const sourceIndex = sourceFanIndex.get(sourceKey) || 0;
      sourceFanIndex.set(sourceKey, sourceIndex + 1);

      const baseLabel = label.length > modeConfig.labelLength
        ? `${label.slice(0, Math.max(8, modeConfig.labelLength - 3))}...`
        : label;

      return {
        id: edge.id || `${edge.source}-${edge.target}-${edgeIndex}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        label: baseLabel,
        pathOptions: {
          borderRadius: 18,
            offset: 14 + pairIndex * 10 + (sourceIndex % 4) * 6,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: conflict
          ? {
              stroke: '#dc2626',
              strokeWidth: 2,
            }
          : {
              stroke: edgeVisual.stroke,
              strokeWidth: 1.4,
              strokeDasharray: edgeVisual.dashed ? '4 3' : undefined,
            },
        labelShowBg: true,
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.88,
        },
        labelBgPadding: [6, 2],
        labelBgBorderRadius: 4,
        labelStyle: conflict
          ? {
              fill: '#dc2626',
              fontWeight: 700,
              fontSize: 11,
            }
          : {
              fill: '#334155',
              fontSize: 11,
            },
        data: {
          ...edge.data,
        },
      };
    });
  }, [boundedGraph.edges, graphData, modeConfig.labelLength, modeConfig.maxParallelEdges]);

  const conflictEdgeCount = useMemo(() => {
    return reactFlowEdges.filter((edge) => isConflictLabel(String(edge.label || ''))).length;
  }, [reactFlowEdges]);

  const relationshipEntries = useMemo(() => {
    if (!graphData?.relationship_counts) {
      return [] as Array<[string, number]>;
    }

    return Object.entries(graphData.relationship_counts)
      .sort((a, b) => b[1] - a[1]);
  }, [graphData?.relationship_counts]);

  const nodeTypeEntries = useMemo(() => {
    if (!graphData?.stats?.per_type_node_totals) {
      return [] as Array<[string, number]>;
    }

    return Object.entries(graphData.stats.per_type_node_totals)
      .sort((a, b) => b[1] - a[1]);
  }, [graphData?.stats?.per_type_node_totals]);

  const generateGraph = async () => {
    if (effectivePaperIds.length < 2) {
      setError('Select at least 2 papers to generate a knowledge graph.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.generateKnowledgeGraph({
        paper_ids: effectivePaperIds,
        target_research_finding: targetFinding.trim() || undefined,
        top_k: topK,
        save_files: saveFiles,
      });
      setGraphData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to generate knowledge graph.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Knowledge Graph</h1>
          <p className="text-gray-600 mt-1">Heatmap mode was replaced by a relationship graph from Council API.</p>
        </div>
        <button
          type="button"
          onClick={() => void generateGraph()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Graph Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Display Mode</div>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
              {(['compact', 'balanced', 'exhaustive'] as DisplayMode[]).map((mode) => {
                const active = displayMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDisplayMode(mode)}
                    className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                      active
                        ? 'bg-[#0066ff] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Compact = clean overview, Balanced = default readability, Exhaustive = most detail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="strict-node-limit" className="block text-sm font-medium text-gray-700 mb-1">Max Nodes (strict)</label>
              <input
                id="strict-node-limit"
                type="number"
                min={1}
                value={strictNodeLimit}
                onChange={(event) => setStrictNodeLimit(Math.max(1, Number(event.target.value) || 1))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="strict-edge-limit" className="block text-sm font-medium text-gray-700 mb-1">Max Edges (strict)</label>
              <input
                id="strict-edge-limit"
                type="number"
                min={1}
                value={strictEdgeLimit}
                onChange={(event) => setStrictEdgeLimit(Math.max(1, Number(event.target.value) || 1))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Select papers</div>
            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-md p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {papers.map((paper) => {
                const checked = selectedPaperIds.includes(paper.paper_id);
                return (
                  <label key={paper.paper_id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedPaperIds((current) => (
                          checked
                            ? current.filter((item) => item !== paper.paper_id)
                            : [...current, paper.paper_id]
                        ));
                      }}
                    />
                    <span className="truncate">{paper.title || paper.paper_id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="target-finding" className="block text-sm font-medium text-gray-700 mb-1">
                Target Research Finding (optional)
              </label>
              <input
                id="target-finding"
                type="text"
                value={targetFinding}
                onChange={(event) => setTargetFinding(event.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="What finding should be prioritized?"
              />
            </div>

            <div>
              <label htmlFor="top-k" className="block text-sm font-medium text-gray-700 mb-1">Top K</label>
              <input
                id="top-k"
                type="number"
                min={1}
                value={topK}
                onChange={(event) => setTopK(Math.max(1, Number(event.target.value) || 1))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-7">
              <input
                type="checkbox"
                checked={saveFiles}
                onChange={(event) => setSaveFiles(event.target.checked)}
              />
              Save output files
            </label>
          </div>

          <p className="text-xs text-gray-500">
            Valid request requires at least 2 papers. Current selection: {effectivePaperIds.length}.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-amber-700">{error}</p>
            <button
              type="button"
              onClick={() => void generateGraph()}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{reactFlowNodes.length}</div>
            {boundedGraph.truncated && (
              <p className="text-xs text-gray-500 mt-1">Showing {reactFlowNodes.length} of {boundedGraph.totalNodes}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Edges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{reactFlowEdges.length}</div>
            {boundedGraph.truncated && (
              <p className="text-xs text-gray-500 mt-1">Showing {reactFlowEdges.length} of {boundedGraph.totalEdges}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conflict Edges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-red-600">{conflictEdgeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Graph Guide</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-gray-700">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Node Colors</div>
            <div className="space-y-1">
              <div>Blue: Paper (top-level anchor nodes)</div>
              <div>Purple: Method</div>
              <div>Green: Dataset or supporting evidence</div>
              <div>Amber: Theme or timeline</div>
              <div>Red tint: Gap or risk</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Edge Meanings</div>
            <div className="space-y-1">
              <div>Red edge: Contradiction or tension</div>
              <div>Teal edge: Support or validation</div>
              <div>Blue edge: Improves upon or extends</div>
              <div>Gray dashed: Weak/related association</div>
              <div>Label +N: Additional parallel relations hidden on canvas</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">How To Read</div>
            <div className="space-y-1">
              <div>Start at the top blue paper nodes.</div>
              <div>Then follow methodology nodes beneath them.</div>
              <div>Then read component nodes (dataset/theme/claims) on lower levels.</div>
              <div>Use the lower tables for full edge explanations and confidence.</div>
              <div>Use pan/zoom controls to inspect local neighborhoods.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {graphData && (relationshipEntries.length > 0 || nodeTypeEntries.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {relationshipEntries.length > 0 ? (
                <div className="space-y-2">
                  {relationshipEntries.map(([name, count]) => (
                    <div key={`rel-${name}`} className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                      <span className="text-sm text-gray-700">{name}</span>
                      <span className="text-xs font-semibold text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No relationship analytics returned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Node Type Totals</CardTitle>
            </CardHeader>
            <CardContent>
              {nodeTypeEntries.length > 0 ? (
                <div className="space-y-2">
                  {nodeTypeEntries.map(([name, count]) => (
                    <div key={`type-${name}`} className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                      <span className="text-sm text-gray-700">{name}</span>
                      <span className="text-xs font-semibold text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No node type analytics returned.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph View</CardTitle>
        </CardHeader>
        <CardContent>
          {boundedGraph.truncated && (
            <p className="text-xs text-amber-700 mb-3">
              Large graph detected. Rendering a strict capped subset (nodes: {effectiveNodeLimit}, edges: {effectiveEdgeLimit}) in {displayMode} mode.
            </p>
          )}
          {graphData ? (
            <div className="h-[620px] border border-gray-200 rounded-lg overflow-hidden bg-[#f8fafc]">
              <ReactFlow
                nodes={reactFlowNodes}
                edges={reactFlowEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.32, duration: 350 }}
                minZoom={0.12}
                maxZoom={1.7}
                onlyRenderVisibleElements
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnDoubleClick={false}
                panOnDrag
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ type: 'smoothstep' }}
              >
                <Background color="#d0dbe9" gap={28} size={0.9} />
                {reactFlowNodes.length <= modeConfig.showMiniMapUpTo && <MiniMap />}
                <Controls />
              </ReactFlow>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Generate a graph to visualize relationships.</p>
          )}
        </CardContent>
      </Card>

      {graphData && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Graph Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              {graphData.knowledge_graph.nodes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-gray-600">
                        <th className="py-2 pr-3">Title</th>
                        <th className="py-2 pr-3">Methodology</th>
                        <th className="py-2">Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {graphData.knowledge_graph.nodes.map((node) => (
                        <tr key={node.id} className="border-b border-gray-100 align-top">
                          <td className="py-2 pr-3">
                            <div className="font-medium text-gray-900">{node.title || node.id}</div>
                            {node.tags.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">Tags: {node.tags.join(', ')}</div>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-gray-700">{node.key_methodology || 'N/A'}</td>
                          <td className="py-2 text-gray-700">{node.main_contribution || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No node details returned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Graph Edges</CardTitle>
            </CardHeader>
            <CardContent>
              {graphData.knowledge_graph.edges.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-gray-600">
                        <th className="py-2 pr-3">Relationship</th>
                        <th className="py-2 pr-3">Explanation</th>
                        <th className="py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {graphData.knowledge_graph.edges.map((edge, index) => {
                        const conflict = isConflictLabel(edge.relationship);
                        return (
                          <tr key={`${edge.source}-${edge.target}-${index}`} className="border-b border-gray-100 align-top">
                            <td className="py-2 pr-3">
                              <div className={conflict ? 'font-semibold text-red-700' : 'font-medium text-gray-900'}>
                                {edge.source} {'->'} {edge.target}
                              </div>
                              <div className={conflict ? 'text-xs text-red-600' : 'text-xs text-gray-500'}>
                                {edge.relationship || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2 pr-3 text-gray-700">{edge.explanation || 'N/A'}</td>
                            <td className="py-2 text-gray-700">{edge.confidence}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No edge details returned.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}