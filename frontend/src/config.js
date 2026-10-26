export const DASHBOARD = {
  id: '55',
  title: 'Monitoring Perizinan Daerah Tahun 2024 – 2026',
  tableauUrl:
    'https://public.tableau.com/views/MonitoringPerizinanDaerah2024-2025_17586792955470/Dashboard12?:lang',
  date: '06-08-2026',
  views: 904,
  organization: 'Dinas Komunikasi dan Informatika Kota Depok',
  author: 'Bidang Data dan Statistik Sektoral',
  description:
    'Data Insight ini menyajikan gambaran perkembangan perizinan daerah di Kota Depok ' +
    'berdasarkan dashboard Tableau yang dikelola Bidang Data dan Statistik Sektoral.',
};

// Di dev, Vite mem-proxy /api ke http://127.0.0.1:8000 (lihat vite.config.js).
// Di produksi, isi VITE_API_BASE_URL atau arahkan lewat proxy PHP Satudata.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
