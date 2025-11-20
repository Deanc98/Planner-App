import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Edit3, MapPin, DollarSign, Tool, Calendar, CheckSquare, X, RefreshCw, Trash2, Zap, Clock } from 'lucide-react';

// --- Configuration and Constants ---

const JOB_STATUSES = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-yellow-500', icon: Calendar },
  'IN-PROGRESS': { label: 'In Progress', color: 'bg-blue-500', icon: Clock },
  COMPLETE: { label: 'Complete', color: 'bg-green-500', icon: CheckSquare },
  INVOICED: { label: 'Invoiced / Pending', color: 'bg-purple-500', icon: DollarSign },
  PAID: { label: 'Paid', color: 'bg-teal-500', icon: Zap },
};

// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Utility for formatting currency
const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '£0.00'; // Assuming British pound based on trades context, adjust as needed
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(num);
};

// --- Job Card Component ---
const JobCard = React.memo(({ job, onEdit, onDelete, onStatusChange }) => {
  const status = JOB_STATUSES[job.status] || JOB_STATUSES.SCHEDULED;
  const Icon = status.icon;

  const handleNavigate = () => {
    if (job.location) {
      // Direct link to Google Maps navigation
      const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.location)}`;
      window.open(mapUrl, '_blank');
    }
  };

  const nextStatusKeys = useMemo(() => {
    const keys = Object.keys(JOB_STATUSES);
    const currentIndex = keys.indexOf(job.status);
    return keys.slice(currentIndex + 1);
  }, [job.status]);

  return (
    <div className="bg-white shadow-xl rounded-xl p-4 mb-4 border-t-4 border-b-4 border-gray-200 transition-all hover:shadow-2xl">
      
      {/* Header & Status */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-gray-800 leading-tight">
          {job.title || 'Untitled Job'}
        </h3>
        <div className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${status.color}`}>
          <div className="flex items-center">
             <Icon size={12} className="mr-1"/> {status.label}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4 border-t pt-3">
        <div className="flex items-center">
          <DollarSign size={16} className="mr-2 text-green-600" />
          <span className="font-medium">Quote: {formatCurrency(job.quote)}</span>
        </div>
        <div className="flex items-center">
          <Tool size={16} className="mr-2 text-indigo-600" />
          <span className="truncate">{job.tools || 'General Tools'}</span>
        </div>
        <div className="flex items-start col-span-2">
          <MapPin size={16} className="mr-2 text-red-600 flex-shrink-0 mt-1" />
          <p className="line-clamp-2">{job.location || 'Location Not Set'}</p>
        </div>
        <div className="flex items-start col-span-2">
          <p className="text-gray-500 italic line-clamp-3 text-xs">{job.description || 'No description provided.'}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex space-x-2 border-t pt-3">
        <button
          onClick={handleNavigate}
          disabled={!job.location}
          className="flex-1 flex items-center justify-center p-2 text-sm font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
        >
          <MapPin size={16} className="mr-1" /> Navigate
        </button>
        <button
          onClick={() => onEdit(job)}
          className="p-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          aria-label="Edit Job"
        >
          <Edit3 size={18} />
        </button>
        <button
          onClick={() => onDelete(job.id)}
          className="p-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition"
          aria-label="Delete Job"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Next Status Buttons */}
      {nextStatusKeys.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold text-gray-500 mb-2">Advance Status:</p>
          <div className="flex flex-wrap gap-2">
            {nextStatusKeys.map((key) => {
              const nextStatus = JOB_STATUSES[key];
              return (
                <button
                  key={key}
                  onClick={() => onStatusChange(job.id, key)}
                  className={`flex items-center px-3 py-1 text-xs font-semibold rounded-full text-white transition ${nextStatus.color} hover:opacity-80`}
                >
                  <nextStatus.icon size={12} className="mr-1" /> {nextStatus.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});


// --- Job Modal (Add/Edit Form) Component ---
const JobModal = ({ isOpen, onClose, onSubmit, job }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    quote: '',
    tools: '',
    status: 'SCHEDULED',
  });

  useEffect(() => {
    if (job) {
      // Set form data for editing
      setFormData({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        quote: job.quote || '',
        tools: job.tools || '',
        status: job.status || 'SCHEDULED',
      });
    } else {
      // Reset for adding new job
      setFormData({
        title: '',
        description: '',
        location: '',
        quote: '',
        tools: '',
        status: 'SCHEDULED',
      });
    }
  }, [job]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, job?.id);
    onClose();
  };

  const fields = [
    { name: 'title', label: 'Job Title', type: 'text', required: true, placeholder: 'E.g., Kitchen Refit - Mr. Smith' },
    { name: 'location', label: 'Job Location/Address', type: 'text', placeholder: 'E.g., 123 High Street, City' },
    { name: 'quote', label: 'Quoted Price (£)', type: 'number', placeholder: 'E.g., 1500.00' },
    { name: 'tools', label: 'Key Tools/Materials', type: 'text', placeholder: 'E.g., Tile Cutter, 18mm Plywood' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">{job ? 'Edit Job Details' : 'Add New Job'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-1">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-grow">
          {fields.map((field) => (
            <div key={field.name} className="mb-4">
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                id={field.name}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required={field.required}
                placeholder={field.placeholder}
                step={field.type === 'number' ? '0.01' : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          ))}

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Job Description / Notes
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Detailed notes, client contact info, specific requirements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
            ></textarea>
          </div>

          <div className="mb-6">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Job Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              {Object.keys(JOB_STATUSES).map((key) => (
                <option key={key} value={key}>{JOB_STATUSES[key].label}</option>
              ))}
            </select>
          </div>
          
          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition"
            >
              {job ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Main Application Component ---
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentJob, setCurrentJob] = useState(null); // Job being edited, or null for new job
  const [filterStatus, setFilterStatus] = useState('ALL');

  // 1. Initialize Firebase and Authentication
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Sign in anonymously if no token is provided or if token sign-in fails
          signInAnonymously(firebaseAuth)
            .then(anonUserCredential => setUserId(anonUserCredential.user.uid))
            .catch(e => console.error("Anonymous sign-in failed:", e));
        }
        setIsAuthReady(true);
      });

      // Attempt custom token sign-in if available
      if (initialAuthToken) {
        signInWithCustomToken(firebaseAuth, initialAuthToken).catch(e => {
          console.error("Custom token sign-in failed. Falling back to anonymous.", e);
        });
      }

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setIsAuthReady(true);
    }
  }, []);

  // 2. Fetch/Listen for Jobs using onSnapshot
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const jobsRef = collection(db, `artifacts/${appId}/users/${userId}/jobs`);
    const q = query(jobsRef);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()); // Sort by newest first

      setJobs(jobList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  // --- CRUD Operations ---

  const handleAddOrUpdateJob = async (jobData, jobId) => {
    if (!db || !userId) return;
    try {
      const safeData = {
        ...jobData,
        quote: jobData.quote || 0, // Ensure quote is a number/string
        createdAt: new Date(), // Update timestamp on creation/update
      };

      if (jobId) {
        // Update existing job
        const jobRef = doc(db, `artifacts/${appId}/users/${userId}/jobs`, jobId);
        await updateDoc(jobRef, safeData);
        console.log("Job updated successfully.");
      } else {
        // Add new job
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/jobs`), safeData);
        console.log("New job added successfully.");
      }
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!db || !userId) return;

    // Use a modal/confirmation pattern instead of window.confirm
    // For simplicity here, we'll use a direct deletion with console message.
    // In a real app, this should be a custom confirmation dialog.
    if (window.confirm("Are you sure you want to delete this job? This cannot be undone.")) {
      try {
        const jobRef = doc(db, `artifacts/${appId}/users/${userId}/jobs`, jobId);
        await deleteDoc(jobRef);
        console.log("Job deleted successfully.");
      } catch (error) {
        console.error("Error deleting job:", error);
      }
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    if (!db || !userId) return;
    try {
      const jobRef = doc(db, `artifacts/${appId}/users/${userId}/jobs`, jobId);
      await updateDoc(jobRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- UI Handlers ---
  const openAddModal = () => {
    setCurrentJob(null);
    setShowModal(true);
  };

  const openEditModal = (job) => {
    setCurrentJob(job);
    setShowModal(true);
  };

  const filteredJobs = useMemo(() => {
    if (filterStatus === 'ALL') {
      return jobs;
    }
    return jobs.filter(job => job.status === filterStatus);
  }, [jobs, filterStatus]);
  
  const statusCounts = useMemo(() => {
    return jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
  }, [jobs]);

  // --- Render Logic ---

  if (loading || !isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <RefreshCw size={24} className="animate-spin" />
          <span className="text-lg font-medium">Loading Job Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      
      {/* Header and User ID */}
      <header className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <h1 className="text-2xl font-extrabold text-indigo-700">
            Pro-Planner
          </h1>
          <button
            onClick={openAddModal}
            className="flex items-center bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg hover:bg-indigo-700 transition"
          >
            <Edit3 size={16} className="mr-1" /> New Job
          </button>
        </div>
        <div className="text-xs text-center text-gray-500 mt-2">
            User ID: <span className="font-mono text-gray-700">{userId}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        
        {/* Status Filter Tabs (Mobile Focused Scrollable) */}
        <div className="flex space-x-2 overflow-x-auto pb-3 -mt-2 mb-4 whitespace-nowrap scrollbar-hide">
          {['ALL', ...Object.keys(JOB_STATUSES)].map(statusKey => {
            const isAll = statusKey === 'ALL';
            const status = isAll ? { label: 'All Jobs', color: 'bg-gray-700' } : JOB_STATUSES[statusKey];
            const count = isAll ? jobs.length : (statusCounts[statusKey] || 0);

            return (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(statusKey)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition ${
                  filterStatus === statusKey
                    ? `${status.color} text-white shadow-md`
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.label} <span className="ml-2 px-2 rounded-full text-xs font-bold bg-white text-gray-800">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Job List */}
        {filteredJobs.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-lg mt-8">
            <Tool size={32} className="mx-auto text-indigo-400 mb-3" />
            <p className="text-lg font-medium text-gray-700">No jobs found.</p>
            <p className="text-sm text-gray-500">
              {filterStatus === 'ALL' ? "Tap 'New Job' to add your first task." : `Change the filter to see other job statuses.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={openEditModal}
                onDelete={handleDeleteJob}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        <div className="h-16"></div> {/* Spacer for fixed button */}
      </main>

      {/* Floating Add Button (Mobile friendly) */}
      <div className="fixed bottom-4 right-4 md:hidden">
        <button
            onClick={openAddModal}
            className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
            aria-label="Add New Job"
        >
          <Edit3 size={24} />
        </button>
      </div>


      <JobModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddOrUpdateJob}
        job={currentJob}
      />
    </div>
  );
};

export default App;

        
