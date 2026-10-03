# iExcelo: Admin Panel

Internal dashboard for managing all aspects of the iExcelo platform. Built for the iExcelo ops team to control exam content, users, subscriptions, sponsorships, affiliates, and marketing campaigns.

## What it covers

- **Exam revision:** manage exam types, subjects, topics, passages, and questions (with a full rich-text/math editor powered by Plate.js)
- **Students:** view profiles, subscription status, exam history, and activity
- **Subscriptions:** browse and manage active/expired plans, plan prices, and payment provider mappings
- **Sponsors:** track sponsor accounts, givebacks, and student activations
- **Affiliates:** review referrals, commissions, payout accounts, and disburse payouts
- **Management:** admin roles, invites, and access control
- **Bulk emails:** compose and dispatch marketing campaigns with real-time delivery tracking
- **Analytics:** platform-wide usage and revenue charts
- **Testimonials:** moderate and publish student testimonials for the landing page

## Stack

- [Next.js 15](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Plate.js (rich text and math editor for question authoring)
- Recharts (analytics charts)

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the API URL and any required values.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
