Design system, game flow, user preferences, and architecture decisions for HELVE app

## Design System
- Font: Instrument Serif (headings), system-ui (body)
- Colors: Parchment bg (40 33% 96%), forest green primary (145 58% 36%), amber accent (38 92% 50%)
- Cards: rounded-3xl, no borders, layered shadows
- Animations: framer-motion for all transitions

## Architecture
- Auth: Google OAuth via Lovable Cloud (@lovable.dev/cloud-auth-js)
- DB: user_progress table stores risk profile, portfolio, game step, onboarding status
- Auto-create progress row on signup via trigger
- First screen: /auth (Google login), then onboarding for new users, /panel for returning
- Step-based state machine in GameFlow component
- Coach AI has tool calling: add_investment, remove_investment, get_portfolio_summary

## Key Decisions
- Garden/tree metaphor throughout
- Duolingo-style one-action-per-screen
- No dashboards, no complex finance UI
- Mobile-first layout
- Coach can execute portfolio actions via tool calling, not just recommendations
