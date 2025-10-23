# Technical Documentation: Configuration, Build, and Deployment

## 1. Overview

This document outlines the foundational setup, code quality tooling, and the end-to-end deployment pipeline for the BV-Beni Watches project. The core philosophy was to establish a robust and maintainable development environment from the start, leading to a smooth and reliable production deployment.

## 2. Initial Project Configuration

- **Foundation (Commits `902cbb0`, `34a7c48`):** The project was initiated using `create-next-app`, which provided a solid starting point with React, TypeScript, and Next.js. The very first commit after this established the complete base structure, including initial configurations for ESLint, Prettier, and Tailwind CSS.

## 3. Code Quality and Tooling

A proactive approach to code quality was implemented using ESLint to ensure consistency and prevent bugs before they reached production.

- **Strict Rule Enforcement:** The development process included dedicated phases to fix all existing linting and type errors (Commit `808db77`), which was a critical prerequisite for achieving a successful production build.
- **Targeted Fixes:** Specific linting issues, such as unused imports (Commit `e08fe0f`), were addressed as they arose.
- **Configuration Tuning (Commit `11c6c4f`):** The ESLint configuration was customized to ignore unused variables that are intentionally prefixed with an underscore (`_`). This is a common convention that allows for cleaner code when function arguments or variables are not needed, without triggering linting errors.

## 4. Build and Deployment Pipeline

The application is deployed with a modern, decoupled architecture: a frontend on Vercel and a backend on Render.

- **Backend Deployment (Strapi on Render):** The Strapi CMS, which serves all product and image data, is deployed on the Render platform.

- **Frontend Deployment (Next.js on Vercel):** The main e-commerce application is deployed on Vercel, leveraging its seamless integration with Next.js for optimal performance and continuous deployment.

- **Connecting the Services (Commit `10051e7`):** The link between the frontend and backend is managed securely and flexibly using environment variables. The `STRAPI_API_URL` and `NEXT_PUBLIC_STRAPI_API_URL` variables were updated to point to the live Render URL, officially connecting the Vercel deployment to the production API.

- **Next.js Configuration for Production (Commit `b5d95f6`):** The `next.config.js` file was modified to allow image optimization for external domains. The hostnames for the Cloudinary CDN and the Render backend were added to the `images.remotePatterns` configuration, ensuring that product images load correctly and efficiently in the production environment.

## 5. Environment Variables Configuration

The application uses environment variables to manage sensitive data and configuration across different environments (development, test, production).

### Required Environment Variables

#### Strapi CMS API
- **`NEXT_PUBLIC_STRAPI_API_URL`**: The URL of the Strapi backend
  - Development: `http://localhost:1337`
  - Production: Your deployed Strapi URL (e.g., on Render)

#### Stripe Payment Gateway ([PAY-04])
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**: Stripe public key (safe to expose)
  - Development: Use test keys (format: `pk_test_...`)
  - Production: Use live keys (format: `pk_live_...`)
  - Validation: The app automatically validates the key format and ensures test keys are used in development

- **`STRIPE_SECRET_KEY`**: Stripe secret key (server-side only, never exposed to browser)
  - Development: Use test keys (format: `sk_test_...`)
  - Production: Use live keys (format: `sk_live_...`)
  - **IMPORTANT**: This variable must NEVER have the `NEXT_PUBLIC_` prefix

### Security Best Practices

1. **Environment Separation**: Always use test keys (`pk_test_*`, `sk_test_*`) in development
2. **Git Security**: All `.env*` files are ignored by Git (configured in `.gitignore`)
3. **Key Validation**: The `src/lib/stripe/config.ts` module validates:
   - Key format is correct (`pk_test_*` or `pk_live_*`)
   - Development environment only uses test keys
   - Keys are properly configured before use
4. **Documentation**: All required variables are documented in `.env.example`

### Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Fill in your actual API keys and URLs
3. Never commit `.env.local` to version control
4. For production deployment, configure environment variables in your hosting platform (Vercel, etc.)
