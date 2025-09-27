# Technical Documentation: API Integration and Dynamic Content Module

## 1. Overview

This module represents the complete transition of the e-commerce application from a static prototype with mock data to a fully dynamic, production-ready platform. It handles all aspects of communication with the headless CMS (Strapi), including data fetching, transformation, type safety, and image handling. The frontend is deployed on Vercel and the backend on Render.

## 2. Architecture and Key Patterns

The integration with the Strapi API was designed with three core principles in mind: robustness, maintainability, and scalability.

- **Centralized API Service (`lib/api.ts`):** Instead of scattering `fetch` calls across components, all API interactions are centralized in a single service. This makes the code DRY (Don't Repeat Yourself) and simplifies future updates to API endpoints or headers.

- **Data Transformation Layer:** A crucial architectural decision was to implement a transformation layer. This layer acts as an adapter between the raw, sometimes inconsistent, data structure of the Strapi API response and the clean, predictable `Product` type used throughout the frontend. This pattern is defensive by design, handling potential null values or variations in the API response (e.g., `image` vs. `images`) and providing fallbacks to prevent runtime errors.

- **Single Source of Truth for Types (`types/index.ts`):** All data structures, both for the raw API response and the transformed frontend types, are centralized. This ensures type safety across the entire application and makes development more predictable.

- **Polymorphic `ProductCard` Component:** The `ProductCard` was refactored to be polymorphic, meaning it can accept either a complete `product` object or individual loose props. This was a critical step during the transition from mock data to live data, making the component highly flexible and reusable.

## 3. Development History and Key Decisions

The module was developed in a series of strategic phases, moving from initial connection to full production deployment.

- **Phase 1: Foundation and Robust Fetching (Commits `7079133`, `c366489`)**: The initial work focused on establishing a secure and scalable connection to the Strapi API. The core `lib/api.ts` service and the data transformation layer were created. This phase replaced mock data on the homepage and product listing page with live, transformed data.

- **Phase 2: Full Integration & Breaking Change (Commit `7aa9948`)**: This was a pivotal moment. A **breaking change** was introduced to completely remove all local mock data files and update the `ProductCard` to require a `product` prop. This enforced the "live data first" paradigm across the entire catalog and finalized the integration.

- **Phase 3: Image Handling & Configuration (Commits `b5d95f6`, `30501e5`, `6624775`)**: With data flowing, the focus shifted to media. The Next.js config was updated to whitelist image domains from Cloudinary and Render. A bug was fixed where image URLs were being incorrectly prefixed, ensuring that both local and external images rendered correctly. Unused images were also cleaned up.

- **Phase 4: Production Deployment (Commit `10051e7`)**: The final step was to connect the deployed Vercel frontend to the live Render backend. This was achieved by updating the environment variables (`STRAPI_API_URL`) to point to the production API endpoint, completing the end-to-end deployment of the catalog feature.

- **Phase 5: Bug Fixes and Final Polish (Commit `2666b98`)**: After deployment, a series of bugs related to image loading (404s) and SSR hydration in the `AuthContext` were resolved. Fallback images were added for products without media, making the UI more resilient.
