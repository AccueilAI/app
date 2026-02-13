# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AccueilAI is an AI-powered administrative assistant for expats in France. This repo is the web application — currently in Phase 0 (landing page + waitlist for demand validation).

**Goal**: Fake Door Test — Waitlist 200+ signups, 15%+ conversion, Lighthouse 90+.

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build (validates TypeScript)
pnpm lint         # ESLint check
pnpm dlx shadcn@latest add <component>  # Add shadcn/ui component
```

No test framework is configured yet. `pnpm build` is the primary validation — it catches TypeScript errors and generates static pages for all locales.

## Tech Stack (2026 Stable)

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.x |
| React | React 19 (RSC) | 19.x |
| Styling | Tailwind CSS v4 + shadcn/ui (New York, neutral) | 4.x |
| i18n | next-intl | 4.x |
| Icons | lucide-react | latest |
| Package Manager | pnpm | 10.x |
| TypeScript | strict mode | 5.x |

**Planned (not yet connected):** Supabase (DB), Resend (email), PostHog (analytics), Vercel (deploy).

## Architecture

### Routing: Locale-prefixed App Router

All pages live under `app/[locale]/`. The middleware (`middleware.ts`) handles locale detection and redirect via next-intl. Supported locales: `en`, `fr`, `ko` (default: `en`).

```
app/[locale]/layout.tsx   ← Root layout: fonts, NextIntlClientProvider, html lang
app/[locale]/page.tsx     ← Landing page: composes Navbar + section components
app/api/waitlist/route.ts ← API route (outside locale segment)
```

### i18n Flow

1. `i18n/routing.ts` — `defineRouting({ locales, defaultLocale })`
2. `i18n/request.ts` — `getRequestConfig` loads messages from `messages/{locale}.json`
3. `middleware.ts` — locale redirect middleware
4. `next.config.ts` — `createNextIntlPlugin()` wraps config

Translation files are in `messages/`. Keys are namespaced by component (e.g., `Hero.headline`, `Navbar.cta`). Every user-facing string must go through `useTranslations()` (client) or `getTranslations()` (server).

### Component Organization

- `components/landing/` — Landing page sections (Hero, PainPoints, HowItWorks, Features, Pricing, WaitlistForm, FAQ, Footer). Most are Server Components; use `'use client'` only when needed (e.g., Navbar with locale switcher).
- `components/ui/` — shadcn/ui primitives. Do not edit directly; add new ones via `pnpm dlx shadcn@latest add`.
- `lib/` — Utilities and service clients (supabase, resend, posthog — currently placeholders).

### Styling Conventions

- Tailwind v4 with CSS variables defined in `app/globals.css` (oklch color space)
- shadcn/ui New York style with neutral base color
- Design aesthetic: Linear/Notion/Stripe-inspired — clean, trust-oriented
- Color accent: blue-600 (trust) + French flag tricolor accent
- Mobile-first responsive (`sm:`, `md:` breakpoints)
- Prettier auto-sorts Tailwind classes via `prettier-plugin-tailwindcss`

### Server vs Client Components

Default to Server Components. Only add `'use client'` when the component uses browser APIs, React hooks (useState, useEffect), or event handlers. The Navbar is client-side (locale switcher uses `useRouter`). Hero and other landing sections are server components using `useTranslations` (which works in both RSC and client).

## Key Patterns

**Adding a new landing section:**
1. Create `components/landing/SectionName.tsx`
2. Add translation keys to all three `messages/{locale}.json` files under a new namespace
3. Import and compose in `app/[locale]/page.tsx`

**Adding a new locale:** Update `i18n/routing.ts` locales array + add `messages/{locale}.json`.

**Layout params are async:** In Next.js 16, `params` is a `Promise`. Always `await params` before using.

## External Documentation References

When working with external APIs or tools, always check the official documentation first via `WebFetch` — do not rely on training data alone.

| Domain | Documentation URL | When to check |
|--------|------------------|---------------|
| **OpenAI API** | https://developers.openai.com/api/docs | Embeddings, Responses API, GPT-5.2, RAG, structured output, tool use |
| **Claude Code** | https://code.claude.com/docs | Claude Code features, hooks, MCP servers, settings, slash commands |
| **Claude Code Teams** | https://code.claude.com/docs/en/agent-teams | TeamCreate, SendMessage, task delegation, multi-agent orchestration |

## Agent & Skill Usage Guidelines

Use Context7 MCP (`--c7`) to look up latest docs for next-intl, shadcn/ui, Next.js 16, and Tailwind v4 before implementing unfamiliar patterns. These libraries move fast — do not rely on training data alone.

### Recommended Skills

- **`frontend-design`** — For landing page sections: use this skill to produce polished, distinctive UI that avoids generic AI aesthetics.
- **`next-best-practices`** — RSC boundaries, async APIs, metadata, route handlers.
- **`tailwind-design-system`** — Design tokens, responsive patterns, component styling.
- **`clean-code`** — Enforce concise, no-over-engineering code style.
- **`vercel-react-best-practices`** — React 19 performance patterns.
- **`email-best-practices`** — When implementing Resend integration (Phase 4).
- **`supabase-postgres-best-practices`** — When implementing Waitlist API (Phase 4).
- **`sc:build`**, **`sc:analyze`**, **`sc:implement`** — For structured development workflows.
- **`writing-plans`** — Before multi-step implementation tasks, write a plan first.
- **`feature-dev:feature-dev`** — For guided feature development with codebase understanding.

### Recommended Sub-Agents

- **`voltagent-lang:nextjs-developer`** — Next.js 16 App Router, server components, server actions.
- **`voltagent-lang:typescript-pro`** — Advanced TypeScript patterns, type safety.
- **`voltagent-lang:react-specialist`** — React 19 hooks, performance, component architecture.
- **`voltagent-core-dev:frontend-developer`** — UI engineering, component design, accessibility.
- **`voltagent-core-dev:ui-designer`** — Visual design, interaction patterns, design systems.
- **`feature-dev:code-reviewer`** — Code review for bugs, quality, and convention adherence.
- **`feature-dev:code-architect`** — Feature architecture blueprints.

### When to Use Teams

Use `TeamCreate` for parallelizable multi-step work:
- **Building multiple landing sections simultaneously** — Spawn separate agents for each section (PainPoints, HowItWorks, Features, etc.) since they're independent components with no shared state.
- **i18n + UI in parallel** — One agent writes component UI, another prepares translations for all three locales.
- **API + Frontend** — When implementing the waitlist flow, one agent builds the API route + Supabase integration while another builds the WaitlistForm component.
- **Cross-cutting tasks** — SEO meta tags, analytics instrumentation, and performance optimization can each be delegated to specialized agents working concurrently.

Do NOT use teams for sequential work or single-file edits where coordination overhead exceeds the benefit.

## Implementation Phases (Roadmap)

Current: **Phase 0, Step 1** (project skeleton + Hero) — DONE.

- Step 2: PainPoints + HowItWorks + Features sections
- Step 3: Pricing + WaitlistForm + FAQ + Footer sections
- Step 4: Waitlist API (Supabase + Resend)
- Step 5: SEO + Analytics (PostHog, OG tags, sitemap)
- Step 6: Vercel deploy + Lighthouse optimization
