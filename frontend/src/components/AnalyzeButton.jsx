import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AnalyzeButton({ onClick, isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-sm font-medium rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
      ) : (
        <Sparkles className="w-4 h-4 text-amber-300" />
      )}
      <span>{isLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
    </button>
  );
}