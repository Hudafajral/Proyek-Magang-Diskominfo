import React from 'react';
import { X, Sparkles, TrendingUp, AlertCircle, Database } from 'lucide-react';

export default function InsightModal({ isOpen, onClose, data, isLoading, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="font-semibold text-lg tracking-wide">Analisis Cerdas AI</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Menyusun Analisis...</p>
                <p className="text-xs text-gray-500 mt-1">Mengambil visual dashboard dan memproses pola data (~5-15 detik)</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Gagal Mengambil Analisis</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* Badge Context */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                  Topik: {data.insight.topik}
                </span>
                {data.cached && (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                    Visual Cache Aktif
                  </span>
                )}
                {!data.has_extracted_data && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-full border border-amber-200 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Berbasis Estimasi Visual
                  </span>
                )}
              </div>

              {/* Ringkasan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Ringkasan Eksekutif</h4>
                <p className="text-sm leading-relaxed text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {data.insight.ringkasan}
                </p>
              </div>

              {/* Tren Utama */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Tren Utama
                </h4>
                <ul className="space-y-2">
                  {data.insight.tren_utama.map((item, index) => (
                    <li key={index} className="flex gap-2.5 text-sm text-gray-700 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hal Menonjol / Anomali */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Temuan & Angka Menonjol</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {data.insight.hal_menonjol.map((item, index) => (
                    <div key={index} className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg text-sm text-gray-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}