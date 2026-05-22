import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GripVertical, Plus, ChevronLeft, ChevronRight, Search, AlertCircle, Save } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, addDays, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAppContext } from '../../store';
import { toast } from 'sonner';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

type DayCell = { text: string; ore: string };
type OperatorRow = {
  lun: DayCell;
  mar: DayCell;
  mer: DayCell;
  gio: DayCell;
  ven: DayCell;
  sab: DayCell;
  dom: DayCell;
};

type OperatorBlock = {
  name: string;
  totalWeek: string;
  totals: {
    lun: string;
    mar: string;
    mer: string;
    gio: string;
    ven: string;
    sab: string;
    dom: string;
  };
  rows: OperatorRow[];
};

const initialData: OperatorBlock[] = [
  {
    name: 'MARIANNA (Jolly)',
    totalWeek: '',
    totals: { lun: '', mar: '', mer: '', gio: '', ven: '', sab: '', dom: '' },
    rows: [
      {
        lun: { text: '', ore: '' },
        mar: { text: '', ore: '' },
        mer: { text: '', ore: '' },
        gio: { text: '', ore: '' },
        ven: { text: '', ore: '' },
        sab: { text: '', ore: '' },
        dom: { text: '', ore: '' }
      }
    ]
  },
  {
    name: 'GIOVANNI (Jolly)',
    totalWeek: '',
    totals: { lun: '', mar: '', mer: '', gio: '', ven: '', sab: '', dom: '' },
    rows: [
      {
        lun: { text: '', ore: '' },
        mar: { text: '', ore: '' },
        mer: { text: '', ore: '' },
        gio: { text: '', ore: '' },
        ven: { text: '', ore: '' },
        sab: { text: '', ore: '' },
        dom: { text: '', ore: '' }
      }
    ]
  }
];

export const SubstitutionsTable = () => {
  const { requests, workers, worksites, currentWeekStart, setCurrentWeekStart, addCoveredShiftId } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const monthName = format(currentWeekStart, 'MMMM yyyy', { locale: it }).toUpperCase();

  const dayNames = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
  const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;

  const dynamicDays = dayNames.map((name, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      date,
      day: `${format(date, 'd')} ${name}`,
      key: dayKeys[i]
    };
  });

  const weekId = format(currentWeekStart, 'yyyy-MM-dd');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoadRef = useRef(true);

  const [tableData, setTableData] = useState<OperatorBlock[]>(() => {
    const extractTime = (text: string) => {
      if (!text) return Infinity;
      const match = text.match(/0?(\d{1,2})[:.](\d{2})/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      return Infinity;
    };

    return initialData.map(block => {
      const newBlock = { ...block, rows: block.rows.map(r => ({ ...r })) };
      const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;
      
      for (const day of dayKeys) {
        const cells = newBlock.rows.map(row => row[day as keyof typeof row]);
        cells.sort((a, b) => extractTime((a as any).text) - extractTime((b as any).text));
        newBlock.rows.forEach((row, i) => {
          (row as any)[day] = cells[i];
        });
      }
      return newBlock;
    });
  });

  useEffect(() => {
    isInitialLoadRef.current = true;
    const unsub = onSnapshot(doc(db, 'jolly_plans', weekId), (docSnap) => {
      if (docSnap.exists()) {
        setTableData(docSnap.data().blocks);
      } else {
        setTableData(JSON.parse(JSON.stringify(initialData)));
      }
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    });
    return () => unsub();
  }, [weekId]);

  const saveToFirestore = async (dataToSave: OperatorBlock[]) => {
    try {
      setIsSaving(true);
      await setDoc(doc(db, 'jolly_plans', weekId), { blocks: dataToSave }, { merge: true });
    } catch (err) {
      console.error(err);
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTableData = (newData: OperatorBlock[]) => {
    setTableData(newData);
    if (!isInitialLoadRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToFirestore(newData);
      }, 1000);
    }
  };

  const calculateHoursFromText = (text: string): string => {
    if (!text) return '';
    const regex = /(\d{1,2})(?:[:.](\d{2}))?\s*-\s*(\d{1,2})(?:[:.](\d{2}))?/g;
    let totalHours = 0;
    let match;
    let found = false;
    while ((match = regex.exec(text)) !== null) {
      found = true;
      const startH = parseInt(match[1]);
      const startM = match[2] ? parseInt(match[2]) : 0;
      const endH = parseInt(match[3]);
      const endM = match[4] ? parseInt(match[4]) : 0;
      
      let diff = (endH + endM / 60) - (startH + startM / 60);
      if (diff < 0) diff += 24;
      totalHours += diff;
    }
    if (!found) return '';
    return totalHours.toString().replace('.', ',');
  };

  const recalculateBlockTotals = (block: OperatorBlock): OperatorBlock => {
    const newBlock = { ...block, totals: { ...block.totals} };
    const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;
    
    let weekTotal = 0;
    for (const day of dayKeys) {
      let dayTotal = 0;
      for (const row of newBlock.rows) {
        const oreStr = (row as any)[day].ore;
        if (oreStr) {
          const val = parseFloat(oreStr.replace(',', '.'));
          if (!isNaN(val)) dayTotal += val;
        }
      }
      (newBlock.totals as any)[day] = dayTotal > 0 ? dayTotal.toString().replace('.', ',') : '';
      weekTotal += dayTotal;
    }
    
    newBlock.totalWeek = weekTotal > 0 ? weekTotal.toString().replace('.', ',') : '';
    return newBlock;
  };

  const sortBlock = (block: OperatorBlock): OperatorBlock => {
    const extractTime = (text: string) => {
      if (!text) return Infinity;
      const match = text.match(/0?(\d{1,2})[:.](\d{2})/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      return Infinity;
    };

    const newBlock = { ...block, rows: block.rows.map(r => ({ ...r })) };
    const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;
    
    for (const day of dayKeys) {
      const cells = newBlock.rows.map(row => row[day as keyof typeof row]);
      cells.sort((a, b) => extractTime((a as any).text) - extractTime((b as any).text));
      newBlock.rows.forEach((row, i) => {
        (row as any)[day] = cells[i];
      });
    }
    return newBlock;
  };

  const handleCellBlur = (blockIdx: number) => {
    const newData = [...tableData];
    newData[blockIdx] = sortBlock(recalculateBlockTotals(newData[blockIdx]));
    updateTableData(newData);
  };

  const handleCellChange = (blockIdx: number, rowIdx: number, dayKey: string, field: 'text' | 'ore', value: string) => {
    const newData = [...tableData];
    const row = newData[blockIdx].rows[rowIdx] as any;
    row[dayKey][field] = value;
    
    if (field === 'text') {
      const calculated = calculateHoursFromText(value);
      if (calculated !== '') {
        row[dayKey].ore = calculated;
      } else if (value.trim() === '') {
        row[dayKey].ore = '';
      }
    }
    
    newData[blockIdx] = recalculateBlockTotals(newData[blockIdx]);
    updateTableData(newData);
  };

  const handleTotalChange = (blockIdx: number, dayKey: string, value: string) => {
    const newData = [...tableData];
    (newData[blockIdx].totals as any)[dayKey] = value;

    let weekTotal = 0;
    const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;
    for (const day of dayKeys) {
      const dayTotalStr = (newData[blockIdx].totals as any)[day];
      if (dayTotalStr) {
        const val = parseFloat(dayTotalStr.replace(',', '.'));
        if (!isNaN(val)) weekTotal += val;
      }
    }
    newData[blockIdx].totalWeek = weekTotal > 0 ? weekTotal.toString().replace('.', ',') : '';

    updateTableData(newData);
  };

  const handleNameChange = (blockIdx: number, value: string) => {
    const newData = [...tableData];
    newData[blockIdx].name = value;
    updateTableData(newData);
  };

  const handleTotalWeekChange = (blockIdx: number, value: string) => {
    const newData = [...tableData];
    newData[blockIdx].totalWeek = value;
    updateTableData(newData);
  };

  const handleAddRow = (blockIdx: number) => {
    const newData = [...tableData];
    newData[blockIdx] = { ...newData[blockIdx], rows: [...newData[blockIdx].rows] };
    newData[blockIdx].rows.push({
      lun: { text: '', ore: '' },
      mar: { text: '', ore: '' },
      mer: { text: '', ore: '' },
      gio: { text: '', ore: '' },
      ven: { text: '', ore: '' },
      sab: { text: '', ore: '' },
      dom: { text: '', ore: '' }
    });
    updateTableData(newData);
  };

  const handleAddJolly = () => {
    const newData = [...tableData];
    newData.push({
      name: 'NUOVO JOLLY',
      totalWeek: '',
      totals: { lun: '', mar: '', mer: '', gio: '', ven: '', sab: '', dom: '' },
      rows: [
        {
          lun: { text: '', ore: '' },
          mar: { text: '', ore: '' },
          mer: { text: '', ore: '' },
          gio: { text: '', ore: '' },
          ven: { text: '', ore: '' },
          sab: { text: '', ore: '' },
          dom: { text: '', ore: '' }
        }
      ]
    });
    updateTableData(newData);
  };

  const handleCellDragStart = (e: React.DragEvent, blockIdx: number, rowIdx: number, dayKey: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'cell', blockIdx, rowIdx, dayKey }));
  };

  const handleRowDragStart = (e: React.DragEvent, blockIdx: number, rowIdx: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'row', blockIdx, rowIdx }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRowDrop = (e: React.DragEvent, targetBlockIdx: number, targetRowIdx: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'row') {
        const sourceBlockIdx = data.blockIdx;
        const sourceRowIdx = data.rowIdx;
        
        if (sourceBlockIdx === targetBlockIdx && sourceRowIdx === targetRowIdx) return;
        
        const newData = [...tableData];
        
        if (sourceBlockIdx === targetBlockIdx) {
          const newRows = [...newData[sourceBlockIdx].rows];
          const [movedRow] = newRows.splice(sourceRowIdx, 1);
          newRows.splice(targetRowIdx, 0, movedRow);
          newData[sourceBlockIdx] = { ...newData[sourceBlockIdx], rows: newRows };
        } else {
          const sourceRows = [...newData[sourceBlockIdx].rows];
          const [movedRow] = sourceRows.splice(sourceRowIdx, 1);
          
          const targetRows = [...newData[targetBlockIdx].rows];
          targetRows.splice(targetRowIdx, 0, movedRow);
          
          newData[sourceBlockIdx] = recalculateBlockTotals({ ...newData[sourceBlockIdx], rows: sourceRows });
          newData[targetBlockIdx] = recalculateBlockTotals({ ...newData[targetBlockIdx], rows: targetRows });
        }
        
        updateTableData(newData);
      }
    } catch (err) {}
  };

  const handleExternalCellDragStart = (e: React.DragEvent, text: string, ore: string, dayKey: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'external-cell', text, ore, dayKey }));
  };

  const handleCellDrop = (e: React.DragEvent, targetBlockIdx: number, targetRowIdx: number, targetDayKey: string) => {
    e.preventDefault();
    try {
      const source = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (source.type === 'external-cell') {
         if (source.dayKey !== targetDayKey) {
           toast.error("Puoi inserire questo turno solo nel giorno corrispondente all'assenza.");
           return;
         }
         
         const newData = [...tableData];
         const targetRow = newData[targetBlockIdx].rows[targetRowIdx] as any;
         
         // If target already has something, we append or overwrite? Let's overwrite or append
         if (targetRow[targetDayKey].text) {
           targetRow[targetDayKey].text += `\n${source.text}`;
           
           const recalculated = calculateHoursFromText(targetRow[targetDayKey].text);
           if (recalculated !== '') {
             targetRow[targetDayKey].ore = recalculated;
           } else {
             const currOre = parseFloat(targetRow[targetDayKey].ore.replace(',', '.')) || 0;
             const addOre = parseFloat(source.ore.replace(',', '.')) || 0;
             if (currOre + addOre > 0) {
               targetRow[targetDayKey].ore = (currOre + addOre).toString().replace('.', ',');
             }
           }
         } else {
           targetRow[targetDayKey].text = source.text;
           const recalculated = calculateHoursFromText(source.text);
           targetRow[targetDayKey].ore = recalculated !== '' ? recalculated : source.ore;
         }
         
         newData[targetBlockIdx] = sortBlock(recalculateBlockTotals(newData[targetBlockIdx]));
         updateTableData(newData);
         if (source.id) {
           addCoveredShiftId(source.id);
         }
         return;
      }
      
      if (source.type !== 'cell') return;
      
      if (source.blockIdx === targetBlockIdx && source.rowIdx === targetRowIdx && source.dayKey === targetDayKey) {
        return;
      }
      
      const newData = [...tableData];
      const sourceRow = newData[source.blockIdx].rows[source.rowIdx] as any;
      const targetRow = newData[targetBlockIdx].rows[targetRowIdx] as any;
      
      const tempText = targetRow[targetDayKey].text;
      const tempOre = targetRow[targetDayKey].ore;
      
      targetRow[targetDayKey].text = sourceRow[source.dayKey].text;
      targetRow[targetDayKey].ore = sourceRow[source.dayKey].ore;
      
      sourceRow[source.dayKey].text = tempText;
      sourceRow[source.dayKey].ore = tempOre;
      
      newData[source.blockIdx] = sortBlock(recalculateBlockTotals(newData[source.blockIdx]));
      if (source.blockIdx !== targetBlockIdx) {
        newData[targetBlockIdx] = sortBlock(recalculateBlockTotals(newData[targetBlockIdx]));
      }
      
      updateTableData(newData);
    } catch (err) {
      // Ignore invalid drop
    }
  };

  const filteredTableData = useMemo(() => {
    if (!searchTerm) return tableData;
    const lowerSearch = searchTerm.toLowerCase();
    
    return tableData.filter(block => {
      if (block.name.toLowerCase().includes(lowerSearch)) return true;
      
      for (const row of block.rows) {
        for (const day of dayKeys) {
          if (row[day]?.text.toLowerCase().includes(lowerSearch)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [tableData, searchTerm, dayKeys]);

  return (
    <div className="flex h-full w-full">
      {/* Main Table Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-l border-[#1A1A1A]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-[white] border-b border-[#1A1A1A] gap-4">
          <h2 className="text-2xl lg:text-3xl font-serif italic tracking-tighter">MESE DI RIFERIMENTO: {monthName}</h2>
          
          <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input 
                type="text" 
                placeholder="Cerca turno o jolly..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#1A1A1A] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={handlePrevWeek} className="p-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-mono text-xl tracking-widest font-bold hidden xl:inline">SETTIMANA DEL {format(currentWeekStart, 'dd/MM/yyyy')}</span>
              <span className="font-mono text-sm tracking-widest font-bold xl:hidden">{format(currentWeekStart, 'dd/MM/yy')}</span>
              <button onClick={handleNextWeek} className="p-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="w-full overflow-x-auto flex-1">
          <table className="w-max min-w-full text-left border-collapse text-[10px]">
        <tbody>
          {filteredTableData.map((block) => {
            const idx = tableData.findIndex(b => b === block);
            return (
              <React.Fragment key={idx}>
              {idx > 0 && <tr><td colSpan={15} className="h-6 bg-[white] border-y border-[#1A1A1A]"></td></tr>}
              
              <tr className="bg-[#1A1A1A] text-[white] uppercase tracking-[0.2em] font-bold">
                <td colSpan={15} className="px-4 py-2 border-b border-[#1A1A1A]">
                  <div className="flex justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span>ORE TOTALI SETTIMANALI:</span>
                      <input 
                        value={block.totalWeek} 
                        onChange={(e) => handleTotalWeekChange(idx, e.target.value)} 
                        className="bg-transparent border-b border-gray-600 focus:outline-none focus:border-white w-16 px-1 text-center font-bold" 
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleAddRow(idx)}
                        className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 transition-colors px-2 py-1 rounded text-[10px]"
                        title="Aggiungi riga al Jolly"
                      >
                        <Plus className="w-3 h-3" />
                        <span>AGGIUNGI RIGA</span>
                      </button>
                      <input 
                        value={block.name} 
                        onChange={(e) => handleNameChange(idx, e.target.value)} 
                        className="bg-transparent text-right border-b border-gray-600 focus:outline-none focus:border-white w-64 px-1" 
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr className="bg-[#EAE3DC] uppercase tracking-widest font-bold">
                <td className="w-8 border-b border-r border-[#1A1A1A]"></td>
                {dynamicDays.map((d, i) => (
                  <React.Fragment key={i}>
                    <td className="px-3 py-2 border-b border-r border-[#1A1A1A] text-center w-[220px]">{d.day}</td>
                    <td className="px-2 py-2 border-b border-r border-[#1A1A1A] text-center w-[50px]">ORE</td>
                  </React.Fragment>
                ))}
              </tr>

              {block.rows.map((row, rIdx) => (
                <tr 
                  key={rIdx} 
                  className="bg-white hover:bg-gray-50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleRowDrop(e, idx, rIdx)}
                >
                  <td className="w-8 border-b border-r border-[#1A1A1A] text-center align-middle">
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1 inline-block opacity-50 hover:opacity-100"
                      draggable
                      onDragStart={(e) => handleRowDragStart(e, idx, rIdx)}
                      title="Trascina riga"
                    >
                      <GripVertical className="w-4 h-4 text-[#1A1A1A]" />
                    </div>
                  </td>
                  {dynamicDays.map((d, cIdx) => {
                    const cellData = (row as any)[d.key];
                    return (
                      <React.Fragment key={cIdx}>
                        <td 
                          className="p-0 border-b border-r border-[#1A1A1A] text-[9px] uppercase leading-tight font-medium relative group"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleCellDrop(e, idx, rIdx, d.key)}
                        >
                          <div 
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 bg-white/50 rounded-sm hover:bg-white"
                            draggable
                            onDragStart={(e) => handleCellDragStart(e, idx, rIdx, d.key)}
                            title="Trascina il turno"
                          >
                            <GripVertical className="w-3 h-3 text-[#1A1A1A]" />
                          </div>
                          <textarea 
                            value={cellData.text} 
                            onChange={(e) => handleCellChange(idx, rIdx, d.key, 'text', e.target.value)}
                            onBlur={() => handleCellBlur(idx)}
                            className="w-full h-full min-h-[40px] resize-none p-1.5 focus:outline-none focus:bg-pink-50 transition-colors bg-transparent border-0"
                          />
                        </td>
                        <td 
                          className="p-0 border-b border-r border-[#1A1A1A] text-center font-mono bg-[white] font-bold"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleCellDrop(e, idx, rIdx, d.key)}
                        >
                          <input 
                            value={cellData.ore} 
                            onChange={(e) => handleCellChange(idx, rIdx, d.key, 'ore', e.target.value)}
                            onBlur={() => handleCellBlur(idx)}
                            className="w-full h-full text-center focus:outline-none focus:bg-pink-100 transition-colors bg-transparent border-0 py-2"
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}

              <tr className="bg-[#EAE3DC] font-bold">
                <td className="border-b border-r border-[#1A1A1A] bg-[#EAE3DC]"></td>
                {dynamicDays.map((d, cIdx) => (
                  <React.Fragment key={cIdx}>
                    <td className="px-3 py-2 border-b border-r border-[#1A1A1A] text-right text-[9px] uppercase tracking-widest text-[#1A1A1A]/60">
                      Tot. Giornaliero
                    </td>
                    <td className="p-0 border-b border-r border-[#1A1A1A] text-center font-mono">
                      <input 
                        value={(block.totals as any)[d.key]} 
                        onChange={(e) => handleTotalChange(idx, d.key, e.target.value)}
                        className="w-full h-full text-center focus:outline-none focus:bg-pink-100 transition-colors bg-transparent border-0 py-2 font-bold"
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
      
      <div className="bg-[#1A1A1A] p-6 text-[white] flex justify-between items-center uppercase tracking-widest font-bold shrink-0">
        <button
          onClick={handleAddJolly}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A1A1A] rounded hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>AGGIUNGI JOLLY / SEZIONE</span>
        </button>
        <div className="flex items-center gap-4">
          <span>TOTALE ORE JOLLY SETTIMANALI:</span>
          <span className="text-xl bg-white text-[#1A1A1A] px-4 py-2 rounded">
            {(() => {
              let sum = 0;
              tableData.forEach(block => {
                if (block.name.toLowerCase().includes('jolly')) {
                  const val = parseFloat(block.totalWeek.replace(',', '.'));
                  if (!isNaN(val)) sum += val;
                }
              });
              return sum > 0 ? sum.toString().replace('.', ',') : '0';
            })()}
          </span>
        </div>
      </div>
      </div>
    </div>
  );
};

