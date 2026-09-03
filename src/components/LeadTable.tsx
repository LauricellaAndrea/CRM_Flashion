import React from "react";
import LeadRow from "./LeadRow";
import type { Lead, Project } from "../types";
import { Plus } from "lucide-react";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string;
  onAddLeadClick: () => void;
  activeProject: Project;
}

export default function LeadTable({ leads, onSelectLead, selectedLeadId, onAddLeadClick, activeProject }: LeadTableProps) {
  const dynamicColCount = activeProject.campi.length + 4; // Name + campos + status + note + actions

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left min-w-[1300px]">
        <thead>
          <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500 h-9 bg-zinc-900/40">
            <th className="px-4 py-2 font-semibold">Nome Attività</th>
            
            {/* Dynamic Campos Headers */}
            {activeProject.campi.map((campo) => (
              <th key={campo.key} className="px-4 py-2 font-semibold">{campo.label}</th>
            ))}

            <th className="px-4 py-2 font-semibold">Stato</th>
            <th className="px-4 py-2 font-semibold">Note</th>
            <th className="px-4 py-2 font-semibold text-right">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={dynamicColCount} className="px-4 py-8 text-center text-zinc-500 text-sm">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="italic">Nessuna attività presente in questa fase.</span>
                  <button
                    onClick={onAddLeadClick}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-400 font-semibold hover:bg-blue-950/20 border border-blue-900/30 rounded-lg transition-all"
                  >
                    <Plus size={12} />
                    <span>Aggiungi Attività</span>
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <LeadRow 
                key={lead.id} 
                lead={lead} 
                activeProject={activeProject}
                onSelectLead={onSelectLead}
                isSelected={selectedLeadId === lead.id}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
