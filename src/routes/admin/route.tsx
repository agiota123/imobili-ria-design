import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSupabaseClient } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const client = getSupabaseClient();
    if (!client) throw redirect({ to: "/admin/login" });

    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });

    // Role comes from the database, never from editable user metadata.
    const { data: role, error: roleError } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !role) {
      await client.auth.signOut();
      throw redirect({ to: "/admin/login", search: { erro: "sem-acesso" } as any });
    }
  },
  component: () => <Outlet />,
});
