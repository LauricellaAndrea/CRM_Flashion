import React, { useState } from "react";
import { X, Plus, Trash2, Tag, List, Info, Grid, Layers, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { addProject } from "../services/crmService";
import { getCategoryParts } from "../types";
import type { Project, ProjectCampo } from "../types";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  existingProjects: Project[];
}

const CAMPI_STANDARD: ProjectCampo[] = [
  { key: "citta", label: "Città", tipo: "text" },
  { key: "regione", label: "Regione", tipo: "text" },
  { key: "telefono", label: "Telefono", tipo: "tel" },
  { key: "email", label: "Email", tipo: "email" },
  { key: "accountInstagram", label: "Account Instagram", tipo: "text" },
  { key: "presenzaEcommerce", label: "Presenza E-commerce", tipo: "text" },
  { key: "brandDiPunta", label: "Brand di Punta", tipo: "text" },
  { key: "livelloTarget", label: "Livello Target", tipo: "text" }
];

const CATEGORIE_STANDARD = [
  "❄️|Lead Freddo",
  "💬|In Contatto",
  "🔥|Lead Caldo",
  "📅|Call Fissata",
  "❌|Non Interessato"
];

// Helper to generate a camelCase key from a label
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, "")      // remove non-alphanumeric
    .trim()
    .replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase()); // camelCase
};

// Helper to generate a project slug ID
const slugifyProjectId = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")    // remove non-alphanumeric except spaces/hyphens
    .trim()
    .replace(/\s+/g, "-")            // replace spaces with single hyphen
    .replace(/-+/g, "-");            // replace multiple hyphens with single hyphen
};

export default function NewProjectModal({ isOpen, onClose, onProjectCreated, existingProjects }: NewProjectModalProps) {
  const [nome, setNome] = useState("");
  const [customProjectId, setCustomProjectId] = useState("");
  const [isIdEdited, setIsIdEdited] = useState(false);
  const [categorie, setCategorie] = useState<string[]>(CATEGORIE_STANDARD);
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  
  const [campi, setCampi] = useState<ProjectCampo[]>(CAMPI_STANDARD);
  const [nuovoCampoLabel, setNuovoCampoLabel] = useState("");
  const [nuovoCampoTipo, setNuovoCampoTipo] = useState<'text' | 'tel' | 'email' | 'url' | 'number'>("text");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  if (!isOpen) return null;

  const handleModalClose = () => {
    if (isSubmitting) return;
    setCreatedProject(null);
    setError("");
    onClose();
  };

  const resetForm = () => {
    setNome("");
    setCustomProjectId("");
    setIsIdEdited(false);
    setCategorie(CATEGORIE_STANDARD);
    setCampi(CAMPI_STANDARD);
    setNuovaCategoria("");
    setNuovoCampoLabel("");
    setNuovoCampoTipo("text");
    setError("");
  };

  // Manage Categories
  const handleAddCategoria = () => {
    const val = nuovaCategoria.trim();
    if (!val) return;
    
    // Check if category name is already in use
    const cleanNewName = val.includes("|") ? val.split("|")[1].trim() : val;
    const isDuplicate = categorie.some(cat => {
      const parts = cat.includes("|") ? cat.split("|")[1].trim() : cat;
      return parts.toLowerCase() === cleanNewName.toLowerCase();
    });

    if (isDuplicate) {
      setError("Questa categoria esiste già");
      return;
    }

    const formatted = val.includes("|") ? val : `📌|${val}`;
    setCategorie([...categorie, formatted]);
    setNuovaCategoria("");
    setError("");
  };

  const handleRemoveCategoria = (indexToRemove: number) => {
    if (categorie.length <= 1) {
      setError("Il progetto deve avere almeno una categoria di stato");
      return;
    }
    setCategorie(categorie.filter((_, idx) => idx !== indexToRemove));
    setError("");
  };

  // Manage Fields
  const handleAddCampo = () => {
    const label = nuovoCampoLabel.trim();
    if (!label) return;
    const key = slugify(label);
    
    if (campi.some(c => c.key === key)) {
      setError("Esiste già un campo con questa etichetta o nome");
      return;
    }

    setCampi([...campi, { key, label, tipo: nuovoCampoTipo }]);
    setNuovoCampoLabel("");
    setNuovoCampoTipo("text");
    setError("");
  };

  const handleRemoveCampo = (keyToRemove: string) => {
    setCampi(campi.filter(c => c.key !== keyToRemove));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedNome = nome.trim();
    const trimmedId = customProjectId.trim();

    if (!trimmedNome) {
      setError("Il nome del progetto è obbligatorio");
      return;
    }

    if (!trimmedId) {
      setError("Il Project ID personalizzato è obbligatorio");
      return;
    }

    // Validate project ID characters
    if (!/^[a-z0-9_-]+$/.test(trimmedId)) {
      setError("Il Project ID può contenere solo lettere minuscole, numeri, trattini e underscore");
      return;
    }

    // Check duplicate Project ID
    if (existingProjects && existingProjects.some(p => p.id === trimmedId)) {
      setError(`Il Project ID "${trimmedId}" è già in uso. Scegli un identificativo diverso.`);
      return;
    }

    if (categorie.length === 0) {
      setError("Definisci almeno una categoria di lista");
      return;
    }

    setIsSubmitting(true);
    try {
      const newProjData: Project = {
        id: trimmedId,
        nome: trimmedNome,
        categorie: [...categorie],
        campi: [...campi],
        isDefault: false
      };

      await addProject(newProjData);

      // Successfully created on Firebase! Transition to confirmation screen
      setCreatedProject(newProjData);
      resetForm();
    } catch (err) {
      console.error("Errore creazione progetto:", err);
      setError("Errore durante la creazione del progetto su Firebase. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToProject = () => {
    if (!createdProject) return;
    const proj = createdProject;
    setCreatedProject(null);
    onProjectCreated(proj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-3xl bg-[#0c0c0e] rounded-xl shadow-2xl border border-zinc-800/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b] shrink-0">
          <div className="flex items-center gap-2">
            {createdProject ? (
              <div className="p-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg">
                <CheckCircle2 size={18} />
              </div>
            ) : (
              <div className="p-1.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg">
                <Layers size={18} />
              </div>
            )}
            <h3 className="text-lg font-semibold text-white">
              {createdProject ? "Conferma Creazione Progetto" : "Configura e Crea Nuovo Progetto"}
            </h3>
          </div>
          <button 
            onClick={handleModalClose}
            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content: Either Confirmation Screen or Form */}
        {createdProject ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center text-center space-y-6">
            
            {/* Visual celebration banner */}
            <div className="relative">
              <div className="w-16 h-16 bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-950/50">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300">
                <Sparkles size={14} />
              </div>
            </div>

            <div className="space-y-2 max-w-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full">
                Database Creato con Successo
              </span>
              <h3 className="text-2xl font-extrabold text-white tracking-tight pt-1">
                Progetto "{createdProject.nome}" Creato!
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Il progetto è stato memorizzato e sincronizzato su Firebase Firestore. Ora puoi accedere all'area di lavoro per organizzare la pipeline e gestire le attività.
              </p>
            </div>

            {/* Project Summary Box */}
            <div className="w-full max-w-md bg-[#101014] border border-zinc-800 rounded-xl p-4 text-left space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-xs text-zinc-400 font-medium">Nome Progetto</span>
                <span className="text-xs font-bold text-white">{createdProject.nome}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-xs text-zinc-400 font-medium">Project ID univoco</span>
                <span className="text-xs font-mono bg-zinc-900 px-2 py-0.5 rounded-sm text-zinc-300 border border-zinc-800">
                  /projects/{createdProject.id}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-xs text-zinc-400 font-medium">Stati Pipeline</span>
                <span className="text-xs font-semibold text-blue-400">
                  {createdProject.categorie.length} categorie
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Colonne tabella</span>
                <span className="text-xs font-semibold text-zinc-300">
                  {createdProject.campi.length} campi personalizzati
                </span>
              </div>
            </div>

            {/* Cloud Sync Status */}
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-3.5 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sincronizzato in Cloud con Google Firestore</span>
            </div>

            {/* Buttons: Prosegui or Resta alla Home */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
              <button
                type="button"
                onClick={handleModalClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                Rimani alla Home
              </button>
              <button
                type="button"
                onClick={handleProceedToProject}
                className="w-full sm:w-auto flex-1 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Prosegui</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        ) : (
          <>
            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-sm rounded-lg flex items-center gap-2">
                  <Info size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Nome Progetto */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nome Progetto *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Boutique Italia, Clienti Esteri, Collaborazioni Brand..."
                  value={nome}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNome(val);
                    if (!isIdEdited) {
                      setCustomProjectId(slugifyProjectId(val));
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
                />
                <p className="text-[11px] text-zinc-500">
                  Dai un nome significativo al tuo CRM personalizzato.
                </p>
              </div>

              {/* Project ID Personalizzato */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Project ID Personalizzato *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 font-mono bg-zinc-950 px-3 py-2.5 border border-zinc-850 rounded-lg shrink-0">
                    /projects/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="es. boutique-italia"
                    value={customProjectId}
                    onChange={(e) => {
                      const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                      setCustomProjectId(cleaned);
                      setIsIdEdited(true);
                    }}
                    className="w-full px-4 py-2.5 border border-zinc-750 bg-zinc-900 text-white rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Identificativo unico per il database (solo lettere minuscole, numeri, trattini e underscore). Tutte le attività create per questo progetto useranno questo ID.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Categorie Colonne (Stati) */}
                <div className="space-y-3 p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl">
                  <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                    <List size={16} className="text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Stati / Colonne Lista</h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Queste saranno le sezioni verticali comprimibili (le categorie di lead) del tuo progetto CRM.
                  </p>

                  {/* Add category */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Aggiungi stato... (es. In Trattativa)"
                      value={nuovaCategoria}
                      onChange={(e) => setNuovaCategoria(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-white rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategoria}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Categories list */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {categorie.map((cat, idx) => {
                      const parts = getCategoryParts(cat);
                      return (
                        <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-300">
                          <span className="font-semibold flex items-center gap-1.5">
                            <span className="text-zinc-650 font-mono text-[10px]">#{idx + 1}</span>
                            <span>{parts.emoji} {parts.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoria(idx)}
                            className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Campi personalizzati (Scheda Lead) */}
                <div className="space-y-3 p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl">
                  <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                    <Grid size={16} className="text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Campi / Colonne Tabella</h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Definisci le colonne della tabella. Oltre al nome obbligatorio, puoi aggiungere tutti i campi che desideri compilare.
                  </p>

                  {/* Add custom field */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Etichetta (es. Titolare, Note, Sito)"
                        value={nuovoCampoLabel}
                        onChange={(e) => setNuovoCampoLabel(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-white rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                      />
                      <select
                        value={nuovoCampoTipo}
                        onChange={(e) => setNuovoCampoTipo(e.target.value as any)}
                        className="px-2 border border-zinc-700 bg-zinc-900 text-white rounded-lg text-xs focus:outline-hidden"
                      >
                        <option value="text">Testo</option>
                        <option value="tel">Telefono</option>
                        <option value="email">Email</option>
                        <option value="url">Link Web</option>
                        <option value="number">Numero</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCampo}
                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Custom fields list */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {campi.map((c) => (
                      <div key={c.key} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{c.label}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-sm uppercase font-mono">{c.tipo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCampo(c.key)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#09090b] shrink-0">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !nome.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 disabled:text-zinc-500 rounded-lg shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? "Creazione in corso..." : "Crea Progetto"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
