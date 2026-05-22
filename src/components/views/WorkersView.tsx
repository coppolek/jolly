import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../store';
import { Worker } from '../../types';
import { Plus, X, Pencil, Trash2, Search } from 'lucide-react';

export const WorkersView = () => {
  const { workers, worksites, upsertWorker, deleteWorker, importWorkers, currentUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorker, setCurrentWorker] = useState<Partial<Worker>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [workerToDelete, setWorkerToDelete] = useState<string[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isManager = currentUser?.role === 'manager';

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => 
      `${w.firstName} ${w.lastName} ${w.role} ${w.phone} ${w.email} ${w.fiscalCode}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  const groupedWorkers = useMemo(() => {
    const map = new Map<string, typeof workers[0] & { allIds: string[] }>();
    filteredWorkers.forEach(w => {
      const key = `${w.lastName} ${w.firstName}`.toLowerCase().trim();
      if (map.has(key)) {
        map.get(key)!.allIds.push(w.id);
      } else {
        map.set(key, { ...w, allIds: [w.id] });
      }
    });
    return Array.from(map.values());
  }, [filteredWorkers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;
      
      const dataLines = lines.slice(1);
      const newWorkers: Omit<Worker, 'id'>[] = [];
      
      dataLines.forEach(line => {
        const parts = line.split(';');
        if (parts.length >= 2) {
          const role = parts[0]?.replace(/^"|"$/g, '').trim();
          const persona = parts[1]?.replace(/^"|"$/g, '').trim();
          const matricola = parts[5]?.replace(/^"|"$/g, '').trim();
          
          if (persona) {
            const nameParts = persona.split(' ');
            const lastName = nameParts[0];
            const firstName = nameParts.slice(1).join(' ');
            
            newWorkers.push({
              firstName: firstName || '-',
              lastName: lastName || '-',
              role: role || 'Altro',
              notes: matricola ? `Matricola badge: ${matricola}` : ''
            });
          }
        }
      });

      if (newWorkers.length > 0) {
        await importWorkers(newWorkers);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleEdit = (worker: Worker) => {
    setCurrentWorker(worker);
    setIsEditing(true);
  };

  const handleAdd = () => {
    setCurrentWorker({});
    setIsEditing(true);
  };

  const confirmDelete = async (ids: string[]) => {
    for (const id of ids) {
      await deleteWorker(id);
    }
    setWorkerToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertWorker(currentWorker as Worker);
    setIsEditing(false);
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[white] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">Lavoratori</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">Anagrafica Personale</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder="Cerca lavoratore..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-2 border border-[#1A1A1A] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>
          {isManager && (
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 border border-[#1A1A1A] bg-white text-[#1A1A1A] text-[10px] uppercase font-bold hover:bg-[#1A1A1A] hover:text-[white] transition-all flex items-center gap-2"
              >
                Importa CSV
              </button>
              <button 
                onClick={handleAdd}
                className="px-6 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[white] text-[10px] uppercase font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Aggiungi
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedWorkers.map(worker => {
            const workerWorksites = worksites.filter(ws => ws.assignments?.some(a => worker.allIds.includes(a.workerId)));
            
            return (
            <div key={worker.id} className="border border-[#1A1A1A] bg-[white] p-6 flex flex-col group relative">
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">{worker.role}</p>
                <h3 className="text-xl font-bold uppercase">{worker.lastName} {worker.firstName}</h3>
              </div>
              
              <div className="space-y-2 mt-auto">
                <p className="text-sm border-b border-[#1A1A1A]/10 pb-2"><span className="opacity-50 text-xs">Tel:</span> {worker.phone || '-'}</p>
                <p className="text-sm border-b border-[#1A1A1A]/10 pb-2"><span className="opacity-50 text-xs">Email:</span> {worker.email || '-'}</p>
                <p className="text-sm border-b border-[#1A1A1A]/10 pb-2"><span className="opacity-50 text-xs">CF:</span> {worker.fiscalCode || '-'}</p>
                {workerWorksites.length > 0 && (
                  <p className="text-sm pt-2">
                    <span className="opacity-50 text-xs block mb-1">Cantieri:</span> 
                    <span className="flex flex-col gap-1 font-medium text-[11px] uppercase tracking-wider">
                      {workerWorksites.map(ws => (
                        <span key={ws.id} className="bg-white px-2 py-1 border border-[#1A1A1A]/20 rounded-sm">
                          {ws.name}
                        </span>
                      ))}
                    </span>
                  </p>
                )}
              </div>

              {isManager && (
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => handleEdit(worker)} className="p-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setWorkerToDelete(worker.allIds)} className="p-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors bg-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            );
          })}
          {workers.length === 0 && (
            <div className="col-span-full py-12 text-center text-[10px] uppercase tracking-widest opacity-40">
              Nessun lavoratore in anagrafica
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-[white]/90 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white border border-[#1A1A1A] w-full max-w-lg shadow-[8px_8px_0_0_rgba(26,26,26,1)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between px-8 py-6 border-b border-[#1A1A1A] bg-[white]">
               <h2 className="text-2xl font-serif italic tracking-tighter">{currentWorker.id ? 'Modifica Lavoratore' : 'Nuovo Lavoratore'}</h2>
               <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-[#1A1A1A] hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Nome</label>
                   <input required value={currentWorker.firstName || ''} onChange={e => setCurrentWorker({...currentWorker, firstName: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Cognome</label>
                   <input required value={currentWorker.lastName || ''} onChange={e => setCurrentWorker({...currentWorker, lastName: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>
               </div>
               
               <div>
                 <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Ruolo/Mansione</label>
                 <select required value={currentWorker.role || ''} onChange={e => setCurrentWorker({...currentWorker, role: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]">
                   <option value="">Seleziona...</option>
                   <option value="Jolly">Jolly</option>
                   <option value="Occasionale">Occasionale</option>
                   <option value="Fisso">Fisso</option>
                   <option value="Autista">Autista</option>
                   <option value="Altro">Altro</option>
                 </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Telefono</label>
                   <input value={currentWorker.phone || ''} onChange={e => setCurrentWorker({...currentWorker, phone: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Codice Fiscale</label>
                   <input value={currentWorker.fiscalCode || ''} onChange={e => setCurrentWorker({...currentWorker, fiscalCode: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Email</label>
                 <input type="email" value={currentWorker.email || ''} onChange={e => setCurrentWorker({...currentWorker, email: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
               </div>

               <div className="pt-6 flex justify-end">
                 <button type="submit" className="px-8 py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-[white] text-[10px] uppercase tracking-widest font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all">
                   Salva
                 </button>
               </div>
             </form>
           </div>
        </div>
      )}

      {workerToDelete && (
        <div className="fixed inset-0 z-50 bg-[white]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1A] p-8 max-w-sm w-full shadow-[8px_8px_0_0_rgba(26,26,26,1)] text-center">
            <h3 className="text-2xl font-serif italic mb-2">Elimina Lavoratore</h3>
            <p className="text-sm opacity-60 mb-8">Sei sicuro di voler eliminare questo lavoratore? L'operazione non è reversibile.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setWorkerToDelete(null)} className="px-6 py-2 border border-[#1A1A1A] text-[10px] uppercase font-bold hover:bg-[white] transition-colors">
                Annulla
              </button>
              <button onClick={() => confirmDelete(workerToDelete)} className="px-6 py-2 border border-red-500 bg-red-500 text-white text-[10px] uppercase font-bold hover:bg-transparent hover:text-red-500 transition-colors">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
