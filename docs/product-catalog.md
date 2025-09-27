# Technical Documentation: Product Catalog Module

## 1. Overview

The Product Catalog module forms the core browsing experience of the BV-Beni Watches e-commerce platform. It is responsible for displaying products, allowing users to inspect them in detail, and providing tools to organize the catalog view. The module is designed with performance and modern web practices in mind, heavily leveraging the Next.js App Router capabilities.

## 2. Architecture and Data Flow

The architecture of this module is defined by a clear separation of concerns, primarily using a hybrid approach of Server and Client Components to optimize performance and interactivity.

### Separation of Concerns: Server vs. Client Components

A key architectural decision was to split the product detail page into two distinct parts:

1.  **Server Component (`/tienda/[id]/page.tsx`):** Its sole responsibility is to fetch data. It receives the dynamic `id` from the URL, retrieves the corresponding product information from the data source, and handles the `not-found` state if the product doesn't exist. This ensures the initial page load is extremely fast and SEO-friendly.
2.  **Client Component (`ProductDetailClient.tsx`):** This component receives the fetched data as props and manages all client-side state and user interactions, such as the image gallery selection and the quantity counter. This pattern avoids sending unnecessary JavaScript to the client and prevents client-side hydration issues.

### User Flow

1.  The user navigates to `/tienda`, where `tienda/page.tsx` fetches and renders the complete list of products in a grid.
2.  The user can use the `ShopLoopHead` component to apply a sorting order (e.g., by price). The page state updates and re-renders the sorted product list.
3.  The user clicks on a `ProductCard`, which navigates them to a dynamic route like `/tienda/g-shock-ga-2100`.
4.  The Server Component at `/tienda/[id]/page.tsx` fetches the data for "g-shock-ga-2100".
5.  The fetched data is passed to `ProductDetailClient.tsx`, which renders the interactive elements for the user.

## 3. Key Components and Files

- **`/tienda/page.tsx`**: The main product listing page (shop). It fetches the entire product list and manages the state for sorting.
- **`/tienda/[id]/page.tsx`**: The dynamic Server Component for the product detail page. Handles data fetching and error states.
- **`ProductDetailClient.tsx`**: The Client Component that handles all user interactions on the detail page, including the image gallery and quantity selector.
- **`ProductCard.tsx`**: A crucial UI component used on the listing page. It was refactored from a text-based design to a modern, icon-driven action bar for a cleaner user experience.
- **`ShopLoopHead.tsx`**: A reusable component placed at the top of the shop page. It contains the sorting dropdown, breadcrumbs, and a display for the total product count.

## 4. Development History and Key Decisions

- **Foundation (Commit `1269b93`):** The initial development established the product listing page at `/tienda`. A major decision at this stage was the complete redesign of the `ProductCard` to improve aesthetics and usability.
- **Dynamic Detail Page (Commit `5a30f18`):** This phase focused on building the individual product pages. The most significant architectural decision was the separation into Server (data fetching) and Client (interactivity) Components, which aligns with Next.js best practices.
- **Refinement and Features (Commit `5b9ff8b`):** With the core structure in place, the focus shifted to adding features and improving stability. The product sorting functionality was implemented. During this process, several critical bugs related to incorrect image paths and prop mismatches on the detail page were identified and resolved, ensuring the feature was production-ready.
