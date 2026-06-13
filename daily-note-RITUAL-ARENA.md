
## 2026-06-13 — Sound Effects, Agent Profile, Theme Toggle, Footer

### Added:
1. **Sound Effects** — Web Audio API, no external files
   - `soundManager.battle()` — noise burst + sawtooth (sword clash)
   - `soundManager.victory()` — ascending C-E-G-C chord (triangle+sine)
   - `soundManager.defeat()` — descending minor chord (sawtooth)
   - `soundManager.mint()` — sparkle arpeggio (sine)
   - `soundManager.click()` — 880Hz blip
   - Mute toggle in navbar (Volume2/VolumeX icons)
   - Triggers: battle start, battle result, mint, click

2. **Agent Profile Page** (`activeView: 'profile'`)
   - Click any agent card → profile view
   - Large avatar with glow, X handle link, BOSS badge
   - Stats grid: Power, Wins, Losses, Win Rate
   - SVG donut chart for win rate visualization
   - Battle history list (last 20 battles)
   - "Enter Arena" button for own agents
   - Back button to return to previous view

3. **Dark/Light Theme Toggle**
   - CSS variables in globals.css: `[data-theme="dark"]` / `[data-theme="light"]`
   - 14 CSS variables: --arena-bg, --arena-card, --arena-border, --arena-text, etc.
   - Smooth 0.5s transitions on theme change
   - Sun/Moon toggle in navbar
   - AnimatedBackground + Navbar use CSS variables

4. **Footer**
   - "Crafted by Thalassa" with X icon SVG
   - Links to https://x.com/ohmythalassa
   - Separated by emerald line decorators
   - Shows on all views except profile

### Files:
- app/globals.css — theme CSS variables
- app/page.tsx — all components + sound system

### Pushed: 348e984
