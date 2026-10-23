<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Properties live in the Lovable Cloud `properties` table via `src/hooks/use-properties.ts`; admin access is gated in `src/routes/admin/route.tsx` by the `admin` role in `user_roles` (first signup becomes admin via trigger) — RLS enforces it server-side.
