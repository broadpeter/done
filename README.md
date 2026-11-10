# Supabase setup

1. Create a Supabase project. In **SQL Editor**, run:

   ```sql
   create table public.completions (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     completed_at timestamptz not null default now(),
     shape text not null check (shape in ('circle', 'square', 'triangle', 'diamond')),
     color text not null
   );

   create index completions_user_order_idx
     on public.completions (user_id, completed_at, id);

   alter table public.completions enable row level security;

   create policy "Read own completions" on public.completions
     for select to authenticated using ((select auth.uid()) = user_id);
   create policy "Add own completions" on public.completions
     for insert to authenticated with check ((select auth.uid()) = user_id);
   create policy "Remove own completions" on public.completions
     for delete to authenticated using ((select auth.uid()) = user_id);

   grant select, insert, delete on public.completions to authenticated;
   ```

   No update policy is needed. The browser requests only its own rows, and RLS enforces ownership for reads, inserts and deletes. Do not use a service-role key in the browser.

2. In **Authentication > Providers > Email**, enable Email and leave email OTP/magic-link sign-in enabled. The app uses `signInWithOtp`; with Supabase's default confirmation email template, the link uses `{{ .ConfirmationURL }}`. If you customized the template, ensure it still contains that confirmation URL. For production email delivery, configure a custom SMTP provider in **Authentication > SMTP Settings** (the default mail service has limits).

3. In **Authentication > URL Configuration**, set **Site URL** to the URL where you host the app. Add that URL and each local URL you use (for example `http://localhost:8000/`) to **Redirect URLs**. The app redirects magic links to its current page, so include the path if the app lives in a subdirectory; for example `https://example.com/done/index.html`. Supabase may also redirect to `/` when served locally. Use HTTPS in production.

4. In [index.html](index.html), replace `YOUR_SUPABASE_URL` with the project's **Project URL** and `YOUR_SUPABASE_PUBLISHABLE_KEY` with its **publishable key** from **Project Settings > API Keys** (a legacy `anon` key also works). This static app has no build-time environment variables: these two public values are configured in the page itself. Never put a secret/service-role key there.

5. Serve this folder over HTTP(S), such as `python -m http.server 8000`, then visit `http://localhost:8000/`. Opening the HTML directly with `file://` does not provide a usable redirect URL. Sign in with your email, open the link on that same browser to finish authentication, and try Done and Undo. On another browser/device, sign in with the same email to restore the history. Clearing browser data signs you out, but signing in again restores it.

The timer and in-progress task state remain local. A completion appears in the count only after its database insert succeeds; Undo removes it only after the database delete succeeds. Internet access is required to load the Supabase client and sync history.