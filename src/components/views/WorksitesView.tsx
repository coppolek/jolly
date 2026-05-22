import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../store';
import { Worksite, WorksiteAssignment } from '../../types';
import { Plus, X, Pencil, Trash2, MapPin, Users, List, Map as MapIcon, GripVertical, Search } from 'lucide-react';
import { WorksitesMap } from './WorksitesMap';

export const WorksitesView = () => {
  const { worksites, workers, upsertWorksite, deleteWorksite, importWorksites, currentUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorksite, setCurrentWorksite] = useState<Partial<Worksite>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [worksiteToDelete, setWorksiteToDelete] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');

  const isManager = currentUser?.role === 'manager';
  const [viewMode, setViewMode] = useState<'list'|'map'>('list');

  const filteredWorksites = useMemo(() => {
    return worksites.filter(ws => 
      `${ws.name} ${ws.client} ${ws.address}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [worksites, searchTerm]);

  const filteredAssignmentWorkers = useMemo(() => {
    return workers.filter(w => 
      `${w.firstName} ${w.lastName} ${w.role}`.toLowerCase().includes(workerSearchTerm.toLowerCase())
    );
  }, [workers, workerSearchTerm]);


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
      const newWorksites: Omit<Worksite, 'id'>[] = [];
      
      dataLines.forEach(line => {
        const parts = line.split(';');
        if (parts.length >= 2) {
          const nome = parts[0]?.replace(/^"|"$/g, '').trim();
          const indirizzo = parts[1]?.replace(/^"|"$/g, '').trim();
          const comune = parts[2]?.replace(/^"|"$/g, '').trim();
          const provincia = parts[3]?.replace(/^"|"$/g, '').trim();
          
          if (nome) {
            newWorksites.push({
              name: nome,
              client: '',
              address: [indirizzo, comune, provincia].filter(Boolean).join(', '),
              active: true,
              assignments: []
            });
          }
        }
      });

      if (newWorksites.length > 0) {
        await importWorksites(newWorksites);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleEdit = (worksite: Worksite) => {
    setCurrentWorksite({ ...worksite, assignments: worksite.assignments || [] });
    setIsEditing(true);
  };

  const handleAdd = () => {
    setCurrentWorksite({ active: true, assignments: [] });
    setIsEditing(true);
  };

  const confirmDelete = async (id: string) => {
    await deleteWorksite(id);
    setWorksiteToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertWorksite({ ...currentWorksite, assignments: currentWorksite.assignments || [] } as Worksite);
    setIsEditing(false);
  };

  const addAssignment = () => {
    setCurrentWorksite({
      ...currentWorksite,
      assignments: [
        ...(currentWorksite.assignments || []),
        { workerId: '', schedule: { lun: '', mar: '', mer: '', gio: '', ven: '', sab: '', dom: '' } }
      ]
    });
  };

  const removeAssignment = (index: number) => {
    const newAss = [...(currentWorksite.assignments || [])];
    newAss.splice(index, 1);
    setCurrentWorksite({ ...currentWorksite, assignments: newAss });
  };

  const updateAssignment = (index: number, field: string, value: string, day?: string) => {
    const newAss = [...(currentWorksite.assignments || [])];
    if (day) {
      newAss[index].schedule = { ...newAss[index].schedule, [day]: value };
    } else {
       newAss[index] = { ...newAss[index], [field]: value };
    }
    setCurrentWorksite({ ...currentWorksite, assignments: newAss });
  };

  const handleAssignmentDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'assignment', index }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAssignmentDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'assignment' && data.index !== index) {
        const newAss = [...(currentWorksite.assignments || [])];
        const [moved] = newAss.splice(data.index, 1);
        newAss.splice(index, 0, moved);
        setCurrentWorksite({ ...currentWorksite, assignments: newAss });
      }
    } catch (err) {}
  };

  const handleScheduleDragStart = (e: React.DragEvent, assIndex: number, day: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'schedule', assIndex, day }));
  };

  const handleScheduleDrop = (e: React.DragEvent, targetAssIndex: number, targetDay: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'schedule') {
        const sourceAssIndex = data.assIndex;
        const sourceDay = data.day;
        
        if (sourceAssIndex === targetAssIndex && sourceDay === targetDay) return;
        
        const newAss = [...(currentWorksite.assignments || [])];
        
        const sourceVal = newAss[sourceAssIndex].schedule[sourceDay as keyof typeof newAss[0]['schedule']];
        const targetVal = newAss[targetAssIndex].schedule[targetDay as keyof typeof newAss[0]['schedule']];
        
        newAss[sourceAssIndex].schedule[sourceDay as keyof typeof newAss[0]['schedule']] = targetVal;
        newAss[targetAssIndex].schedule[targetDay as keyof typeof newAss[0]['schedule']] = sourceVal;
        
        setCurrentWorksite({ ...currentWorksite, assignments: newAss });
      }
    } catch (err) {}
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[white] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">Cantieri</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">Luoghi di Lavoro e Assegnazioni</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder="Cerca cantiere..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-2 border border-[#1A1A1A] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>
          <div className="flex border border-[#1A1A1A] p-0.5 bg-white">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-[10px] uppercase font-bold flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A] hover:bg-gray-100'}`}>
               <List className="w-4 h-4" /> Elenco
            </button>
            <button onClick={() => setViewMode('map')} className={`px-4 py-2 text-[10px] uppercase font-bold flex items-center gap-2 transition-colors ${viewMode === 'map' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A] hover:bg-gray-100'}`}>
               <MapIcon className="w-4 h-4" /> Mappa
            </button>
          </div>
          {isManager && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-10 flex flex-col">
        {viewMode === 'map' ? (
          <div className="flex-1 min-h-[500px]">
            <WorksitesMap worksites={filteredWorksites} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredWorksites.map(ws => (
            <div key={ws.id} className="border border-[#1A1A1A] flex flex-col bg-[white] group relative hover:shadow-[4px_4px_0_0_rgba(26,26,26,1)] transition-all">
              <div className="p-6 border-b border-[#1A1A1A] bg-white flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">{ws.name}</h3>
                  <p className="text-xs font-serif italic opacity-60 mt-1">{ws.client || 'Cliente non specificato'}</p>
                </div>
                <span className={`px-2 py-1 text-[8px] uppercase font-bold tracking-widest border ${ws.active ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50'}`}>
                  {ws.active ? 'Attivo' : 'Chiuso'}
                </span>
              </div>
              
              <div className="p-6 flex flex-col gap-4 flex-1">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 opacity-40 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{ws.address || 'Nessun indirizzo specificato'}</p>
                </div>
                <div className="flex items-start gap-3 border-t border-[#1A1A1A]/10 pt-4">
                  <Users className="w-4 h-4 opacity-40 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-2">Lavoratori Assegnati ({ws.assignments?.length || 0})</p>
                    {ws.assignments && ws.assignments.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {ws.assignments.map((ass, i) => {
                          const w = workers.find(w => w.id === ass.workerId);
                          return (
                            <div key={i} className="text-xs border border-[#1A1A1A]/10 bg-white p-2">
                              <span className="font-bold">{w ? `${w.lastName} ${w.firstName}` : 'Sconosciuto'}</span>
                              <div className="flex gap-2 text-[10px] opacity-60 mt-1">
                                {Object.entries(ass.schedule).map(([day, hr]) => hr ? <span key={day} className="capitalize">{day}: {hr}</span> : null)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isManager && (
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => handleEdit(ws)} className="p-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white shadow-sm">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setWorksiteToDelete(ws.id)} className="p-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors bg-white shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {worksites.length === 0 && (
            <div className="col-span-full py-12 text-center text-[10px] uppercase tracking-widest opacity-40">
              Nessun cantiere in anagrafica
            </div>
          )}
        </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-[white]/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-white border border-[#1A1A1A] w-full max-w-4xl shadow-[8px_8px_0_0_rgba(26,26,26,1)] flex flex-col my-8">
             <div className="flex items-center justify-between px-8 py-6 border-b border-[#1A1A1A] bg-[white] sticky top-0 z-10">
               <h2 className="text-2xl font-serif italic tracking-tighter">{currentWorksite.id ? 'Modifica Cantiere' : 'Nuovo Cantiere'}</h2>
               <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-[#1A1A1A] hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 flex flex-col md:flex-row gap-8">
               <div className="flex-1 space-y-4">
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Nome Cantiere</label>
                   <input required value={currentWorksite.name || ''} onChange={e => setCurrentWorksite({...currentWorksite, name: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>
                 
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Cliente</label>
                   <input value={currentWorksite.client || ''} onChange={e => setCurrentWorksite({...currentWorksite, client: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]" />
                 </div>

                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Indirizzo</label>
                   <textarea rows={2} value={currentWorksite.address || ''} onChange={e => setCurrentWorksite({...currentWorksite, address: e.target.value})} className="w-full border border-[#1A1A1A] bg-transparent py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] resize-none" />
                 </div>

                 <div className="flex items-center gap-3 pt-2">
                   <input type="checkbox" id="active" checked={currentWorksite.active} onChange={e => setCurrentWorksite({...currentWorksite, active: e.target.checked})} className="w-4 h-4 accent-[#1A1A1A] border-[#1A1A1A]" />
                   <label htmlFor="active" className="text-[10px] uppercase font-bold tracking-widest cursor-pointer">Cantiere Attivo</label>
                 </div>
                 
                 <div className="pt-6 border-t border-[#1A1A1A]/10 mt-6 hidden md:block">
                   <button type="submit" className="w-full py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-[white] text-[10px] uppercase tracking-widest font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all">
                     Salva Cantiere
                   </button>
                 </div>
               </div>

               <div className="flex-[1.5] border-t md:border-t-0 md:border-l border-[#1A1A1A] md:pl-8 space-y-4">
                 <div className="flex justify-between items-center mb-4 border-b border-[#1A1A1A]/10 pb-2">
                    <h3 className="text-[10px] uppercase font-bold tracking-widest">Assegnazione Lavoratori</h3>
                    <div className="relative mx-4 flex-1 max-w-[200px]">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 opacity-40" />
                      <input 
                        type="text" 
                        placeholder="Cerca lavoratore..." 
                        value={workerSearchTerm}
                        onChange={(e) => setWorkerSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-[10px] border border-[#1A1A1A] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                      />
                    </div>
                    <button type="button" onClick={addAssignment} className="text-[10px] uppercase font-bold underline hover:no-underline">
                      + Aggiungi
                    </button>
                 </div>
                 
                 <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
                   {currentWorksite.assignments?.map((ass, i) => (
                     <div 
                       key={i} 
                       className="border border-[#1A1A1A] p-4 bg-[white] relative"
                       onDragOver={handleDragOver}
                       onDrop={(e) => handleAssignmentDrop(e, i)}
                     >
                       <div 
                         className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 opacity-50 hover:opacity-100"
                         draggable
                         onDragStart={(e) => handleAssignmentDragStart(e, i)}
                         title="Trascina per riordinare"
                       >
                         <GripVertical className="w-4 h-4 text-[#1A1A1A]" />
                       </div>
                       <button type="button" onClick={() => removeAssignment(i)} className="absolute top-2 right-2 p-1 hover:bg-red-500 hover:text-white border border-transparent hover:border-[#1A1A1A] transition-colors rounded">
                         <X className="w-3 h-3" />
                       </button>
                       <div className="mb-4 pr-6 pl-6">
                         <label className="block text-[10px] uppercase font-bold tracking-widest mb-1">Lavoratore</label>
                         <select required value={ass.workerId} onChange={e => updateAssignment(i, 'workerId', e.target.value)} className="w-full border border-[#1A1A1A] bg-white py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]">
                           <option value="">Seleziona lavoratore...</option>
                           {filteredAssignmentWorkers.map(w => (
                             <option key={w.id} value={w.id}>{w.lastName} {w.firstName} ({w.role})</option>
                           ))}
                           {ass.workerId && !filteredAssignmentWorkers.find(w => w.id === ass.workerId) && (
                             (() => {
                               const w = workers.find(w => w.id === ass.workerId);
                               return w ? <option key={w.id} value={w.id}>{w.lastName} {w.firstName} ({w.role})</option> : null;
                             })()
                           )}
                         </select>
                       </div>
                       
                       <div className="pl-6">
                         <label className="block text-[10px] uppercase font-bold tracking-widest mb-2">Orari Settimanali</label>
                         <div className="grid grid-cols-4 gap-2">
                           {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map(day => (
                             <div 
                               key={day} 
                               className="flex flex-col relative group"
                               onDragOver={handleDragOver}
                               onDrop={(e) => handleScheduleDrop(e, i, day)}
                             >
                               <span className="text-[9px] uppercase font-bold mb-1 ml-1">{day}</span>
                               <div 
                                 className="absolute top-0 right-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1"
                                 draggable
                                 onDragStart={(e) => handleScheduleDragStart(e, i, day)}
                                 title="Trascina orario"
                               >
                                 <GripVertical className="w-3 h-3 text-[#1A1A1A]" />
                               </div>
                               <input placeholder="es. 8-12 / 13-17" value={ass.schedule[day as keyof typeof ass.schedule]} onChange={e => updateAssignment(i, '', e.target.value, day)} className="w-full border border-[#1A1A1A]/20 bg-white py-1 px-2 text-[10px] focus:outline-none focus:border-[#1A1A1A]" />
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                   ))}
                   {(!currentWorksite.assignments || currentWorksite.assignments.length === 0) && (
                     <p className="text-xs opacity-50 italic">Nessun lavoratore assegnato. Clicca "+ Aggiungi" per iniziare.</p>
                   )}
                 </div>

                 <div className="pt-6 border-t border-[#1A1A1A]/10 mt-6 md:hidden">
                   <button type="submit" className="w-full py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-[white] text-[10px] uppercase tracking-widest font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all">
                     Salva Cantiere
                   </button>
                 </div>
               </div>

             </form>
           </div>
        </div>
      )}

      {worksiteToDelete && (
        <div className="fixed inset-0 z-50 bg-[white]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1A] p-8 max-w-sm w-full shadow-[8px_8px_0_0_rgba(26,26,26,1)] text-center">
            <h3 className="text-2xl font-serif italic mb-2">Elimina Cantiere</h3>
            <p className="text-sm opacity-60 mb-8">Sei sicuro di voler eliminare questo cantiere? L'operazione non è reversibile.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setWorksiteToDelete(null)} className="px-6 py-2 border border-[#1A1A1A] text-[10px] uppercase font-bold hover:bg-[white] transition-colors">
                Annulla
              </button>
              <button onClick={() => confirmDelete(worksiteToDelete)} className="px-6 py-2 border border-red-500 bg-red-500 text-white text-[10px] uppercase font-bold hover:bg-transparent hover:text-red-500 transition-colors">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
