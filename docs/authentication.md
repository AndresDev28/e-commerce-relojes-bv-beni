# Technical Documentation: Authentication System

## 1. Overview

The authentication module is designed to manage the entire user lifecycle, from registration and login to session termination. Its main goal is to provide a secure and fluid user experience, enabling access to protected areas of the e-commerce site, such as the "My Account" (`/mi-cuenta`) section, which includes favorites and the shopping cart.

## 2. Architecture and Data Flow

The system is built around a centralized global state managed by a **React Context**.

### Key Components and their Roles

- **`AuthContext.jsx`**: This is the core of the module.
  - **State:** It holds the `user` object and an `isAuthenticated` boolean flag.
  - **Functions:** Exposes methods like `login`, `register`, and `logout` to the rest of the application.
  - **Session Validation:** It uses a `useEffect` hook to validate the user's session from `localStorage` when the application loads, ensuring session persistence. It is designed to be Server-Side Rendering (SSR) safe to avoid hydration errors in Next.js.

- **`LoginForm.tsx` & `RegisterForm.tsx`**: These are the UI components responsible for capturing user credentials. They handle form state and validations before calling the corresponding functions from `AuthContext`.

- **`ProtectedRoute.tsx`**: This is a high-level wrapper component that implements the access control logic.
  - **Functionality:** It checks the `isAuthenticated` state from `AuthContext`.
  - **Redirection:** If the user is not authenticated, it automatically redirects them to the `/login` page using the Next.js router.
  - **Scalability:** This component was created through a refactoring process to centralize the protection logic, making it easy to apply to any new route that requires authentication in the future.

### Authentication Flow

1.  The user navigates to the `/login` or `/registro` page.
2.  After filling out the form, the `login` or `register` function from `AuthContext` is called.
3.  The context communicates with the server-side API to validate credentials or create a new user.
4.  If successful, the API returns a user token and data.
5.  `AuthContext` updates its state (`user`, `isAuthenticated`) and stores the session token in `localStorage`.
6.  The application redirects the user to their `/mi-cuenta` page or to the homepage.

## 3. Development History and Key Decisions

The module was developed incrementally, focusing on robustness and user experience.

- **Initial Implementation:** The core functionalities of login, registration, and logout were developed first, along with the creation of the `AuthContext` to manage the state.
- **UI Integration:** The authentication state was then integrated with the UI, primarily the `Navbar`, to display conditional links. The first version of route protection was also implemented on the `/mi-cuenta` page.
- **Architectural Refactor:** To improve scalability and code reuse, the route protection logic was extracted from the page and encapsulated within the `ProtectedRoute` component. This fixed a redirection bug during logout and established a more robust pattern for the entire application.
