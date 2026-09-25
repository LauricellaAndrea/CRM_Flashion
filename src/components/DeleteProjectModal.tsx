import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";
import type { Project } from "../types";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  project: Project | null;
  leadsCount: number;
  isDeleting: boolean;
}

export default function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  project,
  leadsCount,
  isDeleting
}: DeleteProjectModalProps) {
  // Handle ESC key to close modal if not in deleting state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !project) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-[#0c0c0e] border border-red-900/40 rounded-2xl p-6 space-y-5 shadow-2xl shadow-red-950/20 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Chiudi"
        >
          <X size={18} />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Elimina Progetto
            </h3>
            <p className="text-xs text-zinc-400">
              Conferma dell'eliminazione definitiva del database
            </p>
          </div>
        </div>

        {/* Warning Content Box */}
        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-red-200">
            Attenzione: se elimini questo progetto perderai definitivamente tutti i dati!
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Stai per eliminare il progetto <strong className="text-white font-bold">"{project.nome}"</strong>. Questa operazione è permanente e non potrà essere annullata.
          </p>

          <div className="pt-2 border-t border-red-900/20 text-xs text-zinc-300 space-y-1.5">
            <div className="font-semibold text-zinc-200">Verranno eliminati da Firebase:</div>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
              <li>
                La configurazione e le colonne del progetto <strong className="text-zinc-200 font-medium">{project.nome}</strong>
              </li>
              <li>
                Tutte le <strong className="text-zinc-200 font-medium">{leadsCount} {leadsCount === 1 ? 'attività' : 'attività'}</strong> registrate in questo progetto
              </li>
              <li>
                Tutte le note storiche e la cronologia dei contatti
              </li>
              <li>
                Tutti i task e i promemoria con le relative scadenze
              </li>
            </ul>
          </div>
        </div>

        {/* Safety Confirmation Notice */}
        <div className="text-[11px] text-zinc-500 italic">
          * Una volta confermato, i dati saranno rimossi in tempo reale sia da questa vista che da Google Cloud Firestore.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-850">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Annulla
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Eliminazione in corso...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Procedi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
