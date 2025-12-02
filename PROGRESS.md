## ASTAR Progress Log

### Current Focus
- Phase 2 (Intelligence) is complete: Canvas auto-context, MCP action suggestions, richer steps/resources, and chat-style manual intake are live.
- Frontend and backend both run via `npm run dev`; AI journeys use NVIDIA NIM with Canvas context and MCP heuristics.

### Recent Highlights
1. Canvas course context fetched automatically and shown in-app.
2. AI journey prompt now generates actionable HOW/WHY guidance plus AI-curated resources with previews.
3. MCP quick actions (e.g., GitHub repo creation) appear on relevant steps and call the new `/api/mcp/execute` endpoint.
4. Manual assignment form replaced with a conversational intake parser that auto-triggers analysis.
5. Repository cleanup: consolidated docs, refreshed dependencies, ensured `node_modules` stay ignored.

### Next Priorities
- Polish UX around follow-up questions in the intake chat (e.g., better visuals / quick replies).
- Expand MCP heuristics (Google Docs, Notion) and add result tracking for executed actions.
- Continue testing AI resource recommendations across assignment types; tune prompts as needed.
- Prep for Phase 3 scope (study plans, spaced repetition, mobile responsiveness) once current demos are stable.

