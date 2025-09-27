# BV-Beni Watches: An E-Commerce Journey

Bringing a 25-year family legacy of passion for horology into the digital age.

---

## 🕰️ A Legacy Reimagined: The Story

For over 25 years, my brother-in-law has dedicated his life to the art of watchmaking, building a beloved local business founded on trust, expertise, and a deep passion for horology.  
This project is more than just code; it is a mission to carry that quarter-century of dedication into the digital world.

Our goal is to build an online experience that mirrors the quality, elegance, and personal touch of the physical store, making these beautiful timepieces accessible to a new generation of enthusiasts while honoring the tradition that started it all.

---

## 👨‍💻 A Developer's Journey

As a self-taught software developer, this project represents a significant milestone in my learning path.  
Moving beyond tutorials and isolated exercises, **Relojes-Bv_Beni** is my first full-scale, real-world application, built from the ground up.

It's a practical opportunity to tackle the entire full-stack development lifecycle: from initial planning and UI/UX design to frontend development with React, TypeScript y Next.js, backend API creation, and finally, deployment.  
Every feature implemented and every problem solved is a direct contribution to my growing expertise and a testament to the power of hands-on learning.

---

## ✨ Core Features

- **Component-Driven UI Library:** The user interface is built upon a library of reusable, independent components developed with Storybook. This approach ensures visual consistency and accelerates development.
  - **Core Components:** A set of foundational components like `Button`, `Input`, and `Spinner` have been created with multiple variants, states (e.g., error, loading), and full Storybook integration for isolated testing and documentation.
  - **Responsive Base Layout:** The project was initiated with a solid structural foundation, including a responsive layout, navigation, and footer, ensuring a consistent user experience across all devices.
  - **Clean and Maintainable Code:** A strict ESLint configuration is enforced to maintain code quality and prevent common errors, with specific rules to ignore unused variables with an underscore prefix for cleaner code.
- **Product Catalog & Browsing Experience:** The core of the e-commerce site, providing a fluid and intuitive shopping journey.
  - **Dynamic Product Catalog:** A responsive grid layout on the `/tienda` page that displays all available products, built for a seamless browsing experience.
  - **Detailed Product Pages:** Each product has a dedicated dynamic page (`/tienda/[id]`) that showcases its details. It follows modern Next.js best practices by using a Server Component for fast data fetching and a Client Component to handle interactivity.
  - **Interactive Features:** The product detail page includes a client-side image gallery with thumbnail selection and a quantity selector before adding an item to the cart.
  - **Product Sorting:** Users can easily sort products by price or name, with the logic managed by a reusable `ShopLoopHead` component that also displays breadcrumbs and a product count.
  - **Refactored Components:** The `ProductCard` has been redesigned with a minimalist, icon-driven UI for adding to favorites, adding to the cart, and viewing details.
- **Shopping Cart & Global State Management:** A fully interactive and persistent shopping cart experience, powered by React's Context API for robust global state management.
  - **Core Functionality:** Users can add, remove, and update the quantity of items from product cards, detail pages, and the cart page itself.
  - **Dynamic Navbar Counter:** The cart icon in the navigation bar provides immediate visual feedback, showing the total number of items in real-time.
  - **Dedicated Cart Page:** A fully responsive `/carrito` page that displays a detailed order summary and allows for final modifications before checkout.
  - **Clean Architecture:** The logic is centralized in a `CartContext`, eliminating prop drilling and making the state easily accessible to any component in the application.
- **User Authentication Module:** Handles all user-related functionalities, including registration, login, and session management.
- **Dynamic Content from Headless CMS:** The entire product catalog is fully dynamic, fetching data in real-time from a live Strapi API deployed on Render. This decouples the frontend from the content, allowing for easy updates without redeploying the application.
  - **Centralized API Service:** All communication with the backend is handled through a reusable and isomorphic API service (`lib/api.ts`), ensuring maintainable and consistent data fetching logic.
  - **Robust Data Transformation:** A defensive transformation layer normalizes the raw data from Strapi into a clean, strictly-typed `Product` interface for the frontend. This includes fallbacks for missing data to prevent runtime errors.
  - **Optimized Image Handling:** Image URLs from Cloudinary are correctly processed, and the Next.js configuration is optimized to allow images from external sources, ensuring fast and reliable media loading.
- **Secure Checkout:** (Coming Soon) Integration with Stripe for safe and reliable payments.

---

## 🏗️ Build, Quality & Deployment

This project was built with a strong focus on code quality, maintainability, and a seamless deployment pipeline.

- **Code Quality:** A strict ESLint configuration is enforced across the entire codebase to maintain consistency and prevent common errors. All linting and type issues were resolved to ensure a stable production build.
- **Production Ready:** The application is fully deployed, with the Next.js frontend hosted on **Vercel** and the Strapi backend on **Render**.
- **Optimized Configuration:** The Next.js configuration has been fine-tuned for a production environment, including whitelisting external image domains (Cloudinary, Render) to ensure optimal media performance.
- **Environment Management:** The connection between the frontend and the backend is securely managed through environment variables, allowing for easy switching between development and production APIs.

---

## 🛠️ Tech Stack & Tools

This project is built with a modern, robust, and scalable tech stack:

- **Frontend:** React, TypeScript, Next.js, Tailwind CSS
- **Backend (Planned):** Node.js, Express.js
- **Database (Planned):** MongoDB with Mongoose
- **DevOps & Tooling:** Git, GitHub, ESLint, Prettier

---

## 🚀 Development Journey & Challenges

This project was a significant learning experience. Beyond just building the final product, it involved overcoming several real-world development challenges. I've documented the most interesting ones, including my thought process and the professional solutions I implemented.

➡️ **[Read about the challenges I solved in CHALLENGES.md](./CHALLENGES.md)**

---

## 📄 Technical Documentation

For a detailed technical breakdown of the core modules, including architecture, data flow, and key decisions, please refer to the documents in the `/docs` folder. This documentation was generated following a "Git-First" methodology, using the commit history as the single source of truth.

- **[Authentication Module](./docs/authentication.md)**
- **[Product Catalog Module](./docs/product-catalog.md)**
- **[Shopping Cart Module](./docs/shopping-cart.md)**
- **[API Integration & Dynamic Content](./docs/api-integration.md)**
- **[UI & Component Library](./docs/ui-and-components.md)**
- **[Build & Deployment Pipeline](./docs/build-and-deployment.md)**

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation

**Clone the repo:**

```bash
git clone https://github.com/AndresDev28/e-commerce-relojes-bv-beni.git
```

**Navigate to the project directory:**

```bash
cd e-commerce-relojes-bv-beni
```

**Install NPM packages:**

```bash
npm install
```

**Run the development server:**

```bash
npm run dev
```
