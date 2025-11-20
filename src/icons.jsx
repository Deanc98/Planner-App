import React from 'react';

export const Icon = ({ c, s=18, cl="" }) => <span style={{fontSize:`${s}px`}} className={`inline-flex items-center justify-center ${cl}`}>{c}</span>;
export const SvgIcon = ({d,s=28}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

export const ChevronLeft = () => <SvgIcon d={<polyline points="15 18 9 12 15 6"/>} />;
export const ChevronRight = () => <SvgIcon d={<polyline points="9 18 15 12 9 6"/>} />;
export const CalendarIcon = () => <Icon c="📅" s={20}/>;
export const PlusIcon = () => <Icon c="➕" s={24}/>;
export const Trash2Icon = ({size=18}) => <Icon c="🗑️" s={size}/>;
export const MapPinIcon = () => <Icon c="📍" s={14}/>;
export const DollarSignIcon = () => <Icon c="💰" s={14}/>;
export const ToolIcon = () => <Icon c="🔨" s={14}/>;
export const ClockIcon = () => <Icon c="⏰" s={16}/>;
export const BriefcaseIcon = ({size=24}) => <Icon c="💼" s={size}/>;
export const CloudIcon = () => <Icon c="☁️" s={16}/>;
export const UserIcon = () => <Icon c="👤" s={16}/>;
export const LogOutIcon = () => <Icon c="🚪" s={18}/>;
export const GoogleIcon = () => (<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>);


