const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { verifyEmailService } = require('./emailService');

const CHECK_TIMEOUT_MS = 8000;

/** Rejects if the promise takes longer than ms. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Each check returns { status: 'ok' | 'warning' | 'error', message, hint? }.
 * Never include secret values in messages.
 */

async function checkEnvironment() {
  const required = {
    DATABASE_URL: 'PostgreSQL/Supabase connection string',
    JWT_SECRET: 'Secret used to sign login tokens'
  };
  const missing = Object.keys(required).filter((k) => !process.env[k]);
  if (missing.length) {
    return {
      status: 'error',
      message: `Missing required environment variables: ${missing.join(', ')}`,
      hint: 'Set them in back-end/.env (local) or the hosting dashboard (production).'
    };
  }
  const warnings = [];
  if (process.env.JWT_SECRET.length < 16 || /change_this|your_super_secret/i.test(process.env.JWT_SECRET)) {
    warnings.push('JWT_SECRET looks weak or is still the example value');
  }
  if (process.env.NODE_ENV !== 'production') {
    warnings.push(`NODE_ENV is "${process.env.NODE_ENV || 'unset'}" (expected "production" when deployed)`);
  }
  if (warnings.length) return { status: 'warning', message: warnings.join('; ') };
  return { status: 'ok', message: 'All required environment variables are set' };
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    return { status: 'error', message: 'DATABASE_URL is not set' };
  }
  const started = Date.now();
  try {
    await withTimeout(db.query('SELECT 1'), CHECK_TIMEOUT_MS, 'Database query');
    return { status: 'ok', message: `Connected (${Date.now() - started}ms)` };
  } catch (error) {
    let hint = 'Check DATABASE_URL and that the database is running and reachable.';
    if (error.code === '28P01') hint = 'Wrong database password in DATABASE_URL.';
    else if (error.code === 'ENOTFOUND') hint = 'Database host not found. Check the host in DATABASE_URL.';
    else if (error.code === 'ECONNREFUSED') hint = 'Database refused the connection. Check host/port.';
    else if (/timed out/i.test(error.message)) hint = 'Database did not respond in time. Check network or Supabase project status (free projects pause when idle).';
    return { status: 'error', message: `${error.code ? error.code + ': ' : ''}${error.message}`, hint };
  }
}

async function checkDatabaseTables() {
  const expected = ['users', 'products', 'categories', 'orders', 'order_items', 'billings'];
  try {
    const result = await withTimeout(
      db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)",
        [expected]
      ),
      CHECK_TIMEOUT_MS,
      'Table check'
    );
    const found = result.rows.map((r) => r.table_name);
    const missing = expected.filter((t) => !found.includes(t));
    if (missing.length) {
      return {
        status: 'warning',
        message: `Tables not found: ${missing.join(', ')}`,
        hint: 'Run the migration/schema scripts (see database/schema.sql and back-end/migrate.js).'
      };
    }
    return { status: 'ok', message: 'Core tables exist' };
  } catch (error) {
    return { status: 'error', message: `Could not inspect tables: ${error.message}` };
  }
}

async function checkEmail() {
  try {
    const result = await withTimeout(verifyEmailService(), CHECK_TIMEOUT_MS, 'Email check');
    if (result.ok) return { status: 'ok', message: 'SMTP login verified; verification codes can be emailed' };
    // Not configured = simulator mode: a warning; configured-but-failing = real error.
    return {
      status: result.configured ? 'error' : 'warning',
      message: result.error,
      hint: result.hint
    };
  } catch (error) {
    return { status: 'error', message: error.message, hint: 'SMTP server did not respond in time.' };
  }
}

async function checkFrontend() {
  const frontendPath = path.join(__dirname, '../../frontend');
  const indexFile = path.join(frontendPath, 'pages/index.html');
  if (!fs.existsSync(frontendPath)) {
    return { status: 'error', message: 'frontend/ folder not found next to back-end/' };
  }
  if (!fs.existsSync(indexFile)) {
    return { status: 'error', message: 'frontend/pages/index.html is missing' };
  }
  return { status: 'ok', message: 'Frontend files found' };
}

/** Runs every check in parallel; one failing check never hides the others. */
async function runHealthChecks() {
  const checks = {
    environment: checkEnvironment,
    database: checkDatabase,
    databaseTables: checkDatabaseTables,
    email: checkEmail,
    frontend: checkFrontend
  };

  const names = Object.keys(checks);
  const settled = await Promise.all(
    names.map(async (name) => {
      try {
        return await checks[name]();
      } catch (error) {
        return { status: 'error', message: `Check crashed: ${error.message}` };
      }
    })
  );

  const components = {};
  names.forEach((name, i) => { components[name] = settled[i]; });

  const failing = names.filter((n) => components[n].status === 'error');
  const warning = names.filter((n) => components[n].status === 'warning');
  const overall = failing.length ? 'error' : warning.length ? 'warning' : 'ok';

  return {
    status: overall,
    summary: failing.length
      ? `Not working: ${failing.join(', ')}`
      : warning.length ? `Working with warnings: ${warning.join(', ')}` : 'All components operational',
    timestamp: new Date().toISOString(),
    components
  };
}

/** Prints a readable report to the server console (used at startup). */
function printHealthReport(report) {
  const icon = { ok: '✅', warning: '⚠️ ', error: '❌' };
  console.log('\n' + '='.repeat(64));
  console.log('[System Check] ' + report.summary);
  Object.entries(report.components).forEach(([name, c]) => {
    console.log(`${icon[c.status]} ${name}: ${c.message}`);
    if (c.hint && c.status !== 'ok') console.log(`     ↳ ${c.hint}`);
  });
  console.log('='.repeat(64) + '\n');
}

module.exports = { runHealthChecks, printHealthReport };
