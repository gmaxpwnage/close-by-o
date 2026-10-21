import type { AppLoadContext } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { PlatformProxy } from "wrangler";

import { queryFactory } from "./app/lib/db/queries";
import { schema } from "./app/lib/db/schema";

// `ctx` is narrowed to the two members the Pages/Vite load context actually provides;
// newer `wrangler` types add a required `props` member that is not present at runtime here.
type Cloudflare = Omit<PlatformProxy<Env>, "dispose" | "ctx"> & {
  ctx: Pick<PlatformProxy<Env>["ctx"], "waitUntil" | "passThroughOnException">;
};

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
    queries: ReturnType<typeof queryFactory>;
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: { cloudflare: Cloudflare }; // load context _before_ augmentation
}) => AppLoadContext;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = ({ context, request }) => {
  const db = drizzle(context.cloudflare.env.DB, {
    schema,
  });

  const queries = queryFactory(request, db);
  return {
    ...context,
    queries,
  };
};
