import React from "react";
import { Users, Calendar } from "lucide-react";
import { getCategoryParts } from "../types";
import type { Lead, Project } from "../types";

interface StatsBannerProps {
  leads: Lead[];
  activeProject: Project;
}

export default function StatsBanner({ leads, activeProject }: StatsBannerProps) {
  const totalLeads = leads.length;
  
  // Get top 4 project categories to show on the metrics dashboard alongside total count (makes 5 panels)
  const topCategories = activeProject.categorie.slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Leads */}
      <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Totale Attività</span>
          <span className="text-2xl font-bold text-white mt-1 block">{totalLeads}</span>
        </div>
        <div className="p-3 bg-blue-950/40 text-blue-400 border border-blue-900/30 rounded-xl">
          <Users size={20} />
        </div>
      </div>

      {/* Dynamic categories */}
      {topCategories.map((cat, idx) => {
        const catParts = getCategoryParts(cat);
        const count = leads.filter(l => {
          const leadClean = getCategoryParts(l.stato).name.toLowerCase().trim();
          const catClean = catParts.name.toLowerCase().trim();
          return leadClean === catClean;
        }).length;
        
        const colors = [
          { text: 'text-amber-500', bg: 'bg-amber-950/40', border: 'border-amber-900/30' },
          { text: 'text-emerald-500', bg: 'bg-emerald-950/40', border: 'border-emerald-900/30' },
          { text: 'text-purple-500', bg: 'bg-purple-950/40', border: 'border-purple-900/30' },
          { text: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-750' },
        ];
        const clr = colors[idx % colors.length];

        return (
          <div key={cat} className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block truncate max-w-[140px]" title={catParts.name}>
                {catParts.emoji} {catParts.name}
              </span>
              <span className={`text-2xl font-bold mt-1 block ${clr.text}`}>{count}</span>
            </div>
            <div className={`p-3 ${clr.bg} ${clr.text} border ${clr.border} rounded-xl`}>
              <Calendar size={18} />
            </div>
          </div>
        );
      })}

      {/* Balance fill if categories are fewer than 4 */}
      {topCategories.length < 4 && Array.from({ length: 4 - topCategories.length }).map((_, i) => (
        <div key={i} className="bg-zinc-900/20 p-4 rounded-xl border border-zinc-800/40 shadow-xs flex items-center justify-between opacity-30">
          <div>
            <span className="text-xs font-semibold text-zinc-650 uppercase tracking-wider block">Nessuno Stato</span>
            <span className="text-xl font-bold text-zinc-700 mt-1 block">-</span>
          </div>
        </div>
      ))}
    </div>
  );
}
