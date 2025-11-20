import React, { useState, useEffect, useMemo, useCallback } from 'react';
// --- FIREBASE IMPORTS ---
// We import auth and db from the local file
import { auth, db } from './firebase';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

// --- CONFIGURATION ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = new Date();
START_DATE.setHours(0, 0, 0, 0); 

// --- ICON COMPONENTS ---
const Icon = ({ children, size = 18, className = "" }) => (
    <span style={{ fontSize: `${size}px` }} className={`inline-flex items-center justify-center ${className}`}>{children}</span>
);
const ChevronLeft = ({ size = 28, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const ChevronRight = ({ size = 28, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const CalendarIcon = ({ size = 20, className = "" }) => <Icon size={size} className={className}>📅</Icon>;
const PlusIcon = ({ size = 24, className = "" }) => <Icon size={size} className={className}>➕</Icon>;
const Trash2Icon = ({ size = 18, className = "" }) => <Icon size={size} className={className}>🗑️</Icon>;
const MapPinIcon = ({ size = 14, className = "" }) => <Icon size={size} className={className}>📍</Icon>;
const DollarSignIcon = ({ size = 14, className = "" }) => <Icon size={size} className={className}>💰</Icon>;
const ToolIcon = ({ size = 14, className = "" }) => <Icon size={size} className={className}>🔨</Icon>;
const ClockIcon = ({ size = 16, className = "" }) => <Icon size={size} className={className}>⏰</Icon>;
const BriefcaseIcon = ({ size = 24, className = "" }) => <Icon size={size} className={className}>💼</Icon>;
const CloudIcon = ({ size = 16, className = "" }) => <Icon size={size} className={className}>☁️</Icon>;
const UserIcon = ({ size = 16, className = "" }) => <Icon size={size} className={className}>👤</Icon>;
const LockIcon = ({ size = 48, className = "" }) => <Icon size={size} className={className}>🔒</Icon>;
const LogOutIcon = ({ size = 18, className = "" }) => <Icon size={size} className={className}>🚪</Icon>;

// --- HELPER FUNCTIONS ---
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (date) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

const formatCurrency = (amount) => {
    const value = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Complete': return 'text-emerald-800 bg-emerald-50 border-emerald-200';
        case 'In Progress': return 'text-amber-800 bg-amber-50 border-amber-200';
        case 'Pending': return 'text-stone-600 bg-stone-100 border-stone-200';
        default: return 'text-gray-500 bg-gray-100';
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'Complete': return '✅';
        case 'In Progress': return '🚧';
        case 'Pending': return '⏱️';
        default: return '—';
    }
}

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  
  // Form State
  const [newJobDetails, setNewJobDetails] = useState({
      title: '',
      location: '',
      quote: '',
      tools: '',
      status: 'Pending'
  });

  // --- AUTHENTICATION EFFECT ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- FIRESTORE DATA SYNC EFFECT ---
  const currentDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  useEffect(() => {
    if (!user) {
      setJobs([]); // Clear jobs if logged out
      return;
    }

    setLoadingJobs(true);
    // Use the user's UID to create a private path
    const jobsCollection = collection(db, 'users', user.uid, 'jobs');
    
    const unsubscribe = onSnapshot(jobsCollection, (snapshot) => {
        const allJobs = snapshot.docs.map(doc => doc.data());
        setJobs(allJobs);
        setLoadingJobs(false);
    }, (error) => {
        console.error("Error fetching jobs:", error);
        setLoadingJobs(false);
    });

    return () => unsubscribe();
  }, [user]); 

  // --- DERIVED STATE ---
  const dailyJobs = useMemo(() => {
    return jobs.filter(job => job.dateKey === currentDateKey);
  }, [jobs, currentDateKey]);

  // --- ACTIONS ---

  const handleLogin = async () => {
    try {
      setAuthLoading(true);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Login failed", error);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setShowProfile(false);
  };

  const navigateDate = useCallback((direction) => {
    const newTime = currentDate.getTime() + direction * MS_PER_DAY;
    const newDate = new Date(newTime);
    setCurrentDate(newDate); 
  }, [currentDate]);

  const handleDateChange = (event) => {
    const dateString = event.target.value;
    if (dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        setCurrentDate(selectedDate); 
    }
    setShowModal(false);
  };

  const handleJobModalOpen = () => {
      setNewJobDetails({ title: '', location: '', quote: '', tools: '', status: 'Pending' });
      setShowJobModal(true);
  }

  const handleJobDetailChange = (e) => {
      const { name, value } = e.target;
      setNewJobDetails(prev => ({ ...prev, [name]: value }));
  }

  // --- FIRESTORE WRITE ACTIONS ---

  const handleAddJob = async () => {
    if (!user) return;

    let quoteValue = 0;
    if (typeof newJobDetails.quote === 'string') {
        quoteValue = parseFloat(newJobDetails.quote.replace(/[£,]/g, '')) || 0;
    } else {
        quoteValue = newJobDetails.quote || 0;
    }

    if (newJobDetails.title.trim() !== '') {
      const jobId = Date.now().toString();
      const newJob = {
        id: jobId,
        dateKey: currentDateKey,
        createdAt: new Date().toISOString(),
        ...newJobDetails,
        quote: quoteValue, 
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid, 'jobs', jobId), newJob);
        setShowJobModal(false);
      } catch (e) {
        console.error("Error adding job: ", e);
      }
    }
  };

  const handleDeleteJob = async () => {
      if (!user || !showConfirmDelete) return;
      
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'jobs', showConfirmDelete.toString()));
      } catch (e) {
        console.error("Error deleting job: ", e);
      }
      setShowConfirmDelete(null);
  };

  const handleToggleStatus = async (job) => {
      if (!user) return;

      const statusOrder = ['Pending', 'In Progress', 'Complete'];
      const currentIndex = statusOrder.indexOf(job.status);
      const nextIndex = (currentIndex + 1) % statusOrder.length;
      const newStatus = statusOrder[nextIndex];

      try {
        await setDoc(doc(db, 'users', user.uid, 'jobs', job.id.toString()), {
          ...job,
          status: newStatus
        });
      } catch (e) {
        console.error("Error updating status: ", e);
      }
  };

  // --- WEEKLY VIEW LOGIC ---

  const weeklyData = useMemo(() => {
    const dayOfWeek = currentDate.getDay(); 
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    const weekData = [];
    let totalQuotedValue = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * MS_PER_DAY);
      const dateKey = formatDateKey(date);
      const displayDate = formatDisplayDate(date);
      
      const jobsForDay = jobs.filter(j => j.dateKey === dateKey);
      const dayTotal = jobsForDay.reduce((sum, job) => sum + (job.quote || 0), 0);
      totalQuotedValue += dayTotal;

      weekData.push({
        date: displayDate,
        jobs: jobsForDay,
        dayTotal: dayTotal,
        isCurrent: dateKey === currentDateKey,
      });
    }
    return { weekData, totalQuotedValue };
  }, [currentDate, currentDateKey, jobs]); 
  
  const { weekData: processedWeekData, totalQuotedValue } = weeklyData;

  // --- RENDER ---

  if (authLoading) {
    return (
        <div className="min-h-screen bg-stone-200 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800"></div>
        </div>
    );
  }

  if (!user) {
      return (
        <div className="min-h-screen bg-stone-200 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LockIcon className="text-stone-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-stone-800">Trade Planner</h1>
                    <p className="text-stone-500 mt-2">Sign in to access your jobs and sync across devices.</p>
                </div>
                <button 
                    onClick={handleLogin}
                    className="w-full bg-stone-800 text-white p-4 rounded-xl font-bold hover:bg-stone-700 transition shadow-lg flex items-center justify-center gap-3"
                >
                    <span>Sign In Now</span>
                </button>
                <p className="text-xs text-stone-400">
                    Securely powered by Firebase Auth
                </p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-stone-200 p-4 flex flex-col items-center font-sans">
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden my-4 flex flex-col h-[90vh] border border-stone-200 relative">
        
        {/* Header Bar */}
        <div className="bg-stone-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 z-10">
          <div className="flex items-center cursor-pointer" onClick={() => setShowProfile(true)}>
            <BriefcaseIcon size={24} className="mr-2 text-stone-300" />
            <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-stone-50 leading-none">Planner</h1>
                <span className="text-[10px] text-emerald-400 flex items-center mt-1">
                    <CloudIcon size={10} className="mr-1" /> Online & Syncing
                </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowWeeklyModal(true)}
              className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 transition text-sm font-medium flex items-center border border-stone-600"
            >
              <ClockIcon className="mr-1 text-stone-300" /> Week
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 rounded-lg hover:bg-stone-700 transition"
            >
              <CalendarIcon size={20} className="text-stone-300" />
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="p-4 flex items-center justify-between text-stone-800 border-b border-stone-200 bg-white shrink-0">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 transition">
            <ChevronLeft />
          </button>
          <h2 className="text-lg font-bold text-stone-800 tracking-wide select-none">
            {formatDisplayDate(currentDate)}
          </h2>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 transition">
            <ChevronRight />
          </button>
        </div>

        {/* Job List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-stone-50">
          {loadingJobs ? (
              <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div>
              </div>
          ) : dailyJobs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6">
                <BriefcaseIcon size={48} className="mb-4 opacity-20" />
                <p className="text-center italic font-medium">No jobs scheduled.</p>
                <p className="text-sm">Tap "New Job" to add one.</p>
            </div>
          ) : (
            dailyJobs.map((job) => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex flex-col gap-2 relative group">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-stone-800 pr-2 leading-tight">{job.title}</h3>
                    <button
                        onClick={() => handleToggleStatus(job)}
                        className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(job.status)} uppercase tracking-wide shrink-0`}
                    >
                        {getStatusIcon(job.status)} {job.status}
                    </button>
                </div>

                <div className="text-sm text-stone-600 space-y-1.5 mt-1">
                    {job.location && (
                        <div className="flex items-center">
                            <MapPinIcon className="text-stone-400 mr-2 shrink-0" />
                            <span className="truncate">{job.location}</span>
                        </div>
                    )}
                    {job.quote > 0 && (
                        <div className="flex items-center font-semibold text-stone-800">
                            <DollarSignIcon className="text-emerald-600 mr-2 shrink-0" />
                            <span>Quote: {formatCurrency(job.quote)}</span>
                        </div>
                    )}
                    {job.tools && (
                        <div className="flex items-start">
                            <ToolIcon className="text-stone-400 mr-2 mt-0.5 shrink-0" />
                            <span className="text-stone-500 italic text-xs">{job.tools}</span>
                        </div>
                    )}
                </div>
                
                <button
                    onClick={() => setShowConfirmDelete(job.id)}
                    className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 transition p-1"
                >
                    <Trash2Icon />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-white border-t border-stone-200 shrink-0">
          <button
            onClick={handleJobModalOpen}
            className="w-full bg-stone-800 text-white p-3.5 rounded-xl hover:bg-stone-700 active:bg-stone-900 transition shadow-lg flex items-center justify-center font-bold text-lg tracking-wide"
          >
            <PlusIcon size={24} className="mr-2" /> New Job
          </button>
        </div>

        {/* Profile Overlay */}
        {showProfile && (
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm z-50 flex flex-col p-6 text-white animate-slide-up">
                <div className="flex justify-between items-center mb-8 border-b border-stone-700 pb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserIcon /> User Profile
                    </h2>
                    <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-stone-700 rounded-full">✕</button>
                </div>
                
                <div className="flex-grow">
                    <div className="bg-stone-800 p-4 rounded-lg mb-4">
                        <p className="text-xs text-stone-400 uppercase mb-1">Account Status</p>
                        <p className="text-emerald-400 font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> 
                            Active & Syncing
                        </p>
                    </div>
                    <div className="bg-stone-800 p-4 rounded-lg">
                         <p className="text-xs text-stone-400 uppercase mb-1">User ID</p>
                         <p className="font-mono text-sm text-stone-300 break-all">{user?.uid}</p>
                    </div>
                    <p className="mt-6 text-sm text-stone-400 leading-relaxed">
                        Your jobs are being saved to the secure cloud database. You can access them from any device where you are signed in.
                    </p>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full bg-red-900/50 border border-red-800 text-red-200 p-4 rounded-xl font-bold hover:bg-red-900 transition flex items-center justify-center gap-2"
                >
                    <LogOutIcon /> Sign Out
                </button>
            </div>
        )}
      </div>
      
      {/* --- MODALS --- */}

      {/* Date Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4 text-center">Go to Date</h3>
            <input
              type="date"
              className="w-full p-3 border-2 border-stone-200 rounded-lg text-stone-800 focus:border-stone-500 focus:outline-none text-lg text-center bg-stone-50"
              value={formatDateKey(currentDate)}
              onChange={handleDateChange}
            />
            <button onClick={() => setShowModal(false)} className="mt-4 w-full bg-stone-200 text-stone-700 p-3 rounded-lg font-bold hover:bg-stone-300 transition">Cancel</butto
