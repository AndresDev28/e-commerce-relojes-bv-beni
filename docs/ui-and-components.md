# Technical Documentation: UI, Layout & Component Library

## 1. Overview and Philosophy

The user interface of BV-Beni Watches is built following a **Component-Driven Development (CDD)** methodology. The primary goal is to create a library of reusable, well-documented, and independently testable UI components that ensure visual and functional consistency throughout the application.

**Storybook** was integrated from the very beginning to serve as the single source of truth for the component library. It allows for developing and visualizing components in isolation, documenting their variants, and testing their different states.

## 2. Core Structure and Layout

The project was founded on a well-defined structure and configuration from its inception.

- **Initial Setup (Commit `34a7c48`):** The foundational commit established the entire project structure, including the initial configuration for Next.js, TypeScript, Tailwind CSS, and ESLint. It also included the creation of the base layout components like the `Navbar` and `Footer`, defining the main visual skeleton of the application.

- **Code Quality and Linting:** A strict ESLint configuration was implemented to enforce code quality. Key decisions include:
  - Resolving all initial linting and type errors to ensure a clean and successful deployment build (Commit `808db77`).
  - Configuring ESLint to ignore unused variables that are intentionally prefixed with an underscore (`_`), a common practice to signal that a variable is unused by design (Commit `11c6c4f`).

## 3. Component Library

The library consists of several core, reusable components:

- **`Button` Component (Commit `6c09e55`):**
  - **Description:** The first component added to the library, serving as the primary interactive element.
  - **Features:** Implemented with `primary` and `secondary` variants to handle different levels of visual hierarchy.
  - **Documentation:** Fully integrated with Storybook, with stories created to document and test its variants.

- **`Input` and `Spinner` Components (Commit `e58bf5f`):**
  - **Description:** Expanded the library with essential components for forms and loading states.
  - **Features:**
    - The `Input` component was designed to be reusable, supporting different visual variants and error states.
    - The `Spinner` component was created with multiple sizes and colors, and its animation was configured in `tailwind.config.js`.
  - **Documentation:** Both components were integrated with Storybook, with dedicated stories for each.

- **`ProductCard` Component (Commit `7aa9948`):**
  - **Description:** While part of the catalog, this component is a cornerstone of the UI library.
  - **Refactor:** A major refactoring was performed to make the component **polymorphic**, allowing it to accept a full `product` object or individual props. This was a critical decision to support both mock data during early development and live API data later on.

## 4. Page Structure

- **Placeholder Pages:** Placeholder pages, such as for the `/checkout` route (Commit `01590fe`), were implemented early on. This strategy helps to complete the user flow and application routing before the final logic is implemented, allowing for a more holistic development process.
