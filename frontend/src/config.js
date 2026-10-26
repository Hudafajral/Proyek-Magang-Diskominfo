import dashboardCatalog from './data/dashboards.json';

// Katalog dashboard yang diambil dari portal Satu Data Kota Depok.
// URL Tableau sengaja memakai base URL (tanpa query) karena banyak URL
// di portal asli terpotong tepat 100 karakter di database.
export const DASHBOARDS = dashboardCatalog;

export const DEFAULT_DASHBOARD_ID = '55';

export const DEFAULT_DASHBOARD =
  DASHBOARDS.find((dashboard) => dashboard.id === DEFAULT_DASHBOARD_ID) ||
  DASHBOARDS[0];

export const CATALOG_INFO = {
  sourceTotal: 25,
  brokenIds: ['33', '35', '42', '46'],
};

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function today() {
  return new Date()
    .toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '-');
}

export function createCustomDashboard({ url, title }) {
  const value = (url || '').trim();
  if (!value) {
    throw new Error('Tempel link Tableau Public terlebih dahulu.');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Format URL tidak valid.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'public.tableau.com') {
    throw new Error('Gunakan link https://public.tableau.com/...');
  }

  const normalized = parsed.toString();
  return {
    id: `custom-${hashString(normalized)}`,
    title: (title || '').trim() || 'Dashboard Tableau Kustom',
    tableauUrl: normalized,
    organization: 'Tableau Public',
    date: today(),
    views: 0,
    isCustom: true,
    sourceUrl: '',
  };
}

// Di dev, Vite mem-proxy /api ke http://127.0.0.1:8000 (lihat vite.config.js).
// Di produksi, isi VITE_API_BASE_URL atau arahkan lewat proxy PHP Satudata.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getDashboardDescription(dashboard) {
  if (!dashboard) return '';
  if (dashboard.isCustom) {
    return 'Dashboard Tableau kustom yang dimuat untuk pengujian simulasi fitur Analisis AI.';
  }
  return (
    `Data Insight ini menyajikan data dari dashboard “${dashboard.title}” ` +
    `yang dikelola oleh ${dashboard.organization}.`
  );
}
