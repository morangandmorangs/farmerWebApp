import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQuery } from "./apiConfig";

/** The one RTK Query API for localMart-BEE. Feature files add endpoints with `apiSlice.injectEndpoints`. */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["auth"],
  endpoints: () => ({}),
});
