import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
// Import the icons we just moved
import { ChevronLeft, ChevronRight, CalendarIcon, PlusIcon, Trash2Icon, MapPinIcon, DollarSignIcon, ToolIcon, ClockIcon, BriefcaseIcon, CloudIcon, UserIcon, LogOutIcon, GoogleIcon } from './Icons';

const MS_PER_DAY = 86400000;
const START_DATE = new Date(); START_DATE.setHours(0,0,0,0);

const formatDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const formatDisplayDate = (d) => d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
const formatCurrency = (a) => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(typeof a === 'number' ? a : parseFloat(a)||0);
const getStatusColor = (s) => s==='Complete'?'text-emerald-800 bg-emerald-50 border-emerald-200':s==='In Progress'?'text-amber-800 bg-amber-50 border-amber-200':'text-stone-600 bg-stone-100 border-stone-200';
const getStatusIcon = (s) => s==='Complete'?'✅':s==='In Progress'?'🚧':'⏱️';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [modals, setModals] = useState({ job: false, week: false, date: false, profile: false, deleteId: null });
  const [newJob, setNewJob] = useState({ title: '', location: '', quote: '', tools: '', status: 'Pending' });
  const [authForm, setAuthForm] = useState({ email: '', pass: '', isSignUp: false, error: '' });

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }), []);
  const dateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  useEffect(() => {
    if (!user) { setJobs([]); return; }
    setLoadingJobs(true);
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'jobs'), (snap) => {
        setJobs(snap.docs.map(d => d.data()));
        setLoadingJobs(false);
    }, (e) => { console.error(e); setLoadingJobs(false); });
    return () => unsub();
  }, [user]);

  const dailyJobs = useMemo(() => jobs.filter(j => j.dateKey === dateKey), [jobs, dateKey]);

  const handleGoogle = async () => {
    setAuthLoading(true); setAuthForm(p => ({...p, error: ''}));
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (e) { setAuthLoading(false); setAuthForm(p => ({...p, error: 'Google sign-in failed.'})); }
  };

  const handleEmail = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthForm(p => ({...p, error: ''}));
    try {
      if (authForm.isSignUp) await createUserWithEmailAndPassword(auth, authForm.email, authForm.pass);
      else await signInWithEmailAndPassword(auth, authForm.email, authForm.pass);
    } catch (err) {
      setAuthLoading(false);
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = 'Incorrect email or password.';
      else if (err.code === 'auth/email-already-in-use') msg = 'Email already registered.';
      setAuthForm(p => ({...p, error: msg}));
    }
  };

  const toggleModal = (n, v) => setModals(p => ({...p, [n]: v}));
  const updateJobForm = (e) => setNewJob(p => ({...p, [e.target.name]: e.target.value}));
  const updateAuthForm = (e) => setAuthForm(p => ({...p, [e.target.name]: e.target.value}));
  const handleLogout = async () => { await signOut(auth); toggleModal('profile', false); setAuthForm({ email:'', pass:'', isSignUp: false, error: '' }); };

  const handleAddJob = async () => {
    if (!user || !newJob.title.trim()) return;
    const id = Date.now().toString();
    const quote = typeof newJob.quote === 'string' ? (parseFloat(newJob.quote.replace(/[£,]/g,''))||0) : newJob.quote;
    try {
      await setDoc(doc(db,'users',user.uid,'jobs',id), { id, dateKey, createdAt: new Date().toISOString(), ...newJob, quote });
      toggleModal('job', false); setNewJob({ title: '', location: '', quote: '', tools: '', status: 'Pending' });
    } catch (e) { console.error(e); }
  };

  const deleteJob = async () => {
    if (user && modals.deleteId) await deleteDoc(doc(db,'users',user.uid,'jobs',modals.deleteId.toString()));
    toggleModal('deleteId', null);
  };

  const toggleStatus = async (job) => {
    if (!user) return;
    const order = ['Pending', 'In Progress', 'Complete'];
    const next = order[(order.indexOf(job.status)+1)%3];
    await setDoc(doc(db,'users',user.uid,'jobs',job.id.toString()), { ...job, status: next });
  };

  const weeklyData = useMemo(() => {
    const s = new Date(currentDate); s.setDate(currentDate.getDate() - (currentDate.getDay()===0?6:currentDate.getDay()-1)); s.setHours(0,0,0,0);
    const data = []; let total = 0;
    for (let i=0; i<7; i++) {
      const d = new Date(s.getTime()+i*MS_PER_DAY); const k = formatDateKey(d);
      const j = jobs.filter(x => x.dateKey === k);
      const t = j.reduce((a,b) => a+(b.quote||0),0);
      total += t;
      data.push({ date: formatDisplayDate(d), jobs: j, dayTotal: t, isCurrent: k === dateKey });
    }
    return { weekData: data, total };
  }, [currentDate, dateKey, jobs]);

  if (authLoading) return <div className="min-h-screen bg-stone-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-stone-200 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="bg-white border border-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"><BriefcaseIcon size={28} /></div>
          <h1 className="text-2xl font-bold text-stone-800">Trade Planner</h1>
          <p className="text-stone-500 text-sm mt-1">{authForm.isSignUp ? "Create an account." : "Welcome back!"}</p>
        </div>
        <form onSubmit={handleEmail} className="space-y-3">
          {authForm.error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{authForm.error}</div>}
          <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input name="email" type="email" required className="w-full p-3 border border-stone-200 rounded-lg bg-stone-50 text-sm" value={authForm.email} onChange={updateAuthForm} placeholder="email@example.com"/></div>
          <div><label className="text-xs font-bold text-stone-500 uppercase">Password</label><input name="pass" type="password" required minLength={6} className="w-full p-3 border border-stone-200 rounded-lg bg-stone-50 text-sm" value={authForm.pass} onChange={updateAuthForm} placeholder="••••••••"/></div>
          <button type="submit" className="w-full bg-stone-800 text-white p-3.5 rounded-xl font-bold hover:bg-stone-700 transition shadow-sm text-sm">{authForm.isSignUp ? "Create Account" : "Sign In"}</button>
        </form>
        <div className="flex py-1 items-center"><div className="flex-grow border-t border-stone-200"></div><span className="mx-2 text-stone-300 text-xs font-bold">OR</span><div className="flex-grow border-t border-stone-200"></div></div>
        <button onClick={handleGoogle} className="w-full bg-white text-stone-700 border border-stone-300 p-3 rounded-xl font-bold hover:bg-stone-50 transition flex items-center justify-center gap-2 text-sm"><GoogleIcon /><span>Continue with Google</span></button>
        <div className="text-center pt-2"><button onClick={() => setAuthForm(p => ({...p, isSignUp: !p.isSignUp, error: ''}))} className="text-sm text-stone-500 hover:text-stone-800 font-medium">{authForm.isSignUp ? "Have an account? Sign In" : "Need an account? Create one"}</button></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-200 p-4 flex flex-col items-center font-sans">
      <style>{`@keyframes slide-up { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.3s ease-out; }`}</style>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden my-4 flex flex-col h-[90vh] border border-stone-200 relative">
        <div className="bg-stone-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 z-10">
          <div className="flex items-center cursor-pointer" onClick={() => toggleModal('profile', true)}>
            <BriefcaseIcon size={24} className="mr-2 text-stone-300" />
            <div className="flex flex-col"><h1 className="text-lg font-bold leading-none">Planner</h1><span className="text-[10px] text-emerald-400 flex items-center mt-1"><CloudIcon /> Online</span></div>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => toggleModal('week', true)} className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-sm font-medium flex items-center border border-stone-600"><ClockIcon /> Week</button>
            <button onClick={() => toggleModal('date', true)} className="p-2 rounded-lg hover:bg-stone-700"><CalendarIcon /></button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between text-stone-800 border-b border-stone-200 bg-white shrink-0">
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime()-MS_PER_DAY))} className="p-2 rounded-full text-stone-400 hover:bg-stone-100"><ChevronLeft /></button>
          <h2 className="text-lg font-bold tracking-wide select-none">{formatDisplayDate(currentDate)}</h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime()+MS_PER_DAY))} className="p-2 rounded-full text-stone-400 hover:bg-stone-100"><ChevronRight /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-stone-50">
          {loadingJobs ? <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div></div> : 
           dailyJobs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6"><BriefcaseIcon size={48} className="mb-4 opacity-20" /><p className="text-center italic font-medium">No jobs scheduled.</p><p className="text-sm">Tap "New Job" to add one.</p></div>
          ) : dailyJobs.map((job) => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex flex-col gap-2 relative group">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-stone-800 pr-2 leading-tight">{job.title}</h3>
                    <button onClick={() => toggleStatus(job)} className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(job.status)} uppercase tracking-wide shrink-0`}>{getStatusIcon(job.status)} {job.status}</button>
                </div>
                <div className="text-sm text-stone-600 space-y-1.5 mt-1">
                    {job.location && <div className="flex items-center"><MapPinIcon /><span className="truncate ml-2">{job.location}</span></div>}
                    {job.quote > 0 && <div className="flex items-center font-semibold text-stone-800"><DollarSignIcon /><span className="ml-2">Quote: {formatCurrency(job.quote)}</span></div>}
                    {job.tools && <div className="flex items-start"><ToolIcon /><span className="text-stone-500 italic text-xs ml-2">{job.tools}</span></div>}
                </div>
                <button onClick={() => toggleModal('deleteId', job.id)} className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 transition p-1"><Trash2Icon /></button>
              </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-stone-200 shrink-0">
          <button onClick={() => {setNewJob({ title: '', location: '', quote: '', tools: '', status: 'Pending' }); toggleModal('job', true);}} className="w-full bg-stone-800 text-white p-3.5 rounded-xl hover:bg-stone-700 active:bg-stone-900 transition shadow-lg flex items-center justify-center font-bold text-lg tracking-wide"><PlusIcon /> <span className="ml-2">New Job</span></button>
        </div>

        {modals.profile && (
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm z-50 flex flex-col p-6 text-white animate-slide-up">
                <div className="flex justify-between items-center mb-8 border-b border-stone-700 pb-4"><h2 className="text-xl font-bold flex items-center gap-2"><UserIcon /> Profile</h2><button onClick={() => toggleModal('profile', false)} className="p-2 hover:bg-stone-700 rounded-full">✕</button></div>
                <div className="flex-grow">
                    <div className="bg-stone-800 p-4 rounded-lg mb-4"><p className="text-xs text-stone-400 uppercase mb-1">Status</p><p className="text-emerald-400 font-bold flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Active</p></div>
                    <div className="bg-stone-800 p-4 rounded-lg"><p className="text-xs text-stone-400 uppercase mb-1">Email</p><p className="font-mono text-sm text-stone-300 break-all">{user?.email}</p></div>
                </div>
                <button onClick={handleLogout} className="w-full bg-red-900/50 border border-red-800 text-red-200 p-4 rounded-xl font-bold hover:bg-red-900 transition flex items-center justify-center gap-2"><LogOutIcon /> Sign Out</button>
            </div>
        )}
      </div>
      
      {modals.date && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4 text-center">Go to Date</h3>
            <input type="date" className="w-full p-3 border-2 border-stone-200 rounded-lg text-stone-800 text-lg text-center" value={dateKey} onChange={(e) => { if(e.target.value){ const [y,m,d]=e.target.value.split('-'); setCurrentDate(new Date(y,m-1,d)); toggleModal('date',false); } }} />
            <button onClick={() => toggleModal('date', false)} className="mt-4 w-full bg-stone-200 text-stone-700 p-3 rounded-lg font-bold hover:bg-stone-300 transition">Cancel</button>
          </div>
        </div>
      )}

      {modals.job && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10"><h3 className="text-xl font-bold text-stone-800">New Job</h3><button onClick={() => toggleModal('job', false)} className="text-stone-400 hover:text-stone-600">✕</button></div>
            <div className="p-5 space-y-4">
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Client / Job</label><input name="title" value={newJob.title} onChange={updateJobForm} className="w-full p-3 border-2 border-stone-200 rounded-lg" placeholder="e.g. Boiler Service" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Quote (£)</label><input type="number" name="quote" value={newJob.quote} onChange={updateJobForm} className="w-full p-3 border-2 border-stone-200 rounded-lg" placeholder="0.00" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Status</label><select name="status" value={newJob.status} onChange={updateJobForm} className="w-full p-3 border-2 border-stone-200 rounded-lg bg-white"><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Complete">Complete</option></select></div>
                </div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Location</label><input name="location" value={newJob.location} onChange={updateJobForm} className="w-full p-3 border-2 border-stone-200 rounded-lg" placeholder="Address..." /></div>
                <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tools</label><textarea name="tools" value={newJob.tools} onChange={updateJobForm} rows="3" className="w-full p-3 border-2 border-stone-200 rounded-lg resize-none" placeholder="Required items..." /></div>
                <div className="pt-2 flex gap-3"><button onClick={() => toggleModal('job', false)} className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold hover:bg-stone-300">Cancel</button><button onClick={handleAddJob} className="flex-1 bg-stone-800 text-white p-3 rounded-xl font-bold hover:bg-stone-700 shadow-md">Save Job</button></div>
            </div>
          </div>
        </div>
      )}

      {modals.week && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center shrink-0"><h3 className="text-xl font-bold text-stone-800">Weekly Overview</h3><button onClick={() => toggleModal('week', false)} className="text-stone-400 hover:text-stone-600">✕</button></div>
            <div className="p-5 bg-stone-50 border-b border-stone-200 shrink-0 text-center"><p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Total Potential Value</p><p className="text-3xl font-extrabold text-stone-800">{formatCurrency(weeklyData.total)}</p></div>
            <div className="overflow-y-auto p-4 space-y-1">
              {weeklyData.weekData.map((d, i) => (
                <div key={i} className={`py-3 px-3 rounded-lg ${d.isCurrent ? 'bg-stone-200 border border-stone-300' : ''}`}>
                  <div className="flex justify-between items-center mb-1"><h4 className={`font-bold ${d.isCurrent ? 'text-stone-900' : 'text-stone-600'}`}>{d.date}</h4>{d.dayTotal > 0 && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{formatCurrency(d.dayTotal)}</span>}</div>
                  {d.jobs.length === 0 ? <p className="text-xs text-stone-400 italic">— Free day</p> : <ul className="space-y-2 mt-2">{d.jobs.map((j) => (<li key={j.id} className="bg-white p-2 rounded border border-stone-100 shadow-sm flex justify-between items-center"><span className="text-sm text-stone-700 font-medium truncate pr-2">{j.title}</span><div className={`w-2 h-2 rounded-full flex-shrink-0 ${j.status === 'Complete' ? 'bg-emerald-500' : j.status === 'In Progress' ? 'bg-amber-500' : 'bg-stone-300'}`}></div></li>))}</ul>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {modals.deleteId !== null && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs text-center border border-stone-100">
            <Trash2Icon size={48} className="text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-800 mb-2">Confirm Deletion</h3>
  
