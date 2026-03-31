import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { DataStudio } from './pages/DataStudio';
import { Investigation } from './pages/Investigation';
import { GraphAnalysis } from './pages/GraphAnalysis';
import { Reports } from './pages/Reports';
import { AIAssistant } from './pages/AIAssistant';
import { BrowseResearch } from './pages/BrowseResearch';
import { CrawlVisual } from './pages/CrawlVisual';
import { Timeline } from './pages/Timeline';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'data-studio', Component: DataStudio },
      { path: 'investigation', Component: Investigation },
      { path: 'graph-analysis', Component: GraphAnalysis },
      { path: 'reports', Component: Reports },
      { path: 'ai-assistant', Component: AIAssistant },
      { path: 'browse-research', Component: BrowseResearch },
      { path: 'crawl-visual', Component: CrawlVisual },
      { path: 'timeline', Component: Timeline },
    ],
  },
]);
