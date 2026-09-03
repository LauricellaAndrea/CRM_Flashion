import { 
  collection, 
  collectionGroup,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  setDoc,
  getDocs,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "../firebase";
import type { Lead, Note, Task, LeadStato, Project } from "../types";
import { getCategoryParts } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // Unauthenticated in this CRM
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Subscribe to all projects in real-time
export function subscribeProjects(callback: (projects: Project[]) => void): Unsubscribe {
  const projectsRef = collection(db, "projects");
  const q = query(projectsRef, orderBy("nome", "asc"));
  
  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      projects.push({
        id: docSnap.id,
        nome: data.nome || "",
        categorie: data.categorie || [],
        campi: data.campi || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || "",
        isDefault: !!data.isDefault
      });
    });
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "projects");
  });
}

// Add a new project
export async function addProject(project: Omit<Project, "id"> & { id?: string }): Promise<string> {
  const projectsRef = collection(db, "projects");
  try {
    if (project.id) {
      // Allow passing custom ID (e.g. for default project "default")
      const docRef = doc(db, "projects", project.id);
      await setDoc(docRef, {
        nome: project.nome,
        categorie: project.categorie,
        campi: project.campi,
        isDefault: !!project.isDefault,
        createdAt: serverTimestamp(),
      });
      return project.id;
    } else {
      const docRef = await addDoc(projectsRef, {
        nome: project.nome,
        categorie: project.categorie,
        campi: project.campi,
        isDefault: !!project.isDefault,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "projects");
  }
}

// Delete a project
export async function deleteProject(projectId: string): Promise<void> {
  const projectDocRef = doc(db, "projects", projectId);
  try {
    await deleteDoc(projectDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
  }
}

// Subscribe to all leads in real-time
export function subscribeLeads(callback: (leads: Lead[]) => void): Unsubscribe {
  const leadsRef = collection(db, "leads");
  
  return onSnapshot(leadsRef, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Dynamic fallback for legacy flat fields: copy top-level non-standard keys to the dati map
      const dati = { ...(data.dati || {}) };
      const standardKeys = ["projectId", "nomeAttivita", "stato", "ultimaNota", "createdAt", "updatedAt", "dati"];
      Object.keys(data).forEach((key) => {
        if (!standardKeys.includes(key) && dati[key] === undefined) {
          dati[key] = String(data[key]);
        }
      });

      leads.push({
        id: docSnap.id,
        projectId: data.projectId || "outsourcing-b2b",
        nomeAttivita: data.nomeAttivita || "",
        stato: data.stato || "Lead Freddo",
        ultimaNota: data.ultimaNota || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || "",
        dati: dati
      });
    });
    // Client-side sort by name
    leads.sort((a, b) => a.nomeAttivita.localeCompare(b.nomeAttivita));
    callback(leads);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "leads");
  });
}

// Add a new lead (with automatic duplicate prevention)
export async function addLead(lead: Omit<Lead, "id" | "createdAt" | "updatedAt">, checkDuplicates = true): Promise<string> {
  const leadsRef = collection(db, "leads");
  try {
    if (checkDuplicates && lead.nomeAttivita) {
      const targetNameNorm = lead.nomeAttivita.toLowerCase().trim();
      const q = query(leadsRef, where("projectId", "==", lead.projectId));
      const snapshot = await getDocs(q);
      
      let existingDocId: string | null = null;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.nomeAttivita && String(data.nomeAttivita).toLowerCase().trim() === targetNameNorm) {
          existingDocId = docSnap.id;
        }
      });

      if (existingDocId) {
        // Lead already exists: update existing lead to prevent duplicate documents
        const existingRef = doc(db, "leads", existingDocId);
        await updateDoc(existingRef, {
          ...lead,
          updatedAt: serverTimestamp(),
        });
        return existingDocId;
      }
    }

    const docRef = await addDoc(leadsRef, {
      ...lead,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "leads");
  }
}

// Permanently delete duplicate leads from Firestore by matching projectId and normalized activity name
export async function deduplicateLeadsInFirestore(projectId?: string): Promise<{ deletedCount: number }> {
  const leadsRef = collection(db, "leads");
  try {
    const snapshot = await getDocs(leadsRef);
    const seen = new Map<string, string>(); // key -> docId
    const duplicateDocIds: string[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const pId = data.projectId || "outsourcing-b2b";
      if (projectId && pId !== projectId) return;

      const normName = String(data.nomeAttivita || "").toLowerCase().trim();
      if (!normName) return;

      const key = `${pId}:::${normName}`;
      if (seen.has(key)) {
        duplicateDocIds.push(docSnap.id);
      } else {
        seen.set(key, docSnap.id);
      }
    });

    for (const docId of duplicateDocIds) {
      await deleteDoc(doc(db, "leads", docId));
    }

    return { deletedCount: duplicateDocIds.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "leads");
  }
}

// Update an existing lead's general fields
export async function updateLead(leadId: string, updates: Partial<Omit<Lead, "id" | "createdAt" | "updatedAt">>): Promise<void> {
  const leadDocRef = doc(db, "leads", leadId);
  try {
    await updateDoc(leadDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
  }
}

// Quick status change for a lead
export async function updateLeadStatus(leadId: string, newStato: LeadStato): Promise<void> {
  const leadDocRef = doc(db, "leads", leadId);
  try {
    await updateDoc(leadDocRef, {
      stato: newStato,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
  }
}

// Delete a lead
export async function deleteLead(leadId: string): Promise<void> {
  const leadDocRef = doc(db, "leads", leadId);
  try {
    await deleteDoc(leadDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
  }
}

// Subscribe to a specific lead's note history in real-time
export function subscribeNotes(leadId: string, callback: (notes: Note[]) => void): Unsubscribe {
  const notesRef = collection(db, "leads", leadId, "notes");
  const q = query(notesRef, orderBy("timestamp", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const notes: Note[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      notes.push({
        id: docSnap.id,
        testo: data.testo || "",
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || "",
      });
    });
    callback(notes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `leads/${leadId}/notes`);
  });
}

// Add a new note to a lead and update the lead's "ultimaNota"
export async function addNoteToLead(leadId: string, testo: string): Promise<void> {
  // 1. Add note to subcollection
  const notesRef = collection(db, "leads", leadId, "notes");
  try {
    await addDoc(notesRef, {
      testo,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `leads/${leadId}/notes`);
  }
  
  // 2. Update parent lead's ultimaNota and updatedAt
  const leadDocRef = doc(db, "leads", leadId);
  try {
    await updateDoc(leadDocRef, {
      ultimaNota: testo,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
  }
}

// Subscribe to a specific lead's tasks in real-time
export function subscribeTasks(leadId: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const tasksRef = collection(db, "leads", leadId, "tasks");
  const q = query(tasksRef, orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      tasks.push({
        id: docSnap.id,
        titolo: data.titolo || "",
        dataScadenza: data.dataScadenza || "",
        completato: !!data.completato,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || "",
      });
    });
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `leads/${leadId}/tasks`);
  });
}

// Subscribe to all tasks across all leads in real-time
export function subscribeAllTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  const tasksGroup = collectionGroup(db, "tasks");
  return onSnapshot(tasksGroup, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const parentLeadId = data.leadId || docSnap.ref.parent?.parent?.id || "";
      tasks.push({
        id: docSnap.id,
        titolo: data.titolo || "",
        dataScadenza: data.dataScadenza || "",
        completato: !!data.completato,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || "",
        leadId: parentLeadId,
        leadNome: data.leadNome || "",
        projectId: data.projectId || "",
      });
    });
    // Sort ascending by due date (tasks without due date at the end)
    tasks.sort((a, b) => {
      if (!a.dataScadenza) return 1;
      if (!b.dataScadenza) return -1;
      return a.dataScadenza.localeCompare(b.dataScadenza);
    });
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "tasks (collectionGroup)");
  });
}

// Add a new task to a lead (persists in Firestore under leads/{leadId}/tasks)
export async function addTaskToLead(
  leadId: string, 
  task: Omit<Task, "id" | "createdAt">,
  meta?: { leadNome?: string; projectId?: string }
): Promise<string> {
  const tasksRef = collection(db, "leads", leadId, "tasks");
  try {
    const docRef = await addDoc(tasksRef, {
      ...task,
      leadId,
      leadNome: meta?.leadNome || "",
      projectId: meta?.projectId || "",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `leads/${leadId}/tasks`);
  }
}

// Update a task's completion or details
export async function updateTaskInLead(leadId: string, taskId: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Promise<void> {
  const taskDocRef = doc(db, "leads", leadId, "tasks", taskId);
  try {
    await updateDoc(taskDocRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}/tasks/${taskId}`);
  }
}

// Delete a task from a lead
export async function deleteTaskFromLead(leadId: string, taskId: string): Promise<void> {
  const taskDocRef = doc(db, "leads", leadId, "tasks", taskId);
  try {
    await deleteDoc(taskDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}/tasks/${taskId}`);
  }
}

// Update an entire project (e.g., categories, name, fields)
export async function updateProject(projectId: string, updates: Partial<Omit<Project, "id">>): Promise<void> {
  const projectDocRef = doc(db, "projects", projectId);
  try {
    await updateDoc(projectDocRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}

// Rename a list category and update all its leads
export async function renameCategory(projectId: string, categories: string[], oldName: string, newName: string, leadsList: Lead[]): Promise<void> {
  const updatedCategories = categories.map((cat) => cat === oldName ? newName : cat);
  
  const oldCleanName = getCategoryParts(oldName).name.toLowerCase().trim();
  const projectLeads = leadsList.filter((l) => {
    if (l.projectId !== projectId) return false;
    const leadCleanName = getCategoryParts(l.stato).name.toLowerCase().trim();
    return leadCleanName === oldCleanName;
  });
  
  // Update project categories first
  await updateProject(projectId, { categorie: updatedCategories });
  
  // Then update each lead in that category, catching errors individually so one failure does not halt everything
  for (const lead of projectLeads) {
    try {
      await updateLeadStatus(lead.id, newName);
    } catch (err) {
      console.error(`Failed to update lead ${lead.id} status to ${newName}:`, err);
    }
  }
}

// Delete a list category and all its leads
export async function deleteCategory(projectId: string, categories: string[], categoryName: string, leadsList: Lead[]): Promise<void> {
  const updatedCategories = categories.filter((cat) => cat !== categoryName);
  
  const targetCleanName = getCategoryParts(categoryName).name.toLowerCase().trim();
  const projectLeads = leadsList.filter((l) => {
    if (l.projectId !== projectId) return false;
    const leadCleanName = getCategoryParts(l.stato).name.toLowerCase().trim();
    return leadCleanName === targetCleanName;
  });
  
  // Update project categories first
  await updateProject(projectId, { categorie: updatedCategories });
  
  // Then delete each lead, catching errors individually
  for (const lead of projectLeads) {
    try {
      await deleteLead(lead.id);
    } catch (err) {
      console.error(`Failed to delete lead ${lead.id}:`, err);
    }
  }
}

// Delete all activities (leads) inside a category
export async function deleteLeadsInCategory(projectId: string, categoryName: string, leadsList: Lead[]): Promise<void> {
  const targetCleanName = getCategoryParts(categoryName).name.toLowerCase().trim();
  const projectLeads = leadsList.filter((l) => {
    if (l.projectId !== projectId) return false;
    const leadCleanName = getCategoryParts(l.stato).name.toLowerCase().trim();
    return leadCleanName === targetCleanName;
  });
  
  for (const lead of projectLeads) {
    try {
      await deleteLead(lead.id);
    } catch (err) {
      console.error(`Failed to delete lead ${lead.id}:`, err);
    }
  }
}

