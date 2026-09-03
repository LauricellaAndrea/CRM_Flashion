import React, { useState, useEffect } from "react";
import { X, Plus, Info } from "lucide-react";
import { addLead, addNoteToLead } from "../services/crmService";
import { getCategoryParts } from "../types";
import type { Project, LeadStato } from "../types";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: string;
  activeProject: Project;
}

export default function NewLeadModal({ isOpen, onClose, defaultStatus = "", activeProject }: NewLeadModalProps) {
  const [nomeAttivita, setNomeAttivita] = useState("");
  const [stato, setStato] = useState("");
  const [dati, setDati] = useState<Record<string, string>>({});
  const [primaNota, setPrimaNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync state with default status and active project categories when opening
  useEffect(() => {
    if (isOpen) {
      setNomeAttivita("");
      const initialStatus = defaultStatus || activeProject.categorie[0] || "Lead Freddo";
      setStato(initialStatus);
      
      // Pre-fill empty data object matching fields
      const initialDati: Record<string, string> = {};
      activeProject.campi.forEach(campo => {
        initialDati[campo.key] = "";
      });
      setDati(initialDati);
      setPrimaNota("");
      setError("");
    }
  }, [isOpen, defaultStatus, activeProject]);

  if (!isOpen) return null;

  const handleInputChange = (key: string, val: string) => {
    setDati(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeAttivita.trim()) {
      setError("Il nome dell'attività è obbligatorio");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const newLeadId = await addLead({
        projectId: activeProject.id,
        nomeAttivita: nomeAttivita.trim(),
        stato: stato,
        dati: dati,
        ultimaNota: primaNota.trim() || "Attività registrata nel CRM"
      });

      if (primaNota.trim()) {
        await addNoteToLead(newLeadId, primaNota.trim());
      } else {
        await addNoteToLead(newLeadId, "Attività registrata nel CRM");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("Errore durante la creazione del lead. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-[#0c0c0e] rounded-xl shadow-2xl border border-zinc-800/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg">
              <Plus size={18} />
            </div>
            <h3 className="text-lg font-semibold text-white">Nuova Attività ({activeProject.nome})</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-sm rounded-lg flex items-center gap-2">
              <Info size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nome Attività *</label>
              <input
                type="text"
                required
                placeholder="es. Boutique Vogue Milano"
                value={nomeAttivita}
                onChange={(e) => setNomeAttivita(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stato Iniziale</label>
              <select
                value={stato}
                onChange={(e) => setStato(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
              >
                {activeProject.categorie.map((st) => {
                  const parts = getCategoryParts(st);
                  return (
                    <option key={st} value={st} className="bg-zinc-950 text-white">
                      {parts.emoji} {parts.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Render Project campos dynamically */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProject.campi.map((campo) => {
              // Custom options for Presenza E-commerce if named that way
              if (campo.key === "presenzaEcommerce" || campo.label.toLowerCase().includes("e-commerce") || campo.label.toLowerCase().includes("ecommerce")) {
                return (
                  <div key={campo.key} className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{campo.label}</label>
                    <select
                      value={dati[campo.key] || ""}
                      onChange={(e) => handleInputChange(campo.key, e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
                    >
                      <option value="" className="bg-zinc-950 text-zinc-400">Seleziona...</option>
                      <option value="No" className="bg-zinc-950 text-white">No</option>
                      <option value="Sì" className="bg-zinc-950 text-white">Sì</option>
                      <option value="In Costruzione" className="bg-zinc-950 text-white">In Costruzione</option>
                    </select>
                  </div>
                );
              }

              return (
                <div key={campo.key} className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{campo.label}</label>
                  <input
                    type={campo.tipo === "number" ? "number" : campo.tipo === "email" ? "email" : campo.tipo === "tel" ? "tel" : "text"}
                    placeholder={`Inserisci ${campo.label.toLowerCase()}...`}
                    value={dati[campo.key] || ""}
                    onChange={(e) => handleInputChange(campo.key, e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nota Iniziale (Note) *</label>
            <textarea
              placeholder="Aggiungi dettagli, note storiche o appunti..."
              rows={3}
              value={primaNota}
              onChange={(e) => setPrimaNota(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 disabled:text-zinc-500 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? "Salvataggio..." : "Salva Attività"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
