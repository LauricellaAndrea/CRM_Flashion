import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, GripVertical, Edit2, Trash2, Eraser, Check, X } from "lucide-react";
import LeadTable from "./LeadTable";
import { getColorsForStatus } from "./LeadRow";
import { getCategoryParts } from "../types";
import type { Lead, Project } from "../types";

interface LeadSectionProps {
  status: string;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string;
  onAddLeadClick: (status: string) => void;
  activeProject: Project;
  onRenameCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onDeleteLeadsInCategory: (categoryName: string) => Promise<void>;
}

const PRESET_EMOJIS = ["❄️", "💬", "🔥", "📅", "🏆", "❌", "🚀", "📌", "⭐", "💡", "💰", "🤝"];

export default function LeadSection({ 
  status, 
  leads, 
  onSelectLead, 
  selectedLeadId, 
  onAddLeadClick, 
  activeProject,
  onRenameCategory,
  onDeleteCategory,
  onDeleteLeadsInCategory
}: LeadSectionProps) {
  const parts = getCategoryParts(status);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmoji, setEditedEmoji] = useState(parts.emoji);
  const [editedName, setEditedName] = useState(parts.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const theme = getColorsForStatus(parts.name);
  const icon = parts.emoji;

  // Sync state with status updates from project
  useEffect(() => {
    const currentParts = getCategoryParts(status);
    setEditedEmoji(currentParts.emoji);
    setEditedName(currentParts.name);
  }, [status]);

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentParts = getCategoryParts(status);
    setEditedEmoji(currentParts.emoji);
    setEditedName(currentParts.name);
    setIsEditing(true);
  };

  const handleCancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    const currentParts = getCategoryParts(status);
    setEditedEmoji(currentParts.emoji);
    setEditedName(currentParts.name);
  };

  const handleSaveEditing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setIsEditing(false);
      return;
    }

    const combined = `${editedEmoji || "📌"}|${trimmedName}`;
    if (combined === status) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onRenameCategory(status, combined);
      setIsEditing(false);
    } catch (err) {
      console.error("Errore nel rinominare la categoria:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEditing();
    } else if (e.key === "Escape") {
      handleCancelEditing();
    }
  };

  const handleClearLeads = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const displayName = getCategoryParts(status).name;
    if (window.confirm(`Sei sicuro di voler eliminare TUTTE le ${leads.length} attività presenti nella lista "${displayName}"? L'azione è irreversibile.`)) {
      try {
        await onDeleteLeadsInCategory(status);
      } catch (err) {
        console.error("Errore nello svuotare la categoria:", err);
      }
    }
  };

  const handleDeleteCategorySelf = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteCategory = async () => {
    setIsDeleting(true);
    try {
      await onDeleteCategory(status);
      setIsConfirmDeleteOpen(false);
    } catch (err) {
      console.error("Errore nell'eliminare la categoria:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`bg-[#0c0c0e] rounded-xl border border-zinc-800/80 overflow-hidden transition-all duration-200 ${theme.bg.replace("bg-", "border-l-4 border-l-")}`}>
      {/* Accordion Trigger Header */}
      <div 
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 hover:bg-zinc-800/30 cursor-pointer select-none border-b border-zinc-800/60 transition-colors gap-3"
      >
        <div className="flex items-center gap-2 flex-1" onClick={(e) => isEditing && e.stopPropagation()}>
          {/* Decorative Drag Handle */}
          <div className="text-zinc-600 hover:text-zinc-500 cursor-grab active:cursor-grabbing p-1">
            <GripVertical size={14} />
          </div>
          
          {!isEditing && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-zinc-400 hover:text-white p-0.5 rounded-md hover:bg-zinc-800 transition-colors"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!isEditing && <span className="text-base shrink-0">{icon}</span>}
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full max-w-md bg-zinc-900/90 p-3 rounded-lg border border-zinc-700 shadow-lg">
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    value={editedEmoji}
                    onChange={(e) => setEditedEmoji(e.target.value)}
                    placeholder="📌"
                    maxLength={4}
                    title="Emoji della lista"
                    className="bg-zinc-950 border border-zinc-700 text-white rounded-md px-1.5 py-1 text-sm w-12 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-bold"
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Nome Lista"
                    onKeyDown={handleKeyDown}
                    className="bg-zinc-950 border border-zinc-700 text-white rounded-md px-2.5 py-1 text-sm flex-1 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
                    autoFocus
                    disabled={isSaving}
                  />
                  <button
                    onClick={handleSaveEditing}
                    disabled={isSaving}
                    className="p-1.5 text-emerald-400 hover:bg-emerald-950/30 rounded-md transition-colors cursor-pointer"
                    title="Salva"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelEditing}
                    disabled={isSaving}
                    className="p-1.5 text-red-400 hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                    title="Annulla"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                {/* Preset Emojis Selector Row */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mr-1">Preimpostati:</span>
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEditedEmoji(em)}
                      className={`text-sm p-1 rounded-md hover:bg-zinc-800 transition-colors ${editedEmoji === em ? 'bg-zinc-800 border border-zinc-700' : 'border border-transparent'}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <span className="font-semibold text-zinc-100 text-sm tracking-wide truncate max-w-[200px]" title={parts.name}>
                  {parts.name}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${theme.bg} ${theme.text} ml-1`}>
                  {leads.length} {leads.length === 1 ? 'attività' : 'attività'}
                </span>
                
                {/* Edit Category Name Icon */}
                <button
                  onClick={handleStartEditing}
                  title="Rinomina Lista"
                  className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                >
                  <Edit2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddLeadClick(status)}
            title={`Aggiungi a "${status}"`}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition-all border border-zinc-850 hover:border-blue-900/30"
          >
            <Plus size={14} />
            <span>Nuovo Lead</span>
          </button>

          {/* Clear Leads in Category */}
          {leads.length > 0 && (
            <button
              onClick={handleClearLeads}
              title={`Svuota Lista (Elimina ${leads.length} lead)`}
              className="p-1.5 text-zinc-500 hover:text-amber-500 hover:bg-amber-950/20 border border-transparent hover:border-amber-900/30 rounded-lg transition-all"
            >
              <Eraser size={14} />
            </button>
          )}

          {/* Delete Category Self Button */}
          <button
            onClick={handleDeleteCategorySelf}
            title="Elimina Lista Interamente"
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Accordion Panel Content */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[50000px] opacity-100 visible" : "max-h-0 opacity-0 invisible overflow-hidden"
        }`}
      >
        <LeadTable 
          leads={leads} 
          onSelectLead={onSelectLead} 
          selectedLeadId={selectedLeadId}
          onAddLeadClick={() => onAddLeadClick(status)}
          activeProject={activeProject}
        />
      </div>

      {/* Pop-up / Modal di conferma eliminazione lista */}
      {isConfirmDeleteOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wider">Attenzione Eliminazione Lista</h3>
              </div>
              <button 
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Sei sicuro di voler eliminare definitivamente la lista <strong className="text-white">"{parts.name}"</strong>?
              </p>
              
              {leads.length > 0 ? (
                <div className="p-4 bg-red-950/35 border border-red-900/30 text-red-200 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-red-400 flex items-center gap-1.5">
                    ⚠️ ATTENZIONE:
                  </p>
                  <p className="leading-relaxed">
                    Questa operazione eliminerà definitivamente anche tutte le <strong className="text-white">{leads.length} attività</strong> presenti all'interno di questa lista, comprese tutte le sotto-attività (note, commenti e task associati).
                  </p>
                  <p className="font-semibold text-red-300">Questa azione è permanente, verrà rimossa da Firestore e non può essere annullata!</p>
                </div>
              ) : (
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 text-zinc-400 rounded-xl text-xs">
                  Questa lista è vuota. Non ci sono attività o sotto-attività associate da eliminare.
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteCategory}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-950"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Sì, elimina lista e attività
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

