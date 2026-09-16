/**
 * src/pages/dev/ConnectionStatusPage.jsx
 *
 * DEVELOPMENT ONLY — not part of the customer or technician flow.
 * Route: /dev/connection
 *
 * Remove this page and its route before deploying to production.
 */

import React, { useState, useEffect } from 'react';
import { testSupabaseConnection } from '../../lib/connectionTest';
import './ConnectionStatusPage.css';

const STATUS_IDLE      = 'idle';
const STATUS_LOADING   = 'loading';
const STATUS_CONNECTED = 'connected';
const STATUS_FAILED    = 'not_connected';

export default function ConnectionStatusPage() {
  const [status, setStatus]   = useState(STATUS_IDLE);
  const [result, setResult]   = useState(null);
  const [elapsed, setElapsed] = useState(null);

  const runTest = async () => {
    setStatus(STATUS_LOADING);
    setResult(null);
    setElapsed(null);

    const t0 = performance.now();
    const res = await testSupabaseConnection();
    const ms  = Math.round(performance.now() - t0);

    setResult(res);
    setStatus(res.status);
    setElapsed(ms);
  };

  // Run automatically on mount
  useEffect(() => { runTest(); }, []);

  const url = import.meta.env.VITE_SUPABASE_URL;
  const projectRef = url
    ? url.replace('https://', '').replace('.supabase.co', '')
    : null;

  return (
    <div className="conn-page">
      {/* Dev badge */}
      <div className="conn-dev-badge" aria-label="Development only">DEV ONLY</div>

      <div className="conn-card">
        {/* Brand */}
        <div className="conn-brand">
          <span className="conn-brand__icon" aria-hidden="true">🏠</span>
          <span className="conn-brand__name">HomeIQ</span>
        </div>

        <h1 className="conn-title">Supabase Connection</h1>
        <p className="conn-subtitle">Verifying connection to the HomeIQ Supabase project</p>

        {/* Status indicator */}
        <div className={`conn-status conn-status--${status}`} role="status" aria-live="polite">
          {status === STATUS_LOADING && (
            <>
              <span className="conn-status__spinner" aria-hidden="true" />
              <span className="conn-status__label">Testing connection…</span>
            </>
          )}

          {status === STATUS_CONNECTED && (
            <>
              <span className="conn-status__dot conn-status__dot--green" aria-hidden="true" />
              <span className="conn-status__label">CONNECTED</span>
            </>
          )}

          {status === STATUS_FAILED && (
            <>
              <span className="conn-status__dot conn-status__dot--red" aria-hidden="true" />
              <span className="conn-status__label">NOT CONNECTED</span>
            </>
          )}

          {status === STATUS_IDLE && (
            <span className="conn-status__label">Idle</span>
          )}
        </div>

        {/* Result details */}
        {result && (
          <div className={`conn-result ${status === STATUS_CONNECTED ? 'conn-result--ok' : 'conn-result--err'}`}>
            <p className="conn-result__message">{result.message}</p>
            {result.detail && (
              <p className="conn-result__detail">{result.detail}</p>
            )}
          </div>
        )}

        {/* Project info (safe — only shows project ref, never the key) */}
        {projectRef && (
          <div className="conn-info">
            <dl className="conn-info__list">
              <div className="conn-info__row">
                <dt>Project ref</dt>
                <dd><code>{projectRef}</code></dd>
              </div>
              <div className="conn-info__row">
                <dt>Endpoint</dt>
                <dd><code>*.supabase.co</code></dd>
              </div>
              {elapsed !== null && (
                <div className="conn-info__row">
                  <dt>Response time</dt>
                  <dd><code>{elapsed} ms</code></dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Missing env vars help */}
        {!url && (
          <div className="conn-help">
            <p className="conn-help__title">Environment variables not found</p>
            <p className="conn-help__text">
              Copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase URL and publishable key, then restart the dev server.
            </p>
            <pre className="conn-help__code">{`VITE_SUPABASE_URL=https://your-ref.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
          </div>
        )}

        {/* Retry button */}
        <button
          className="conn-retry"
          onClick={runTest}
          disabled={status === STATUS_LOADING}
          type="button"
        >
          {status === STATUS_LOADING ? 'Testing…' : 'Re-test connection'}
        </button>

        {/* Dev note */}
        <p className="conn-note">
          This page is for development verification only and is not part of the
          customer or technician UI. Remove <code>/dev/connection</code> before deploying to production.
        </p>
      </div>
    </div>
  );
}

