import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { FileText, AlertCircle, TrendingUp, Play, Search, FileBarChart, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, AnalyzeResponse, LatestReportResponse } from '../utils/api';
import {
  fallbackAnalyzeResponse,
  fallbackRecentActivities,
  fallbackReportResponse,
} from '../utils/fallbackData';

interface ActivityItem {
  id: number;
  action: string;
  detail: string;
  time: string;
}

export function Home() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>(fallbackRecentActivities);
  const [report, setReport] = useState<LatestReportResponse>(fallbackReportResponse);
  const [analyze, setAnalyze] = useState<AnalyzeResponse>(fallbackAnalyzeResponse);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [reportResponse, papersResponse] = await Promise.all([api.getReport(), api.listPapers()]);
        setReport(reportResponse);

        if (papersResponse.papers.length > 0) {
          const analyzeResponse = await api.analyze(papersResponse.papers.map((paper) => paper.paper_id));
          setAnalyze(analyzeResponse);
          setActivities([
            {
              id: 1,
              action: 'Analyzed current paper set',
              detail: `${analyzeResponse.paper_count} papers`,
              time: 'just now',
            },
            {
              id: 2,
              action: 'Detected contradictions',
              detail: `${analyzeResponse.contradiction_count} findings`,
              time: 'just now',
            },
            ...fallbackRecentActivities.slice(2),
          ]);
        }
      } catch {
        setReport(fallbackReportResponse);
        setAnalyze(fallbackAnalyzeResponse);
        setActivities(fallbackRecentActivities);
      }
    };

    void loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Papers Analyzed</div>
                <div className="text-3xl font-semibold text-gray-900">{report.paper_count}</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+12% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Extracted Claims</div>
                <div className="text-3xl font-semibold text-gray-900">{report.claim_count}</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+8% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Contradictions Found</div>
                <div className="text-3xl font-semibold text-gray-900">{analyze.contradiction_count}</div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Across 89 papers</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/data-studio')}
              className="flex items-center gap-4 p-4 bg-[#1a3a2e] text-white hover:bg-[#234136] transition-colors"
            >
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                <Play className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Crawl Papers</div>
                <div className="text-sm text-[#a3c4b5]">Start new crawl</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/investigation')}
              className="flex items-center gap-4 p-4 bg-[#1a3a2e] text-white hover:bg-[#234136] transition-colors"
            >
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Run Analysis</div>
                <div className="text-sm text-[#a3c4b5]">Open investigation</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/reports')}
              className="flex items-center gap-4 p-4 bg-[#1a3a2e] text-white hover:bg-[#234136] transition-colors"
            >
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                <FileBarChart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Generate Report</div>
                <div className="text-sm text-[#a3c4b5]">Create analysis</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{activity.action}</div>
                  <div className="text-sm text-gray-500 mt-1">{activity.detail}</div>
                </div>
                <div className="text-sm text-gray-400">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}