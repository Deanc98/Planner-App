import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- CONFIGURATION ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = new Date();
START_DATE.setHours(0, 0, 0, 0); 

// --- ICON COMPONENTS (Simplified to Emojis and SVGs) ---

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

// --- DATA MANAGEMENT (LOCAL STORAGE) ---
const loadJobs = (dateKey) => {
  const data = localStorage.getItem(`planner-jobs-${dateKey}`);
  try {
      return data ? JSON.parse(data) : [];
  } catch (e) {
      console.error("Failed to parse jobs from localStorage", e);
      return [];
  }
};

const saveJobs = (dateKey, jobs) => {
  localStorage.setItem(`planner-jobs-${dateKey}`, JSON.stringify(jobs));
};


// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [jobs, setJobs] = useState([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  
  // State for the form
  const [newJobDetails, setNewJobDetails] = useState({
      title: '',
      location: '',
      quote: '',
      tools: '',
      status: 'Pending'
  });

  const currentDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);
  
  // Load data when date changes
  useEffect(() => {
    setJobs(loadJobs(currentDateKey));
  }, [currentDateKey]);

  // --- NAVIGATION LOGIC ---

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

  // --- JOB MANAGEMENT LOGIC ---

  const handleJobModalOpen = () => {
      setNewJobDetails({ title: '', location: '', quote: '', tools: '', status: 'Pending' });
      setShowJobModal(true);
  }

  const handleJobDetailChange = (e) => {
      const { name, value } = e.target;
      setNewJobDetails(prev => ({ ...prev, [name]: value }));
  }

  const handleAddJob = () => {
    const quoteValue = parseFloat(newJobDetails.quote.replace(/[£,]/g, '')) || 0;

    if (newJobDetails.title.trim() !== '') {
      const newJob = {
        id: Date.now(),
        ...newJobDetails,
        quote: quoteValue, 
      };
      const updatedJobs = [...jobs, newJob];
      setJobs(updatedJobs);
      saveJobs(currentDateKey, updatedJobs);
      setShowJobModal(false);
    }
  };
  
  const confirmDelete = (jobId) => {
      setShowConfirmDelete(jobId);
  }

  const handleDeleteJob = () => {
      const idToDelete = showConfirmDelete;
      if (idToDelete !== null) {
          const updatedJobs = jobs.filter(job => job.id !== idToDelete);
          setJobs(updatedJobs);
          saveJobs(currentDateKey, updatedJobs);
      }
      setShowConfirmDelete(null);
  };


  const handleToggleStatus = (jobId) => {
      const statusOrder = ['Pending', 'In Progress', 'Complete'];
      const updatedJobs = jobs.map(job => {
          if (job.id === jobId) {
              const currentIndex = statusOrder.indexOf(job.status);
              const nextIndex = (currentIndex + 1) % statusOrder.length;
              return { ...job, status: statusOrder[nextIndex] };
          }
          return job;
      });
      setJobs(updatedJobs);
      saveJobs(currentDateKey, updatedJobs);
  }

  // --- WEEKLY VIEW LOGIC ---

  const weeklyData = useMemo(() => {
    // Find the start of the current week (Monday)
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Correctly calculate days to Monday
    
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    const weekData = [];
    let totalQuotedValue = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * MS_PER_DAY);
      const dateKey = formatDateKey(date);
      const displayDate = formatDisplayDate(date);
      const jobsForDay = loadJobs(dateKey);
      
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
  }, [currentDate, currentDateKey]); 
  
  const { weekData, totalQuotedValue } = weeklyData;


  // --- UI RENDERING ---

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
        @media (max-width: 640px) {
            .sm\\:items-end { align-items: flex-end; }
            .sm\\:rounded-t-2xl {
                border-top-left-radius: 1rem;
                border-top-right-radius: 1rem;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }
        }
      `}</style>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden my-4 flex flex-col h-[90vh] border border-stone-200">
        
        {/* Header Bar */}
        <div className="bg-stone-800 text-white p-4 flex justify-between items-center shadow-md shrink-0">
          <div className="flex items-center">
            <BriefcaseIcon size={24} className="mr-2 text-stone-300" />
            <h1 className="text-xl font-bold tracking-tight text-stone-50">Planner</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowWeeklyModal(true)}
              className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 transition text-sm font-medium flex items-center border border-stone-600"
              aria-label="View Weekly Overview"
            >
              <ClockIcon className="mr-1 text-stone-300" /> Week
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 rounded-lg hover:bg-stone-700 transition"
              aria-label="Jump to Date"
            >
              <CalendarIcon size={20} className="text-stone-300" />
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div 
          className="p-4 flex items-center justify-between text-stone-800 border-b border-stone-200 bg-white shrink-0"
        >
          <button 
            onClick={() => navigateDate(-1)} 
            className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-800 transition"
            aria-label="Previous Day"
          >
            <ChevronLeft />
          </button>
          
          <h2 className="text-lg font-bold text-stone-800 tracking-wide select-none">
            {formatDisplayDate(currentDate)}
          </h2>
          
          <button 
            onClick={() => navigateDate(1)} 
            className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-800 transition"
            aria-label="Next Day"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Job List (Scrollable Area) */}
        <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-stone-50">
          {jobs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6">
                <BriefcaseIcon size={48} className="mb-4 opacity-20" />
                <p className="text-center italic font-medium">No jobs scheduled.</p>
                <p className="text-sm">Tap "New Job" to add one.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex flex-col gap-2 relative group"
              >
                {/* Job Header */}
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-stone-800 pr-2 leading-tight">
                        {job.title}
                    </h3>
                    <button
                        onClick={() => handleToggleStatus(job.id)}
                        className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(job.status)} uppercase tracking-wide shrink-0`}
                    >
                        {getStatusIcon(job.status)} {job.status}
                    </button>
                </div>

                {/* Job Details */}
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
                
                {/* Delete Action */}
                <button
                    onClick={() => confirmDelete(job.id)}
                    className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 transition p-1"
                    aria-label="Delete job"
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
            aria-label="Add New Job"
          >
            <PlusIcon size={24} className="mr-2" /> New Job
          </button>
        </div>
      </div>
      
      {/* --- MODALS --- */}

      {/* MODAL 1: Jump to Date */}
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
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full bg-stone-200 text-stone-700 p-3 rounded-lg font-bold hover:bg-stone-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Add/Edit Job Details */}
      {showJobModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="text-xl font-bold text-stone-800">New Job</h3>
                 <button onClick={() => setShowJobModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            
            <div className="p-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1" htmlFor="jobTitle">Client / Job Title</label>
                    <input
                        id="jobTitle"
                        type="text"
                        name="title"
                        placeholder="e.g. John Doe - Boiler Fix"
                        value={newJobDetails.title}
                        onChange={handleJobDetailChange}
                        className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1" htmlFor="jobQuote">Quote (£)</label>
                        <input
                            id="jobQuote"
                            type="number"
                            name="quote"
                            placeholder="0.00"
                            value={newJobDetails.quote}
                            onChange={handleJobDetailChange}
                            className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1" htmlFor="jobStatus">Status</label>
                        <select
                            id="jobStatus"
                            name="status"
                            value={newJobDetails.status}
                            onChange={handleJobDetailChange}
                            className="w-full p-3 border-2 border-stone-200 rounded-lg bg-white focus:border-stone-500 focus:outline-none bg-stone-50"
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complete">Complete</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1" htmlFor="jobLocation">Location</label>
                    <div className="relative">
                        <MapPinIcon size={18} className="absolute left-3 top-3.5 text-stone-400" />
                        <input
                            id="jobLocation"
                            type="text"
                            name="location"
                            placeholder="Address or Postcode"
                            value={newJobDetails.location}
                            onChange={handleJobDetailChange}
                            className="w-full p-3 pl-10 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none bg-stone-50"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1" htmlFor="jobTools">Tools & Materials</label>
                    <textarea
                        id="jobTools"
                        name="tools"
                        placeholder="List required items..."
                        value={newJobDetails.tools}
                        onChange={handleJobDetailChange}
                        rows="3"
                        className="w-full p-3 border-2 border-stone-200 rounded-lg focus:border-stone-500 focus:outline-none resize-none bg-stone-50"
                    />
                </div>

                <div className="pt-2 flex gap-3">
                    <button
                    onClick={() => setShowJobModal(false)}
                    className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold hover:bg-stone-300 transition"
                    >
                    Cancel
                    </button>
                    <button
                    onClick={handleAddJob}
                    className="flex-1 bg-stone-800 text-white p-3 rounded-xl font-bold hover:bg-stone-700 transition shadow-md"
                    >
                    Save Job
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Weekly Overview */}
      {showWeeklyModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center shrink-0">
                 <h3 className="text-xl font-bold text-stone-800">Weekly Overview</h3>
                 <button onClick={() => setShowWeeklyModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            
            <div className="p-5 bg-stone-50 border-b border-stone-200 shrink-0 text-center">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Total Potential Value (Week)</p>
                <p className="text-3xl font-extrabold text-stone-800">{formatCurrency(totalQuotedValue)}</p>
            </div>

            <div className="overflow-y-auto p-4 space-y-1">
              {weekData.map((day, index) => (
                <div key={index} className={`py-3 px-3 rounded-lg ${day.isCurrent ? 'bg-stone-200 border border-stone-300' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                      <h4 className={`font-bold ${day.isCurrent ? 'text-stone-900' : 'text-stone-600'}`}>
                        {day.date}
                      </h4>
                      {day.dayTotal > 0 && 
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {formatCurrency(day.dayTotal)}
                        </span>
                      }
                  </div>
                  
                  {day.jobs.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">— Free day</p>
                  ) : (
                    <ul className="space-y-2 mt-2">
                      {day.jobs.map((job) => (
                        <li key={job.id} className="bg-white p-2 rounded border border-stone-100 shadow-sm flex justify-between items-center">
                            <span className="text-sm text-stone-700 font-medium truncate pr-2">{job.title}</span>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                job.status === 'Complete' ? 'bg-emerald-500' : 
                                job.status === 'In Progress' ? 'bg-amber-500' : 'bg-stone-300'
                            }`}></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL 4: Custom Delete Confirmation */}
      {showConfirmDelete !== null && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs text-center border border-stone-100">
            <Trash2Icon size={48} className="text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-800 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-stone-600 mb-6">Are you sure you want to delete this job? This action cannot be undone.</p>
            
            <div className="flex gap-3">
                <button
                    onClick={() => setShowConfirmDelete(null)}
                    className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold hover:bg-stone-300 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleDeleteJob}
                    className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 transition"
                >
                    Delete Job
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

