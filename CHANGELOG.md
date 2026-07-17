# Changelog

## [1.2.2](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/compare/relojes-bv-beni-v1.2.1...relojes-bv-beni-v1.2.2) (2026-07-17)


### Bug Fixes

* **test:** add localStorage shim for Node 25+ compatibility ([5120983](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/5120983577de9ee30fa6406d8b2a7f3fee356e23))
* **test:** add localStorage shim for Node 25+ compatibility ([080ff69](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/080ff697eabe0427f2473a0b6798ceba8dd573e4))

## [1.2.1](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/compare/relojes-bv-beni-v1.2.0...relojes-bv-beni-v1.2.1) (2026-07-17)


### Bug Fixes

* **ci:** skip security workflow on release-please PRs ([45171b4](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/45171b44f779a15e9a9412a5a276bf4a761bd921))
* **ci:** skip security workflow on release-please PRs ([81f1e12](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/81f1e123f8f64c73c767c9296077a937bd4be219))

## [1.2.0](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/compare/relojes-bv-beni-v1.1.0...relojes-bv-beni-v1.2.0) (2026-07-15)


### Features

* **api:** add X-Trace-Id and friendly error mapping to fetch calls ([dd33131](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/dd33131ef40be5f9355f9553e6cfa8186fba3619))
* **auth:** add session cookie helpers and auth route handlers ([f3be631](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/f3be631561ca3aea8b9e6781b2d9196957d352aa))
* **checkout:** add assembleOrderData service for order payload transformation ([c9b5136](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/c9b51368e6e9c11d4d92bf890fea058d69046ce4))
* **favorites:** add /api/favorites route with GET and PUT handlers ([580168e](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/580168e8d55620a6f3be37f61389fe0243cadc4b))
* **favorites:** add favorites feature services (get + update) ([2136c0e](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/2136c0eeec930ab53c132a872794d57124b31dac))
* **favorites:** add useFavoritesApi hook for cookie-based favorites access ([6f61766](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/6f61766cceca27a9f48b4678c0fd0e88d306dc32))
* **orders:** add getOrderByIdService with 14-test suite (PR-1a) ([fc2e0e5](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/fc2e0e5dc507a2e20b83a5c0a4700c1b4ac6175c))
* **orders:** add requestCancellationService with 18-test suite (PR-2a) ([db0ae1d](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/db0ae1dd511bf5fabeb0c6e8684e52d1f1b00fea))
* **orders:** add useOrderById hook for cookie-based order fetching ([b9967ec](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/b9967ec93e597236dd1f56e02cfaf1fb11c847c9))
* **orders:** extract getOrderByIdService (Slice A — orders-services-refactor) ([2a6b113](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/2a6b113986eee9f680ff9a4ed833e8fbcd4f2857))
* **orders:** extract requestCancellationService + 500-char reason cap (Slice B — orders-services-refactor) ([10e0ac3](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/10e0ac3720ea17f53543119ffeaa45aef18a04eb))
* **security:** JWT validation, IDOR prevention, and X-Trace-Id in /api/orders ([3f21214](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/3f21214ba6b28463506087a245403d683fd0766a))
* **security:** thin /api/orders route delegating to features/orders service ([94014b3](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/94014b3bd56b1dfdda083cd9d5f5328a047ab7d7))
* **trace:** export newTraceId for client-side call sites ([5b0df42](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/5b0df4286b03a6139a6a6c27d8673c0f72be6059))


### Bug Fixes

* **auth:** use SESSION_COOKIE constant in session route ([b606d43](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/b606d439d8971db7f38c69f9e6a7aa3187f323e0))
* **ci:** move timeout-minutes to job level (workflow-level not supported) ([29e0ffb](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/29e0ffb6425d32f90974055cac05c742ad2c9f8b))
* **favorites:** remove unused FavoritesList import ([efaee5a](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/efaee5a2d248a58276705320b4b6522ce47273f9))
* **lint:** allow empty catch blocks, fix unused-vars patterns (^ -&gt; ^_), strip comments ([2ca6d86](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/2ca6d86c4b9997e04495359aaeb5f98a5c7e296f))
* **lint:** override no-unused-vars for ShopLoopHead and api.ts (pre-existing debt) ([5075244](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/507524492d52f6c6b99dc0c97c98800262c0e93a))
* **orders:** remove comment from requestCancellation service ([aa70d2c](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/aa70d2cdb29e2d3c77adb227e84a381a5b9235d7))
* **orders:** unwrap Strapi v4 attributes envelope in order detail and cancellation routes ([91da557](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/91da5572a026d3ac07bd41e7c8aae2ad705f4c29))
* **orders:** unwrap Strapi v4 attributes envelope in order detail and cancellation routes ([e701323](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/e701323f52fb309d0023b80f15570de86c9bc5ac))
* **orders:** unwrap Strapi v4 attributes envelope in order detail and cancellation routes ([2b8006a](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/2b8006a25c50471f0ebf9acfafe5f7e2a5744d15))
* remove unused catch binding in useOrderById and unused variable in useFavorites ([dc2bd6f](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/dc2bd6f3ce3291b08eef8ddc78bcc5ac112b9334))
* **security:** remove console leaks, harden CSP, add PR1 artifacts ([160e3cb](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/160e3cbc24664f2d902f7d581754d6f4670bd3e9))
* **security:** use CSPRNG for trace id fallback ([9ca6bf5](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/9ca6bf5ae4d3d463a2f54f691aa736093c19f063))
* **test:** mock getStripeServer for CI, run only unit tests in CI ([6b4ba07](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/commit/6b4ba07ecf453e07159781d7dd7119ed8acbf620))

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
