import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, LeaveRequest, LeaveBalance, Role, Worker, Worksite } from '../types';
import { Language } from '../i18n';
import { toast } from 'sonner';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, addDoc, updateDoc, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoadingAuth: boolean;
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
              role: user.email === 'coppolek@gmail.com' ? 'manager' : 'employee', // Temporary admin check
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

    const unsubRequests = onSnapshot(requestsQuery, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'requests'));

    return () => {
      unsubUsers();
      unsubWorkers();
      unsubWorksites();
      unsubRequests();
    };
  }, [currentUser]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
        isLoadingAuth
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
