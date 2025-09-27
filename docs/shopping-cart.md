# Technical Documentation: Shopping Cart Module

## 1. Overview

The Shopping Cart module provides a complete, end-to-end user flow for managing selected products. It is designed to be reactive, persistent, and globally accessible from any part of the application. The core of this module is a robust state management system built with the React Context API.

## 2. Architecture: Global State with Context API

The entire module is architected around a centralized state manager, `CartContext`, to ensure a single source of truth and avoid the complexities of prop drilling.

### Key Architectural Components

- **`CartContext.tsx`**: This file is the heart of the module.
  - **`CartProvider`**: A provider component that wraps the entire application's root layout. It holds the `cartItems` state and contains all the logic for manipulating the cart (e.g., adding, removing, updating items).
  - **`useCart` Hook**: A custom hook that provides a clean and simple API for any component to consume the cart's state and its associated actions.
  - **Client-Side Requirement**: Any component that consumes this context (like `Navbar` or `ProductCard`) must be a Client Component, marked with the `"use client"` directive.

- **Immutable State Updates**: All state modification functions within the context (`addToCart`, `removeFromCart`, `updateQuantity`) are designed to be immutable. They create new state objects instead of modifying the existing ones, ensuring predictable state transitions and preventing side effects.

### User Flow

1.  A user clicks the "Add to Cart" button on a `ProductCard` or from a `ProductDetailPage`.
2.  This action calls the `addToCart` function from the `useCart` hook.
3.  The `CartContext` updates its state, adding the new item or increasing the quantity of an existing one.
4.  The `Navbar` component, also consuming the context, re-renders automatically to display the updated total item count in the cart icon.
5.  The user navigates to the `/carrito` page.
6.  This page reads the `cartItems` from the context and displays them using reusable `CartItemRow` components.
7.  The user can modify quantities or remove items, triggering the `updateQuantity` or `removeFromCart` functions, which instantly updates the UI.

## 3. Development History and Key Decisions

The development was executed in three strategic phases, building from the ground up.

- **Phase 1: Architectural Foundation (Commit `c03b160`)**: The initial focus was on creating the core infrastructure. The key decision was to use React's Context API to establish a global state management system. The `CartProvider` was integrated at the application's root level, and the `useCart` hook was created to define a clean consumption pattern.

- **Phase 2: UI Integration and Refactoring (Commit `fd93547`)**: With the context in place, the next step was to connect the user interface. This involved a critical refactor of the `ProductCard` to accept a single `product` prop, which simplified its API and fixed data consistency bugs. The "Add to Cart" buttons and the dynamic Navbar counter were wired to the context, making the experience fully interactive. _(Note: This phase was preceded by a `git reset` to ensure a clean implementation, reflecting a commitment to code quality)._

- **Phase 3: Cart Page and Responsive Polish (Commit `a0b9e51`)**: The final phase was to build the user-facing cart page at `/carrito`. Conditional rendering was implemented to handle both empty and populated states. A significant effort was dedicated to responsive design, particularly refactoring the `CartItemRow` to adapt gracefully from a row on desktops to a card on mobile, thus resolving overflow issues and completing the feature set for the frontend MVP.
