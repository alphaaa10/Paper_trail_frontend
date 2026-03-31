
  # Research Intelligence Dashboard UI

  This is a code bundle for Research Intelligence Dashboard UI. The original project is available at https://www.figma.com/design/GQCRBFw6R1O4JeChsi8GNy/Research-Intelligence-Dashboard-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Council API Frontend Mapping

  - `GET /report` is consumed by `api.fetchFinalReport()`.
  - Report page maps:
    - `report.executive_summary` for plain summary text.
    - `report.executive_summary_markdown` for readable markdown rendering.
    - `report.executive_summary_json` for collapsible JSON inspection.
    - KPI counters from `papers_considered`, `unanswered_question_count`, `decision_topic_count`, `contradicting_paper_count`, `recent_works_count`.
    - Section lists from `individual_paper_summaries`, `cross_paper_analysis`, `critical_insights`.
  - `POST /feature/heatmap` is now consumed by `api.generateKnowledgeGraph()`.
  - Knowledge Graph page maps:
    - Graph canvas directly from `reactflow_graph.nodes` and `reactflow_graph.edges`.
    - Side tables from `knowledge_graph.nodes` and `knowledge_graph.edges`.
    - Conflict highlighting for edges whose label/relationship contains `CONTRADICTS`.
    - Saved output paths from `saved_files`.
  