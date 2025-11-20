import React from 'react';
import { GoogleIcon, BriefcaseIcon } from './Icons';

export default function AuthScreen({ handleGoogle, handleEmail, authForm, setAuthForm }) {
  const updateAuthForm = (e) => setAuthForm(p => ({...p, [e.target.name]: e.target.value}));
  
  return (
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
}

