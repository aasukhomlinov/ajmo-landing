/* Waitlist signup — direct PostgREST insert with the public anon key.
   The table and its RLS (insert-only, no read-back) live in Supabase;
   see supabase/waitlist.sql. The anon key is publishable by design, so
   shipping it in the client bundle is expected — RLS is what protects the
   data, not key secrecy. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type WaitlistResult = 'ok' | 'duplicate' | 'invalid' | 'error';

export async function joinWaitlist(rawEmail: string): Promise<WaitlistResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 320) return 'invalid';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[waitlist] Supabase env vars missing — signup not recorded.');
    return 'error';
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email }),
    });
    if (res.ok) return 'ok';
    // unique index on lower(email) → already signed up; treat as success
    if (res.status === 409) return 'duplicate';
    return 'error';
  } catch {
    return 'error';
  }
}
