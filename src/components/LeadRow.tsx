import React, { useState, useRef, useEffect } from "react";
import { Edit2, Check, X, ArrowUpRight, Phone, Mail, Instagram, BookOpen, Trash2, Globe, Tag, Info } from "lucide-react";
import { updateLead, updateLeadStatus, deleteLead, addNoteToLead } from "../services/crmService";
import type { Lead, Project } from "../types";

interface LeadRowProps {
  lead: Lead;
  onSelectLead: (lead: Lead) => void;
  isSelected: boolean;
  activeProject: Project;
}

import { getCategoryParts } from "../types";

export const getColorsForStatus = (status: string) => {
  const parts = getCategoryParts(status);
  const s = parts.name.toLowerCase();
  if (s.includes('freddo') || s.includes('cold') || s.includes('scoperta') || s.includes('ricerca')) {
    return { bg: 'bg-zinc-800/50', text: 'text-zinc-300 border-zinc-700/60', dot: 'bg-zinc-400' };
  }
  if (s.includes('contatto') || s.includes('contact') || s.includes('discussione')) {
    return { bg: 'bg-amber-950/40', text: 'text-amber-400 border-amber-900/40', dot: 'bg-amber-500' };
  }
  if (s.includes('caldo') || s.includes('hot') || s.includes('offerta') || s.includes('trattativa')) {
    return { bg: 'bg-purple-950/40', text: 'text-purple-400 border-purple-900/40', dot: 'bg-purple-500' };
  }
  if (s.includes('call') || s.includes('fissat') || s.includes('meeting') || s.includes('incontro')) {
    return { bg: 'bg-emerald-950/40', text: 'text-emerald-400 border-emerald-900/40', dot: 'bg-emerald-500' };
  }
  if (s.includes('non interessato') || s.includes('perso') || s.includes('rifiutat') || s.includes('no')) {
    return { bg: 'bg-red-950/40', text: 'text-red-400 border-red-900/40', dot: 'bg-red-500' };
  }
  
  // Dynamic fallback palette
  const defaults = [
    { bg: 'bg-blue-950/40', text: 'text-blue-400 border-blue-900/40', dot: 'bg-blue-500' },
    { bg: 'bg-teal-950/40', text: 'text-teal-400 border-teal-900/40', dot: 'bg-teal-500' },
    { bg: 'bg-pink-950/40', text: 'text-pink-400 border-pink-900/40', dot: 'bg-pink-500' },
  ];
  const charCodeSum = status.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaults[charCodeSum % defaults.length];
};

export default function LeadRow({ lead, onSelectLead, isSelected, activeProject }: LeadRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nomeAttivita, setNomeAttivita] = useState(lead.nomeAttivita);
  const [dati, setDati] = useState<Record<string, string>>(lead.dati || {});
  const [ultimaNota, setUltimaNota] = useState(lead.ultimaNota || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Keep state sync'ed when lead updates from database
  useEffect(() => {
    if (!isEditing) {
      setNomeAttivita(lead.nomeAttivita);
      setDati(lead.dati || {});
      setUltimaNota(lead.ultimaNota || "");
    }
  }, [lead, isEditing]);

  const handleSave = async () => {
    if (!nomeAttivita.trim()) return;
    setIsSaving(true);
    try {
      const updates: Partial<Omit<Lead, "id" | "createdAt" | "updatedAt">> = {
        nomeAttivita: nomeAttivita.trim(),
        dati: dati,
      };

      if (ultimaNota.trim() !== lead.ultimaNota) {
        updates.ultimaNota = ultimaNota.trim();
        await addNoteToLead(lead.id, ultimaNota.trim());
      }

      await updateLead(lead.id, updates);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving lead inline", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNomeAttivita(lead.nomeAttivita);
    setDati(lead.dati || {});
    setUltimaNota(lead.ultimaNota || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    try {
      await updateLeadStatus(lead.id, newStatus);
    } catch (err) {
      console.error("Error updating lead status", err);
    }
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await deleteLead(lead.id);
    } catch (err) {
      console.error("Error deleting lead", err);
    } finally {
      setIsSaving(false);
      setIsConfirmingDelete(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  const handleFieldChange = (key: string, val: string) => {
    setDati(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const statColors = getColorsForStatus(lead.stato);

  return (
    <tr 
      ref={rowRef}
      onDoubleClick={() => !isEditing && setIsEditing(true)}
      className={`group border-b border-zinc-800/60 hover:bg-zinc-850/40 transition-all text-sm h-12 ${
        isSelected ? "bg-zinc-800/30 hover:bg-zinc-800/45" : ""
      }`}
    >
      {/* NOME ATTIVITA' */}
      <td className="px-4 py-2 font-medium align-middle">
        {isEditing ? (
          <input
            type="text"
            value={nomeAttivita}
            onChange={(e) => setNomeAttivita(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            placeholder="Nome Attività"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectLead(lead)}
              className="text-zinc-100 font-semibold hover:text-blue-400 hover:underline text-left cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>{lead.nomeAttivita || "Senza Nome"}</span>
              <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
            </button>
          </div>
        )}
      </td>

      {/* DYNAMIC CAMPI CELLS */}
      {activeProject.campi.map((campo) => {
        const val = dati[campo.key] || "";

        if (isEditing) {
          // Special select for Presence Ecommerce
          if (campo.key === "presenzaEcommerce" || campo.label.toLowerCase().includes("e-commerce") || campo.label.toLowerCase().includes("ecommerce")) {
            return (
              <td key={campo.key} className="px-4 py-2 align-middle">
                <select
                  value={val}
                  onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                  className="px-2 py-1 text-xs border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleziona...</option>
                  <option value="No">No</option>
                  <option value="Sì">Sì</option>
                  <option value="In Costruzione">In Costruzione</option>
                </select>
              </td>
            );
          }

          return (
            <td key={campo.key} className="px-4 py-2 align-middle">
              <input
                type="text"
                value={val}
                onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                placeholder={campo.label}
              />
            </td>
          );
        }

        // View Mode Column formatting
        let content: React.ReactNode = <span className="text-zinc-300">{val || <span className="text-zinc-650 italic text-xs">-</span>}</span>;

        if (campo.tipo === "email") {
          content = val ? (
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-zinc-500" />
              <span className="truncate max-w-[120px]" title={val}>{val}</span>
            </div>
          ) : (
            <span className="text-zinc-650 italic text-xs">-</span>
          );
        } else if (campo.tipo === "tel") {
          content = val ? (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Phone size={12} className="text-zinc-500" />
              <span>{val}</span>
            </div>
          ) : (
            <span className="text-zinc-650 italic">-</span>
          );
        } else if (campo.key.toLowerCase().includes("instagram") || campo.label.toLowerCase().includes("instagram")) {
          content = val ? (
            <div className="flex items-center gap-1">
              <Instagram size={13} className="text-zinc-500" />
              <span 
                className="text-blue-400 hover:underline cursor-pointer" 
                onClick={() => window.open(`https://instagram.com/${val.replace('@', '')}`, '_blank')}
              >
                {val}
              </span>
            </div>
          ) : (
            <span className="text-zinc-650 italic text-xs">-</span>
          );
        } else if (campo.key === "presenzaEcommerce" || campo.label.toLowerCase().includes("e-commerce") || campo.label.toLowerCase().includes("ecommerce")) {
          content = (
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
              val === "Sì" 
                ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400" 
                : val === "In Costruzione"
                ? "bg-amber-950/40 border border-amber-900/30 text-amber-400"
                : "bg-zinc-800/40 border border-zinc-750 text-zinc-500"
            }`}>
              {val || "No"}
            </span>
          );
        } else if (campo.tipo === "url") {
          content = val ? (
            <div className="flex items-center gap-1 text-blue-400 hover:underline cursor-pointer" onClick={() => window.open(val.startsWith('http') ? val : `https://${val}`, '_blank')}>
              <Globe size={13} className="text-zinc-500" />
              <span className="truncate max-w-[100px]" title={val}>{val}</span>
            </div>
          ) : (
            <span className="text-zinc-650 italic text-xs">-</span>
          );
        } else if (campo.key.toLowerCase().includes("target") || campo.label.toLowerCase().includes("target")) {
          content = val ? (
            <div className="flex items-center gap-1">
              <Tag size={12} className="text-zinc-500 shrink-0" />
              <span className="truncate max-w-[100px]" title={val}>{val}</span>
            </div>
          ) : (
            <span className="text-zinc-650 italic text-xs">-</span>
          );
        }

        return (
          <td key={campo.key} className="px-4 py-2 text-zinc-300 align-middle">
            {content}
          </td>
        );
      })}

      {/* STATO */}
      <td className="px-4 py-2 align-middle">
        <div className="relative inline-block w-full min-w-[130px]">
          {(() => {
            const currentCategoryValue = activeProject.categorie.find(cat => {
              return getCategoryParts(cat).name.toLowerCase().trim() === getCategoryParts(lead.stato).name.toLowerCase().trim();
            }) || lead.stato;
            return (
              <select
                value={currentCategoryValue}
                onChange={handleStatusChange}
                className={`w-full px-2 py-0.5 text-xs font-semibold rounded-full border cursor-pointer transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${statColors.bg} ${statColors.text}`}
              >
                {activeProject.categorie.map((cat) => {
                  const catParts = getCategoryParts(cat);
                  return (
                    <option key={cat} value={cat} className="bg-zinc-950 text-zinc-300">
                      {catParts.emoji} {catParts.name}
                    </option>
                  );
                })}
              </select>
            );
          })()}
        </div>
      </td>

      {/* NOTE */}
      <td className="px-4 py-2 text-zinc-400 text-xs align-middle max-w-[200px] truncate">
        {isEditing ? (
          <input
            type="text"
            value={ultimaNota}
            onChange={(e) => setUltimaNota(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            placeholder="Scrivi nota..."
          />
        ) : (
          <div className="flex items-center gap-1 text-zinc-300 truncate">
            <BookOpen size={12} className="text-zinc-500 shrink-0" />
            <span className="truncate" title={lead.ultimaNota}>{lead.ultimaNota || "Nessuna nota"}</span>
          </div>
        )}
      </td>

      {/* Azioni */}
      <td className="px-4 py-2 text-right align-middle shrink-0 w-[80px]">
        {isConfirmingDelete ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleConfirmDelete}
              title="Conferma eliminazione"
              className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancelDelete}
              title="Annulla"
              className="p-1 text-red-400 hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : isEditing ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              title="Salva modifiche"
              className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
            >
              <Check size={15} />
            </button>
            <button
              onClick={handleCancel}
              title="Annulla"
              className="p-1 text-red-400 hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-40 sm:opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              title="Doppio clic sulla riga o modifica rapida"
              className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDeleteClick}
              title="Elimina Lead"
              className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
