export type LeadStato = string;

export interface ProjectCampo {
  key: string;
  label: string;
  tipo: 'text' | 'tel' | 'email' | 'url' | 'number';
}

export interface Project {
  id: string;
  nome: string;
  categorie: string[]; // e.g. ['Lead Freddo', 'In Contatto', ...]
  campi: ProjectCampo[]; // e.g. [{ key: 'citta', label: 'Città', tipo: 'text' }, ...]
  createdAt?: string;
  isDefault?: boolean;
}

export interface Lead {
  id: string;
  projectId: string; // References the project
  nomeAttivita: string; // Card main title / Business name
  textEmoji?: string; // Cache field for custom category icons
  stato: string; // Replaces LeadStato but is a string corresponding to one of the project's categories
  ultimaNota: string;
  createdAt?: string;
  updatedAt?: string;
  dati: Record<string, string>; // Maps project field keys to their values
}

export interface Note {
  id: string;
  testo: string;
  timestamp: string;
}

export interface Task {
  id: string;
  titolo: string;
  dataScadenza: string; // Formato YYYY-MM-DD
  completato: boolean;
  createdAt: string;
  leadId?: string;
  leadNome?: string;
  projectId?: string;
}

export interface CategoryParts {
  emoji: string;
  name: string;
}

export function getCategoryParts(status: string): CategoryParts {
  if (!status) {
    return { emoji: "📌", name: "" };
  }
  if (status.includes("|")) {
    const idx = status.indexOf("|");
    return {
      emoji: status.slice(0, idx).trim(),
      name: status.slice(idx + 1).trim()
    };
  }
  // Fallback for legacy categories
  let icon = "📌";
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("freddo") || normalizedStatus.includes("cold")) {
    icon = "❄️";
  } else if (normalizedStatus.includes("contatto") || normalizedStatus.includes("contact")) {
    icon = "💬";
  } else if (normalizedStatus.includes("caldo") || normalizedStatus.includes("hot")) {
    icon = "🔥";
  } else if (normalizedStatus.includes("call") || normalizedStatus.includes("fissat")) {
    icon = "📅";
  } else if (normalizedStatus.includes("non interessato") || normalizedStatus.includes("perso") || normalizedStatus.includes("rifiutat")) {
    icon = "❌";
  }
  return { emoji: icon, name: status };
}
