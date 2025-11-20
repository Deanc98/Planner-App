import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- ICONS (Inline to avoid file issues) ---
const Icon = ({ c, s=18, cl="" }) => <span style={{fontSize:`${s}px`}} className={`inline-flex items-center justify-center ${cl}`}>{c}</span>;
const Svg = ({d,s=24,cl=""}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cl}>{d}</svg>;
const ChevronLeft = () => <Svg d={<polyline points="15 18 9 12 15 6"/>} s={28} />;
const ChevronRight = () => <Svg d={<polyline points="9 18 15 12 9 6"/>} s={28} />;
const GoogleIcon = () => <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;

// --- HELPERS ---
const MS_DAY = 86400000;
const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtDisp = (d) => d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
const fmtGBP = (a) => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(typeof a==='number'?a:parseFloat(a)||0);
const stColor = (s) => s==='Complete'?'text-emerald-800 bg-emerald-50 border-emerald-200':s==='In Progress'?'text-amber-800 bg-amber-50 border-amber-200':'text-stone-600 bg-stone-100 border-stone-200';

// --- COMPONENTS ---
const AuthScreen = ({ funcGoogle, funcEmail, form, setForm }) => (
  <div className="min-h-screen bg-stone-200 flex items-center justify-center p-4 font-sans">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-6">
      <div className="text-center">
        <div className="bg-white border border-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"><Icon c="💼" s={28}/></div>
        <h1 className="text-2xl font-bold text-stone-800">Trade Planner</h1>
        <p className="text-stone-500 text-sm mt-1">{form.isSignUp ? "Create Account" : "Welcome Back"}</p>
      </div>
      <form onSubmit={funcEmail} className="space-y-3">
        {form.error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{form.error}</div>}
        <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input type="email" required className="w-full p-3 border border-stone-200 rounded-lg bg-stone-50 text-sm" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
        <div><label className="text-xs font-bold text-stone-500 uppercase">Password</label><input type="password" required minLength={6} className="w-full p-3 border border-stone-200 rounded-lg bg-stone-50 text-sm" value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))} /></div>
        <button type="submit" className="w-full bg-stone-800 text-white p-3.5 rounded-xl font-bold hover:bg-stone-700 text-sm">{form.isSignUp ? "Sign Up" : "Login"}</button>
      </form>
      <div className="flex py-1 items-center"><div className="flex-grow border-t border-stone-200"></div><span className="mx-2 text-stone-300 text-xs font-bold">OR</span><div className="flex-grow border-t border-stone-200"></div></div>
      <button onClick={funcGoogle} className="w-full bg-white text-stone-700 border border-stone-300 p-3 rounded-xl font-bold hover:bg-stone-50 flex items-center justify-center gap-2 text-sm"><GoogleIcon /><span>Google</span></button>
      <div className="text-center pt-2"><button onClick={()=>setForm(p=>({...p,isSignUp:!p.isSignUp,error:''}))} className="text-sm text-stone-500 font-medium">{form.isSignUp?"Login instead":"Create account"}</button></div>
    </div>
  </div>
);

export default function PlannerComponent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => { const d=new Date(); d.setHours(0,0,0,0); return d; });
  const [jobs, setJobs] = useState([]);
  const [modals, setModals] = useState({ job: false, week: false, date: false, profile: false, deleteId: null });
  const [newJob, setNewJob] = useState({ title:'', loc:'', quote:'', tools:'', status:'Pending' });
  const [authForm, setAuthForm] = useState({ email:'', pass:'', isSignUp:false, error:'' });

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);
  const dateKey = useMemo(() => fmtKey(date), [date]);

  useEffect(() => {
    if (!user) { setJobs([]); return; }
    return onSnapshot(collection(db,'users',user.uid,'jobs'), 
      (s) => setJobs(s.docs.map(d=>d.data())), 
      (e) => console.error(e)
    );
  }, [user]);

  const dailyJobs = useMemo(() => jobs.filter(j => j.dateKey === dateKey), [jobs, dateKey]);

  const handleGoogle = async () => {
    setLoading(true); setAuthForm(p=>({...p,error:''}));
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { setLoading(false); setAuthForm(p=>({...p,error:'Google login failed'})); }
  };

  const handleEmail = async (e) => {
    e.preventDefault(); setLoading(true); setAuthForm(p=>({...p,error:''}));
    try {
      if (authForm.isSignUp) await createUserWithEmailAndPassword(auth, authForm.email, authForm.pass);
      else await signInWithEmailAndPassword(auth, authForm.email, authForm.pass);
    } catch (err) { setLoading(false); setAuthForm(p=>({...p,error:err.message})); }
  };

  const handleAdd = async () => {
    if (!user || !newJob.title.trim()) return;
    const id = Date.now().toString();
    const q = typeof newJob.quote==='string'?(parseFloat(newJob.quote.replace(/[£,]/g,''))||0):newJob.quote;
    await setDoc(doc(db,'users',user.uid,'jobs',id), { id, dateKey, createdAt:new Date().toISOString(), ...newJob, quote:q });
    setModals(p=>({...p,job:false})); setNewJob({ title:'', loc:'', quote:'', tools:'', status:'Pending' });
  };

  const delJob = async () => { if(user && modals.deleteId) await deleteDoc(doc(db,'users',user.uid,'jobs',modals.deleteId)); setModals(p=>({...p,deleteId:null})); };
  const togStat = async (j) => { if(!user) return; const ord=['Pending','In Progress','Complete']; const nxt=ord[(ord.indexOf(j.status)+1)%3]; await setDoc(doc(db,'users',user.uid,'jobs',j.id),{...j,status:nxt}); };
  const weekData = useMemo(() => {
    const s=new Date(date); s.setDate(date.getDate()-(date.getDay()===0?6:date.getDay()-1));
    let d=[], t=0;
    for(let i=0;i<7;i++) {
      const cur=new Date(s.getTime()+i*MS_DAY); const k=fmtKey(cur);
      const j=jobs.filter(x=>x.dateKey===k); const dt=j.reduce((a,b)=>a+(b.quote||0),0);
      t+=dt; d.push({ date:fmtDisp(cur), jobs:j, dayTotal:dt, isCur:k===dateKey });
    }
    return { days:d, total:t };
  }, [date, dateKey, jobs]);

  if (loading) return <div className="min-h-screen bg-stone-200 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800"></div></div>;
  if (!user) return <AuthScreen funcGoogle={handleGoogle} funcEmail={handleEmail} form={authForm} setForm={setAuthForm} />;

  return (
    <div className="min-h-screen bg-stone-200 p-4 flex flex-col items-center font-sans">
      <style>{`.anim-up{animation:slide-up 0.3s ease-out}@keyframes slide-up{from{transform:translateY(100%);opacity:0.5}to{transform:translateY(0);opacity:1}}`}</style>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden my-4 flex flex-col h-[90vh] border border-stone-200 relative">
        {/* Header */}
        <div className="bg-stone-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 z-10">
          <div className="flex items-center cursor-pointer" onClick={()=>setModals(p=>({...p,profile:true}))}>
            <Icon c="💼" s={24} cl="mr-2 text-stone-300"/>
            <div className="flex flex-col"><h1 className="text-lg font-bold leading-none">Planner</h1><span className="text-[10px] text-emerald-400 flex items-center mt-1"><Icon c="☁️" s={12}/> Syncing</span></div>
          </div>
          <div className="flex space-x-2">
            <button onClick={()=>setModals(p=>({...p,week:true}))} className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-sm font-medium flex items-center border border-stone-600"><Icon c="⏰" s={16}/> Week</button>
            <button onClick={()=>setModals(p=>({...p,date:true}))} className="p-2 rounded-lg hover:bg-stone-700"><Icon c="📅" s={20}/></button>
          </div>
        </div>
        {/* Nav */}
        <div className="p-4 flex items-center justify-between text-stone-800 border-b border-stone-200 bg-white shrink-0">
          <button onClick={()=>setDate(new Date(date.getTime()-MS_DAY))} className="p-2 rounded-full hover:bg-stone-100"><ChevronLeft/></button>
          <h2 className="text-lg font-bold tracking-wide select-none">{fmtDisp(date)}</h2>
          <button onClick={()=>setDate(new Date(date.getTime()+MS_DAY))} className="p-2 rounded-full hover:bg-stone-100"><ChevronRight/></button>
        </div>
        {/* List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-stone-50">
          {dailyJobs.length===0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6"><Icon c="💼" s={48} cl="mb-4 opacity-20"/><p>No jobs.</p><p className="text-sm">Tap "New Job"</p></div>
          ) : dailyJobs.map(j => (
            <div key={j.id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex flex-col gap-2 relative">
              <div className="flex justify-between"><h3 className="text-lg font-bold text-stone-800 leading-tight">{j.title}</h3><button onClick={()=>togStat(j)} className={`text-xs font-bold px-2 py-1 rounded border ${stColor(j.status)}`}>{j.status}</button></div>
              <div className="text-sm text-stone-600 space-y-1 mt-1">
                {j.loc && <div><Icon c="📍" s={14}/> {j.loc}</div>}
                {j.quote>0 && <div className="font-semibold text-stone-800"><Icon c="💰" s={14}/> {fmtGBP(j.quote)}</div>}
                {j.tools && <div className="italic text-xs"><Icon c="🔨" s={14}/> {j.tools}</div>}
              </div>
              <button onClick={()=>setModals(p=>({...p,deleteId:j.id}))} className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 p-1"><Icon c="🗑️" s={18}/></button>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 shrink-0"><button onClick={()=>setModals(p=>({...p,job:true}))} className="w-full bg-stone-800 text-white p-3.5 rounded-xl hover:bg-stone-700 transition shadow-lg flex items-center justify-center font-bold text-lg"><Icon c="➕" s={24}/> New Job</button></div>
        {/* Modals */}
        {modals.profile && <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm z-50 flex flex-col p-6 text-white anim-up">
          <div className="flex justify-between mb-8 border-b border-stone-700 pb-4"><h2 className="text-xl font-bold flex gap-2"><Icon c="👤"/> Profile</h2><button onClick={()=>setModals(p=>({...p,profile:false}))}>✕</button></div>
          <div className="flex-grow"><div className="bg-stone-800 p-4 rounded-lg mb-4"><p className="text-xs uppercase mb-1 text-stone-400">Email</p><p className="font-mono text-sm">{user?.email}</p></div></div>
          <button onClick={()=>{signOut(auth);setModals(p=>({...p,profile:false}))}} className="w-full bg-red-900/50 border-red-800 border text-red-200 p-4 rounded-xl font-bold">Sign Out</button>
        </div>}
        {modals.date && <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs"><input type="date" className="w-full p-3 border-2 rounded-lg text-center" value={dateKey} onChange={e=>{if(e.target.value){const[y,m,d]=e.target.value.split('-');setDate(new Date(y,m-1,d));setModals(p=>({...p,date:false}))}}} /><button onClick={()=>setModals(p=>({...p,date:false}))} className="mt-4 w-full bg-stone-200 p-3 rounded-lg font-bold">Cancel</button></div></div>}
        {modals.job && <div className="fixed inset-0 bg-stone-900/50 flex items-end sm:items-center justify-center z-50 sm:p-4"><div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto anim-up">
          <div className="p-5 border-b flex justify-between sticky top-0 bg-white z-10"><h3 className="text-xl font-bold">New Job</h3><button onClick={()=>setModals(p=>({...p,job:false}))}>✕</button></div>
          <div className="p-5 space-y-4">
            <input value={newJob.title} onChange={e=>setNewJob(p=>({...p,title:e.target.value}))} className="w-full p-3 border-2 rounded-lg" placeholder="Job Title" />
            <div className="grid grid-cols-2 gap-4"><input type="number" value={newJob.quote} onChange={e=>setNewJob(p=>({...p,quote:e.target.value}))} className="w-full p-3 border-2 rounded-lg" placeholder="£0.00" /><select value={newJob.status} onChange={e=>setNewJob(p=>({...p,status:e.target.value}))} className="w-full p-3 border-2 rounded-lg bg-white"><option>Pending</option><option>In Progress</option><option>Complete</option></select></div>
            <input value={newJob.loc} onChange={e=>setNewJob(p=>({...p,loc:e.target.value}))} className="w-full p-3 border-2 rounded-lg" placeholder="Location" />
            <textarea value={newJob.tools} onChange={e=>setNewJob(p=>({...p,tools:e.target.value}))} className="w-full p-3 border-2 rounded-lg" placeholder="Tools needed..." />
            <div className="pt-2 flex gap-3"><button onClick={()=>setModals(p=>({...p,job:false}))} className="flex-1 bg-stone-200 p-3 rounded-xl font-bold">Cancel</button><button onClick={handleAdd} className="flex-1 bg-stone-800 text-white p-3 rounded-xl font-bold">Save</button></div>
          </div>
        </div></div>}
        {modals.week && <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="p-5 border-b flex justify-between shrink-0"><h3 className="text-xl font-bold">Weekly Overview</h3><button onClick={()=>setModals(p=>({...p,week:false}))}>✕</button></div>
          <div className="p-5 bg-stone-50 text-center border-b"><p className="text-xs font-bold uppercase mb-1">Total Value</p><p className="text-3xl font-extrabold">{fmtGBP(weekData.total)}</p></div>
          <div className="overflow-y-auto p-4 space-y-1">{weekData.days.map((d,i)=><div key={i} className={`py-3 px-3 rounded-lg ${d.isCur?'bg-stone-200 border border-stone-300':''}`}><div className="flex justify-between mb-1"><h4 className="font-bold">{d.date}</h4>{d.dayTotal>0 && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{fmtGBP(d.dayTotal)}</span>}</div>{d.jobs.length===0?<p className="text-xs text-stone-400 italic">— Free</p>:<ul className="space-y-2 mt-2">{d.jobs.map(j=><li key={j.id} className="bg-white p-2 rounded border shadow-sm flex justify-between"><span className="truncate pr-2 text-sm">{j.title}</span><div className={`w-2 h-2 rounded-full flex-shrink-0 ${j.status==='Complete'?'bg-emerald-500':j.status==='In Progress'?'bg-amber-500':'bg-stone-300'}`}></div></li>)}</ul>}</div>)}</div>
        </div></div>}
        {modals.deleteId && <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs text-center"><Icon c="🗑️" s={48} cl="mx-auto mb-4"/><h3 className="text-lg font-bold mb-2">Delete Job?</h3><div className="flex gap-3"><button onClick={()=>setModals(p=>({...p,deleteId:null}))} className="flex-1 bg-stone-200 p-3 rounded-xl font-bold">Cancel</button><button onClick={delJob} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold">Delete</button></div></div></div>}
      </div>
    </div>
  );
}


