import React, { useState } from 'react';
import { useAppContext } from '../../store';
import { useTranslation } from '../../hooks/useTranslation';
import { X, Search } from 'lucide-react';
import { toast } from 'sonner';

import { LeaveRequest } from '../../types';

interface LeaveFormProps {
  onClose: () => void;
  request?: LeaveRequest;
}

export const LeaveForm = ({ onClose, request }: LeaveFormProps) => {
  const { addRequest, updateRequest, currentUser, workers, users } = useAppContext();
  const { t } = useTranslation();

  const [type, setType] = useState<'vacation'|'sick'|'personal'>(request?.type || 'vacation');
  const [startDate, setStartDate] = useState(request?.startDate || '');
  const [endDate, setEndDate] = useState(request?.endDate || '');
  const [reason, setReason] = useState(request?.reason || '');
  const [selectedUserId, setSelectedUserId] = useState(request?.userId || (currentUser?.role === 'manager' ? '' : currentUser.id));

  const [operatorSearchTerm, setOperatorSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role === 'manager' && !selectedUserId) {
      toast.error('Seleziona un operatore.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Seleziona sia la data di inizio che quella di fine.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La data di fine non può precedente a quella di inizio.');
      return;
    }

    if (request?.id) {
      updateRequest(request.id, {
        userId: selectedUserId,
        type,
        startDate,
        endDate,
        reason,
      });
    } else {
      addRequest({
        userId: selectedUserId,
        type,
        startDate,
        endDate,
        reason,
      });
    }
    
    // toast.success('Richiesta inviata con successo.'); // handled by store
    onClose();
  };

  const isManager = currentUser?.role === 'manager';

  const operatorOptions = isManager 
    ? workers.map(w => ({ id: w.id, name: `${w.lastName} ${w.firstName}` }))
    : [];

  const filteredOperatorOptions = operatorOptions.filter(o => 
    o.name.toLowerCase().includes(operatorSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#F7F3F0]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#1A1A1A] w-full max-w-md animate-in fade-in zoom-in-95 duration-200 shadow-[8px_8px_0_0_rgba(26,26,26,1)] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#1A1A1A] bg-[#F7F3F0] shrink-0">
          <div>
            <h2 className="text-3xl font-serif italic tracking-tighter">{request?.id ? 'MODIFICA ASSENZA' : t('newRequest')}</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">{request?.id ? 'Modifica i dettagli dell\'assenza' : 'Compila la richiesta'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F7F3F0] transition-colors border border-transparent hover:border-[#1A1A1A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto">
          
          {isManager && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold">Operatore</label>
                <div className="relative w-1/2">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="text"
                    placeholder="Cerca..."
                    value={operatorSearchTerm}
                    onChange={(e) => setOperatorSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-[10px] border border-[#1A1A1A] bg-transparent focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  />
                </div>
              </div>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-[#1A1A1A] bg-transparent py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-sm font-sans"
              >
                {!operatorSearchTerm && <option value="" disabled>Seleziona operatore...</option>}
                {filteredOperatorOptions.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
                {filteredOperatorOptions.length === 0 && <option value="" disabled>Nessun operatore trovato</option>}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{t('type')}</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border border-[#1A1A1A] bg-transparent py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-sm font-sans"
            >
              <option value="vacation">{t('vacation')}</option>
              <option value="sick">{t('sick')}</option>
              <option value="personal">{t('personal')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[#1A1A1A] pt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{t('startDate')}</label>
              <input 
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-[#1A1A1A] bg-transparent py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-sm font-sans" 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{t('endDate')}</label>
              <input 
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-[#1A1A1A] bg-transparent py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-sm font-sans" 
              />
            </div>
          </div>

          <div className="border-t border-[#1A1A1A] pt-4">
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{t('reason')}</label>
            <textarea 
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-[#1A1A1A] bg-transparent py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] resize-none text-sm font-sans"
              placeholder="Breve spiegazione..."
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              className="px-8 py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-[#F7F3F0] text-[10px] uppercase tracking-widest font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all"
            >
              {request?.id ? 'AGGIORNA' : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
