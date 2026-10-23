import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

type LoginMode = "login" | "forgot";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso administrativo | Morada" },
      { name: "description", content: "Acesso protegido à área administrativa da Morada Imobiliária." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).get("erro") === "sem-acesso") {
      setError("Esta conta não tem permissão para acessar o painel.");
    }

    const client = getSupabaseClient();
    if (client) {
      void client.auth.getUser().then(({ data, error: authError }) => {
        if (active && !authError && data.user) void navigate({ to: "/admin" });
      }).catch(() => {
        // Keep the login available if the existing session cannot be verified.
      });
    }

    return () => { active = false; };
  }, [navigate]);

  const changeMode = (next: LoginMode) => {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const client = getSupabaseClient();
      if (!client) {
        setError("O login ainda não está conectado ao Supabase. Configure as variáveis de ambiente e aplique a migração de segurança.");
        return;
      }

      if (mode === "login") {
        const { error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError("Não foi possível entrar. Confira seus dados e tente novamente.");
          return;
        }

        await navigate({ to: "/admin" });
        return;
      }

      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (resetError) {
        setError("Não foi possível solicitar a recuperação. Tente novamente mais tarde.");
        return;
      }
      setNotice("Se houver uma conta vinculada a esse e-mail, enviaremos as instruções de recuperação.");
    } catch {
      setError("O serviço de autenticação não respondeu. Confira a configuração e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="public-site flex min-h-[100dvh] flex-col bg-[#f5f4ee] text-[#293f33]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="/" className="site-brand" aria-label="Morada Imobiliária — página inicial">
          <span className="brand-mark"><Building2 size={20} /></span>
          <span><b>morada</b><small>IMOBILIÁRIA</small></span>
        </a>
        <a href="/" className="inline-flex items-center gap-2 rounded-full border border-[#dfe4db] bg-white/70 px-4 py-2.5 text-xs font-semibold text-[#526255] transition hover:bg-white">
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Voltar ao site</span>
          <span className="sm:hidden">Voltar</span>
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center px-4 pb-8 sm:px-8 sm:pb-12 lg:px-10">
        <section className="grid w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-[#e4e7df] bg-white shadow-[0_24px_80px_rgba(35,55,40,0.09)] lg:min-h-[620px] lg:grid-cols-[0.94fr_1.06fr]">
          <div className="relative min-h-[180px] overflow-hidden bg-[#253c30] sm:min-h-[225px] lg:min-h-[620px]">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=90"
              alt="Casa contemporânea com jardim"
              className="absolute inset-0 h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17281f]/95 via-[#17281f]/35 to-[#17281f]/10" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-2 text-[9px] font-semibold tracking-[0.12em] text-white sm:left-7 sm:top-6">
              <ShieldCheck size={13} />
              MORADA · ACESSO SEGURO
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-white sm:bottom-8 sm:left-8 sm:right-8 lg:bottom-12 lg:left-10 lg:right-10">
              <p className="mb-2 text-[9px] font-bold tracking-[0.2em] text-white/75">SEU PRÓXIMO CAPÍTULO</p>
              <h2 className="max-w-sm font-serif text-2xl leading-tight tracking-tight sm:text-3xl lg:text-[42px]">
                Boas escolhas começam com cuidado.
              </h2>
              <p className="mt-3 hidden max-w-sm text-sm leading-7 text-white/75 lg:block">
                Um espaço reservado para organizar seus imóveis, atualizar anúncios e acompanhar cada detalhe.
              </p>
            </div>
          </div>

          <div className="flex items-center px-5 py-8 sm:px-9 sm:py-10 lg:px-12 xl:px-16">
            <form onSubmit={submit} className="mx-auto flex w-full max-w-[390px] flex-col gap-5" aria-describedby="auth-context">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf1e9] text-[#293f33]">
                <LockKeyhole size={21} strokeWidth={1.8} />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#859080]">ÁREA DO PROPRIETÁRIO</p>
                <h1 className="font-serif text-3xl leading-tight tracking-[-0.035em] text-[#293f33] sm:text-[38px]">
                  {mode === "login" ? "Bem-vindo de volta." : "Recupere seu acesso."}
                </h1>
                <p id="auth-context" className="mt-3 text-sm leading-6 text-[#798176]">
                  {mode === "login"
                    ? "Entre para gerenciar seus imóveis e manter seus anúncios sempre atualizados."
                    : "Informe o e-mail da sua conta e enviaremos as instruções para redefinir a senha."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="admin-email" className="text-xs font-semibold text-[#3f5043]">E-mail</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9487]" />
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com.br"
                    className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fcfcfa] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#a6ada1] focus:border-[#879783] focus:ring-4 focus:ring-[#eaf0e7]"
                  />
                </div>
              </div>

              {mode === "login" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="admin-password" className="text-xs font-semibold text-[#3f5043]">Senha</label>
                    <button type="button" onClick={() => changeMode("forgot")} className="text-xs font-semibold text-[#657a65] underline-offset-4 transition hover:text-[#293f33] hover:underline">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9487]" />
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Digite sua senha"
                      className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fcfcfa] pl-11 pr-12 text-sm outline-none transition placeholder:text-[#a6ada1] focus:border-[#879783] focus:ring-4 focus:ring-[#eaf0e7]"
                    />
                    <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#7e897b] transition hover:bg-[#edf1e9]">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p role="alert" aria-live="polite" className="rounded-xl border border-[#efd8d3] bg-[#fff7f5] px-3.5 py-3 text-xs leading-5 text-[#994638]">{error}</p>}
              {notice && <p role="status" aria-live="polite" className="rounded-xl border border-[#dce8d8] bg-[#f5f9f2] px-3.5 py-3 text-xs leading-5 text-[#426345]">{notice}</p>}

              {!configured && (
                <p className="rounded-xl border border-[#ece6d6] bg-[#faf8f0] px-3.5 py-3 text-xs leading-5 text-[#786d4f]">
                  Prévia visual: conecte o Supabase e aplique a migração para ativar a autenticação neste ambiente.
                </p>
              )}

              <button type="submit" disabled={busy} className="group mt-1 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#293f33] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(41,63,51,0.16)] transition hover:bg-[#1f3428] focus:outline-none focus:ring-4 focus:ring-[#dfe8dc] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Aguarde..." : mode === "login" ? "Entrar no painel" : "Enviar instruções"}
                {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
              </button>

              {mode === "forgot" && (
                <button type="button" onClick={() => changeMode("login")} className="self-center rounded-lg px-3 py-2 text-xs font-semibold text-[#657264] transition hover:bg-[#f5f6f1]">
                  Voltar ao login
                </button>
              )}

              <div className="mt-1 flex items-center justify-center gap-2 border-t border-[#eff0eb] pt-5 text-[10px] text-[#8a9286]">
                <ShieldCheck size={14} />
                Acesso restrito a usuários autorizados
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-2 px-5 pb-5 text-[10px] text-[#92998d] sm:flex-row sm:px-8 lg:px-10">
        <span>© 2026 Morada Imobiliária</span>
        <span>Privacidade e segurança em cada acesso</span>
      </footer>
    </div>
  );
}
