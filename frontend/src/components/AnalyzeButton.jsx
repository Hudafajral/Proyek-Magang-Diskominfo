export default function AnalyzeButton({ onClick, isLoading = false, disabled = false }) {
  return (
    <button
      type="button"
      className="btn btn-ai"
      onClick={onClick}
      disabled={isLoading || disabled}
      aria-busy={isLoading}
      title="Buat ringkasan dashboard dengan AI"
    >
      {isLoading ? (
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      ) : (
        <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />
      )}
      <span>{isLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
    </button>
  );
}
