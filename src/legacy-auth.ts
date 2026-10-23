import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Listing = {
  id: string;
  slug?: string;
  title: string;
  code: string;
  type: string;
  purpose: string;
  price: number;
  condo: number;
  iptu?: number;
  description?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  number?: string;
  zip?: string;
  complement?: string;
  area?: number;
  builtArea?: number;
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parking?: number;
  features?: string[];
  published?: boolean;
  featured?: boolean;
  status?: string;
  images?: string[];
  createdAt?: string;
};

type VerifyResult = { authorized: boolean; email?: string };
type MoradaBackendApi = {
  configured: boolean;
  login(email: string, password: string): Promise<VerifyResult>;
  verifyAdmin(): Promise<VerifyResult>;
  logout(): Promise<void>;
  recoverPassword(email: string, origin: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  getProperties(admin?: boolean): Promise<Listing[] | null>;
  replaceProperties(previous: Listing[], next: Listing[]): Promise<Listing[]>;
  uploadImage(file: File): Promise<string>;
};

declare global {
  interface Window {
    MoradaBackend?: MoradaBackendApi;
    __MORADA_BACKEND_READY__?: Promise<void>;
    __MORADA_BACKEND_RESOLVE__?: () => void;
    __MORADA_PROPERTIES_OVERRIDE__?: Listing[];
    __MORADA_ADMIN_AUTHORIZED__?: boolean;
    __MORADA_ADMIN_EMAIL__?: string;
  }
}

const env = import.meta.env as Record<string, string | undefined>;
const enabled = env["VITE_SUPABASE_ENABLED"] === "true";
const tenantSlug = env["VITE_TENANT_SLUG"]?.trim().toLowerCase() || "";
let tenantIdPromise: Promise<string> | null = null;
const projectUrl = env["VITE_SUPABASE_URL"]?.trim() || "";
const publishableKey =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
  env["VITE_SUPABASE_ANON_KEY"]?.trim() ||
  "";

let client: SupabaseClient | null = null;
if (enabled && projectUrl && publishableKey) {
  try {
    client = createClient(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error("[Morada] Supabase configuration is invalid.", error);
  }
}

async function getTenantId(): Promise<string> {
  if (!client) throw new Error("O banco ainda não está configurado.");
  if (!tenantSlug) throw new Error("Falta configurar VITE_TENANT_SLUG para este site.");
  if (!tenantIdPromise) {
    tenantIdPromise = client.from("organizations" as any).select("id").eq("slug", tenantSlug).single()
      .then(({ data, error }: any) => {
        if (error || !data?.id) throw new Error("Não foi possível identificar a imobiliária deste site.");
        return String(data.id);
      });
  }
  return tenantIdPromise;
}

const makeSlug = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function fromRow(row: any): Listing {
  return {
    id: String(row.id),
    slug: row.slug || makeSlug(row.title || ""),
    title: row.title || "",
    code: row.code || "",
    type: row.type || "Casa",
    purpose: row.purpose || "Venda",
    price: Number(row.price) || 0,
    condo: Number(row.condo) || 0,
    iptu: Number(row.iptu) || 0,
    description: row.description || "",
    state: row.state || "",
    city: row.city || "",
    neighborhood: row.neighborhood || "",
    address: row.address || "",
    number: row.number || "",
    zip: row.zip || "",
    complement: row.complement || "",
    area: Number(row.area) || 0,
    builtArea: Number(row.built_area) || 0,
    bedrooms: Number(row.bedrooms) || 0,
    suites: Number(row.suites) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    parking: Number(row.parking) || 0,
    features: Array.isArray(row.features) ? row.features : [],
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    status: row.status || "Disponível",
    images: Array.isArray(row.images) ? row.images : [],
    createdAt: String(row.created_at || new Date().toISOString()).slice(0, 10),
  };
}

function toRow(listing: Listing, tenantId: string): Record<string, unknown> {
  return {
    tenant_id: tenantId,
    slug: listing.slug || makeSlug(listing.title || ""),
    title: listing.title,
    code: listing.code,
    type: listing.type || "Casa",
    purpose: listing.purpose || "Venda",
    price: Number(listing.price) || 0,
    condo: Number(listing.condo) || 0,
    iptu: Number(listing.iptu) || 0,
    description: listing.description || "",
    state: listing.state || "",
    city: listing.city || "",
    neighborhood: listing.neighborhood || "",
    address: listing.address || "",
    number: listing.number || "",
    zip: listing.zip || "",
    complement: listing.complement || "",
    area: Number(listing.area) || 0,
    built_area: Number(listing.builtArea) || 0,
    bedrooms: Number(listing.bedrooms) || 0,
    suites: Number(listing.suites) || 0,
    bathrooms: Number(listing.bathrooms) || 0,
    parking: Number(listing.parking) || 0,
    features: Array.isArray(listing.features) ? listing.features : [],
    published: Boolean(listing.published),
    featured: Boolean(listing.featured),
    status: listing.status || "Disponível",
    images: Array.isArray(listing.images) ? listing.images : [],
  };
}

function requireClient() {
  if (!client) {
    throw new Error("O banco ainda não está configurado para esta implantação.");
  }
  return client;
}

async function verifyAdmin(): Promise<VerifyResult> {
  if (!client) return { authorized: false };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { authorized: false };
  let tenantId: string;
  try { tenantId = await getTenantId(); } catch { return { authorized: false, email: data.user.email || "" }; }
  const { data: role, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("organization_id" as any, tenantId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) return { authorized: false, email: data.user.email || "" };
  return { authorized: true, email: data.user.email || "" };
}

async function requireAdmin() {
  const result = await verifyAdmin();
  if (!result.authorized) {
    throw new Error("A sessão não tem permissão de administrador. Entre novamente com uma conta autorizada.");
  }
  return result;
}

const backend: MoradaBackendApi = {
  configured: Boolean(client && tenantSlug),

  async login(email, password) {
    const supabase = requireClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error("login-invalido");

    const result = await verifyAdmin();
    if (!result.authorized) {
      await supabase.auth.signOut();
      throw new Error("sem-acesso");
    }
    return result;
  },

  verifyAdmin,

  async logout() {
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
  },

  async recoverPassword(email, origin) {
    const supabase = requireClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: origin + "/reset-password",
    });
    if (error) throw new Error("Não foi possível solicitar a recuperação agora.");
  },

  async updatePassword(password) {
    const supabase = requireClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error("O link pode ter expirado. Solicite uma nova recuperação.");
  },

  async getProperties(admin = false) {
    if (!client) {
      if (admin) throw new Error("O banco ainda não está configurado.");
      return null;
    }
    if (admin) await requireAdmin();

    const tenantId = await getTenantId();
    const result = admin
      ? await client.from("properties").select("*").eq("tenant_id" as any, tenantId).order("created_at", { ascending: false })
      : await client.from("public_properties").select("*").eq("tenant_id" as any, tenantId).order("created_at", { ascending: false });

    if (result.error) {
      console.error("[Morada] Could not load properties:", result.error.message);
      throw new Error("Não foi possível carregar os imóveis.");
    }
    return (result.data || []).map(fromRow);
  },

  async replaceProperties(previous, next) {
    const supabase = requireClient();
    await requireAdmin();
    const tenantId = await getTenantId();

    // Demo fixtures can have non-UUID IDs. Only UUIDs are persisted-row identities;
    // never send fixture IDs to Postgres or attempt to delete fixture rows.
    const isUuid = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const oldById = new Map(previous.filter((item) => isUuid(String(item.id))).map((item) => [String(item.id), item]));
    const nextPersisted = next.filter((item) => isUuid(String(item.id)));
    const newById = new Map(nextPersisted.map((item) => [String(item.id), item]));

    for (const [id] of oldById) {
      if (newById.has(id)) continue;
      const { error } = await supabase.from("properties").delete().eq("id", id).eq("tenant_id" as any, tenantId);
      if (error) throw new Error("Não foi possível excluir o imóvel.");
    }

    for (const item of next) {
      const id = String(item.id);
      const old = isUuid(id) ? oldById.get(id) : undefined;
      const body = toRow(item, tenantId);
      if (old && JSON.stringify(toRow(old, tenantId)) === JSON.stringify(body)) continue;

      const result = old
        ? await supabase.from("properties").update(body as any).eq("id", id).eq("tenant_id" as any, tenantId)
        : await supabase.from("properties").insert(body as any);

      if (result.error) {
        console.error("[Morada] Could not save property:", result.error.message);
        throw new Error("Não foi possível salvar o imóvel. Verifique a conexão e as permissões.");
      }
    }

    const saved = await backend.getProperties(true);
    return saved || [];
  },

  async uploadImage(file) {
    const supabase = requireClient();
    await requireAdmin();
    await getTenantId();
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "imagem";
    const path = tenantSlug + "/" + crypto.randomUUID() + "-" + safeName;
    const { error } = await supabase.storage.from("property-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error("Não foi possível enviar a foto. Verifique o formato e tente novamente.");
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("A foto foi enviada, mas não foi possível gerar o endereço público.");
    return data.publicUrl;
  }
};

window.MoradaBackend = backend;
window.__MORADA_BACKEND_RESOLVE__?.();
