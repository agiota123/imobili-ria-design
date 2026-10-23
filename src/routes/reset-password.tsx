import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, LockKeyhole } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | Morada" },
      { name: "description", content: "Defina uma nova senha para a área administrativa." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("A autenticação ainda não foi configurada neste ambiente.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        setError("O link pode ter expirado. Solicite uma nova recuperação de senha.");
        return;
      }
      setNotice("Senha atualizada. Redirecionando para o painel...");
      await navigate({ to: "/admin" });
    } catch {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="public-site flex min-h-[100dvh] flex-col bg-[#f5f4ee] text-[#293f33]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="/" className="site-brand" aria-label="Morada Imobiliária — página inicial">
          <span className="brand-mark"><Building2 size={20} /></span>
          <span><b>morada</b><small>IMOBILIÁRIA</small></span>
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <form onSubmit={submit} className="flex w-full max-w-[450px] flex-col gap-5 rounded-[28px] border border-[#e4e7df] bg-white p-6 shadow-[0_24px_80px_rgba(35,55,40,0.09)] sm:p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf1e9] text-[#293f33]"><LockKeyhole size={21} /></span>
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#859080]">SEGURANÇA DA CONTA</p>
            <h1 className="font-serif text-3xl leading-tight tracking-[-0.035em] text-[#293f33]">Defina uma nova senha.</h1>
            <p className="mt-3 text-sm leading-6 text-[#798176]">Use uma senha exclusiva com pelo menos 10 caracteres.</p>
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#3f5043]" htmlFor="new-password">
            Nova senha
            <input id="new-password" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fcfcfa] px-4 text-sm font-normal outline-none transition focus:border-[#879783] focus:ring-4 focus:ring-[#eaf0e7]" />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#3f5043]" htmlFor="confirm-password">
            Confirmar senha
            <input id="confirm-password" type="password" required minLength={10} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 w-full rounded-xl border border-[#e1e5dc] bg-[#fcfcfa] px-4 text-sm font-normal outline-none transition focus:border-[#879783] focus:ring-4 focus:ring-[#eaf0e7]" />
          </label>
          {error && <p role="alert" aria-live="polite" className="rounded-xl border border-[#efd8d3] bg-[#fff7f5] px-3.5 py-3 text-xs leading-5 text-[#994638]">{error}</p>}
          {notice && <p role="status" aria-live="polite" className="rounded-xl border border-[#dce8d8] bg-[#f5f9f2] px-3.5 py-3 text-xs leading-5 text-[#426345]">{notice}</p>}
          <button type="submit" disabled={busy} className="group inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#293f33] px-5 text-sm font-semibold text-white transition hover:bg-[#1f3428] focus:outline-none focus:ring-4 focus:ring-[#dfe8dc] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Salvando..." : "Atualizar senha"}
            {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>
      </main>
      <footer className="px-5 pb-5 text-center text-[10px] text-[#92998d]">© 2026 Morada Imobiliária</footer>
    </div>
  );
}
