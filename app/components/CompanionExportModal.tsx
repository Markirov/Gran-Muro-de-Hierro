'use client';
import { useState, useMemo } from 'react';
import { exportCompanionWarband } from '../lib/companion_adapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wb: any;
}

export function CompanionExportModal({ isOpen, onClose, wb }: Props) {
  const [copied, setCopied] = useState(false);

  const exportData = useMemo(() => {
    if (!wb) return null;
    return exportCompanionWarband(wb);
  }, [wb]);

  if (!isOpen || !wb || !exportData) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData.jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Error copying to clipboard', e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData.jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (wb.name || 'banda')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    a.download = `${cleanName}_companion.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#1a0f0a] border-2 border-[#b8863c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#2a1610] via-[#1a0f0a] to-[#2a1610] p-4 flex justify-between items-center border-b border-[#5c3a21]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📤</span>
            <div>
              <h2 className="font-serif text-xl text-[#b8863c] uppercase tracking-widest m-0">
                Exportar a Trench Companion
              </h2>
              <span className="text-[11px] text-[#9e9178] block">
                Formato estándar oficial compatible con trench-companion.com
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#9e9178] hover:text-white text-2xl leading-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        {/* Resumen táctico de exportación */}
        <div className="bg-[#0a0503] p-4 border-b border-[#3a2110] flex flex-wrap justify-between items-center gap-3 text-xs">
          <div>
            <span className="text-[#7a6a58] uppercase tracking-wider block text-[10px]">Banda</span>
            <strong className="text-[#e2d4b7] text-sm font-serif">{wb.name || '(Sin nombre)'}</strong>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-[#7a6a58] uppercase tracking-wider block text-[10px]">Valoración</span>
              <strong className="text-[#b8863c] font-mono text-sm">{exportData.json['ducat-rating']} 👑</strong>
            </div>
            <div className="text-right">
              <span className="text-[#7a6a58] uppercase tracking-wider block text-[10px]">Banco</span>
              <strong className="text-[#9e9178] font-mono text-sm">{exportData.json['ducat-bank']} 👑</strong>
            </div>
            <div className="text-right">
              <span className="text-[#7a6a58] uppercase tracking-wider block text-[10px]">Miniaturas</span>
              <strong className="text-[#e2d4b7] font-mono text-sm">{exportData.json.models.length}</strong>
            </div>
          </div>
        </div>

        {/* JSON Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          <label className="text-[11px] uppercase tracking-widest text-[#9e9178] font-bold block">
            Previsualización del JSON Companion:
          </label>
          <textarea
            readOnly
            rows={12}
            value={exportData.jsonString}
            className="w-full bg-[#0a0503] border border-[#3a2110] rounded-lg p-3 text-xs text-[#b8863c] font-mono outline-none shadow-inner resize-none select-all"
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        {/* Acciones */}
        <div className="bg-[#1a0f0a] p-4 border-t border-[#5c3a21] flex flex-wrap justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[#5c3a21] text-[#9e9178] hover:text-[#e2d4b7] uppercase tracking-widest text-xs font-bold transition-all"
          >
            Cerrar
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded border uppercase tracking-widest text-xs font-bold transition-all flex items-center gap-1.5 ${
                copied
                  ? 'border-green-500 bg-green-950/60 text-green-300'
                  : 'border-[#5c3a21] bg-[#2a1610] text-[#e2d4b7] hover:border-[#b8863c] hover:text-white'
              }`}
            >
              {copied ? '✓ Copiado al Portapapeles' : '📋 Copiar JSON'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 rounded bg-gradient-to-r from-[#b8863c] to-[#9c6f2a] text-[#1a0f0a] hover:brightness-110 uppercase tracking-widest text-xs font-bold transition-all shadow-[0_0_15px_rgba(184,134,60,0.3)] flex items-center gap-1.5"
            >
              💾 Descargar .json
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
