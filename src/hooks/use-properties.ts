import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, type Property } from "../lib/properties";

// Converts a database row into the Property shape used across the site.
const fromRow = (r: any): Property => ({
  id: r.id, slug: r.slug, title: r.title, code: r.code, type: r.type, purpose: r.purpose,
  price: Number(r.price), condo: Number(r.condo), iptu: Number(r.iptu), description: r.description,
  state: r.state, city: r.city, neighborhood: r.neighborhood, address: r.address, number: r.number,
  zip: r.zip, complement: r.complement, area: Number(r.area), builtArea: Number(r.built_area),
  bedrooms: r.bedrooms, suites: r.suites, bathrooms: r.bathrooms, parking: r.parking,
  features: r.features ?? [], published: r.published, featured: r.featured, status: r.status,
  images: r.images ?? [], createdAt: String(r.created_at).slice(0, 10),
});

const toRow = (d: Partial<Property>) => {
  const { id, createdAt, builtArea, slug, ...rest } = d as any;
  const row: any = { ...rest };
  if (builtArea !== undefined) row.built_area = builtArea;
  if (d.title) row.slug = slugify(d.title);
  return row;
};

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (error) console.error(error);
    setProperties((data ?? []).map(fromRow));
    setReady(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (d: Omit<Property, "id" | "slug" | "createdAt">) => {
    const { data, error } = await supabase.from("properties").insert(toRow(d)).select().single();
    if (error) { alert("Erro ao salvar: " + error.message); throw error; }
    const p = fromRow(data);
    setProperties((a) => [p, ...a]);
    return p;
  };
  const update = async (id: string, d: Partial<Property>) => {
    const { error } = await supabase.from("properties").update(toRow(d)).eq("id", id);
    if (error) { alert("Erro ao salvar: " + error.message); throw error; }
    await refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    setProperties((a) => a.filter((p) => p.id !== id));
  };
  return { properties, ready, create, update, remove };
}
