import React, { useState, useMemo } from "react";
import { 
  CheckSquare, Square, Calendar, Plus, Search, 
  Trash2, Edit2, AlertCircle, Clock, Check, X,
  Building2, ArrowRight, Sparkles, Filter, ChevronRight
} from "lucide-react";
import type { Task, Lead, Project } from "../types";
import { getCategoryParts } from "../types";
import { updateTaskInLead, deleteTaskFromLead, addTaskToLead } from "../services/crmService";

interface ProjectTasksViewProps {
  activeProject: Project;
  allTasks: Task[];
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export default function ProjectTasksView({
  activeProject,
  allTasks,
  leads,
  onSelectLead,
}: ProjectTasksViewProps) {
  // Filters & Search
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "overdue" | "today" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>("all");
  
  // Inline Editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDueDate, setEditingTaskDueDate] = useState("");

  // New Task Modal
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // default tomorrow
  );
  const [newTaskLeadId, setNewTaskLeadId] = useState<string>(leads[0]?.id || "");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Filter tasks that belong to this project
  const projectTasks = useMemo(() => {
    const leadIdsInProject = new Set(leads.map((l) => l.id));
    return allTasks.filter((task) => {
      if (task.projectId && task.projectId === activeProject.id) return true;
      if (task.leadId && leadIdsInProject.has(task.leadId)) return true;
      return false;
    });
  }, [allTasks, leads, activeProject.id]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Helpers
  const isOverdue = (dueDate: string, completato: boolean) => {
    if (completato || !dueDate) return false;
    return dueDate < todayStr;
  };

  const isDueToday = (dueDate: string) => {
    return dueDate === todayStr;
  };

  const formatDueDate = (dateString: string) => {
    if (!dateString) return "Nessuna data";
    try {
      const [year, month, day] = dateString.split("-");
      if (!year || !month || !day) return dateString;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = projectTasks.length;
    const pending = projectTasks.filter((t) => !t.completato).length;
    const completed = projectTasks.filter((t) => t.completato).length;
    const overdue = projectTasks.filter((t) => isOverdue(t.dataScadenza, t.completato)).length;
    const todayCount = projectTasks.filter((t) => !t.completato && isDueToday(t.dataScadenza)).length;

    return { total, pending, completed, overdue, todayCount };
  }, [projectTasks, todayStr]);

  // Filtered List
  const filteredTasks = useMemo(() => {
    return projectTasks.filter((task) => {
      // Status filter
      if (filterMode === "pending" && task.completato) return false;
      if (filterMode === "completed" && !task.completato) return false;
      if (filterMode === "overdue" && !isOverdue(task.dataScadenza, task.completato)) return false;
      if (filterMode === "today" && (!isDueToday(task.dataScadenza) || task.completato)) return false;

      // Lead filter
      if (selectedLeadFilter !== "all" && task.leadId !== selectedLeadFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchedTitle = task.titolo.toLowerCase().includes(q);
        const matchedLeadName = (task.leadNome || "").toLowerCase().includes(q);
        const matchedLeadActual = leads.find((l) => l.id === task.leadId)?.nomeAttivita.toLowerCase().includes(q);
        if (!matchedTitle && !matchedLeadName && !matchedLeadActual) {
          return false;
        }
      }

      return true;
    });
  }, [projectTasks, filterMode, selectedLeadFilter, searchQuery, leads, todayStr]);

  // Actions
  const handleToggleTask = async (task: Task) => {
    if (!task.leadId) return;
    try {
      await updateTaskInLead(task.leadId, task.id, {
        completato: !task.completato,
      });
    } catch (err) {
      console.error("Error toggling task completion:", err);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.titolo);
    setEditingTaskDueDate(task.dataScadenza);
  };

  const handleSaveEdit = async (task: Task) => {
    if (!task.leadId || !editingTaskTitle.trim() || !editingTaskDueDate) return;
    try {
      await updateTaskInLead(task.leadId, task.id, {
        titolo: editingTaskTitle.trim(),
        dataScadenza: editingTaskDueDate,
      });
      setEditingTaskId(null);
    } catch (err) {
      console.error("Error saving task edit:", err);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!task.leadId) return;
    if (window.confirm(`Sei sicuro di voler eliminare la task "${task.titolo}"?`)) {
      try {
        await deleteTaskFromLead(task.leadId, task.id);
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate || !newTaskLeadId) return;

    const targetLead = leads.find((l) => l.id === newTaskLeadId);
    if (!targetLead) return;

    setIsSubmittingTask(true);
    try {
      await addTaskToLead(
        targetLead.id,
        {
          titolo: newTaskTitle.trim(),
          dataScadenza: newTaskDueDate,
          completato: false,
        },
        {
          leadNome: targetLead.nomeAttivita,
          projectId: activeProject.id,
        }
      );
      setNewTaskTitle("");
      setIsNewTaskModalOpen(false);
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 bg-[#0c0c0e] border border-zinc-850 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/50 border border-blue-900/40 text-blue-400 flex items-center justify-center">
              <CheckSquare size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Task & Attività da fare</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-900/30 text-blue-400">
                  {stats.pending} in sospeso
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Tutte le task associate ai lead di <strong className="text-zinc-200">{activeProject.nome}</strong> in una schermata dedicata e centralizzata.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (leads.length > 0 && !newTaskLeadId) {
                setNewTaskLeadId(leads[0].id);
              }
              setIsNewTaskModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Nuova Task</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setFilterMode("pending")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterMode === "pending"
              ? "bg-blue-950/20 border-blue-800/80 ring-1 ring-blue-500/30"
              : "bg-[#0c0c0e] border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
            <span>Da Fare</span>
            <Clock size={14} className="text-blue-400" />
          </span>
          <p className="text-2xl font-black text-white mt-1">{stats.pending}</p>
          <span className="text-[11px] text-zinc-500 font-medium">Attività attive</span>
        </button>

        <button
          onClick={() => setFilterMode("overdue")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterMode === "overdue"
              ? "bg-red-950/20 border-red-800/80 ring-1 ring-red-500/30"
              : "bg-[#0c0c0e] border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
            <span>Scadute</span>
            <AlertCircle size={14} className={stats.overdue > 0 ? "text-red-400" : "text-zinc-500"} />
          </span>
          <p className={`text-2xl font-black mt-1 ${stats.overdue > 0 ? "text-red-400" : "text-white"}`}>
            {stats.overdue}
          </p>
          <span className="text-[11px] text-zinc-500 font-medium">Richiedono attenzione</span>
        </button>

        <button
          onClick={() => setFilterMode("completed")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterMode === "completed"
              ? "bg-emerald-950/20 border-emerald-800/80 ring-1 ring-emerald-500/30"
              : "bg-[#0c0c0e] border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
            <span>Completate</span>
            <CheckSquare size={14} className="text-emerald-400" />
          </span>
          <p className="text-2xl font-black text-white mt-1">{stats.completed}</p>
          <span className="text-[11px] text-zinc-500 font-medium">Attività completate</span>
        </button>

        <button
          onClick={() => setFilterMode("all")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterMode === "all"
              ? "bg-zinc-800/60 border-zinc-700 ring-1 ring-zinc-500/30"
              : "bg-[#0c0c0e] border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <span className="text-xs font-medium text-zinc-400 flex items-center justify-between">
            <span>Totale Task</span>
            <Sparkles size={14} className="text-amber-400" />
          </span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-zinc-500 font-medium">Tutte le registrazioni</span>
        </button>
      </div>

      {/* Control Bar: Filters, Search, Lead Picker */}
      <div className="p-4 bg-[#0c0c0e] border border-zinc-850 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setFilterMode("pending")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterMode === "pending"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Da fare ({stats.pending})
          </button>
          <button
            onClick={() => setFilterMode("overdue")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterMode === "overdue"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Scadute ({stats.overdue})
          </button>
          <button
            onClick={() => setFilterMode("today")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterMode === "today"
                ? "bg-amber-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Oggi ({stats.todayCount})
          </button>
          <button
            onClick={() => setFilterMode("completed")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterMode === "completed"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Completate ({stats.completed})
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterMode === "all"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Tutte ({stats.total})
          </button>
        </div>

        {/* Search & Lead selector */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Lead select filter */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
            <Filter size={14} className="text-zinc-500 shrink-0" />
            <select
              value={selectedLeadFilter}
              onChange={(e) => setSelectedLeadFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 font-medium focus:outline-hidden w-full cursor-pointer"
            >
              <option value="all">Tutti i Lead ({leads.length})</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nomeAttivita}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Cerca task o lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-[#0c0c0e] border border-zinc-850 rounded-2xl overflow-hidden shadow-xs">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <CheckSquare size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-200">Nessuna task trovata</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {projectTasks.length === 0
                  ? "Non ci sono ancora task create in questo progetto. Crea una nuova task da qui o apri la scheda di un lead."
                  : "Nessuna task corrisponde ai filtri o alla ricerca selezionata."}
              </p>
            </div>
            {projectTasks.length === 0 && (
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Aggiungi la prima task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-850/80">
            {filteredTasks.map((task) => {
              const matchedLead = leads.find((l) => l.id === task.leadId);
              const leadName = matchedLead?.nomeAttivita || task.leadNome || "Lead";
              const overdue = isOverdue(task.dataScadenza, task.completato);
              const dueToday = isDueToday(task.dataScadenza);
              const categoryParts = matchedLead ? getCategoryParts(matchedLead.stato) : null;

              const isEditingThis = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    task.completato
                      ? "bg-zinc-950/30 opacity-70 hover:opacity-90"
                      : overdue
                      ? "bg-red-950/5 hover:bg-red-950/10"
                      : "hover:bg-zinc-900/30"
                  }`}
                >
                  {/* Left: Checkbox & Title */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 sm:mt-0 text-zinc-500 hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                      title={task.completato ? "Segna come da fare" : "Segna come completata"}
                    >
                      {task.completato ? (
                        <CheckSquare size={19} className="text-emerald-400" />
                      ) : (
                        <Square size={19} />
                      )}
                    </button>

                    {isEditingThis ? (
                      /* Inline edit mode */
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden"
                        />
                        <input
                          type="date"
                          value={editingTaskDueDate}
                          onChange={(e) => setEditingTaskDueDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-zinc-700 bg-zinc-900 text-zinc-200 rounded-md focus:outline-hidden"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(task)}
                            className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded border border-emerald-900/50 cursor-pointer"
                            title="Salva modifiche"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="p-1 text-zinc-400 hover:bg-zinc-800 rounded border border-zinc-700 cursor-pointer"
                            title="Annulla"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal mode */
                      <div className="space-y-1 min-w-0">
                        <p
                          className={`text-sm font-semibold tracking-tight leading-snug break-words ${
                            task.completato
                              ? "line-through text-zinc-500 font-normal"
                              : "text-zinc-100"
                          }`}
                        >
                          {task.titolo}
                        </p>

                        {/* Associated Lead Link Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              if (matchedLead) {
                                onSelectLead(matchedLead);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-850 hover:bg-blue-950/50 border border-zinc-750 hover:border-blue-900/50 text-zinc-300 hover:text-blue-300 transition-all cursor-pointer group"
                            title="Clicca per aprire la scheda completa di questo lead"
                          >
                            <Building2 size={11} className="text-zinc-400 group-hover:text-blue-400" />
                            <span>{leadName}</span>
                            <ChevronRight size={11} className="text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>

                          {categoryParts && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {categoryParts.emoji} {categoryParts.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Due Date & Action Buttons */}
                  {!isEditingThis && (
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-zinc-850/50 sm:border-0">
                      {/* Due date tag */}
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Calendar
                          size={13}
                          className={
                            overdue
                              ? "text-red-400"
                              : dueToday
                              ? "text-amber-400"
                              : "text-zinc-500"
                          }
                        />
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            overdue
                              ? "bg-red-950/40 border border-red-900/50 text-red-300"
                              : dueToday
                              ? "bg-amber-950/40 border border-amber-900/50 text-amber-300"
                              : task.completato
                              ? "text-zinc-500"
                              : "text-zinc-300 bg-zinc-900 border border-zinc-800"
                          }`}
                        >
                          {overdue ? "Scaduta: " : dueToday ? "Oggi: " : "Entro il: "}
                          {formatDueDate(task.dataScadenza)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                          title="Modifica task"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Elimina task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: NUOVA TASK */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#0e0e11] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-900/40 text-blue-400 flex items-center justify-center">
                  <CheckSquare size={16} />
                </div>
                <h3 className="text-base font-bold text-white">Nuova Task</h3>
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTask} className="space-y-4">
              {/* Select Lead */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Associa al Lead / Attività</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Obbligatorio</span>
                </label>
                {leads.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/30 p-2.5 rounded-lg">
                    Attenzione: non ci sono lead in questo progetto. Crea prima un lead per assegnargli una task.
                  </p>
                ) : (
                  <select
                    value={newTaskLeadId}
                    onChange={(e) => setNewTaskLeadId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nomeAttivita} ({getCategoryParts(l.stato).name})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Titolo Task */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Cosa c'è da fare? (Titolo Task)
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Richiamare per discutere listino prezzi"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-500"
                />
              </div>

              {/* Data Scadenza */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Data di Scadenza
                </label>
                <input
                  type="date"
                  required
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-xl text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTaskTitle.trim() || !newTaskDueDate || !newTaskLeadId}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{isSubmittingTask ? "Salvataggio..." : "Crea Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
