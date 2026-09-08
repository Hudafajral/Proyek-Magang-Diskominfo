import React, { useState, useEffect, useRef } from 'react';
import AnalyzeButton from './AnalyzeButton';
import InsightModal from './InsightModal';

export default function TableauViewer({ title, tableauUrl, embedUrl }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [insightData, setInsightData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const vizRef = useRef(null);

  useEffect(() => {
    const scriptId = 'tableau-embedding-v3-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = 'https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleAnalyze = async () => {
    setInsightData(null);
    setErrorMsg(null);
    setModalOpen(true);
    setIsLoading(true);

    try {
      let extractedSheetsData = null;
      const vizElement = vizRef.current || document.getElementById('tableauViz');

      if (vizElement && vizElement.workbook) {
        try {
          const activeSheet = vizElement.workbook.activeSheet;
          const sheets = activeSheet.worksheets?.length > 0 ? activeSheet.worksheets : [activeSheet];

          extractedSheetsData = [];
          for (const sheet of sheets) {
            const summaryTable = await sheet.getSummaryDataAsync({ maxRows: 50 });
            const columnNames = summaryTable.columns.map(col => col.fieldName);
            
            const rows = summaryTable.data.map(row => {
              let record = {};
              row.forEach((cell, idx) => {
                record[columnNames[idx]] = cell.formattedValue;
              });
              return record;
            });

            extractedSheetsData.push({
              sheet: sheet.name,
              rows: rows
            });
          }
          console.log("Data tabel aktif berhasil diekstrak:", extractedSheetsData);
        } catch (apiErr) {
          console.warn("getSummaryDataAsync dibatasi oleh author dasbor:", apiErr);
        }
      }

      const response = await fetch('http://localhost:8000/api/analyze-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: tableauUrl,
          force_refresh: false, 
          raw_table_data: extractedSheetsData
        })
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

      <div className="w-full h-[650px] bg-gray-100 flex items-center justify-center relative">
        <tableau-viz
          ref={vizRef}
          id="tableauViz"
          src={embedUrl || tableauUrl}
          toolbar="bottom"
          hide-tabs
          className="w-full h-full border-0"
        ></tableau-viz>
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