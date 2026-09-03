import React, { useState, useEffect } from "react";
import { 
  X, Plus, Calendar, CheckSquare, Square, 
  Trash2, Edit2, MessageSquare, Info, Clock, 
  Phone, Mail, Check, CalendarDays, MapPin, Globe, Tag, Instagram
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  subscribeNotes, 
  addNoteToLead, 
  subscribeTasks, 
  addTaskToLead, 
  updateTaskInLead, 
  deleteTaskFromLead,
  deleteLead
} from "../services/crmService";
import { getCategoryParts } from "../types";
import type { Lead, Note, Task, Project } from "../types";

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  activeProject: Project;
  onOpenTasksView?: () => void;
}

import { updateLead } from "../services/crmService";

export default function LeadDrawer({ lead, onClose, activeProject, onOpenTasksView }: LeadDrawerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Note Form State
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Task Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDueDate, setEditingTaskDueDate] = useState("");

  // Lead Editing State
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadName, setEditLeadName] = useState("");
  const [editLeadDati, setEditLeadDati] = useState<Record<string, string>>({});
  const [editLeadStato, setEditLeadStato] = useState("");
  const [isSavingLeadDetails, setIsSavingLeadDetails] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Subscribe to real-time updates for notes and tasks when active lead changes
  useEffect(() => {
    if (!lead) return;

    // Initialize edit fields
    setEditLeadName(lead.nomeAttivita);
    setEditLeadDati(lead.dati || {});
    setEditLeadStato(lead.stato);
    setIsEditingLead(false);
    setShowConfirmDelete(false);

    // Subscribe to notes
    const unsubscribeNotes = subscribeNotes(lead.id, (loadedNotes) => {
      setNotes(loadedNotes);
    });

    // Subscribe to tasks
    const unsubscribeTasks = subscribeTasks(lead.id, (loadedTasks) => {
      setTasks(loadedTasks);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeTasks();
    };
  }, [lead]);

  if (!lead) return null;

  const handleSaveLeadDetails = async () => {
    if (!editLeadName.trim()) return;
    setIsSavingLeadDetails(true);
    try {
      await updateLead(lead.id, {
        nomeAttivita: editLeadName.trim(),
        stato: editLeadStato,
        dati: editLeadDati,
      });
      setIsEditingLead(false);
    } catch (err) {
      console.error("Errore nel salvataggio dei dettagli del lead:", err);
    } finally {
      setIsSavingLeadDetails(false);
    }
  };

  // Handle deleting the entire lead from within the drawer
  const handleDeleteLeadSelf = async () => {
    setIsDeletingLead(true);
    try {
      await deleteLead(lead.id);
      onClose();
    } catch (err) {
      console.error("Errore nell'eliminare il lead:", err);
    } finally {
      setIsDeletingLead(false);
      setShowConfirmDelete(false);
    }
  };

  // Handle Note Submission
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    
    setIsAddingNote(true);
    try {
      await addNoteToLead(lead.id, newNoteText.trim());
      setNewNoteText("");
    } catch (err) {
      console.error("Error adding note", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle Task Submission
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) return;

    setIsAddingTask(true);
    try {
      await addTaskToLead(lead.id, {
        titolo: newTaskTitle.trim(),
        dataScadenza: newTaskDueDate,
        completato: false
      }, {
        leadNome: lead.nomeAttivita,
        projectId: lead.projectId
      });
      setNewTaskTitle("");
      setNewTaskDueDate("");
    } catch (err) {
      console.error("Error adding task", err);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    try {
      await updateTaskInLead(lead.id, task.id, {
        completato: !task.completato
      });
    } catch (err) {
      console.error("Error toggling task completion", err);
    }
  };

  // Start Editing Task
  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.titolo);
    setEditingTaskDueDate(task.dataScadenza);
  };

  // Save Task Edit
  const handleSaveTaskEdit = async (taskId: string) => {
    if (!editingTaskTitle.trim() || !editingTaskDueDate) return;
    try {
      await updateTaskInLead(lead.id, taskId, {
        titolo: editingTaskTitle.trim(),
        dataScadenza: editingTaskDueDate
      });
      setEditingTaskId(null);
    } catch (err) {
      console.error("Error updating task", err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskFromLead(lead.id, taskId);
    } catch (err) {
      console.error("Error deleting task", err);
    }
  };

  // Format Timestamps
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDueDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return dateString;
    }
  };

  // Check if task is overdue
  const isOverdue = (dateString: string, completed: boolean) => {
    if (completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Drawer container */}
        <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-screen max-w-xl bg-[#0c0c0e] shadow-2xl border-l border-zinc-800 flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  {isEditingLead ? "Modifica Attività" : "Dettagli Attività"}
                </span>
                {isEditingLead ? (
                  <input
                    type="text"
                    value={editLeadName}
                    onChange={(e) => setEditLeadName(e.target.value)}
                    className="w-full mt-1.5 px-2.5 py-1 text-sm border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
                    placeholder="Nome dell'attività"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-white mt-1 truncate" title={lead.nomeAttivita}>{lead.nomeAttivita}</h2>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {showConfirmDelete ? (
                  <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-900/30 px-2 py-1 rounded-lg">
                    <span className="text-xs text-red-200 font-semibold">Sicuro?</span>
                    <button
                      onClick={handleDeleteLeadSelf}
                      disabled={isDeletingLead}
                      title="Sì, elimina"
                      className="p-1 text-emerald-400 hover:bg-emerald-950/50 rounded-md transition-colors cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      title="Annulla"
                      className="p-1 text-red-400 hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    title="Elimina questa attività definitivamente"
                    className="p-1.5 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Dynamic Profile Info */}
              <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                    Scheda Informativa ({activeProject.nome})
                  </h4>
                  {isEditingLead ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSaveLeadDetails}
                        disabled={isSavingLeadDetails}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} />
                        <span>Salva</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditLeadName(lead.nomeAttivita);
                          setEditLeadDati(lead.dati || {});
                          setEditLeadStato(lead.stato);
                          setIsEditingLead(false);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} />
                        <span>Annulla</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingLead(true)}
                      className="px-2.5 py-1 text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:text-blue-400 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Modifica</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                  {/* Dynamic Campos Mapping */}
                  {activeProject.campi.map((campo) => {
                    const value = isEditingLead ? (editLeadDati[campo.key] || "") : (lead.dati?.[campo.key] || "");
                    
                    if (isEditingLead) {
                      let inputField = (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setEditLeadDati(prev => ({ ...prev, [campo.key]: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-950 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                          placeholder={campo.label}
                        />
                      );

                      if (campo.tipo === 'email') {
                        inputField = (
                          <input
                            type="email"
                            value={value}
                            onChange={(e) => setEditLeadDati(prev => ({ ...prev, [campo.key]: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-950 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                            placeholder="mail@esempio.com"
                          />
                        );
                      } else if (campo.tipo === 'tel') {
                        inputField = (
                          <input
                            type="tel"
                            value={value}
                            onChange={(e) => setEditLeadDati(prev => ({ ...prev, [campo.key]: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-950 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                            placeholder="+39 333 ..."
                          />
                        );
                      } else if (campo.key === "presenzaEcommerce" || campo.label.toLowerCase().includes("e-commerce") || campo.label.toLowerCase().includes("ecommerce")) {
                        inputField = (
                          <select
                            value={value}
                            onChange={(e) => setEditLeadDati(prev => ({ ...prev, [campo.key]: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-950 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                          >
                            <option value="">Seleziona...</option>
                            <option value="No">No</option>
                            <option value="Sì">Sì</option>
                            <option value="In Costruzione">In Costruzione</option>
                          </select>
                        );
                      }

                      return (
                        <div key={campo.key} className="space-y-1">
                          <span className="text-[10px] text-zinc-500 block font-bold uppercase">{campo.label}</span>
                          {inputField}
                        </div>
                      );
                    }

                    let icon = <Info size={14} />;
                    let element = <span className="font-semibold text-zinc-200">{value || "Non indicato"}</span>;
                    
                    if (campo.tipo === 'email') {
                      icon = <Mail size={14} />;
                      element = value ? (
                        <a href={`mailto:${value}`} className="font-semibold text-blue-400 hover:underline truncate block max-w-[200px]" title={value}>{value}</a>
                      ) : (
                        <span className="text-zinc-500 italic">Non indicata</span>
                      );
                    } else if (campo.tipo === 'tel') {
                      icon = <Phone size={14} />;
                      element = value ? (
                        <a href={`tel:${value}`} className="font-semibold text-blue-400 hover:underline">{value}</a>
                      ) : (
                        <span className="text-zinc-500 italic">Non indicato</span>
                      );
                    } else if (campo.key.toLowerCase().includes('instagram') || campo.label.toLowerCase().includes('instagram')) {
                      icon = <Instagram size={14} />;
                      element = value ? (
                        <a 
                          href={`https://instagram.com/${value.replace('@', '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-semibold text-blue-400 hover:underline"
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="text-zinc-500 italic">Non indicato</span>
                      );
                    } else if (campo.key === "presenzaEcommerce" || campo.label.toLowerCase().includes("e-commerce") || campo.label.toLowerCase().includes("ecommerce")) {
                      icon = <Globe size={14} />;
                      element = (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          value === "Sì" 
                            ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400" 
                            : value === "In Costruzione"
                            ? "bg-amber-950/40 border border-amber-900/30 text-amber-400"
                            : "bg-zinc-800/40 border border-zinc-750 text-zinc-500"
                        }`}>
                          {value || "No"}
                        </span>
                      );
                    } else if (campo.tipo === 'url' || campo.key.toLowerCase().includes('site') || campo.key.toLowerCase().includes('sito')) {
                      icon = <Globe size={14} />;
                      element = value ? (
                        <a 
                          href={value.startsWith('http') ? value : `https://${value}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-semibold text-blue-400 hover:underline"
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="text-zinc-500 italic">Non indicato</span>
                      );
                    } else if (campo.key.toLowerCase().includes('target') || campo.label.toLowerCase().includes('target')) {
                      icon = <Tag size={14} />;
                    }

                    return (
                      <div key={campo.key} className="flex items-center gap-2 text-zinc-300">
                        <div className="p-1.5 bg-zinc-950 rounded-md border border-zinc-800 text-zinc-500 shrink-0">
                          {icon}
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-medium uppercase">{campo.label}</span>
                          {element}
                        </div>
                      </div>
                    );
                  })}

                  {/* Always render State and status info */}
                  {isEditingLead ? (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase">Stato CRM</span>
                      <select
                        value={editLeadStato}
                        onChange={(e) => setEditLeadStato(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-zinc-700 bg-zinc-950 text-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        {activeProject.categorie.map((cat) => {
                          const catParts = getCategoryParts(cat);
                          return (
                            <option key={cat} value={cat}>
                              {catParts.emoji} {catParts.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="p-1.5 bg-zinc-950 rounded-md border border-zinc-800 text-zinc-500 shrink-0">
                        <Clock size={14} />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-medium uppercase">Stato CRM</span>
                        <span className="font-semibold text-zinc-200">{lead.stato}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks CRUD Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare size={16} className="text-blue-400" />
                    <span>Gestione Task</span>
                    <span className="text-xs bg-blue-950/40 border border-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {tasks.filter(t => !t.completato).length} attivi
                    </span>
                  </h3>
                  {onOpenTasksView && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTasksView();
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title="Apri la schermata con tutte le task del progetto"
                    >
                      <span>Vedi schermata Task →</span>
                    </button>
                  )}
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleAddTask} className="bg-zinc-900/20 p-4 border border-zinc-850 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase">Crea un nuovo Task</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="es. Richiamare per offerta"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-700 rounded-lg text-sm bg-zinc-900 text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="date"
                          required
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full px-3 py-1.5 border border-zinc-700 rounded-lg text-sm bg-zinc-900 text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingTask || !newTaskTitle.trim() || !newTaskDueDate}
                        className="px-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-950/40 disabled:text-zinc-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Aggiungi</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Tasks List */}
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                      Nessun task programmato per questo lead. Creane uno sopra!
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`flex items-start justify-between p-3 border rounded-xl transition-all ${
                          task.completato 
                            ? "bg-zinc-950/40 border-zinc-900/60 text-zinc-500" 
                            : "bg-zinc-900/30 border-zinc-800/80 hover:shadow-xs hover:border-zinc-700"
                        }`}
                      >
                        {editingTaskId === task.id ? (
                          /* Task Inline Editing View */
                          <div className="w-full flex flex-col md:flex-row gap-2 items-center">
                            <input
                              type="text"
                              value={editingTaskTitle}
                              onChange={(e) => setEditingTaskTitle(e.target.value)}
                              className="w-full md:flex-1 px-2.5 py-1 text-sm border border-zinc-700 bg-zinc-900 text-white rounded-md focus:outline-hidden"
                            />
                            <input
                              type="date"
                              value={editingTaskDueDate}
                              onChange={(e) => setEditingTaskDueDate(e.target.value)}
                              className="px-2 py-1 text-xs border border-zinc-700 bg-zinc-900 text-zinc-200 rounded-md focus:outline-hidden"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSaveTaskEdit(task.id)}
                                className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded-md border border-emerald-900/50 cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingTaskId(null)}
                                className="p-1 text-red-400 hover:bg-red-950/40 rounded-md border border-red-900/50 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Task View */
                          <>
                            <div className="flex items-start gap-2.5 flex-1 pr-4">
                              <button
                                onClick={() => handleToggleTask(task)}
                                className="mt-0.5 text-zinc-500 hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                              >
                                {task.completato ? (
                                  <CheckSquare size={17} className="text-blue-400" />
                                ) : (
                                  <Square size={17} />
                                )}
                              </button>
                              <div className="space-y-0.5">
                                <p className={`text-sm font-semibold text-zinc-200 leading-snug ${task.completato ? "line-through text-zinc-500 font-normal" : ""}`}>
                                  {task.titolo}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <CalendarDays size={12} className={isOverdue(task.dataScadenza, task.completato) ? "text-red-400" : "text-zinc-500"} />
                                  <span className={`text-xs font-medium ${
                                    isOverdue(task.dataScadenza, task.completato) 
                                      ? "text-red-400 font-bold bg-red-950/30 border border-red-900/30 px-1.5 py-0.5 rounded-sm" 
                                      : "text-zinc-400"
                                  }`}>
                                    Entro il: {formatDueDate(task.dataScadenza)}
                                    {isOverdue(task.dataScadenza, task.completato) && " (SCADUTO)"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => startEditingTask(task)}
                                title="Modifica task"
                                className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                title="Elimina task"
                                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes Timeline History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-400" />
                    <span>Cronologia Note</span>
                    <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                      {notes.length} note
                    </span>
                  </h3>
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    placeholder="Scrivi una nuova nota o aggiornamento..."
                    rows={3}
                    required
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-sm bg-zinc-900 text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingNote || !newNoteText.trim()}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 disabled:bg-zinc-900/40 disabled:text-zinc-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1 border border-zinc-700/60"
                    >
                      <Plus size={12} />
                      <span>Aggiungi Nota</span>
                    </button>
                  </div>
                </form>

                {/* Timeline */}
                <div className="relative pl-4 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-zinc-800">
                  {notes.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm">
                      Nessun appunto o nota storica per questo lead.
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="relative group pl-5">
                        {/* Dot indicator */}
                        <div className="absolute left-[-13px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-[#0c0c0e] group-hover:bg-blue-400 transition-colors" />
                        
                        <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-850 space-y-1">
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium">
                            {note.testo}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(note.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
