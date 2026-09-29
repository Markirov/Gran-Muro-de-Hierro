'use client';
import { useState } from 'react';

interface Props {
  wb: any;
  sessions: any[];
  scenarios: Record<string, any>;
  onCreate: (scenarioId: string) => void;
  onOpen: (session: any) => void;
  onDelete: (id: string) => void;
}

export function PartidaLobby({ wb, sessions, scenarios, onCreate, onOpen, onDelete }: Props) {
  const [selectedScenario, setSelectedScenario] = useState<string>('hold-the-line');

  // Filtrar sesiones de la banda actual
  const mySessions = wb ? sessions.filter(s => s && (s.warbandId === wb.id || s.warbandName === wb.name)) : sessions;

  return (
    <div className="space-y-6">
      {/* Estado de Banda Actual */}
      {!wb ? (
        <div className="p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded text-[#9e9178] text-center">
          No hay ninguna banda cargada. Ve a Bandas y selecciona o crea una primero.
        </div>
      ) : (
        <div className="bg-[#1a0f0a] border border-[#5c3a21] rounded p-4 flex justify-between items-center">
          <div>
            <div className="text-sm uppercase text-[#9e9178] font-bold">Banda actual</div>
            <div className="text-[#b8863c] font-bold text-lg">{wb.name || '(Sin nombre)'}</div>
            <div className="text-[#e2d4b7] text-sm">
              {wb.models.length} modelos · {wb.budgetTotal || 0} 👑
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <select 
              value={selectedScenario} 
              onChange={e => setSelectedScenario(e.target.value)}
              className="bg-[#2a1610] text-[#e2d4b7] border border-[#5c3a21] p-2 rounded focus:outline-none"
            >
              {Object.entries(scenarios).map(([id, sc]) => (
                <option key={id} value={id}>{sc.name}</option>
              ))}
            </select>
            <button 
              onClick={() => onCreate(selectedScenario)}
              className="bg-[#5c3a21] text-[#e2d4b7] font-bold px-4 py-2 rounded hover:bg-[#b8863c] transition-colors"
            >
              Nueva Partida
            </button>
          </div>
        </div>
      )}

      {/* Lista de Sesiones */}
      <div>
        <h3 className="text-xl text-[#b8863c] font-serif uppercase tracking-wide mb-3">
          Partidas Guardadas
        </h3>
        {mySessions.length === 0 ? (
          <div className="p-4 bg-[#1a0f0a] border border-[#5c3a21] rounded text-[#9e9178]">
            No hay partidas registradas para esta banda.
          </div>
        ) : (
          <div className="grid gap-3">
            {mySessions.map(s => (
              <div key={s.id} className={`p-4 rounded border flex justify-between items-center ${
                s.finished ? 'bg-[#1a0f0a] border-[#5c3a21] opacity-70' : 'bg-[#2a1610] border-[#b8863c]'
              }`}>
                <div>
                  <div className="font-bold text-[#e2d4b7]">
                    {scenarios[s.scenarioId]?.name || s.scenarioId}
                    {s.finished && <span className="ml-2 text-xs bg-[#5c3a21] px-2 py-0.5 rounded text-[#e2d4b7]">Finalizada</span>}
                  </div>
                  <div className="text-sm text-[#9e9178] mt-1">
                    Banda: {s.warbandName} · Turno {s.turn} · Creada el {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onOpen(s)}
                    className="bg-[#5c3a21] text-[#e2d4b7] px-3 py-1 rounded text-sm hover:bg-[#b8863c] transition-colors"
                  >
                    {s.finished ? 'Ver Resultado' : 'Continuar'}
                  </button>
                  <button 
                    onClick={() => onDelete(s.id)}
                    className="bg-red-900/20 text-red-500 border border-red-900/50 px-3 py-1 rounded text-sm hover:bg-red-900/40 transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
