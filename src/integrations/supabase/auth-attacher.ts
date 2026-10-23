import { createMiddleware } from "@tanstack/react-start";
import { getSupabaseClient } from "./client";

// Attach the authenticated Supabase session to server functions when configured.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const client = getSupabaseClient();
    const sessionResult = client ? await client.auth.getSession() : null;
    const token = sessionResult?.data.session?.access_token;

    return next({
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
  },
);
