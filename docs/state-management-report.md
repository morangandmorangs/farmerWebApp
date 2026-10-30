# farmerWebApp: state management report

Covers `react-redux`, `redux-persist`, RTK Query (`createApi` / `injectEndpoints`) and IndexedDB, as they are used in `farmerWebApp` today (2026-10-30).

## 1. Summary

| Piece | Package | Job here | Where |
| --- | --- | --- | --- |
| Store | `@reduxjs/toolkit` | One Redux store holding auth state and the API cache | `src/store/store.ts` |
| React bindings | `react-redux` | Gives components access to the store (`<Provider>`, later `useSelector` / `useDispatch`) | `src/main.tsx` |
| Persistence | `redux-persist` | Saves part of the store and restores it on reload | `src/store/store.ts`, `src/main.tsx` |
| Storage engine | `redux-persist-indexeddb-storage` | Makes IndexedDB the place persisted state is written | `src/store/store.ts` |
| Server data | RTK Query | Fetching, caching and mutating localMart-BEE data | `src/config/apiSlice.ts`, `src/store/services/authApi.ts` |
| Endpoints | `injectEndpoints` | Adds endpoints to the one API from feature files | `src/store/services/authApi.ts` |

### Status at a glance

- The store, auth slice, API slice and auth endpoints exist, typecheck and build.
- `main.tsx` wraps the app in `<Provider>` and `<PersistGate>`. `AuthProvider` is gone.
- Components get the signed-in farmer from `useAuth()` in `src/lib/auth.ts`, which reads the Redux slice and calls the RTK Query hooks. Its shape is unchanged for `Layout`, `Login` and `RemoveCropDialog`.
- `redux-persist-indexeddb-storage` is installed.
- The older `api<T>()` helper in `lib/api.ts` (farm and crop calls) now reads the token from the store too.

## 2. File map

```
src/
  main.tsx                       Provider + PersistGate around the app
  config/
    apiConfig.ts                 API_CONFIG.BASE_URL and the shared baseQuery (adds the Bearer token)
    apiSlice.ts                  createApi: the single API, no endpoints of its own
  store/
    store.ts                     combineReducers, persistReducer, configureStore, persistor
    slice/authSlice.ts           createSlice: token + farmer
    services/authApi.ts          injectEndpoints: login, register, Google, phone, getMe
  types/
    redux-persist-indexeddb-storage.d.ts   typings for the storage package
  lib/
    auth.tsx                     OLD context-based auth (still the one in use)
    api.ts                       OLD fetch helper + localStorage token (still in use)
```

## 3. Redux Toolkit store (`store/store.ts`)

The store is built in four steps:

1. **`combineReducers`** joins two slices of state:
   - `auth`: from `authSlice` (token and farmer profile).
   - `api` (`apiSlice.reducerPath`): the RTK Query cache.
2. **`persistReducer(persistConfig, rootReducer)`** wraps the root reducer so part of the state is saved and restored (section 5).
3. **`configureStore`** creates the store. Its middleware is Redux Toolkit's defaults, with the serializable check told to ignore the six redux-persist action types (they carry functions), plus `.concat(apiSlice.middleware)` for RTK Query.
4. **`setupListeners(store.dispatch)`** turns on refetch-on-focus and refetch-on-reconnect for queries that ask for them.

Exports: `store`, `persistor`, and the `RootState` / `AppDispatch` types.

### The auth slice (`store/slice/authSlice.ts`)

State: `{ token: string | null, farmer: AuthFarmer | null }`. `AuthFarmer` is a subset of `Farmer`, because the sign-in replies do not include `provider`.

| Action | Effect |
| --- | --- |
| `setCredentials({ token, farmer })` | Stores both after a successful sign-in |
| `updateFarmer(partial)` | Merges fields into the stored farmer (used after `/farmers/me`) |
| `signedOut()` | Clears both |

Selectors (`selectToken`, `selectFarmer`, `selectIsAuthenticated`) take a narrow `{ auth: AuthState }` type instead of `RootState`. That avoids an import cycle, because `apiConfig.ts` needs `selectToken` and `store.ts` imports `apiSlice`.

## 4. react-redux

`react-redux` connects the store to React. Here it is used in one place so far: `main.tsx` renders `<Provider store={store}>`. That makes the store available to every component below it.

What it will do once components are switched over:

- `useSelector(selectToken)` reads state and re-renders the component when that value changes.
- `useDispatch()` returns `dispatch`, for example `dispatch(signedOut())`.
- RTK Query's generated hooks (`useLoginMutation`, `useGetMeQuery`) also read the store through the same `Provider`.

`localMart-Admin` goes one step further and defines typed `useAppDispatch` / `useAppSelector` in `store.ts`. farmerWebApp does not have those yet.

## 5. redux-persist and IndexedDB

### The problem it solves

Redux state lives in memory and is lost on every page reload. The farmer would have to sign in again each time. `redux-persist` copies chosen parts of the state into browser storage and puts them back when the app starts.

### Configuration

```ts
const idbStorage = createIdbStorage("farmer-webapp-madebyilix");

const persistConfig = {
  key: "root",
  version: 1,
  storage: idbStorage,
  whitelist: ["auth", "ui"],
  blacklist: ["api"],
};
```

- `key: "root"`: the name under which the state is saved.
- `version: 1`: a number for future migrations when the saved shape changes.
- `storage`: where the saved state goes. Here, IndexedDB (below).
- `whitelist: ["auth", "ui"]`: only these top-level slices are saved. `auth` exists. **`ui` does not exist**, so that entry does nothing and can be removed or filled when a `ui` slice is added.
- `blacklist: ["api"]`: the RTK Query cache is never saved. Cached server replies are cheap to refetch and could be stale or belong to a previous user. (With a whitelist in place the blacklist is redundant but harmless and states the intent.)

### The reload sequence

1. The page loads. `persistStore(store)` starts and dispatches `PERSIST`.
2. redux-persist reads the saved state from IndexedDB (an **asynchronous** read).
3. It dispatches `REHYDRATE`, which merges the saved `auth` slice into the store.
4. `<PersistGate loading={null} persistor={persistor}>` holds back rendering of its children until step 3 finishes. Without the gate, a signed-in farmer would briefly look signed out, and a route guard could redirect them to the login page.
5. After that, every change to `auth` is written back to IndexedDB automatically.

### Why the serializable check ignores six actions

`FLUSH`, `REHYDRATE`, `PAUSE`, `PERSIST`, `PURGE` and `REGISTER` carry functions in their payloads. Redux Toolkit's dev-mode check warns about non-serializable values, so they are listed as ignored.

### IndexedDB

IndexedDB is the browser's built-in database for structured data: asynchronous, larger than `localStorage` (which holds about 5 MB of strings and blocks the main thread), and available to the page's origin only.

- `redux-persist-indexeddb-storage` adapts it to the small `getItem` / `setItem` / `removeItem` interface redux-persist expects. `createIdbStorage("farmer-webapp-madebyilix")` opens (or creates) a database of that name.
- Practical difference from `localStorage`: reads and writes are async, which is why the `PersistGate` is needed.
- **Security note:** the token is stored in IndexedDB, which is readable by any script running on the page. This is the same exposure as `localStorage`; it is not safer. A cross-site-scripting bug would expose the token either way.
- Debug it in the browser: DevTools, Application tab, IndexedDB.

## 6. RTK Query and `injectEndpoints`

### RTK Query in one paragraph

RTK Query is the data-fetching layer of Redux Toolkit. You describe endpoints; it generates hooks that fetch, cache by arguments, deduplicate in-flight requests, track loading and error state, and refetch when cached data is invalidated. The cache lives in the Redux store under the `api` key.

### The single API (`config/apiSlice.ts`)

```ts
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["auth"],
  endpoints: () => ({}),
});
```

- `reducerPath: "api"`: the key in the store.
- `baseQuery`: how every request is sent (below).
- `tagTypes`: the names used to link queries to the mutations that make them stale.
- `endpoints: () => ({})`: deliberately empty. The file stays small and does not need to know about every feature.

### The base query (`config/apiConfig.ts`)

`fetchBaseQuery` with `baseUrl` = `VITE_API_URL ?? "/api"`. In development Vite proxies `/api` to the gateway on port 8000, so the browser makes same-origin requests and CORS does not apply. `prepareHeaders` reads the token with `selectToken` and sets `Authorization: Bearer <token>`. This is why the `auth` reducer must be in the store: without it the token is `undefined` and no header is sent.

### `injectEndpoints`

`apiSlice.injectEndpoints({ endpoints })` adds endpoints to an already-created API and returns an enhanced API with the new hooks. Benefits:

- **Feature files own their endpoints.** `authApi.ts` holds auth endpoints; a future `cropsApi.ts` would hold crop endpoints. No single giant file.
- **One cache, one middleware, one reducer.** Every injected endpoint shares the same `api` slice, so tags can invalidate across features.
- **Code splitting.** A feature file can be imported lazily, and its endpoints are added when it loads.

### The auth endpoints (`store/services/authApi.ts`)

| Endpoint | Kind | Route | Hook |
| --- | --- | --- | --- |
| `login` | mutation | `POST /farmers/login` | `useLoginMutation` |
| `register` | mutation | `POST /farmers/register` | `useRegisterMutation` |
| `googleSignIn` | mutation | `POST /farmers/auth/google` | `useGoogleSignInMutation` |
| `phoneSignIn` | mutation | `POST /farmers/auth/phone` | `usePhoneSignInMutation` |
| `getMe` | query | `GET /farmers/me` | `useGetMeQuery` |

Responses are typed envelopes (`success`, `message`, `data`). The sign-in reply carries `id`, `name`, `email`, `role`, `profileStatus`, `canOperate`, `token` (and `isNew` for phone sign-in).

**`onQueryStarted`.** Each sign-in mutation runs code when the request starts and awaits `queryFulfilled`. On success it dispatches `setCredentials({ token, farmer })`, so the component calling `login(...)` does not have to. `getMe` dispatches `updateFarmer` with the full profile. Failures are caught and logged; the error still reaches the calling component through the hook's `error` / `.unwrap()`.

**Tags.** `getMe` `providesTags: ["auth"]`. A future mutation that changes the profile would `invalidatesTags: ["auth"]` and `getMe` would refetch.

**There is no logout endpoint** on localMart-BEE's farmer routes. Signing out is client-side: `dispatch(signedOut())`, which also should clear the API cache (`apiSlice.util.resetApiState()`). That reset is not wired in farmerWebApp yet; `localMart-Admin` does it with a listener middleware.

### End-to-end flow (once components use it)

1. The login form calls `const [login] = useLoginMutation()` and `await login({ email, password }).unwrap()`.
2. `baseQuery` sends `POST /api/farmers/login` (no token yet).
3. The reply arrives, `onQueryStarted` dispatches `setCredentials`.
4. The `auth` slice updates, and redux-persist writes it to IndexedDB.
5. Later requests: `prepareHeaders` adds the `Bearer` token.
6. On reload: `PersistGate` waits for rehydration, then the token is back in the store.

## 7. Gaps found earlier, and how they were closed

| Gap | Fix |
| --- | --- |
| `redux-persist-indexeddb-storage` imported but not installed | Installed; listed in `package.json` |
| Redux auth built but unused (two token stores) | `useAuth()` now wraps the slice and RTK Query hooks; the `localStorage` token and `AuthProvider` are removed; `lib/api.ts` reads the store |
| Persist whitelist named a `ui` slice that does not exist | Whitelist is `["auth"]` |
| Sign-out left the API cache in memory | A listener on `signedOut` dispatches `apiSlice.util.resetApiState()` |
| No central 401 handling | The base query (and `lib/api.ts`) dispatch `signedOut()` on a 401 while signed in |
| No typed hooks | `useAppDispatch` / `useAppSelector` exported from `store.ts` |

Still true: the persisted token sits in IndexedDB, which any script on the page can read (the same exposure as `localStorage`). Farmers signed in before this change are signed out once, because the old `lm-farmer-token` key is no longer read.
