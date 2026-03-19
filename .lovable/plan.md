

# HELVE — Gamified Investment Learning Experience

## Overview
A mobile-first, game-like web app that teaches investing through simple decisions and visual feedback. No dashboards, no jargon — just a garden metaphor where your money grows like a tree.

## Screens & Flow

### 1. Welcome Screen
- Centered "HELVE" title in Instrument Serif, subtitle "Learn investing by doing"
- Single "Plant Your First Seed" button
- Soft parchment background, breathing animation on a small tree illustration (CSS/SVG)

### 2. Risk Profiling (3 scenario screens)
- Progress bar at top (thin green line)
- One scenario per screen with 3 large tappable cards
- Scenarios: market drop, time horizon, risk comfort
- Cards have subtle scale animations on tap, green/amber/neutral tints
- No wrong answers — each builds a risk profile score

### 3. Profile Result
- Animated reveal: "You are Balanced 🌿" (or Conservative/Growth)
- One-line description in friendly language
- "Continue to Your Garden" button

### 4. Portfolio Builder
- 3 large rounded cards: Safe (🛡️), Balanced (🌿), Growth (🌳)
- Tap to allocate — simple distribution (e.g., pick 3 slots)
- Risk bar and Growth bar shown as minimal colored lines
- Real-time feedback toasts: "Good balance", "This adds more risk"

### 5. Market Storm Event
- Screen dims, tree SVG shakes/loses leaves
- Prompt: "A storm hits. What do you do?"
- Two options: "Stay calm" / "Sell everything"
- If they stay: tree recovers and grows larger
- If they sell: tree stays small, gentle learning message

### 6. Time Simulation
- "Simulate 5 Years" button
- Tree grows with scale animation
- Simple result: "100 → 112" vs "Did nothing → 100"
- No charts — just the tree size and a number

### 7. Learning Moment
- One clear insight card based on their choices
- Friendly, human language
- Examples: "Patience helped your garden grow", "Risk brought bigger rewards — and bigger storms"

### 8. Loop / Replay
- "Try Again" and "Adjust Your Garden" buttons
- Encourages experimentation with different strategies

## Design System
- **Fonts**: Instrument Serif (headings), Geist/Inter (body)
- **Colors**: Parchment white bg, deep forest green text, vibrant green primary, amber accents
- **Cards**: rounded-3xl, layered shadows, no borders
- **Motion**: Framer Motion for entrances (fade+slide), card interactions (scale), tree growth pulses
- **Layout**: Mobile-first, no scroll per screen, thumb-friendly bottom actions

## Technical Approach
- React + TypeScript + Tailwind
- Framer Motion for animations
- Local state management (no backend needed — all simulation logic client-side)
- SVG tree component that responds to portfolio state
- Step-based flow with React state machine pattern

