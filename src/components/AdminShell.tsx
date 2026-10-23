import { useEffect, useState, type ReactNode } from "react";
import { Building2, LayoutDashboard, House, Plus, Settings, LogOut } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";

export function AdminShell({
  children,
  active = "dashboard",
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  active?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? "");
    }).catch(() => {
      // The protected parent route handles an unauthenticated session.
    });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) await client.auth.signOut();
    } finally {
      window.location.replace("/admin/login");
    }
  };

  const links = [
    ["/admin", "Visão geral", "dashboard", LayoutDashboard],
    ["/admin/imoveis", "Imóveis", "properties", House],
    ["/admin/imoveis/novo", "Adicionar imóvel", "new", Plus],
    ["/admin/configuracoes", "Configurações", "settings", Settings],
  ] as const;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <span className="brand-mark"><Building2 size={20} /></span>
          <span><b>morada</b><small>IMOBILIÁRIA</small></span>
        </a>
        <p className="sidebar-label">ESPAÇO DE GESTÃO</p>
        <nav aria-label="Navegação administrativa">
          {links.map(([href, label, key, Icon]) => (
            <a key={key} href={href} className={active === key ? "side-link active" : "side-link"}>
              <Icon size={17} />{label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="admin-avatar">M</span>
          <span className="min-w-0">
            <b>Administrador</b>
            <small className="block max-w-[145px] truncate" title={email || "Sessão autenticada"}>
              {email || "Sessão autenticada"}
            </small>
          </span>
          <button
            type="button"
            aria-label="Sair do painel"
            title="Sair"
            onClick={logout}
            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-[#7c8679] transition hover:bg-[#edf1e9] hover:text-[#293f33]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <a href="/" className="mobile-admin-brand"><Building2 size={19} /> morada</a>
          <span className="topbar-note">● Área administrativa</span>
          <a href="/" className="view-site-link">Visualizar site ↗</a>
        </header>
        <div className="admin-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PAINEL ADMINISTRATIVO</p>
              <h1>{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="heading-actions">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
