/**
 * src/lib/connectionTest.js
 *
 * Development-only utility — verifies that the browser can reach
 * the configured Supabase project.
 *
 * Strategy:
 *   We call supabase.from('profiles').select('id').limit(1)
 *   This is a lightweight read-only request.
 *   We don't care about the data — only whether the API responds.
 *   RLS may deny the read; that still confirms the project is reachable.
 *
 * TO REMOVE BEFORE PRODUCTION:
 *   Delete this file and remove the /dev/connection route from AppRouter.jsx.
 */

import { supabase } from './supabaseClient';

/**
 * @typedef {Object} ConnectionResult
 * @property {'connected'|'not_connected'} status
 * @property {string} message
 * @property {string|null} detail
 */

/**
 * Runs a lightweight read-only ping against the Supabase project.
 * @returns {Promise<ConnectionResult>}
 */
export async function testSupabaseConnection() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // 1. Guard: missing env vars
  if (!url || !key) {
    return {
      status: 'not_connected',
      message: 'Environment variables not set.',
      detail:
        'VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY are missing. ' +
        'Copy .env.example → .env.local and fill in your project credentials.',
    };
  }

  // 2. Guard: obviously wrong URL format
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    return {
      status: 'not_connected',
      message: 'VITE_SUPABASE_URL appears invalid.',
      detail: 'Expected format: https://your-project-ref.supabase.co',
    };
  }

  // 3. Lightweight read-only request — limit(1) so it is near-instant.
  //    We probe the 'profiles' table which is a standard HomeIQ table.
  //    A 200 (data or empty) or a 401/403 (RLS denied) both confirm
  //    the project is reachable. Only network errors mean "not connected".
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // RLS policy denial is still a successful connection
    if (error) {
      const isNetworkError =
        error.message?.toLowerCase().includes('fetch') ||
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('failed to');

      if (isNetworkError) {
        return {
          status: 'not_connected',
          message: 'Network error — could not reach Supabase.',
          detail: 'Check your internet connection and verify VITE_SUPABASE_URL is correct.',
        };
      }

      // Any other Supabase API error (404 table, RLS, etc.)
      // still means the API itself responded → connected.
      return {
        status: 'connected',
        message: 'Supabase connection successful.',
        detail: `API responded (table access restricted by policy — this is expected before auth is wired).`,
      };
    }

    return {
      status: 'connected',
      message: 'Supabase connection successful.',
      detail: 'Read-only ping to the HomeIQ project returned successfully.',
    };
  } catch (err) {
    return {
      status: 'not_connected',
      message: 'Connection failed.',
      detail:
        err instanceof TypeError
          ? 'Network request failed. Check internet connection and Supabase URL.'
          : 'Unexpected error during connection test. Check browser console for details (no credentials are logged).',
    };
  }
}

