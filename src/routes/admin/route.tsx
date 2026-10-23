import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Guards every /admin page: only signed-in users with the admin role get through.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    if (!role) {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin/login", search: { erro: "sem-acesso" } as any });
    }
  },
  component: () => <Outlet />,
});
