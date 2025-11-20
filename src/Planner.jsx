import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
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
const LogOutIcon = () => <Icon size={18}>🚪</Icon>;
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
);
const MailIcon = () => <Icon size={20}>✉️</Icon>;

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
  
  // UI States
  const [showJobModal, setShowJobModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [newJobDetails, setNewJobDetails] = useState({ title: '', location: '', quote: '', tools: '', status: 'Pending' });

  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

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

  // --- AUTH HANDLERS ---
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try { 
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider); 
    } catch (e) { 
      console.error("Google Auth Error:", e); 
      setAuthLoading(false); 
      setAuthError("Google sign-in failed. Please try again.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Email Auth Error:", err);
      setAuthLoading(false);
      if (err.code === 'auth/invalid-credential') setAuthError('Incorrect email or password.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('This email is already registered.');
      else if (err.code === 'auth/weak-password') setAuthError('Password should be at least 6 characters.');
      else setAuthError(err.message);
    }
  };

  const handleLogout = async () => { 
    await signOut(auth); 
    setShowProfile(false); 
    setEmail(''); 
    setPassword(''); 
  };

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

  // --- LOGIN SCREEN (UPDATED) ---
  if (!user) return (
    <div className="min-h-screen bg-stone-200 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
            <div className="text-center">
              <div className="bg-white border border-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <BriefcaseIcon size={28} className="text-stone-700" />
              </div>
              <h1 className="text-2xl font-bold text-stone-800">Trade Planner</h1>
              <p className="text-stone-500 text-sm mt-1">{isSignUp ? "Create an account to get started." : "Welcome back! Please sign in."}</p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">{authError}</div>}
              
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full p-3 border border-stone-200 rounded-lg focus:border-stone-800 outline-none bg-stone-50 text-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  className="w-full p-3 border border-stone-200 rounded-lg focus:border-stone-800 outline-none bg-stone-50 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button type="submit" className="w-full bg-stone-800 text-white p-3.5 rounded-xl font-bold hover:bg-stone-700 transition shadow-sm text-sm">
                {isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink-0 mx-2 text-stone-300 text-xs uppercase font-bold">Or</span>
                <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full bg-white text-stone-700 border border-stone-300 p-3 rounded-xl font-bold hover:bg-stone-50 transition shadow-sm flex items-center justify-center gap-2 text-sm">
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            
            <div className="text-center pt-2">
              <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-sm text-stone-500 hover:text-stone-800 font-medium">
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Create one"}
              </button>
            </div>
        </div>
    </div>
  );

  // --- MAIN APP RENDER ---
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
                    <div className="bg-stone-800 p-4 rounded-lg"><p className="text-xs text-stone-400 uppercase mb-1">Email</p><p className="font-mono text-sm text-stone-300 break-all">{user?.email}</p></div>
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
                 <h3 className="text-xl font-bold text-stone-8
