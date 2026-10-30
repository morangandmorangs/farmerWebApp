import { configureStore, combineReducers, createListenerMiddleware } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useDispatch, useSelector } from "react-redux";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import idbStorageModule from "redux-persist-indexeddb-storage";

import { apiSlice } from "@/config/apiSlice";

import authReducer, { signedOut } from "./slice/authSlice";

const listener = createListenerMiddleware();

// Signing out drops every cached reply, so the next farmer never sees the last one's data.
listener.startListening({
  actionCreator: signedOut,
  effect: (_action, api) => {
    api.dispatch(apiSlice.util.resetApiState());
  },
});

// Create IndexedDB storage for redux-persist
// The package is CommonJS (`exports.default`); Vite's pre-bundle can hand back the whole exports
// object as the default import, so unwrap it.
type CreateIdbStorage = typeof idbStorageModule;
const createIdbStorage: CreateIdbStorage =
  (idbStorageModule as unknown as { default?: CreateIdbStorage }).default ?? idbStorageModule;

const idbStorage = createIdbStorage("farmer-webapp-madebyilix");

// Configure persist options for our root reducer
const persistConfig = {
  key: "root",
  version: 1,
  storage: idbStorage,
  whitelist: ["auth"],
  blacklist: ["api"], // Don't persist API cache
};

const rootReducer = combineReducers({
  auth: authReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(listener.middleware)
      .concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
