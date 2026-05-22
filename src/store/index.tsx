import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, LeaveRequest, LeaveBalance, Role, Worker, Worksite } from '../types';
import { Language } from '../i18n';
import { toast } from 'sonner';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { format, startOfWeek } from 'date-fns';
import { collection, doc, setDoc, getDoc, onSnapshot, query, addDoc, updateDoc, where, getDocs, deleteDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: User | null;
  setCurrentRole?: (role: Role) => void;
  users: User[];
  requests: LeaveRequest[];
  balances: LeaveBalance[];
  workers: Worker[];
  worksites: Worksite[];
  addRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt'>) => Promise<void>;
  updateRequestStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  updateRequest: (id: string, updates: Partial<LeaveRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  upsertWorker: (worker: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  importWorkers: (workers: Omit<Worker, 'id'>[]) => Promise<void>;
  upsertWorksite: (worksite: Worksite) => Promise<void>;
  deleteWorksite: (id: string) => Promise<void>;
  importWorksites: (worksites: Omit<Worksite, 'id'>[]) => Promise<void>;
  syncWithHR: () => Promise<void>;
  login: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoadingAuth: boolean;
  currentWeekStart: Date;
  setCurrentWeekStart: (date: Date | ((prev: Date) => Date)) => void;
  coveredShiftIds: string[];
  addCoveredShiftId: (id: string) => void;
  removeCoveredShiftIds: (ids: string[]) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [coveredShiftIds, setCoveredShiftIds] = useState<string[]>([]);

  const addCoveredShiftId = async (id: string) => {
    // Optimistic update
    setCoveredShiftIds(prev => {
      if (!prev.includes(id)) return [...prev, id];
      return prev;
    });
    
    // Save to Firestore for persistency over reload
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekId = `week_${weekStartStr}`;
      const docRef = doc(db, 'jolly_plans', weekId);
      await setDoc(docRef, { coveredShiftIds: arrayUnion(id) }, { merge: true });
    } catch (e) {
      console.error("Failed to persist coveredShiftId:", e);
    }
  };

  const removeCoveredShiftIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    setCoveredShiftIds(prev => prev.filter(id => !ids.includes(id)));
    
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekId = `week_${weekStartStr}`;
      const docRef = doc(db, 'jolly_plans', weekId);
      await setDoc(docRef, { coveredShiftIds: arrayRemove(...ids) }, { merge: true });
    } catch (e) {
      console.error("Failed to remove coveredShiftIds:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ensure user document exists
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newUser: User = {
              id: user.uid,
              name: user.displayName || 'Unknown',
              role: (user.email === 'coppolek@gmail.com' || user.email === 'admin@admin.com') ? 'manager' : 'employee', // Temporary admin check
              department: 'General',
              avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
              email: user.email || ''
            };
            await setDoc(userRef, newUser);
            setCurrentUser(newUser);
          } else {
            setCurrentUser(userSnap.data() as User);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'manager') {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as User));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubWorkers = onSnapshot(collection(db, 'workers'), (snap) => {
      setWorkers(snap.docs.map(doc => doc.data() as Worker));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    const unsubWorksites = onSnapshot(collection(db, 'worksites'), (snap) => {
      setWorksites(snap.docs.map(doc => doc.data() as Worksite));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'worksites'));

    // If manager, read all requests. If employee, read only theirs
    const requestsQuery = currentUser.role === 'manager' 
      ? collection(db, 'requests') 
      : query(collection(db, 'requests'), where('userId', '==', currentUser.id));

    let isInitialRequestsLoad = true;
    const unsubRequests = onSnapshot(requestsQuery, async (snap) => {
      if (!isInitialRequestsLoad && currentUser.role === 'manager') {
        for (const change of snap.docChanges()) {
          if (change.type === 'added') {
            const req = change.doc.data() as LeaveRequest;
            if (req.status === 'pending' && req.userId !== currentUser.id) {
              const body = `Ha richiesto ${req.type} dal ${req.startDate} al ${req.endDate}.`;
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Nuova Richiesta di Ferie/Permesso', { body });
              } else {
                 toast('Nuova Richiesta', { description: body, icon: '🔔' });
              }
            }
          }
        }
      }
      isInitialRequestsLoad = false;
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'requests'));

    return () => {
      unsubUsers();
      unsubWorkers();
      unsubWorksites();
      unsubRequests();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekId = `week_${weekStartStr}`;
    const unsubJolly = onSnapshot(doc(db, 'jolly_plans', weekId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().coveredShiftIds) {
        setCoveredShiftIds(docSnap.data().coveredShiftIds);
      } else {
        setCoveredShiftIds([]);
      }
    });
    return () => unsubJolly();
  }, [currentUser, currentWeekStart]);

  const login = async (user: string, pass: string) => {
    try {
      const email = user === 'admin' ? 'admin@admin.com' : user;
      const pwd = pass === 'admin' ? 'admin123' : pass;
      try {
        await signInWithEmailAndPassword(auth, email, pwd);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, email, pwd);
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      if (e.code === 'auth/unauthorized-domain') {
        toast.error('Errore dominio non autorizzato: Vai su Firebase > Authentication > Settings > Authorized domains e aggiungi l\'IP della tua VPS!', { duration: 8000 });
      } else if (e.code === 'auth/operation-not-allowed') {
        toast.error('Errore Email/Password disabilitato: Vai su Firebase > Authentication > Sign-in method e abilita Email/password!', { duration: 8000 });
      } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/email-already-in-use') {
        toast.error('Credenziali errate (Password sbagliata o account non trovato).');
      } else {
        toast.error(e.message || 'Errore durante il login');
        console.error("Login Error:", e);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addRequest = async (req: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt'>) => {
    if (!currentUser) return;
    try {
      const newRef = doc(collection(db, 'requests'));
      await setDoc(newRef, {
        ...req,
        userId: req.userId || currentUser.id,
        status: currentUser.role === 'manager' ? 'approved' : 'pending',
        requestedAt: new Date().toISOString()
      });
      toast.success('Request submitted');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
      toast.error('Failed to submit request');
    }
  };

  const updateRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const reqRef = doc(db, 'requests', id);
      await updateDoc(reqRef, { status });
      toast.success(`Request ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
      toast.error('Failed to update request');
    }
  };

  const updateRequest = async (id: string, updates: Partial<LeaveRequest>) => {
    try {
      const reqRef = doc(db, 'requests', id);
      await updateDoc(reqRef, updates);
      toast.success('Assenza modificata');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
      toast.error('Errore durante la modifica dell\'assenza');
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'requests', id));
      toast.success('Assenza eliminata');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
      toast.error('Errore durante l\'eliminazione dell\'assenza');
    }
  };

  const upsertWorker = async (worker: Worker) => {
    try {
      // If we don't have an ID, we assume it's new
      const id = worker.id || doc(collection(db, 'workers')).id;
      const docRef = doc(db, 'workers', id);
      await setDoc(docRef, { ...worker, id });
      toast.success('Worker saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workers/${worker.id}`);
      toast.error('Failed to save worker');
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workers', id));
      toast.success('Worker deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workers/${id}`);
      toast.error('Failed to delete worker');
    }
  };

  const upsertWorksite = async (worksite: Worksite) => {
    try {
      const id = worksite.id || doc(collection(db, 'worksites')).id;
      const docRef = doc(db, 'worksites', id);
      await setDoc(docRef, { ...worksite, id });
      toast.success('Worksite saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `worksites/${worksite.id}`);
      toast.error('Failed to save worksite');
    }
  };

  const deleteWorksite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'worksites', id));
      toast.success('Worksite deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `worksites/${id}`);
      toast.error('Failed to delete worksite');
    }
  };

  const importWorkers = async (newWorkers: Omit<Worker, 'id'>[]) => {
    if (!currentUser || currentUser.role !== 'manager') return;
    try {
      const batch = writeBatch(db);
      // Process in batches if > 500, but standard writes cap at 500. Let's just do up to 500.
      const batchWorkers = newWorkers.slice(0, 499);
      batchWorkers.forEach(worker => {
        const docRef = doc(collection(db, 'workers'));
        batch.set(docRef, { ...worker, id: docRef.id });
      });
      await batch.commit();
      toast.success(`${batchWorkers.length} lavoratori importati con successo.`);
      if (newWorkers.length > 499) {
        toast.error(`Ci sono ${newWorkers.length - 499} record in eccesso che non sono stati importati.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workers/batch');
      toast.error('Errore durante l\'importazione da CSV');
    }
  };

  const importWorksites = async (newWorksites: Omit<Worksite, 'id'>[]) => {
    if (!currentUser || currentUser.role !== 'manager') return;
    try {
      const batch = writeBatch(db);
      const batchWorksites = newWorksites.slice(0, 499);
      batchWorksites.forEach(worksite => {
        const docRef = doc(collection(db, 'worksites'));
        batch.set(docRef, { ...worksite, id: docRef.id });
      });
      await batch.commit();
      toast.success(`${batchWorksites.length} cantieri importati con successo.`);
      if (newWorksites.length > 499) {
        toast.error(`Ci sono ${newWorksites.length - 499} record in eccesso che non sono stati importati.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'worksites/batch');
      toast.error('Errore durante l\'importazione da CSV');
    }
  };

  const syncWithHR = async () => {
    // Implement standard HR sync delay
    return new Promise<void>(resolve => setTimeout(resolve, 1500));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        currentUser,
        users,
        requests,
        balances,
        workers,
        worksites,
        addRequest,
        updateRequestStatus,
        updateRequest,
        deleteRequest,
        upsertWorker,
        deleteWorker,
        importWorkers,
        upsertWorksite,
        deleteWorksite,
        importWorksites,
        syncWithHR,
        login,
        logout,
        isLoadingAuth,
        currentWeekStart,
        setCurrentWeekStart,
        coveredShiftIds,
        addCoveredShiftId,
        removeCoveredShiftIds
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
