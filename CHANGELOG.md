# Changelog

## [1.1.0](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/compare/relojes-bv-beni-v1.0.0...relojes-bv-beni-v1.1.0) (2026-06-19)


### Features

* **catalog:** add Load More pagination with URL sync for product grid ([#51](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/51)) ([03f206d](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/03f206d90c664245809e438e7ad091d36f50656a))


### Bug Fixes

* **catalog:** add stable sort tiebreaker and deduplicateById safety net ([#54](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/54)) ([269aaf9](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/269aaf9e906af1f2b75cf5e1d45b2d889415f0e6))

## [1.0.0](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/compare/relojes-bv-beni-v0.1.0...relojes-bv-beni-v1.0.0) (2026-06-13)


### ⚠ BREAKING CHANGES

* **ORD-12:** Order ownership validation now returns 404 instead of 403 for orders belonging to other users (security improvement)
* remove catalog mocks and add product prop support to ProductCard.

### Features

* add responsive footer with navigation and social links ([ecdc892](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/ecdc892929e6f11303c73d7d316f7785dd65adbd))
* **api:** connect product pages to Strapi API with data transformation ([c366489](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/c3664890d93e38689162b62a9748494fcb071428))
* **api:** implement robust Strapi data fetching and transformation ([7079133](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/7079133ba72fe7cf66ce840171b4b329b3461a6f))
* **auth:** build login and registration UI pages and forms ([a112146](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/a112146e78b2773e8f7e17a86d0e7d91135eed78))
* **auth:** Complete EPIC 11 - UI Integration ([368792d](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/368792d784e6bfab72e48f5404139ac09cb0275f))
* **auth:** implement login, register, account page and UX redirects ([80a4fb2](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/80a4fb28261dd14368bc89e95b68057829ecce8b))
* **cart:** implement cart page and finalize responsive design ([a0b9e51](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/a0b9e51fd943206b6647bbe93d404e87d43aac9a))
* **cart:** implement CartContext for global state management ([c03b160](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/c03b16052cfa34d707b2d23821c4e5ca8dee31ca))
* **cart:** implement full add-to-cart user flow ([fd93547](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/fd9354714e13a561dc9a49bb69f82235b97569f5))
* **checkout:** add placeholder page and complete user flow ([01590fe](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/01590fed9b24b95ceadd6a178adb055946533b84))
* complete UI component library and add Navbar ([f6ffb45](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/f6ffb4507c3419613123acaee1d6271485593144))
* **deploy:** connect frontend to live production API ([10051e7](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/10051e7095bdddefc86ad991ce152078d2137246))
* **email:** add shipment failure notification (SHIP-12) ([#38](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/38)) ([4890d3f](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/4890d3fe28f80347ede7529fc0cb51322229632e))
* **EPIC-17:** Cookies policy, Granular Banner, Basic Tracking Links & Unit Tests ([#37](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/37)) ([ad8fc70](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/ad8fc703418a46d93dd0f5a42fc58d2542963056))
* **favorites:** Complete EPIC - Favorites module with context, UI, and persistence ([b5dd3a0](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/b5dd3a073493789ee44fb3a3797bc4a784d97229))
* **frontend:** [AND-99] block checkout for out-of-stock products ([#31](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/31)) ([0d7fdd3](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/0d7fdd39561f4d2de0af4b27dbfbd7ba113a1e01))
* **home:** build complete homepage structure and sections ([4764e57](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/4764e57069be2a1334744b8bd5b95bbacacb5c09))
* implement layout structure and core components ([ba4df79](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/ba4df793fc29f6afbdf7aa01586501171281d01a))
* Implement product sorting and fix detail page bugs ([5b9ff8b](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/5b9ff8b974ddbcce9ce0910ff28e23532c10a5a9))
* integrate Strapi across catalog and refactor ProductCard ([7aa9948](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/7aa9948196258b6ba9508d121ff07d013f3f3d03))
* **order:** AND-91 AND-92 Update email template for cancellation rejections ([#32](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/32)) ([0e47533](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/0e47533e849e7a3e06dfd40a94fb145773c80dca))
* **payments:** FASE 2 - Real Stripe integration for payment info capture ([6b7e4b0](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/6b7e4b029bcd2db5c74073f37d4223915c9921c3))
* **products:** implement dynamic product detail page ([5a30f18](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/5a30f180c507e5a420a10adbf1cc89ef8bee9b6d))
* Refactor sort component and fix linter error ([47ee3e6](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/47ee3e691b2b57b4c1c80463eb32596030ec8907))
* save payment info when creating orders ([7fbcc59](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/7fbcc59703c3819ba74dff7d3035cc1721bc0289))
* **security:** implement PII masking in API logs (SEC-03/07) ([#40](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/40)) ([ffbdee6](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/ffbdee6344dd7992e7b273c1327ac3025b174ad3))
* **test:** implement reinforced E2E testing suite with Playwright ([#43](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/43)) ([3987a49](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/3987a494776d48375d4fc13b793c5bf5c8ecf2a4))
* **ui:** add Button component with variants and Storybook integration ([6c09e55](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/6c09e5576a607f77a0337251d13b46fa60af2d5e))
* **ui:** add Input and Spinner components ([e58bf5f](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/e58bf5f058339566840d9f7735bc620455d67268))


### Bug Fixes

* add explicit vitest imports to StatusBadge tests ([4f53418](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/4f53418a5bcd476d99a901ae92763e68f6e5445a))
* **ARCH-01:** correct package.json scripts to use nextjs instead of strapi ([c700abc](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/c700abcdf20e7c31a0eb08337baf9fb5ab8ecdfc))
* **build:** resolve all linting and type errors for successful deployment ([808db77](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/808db77c926e014e24b66b60c972363bcd6aaba5))
* **build:** resolve eslint errors for unused variables ([84e5c87](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/84e5c8732e8c00d969ce3f8d84f6911578ab59a1))
* cancellation rejection email badge and proxy improvements (EPIC-16) ([#33](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/33)) ([44903e3](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/44903e309eba04c5f402bab94576b1e579249de5))
* **deps:** override esbuild to ^0.28.1 to resolve GHSA-gv7w-rqvm-qjhr ([8b7b3b6](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/8b7b3b6a6040d560754081be229ad8b5c67bfd35))
* **eslint:** resolve vercel build warnings and errors ([#39](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/39)) ([f7f28f6](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/f7f28f68945c00164e31d529c99609ba38a048dd))
* **images:** stop prefixing Cloudinary URLs with STRAPI base URL ([30501e5](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/30501e58f22aa7d2b25124836e4a0fb648994170))
* **images:** stop prefixing Cloudinary URLs with STRAPI base URL ([7811367](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/7811367222f17d1541067aed96d5e09a0e3306fa))
* lazy load Stripe to prevent prerender errors in Vercel ([b7068a4](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/b7068a49129cca5666b4e38cf0e79025ac0b7e7f))
* **lint:** remove unused 'categories' import in ProductsPage ([e08fe0f](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/e08fe0ff199db93e67b165942f58e6abe6cdacd1))
* **lint:** remove unused variables and imports across components ([ac149ca](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/ac149ca7aaa1f69e29d3de67250bf41fb8cfe7ec))
* **ORD-12:** resolve order-user relation bug in Strapi v5 ([7262841](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/7262841466ee5f13b9b7b5645535f2a0f773457f))
* **ORD-12:** resolve order-user relation bug in Strapi v5 ([c7bda18](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/c7bda189c1c50a842e73dc2c4154e2584acc08f9))
* **orders:** resolve AuthUser type error in build ([d97aa40](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/d97aa409c6baa7504ed361165b43a5841e305a2d))
* resolve CartContext test failures and setup SDD with Engram ([1532ca5](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/1532ca51d93b7528bfe23486b840ca7d3c5283e4))
* resolve image loading and authentication issues ([2666b98](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/2666b98cbc2c9abc759e809608af8f9cc95bc8e2))
* resolve linting errors for production build ([6db05cf](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/6db05cfdeeb4a9f2f0d91a2a128ebab08adff88f))
* **tests:** add missing cartItems prop to CheckoutForm tests ([0911c75](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/0911c75f37ccaab0eefc46f9ef8dae7ec50a6ab7))
* **tests:** resolve stock depletion in orders integration tests [PAY-20] ([#46](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/issues/46)) ([28f0b28](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/28f0b28ff7442760aa895fdb8bf0e23edb1a038a))
* update Next.js to patch security vulnerabilities ([18d2176](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/18d21769609883fb9ec8c48231c9d8e4c3776636))
* **vercel:** implement lazy Stripe initialization to fix build errors ([8c85081](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/8c8508127ddcb7de40130da521a8178957123df7))
* wrap useSearchParams in Suspense boundary for order-confirmation page ([7757637](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/77576370b2756f1d9e8019076e7f1ca233fbc552))
