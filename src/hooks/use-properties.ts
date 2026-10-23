import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { seeds, slugify, type Property } from "../lib/properties";

const fromRow = (row: any): Property => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  code: row.code,
  type: row.type,
  purpose: row.purpose,
  price: Number(row.price),
  condo: Number(row.condo),
  iptu: Number(row.iptu),
  description: row.description,
  state: row.state,
  city: row.city,
  neighborhood: row.neighborhood,
  // Public views intentionally omit exact-address fields.
  address: row.address ?? "",
  number: row.number ?? "",
  zip: row.zip ?? "",
  complement: row.complement ?? "",
  area: Number(row.area),
  builtArea: Number(row.built_area),
  bedrooms: row.bedrooms,
  suites: row.suites,
  bathrooms: row.bathrooms,
  parking: row.parking,
  features: row.features ?? [],
  published: row.published,
  featured: row.featured,
  status: row.status,
  images: row.images ?? [],
  createdAt: String(row.created_at).slice(0, 10),
});

function toRow(data: Partial<Property>): Record<string, any> {
  const row: Record<string, unknown> = { ...data };
  delete row.id;
  delete row.createdAt;
  delete row.builtArea;
  delete row.slug;
  if (data.builtArea !== undefined) row.built_area = data.builtArea;
  if (data.title) row.slug = slugify(data.title);
  return row;
}

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "O Supabase ainda não está configurado. Conecte o projeto e aplique a migração antes de gerenciar imóveis.",
    );
  }
  return client;
}

export function useProperties({ admin = false }: { admin?: boolean } = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const client = getSupabaseClient();

    // Demo records keep the site previewable before a customer database is connected.
    // Write operations never fall back to local storage.
    if (!client) {
      setProperties(admin ? [] : seeds);
      setReady(true);
      return;
    }

    try {
      const result = admin
        ? await client.from("properties").select("*").order("created_at", { ascending: false })
        : await client
            .from("public_properties")
            .select("*")
            .order("created_at", { ascending: false });

      if (result.error) {
        console.error("[properties] Supabase query failed:", result.error.message);
        setProperties([]);
      } else {
        setProperties((result.data ?? []).map(fromRow));
      }
    } catch (error) {
      console.error("[properties] Could not load properties:", error);
      setProperties([]);
    } finally {
      setReady(true);
    }
  }, [admin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (data: Omit<Property, "id" | "slug" | "createdAt">) => {
    const { data: row, error } = await requireSupabase()
      .from("properties")
      .insert(toRow(data))
      .select()
      .single();

    if (error) {
      console.error("[properties] Insert failed:", error.message);
      throw new Error("Não foi possível salvar o imóvel. Verifique a conexão e as permissões.");
    }
    const property = fromRow(row);
    setProperties((current) => [property, ...current]);
    return property;
  };

  const update = async (id: string, data: Partial<Property>) => {
    const { error } = await requireSupabase().from("properties").update(toRow(data)).eq("id", id);
    if (error) {
      console.error("[properties] Update failed:", error.message);
      throw new Error("Não foi possível atualizar o imóvel. Verifique a conexão e as permissões.");
    }
    await refresh();
  };

  const remove = async (id: string) => {
    const { error } = await requireSupabase().from("properties").delete().eq("id", id);
    if (error) {
      console.error("[properties] Delete failed:", error.message);
      throw new Error("Não foi possível excluir o imóvel. Verifique a conexão e as permissões.");
    }
    setProperties((current) => current.filter((property) => property.id !== id));
  };

  return { properties, ready, create, update, remove };
}
