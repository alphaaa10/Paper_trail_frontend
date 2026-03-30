import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { api, getPaperDisplayName, HeatmapResponse, PaperSummary } from '../utils/api';
import {
  fallbackHeatmapResponse,
  fallbackPapersResponse,
  fallbackPaperTitles,
} from '../utils/fallbackData';

interface ContradictionDetail {
  paper1: string;
  paper2: string;
  severity: 'low' | 'medium' | 'high';
  contradictions: string[];
}

export function GraphAnalysis() {
  const [selectedCell, setSelectedCell] = useState<ContradictionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [papers, setPapers] = useState<PaperSummary[]>(fallbackPapersResponse.papers);
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse>(fallbackHeatmapResponse);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        const response = await api.listPapers();
        if (response.papers.length > 0) {
          setPapers(response.papers);
        }
      } catch {
        setError('Papers API unavailable. Using fallback paper list.');
      }
    };

    void loadPapers();
  }, []);

  const loadHeatmap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const paperIds = papers.map((paper) => paper.paper_id);
      const data = await api.getHeatmap(paperIds);
      setHeatmapData(data);
    } catch {
      setError('Failed to load heatmap from backend. Using fallback data.');
      setHeatmapData(fallbackHeatmapResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaperTitle = (paperId: string): string => {
    const fallbackTitle = papers.find((paper) => paper.paper_id === paperId)?.title || fallbackPaperTitles[paperId] || paperId;
    return getPaperDisplayName(paperId, heatmapData.paper_display_names, fallbackTitle);
  };

  const getContradictionCount = (i: number, j: number): number => {
    return heatmapData.matrix[i]?.[j]?.contradictions?.length || 0;
  };

  const getSeverity = (count: number): 'low' | 'medium' | 'high' => {
    if (count <= 2) return 'low';
    if (count <= 4) return 'medium';
    return 'high';
  };

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-yellow-200';
    if (count <= 4) return 'bg-orange-300';
    return 'bg-red-400';
  };

  const handleCellClick = (i: number, j: number) => {
    if (i === j) return;
    const count = getContradictionCount(i, j);
    if (count === 0) return;

    const paper1Id = heatmapData.paper_ids[i];
    const paper2Id = heatmapData.paper_ids[j];
    const contradictions = heatmapData.matrix[i]?.[j]?.contradictions || [];

    if (!paper1Id || !paper2Id) {
      return;
    }

    setSelectedCell({
      paper1: getPaperTitle(paper1Id),
      paper2: getPaperTitle(paper2Id),
      severity: getSeverity(count),
      contradictions: contradictions,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Contradiction Heatmap</h1>
        <p className="text-gray-600 mt-1">Visual analysis of contradictions between papers</p>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-700">Severity:</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-200 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">Low (1-2)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-300 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">Medium (3-4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-400 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">High (5+)</span>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contradiction Matrix (N×N)</CardTitle>
            <button
              onClick={loadHeatmap}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3a2e] text-white hover:bg-[#234136] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Load Heatmap
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-amber-600">{error}</div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header Row */}
              <div className="flex">
                <div className="w-48"></div>
                {heatmapData.paper_ids.map((paperId) => (
                  <div key={paperId} className="w-24 text-center">
                    <div className="text-xs text-gray-600 transform -rotate-45 origin-left whitespace-nowrap mb-8">
                      {getPaperTitle(paperId)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Matrix Rows */}
              {heatmapData.paper_ids.map((paperId, i) => (
                <div key={paperId} className="flex items-center mb-2">
                  <div className="w-48 pr-4 text-sm text-gray-900 truncate">
                    {getPaperTitle(paperId)}
                  </div>
                  {heatmapData.paper_ids.map((targetPaperId, j) => {
                    const count = getContradictionCount(i, j);
                    return (
                      <div
                        key={`${paperId}-${targetPaperId}`}
                        onClick={() => handleCellClick(i, j)}
                        className={`w-24 h-16 border border-gray-300 flex items-center justify-center ${getColor(count)} ${
                          i !== j && count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-[#1a3a2e] transition-all' : ''
                        }`}
                      >
                        {count > 0 && (
                          <span className="font-semibold text-gray-900">{count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Panel */}
      {selectedCell && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Contradiction Details</CardTitle>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Papers in Conflict</div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    {selectedCell.paper1}
                  </span>
                  <span className="text-gray-400">↔</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    {selectedCell.paper2}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Severity</div>
                <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${
                  selectedCell.severity === 'high' ? 'bg-red-100 text-red-700' :
                  selectedCell.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedCell.severity.toUpperCase()}
                </span>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Contradicting Claims</div>
                <div className="space-y-3">
                  {selectedCell.contradictions.map((contradiction, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs text-blue-600 font-medium mb-1">Contradiction {index + 1}</div>
                      <div className="text-sm text-gray-800">{contradiction}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}