Updated: now

i18n setup with react-i18next, English default + Spanish. Language switcher on Panel header.

## i18n
- Library: react-i18next + i18next-browser-languagedetector
- Files: src/i18n/en.ts, src/i18n/es.ts, src/i18n/index.ts
- Language stored in localStorage as "helve_lang"
- Switcher component: src/components/LanguageSwitcher.tsx
- Default: English, with full Spanish translation

## Design System
- Font: Instrument Serif (headings), system-ui (body)
- Colors: Parchment bg (40 33% 96%), forest green primary (145 58% 36%), amber accent (38 92% 50%)
- Cards: rounded-3xl, no borders, layered shadows
- Animations: framer-motion for all transitions

## Architecture
- Step-based state machine in GameFlow component
- All game state local (no backend)
- Screens: Welcome → Risk Profiling (3) → Profile Result → Portfolio Builder → Market Event → Simulation → Learning → Loop

## Key Decisions
- Garden/tree metaphor throughout
- Duolingo-style one-action-per-screen
- No dashboards, no complex finance UI
- Mobile-first layout
