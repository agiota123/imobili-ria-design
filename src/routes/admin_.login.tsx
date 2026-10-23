import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Área do proprietário | Morada" },
      { name: "description", content: "Acesso restrito ao painel de gestão de imóveis da Morada." },
      { property: "og:title", content: "Entrar — Área do proprietário | Morada" },
      { property: "og:description", content: "Acesso restrito ao painel de gestão de imóveis da Morada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [canSignup, setCanSignup] = useState(false);
  const [email, setEmail] = useState(""), [pass, setPass] = useState("");
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("erro") === "sem-acesso") setErr("Esta conta não tem acesso ao painel.");
    supabase.rpc("admin_exists").then(({ data }) => setCanSignup(data === false));
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/admin" }); });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        nav({ to: "/admin" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin + "/admin" } });
        if (error) throw error;
        setMsg("Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre."); setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setMsg("Se o e-mail existir, enviamos um link para redefinir a senha.");
      }
    } catch (e: any) {
      setErr(e.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : e.message);
    } finally { setBusy(false); }
  };

  const title = mode === "login" ? "Bem-vindo de volta." : mode === "signup" ? "Crie o acesso do proprietário." : "Recuperar senha.";
  return (
    <div className="public-site" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="detail-header">
        <a href="/" className="site-brand"><span className="brand-mark"><Building2 /></span><span><b>morada</b><small>IMOBILIÁRIA</small></span></a>
        <a href="/" className="back-link"><ArrowLeft size={15} /> Voltar ao site</a>
      </header>
      <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 5vw" }}>
        <form onSubmit={submit} className="admin-panel" style={{ width: "100%", maxWidth: 420, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="brand-mark"><Lock size={18} /></span>
          <div>
            <p className="eyebrow">— ÁREA DO PROPRIETÁRIO</p>
            <h1 style={{ font: "32px Georgia, serif", margin: 0, color: "var(--forest)" }}>{title}</h1>
          </div>
          <label className="field"><span>E-mail</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          {mode !== "forgot" && <label className="field"><span>Senha</span><input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
          {err && <p role="alert" style={{ color: "#a33", fontSize: 12, margin: 0 }}>{err}</p>}
          {msg && <p style={{ color: "var(--forest)", fontSize: 12, margin: 0 }}>{msg}</p>}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar acesso" : "Enviar link"} <ArrowRight size={16} />
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#687167" }}>
            {mode === "login" ? <button type="button" onClick={() => setMode("forgot")} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}>Esqueci minha senha</button>
              : <button type="button" onClick={() => setMode("login")} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}>Voltar ao login</button>}
            {canSignup && mode === "login" && <button type="button" onClick={() => setMode("signup")} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--forest)", fontWeight: 700 }}>Primeiro acesso</button>}
          </div>
        </form>
      </main>
    </div>
  );
}
