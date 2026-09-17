# Ghaziabad Times (गाज़ियाबाद टाइम्स) — PRD

## Original Problem Statement
Fully responsive modern Hindi News Portal with automated RSS aggregation (15+ sources), AI-powered Hindi content rewriting, image watermarking, strict copyright/legal compliance, categories, state & district pages, Delhi NCR page, admin approval workflow, social links, and an advertise-with-us payment option.

## User Choices
- Name: Ghaziabad Times
- AI model: Gemini 3 Flash (`gemini-3-flash-preview`) via Emergent Universal Key
- News: Real RSS feeds → admin approval workflow before going live
- Watermark (Pillow) + AI image generation (Gemini Nano Banana)
- Everything in MVP; dark mode; social links; advertise with payment

## Architecture
- Backend: FastAPI + MongoDB (motor), all routes under `/api`. JWT admin auth (Bearer, token in localStorage).
- Frontend: React + Tailwind + shadcn, react-router, framer-motion, sonner. Theme via ThemeContext (light/dark).
- Media: watermarked images saved to `/app/backend/uploads`, served at `/api/uploads`.
- Integrations: emergentintegrations LlmChat (Gemini text rewrite + Nano Banana image gen), Pillow watermark, feedparser RSS.

## Personas
- Reader: browses Hindi news by category / state / district / NCR, reads articles.
- Editor/Admin: aggregates RSS, AI-rewrites, watermarks, approves/publishes or rejects.
- Advertiser: browses ad packages and submits a booking inquiry.

## Implemented (2026-06)
- Public: home (hero bento + category sections), live ticker, category pages, state pages with UP district tabs + special-coverage note, Delhi NCR combined page, article detail with related + share + AI/watermark badges, search, disclaimer/terms with jurisdiction clause, footer social links, advertise page (4 packages + booking form), dark/light + mobile menu.
- Admin: JWT login, dashboard stats, RSS aggregate button, pending/published/rejected tabs, split-pane workspace (original vs AI-rewritten), AI rewrite (Gemini, preserves numbers), Pillow watermark, AI image gen (lifestyle), publish (breaking toggle), reject.
- Backend: /api/articles (+filters category/region/district/ncr/breaking/q), /api/ticker, /api/articles/{id}, /api/ad-packages, /api/ad-inquiry, auth login/me, admin aggregate/articles/rewrite/watermark/generate-image/publish/reject/stats. 12 seed published articles + admin seeded.
- Verified: 100% backend (20/20) + 100% frontend via testing agent.

## MOCKED / Not Live
- Advertise payment is a booking INQUIRY only (no live gateway). Stripe claimable sandbox is unavailable for India (`country_not_supported`); real payment needs the user's own Stripe key or Razorpay.
- Social media links point to platform homepages (placeholders), not connected accounts / auto-posting.

## Backlog
- P1: Real payment for ads (Razorpay India or user's own Stripe key).
- P1: Social auto-publish (post news/video to YouTube/FB/Insta and reflect on site) — requires OAuth + each platform's API.
- P2: httpOnly cookie auth + brute-force lockout; background/streaming aggregation; scheduled auto-aggregation cron.
- P2: e-Paper, weather API, editor roles, article editing UI.
