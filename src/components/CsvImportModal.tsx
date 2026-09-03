import React, { useState, useRef } from "react";
import { 
  X, Upload, FileText, CheckCircle, AlertCircle, Info, RefreshCw, Sparkles, HelpCircle 
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { addLead, addNoteToLead } from "../services/crmService";
import type { Lead, LeadStato, Project } from "../types";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: Lead[];
  activeProject: Project;
}

interface ParsedRow {
  nomeAttivita: string;
  dati: Record<string, string>;
  note: string;
}

export default function CsvImportModal({ isOpen, onClose, existingLeads, activeProject }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper function to normalize headers (remove accents, apostrophes, extra spaces, and convert to UPPERCASE)
  const normalizeHeader = (header: string): string => {
    return header
      .trim()
      .toUpperCase()
      .replace(/['’]/g, '')     // Remove apostrophes (e.g., NOME ATTIVITA' -> NOME ATTIVITA)
      .replace(/[ÀÁÂÃÄÅ]/g, 'A') // Replace variants of A
      .replace(/[ÈÉÊË]/g, 'E')   // Replace variants of E
      .replace(/[ÌÍÎÏ]/g, 'I')   // Replace variants of I
      .replace(/[ÒÓÔÕÖØ]/g, 'O') // Replace variants of O
      .replace(/[ÙÚÛÜ]/g, 'U')   // Replace variants of U
      .normalize("NFD")          // Decompose combined characters
      .replace(/[\u0300-\u036f]/g, ""); // Remove accents
  };

  // Normalized key-mapping arrays (fully uppercase, without accents or apostrophes)
  const NOME_KEYS = ["NOME ATTIVITA", "NOME BOUTIQUE", "ATTIVITA", "BOUTIQUE", "NOME", "NAME", "BUSINESS NAME", "BOUTIQUE NAME"];
  const CITTA_KEYS = ["CITTA", "CITY", "TOWN"];
  const REGIONE_KEYS = ["REGIONE", "REGION", "STATE", "PROVINCIA"];
  const TELEFONO_KEYS = ["TELEFONO", "PHONE", "TEL", "TELEPHONE", "MOBILE"];
  const EMAIL_KEYS = ["EMAIL", "E-MAIL", "MAIL", "CONTATTO EMAIL"];
  const INSTAGRAM_KEYS = ["ACCOUNT INSTAGRAM", "INSTAGRAM", "IG", "SOCIAL", "ACCOUNT IG"];
  const ECOMMERCE_KEYS = ["PRESENZA E-COMMERCE", "PRESENZA ECOMMERCE", "ECOMMERCE", "E-COMMERCE", "SHOP ONLINE", "SITO"];
  const BRAND_KEYS = ["BRAND DI PUNTA", "BRAND", "BRANDS", "MARCHI TRATTATI", "MARCHI"];
  const TARGET_KEYS = ["LIVELLO TARGET", "TARGET", "LIVELLO", "CATEGORIA TARGET", "PRICE RANGE"];
  const NOTE_KEYS = ["NOTE", "NOTES", "COMMENTI", "DESCRIZIONE", "INFO", "REMARKS", "ULTIMA NOTA"];

  const getMappedValue = (row: any, aliases: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const foundKey = rowKeys.find(
        (k) => normalizeHeader(k) === normalizedAlias
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
    }
    return "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError("");
    setSuccessMessage("");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const nameLower = droppedFile.name.toLowerCase();
      if (
        nameLower.endsWith(".csv") || 
        nameLower.endsWith(".xlsx") || 
        nameLower.endsWith(".xls") ||
        droppedFile.type === "text/csv" ||
        droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        droppedFile.type === "application/vnd.ms-excel"
      ) {
        setFile(droppedFile);
        parseUploadedFile(droppedFile);
      } else {
        setError("Formato non supportato. Trascina un file .csv, .xlsx o .xls.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccessMessage("");
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseUploadedFile(selectedFile);
    }
  };

  const processDataRows = (rawRows: any[]) => {
    if (!rawRows || rawRows.length === 0) {
      setError("Il file selezionato è vuoto o non contiene dati leggibili.");
      setIsParsing(false);
      return;
    }

    const formatted: ParsedRow[] = rawRows.map((row: any) => {
      const dati: Record<string, string> = {};
      
      // Match each custom project field
      activeProject.campi.forEach((campo) => {
        let aliases = [campo.label, campo.key];
        
        // Append standard aliases for better auto-detection
        if (campo.key === "citta") aliases = [...aliases, ...CITTA_KEYS];
        if (campo.key === "regione") aliases = [...aliases, ...REGIONE_KEYS];
        if (campo.key === "telefono") aliases = [...aliases, ...TELEFONO_KEYS];
        if (campo.key === "email") aliases = [...aliases, ...EMAIL_KEYS];
        if (campo.key === "accountInstagram") aliases = [...aliases, ...INSTAGRAM_KEYS];
        if (campo.key === "presenzaEcommerce") aliases = [...aliases, ...ECOMMERCE_KEYS];
        if (campo.key === "brandDiPunta") aliases = [...aliases, ...BRAND_KEYS];
        if (campo.key === "livelloTarget") aliases = [...aliases, ...TARGET_KEYS];

        dati[campo.key] = getMappedValue(row, aliases);
      });

      return {
        nomeAttivita: getMappedValue(row, NOME_KEYS),
        dati: dati,
        note: getMappedValue(row, NOTE_KEYS)
      };
    });

    // Filter out rows that lack a name (mandatory)
    const withName = formatted.filter(r => r.nomeAttivita.trim() !== "");
    if (withName.length === 0) {
      setError("Nessuna riga valida trovata. Assicurati che ci sia la colonna 'NOME ATTIVITÀ' o 'Nome Boutique'.");
      setIsParsing(false);
      return;
    }

    // Check duplicates against existing database leads by name (case insensitive) for this specific project
    const uniqueInUpload: ParsedRow[] = [];
    let duplicateCounter = 0;

    withName.forEach((row) => {
      const isDuplicateInState = existingLeads.some(
        (el) => el.projectId === activeProject.id && el.nomeAttivita.toLowerCase().trim() === row.nomeAttivita.toLowerCase().trim()
      );
      const isDuplicateInCurrentUpload = uniqueInUpload.some(
        (u) => u.nomeAttivita.toLowerCase().trim() === row.nomeAttivita.toLowerCase().trim()
      );

      if (isDuplicateInState || isDuplicateInCurrentUpload) {
        duplicateCounter++;
      } else {
        uniqueInUpload.push(row);
      }
    });

    setParsedRows(withName);
    setValidRows(uniqueInUpload);
    setDuplicatesCount(duplicateCounter);
    setIsParsing(false);
  };

  const parseUploadedFile = (fileToParse: File) => {
    setIsParsing(true);
    setParsedRows([]);
    setValidRows([]);
    setDuplicatesCount(0);
    setError("");

    const nameLower = fileToParse.name.toLowerCase();

    if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")) {
      // Parse Excel spreadsheet
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Convert sheet to json row objects
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          processDataRows(jsonData);
        } catch (err: any) {
          console.error(err);
          setError("Impossibile leggere il file Excel: " + err.message);
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        setError("Errore di lettura del file.");
        setIsParsing(false);
      };
      reader.readAsArrayBuffer(fileToParse);
    } else {
      // Parse CSV File
      Papa.parse(fileToParse, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => {
          return normalizeHeader(header);
        },
        complete: (results) => {
          processDataRows(results.data);
        },
        error: (err) => {
          setIsParsing(false);
          setError("Errore durante la lettura del CSV: " + err.message);
        }
      });
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      setError("Nessuna nuova attività da importare.");
      return;
    }

    setIsImporting(true);
    setError("");
    setProgress(0);

    let importedCount = 0;
    const defaultStato = activeProject.categorie[0] || 'Lead Freddo';

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        // Add Lead to Firestore
        const leadId = await addLead({
          projectId: activeProject.id,
          nomeAttivita: row.nomeAttivita,
          dati: row.dati,
          stato: defaultStato,
          ultimaNota: row.note || "Attività importata tramite file."
        });

        // Add note to timeline
        await addNoteToLead(leadId, row.note || "Attività importata con successo.");

        importedCount++;
        setProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      setSuccessMessage(`Importazione completata con successo! Inserite ${importedCount} nuove attività.`);
      // Reset after success
      setFile(null);
      setParsedRows([]);
      setValidRows([]);
      setDuplicatesCount(0);
      
      // Auto close after 2.5 seconds
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 2500);

    } catch (err) {
      console.error("Error importing bulk leads:", err);
      setError("Si è verificato un errore durante l'importazione dei dati. Alcune righe potrebbero non essere state inserite.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-3xl bg-[#0c0c0e] rounded-xl shadow-2xl border border-zinc-800/80 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Importa Boutique da Excel / CSV</h3>
              <p className="text-xs text-zinc-500">Aggiungi canali commerciali retail in blocco evitando duplicati</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isImporting}
            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-900/40 text-red-400 text-sm rounded-lg flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-sm rounded-lg flex items-center gap-2.5">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload / Drag zone */}
          {!file && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectClick}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                isDragging 
                  ? "border-blue-500 bg-blue-950/10" 
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/30"
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <Upload size={22} className={isDragging ? "text-blue-400" : ""} />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Trascina qui il tuo file Excel (.xlsx, .xls) o CSV (.csv)</p>
                <p className="text-xs text-zinc-500">Sfoglia per selezionare dal tuo computer</p>
              </div>

              {/* Informative column helpers */}
              <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-lg text-left max-w-lg w-full mt-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Info size={12} className="text-blue-400" />
                  Colonne supportate per mappatura automatica:
                </p>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                  NOME ATTIVITÀ, CITTÀ, REGIONE, TELEFONO, EMAIL, ACCOUNT INSTAGRAM, PRESENZA E-COMMERCE, BRAND DI PUNTA, LIVELLO TARGET, NOTE.
                </p>
              </div>
            </div>
          )}

          {/* Loading/Parsing state */}
          {isParsing && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <RefreshCw size={24} className="text-blue-500 animate-spin" />
              <p className="text-xs text-zinc-400">Analisi e mappatura dei fogli di calcolo...</p>
            </div>
          )}

          {/* Parsed Report & Previews */}
          {file && !isParsing && parsedRows.length > 0 && (
            <div className="space-y-4">
              
              {/* File details card */}
              <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{file.name}</h4>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB • Trovate {parsedRows.length} righe nel foglio</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                    setValidRows([]);
                    setDuplicatesCount(0);
                    setError("");
                  }}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-850 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Rimuovi
                </button>
              </div>

              {/* Analysis Summary Badge indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-950/20 border border-blue-900/20 rounded-lg text-center space-y-0.5">
                  <span className="text-xs text-zinc-400 font-medium">Boutique trovate</span>
                  <p className="text-lg font-bold text-blue-400">{parsedRows.length}</p>
                </div>
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/20 rounded-lg text-center space-y-0.5">
                  <span className="text-xs text-zinc-400 font-medium">Nuovi (Da Importare)</span>
                  <p className="text-lg font-bold text-emerald-400">{validRows.length}</p>
                </div>
                <div className="p-3 bg-amber-950/20 border border-amber-900/20 rounded-lg text-center space-y-0.5">
                  <span className="text-xs text-zinc-400 font-medium">Duplicati Saltati</span>
                  <p className="text-lg font-bold text-amber-500">{duplicatesCount}</p>
                </div>
              </div>

              {/* Duplicate warnings info */}
              {duplicatesCount > 0 && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Abbiamo rilevato <strong>{duplicatesCount} attività</strong> con nomi già registrati nel CRM o ripetuti nel file. Verranno saltati automaticamente per evitare ridondanze.
                  </span>
                </div>
              )}

              {/* Import progress bar */}
              {isImporting && (
                <div className="space-y-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={12} className="animate-spin text-blue-400" />
                      Scrittura sicura nel database Firestore...
                    </span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scrollable preview table */}
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Anteprima dei Dati (Primi 5 Record)</h5>
                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/20 text-xs">
                  <div className="max-h-[180px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#09090b] text-zinc-500 sticky top-0 font-bold border-b border-zinc-800">
                        <tr>
                          <th className="p-2 border-r border-zinc-850">Attività</th>
                          <th className="p-2 border-r border-zinc-850">Città</th>
                          <th className="p-2 border-r border-zinc-850">Instagram</th>
                          <th className="p-2 border-r border-zinc-850">Brand</th>
                          <th className="p-2">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {parsedRows.slice(0, 5).map((row, index) => {
                          const isDuplicated = existingLeads.some(
                            (el) => el.nomeAttivita.toLowerCase().trim() === row.nomeAttivita.toLowerCase().trim()
                          );
                          return (
                            <tr key={index} className={`hover:bg-zinc-900/30 ${isDuplicated ? "opacity-40 line-through decoration-zinc-600 bg-amber-950/5" : ""}`}>
                              <td className="p-2 border-r border-zinc-850 font-medium text-white max-w-[120px] truncate">
                                {row.nomeAttivita}
                                {isDuplicated && <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-900/40 px-1 py-0.5 rounded ml-1 font-sans font-bold uppercase tracking-wider">Duplicato</span>}
                              </td>
                              <td className="p-2 border-r border-zinc-850 text-zinc-400 max-w-[80px] truncate">{row.dati.citta || row.dati[Object.keys(row.dati)[0]] || "-"}</td>
                              <td className="p-2 border-r border-zinc-850 text-blue-400 max-w-[100px] truncate">{row.dati.accountInstagram || row.dati[Object.keys(row.dati)[1]] || "-"}</td>
                              <td className="p-2 border-r border-zinc-850 text-zinc-400 max-w-[120px] truncate">{row.dati.brandDiPunta || row.dati[Object.keys(row.dati)[2]] || "-"}</td>
                              <td className="p-2 text-zinc-500 truncate max-w-[150px]">{row.note || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 5 && (
                    <div className="bg-[#09090b] p-1.5 border-t border-zinc-800 text-center text-[10px] text-zinc-500">
                      Mostrati solo i primi 5 record di {parsedRows.length} totali
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#09090b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
            <Sparkles size={14} className="text-yellow-500" />
            <span>Default Stato: <strong className="text-zinc-300">Lead Freddo</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || isParsing || validRows.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 disabled:text-zinc-500 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isImporting ? "Importazione..." : `Importa ${validRows.length} Boutique`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
