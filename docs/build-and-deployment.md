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
