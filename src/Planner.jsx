import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = new Date();
START_DATE.setHours(0, 0, 0, 0); 

// --- ICONS ---
const Icon = ({ children, size = 18, className = "" }) => (
    <span style={{ fontSize: `${size}px` }} className={`inline-flex items-center justify-center ${className}`}>{children}</span>
);
const ChevronLeft = ({ size = 28 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = ({ size = 28 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const CalendarIcon = () => <Icon size={20}>📅</Icon>;
const PlusIcon = () => <Icon size={24}>➕</Icon>;
const Trash2Icon = ({size=18}) => <Icon size={size}>🗑️</Icon>;
const MapPinIcon = () => <Icon size={14}>📍</Icon>;
const DollarSignIcon = () => <Icon size={14}>💰</Icon>;
const ToolIcon = () => <Icon size={14}>🔨</Icon>;
const ClockIcon = () => <Icon size={16}>⏰</Icon>;
const BriefcaseIcon = ({size=24}) => <Icon size={size}>💼</Icon>;
const CloudIcon = () => <Icon size={16}>☁️</Icon>;
const UserIcon = () => <Icon size={16}>👤</Icon>;
const LockIcon = () => <Icon size={48}>🔒</Icon>;
const LogOutIcon = () => <Icon size={18}>🚪</Icon>;

// --- HELPERS ---
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const formatDisplayDate = (date) => date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(typeof amount === 'number' ? amount : parseFloat(amount) || 0);
const getStatusColor = (s) => s === 'Complete' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : s === 'In Progress' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-stone-600 bg-stone-100 border-stone-200';
const getStatusIcon = (s) => s === 'Complete' ? '✅' : s === 'In Progress' ? '🚧' : '⏱️';

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [newJobDetails, setNewJobDetails] = useState({ title: '', location: '', quote: '', tools: '', status: 'Pending' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const currentDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  useEffect(() => {
    if (!user) { setJobs([]); return; }
    setLoadingJobs(true);
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'jobs'), (snapshot) => {
        setJobs(snapshot.docs.map(doc => doc.data()));
        setLoadingJobs(false);
    }, (err) => { console.error(err); setLoadingJobs(false); });
    return () => unsubscribe();
  }, [user]); 

  const dailyJobs = useMemo(() => jobs.filter(job => job.dateKey === currentDateKey), [jobs, currentDateKey]);

  const handleLogin = async () => {
    setAuthLoading(true);
    try { await signInAnonymously(auth); } catch (e) { console.error(e); setAuthLoading(false); }
  };
  const handleLogout = async () => { await signOut(auth); setShowProfile(false); };
  const navigateDate = useCallback((dir) => setCurrentDate(new Date(currentDate.getTime() + dir * MS_PER_DAY)), [currentDate]);
  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, d));
    setShowModal(false);
  };
  const handleJobDetailChange = (e) => setNewJobDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddJob = async () => {
    if (!user || !newJobDetails.title.trim()) return;
    const jobId = Date.now().toString();
    const quoteVal = typeof newJobDetails.quote === 'string' ? (parseFloat(newJobDetails.quote.replace(/[£,]/g, '')) || 0) : newJobDetails.quote;
    try {
      await setDoc(doc(db, 'users', user.uid, 'jobs', jobId), {
        id: jobId, dateKey: currentDateKey, createdAt: new Date().toISOString(), ...newJobDetails, quote: quoteVal
      });
      setShowJobModal(false);
      setNewJobDetails({ title: '', location: '', quote: '', tools: '', status: 'Pending' });
    } catch (e) { console.error(e); }
  };

  const handleDeleteJob = async () => {
      if (!user || !showConfirmDelete) return;
      try { await deleteDoc(doc(db, 'users', user.uid, 'jobs', showConfirmDelete.toString())); } catch (e) { console.error(e); }
      setShowConfirmDelete(null);
  };

  const handleToggleStatus = async (job) => {
      if (!user) return;
      const order = ['Pending', 'In Progress', 'Complete'];
      const next = order[(order.indexOf(job.status) + 1) % 3];
      try { await setDoc(doc(db, 'users', user.uid, 'jobs', job.id.toString()), { ...job, status: next }); } catch (e) { console.error(e); }
  };

  const weeklyData = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
    start.setHours(0,0,0,0);
    const data = [];
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(start.getTime() + i * MS_PER_DAY);
      const dKey = formatDateKey(date);
      const dayJobs = jobs.filter(j => j.dateKey === dKey);
      const dayTotal = dayJobs.reduce((sum, j) => sum + (j.quote || 0), 0);
      total += dayTotal;
      data.push({ date: formatDisplayDate(date), jobs: dayJobs, dayTotal, isCurrent: dKey === currentDateKey });
    }
    return { weekData: data, totalQuotedValue: total };
  }, [currentDate, currentDateKey, jobs]);

  if (authLoading) return <div className="min-h-screen bg-stone-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-stone-200 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
            <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><LockIcon /></div>
            <div><h1 className="text-2xl font-bold text-stone-800">Trade Planner</h1><p className="text-stone-500 mt-2">Sign in to access your jobs and sync across devices.</p></div>
            <button onClick={handleLogin} className="w-full bg-stone-800 text-white p-4 rounded-xl font-bold hover:bg-stone-700 transition shadow-lg flex items-center justify-center gap-3"><span>Sign In Now</span></button>
            <p className="text-xs text-stone-400">Securely powered by Firebase Auth</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-200 p-4 flex flex-col items-center font-sans">
      <style>{`@keyframes slide-up { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.3s ease-out; }`}</style>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden my-4 flex flex-col h-[90vh] border border-stone-200 relative">
        <div className="bg-stone-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 z-10">
          <div className="flex items-center cursor-pointer" onClick={() => setShowProfile(true)}>
            <BriefcaseIcon size={24} className="mr-2 text-stone-300" />
            <div className="flex flex-col"><h1 className="text-lg font-bold tracking-tight text-stone-50 leading-none">Planner</h1><span className="text-[10px] text-emerald-400 flex items-center mt-1"><CloudIcon /> Online & Syncing</span></div>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setShowWeeklyModal(true)} className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 transition text-sm font-medium flex items-center border border-stone-600"><ClockIcon /> Week</button>
            <button onClick={() => setShowModal(true)} className="p-2 rounded-lg hover:bg-stone-700 transition"><CalendarIcon /></button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between text-stone-800 border-b border-stone-200 bg-white shrink-0">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 transition"><ChevronLeft /></button>
          <h2 className="text-lg font-bold text-stone-800 tracking-wide select-none">{formatDisplayDate(currentDate)}</h2>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 transition"><ChevronRight /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-stone-50">
          {loadingJobs ? <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div></div> : 
           dailyJobs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6">
                <BriefcaseIcon size={48} className="mb-4 opacity-20" /><p className="text-center italic font-medium">No jobs scheduled.</p><p className="text-sm">Tap "New Job" to add one.</p>
            </div>
          ) : dailyJobs.map((job) => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex flex-col gap-2 relative group">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-stone-800 pr-2 leading-tight">{job.title}</h3>
                    <button onClick={() => handleToggleStatus(job)} className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(job.status)} uppercase tracking-wide shrink-0`}>{getStatusIcon(job.status)} {job.status}</button>
                </div>
                <div className="text-sm text-stone-600 space-y-1.5 mt-1">
                    {job.location && <div className="flex items-center"><MapPinIcon /><span className="truncate ml-2">{job.location}</span></div>}
                    {job.quote > 0 && <div className="flex items-center font-semibold text-stone-800"><DollarSignIcon /><span className="ml-2">Quote: {formatCurrency(job.quote)}</span></div>}
                    {job.tools && <div className="flex items-start"><ToolIcon /><span className="text-stone-500 italic text-xs ml-2">{job.tools}</span></div>}
                </div>
                <button onClick={() => setShowConfirmDelete(job.id)} className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 transition p-1"><Trash2Icon /></button>
              </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-stone-200 shrink-0">
          <button onClick={() => {setNewJobDetails({ title: '', location: '', quote: '', tools: '', status: 'Pending' }); setShowJobModal(true);}} className="w-full bg-stone-800 text-white p-3.5 rounded-xl hover:bg-stone-700 active:bg-stone-900 transition shadow-lg flex items-center justify-center font-bold text-lg tracking-wide">
            <PlusIcon /> <span className="ml-2">New Job</span>
          </button>
        </div>

        {showProfile && (
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm z-50 flex flex-col p-6 text-white animate-slide-up">
                <div className="flex justify-between items-center mb-8 border-b border-stone-700 pb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><UserIcon /> User Profile</h2>
                    <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-stone-700 rounded-full">✕</button>
                </div>
                <div className="flex-grow">
                    <div className="bg-stone-800 p-4 rounded-lg mb-4">
                        <p className="text-xs text-stone-400 uppercase mb-1">Account Status</p>
                        <p className="text-emerald-400 font-bold flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Active & Syncing</p>
                    </div>
                    <div className="bg-stone-800 p-4 rounded-lg"><p className="text-xs text-stone-400 uppercase mb-1">User ID</p><p className="font-mono text-sm text-stone-300 break-all">{user?.uid}</p></div>
                    <p className="mt-6 text-sm text-stone-400 leading-relaxed">Your jobs are being saved to the secure cloud database.</p>
                </div>
                <button onClick={handleLogout} className="w-full bg-red-900/50 border border-red-800 text-red-200 p-4 rounded-xl font-bold hover:bg-red-900 transition flex items-center justify-center gap-2"><LogOutIcon /> Sign Out</button>
            </div>
        )}
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4 text-center">Go to Date</h3>
            <input type="date" className="w-full p-3 border-2 border-stone-200 rounded-lg text-stone-800 focus:border-stone-500 focus:outline-none text-lg text-center bg-stone-50" value={formatDateKey(currentDate)} onChange={handleDateChange} />
            <button onClick={() => setShowModal(false)} className="mt-4 w-full bg-stone-200 text-stone-700 p-3 rounded-lg font-bold hover:bg-stone-300 transition">Cancel</button>
          </div>
        </div>
      )}

      {showJobModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="text-xl font-bold text-stone-800">New Job</h3>
                 <button onClick={() => setShowJobModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Client / Job Title</label><input type="text" name="title" value={newJobDetails.title} onChange={handleJobDetailChange} className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50" placeholder="e.g. Boiler Service" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Quote (£)</label><input type="number" name="quote" value={newJobDetails.quote} onChange={handleJobDetailChange} className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50" placeholder="0.00" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Status</label><select name="status" value={newJobDetails.status} onChange={handleJobDetailChange} className="w-full p-3 border-2 border-stone-200 rounded-lg bg-stone-50 focus:border-stone-500 focus:outline-none"><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Complete">Complete</option></select></div>
                </div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Location</label><input type="text" name="location" value={newJobDetails.location} onChange={handleJobDetailChange} className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50" placeholder="Address..." /></div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tools & Materials</label><textarea name="tools" value={newJobDetails.tools} onChange={handleJobDetailChange} rows="3" className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none resize-none bg-stone-50" placeholder="Required items..." /></div>
                <div className="pt-2 flex gap-3"><button onClick={() => setShowJobModal(false)} className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold hover:bg-stone-300 transition">Cancel</button><button onClick={handleAddJob} className="flex-1 bg-stone-800 text-white p-3 rounded-xl font-bold hover:bg-stone-700 transition shadow-md">Save Job</button></div>
            </div>
          </div>
        </div>
      )}

      {showWeeklyModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center shrink-0"><h3 className="text-xl font-bold text-stone-800">Weekly Overview</h3><button onClick={() => setShowWeeklyModal(false)} className="text-stone-400 hover:text-stone-600">✕</button></div>
            <div className="p-5 bg-stone-50 border-b border-stone-200 shrink-0 text-center"><p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Total Potential Value</p><p className="text-3xl font-extrabold text-stone-800">{formatCurrency(weeklyData.totalQuotedValue)}</p></div>
            <div className="overflow-y-auto p-4 space-y-1">
              {weeklyData.weekData.map((day, index) => (
                <div key={index} className={`py-3 px-3 rounded-lg ${day.isCurrent ? 'bg-stone-200 border border-stone-300' : ''}`}>
                  <div className="flex justify-between items-center mb-1"><h4 className={`font-bold ${day.isCurrent ? 'text-stone-900' : 'text-stone-600'}`}>{day.date}</h4>{day.dayTotal > 0 && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{formatCurrency(day.dayTotal)}</span>}</div>
                  {day.jobs.length === 0 ? <p className="text-xs text-stone-400 italic">— Free day</p> : <ul className="space-y-2 mt-2">{day.jobs.map((job) => (<li key={job.id} className="bg-white p-2 rounded border border-stone-100 shadow-sm flex justify-between items-center"><span className="text-sm text-stone-700 font-medium truncate pr-2">{job.title}</span><div className={`w-2 h-2 rounded-full flex-shrink-0 ${job.status === 'Complete' ? 'bg-emerald-500' : job.status === 'In Progress' ? 'bg-amber-500' : 'bg-stone-300'}`}></div></li>))}</ul>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {showConfirmDelete !== null && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs text-center border border-stone-100">
            <Trash2Icon size={48} className="text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-800 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-stone-600 mb-6">Are you sure you want to delete this job?</p>
            <div className="flex gap-3"><button onClick={() => setShowConfirmDelete(null)} className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold hover:bg-stone-300 transition">Cancel</button><button onClick={handleDeleteJob} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 transition">Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}


