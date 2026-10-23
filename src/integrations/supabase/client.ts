import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

type Config = { url: string; key: string };

function readConfig(): Config {
  const vite = import.meta.env as Record<string, string | undefined>;
  const server = typeof process !== "undefined" ? process.env : undefined;
  return {
    url: vite["VITE_SUPABASE_URL"]?.trim() || server?.["SUPABASE_URL"]?.trim() || "",
    key:
      vite["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
      vite["VITE_SUPABASE_ANON_KEY"]?.trim() ||
      server?.["SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
      server?.["SUPABASE_ANON_KEY"]?.trim() ||
      "",
  };
}

export function isSupabaseConfigured(): boolean {
  const config = readConfig();
  return Boolean(config.url && config.key);
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, "");
  const serverUrl =
    typeof window === "undefined" && typeof process !== "undefined"
      ? process.env["SUPABASE_URL"]?.replace(/\/+$/, "")
      : undefined;

  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === "Bearer " + supabaseKey
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);

    if (
      serverUrl &&
      serverUrl !== publicUrl &&
      typeof process !== "undefined" &&
      process.env["SUPABASE_PUBLISHABLE_KEY"] === supabaseKey
    ) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(publicUrl + "/")) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request =
          typeof input === "string" || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }
    return fetch(input, { ...init, headers });
  };
}

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient) return cachedClient;
  const { url, key } = readConfig();
  if (!url || !key) return null;

  cachedClient = createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(url, key) },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

// Lazy compatibility proxy. Without configuration, accesses fail clearly rather than
// pretending that authentication or persistence succeeded.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      );
    }
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
