import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | Morada" },
      { name: "description", content: "Defina uma nova senha para a área do proprietário." },
      { property: "og:title", content: "Nova senha | Morada" },
      { property: "og:description", content: "Defina uma nova senha para a área do proprietário." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pass, setPass] = useState(""), [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) return setErr(error.message);
    nav({ to: "/admin" });
  };
  return (
    <div className="public-site" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={submit} className="admin-panel" style={{ width: "100%", maxWidth: 420, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="brand-mark"><Building2 size={18} /></span>
        <h1 style={{ font: "30px Georgia, serif", margin: 0, color: "var(--forest)" }}>Defina sua nova senha.</h1>
        <label className="field"><span>Nova senha</span><input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></label>
        {err && <p role="alert" style={{ color: "#a33", fontSize: 12, margin: 0 }}>{err}</p>}
        <button className="primary-btn" type="submit">Salvar senha <ArrowRight size={16} /></button>
      </form>
    </div>
  );
}
