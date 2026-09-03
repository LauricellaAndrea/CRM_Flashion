import React, { useState, useEffect } from "react";
import { 
  Plus, Search, List, Info, 
  Database, AlertCircle, RefreshCw, ArrowLeft, Building2, Briefcase, Zap, Upload, Trash2, Layers, Wrench, CheckCircle2, Sparkles, CheckSquare
} from "lucide-react";
import { 
  subscribeProjects, 
  subscribeLeads, 
  subscribeAllTasks,
  addProject, 
  deleteProject, 
  addLead, 
  addNoteToLead, 
  addTaskToLead,
  updateProject,
  renameCategory,
  deleteCategory,
  deleteLeadsInCategory,
  deleteLead,
  updateLeadStatus,
  updateLead,
  deduplicateLeadsInFirestore
} from "./services/crmService";
import type { Lead, Project, Task } from "./types";
import { getCategoryParts } from "./types";
import LeadSection from "./components/LeadSection";
import LeadTable from "./components/LeadTable";
import LeadDrawer from "./components/LeadDrawer";
import NewLeadModal from "./components/NewLeadModal";
import StatsBanner from "./components/StatsBanner";
import CsvImportModal from "./components/CsvImportModal";
import NewProjectModal from "./components/NewProjectModal";
import NewCategoryModal from "./components/NewCategoryModal";
import ProjectTasksView from "./components/ProjectTasksView";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectActiveTab, setProjectActiveTab] = useState<'pipeline' | 'tasks'>('pipeline');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  
  const [defaultAddStatus, setDefaultAddStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'crm'>('home');

  // Alignment targets state for legacy categories and batch processing states
  const [alignmentTargets, setAlignmentTargets] = useState<Record<string, string>>({});
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Auto-clear toast notifications
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Real-time Projects Subscription
  useEffect(() => {
    const unsubscribe = subscribeProjects((loadedProjects) => {
      setProjects(loadedProjects);
      
      // Keep active project schema up to date with Firestore changes
      if (selectedProject) {
        const updated = loadedProjects.find(p => p.id === selectedProject.id);
        if (updated) {
          setSelectedProject(updated);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedProject?.id]);

  // Real-time Leads Subscription
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeLeads((loadedLeads) => {
      setLeads(loadedLeads);
      
      // Keep active slideover drawer updated
      if (selectedLead) {
        const updated = loadedLeads.find(l => l.id === selectedLead.id);
        if (updated) {
          setSelectedLead(updated);
        } else {
          setSelectedLead(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedLead?.id]);

  // Real-time Tasks Subscription
  useEffect(() => {
    const unsubscribe = subscribeAllTasks((loadedTasks) => {
      setAllTasks(loadedTasks);
    });
    return () => unsubscribe();
  }, []);

  // Auto-deduplicate Firestore documents when duplicate leads are detected
  useEffect(() => {
    if (leads.length > 0) {
      const seenKeys = new Set<string>();
      let hasDuplicates = false;
      for (const l of leads) {
        const key = `${l.projectId}:::${l.nomeAttivita.toLowerCase().trim()}`;
        if (seenKeys.has(key)) {
          hasDuplicates = true;
          break;
        }
        seenKeys.add(key);
      }
      if (hasDuplicates) {
        deduplicateLeadsInFirestore().catch(console.error);
      }
    }
  }, [leads]);

  // Handle opening of Lead Modal with a specific default status
  const handleOpenAddModal = (status: string) => {
    setDefaultAddStatus(status);
    setIsAddModalOpen(true);
  };

  // Seeding the default Outsourcing B2B template
  const handleSeedOutsourcingProject = async () => {
    setIsSeeding(true);
    try {
      const b2bProjId = "outsourcing-b2b";
      const existingB2B = projects.find(p => p.id === b2bProjId);
      
      if (!existingB2B) {
        await addProject({
          id: b2bProjId,
          nome: "Outsourcing b2b",
          isDefault: true,
          categorie: [
            '❄️|Lead Freddo',
            '💬|In Contatto',
            '🔥|Lead Caldo',
            '📅|Call Fissata',
            '❌|Non Interessato'
          ],
          campi: [
            { key: "citta", label: "Città", tipo: "text" },
            { key: "regione", label: "Regione", tipo: "text" },
            { key: "telefono", label: "Telefono", tipo: "tel" },
            { key: "email", label: "Email", tipo: "email" },
            { key: "accountInstagram", label: "Account Instagram", tipo: "text" },
            { key: "presenzaEcommerce", label: "Presenza E-commerce", tipo: "text" },
            { key: "brandDiPunta", label: "Brand di Punta", tipo: "text" },
            { key: "livelloTarget", label: "Livello Target", tipo: "text" }
          ]
        });
      }

      // Check if we already have leads pre-loaded
      const b2bLeads = leads.filter(l => l.projectId === b2bProjId);
      if (b2bLeads.length === 0) {
        const sampleLeads = [
          {
            nomeAttivita: "10 Corso Como",
            dati: {
              citta: "Milano",
              regione: "Lombardia",
              telefono: "+39 02 29002674",
              email: "info@10corsocomo.com",
              accountInstagram: "@10corsocomo",
              presenzaEcommerce: "Sì",
              brandDiPunta: "Comme des Garçons, Jacquemus, Maison Margiela",
              livelloTarget: "Lusso / Premium"
            },
            stato: "💬|In Contatto",
            ultimaNota: "Dimostrato forte interesse per il nuovo catalogo B2B. Fissare incontro di presentazione.",
          },
          {
            nomeAttivita: "Boutique Sugar",
            dati: {
              citta: "Arezzo",
              regione: "Toscana",
              telefono: "+39 0575 35467",
              email: "sugar@sugar.it",
              accountInstagram: "@sugararezzo",
              presenzaEcommerce: "Sì",
              brandDiPunta: "Gucci, Prada, Saint Laurent",
              livelloTarget: "Lusso"
            },
            stato: "🔥|Lead Caldo",
            ultimaNota: "Parlato direttamente con la titolare. Molto disponibile, richiede listino B2B aggiornato.",
          },
          {
            nomeAttivita: "Maison de la Mode",
            dati: {
              citta: "Torino",
              regione: "Piemonte",
              telefono: "+39 011 543210",
              email: "sales@maisonmode.it",
              accountInstagram: "@maisonmode_torino",
              presenzaEcommerce: "No",
              brandDiPunta: "Pinko, Twinset, Liu Jo",
              livelloTarget: "Medio-Alto"
            },
            stato: "❄️|Lead Freddo",
            ultimaNota: "Inviata email introduttiva commerciale. In attesa di riscontro.",
          },
          {
            nomeAttivita: "Verve Concept Store",
            dati: {
              citta: "Firenze",
              regione: "Toscana",
              telefono: "+39 055 246810",
              email: "verve.firenze@gmail.com",
              accountInstagram: "@verve_firenze",
              presenzaEcommerce: "In Costruzione",
              brandDiPunta: "MSGM, Ganni, Autry",
              livelloTarget: "Premium"
            },
            stato: "📅|Call Fissata",
            ultimaNota: "Fissata video call conoscitiva per presentare l'offerta di outsourcing.",
          },
          {
            nomeAttivita: "Style Oasis",
            dati: {
              citta: "Roma",
              regione: "Lazio",
              telefono: "+39 06 9876543",
              email: "direzione@styleoasis.it",
              accountInstagram: "@styleoasis_roma",
              presenzaEcommerce: "No",
              brandDiPunta: "Zara, Mango, H&M",
              livelloTarget: "Fast Fashion"
            },
            stato: "❌|Non Interessato",
            ultimaNota: "Hanno già un distributore esclusivo per questa stagione.",
          }
        ];

        for (const leadData of sampleLeads) {
          const leadId = await addLead({
            projectId: b2bProjId,
            nomeAttivita: leadData.nomeAttivita,
            dati: leadData.dati,
            stato: leadData.stato,
            ultimaNota: leadData.ultimaNota
          });

          await addNoteToLead(leadId, leadData.ultimaNota);

          if (leadData.stato === "💬|In Contatto") {
            await addTaskToLead(leadId, {
              titolo: "Inviare catalogo B2B aggiornato",
              dataScadenza: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
              completato: false
            }, {
              leadNome: leadData.nomeAttivita,
              projectId: b2bProjId
            });
          } else if (leadData.stato === "📅|Call Fissata") {
            await addTaskToLead(leadId, {
              titolo: "Preparare presentazione outsourcing",
              dataScadenza: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              completato: false
            }, {
              leadNome: leadData.nomeAttivita,
              projectId: b2bProjId
            });
          }
        }
      }

      // Setup the dynamic project selection
      const activeProj = existingB2B || {
        id: b2bProjId,
        nome: "Outsourcing b2b",
        isDefault: true,
        categorie: [
          '❄️|Lead Freddo',
          '💬|In Contatto',
          '🔥|Lead Caldo',
          '📅|Call Fissata',
          '❌|Non Interessato'
        ],
        campi: [
          { key: "citta", label: "Città", tipo: "text" },
          { key: "regione", label: "Regione", tipo: "text" },
          { key: "telefono", label: "Telefono", tipo: "tel" },
          { key: "email", label: "Email", tipo: "email" },
          { key: "accountInstagram", label: "Account Instagram", tipo: "text" },
          { key: "presenzaEcommerce", label: "Presenza E-commerce", tipo: "text" },
          { key: "brandDiPunta", label: "Brand di Punta", tipo: "text" },
          { key: "livelloTarget", label: "Livello Target", tipo: "text" }
        ]
      };
      
      setSelectedProject(activeProj);
      setCurrentView('crm');
    } catch (err) {
      console.error("Error seeding outsourcing project:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setProjectActiveTab('pipeline');
    setCurrentView('crm');
  };

  const handleDeleteProjectClick = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Sei sicuro di voler eliminare questo progetto e TUTTE le sue attività associate? Questa operazione è irreversibile.")) {
      try {
        await deleteProject(projectId);
        
        // Cascading deletion of all leads associated with this projectId
        const projectLeads = leads.filter(l => l.projectId === projectId);
        for (const lead of projectLeads) {
          await deleteLead(lead.id);
        }

        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setCurrentView('home');
        }
      } catch (err) {
        console.error("Error deleting project:", err);
      }
    }
  };

  // List/Category management handlers
  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!selectedProject) return;
    try {
      await renameCategory(selectedProject.id, selectedProject.categorie, oldName, newName, leads);
      setToast({ message: `Categoria rinominata con successo! Le attività sono state aggiornate.`, type: "success" });
    } catch (err) {
      console.error("Error renaming category:", err);
      setToast({ message: "Errore durante la rinomina della categoria.", type: "error" });
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!selectedProject) return;
    try {
      await deleteCategory(selectedProject.id, selectedProject.categorie, categoryName, leads);
      setToast({ message: `Categoria eliminata con successo.`, type: "success" });
    } catch (err) {
      console.error("Error deleting category:", err);
      setToast({ message: "Errore durante l'eliminazione della categoria.", type: "error" });
    }
  };

  const handleDeleteLeadsInCategory = async (categoryName: string) => {
    if (!selectedProject) return;
    try {
      await deleteLeadsInCategory(selectedProject.id, categoryName, leads);
    } catch (err) {
      console.error("Error clearing category leads:", err);
    }
  };

  const handleAddCategoryClick = () => {
    setIsNewCategoryModalOpen(true);
  };

  const handleProjectCreated = (projectId: string) => {
    // New project modal created the project, let's look for it in local list and select it
    const created = projects.find(p => p.id === projectId);
    if (created) {
      setSelectedProject(created);
    } else {
      // Fallback: subscribe will catch it, let's listen
      const checkAndOpen = setInterval(() => {
        const found = projects.find(p => p.id === projectId);
        if (found) {
          setSelectedProject(found);
          clearInterval(checkAndOpen);
        }
      }, 100);
      setTimeout(() => clearInterval(checkAndOpen), 5000);
    }
    setCurrentView('crm');
  };

  // Filter leads by selected project AND deduplicate in-memory by activity name
  const activeLeads = React.useMemo(() => {
    if (!selectedProject) return [];
    const projectLeads = leads.filter(lead => lead.projectId === selectedProject.id);
    const uniqueMap = new Map<string, Lead>();
    for (const lead of projectLeads) {
      const normKey = lead.nomeAttivita.toLowerCase().trim();
      if (!uniqueMap.has(normKey)) {
        uniqueMap.set(normKey, lead);
      }
    }
    return Array.from(uniqueMap.values());
  }, [leads, selectedProject]);

  const filteredLeads = activeLeads.filter(lead => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Check main title
    if (lead.nomeAttivita.toLowerCase().includes(query)) return true;
    if (lead.ultimaNota.toLowerCase().includes(query)) return true;
    
    // Check all dynamic dati fields
    return Object.values(lead.dati || {}).some(val => 
      String(val).toLowerCase().includes(query)
    );
  });

  // Filter tasks belonging to currently active project
  const selectedProjectTasks = React.useMemo(() => {
    if (!selectedProject) return [];
    const leadIdsInProject = new Set(activeLeads.map(l => l.id));
    return allTasks.filter(t => {
      if (t.projectId && t.projectId === selectedProject.id) return true;
      if (t.leadId && leadIdsInProject.has(t.leadId)) return true;
      return false;
    });
  }, [allTasks, selectedProject, activeLeads]);

  const pendingTasksCount = React.useMemo(() => {
    return selectedProjectTasks.filter(t => !t.completato).length;
  }, [selectedProjectTasks]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 flex flex-col font-sans antialiased">
      
      {/* Top Header Navigation */}
      <header className="bg-[#0c0c0e]/90 border-b border-zinc-800 shrink-0 sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap size={18} className="text-amber-400 fill-amber-400/20 shrink-0" />
                  <span>
                    {currentView === 'crm' && selectedProject 
                      ? `Flashion CRM › ${selectedProject.nome}` 
                      : "Flashion CRM"
                    }
                  </span>
                </h1>
              </div>
              <p className="text-xs text-zinc-500">
                {currentView === 'crm' && selectedProject 
                  ? `Gestione contatti e pipeline per il progetto ${selectedProject.nome}` 
                  : "Gestione trattative e lead retail in tempo reale"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentView === 'crm' && selectedProject ? (
              <>
                {/* Back to Home Button */}
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setCurrentView('home');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Torna alla Home</span>
                </button>

                {/* Import CSV/Excel Button */}
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Importa Excel / CSV</span>
                </button>

                <button
                  onClick={() => handleOpenAddModal(selectedProject.categorie[0] || "Lead Freddo")}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Nuova Attività</span>
                </button>
              </>
            ) : (
              /* If we are on Home, show project list button */
              projects.length > 0 && (
                <div className="text-xs text-zinc-500">
                  Progetti totali: <strong className="text-zinc-300">{projects.length}</strong>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Primary Sub-Header / Tool Bar (Only visible when inside CRM view) */}
      {currentView === 'crm' && selectedProject && (
        <div className="bg-[#0c0c0e]/40 border-b border-zinc-800 py-3 shrink-0">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* View Switcher Tabs: Pipeline Lead vs Schermata Task */}
              <div className="flex items-center bg-zinc-900/90 p-1 border border-zinc-800 rounded-xl shadow-xs">
                <button
                  onClick={() => setProjectActiveTab('pipeline')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    projectActiveTab === 'pipeline'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Layers size={14} />
                  <span>Pipeline Lead</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                    projectActiveTab === 'pipeline' ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {activeLeads.length}
                  </span>
                </button>

                <button
                  onClick={() => setProjectActiveTab('tasks')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    projectActiveTab === 'tasks'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <CheckSquare size={14} />
                  <span>Schermata Task</span>
                  {pendingTasksCount > 0 ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                      projectActiveTab === 'tasks'
                        ? 'bg-black/30 text-white'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {pendingTasksCount}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-500 font-semibold">
                      0
                    </span>
                  )}
                </button>
              </div>

              {/* Action buttons (List manipulation when in pipeline tab) */}
              {projectActiveTab === 'pipeline' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddCategoryClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg transition-all cursor-pointer"
                    title="Aggiungi una nuova lista / categoria a questo progetto"
                  >
                    <Plus size={14} />
                    <span>Aggiungi Lista</span>
                  </button>

                  <button 
                    onClick={(e) => handleDeleteProjectClick(selectedProject.id, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 border border-red-900/20 hover:border-red-900/40 rounded-lg transition-all cursor-pointer"
                    title="Elimina definitivamente l'intero progetto e tutte le sue attività"
                  >
                    <Trash2 size={14} />
                    <span>Elimina Progetto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Search bar (visible in pipeline tab, as tasks view has its own dedicated search bar) */}
            {projectActiveTab === 'pipeline' && (
              <div className="relative w-full sm:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cerca attività, note, o informazioni nei campi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 text-sm border border-zinc-800 bg-zinc-900 text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:bg-zinc-900/80"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
                  >
                    Cancella
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-6 space-y-6">

          {/* HOME VIEW MODE */}
          {currentView === 'home' && (
            <div className="py-4 max-w-4xl mx-auto space-y-8">
              
              {/* Elegant Welcome Hero Card */}
              <div className="p-8 bg-[#0c0c0e] border border-zinc-800/85 rounded-2xl text-center space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                
                <div className="w-14 h-14 bg-amber-950/30 border border-amber-900/40 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Zap size={28} className="text-amber-400 fill-amber-400/20" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Benvenuto in Flashion CRM</h2>
                  <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Semplifica la gestione del lavoro, monitora l'avanzamento delle attività e gestisci più progetti contemporaneamente
                  </p>
                </div>

                {/* Two main action cards as requested */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 text-left">
                  
                  {/* Outsourcing B2B Card */}
                  <div 
                    onClick={handleSeedOutsourcingProject}
                    className="p-6 bg-[#101014]/50 hover:bg-[#141419]/90 border border-zinc-800 hover:border-blue-500/50 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="p-2.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg w-fit group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Zap size={18} />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        Outsourcing b2b
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Inizializza istantaneamente il CRM con un database di boutique precaricato completo di note storiche, account social e scadenze dei task.
                      </p>
                    </div>
                    <button className="text-xs font-bold text-blue-400 group-hover:underline flex items-center gap-1 pt-2 cursor-pointer">
                      <span>{isSeeding ? "Inizializzazione..." : "Inizia ora"}</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>

                  {/* Add Project Card */}
                  <div 
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="p-6 bg-[#101014]/50 hover:bg-[#141419]/90 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Plus size={18} />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Aggiungi progetto
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Crea un nuovo database personalizzato. Definisci il nome del progetto, la struttura delle categorie di lista e tutte le colonne che vuoi compilare.
                      </p>
                    </div>
                    <button className="text-xs font-bold text-emerald-400 group-hover:underline flex items-center gap-1 pt-2 cursor-pointer">
                      <span>Crea CRM personalizzato</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>

                </div>

                {/* Seed progress bar feedback if active */}
                {isSeeding && (
                  <div className="p-3 bg-blue-950/30 border border-blue-900/30 text-blue-400 rounded-lg text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Inizializzazione database e caricamento delle boutique in corso...</span>
                  </div>
                )}

                {/* Sync status info */}
                <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Sincronizzato in Cloud con Google Firestore</span>
                </div>
              </div>

              {/* LIST OF EXISTING CUSTOM CRM PROJECTS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={14} className="text-blue-400" />
                    I tuoi Progetti CRM ({projects.length})
                  </h3>
                </div>

                {projects.length === 0 ? (
                  <div className="p-10 text-center bg-zinc-900/10 border border-dashed border-zinc-800 rounded-xl space-y-2">
                    <p className="text-sm text-zinc-500">Non ci sono ancora progetti registrati.</p>
                    <p className="text-xs text-zinc-600">Clicca su "Outsourcing b2b" o "Aggiungi progetto" per iniziare.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((proj) => {
                      const projLeadsCount = leads.filter(l => l.projectId === proj.id).length;
                      return (
                        <div 
                          key={proj.id}
                          onClick={() => handleOpenProject(proj)}
                          className="p-5 bg-[#0c0c0e] hover:bg-[#101014] border border-zinc-800/80 hover:border-zinc-750 rounded-xl transition-all cursor-pointer group flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">
                                {proj.nome}
                              </h4>
                              {/* Option to delete non-default project */}
                              <button
                                onClick={(e) => handleDeleteProjectClick(proj.id, e)}
                                title="Elimina Progetto"
                                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Count Badge info */}
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              <span className="bg-blue-950/30 text-blue-400 border border-blue-900/20 px-2 py-0.5 rounded-sm font-bold">
                                {projLeadsCount} {projLeadsCount === 1 ? 'Attività' : 'Attività'}
                              </span>
                              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm">
                                {proj.campi.length} colonne
                              </span>
                              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm">
                                {proj.categorie.length} categorie
                              </span>
                            </div>
                          </div>

                          {/* Quick categories outline */}
                          <div className="text-[11px] text-zinc-500 truncate">
                            <strong>Fasi:</strong> {proj.categorie.join(" › ")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* CRM ACTIVE VIEW MODE */}
          {currentView === 'crm' && selectedProject && (
            <>
              {projectActiveTab === 'tasks' ? (
                <ProjectTasksView
                  activeProject={selectedProject}
                  allTasks={allTasks}
                  leads={activeLeads}
                  onSelectLead={(lead) => setSelectedLead(lead)}
                />
              ) : (
                <>
                  {/* Metrics Panel */}
                  <StatsBanner leads={activeLeads} activeProject={selectedProject} />

              {/* Onboarding Guide when no data inside selected CRM */}
              {activeLeads.length === 0 && !isLoading && (
                <div className="p-8 bg-[#0c0c0e] border border-zinc-800 rounded-xl max-w-2xl mx-auto text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                    📁
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Il database è attualmente vuoto</h3>
                    <p className="text-sm text-zinc-400">
                      Non ci sono ancora contatti registrati nel progetto <strong>{selectedProject.nome}</strong>. Puoi caricarli in blocco o iniziare a inserirli manualmente.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setIsCsvModalOpen(true)}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Upload size={16} />
                      <span>Importa Excel / CSV</span>
                    </button>
                    <button
                      onClick={() => handleOpenAddModal(selectedProject.categorie[0] || "Lead Freddo")}
                      className="px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded-lg transition-all cursor-pointer"
                    >
                      Aggiungi Manualmente
                    </button>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="text-blue-400 animate-spin" size={28} />
                  <p className="text-sm text-zinc-500 font-medium">Sincronizzazione in tempo reale con Cloud Firestore...</p>
                </div>
              )}

              {/* Collapsible Accordion Sections for each Lead State in Selected Project */}
              {!isLoading && activeLeads.length > 0 && (
                <div className="space-y-4">
                  {selectedProject.categorie.map((stato) => {
                    const sectionLeads = filteredLeads.filter(lead => {
                      const leadClean = getCategoryParts(lead.stato).name.toLowerCase().trim();
                      const catClean = getCategoryParts(stato).name.toLowerCase().trim();
                      return leadClean === catClean;
                    });
                    
                    // Show section even if empty, unless we are searching and there are no search results
                    if (searchQuery.trim() !== "" && sectionLeads.length === 0) {
                       return null;
                    }

                    return (
                      <LeadSection
                        key={stato}
                        status={stato}
                        leads={sectionLeads}
                        onSelectLead={(lead) => setSelectedLead(lead)}
                        selectedLeadId={selectedLead?.id}
                        onAddLeadClick={handleOpenAddModal}
                        activeProject={selectedProject}
                        onRenameCategory={handleRenameCategory}
                        onDeleteCategory={handleDeleteCategory}
                        onDeleteLeadsInCategory={handleDeleteLeadsInCategory}
                      />
                    );
                  })}

                  {/* Recovery Section for Orphaned/Legacy Leads */}
                  {(() => {
                    const activeCategoriesCleaned = selectedProject.categorie.map(cat => getCategoryParts(cat).name.toLowerCase().trim());
                    const orphanedLeadsList = filteredLeads.filter(lead => {
                      const leadClean = getCategoryParts(lead.stato).name.toLowerCase().trim();
                      return !activeCategoriesCleaned.includes(leadClean);
                    });

                    if (orphanedLeadsList.length === 0) return null;

                    return (
                      <div className="mt-8 border border-amber-900/40 bg-zinc-950/40 p-5 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
                          <div>
                            <div className="flex items-center gap-2 text-amber-500 font-bold">
                              <AlertCircle size={18} />
                              <h3 className="text-sm uppercase tracking-wider font-semibold">
                                Attività da ricollocare / Categoria non trovata ({orphanedLeadsList.length})
                              </h3>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                              Queste attività appartengono a liste che sono state ridenominate o rimosse (es. "Lead Freddo" ridenominata in "cold lead"). 
                              Seleziona un nuovo stato per ciascuna riga o usa il menu di migrazione di massa per riposizionarle.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 border border-zinc-800 rounded-lg">
                            <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Sposta tutte in:</span>
                            <select
                              onChange={(e) => {
                                const targetStato = e.target.value;
                                if (!targetStato) return;
                                setCustomConfirm({
                                  title: "Spostamento di massa",
                                  message: `Sei sicuro di voler spostare tutte le ${orphanedLeadsList.length} attività in "${getCategoryParts(targetStato).name}"?`,
                                  onConfirm: async () => {
                                    setIsProcessingBatch(true);
                                    try {
                                      await Promise.all(
                                        orphanedLeadsList.map(lead => updateLeadStatus(lead.id, targetStato))
                                      );
                                      setToast({ message: "Database sincronizzato con successo!", type: "success" });
                                    } catch (err) {
                                      console.error("Errore nel ricollocamento di massa:", err);
                                      setToast({ message: "Errore durante lo spostamento delle attività.", type: "error" });
                                    } finally {
                                      setIsProcessingBatch(false);
                                    }
                                  }
                                });
                                e.target.value = "";
                              }}
                              className="px-2 py-0.5 text-xs font-semibold bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:outline-hidden cursor-pointer"
                            >
                              <option value="">Scegli...</option>
                              {selectedProject.categorie.map((cat) => (
                                <option key={cat} value={cat}>
                                  {getCategoryParts(cat).emoji} {getCategoryParts(cat).name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <LeadTable
                          leads={orphanedLeadsList}
                          onSelectLead={(lead) => setSelectedLead(lead)}
                          selectedLeadId={selectedLead?.id}
                          onAddLeadClick={() => handleOpenAddModal(selectedProject.categorie[0] || "Lead Freddo")}
                          activeProject={selectedProject}
                        />
                      </div>
                    );
                  })()}

                  {/* No search results fallback */}
                  {searchQuery.trim() !== "" && filteredLeads.length === 0 && (
                    <div className="text-center py-16 bg-[#0c0c0e] border border-zinc-800 rounded-xl space-y-2">
                      <AlertCircle className="mx-auto text-zinc-500" size={32} />
                      <h4 className="text-sm font-semibold text-zinc-200">Nessun risultato trovato</h4>
                      <p className="text-xs text-zinc-500">Nessuna attività corrisponde a "{searchQuery}"</p>
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="mt-2 text-xs font-bold text-blue-400 hover:underline cursor-pointer"
                      >
                        Resetta Filtro di Ricerca
                      </button>
                    </div>
                  )}

                  {/* DIAGNOSTIC & RECOVERY PANEL */}
                  <div className="mt-12 pt-6 border-t border-zinc-800">
                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
                      <button
                        onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-850/30 transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Wrench size={16} className="text-zinc-500" />
                          <div>
                            <h3 className="text-sm font-bold text-zinc-300">🛠️ Strumenti di Diagnosi e Recupero Database</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Analizza, allinea e ripristina le attività orfane presenti in Firestore</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-400 font-mono">
                            {leads.length} Attività in Firestore
                          </span>
                          <span className="text-xs text-zinc-500">{isDiagnosticOpen ? "Nascondi" : "Mostra"}</span>
                        </div>
                      </button>

                      {isDiagnosticOpen && (
                        <div className="p-5 border-t border-zinc-850 bg-[#09090b]/60 space-y-6">
                          {/* DB Status metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1">
                              <span className="text-zinc-500 font-medium">Progetto Attivo</span>
                              <p className="text-zinc-200 font-bold truncate">{selectedProject.nome}</p>
                              <p className="text-[10px] text-zinc-500 font-mono select-all">ID: {selectedProject.id}</p>
                            </div>
                            <div className="p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1">
                              <span className="text-zinc-500 font-medium">Attività uniche visibili</span>
                              <p className="text-zinc-200 font-bold text-lg">
                                {activeLeads.length}
                              </p>
                            </div>
                            <div className="p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-lg space-y-1 flex flex-col justify-between">
                              <span className="text-zinc-500 font-medium">Pulizia Duplicati</span>
                              <button
                                onClick={async () => {
                                  setIsProcessingBatch(true);
                                  try {
                                    const res = await deduplicateLeadsInFirestore(selectedProject.id);
                                    setToast({ 
                                      message: res.deletedCount > 0 
                                        ? `Rimossi ${res.deletedCount} lead duplicati dal database!` 
                                        : "Nessun duplicato trovato nel database.", 
                                      type: "success" 
                                    });
                                  } catch (err) {
                                    console.error(err);
                                    setToast({ message: "Errore durante la pulizia dei duplicati.", type: "error" });
                                  } finally {
                                    setIsProcessingBatch(false);
                                  }
                                }}
                                disabled={isProcessingBatch}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Sparkles size={14} />
                                <span>Elimina Duplicati in Firestore</span>
                              </button>
                            </div>
                          </div>

                          {/* SECTION 1: Leads belonging to other project IDs */}
                          {(() => {
                            const mismatchLeads = leads.filter(l => l.projectId !== selectedProject.id);
                            if (mismatchLeads.length === 0) return null;

                            return (
                              <div className="space-y-2 pt-2 border-t border-zinc-850/60">
                                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                  ⚠️ Attività di altri progetti o non collegate ({mismatchLeads.length})
                                </h4>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  Queste attività sono presenti nel database Firestore ma fanno riferimento a un Project ID differente (es. "outsourcing-b2b" vs ID generati). 
                                  Puoi ricollegarle istantaneamente a questo progetto per vederle a schermo.
                                </p>
                                
                                <div className="max-h-60 overflow-y-auto border border-zinc-850 bg-zinc-950/80 rounded-lg divide-y divide-zinc-900">
                                  {mismatchLeads.map(lead => (
                                    <div key={lead.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                      <div className="space-y-0.5 text-left">
                                        <div className="font-bold text-zinc-200">{lead.nomeAttivita}</div>
                                        <div className="text-[10px] text-zinc-500">
                                          <span>Stato: <strong className="text-zinc-400">{lead.stato}</strong></span>
                                          <span className="mx-1.5">•</span>
                                          <span>ID Progetto originario: <strong className="font-mono text-zinc-400">{lead.projectId}</strong></span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setCustomConfirm({
                                            title: "Sposta attività",
                                            message: `Sposta "${lead.nomeAttivita}" in questo progetto ("${selectedProject.nome}")?`,
                                            onConfirm: async () => {
                                              try {
                                                await updateLead(lead.id, { projectId: selectedProject.id });
                                                setToast({ message: `Attività "${lead.nomeAttivita}" collegata con successo!`, type: "success" });
                                              } catch (err) {
                                                console.error("Errore nel ricollegare il lead:", err);
                                                setToast({ message: "Errore durante il collegamento dell'attività.", type: "error" });
                                              }
                                            }
                                          });
                                        }}
                                        className="px-2.5 py-1 text-[11px] bg-amber-950/40 text-amber-400 border border-amber-900/40 hover:bg-amber-600 hover:text-white rounded-md transition-all cursor-pointer font-semibold"
                                      >
                                        Collega a questo progetto
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-1">
                                  <button
                                    onClick={() => {
                                      setCustomConfirm({
                                        title: "Collega tutte le attività",
                                        message: `Sei sicuro di voler spostare TUTTE le ${mismatchLeads.length} attività nel progetto attuale "${selectedProject.nome}"?`,
                                        onConfirm: async () => {
                                          setIsProcessingBatch(true);
                                          try {
                                            await Promise.all(
                                              mismatchLeads.map(lead => updateLead(lead.id, { projectId: selectedProject.id }))
                                            );
                                            setToast({ message: "Database sincronizzato con successo!", type: "success" });
                                          } catch (err) {
                                            console.error("Errore nel ricollegamento di massa:", err);
                                            setToast({ message: "Errore durante lo spostamento delle attività.", type: "error" });
                                          } finally {
                                            setIsProcessingBatch(false);
                                          }
                                        }
                                      });
                                    }}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Collega TUTTE ({mismatchLeads.length}) le attività a questo progetto
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* SECTION 2: Legacy / Mismatched States */}
                          {(() => {
                            const matchingLeads = leads.filter(l => l.projectId === selectedProject.id);
                            const activeCleanCategories = selectedProject.categorie.map(cat => getCategoryParts(cat).name.toLowerCase().trim());
                            const legacyLeads = matchingLeads.filter(lead => {
                              const leadClean = getCategoryParts(lead.stato).name.toLowerCase().trim();
                              return !activeCleanCategories.includes(leadClean);
                            });

                            if (legacyLeads.length === 0) {
                              return (
                                <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-lg text-xs flex items-center gap-2 text-zinc-400">
                                  <CheckCircle2 size={16} className="text-emerald-500" />
                                  <span>Tutte le attività di questo progetto sono correttamente allineate alle liste attive!</span>
                                </div>
                              );
                            }

                            // Group legacy leads by their raw status
                            const legacyGroups: Record<string, Lead[]> = {};
                            legacyLeads.forEach(lead => {
                              const rawStato = lead.stato;
                              if (!legacyGroups[rawStato]) {
                                legacyGroups[rawStato] = [];
                              }
                              legacyGroups[rawStato].push(lead);
                            });

                            return (
                              <div className="space-y-3 pt-2 border-t border-zinc-850/60">
                                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                  ⚙️ Allineamento Liste e Categorie ({legacyLeads.length} attività orfane)
                                </h4>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  Queste attività appartengono a liste che sono state ridenominate (es. da "Lead Freddo" a "cold lead") e quindi non sono visibili nelle liste principali.
                                  Seleziona in quale delle nuove liste attive desideri spostare ciascun gruppo:
                                </p>

                                <div className="space-y-2.5">
                                  {Object.entries(legacyGroups).map(([rawStato, groupLeads]) => {
                                    return (
                                      <div key={rawStato} className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                                        <div className="space-y-0.5 text-left">
                                          <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                                            <span className="text-amber-500">⚠️</span>
                                            Stato originario: <strong className="text-amber-400 font-mono">"{rawStato}"</strong>
                                          </div>
                                          <div className="text-[10px] text-zinc-500">
                                            Contiene <strong className="text-zinc-300">{groupLeads.length}</strong> attività (es. {groupLeads.slice(0, 2).map(l => l.nomeAttivita).join(", ")}...)
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <select
                                            value={alignmentTargets[rawStato] || ""}
                                            onChange={(e) => {
                                              setAlignmentTargets(prev => ({
                                                ...prev,
                                                [rawStato]: e.target.value
                                              }));
                                            }}
                                            className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-hidden cursor-pointer"
                                          >
                                            <option value="">Scegli nuova lista...</option>
                                            {selectedProject.categorie.map(cat => (
                                              <option key={cat} value={cat}>
                                                {getCategoryParts(cat).emoji} {getCategoryParts(cat).name}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => {
                                              const targetStato = alignmentTargets[rawStato];
                                              if (!targetStato) {
                                                setToast({ message: "Seleziona una lista di destinazione!", type: "info" });
                                                return;
                                              }
                                              setCustomConfirm({
                                                title: "Sposta e Ripristina",
                                                message: `Sposta tutte le ${groupLeads.length} attività con stato "${rawStato}" nella lista "${getCategoryParts(targetStato).name}"?`,
                                                onConfirm: async () => {
                                                  setIsProcessingBatch(true);
                                                  try {
                                                    await Promise.all(
                                                      groupLeads.map(lead => updateLeadStatus(lead.id, targetStato))
                                                    );
                                                    setToast({ message: "Database sincronizzato con successo!", type: "success" });
                                                    setAlignmentTargets(prev => {
                                                      const updated = { ...prev };
                                                      delete updated[rawStato];
                                                      return updated;
                                                    });
                                                  } catch (err) {
                                                    console.error("Errore nell'allineamento dei lead:", err);
                                                    setToast({ message: "Errore durante la sincronizzazione.", type: "error" });
                                                  } finally {
                                                    setIsProcessingBatch(false);
                                                  }
                                                }
                                              });
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer font-semibold whitespace-nowrap"
                                          >
                                            Sposta e Ripristina
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}

        </div>
      </main>

      {/* Slide-over Drawer for Notes History & Tasks */}
      {selectedProject && (
        <LeadDrawer 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          activeProject={selectedProject}
          onOpenTasksView={() => setProjectActiveTab('tasks')}
        />
      )}

      {/* Modal Dialog for creating a new lead */}
      {selectedProject && (
        <NewLeadModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          defaultStatus={defaultAddStatus}
          activeProject={selectedProject}
        />
      )}

      {/* Modal Dialog for importing leads from CSV */}
      {selectedProject && (
        <CsvImportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          existingLeads={leads}
          activeProject={selectedProject}
        />
      )}

      {/* Modal Dialog for creating a new project */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        existingProjects={projects}
      />

      {/* Modal Dialog for creating a new category / list */}
      {selectedProject && (
        <NewCategoryModal
          isOpen={isNewCategoryModalOpen}
          onClose={() => setIsNewCategoryModalOpen(false)}
          activeProject={selectedProject}
          onCategoryAdded={(newCat) => setToast({ message: `Lista "${newCat.split("|")[1] || newCat}" aggiunta con successo!`, type: "success" })}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-bounce max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl flex items-start gap-3">
          <div className={`p-1.5 rounded-lg ${
            toast.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            toast.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          }`}>
            <CheckCircle2 size={18} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-zinc-200">
              {toast.type === "success" ? "Operazione riuscita" : toast.type === "error" ? "Si è verificato un errore" : "Info"}
            </h4>
            <p className="text-xs text-zinc-400 leading-normal">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {customConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c0c0e] border border-zinc-800 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2 text-left">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                {customConfirm.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {customConfirm.message}
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isProcessingBatch}
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                disabled={isProcessingBatch}
                onClick={async () => {
                  const action = customConfirm.onConfirm;
                  setCustomConfirm(null);
                  await action();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessingBatch ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  "Conferma"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Footer info bar */}
      <footer className="bg-[#0c0c0e] border-t border-zinc-850 py-3 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <p>© 2026 Flashion CRM - Sincronizzato con Cloud Firestore</p>
        </div>
      </footer>

    </div>
  );
}
