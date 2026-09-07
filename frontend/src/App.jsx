import React from 'react';
import TableauViewer from './components/TableauViewer';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Portal Data & Dashboard Instansi</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau performa data dan dapatkan ringkasan analitis berbasis AI.</p>
        </header>

        {/* Dashboard Tableau */}
        <TableauViewer
          title="Dashboard Analisis Perikanan - Kota Depok"
          tableauUrl="https://public.tableau.com/views/MonitoringPerizinanDaerah2024-2025_17586792955470/Dashboard12?:language=en-US&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link"
          embedUrl="https://public.tableau.com/views/MonitoringPerizinanDaerah2024-2025_17586792955470/Dashboard12?:showVizHome=no&:embed=true"
        />
      </div>
    </div>
  );
}