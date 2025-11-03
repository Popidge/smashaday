/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addCategories from "../addCategories.js";
import type * as clueGen from "../clueGen.js";
import type * as crons from "../crons.js";
import type * as daily_challenge from "../daily_challenge.js";
import type * as generateWords from "../generateWords.js";
import type * as http from "../http.js";
import type * as insertWords from "../insertWords.js";
import type * as manualTests_compilePendingTest from "../manualTests/compilePendingTest.js";
import type * as migrateWords from "../migrateWords.js";
import type * as queries from "../queries.js";
import type * as saveDailyScores from "../saveDailyScores.js";
import type * as smashCompiler from "../smashCompiler.js";
import type * as smashDbOps from "../smashDbOps.js";
import type * as smashGen from "../smashGen.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  addCategories: typeof addCategories;
  clueGen: typeof clueGen;
  crons: typeof crons;
  daily_challenge: typeof daily_challenge;
  generateWords: typeof generateWords;
  http: typeof http;
  insertWords: typeof insertWords;
  "manualTests/compilePendingTest": typeof manualTests_compilePendingTest;
  migrateWords: typeof migrateWords;
  queries: typeof queries;
  saveDailyScores: typeof saveDailyScores;
  smashCompiler: typeof smashCompiler;
  smashDbOps: typeof smashDbOps;
  smashGen: typeof smashGen;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
