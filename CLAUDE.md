# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |

---

## Project: Fleet Management Platform

A B2B electric vehicle fleet management platform built with React + Vite + Supabase. Focuses on battery management, rider assignments, and vehicle tracking for EV rental services.

## Commands

```bash
npm run dev          # Start dev server on port 8082
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Battery/Database scripts (run against Supabase)
npm run setup:batteries    # Setup batteries table
npm run verify:batteries   # Verify batteries table
npm run test:batteries-validation  # Test battery validation
npm run test:battery-events        # Test battery events
npm run test:vehicles-battery      # Test vehicle-battery mapping
npm run test:map-battery           # Test map battery RPC
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State**: TanStack Query (React Query)
- **Testing**: Vitest + Testing Library

## Architecture

```text
src/
├── components/       # UI components (shadcn/ui based)
├── hooks/           # React Query hooks for data fetching
├── integrations/
│   └── supabase/    # Supabase client & generated types
├── lib/
│   ├── batteries/   # Battery domain logic
│   ├── riders/      # Rider domain logic
│   ├── vehicles/    # Vehicle domain logic
│   └── import/      # ERP-grade CSV import system
├── types/           # TypeScript types (historical, import)
├── pages/           # Page components
└── __tests__/       # Vitest tests (mirrors src structure)
```

### Key Patterns

1. **Domain-Driven Structure**: Code organized by business domain (vehicles, riders, batteries) in `src/lib/`
2. **React Query Hooks**: All data fetching via hooks in `src/hooks/` (e.g., `useVehicles.ts`, `useBatteries.ts`)
3. **Supabase Client**: Import from `@/integrations/supabase/client` — never create new clients
4. **Event Sourcing**: All entity changes logged via `*_events` tables for audit trail
5. **Historical Data**: Point-in-time queries with confidence scores (see `src/types/historical.ts`)

### Database Conventions

- Tables: `vehicles`, `riders`, `batteries`, `payments`, `vehicle_events`, `rider_events`
- RLS (Row Level Security) enabled on all tables
- RPC functions for complex operations (e.g., `map_battery_to_vehicle`)

### Dual-Table Architecture

The system uses dual ledger/payment tables:
- **UI Layer (source of truth)**: `rider_ledgers` + `payments`
- **RPC Layer (synced)**: `rental_ledgers` + `rental_payments`
- Database triggers automatically sync from source to target
- Bulk operations use dual-write pattern for consistency

See `openspec/changes/fix-retroactive-payments/sync-trigger-architecture.md` for details.

## Payment Generation Behavior

### Retroactive Ledger Creation

When creating a ledger with a past start date:
- **Past payments** (due_date < today) → status: `overdue`
- **Current payment** (first due_date >= today) → status: `pending`
- **6-month limit**: Only generates payments up to 6 months in the past

Example: Creating a weekly ledger on March 26 with start date January 18:
- Generates ~10 weekly payments (6 weeks past + 4 weeks buffer)
- First 6 payments: status `overdue`
- Remaining payments: status `pending`

### Ledger Reactivation (Gap Period Payments)

When reactivating a paused ledger:
- **Gap payments** generated between `paused_at` and new `start_date` → status: `overdue`
- **6 future payments** generated from new start date → status: `pending`
- Existing pending payments are deleted before regeneration

Example: Paused on January 1, reactivated on February 1:
- Generates 4 weekly gap payments (Jan 1 to Feb 1) → `overdue`
- Generates 6 future payments from Feb 1 → `pending`

### Payment ID Generation

- Format: `P###` (e.g., `P001`, `P002`, ...)
- Sequential numbering with zero-padding
- Retry logic (3 attempts) for UNIQUE constraint violations
- Handles concurrent ledger creation safely

See `openspec/changes/fix-retroactive-payments/payment-id-generation.md` for details.

## Testing

- Unit tests: `vitest` with jsdom environment
- Test files: `src/__tests__/` mirroring source structure, or `tests/` for integration tests
- Setup file: `src/test/setup.ts`
- Run tests: `npx vitest run` or `npx vitest watch`

## Important Files

- `TECH_ARCHITECTURE.md` — Detailed system architecture documentation
- `src/integrations/supabase/types.ts` — Generated database types
- `src/types/historical.ts` — Historical data & confidence scoring types
