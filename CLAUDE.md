# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce platform for a family watch business (25+ years). Built with Next.js 15 App Router + React 19 frontend, Strapi headless CMS backend, Stripe payments, and Resend email notifications.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run email:dev        # Email template preview (port 3001)
npm run storybook        # Launch Storybook UI (port 6006)

# Testing
npm test                 # Run unit tests once
npm run test:watch       # Watch mode
npm run test:ui          # Interactive Vitest UI
npm run test:coverage    # Generate coverage report
npm run test:storybook   # Storybook component tests

# Build & Quality
npm run build            # Production build
npm run lint             # ESLint
npm run format           # Prettier (writes changes)
```

## Architecture

### App Structure (Next.js App Router)
- **Route Groups**: `(auth)` for login/register pages with isolated layout
- **API Routes**: `/api/` handles Stripe payment intents, order creation, email sending
- **Dynamic Routes**: `/tienda/[slug]` for product details

### Key Directories
- `src/app/` - Pages and API routes
- `src/components/` - Reusable UI components
- `src/context/` - React Context providers (Cart, Auth, Favorites)
- `src/lib/api.ts` - Centralized Strapi API service
- `src/lib/stripe/` - Stripe utilities
- `src/emails/` - React Email templates
- `src/types/index.ts` - Single source of truth for TypeScript types

### State Management
React Context API for global state (no Redux). Three main contexts:
- `CartContext` - Shopping cart persistence
- `AuthContext` - User authentication with Strapi
- `FavoritesContext` - Wishlist management

### External Services
- **Strapi CMS** (Render): Data storage, media, API
- **Cloudinary**: Image CDN (via Strapi)
- **Stripe**: Payment processing
- **Resend**: Transactional emails

## Code Style

- **No semicolons**, single quotes, trailing commas ES5
- Path alias: `@/*` maps to `./src/*`
- Unused variables can use `_` prefix to suppress lint errors
- Strict TypeScript enabled
- Server/Client component separation: explicit `'use client'` directive

## Testing

Two Vitest projects configured:
1. **Unit tests** (`npm test`): jsdom environment for component/logic tests
2. **Storybook tests** (`npm run test:storybook`): Playwright browser testing

Test files location: `src/__tests__/` or `__tests__/` folders adjacent to tested code.

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_STRAPI_API_URL` - Strapi backend URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `RESEND_API_KEY` - Email service key
- `RESEND_FROM_EMAIL` - Sender email address

## Documentation

Detailed docs in `/docs/`:
- `requirements.md` - User stories and acceptance criteria
- `email-system.md` - Email architecture
- `CHALLENGES.md` - Solved problems and architectural decisions
