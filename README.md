# Foxo Products

A React Native + Expo app that lists products from the [DummyJSON API](https://dummyjson.com/docs/products), with pagination, search, a product details screen, and handling for the errors a real network and real data produce. A built-in **Simulate** tab triggers each failure on purpose, so you can see how the app copes.

Built with Expo SDK 58, React Native 0.88, Expo Router, and TypeScript in strict mode.

## Getting started

```bash
npm install
npx expo start        # then press i (iOS), a (Android) or w (web), or scan the QR code with Expo Go
```

All native modules used are included in Expo Go, so no development build is needed.

| Command | What it does |
|---|---|
| `npm start` | Start the dev server |
| `npm test` | Run the Jest test suite |
| `npm run lint` | ESLint (Expo config + Prettier) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:fix` / `npm run format` | Auto-fix lint / format all files |

## Features

- **Product list**: 20 products per page, loaded as you scroll (`limit` / `skip`). It shows separate states for loading, error, empty, and end of list.
- **Search**: server-side via `/products/search`. It's debounced (300 ms) and paginated the same way as the full list.
- **Pull to refresh**: reloads page 1 while the current list stays on screen.
- **Product details**: tap a row to open a screen with an image gallery, price and discount, stock, description, tags, specs, and reviews.
- **Error handling** for network failures, no connection, timeouts, server errors, invalid or partial data, render crashes, uncaught exceptions, and failing native module calls.
- **Simulate tab**: a developer tool for triggering every failure above, plus broken links into the details screen.

## Architecture

```
src/
├── app/                        # Routes only (Expo Router file-based routing)
│   ├── _layout.tsx             # Root Stack, theme, global error handler, error modal
│   ├── (tabs)/                 # Tab group: Home (product list) and Simulate
│   └── product/[id].tsx        # Details screen, pushed on top of the tabs
├── features/products/          # Everything specific to products
│   ├── api.ts                  # Endpoints + turning raw JSON into safe UI models
│   ├── types.ts                # API models and the UI models derived from them
│   ├── useProducts.ts          # List state: pagination, search, refresh, retry
│   ├── useProductDetails.ts    # Details state: fetch, retry, cancellation
│   ├── components/             # ProductList, ProductRow, ProductImage, ProductDetailsView
│   └── __tests__/
├── services/                   # App-wide infrastructure, independent of any feature
│   ├── apiClient.ts            # fetch wrapper: timeout, cancellation, error classification
│   ├── errorReporter.ts        # Single place unexpected errors are sent to
│   ├── globalErrorHandler.ts   # Catches JS errors outside React rendering
│   ├── errorModal.ts           # App-wide error modal state
│   └── errorSimulator.ts       # Deliberate failures for the Simulate tab
├── components/global/          # Reusable UI with no product knowledge
├── hooks/                      # Generic hooks (theme, debounce)
├── utils/errorUtils.ts         # AppError type + user-facing messages
└── test-utils/                 # Fake DummyJSON server and hook test helpers
```

### Layers

Each layer only talks to the one below it:

1. **Screens** (`src/app`) read URL params, call a feature hook, and choose which state to render. They contain no fetching logic.
2. **Feature hooks** (`useProducts`, `useProductDetails`) own the request lifecycle. They expose one state value with a `status` field (a discriminated union), so impossible combinations like "loading and errored" can't be represented.
3. **Feature API** (`features/products/api.ts`) knows the endpoints and converts untrusted JSON into UI models such as `ProductSummary` and `ProductDetails`.
4. **API client** (`services/apiClient.ts`) is the only code that calls `fetch`. Every failure leaves it as an `AppError` with a `kind`: `offline`, `network`, `timeout`, `http`, `parse`, `cancelled`, or `unknown`.

Screens only ever deal with `AppError`, and `getErrorMessage()` turns it into user-facing text, so technical messages never reach users.

### Key decisions

- **Only the id goes between screens.** A row navigates to `/product/[id]`, and the details screen fetches the full product itself. Data stays fresh, the URL is shareable, and deep links work. The id is treated as untrusted input: `parseProductId` accepts only positive whole numbers and rejects anything else before any request is made.
- **Clean the data, don't reject it.** The API is assumed to be unreliable. `toProductSummary()` / `toProductDetails()` trim text, check numbers and their ranges, and replace anything malformed with `undefined`. Only a product without an id (which a list can't key) is dropped. The UI shows a fallback for every optional field ("Untitled product", "Price unavailable", an image placeholder, and hidden empty sections).
- **Every request can be cancelled, and late responses are ignored.** Each request has an `AbortController` that is aborted when its result is no longer wanted: on a new search, refresh, retry, or leaving the screen. Every response handler also checks `signal.aborted`, because a response can already be on its way when the abort happens. Stress tests caught exactly that race (see Testing).
- **Pagination follows the server's position, not the list length.** `nextSkip` advances by the number of raw items the server returned, so dropped or duplicate products don't shift the next page. Duplicate ids are removed on append so list keys stay unique.
- **Refresh doesn't hide content.** Pull-to-refresh keeps the current list visible. Loading more is paused until the refresh finishes, and a failed refresh keeps the existing list with an inline notice.
- **FlatList, tuned for long lists of rows with different heights.** Row heights vary, so `getItemLayout` can't be used. The rendered window is reduced instead (`windowSize={7}`, batches of 8), rows are wrapped in `memo`, and the next page is requested a full screen before the end.
- **Images**: expo-image with `cachePolicy="memory-disk"` and automatic downscaling. The list uses thumbnails; full-size images are used only when a product has no thumbnail. A broken or missing image shows a placeholder with the product's first letter.

## Error handling

| Failure | Where it's caught | What the user sees |
|---|---|---|
| No connection | `apiClient` checks `expo-network` after a failed fetch | "You're offline…" + offline banner |
| Server unreachable | `apiClient` | "Couldn't reach the server" + Try again |
| Timeout (10 s) | `apiClient` (its own abort timer) | "The request took too long" + Try again |
| HTTP 404 / 5xx | `apiClient` → `AppError('http')` | "Product not found" + Go back / "The server is having trouble…" |
| Invalid JSON or wrong shape | `apiClient` / `api.ts` | "We received an unexpected response" |
| Missing or malformed fields | `toProductSummary` / `toProductDetails` | Product shown with fallbacks |
| Invalid product link | `parseProductId` | "Invalid product link" + Go back, no request sent |
| A failed next page | `useProducts` | Inline "Couldn't load more" + Try again; loaded products stay |
| Crash while rendering | Expo Router `ErrorBoundary` exported per route | "Something went wrong" + Try again; navigation keeps working |
| Uncaught JS error (event handler, timer) | `ErrorUtils.setGlobalHandler` | App-wide error modal instead of the app closing |
| Native module call fails | `try/catch` at the call site | Error modal |

Unexpected errors also go through `reportError()`, the single place to plug in a crash-reporting service. Detailed error messages are shown only in development builds.

**What isn't covered:**
- **Native crashes** (Objective-C, Swift, Java) can't be caught from JavaScript and need a native crash reporter.
- **Unhandled promise rejections** aren't hooked; all of the app's own promise chains handle their errors.
- **Render errors still show LogBox's red screen in development.** React Native sends errors caught by an error boundary to LogBox directly, and LogBox's ignore list doesn't apply to them. In release builds, users see only the app's own error screen.

## Testing

`npm test` runs 47 tests in Jest (`jest-expo` + React Native Testing Library) against an in-memory fake of DummyJSON (`src/test-utils/fakeProductsServer.ts`). The fake server can control latency, failure rate, specific failing requests, and data corruption, and can keep responding after a request is aborted. Its random behaviour is seeded, so failures reproduce.

- **Stress tests** (`useProducts.stress.test.ts`):
  - 2,000 products paginated with no gaps or duplicates,
  - 100 rapid scroll-to-end calls send one request,
  - a network dropping 30% of requests still loads everything,
  - 50 rapid retries end in one consistent list,
  - unmounting cancels the request,
  - 20% corrupted data is kept with fallbacks,
  - a server that never answers produces a timeout error.
- **Race conditions:** a response arriving after a retry, a new search, or a refresh is ignored. These tests found a real bug (stale pages being appended) that was then fixed.
- **Search and refresh** (`useProducts.search.test.ts`):
  - search results paginated across many pages,
  - no stale results shown after a new search,
  - rapid search changes end on the last search,
  - refresh restarts pagination and drops any in-flight page,
  - a failed refresh keeps the list.
- **Details screen** (`ProductDetailsScreen.test.tsx`): rendered through the real router. It covers loading from the link, a malformed id (no request), a 404, retry after a network failure, and going back mid-load (request aborted).
- **Data cleaning** (`api.test.ts`): fuzz tests with thousands of random inputs, plus 12 cases for `parseProductId`.
- **Mutation-checked:** the safeguards (abort on cleanup, the refresh guard) were removed temporarily to confirm the matching tests fail.

### Memory

Measured on the production web build with Chrome DevTools, sampling the heap after forced garbage collection:
- **No leaks across repeated flows.** The heap levelled off (about 9–10 MB) over 30 details open/close cycles, 150 searches, and repeated tab switches.
- **Stable DOM and event listeners.** DOM elements and event listeners returned to their baseline after each flow.
- **List windowing works.** With all 194 products loaded, only about 25–46 rows are rendered at a time.

## What could be better

**Scale and performance**
- Every loaded product stays in memory (about 660 bytes each, so about 63 MB at 100k products). A very large catalogue would need a cap, or dropping pages far from view.
- `ProductSummary` still carries `description`, which the list doesn't display. Removing it would cut the per-product memory by about 40%; the details screen fetches its own copy.
- `appendUnique` rebuilds a set of every loaded id on each page. Keeping the set between pages would avoid that repeated work.
- FlashList (recycled rows, no size estimates needed) would scale better than FlatList for very long lists of rows with different heights.
- Native memory and scroll performance haven't been profiled on a device. Next steps: Hermes heap snapshots (React Native DevTools), Xcode Instruments, and Android Studio's Memory Profiler.

**Data layer**
- A query cache such as TanStack Query would give caching between screens, background refetching, and deduplicated requests. It could replace much of the hand-written request state, which was kept deliberately explicit here.
- The details screen could show the list's data for the product immediately while the full product loads.
- Validate responses with a schema library such as Zod instead of hand-written type guards.
- Retry automatically with backoff on transient failures, and reload when the connection comes back.

**Errors and observability**
- Connect `reportError()` to Sentry (it has an Expo config plugin), which would also capture native crashes.
- Hook unhandled promise rejections.
- Limit the Simulate tab to development builds.

**Product and UX**
- Header search on iOS (`Stack.SearchBar`), filters by category, sorting, and saved recent searches.
- Remove leftover template code (the "Expo Starter" web header and unused starter components), and use one file-naming convention throughout. New files use PascalCase or camelCase; the template uses kebab-case.
- Accessibility pass: screen-reader labels for prices and ratings, dynamic type, and contrast checks.
- End-to-end tests on devices (Maestro or Detox) in CI, alongside the unit tests.
