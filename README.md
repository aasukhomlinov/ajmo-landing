# ajmo.events — pre-launch landing

Static one-pager for the ajmo events app (Belgrade & Novi Sad). Design source of
truth: Figma "ajmo app" → page Landing Page → frame **Landing · D2** (321:2643);
scroll choreography spec: **D2 · Scroll Storyboard** (327:2842).

- Vite + TypeScript, no framework
- GSAP ScrollTrigger + Lenis (all motion behind `prefers-reduced-motion`)
- TikTok Sans variable (wght/wdth axes — display is wide+heavy per the DS)
- Routes: `/` (landing), `/privacy`, `/terms` (drafts pending owner placeholders)
- Deploy: Vercel static; domain ajmo.events (Namecheap DNS)

```sh
npm install
npm run dev
```

TODO before launch: waitlist backend (Supabase table + edge function), real
legal texts with filled placeholders, OG image + meta, favicon set, i18n
dictionaries (en/ru/sr).
