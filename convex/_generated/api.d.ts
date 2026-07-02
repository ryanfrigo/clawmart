/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as checks from "../checks.js";
import type * as crawler from "../crawler.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_pure from "../lib/pure.js";
import type * as llm from "../llm.js";
import type * as pipeline from "../pipeline.js";
import type * as reports from "../reports.js";
import type * as spend from "../spend.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  checks: typeof checks;
  crawler: typeof crawler;
  crons: typeof crons;
  http: typeof http;
  "lib/pure": typeof lib_pure;
  llm: typeof llm;
  pipeline: typeof pipeline;
  reports: typeof reports;
  spend: typeof spend;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
