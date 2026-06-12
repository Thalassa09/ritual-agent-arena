# Daily Note - Ritual Agent Arena

**Tanggal:** 2026-06-12
**Action:** Fixed Vercel deployment
**Detail:** 
- Added webpack fallback in next.config.ts (fs, net, tls)
- Ensured all browser-only code is inside 'use client'
- Contract integration already correct (ethers + window.ethereum)