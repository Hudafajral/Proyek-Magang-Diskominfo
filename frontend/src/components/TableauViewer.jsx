import React, { useState } from 'react';
import AnalyzeButton from './AnalyzeButton';
import InsightModal from './InsightModal';

export default function TableauViewer({ title, tableauUrl, embedUrl }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [insightData, setInsightData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAnalyze = async () => {
    setModalOpen(true);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:8000/api/analyze-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tableauUrl })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Terjadi kesalahan sistem.');
      }

      const result = await response.json();
      setInsightData(result);
    } catch (err) {
      setErrorMsg(err.message || 'Koneksi ke server analisis gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">Sumber: Tableau Public</p>
        </div>
        <AnalyzeButton onClick={handleAnalyze} isLoading={isLoading} />
      </div>

      <div className="w-full h-[650px] bg-gray-100">
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>

      <InsightModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={insightData}
        isLoading={isLoading}
        error={errorMsg}
      />
    </div>
  );
}