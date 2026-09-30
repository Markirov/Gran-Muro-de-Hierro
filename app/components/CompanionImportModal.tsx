'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseCompanionJson, importCompanionWarband } from '../lib/companion_adapter';
import { saveWarbandLocallyAndCloud } from '../lib/storage';
import { FACTIONS } from '../data/factions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (warband: any) => void;
}

export function CompanionImportModal({ isOpen, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessJson = (raw: string) => {
    setError(null);
    setWarnings([]);
    setPreview(null);
    setJsonText(raw);

    if (!raw.trim()) return;

    const parsed = parseCompanionJson(raw);
    if (!parsed.ok || !parsed.data) {
      setError(parsed.error || 'JSON inválido');
      return;
    }

    const res = importCompanionWarband(parsed.data);
    if (!res.ok || !res.warband) {
      setError(res.error || 'Error al importar banda');
      return;
    }

    setPreview(res.warband);
    setWarnings(res.warnings || []);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json' && !file.name.includes('.')) {
      setError('Por favor selecciona un archivo .json de Trench Companion.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleProcessJson(text);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    try {
      await saveWarbandLocallyAndCloud(preview.id, preview);
      localStorage.setItem('warband-forge-v1:current', preview.id);

      if (onSuccess) {
        onSuccess(preview);
      } else {
        router.push('/bandas/roster');
      }
      onClose();
    } catch (e: any) {
      setError('Error guardando la banda: ' + (e?.message || 'Fallo desconocido'));
    }
  };

  const faction = preview ? FACTIONS.find(f => f.id === preview.factionId) : null;
  const variant = faction?.variants?.find(v => v.id === preview?.variantId);

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
            <span className="text-2xl">📥</span>
            <h2 className="font-serif text-xl text-[#b8863c] uppercase tracking-widest m-0">
              Importar de Trench Companion
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#9e9178] hover:text-white text-2xl leading-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Dropzone de archivo */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-[#b8863c] bg-[#b8863c]/10' 
                : 'border-[#5c3a21] bg-[#0a0503]/60 hover:border-[#b8863c] hover:bg-[#2a1610]/40'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json,application/json" 
              className="hidden" 
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <span className="text-4xl block mb-2">📜</span>
            <p className="text-[#e2d4b7] font-serif text-base mb-1">
              Arrastra aquí tu archivo <span className="text-[#b8863c] font-bold">.json</span> exportado de Trench Companion
            </p>
            <p className="text-[#9e9178] text-xs">
              o haz clic para explorar tus archivos
            </p>
          </div>

          {/* O pegar JSON directo */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-[#9e9178] font-bold flex justify-between">
              <span>O pega el contenido JSON:</span>
              {jsonText && (
                <button 
                  type="button" 
                  onClick={() => { setJsonText(''); setPreview(null); setError(null); }}
                  className="text-red-400 hover:text-red-300 text-[11px] underline"
                >
                  Limpiar
                </button>
              )}
            </label>
            <textarea
              rows={4}
              value={jsonText}
              onChange={e => handleProcessJson(e.target.value)}
              placeholder='Pega aquí el JSON: { "warband-id": 12345, "warband-name": "...", "models": [...] }'
              className="w-full bg-[#0a0503] border border-[#5c3a21] focus:border-[#b8863c] rounded-lg p-2.5 text-xs text-[#e2d4b7] font-mono outline-none shadow-inner"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-lg p-3 text-red-200 text-xs flex items-start gap-2">
              <span className="text-red-400 text-base leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Vista previa de la banda detectada */}
          {preview && (
            <div className="bg-[#2a1610]/70 border border-[#b8863c] rounded-xl p-4 space-y-3 shadow-lg">
              <div className="flex justify-between items-start border-b border-[#5c3a21] pb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#b8863c] font-bold block">
                    Banda detectada con éxito
                  </span>
                  <h3 className="font-serif text-xl text-[#e2d4b7] font-bold m-0">
                    {preview.name || '(Sin nombre)'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#b8863c] font-mono font-bold block">
                    {preview.budgetTotal} 👑 Presupuesto
                  </span>
                  <span className="text-[11px] text-[#9e9178] font-mono">
                    {preview.ducatBank} 👑 en Banco
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#1a0f0a] p-2 rounded border border-[#3a2110]">
                  <span className="text-[#7a6a58] block text-[10px] uppercase tracking-wider">Facción</span>
                  <span className="text-[#e2d4b7] font-bold">{faction?.name || preview.factionId}</span>
                </div>
                <div className="bg-[#1a0f0a] p-2 rounded border border-[#3a2110]">
                  <span className="text-[#7a6a58] block text-[10px] uppercase tracking-wider">Variante</span>
                  <span className="text-[#e2d4b7] font-bold">{variant?.name || '— Principal —'}</span>
                </div>
              </div>

              <div className="border-t border-[#3a2110] pt-2 flex items-center justify-between text-xs text-[#9e9178]">
                <span>⚔️ <strong className="text-[#e2d4b7]">{preview.models.length}</strong> miniaturas listas para combate</span>
                <span>☼ <strong className="text-[#e2d4b7]">{preview.glory}</strong> Gloria</span>
              </div>

              {warnings.length > 0 && (
                <div className="bg-yellow-950/40 border border-yellow-800/60 rounded p-2.5 text-[11px] text-yellow-200/90 space-y-1">
                  <span className="font-bold text-yellow-400 block">Avisos de importación:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="bg-[#1a0f0a] p-4 border-t border-[#5c3a21] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[#5c3a21] text-[#9e9178] hover:text-[#e2d4b7] uppercase tracking-widest text-xs font-bold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!preview}
            onClick={handleConfirmImport}
            className={`px-6 py-2 rounded uppercase tracking-widest text-xs font-bold transition-all shadow-md ${
              preview 
                ? 'bg-gradient-to-r from-[#b8863c] to-[#9c6f2a] text-[#1a0f0a] hover:brightness-110 shadow-[0_0_15px_rgba(184,134,60,0.3)] cursor-pointer' 
                : 'bg-[#2a1610] text-[#7a6a58] border border-[#3a2110] cursor-not-allowed'
            }`}
          >
            Importar Banda
          </button>
        </div>
      </div>
    </div>
  );
}
