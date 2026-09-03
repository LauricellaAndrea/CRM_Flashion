import React, { useState } from "react";
import { X, Plus, Sparkles, Check } from "lucide-react";
import type { Project } from "../types";
import { updateProject } from "../services/crmService";

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project;
  onCategoryAdded: (newCategory: string) => void;
}

const POPULAR_EMOJIS = ["📌", "❄️", "💬", "🔥", "📅", "🚀", "✅", "⭐️", "🎯", "❌", "⏳", "🔔"];

export default function NewCategoryModal({ isOpen, onClose, activeProject, onCategoryAdded }: NewCategoryModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState("📌");
  const [listName, setListName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameTrimmed = listName.trim();
    if (!nameTrimmed) {
      setError("Il nome della lista è obbligatorio");
      return;
    }

    if (nameTrimmed.includes("|")) {
      setError("Il nome della lista non può contenere il carattere '|'");
      return;
    }

    // Combine emoji and name for the category value
    const formattedCategory = `${selectedEmoji}|${nameTrimmed}`;

    // Clean duplicate checks
    const isDuplicate = activeProject.categorie.some((cat) => {
      const parts = cat.includes("|") ? cat.split("|")[1].trim() : cat;
      return parts.toLowerCase() === nameTrimmed.toLowerCase();
    });

    if (isDuplicate) {
      setError(`La lista "${nameTrimmed}" esiste già in questo progetto.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedCategories = [...activeProject.categorie, formattedCategory];
      await updateProject(activeProject.id, {
        categorie: updatedCategories,
      });
      onCategoryAdded(formattedCategory);
      setListName("");
      setSelectedEmoji("📌");
      onClose();
    } catch (err) {
      console.error("Errore nell'aggiunta della lista:", err);
      setError("Si è verificato un errore durante il salvataggio in Firestore.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aggiungi Nuova Lista</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/30 text-red-400 rounded-lg text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Emoji Picker Row */}
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              Scegli Icona / Emoji
            </label>
            <div className="grid grid-cols-6 gap-2">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`py-2 text-lg rounded-xl border transition-all cursor-pointer ${
                    selectedEmoji === emoji
                      ? "bg-blue-600/10 border-blue-500/80 text-white font-bold"
                      : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              Nome della Lista
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">
                {selectedEmoji}
              </span>
              <input
                type="text"
                placeholder="es. Da Contattare, In Trattativa, etc."
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                maxLength={40}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-zinc-800 bg-zinc-900 text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium placeholder-zinc-600"
                autoFocus
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-900">
            💡 Una volta aggiunta, la nuova lista apparirà istantaneamente nella tua vista lista e potrai aggiungerci contatti o spostarli da altre liste.
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Plus size={12} />
                  Aggiungi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
