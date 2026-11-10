# Rise Supabase setup

Rise uses the same Supabase project and account as the original app, but stores its history in `public.rise_activities`. The original app continues using `public.completions`. Undo and Clear in Rise only affect Rise history. Rise starts with empty history; nothing is copied or deleted from the original table.

1. Open your **existing Supabase project**. In **SQL Editor**, create a new query and run this once:

   ```sql
  create table public.rise_activities (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     completed_at timestamptz not null default now(),
      is_completed boolean not null default true,
     shape text not null check (shape in ('circle', 'square', 'triangle', 'diamond')),
     color text not null
   );

   create index rise_activities_user_order_idx
     on public.rise_activities (user_id, completed_at, id);

   alter table public.rise_activities enable row level security;

   create policy "Read own Rise activities" on public.rise_activities
     for select to authenticated using ((select auth.uid()) = user_id);
  create policy "Add own Rise activities" on public.rise_activities
     for insert to authenticated with check ((select auth.uid()) = user_id);
  create policy "Remove own Rise activities" on public.rise_activities
     for delete to authenticated using ((select auth.uid()) = user_id);

  grant select, insert, delete on public.rise_activities to authenticated;
   ```

   No update policy is needed. The browser requests only its own rows, and RLS enforces ownership for reads, inserts and deletes. Do not use a service-role key in the browser.

2. Keep your existing email sign-in configuration. Rise uses `signInWithOtp`, just like the original app. No new account or Supabase project is needed.

3. In **Authentication > URL Configuration > Redirect URLs**, add the exact URL you will use for Rise, for example `https://example.com/rise/`. If you also open `https://example.com/rise/index.html`, add that URL too. Keep the original app's URLs and **Site URL** unchanged. For local testing, add the exact local URL as well. The app redirects magic links to its current origin and path. Use HTTPS in production.

4. [index.html](index.html) already contains the copied project's URL and public publishable key. Leave them unchanged when using that same project. Never put a secret/service-role key in the browser.

5. Deploy Rise in a separate, non-nested folder from the original app, such as `/rise/` and `/original/`, so their service-worker scopes do not overlap. Rise uses its own `rise-` cache namespace. If the original app has a root-scoped service worker, it can still control `/rise/`; move it to its own folder or host Rise on a separate subdomain.

6. Open Rise over HTTP(S), sign in with your usual email, and open the magic link in the same browser. Record a Done and a Not done, then check that the original app's history is unchanged. Sign in on another device with the same email to see your Rise history there. Skip should add no entry. Undo and Clear should only change Rise history.

## Activity outcomes

You do not need the earlier `is_completed` migration on `public.completions` for this setup. If you already ran it, leave it in place; it is compatible with the original app.

Start opens one five-minute timer. Done saves a filled white circle; Not done saves an outlined white circle; Skip stops the timer and returns home without saving anything. The history count separates Done and Not done, and Undo removes the latest saved outcome.

The timer and in-progress task state remain local. An outcome appears in history only after its database insert succeeds; Undo removes it only after the database delete succeeds. Internet access is required to load the Supabase client and sync history.