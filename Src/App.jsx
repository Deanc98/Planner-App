import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Send, Trash2, ChevronLeft, ChevronRight, Loader2, Pin, Calendar } from 'lucide-react';

// --- FIREBASE SETUP CONSTANTS (Your specific credentials) ---
const standaloneFirebaseConfig = {
  apiKey: "AIzaSyC0Nh1SKOXKw6dbf0Bw", 
  authDomain: "weekly-planner-98f37.firebaseapp.com", 
  projectId: "weekly-planner-98f37", 
  storageBucket: "weekly-planner-98f37.appspot.com", 
  messagingSenderId: "390184727008", 
  appId: "1:390184727008:web:e6a5d9a9f24b" 
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : standaloneFirebaseConfig;

const STANDALONE_APP_ID = 'standalone-daily-task-planner-v1';
const appId = typeof __app_id !== 'undefined' ? __app_id : STANDALONE_APP_ID;

// Using a simplified document path for the shared task list
const TASK_DOC_PATH = `standalone_planner/dailyTasks`; 

// --- DATE GENERATION LOGIC ---

// Helper function to format date as YYYY-MM-DD (used for Firestore keys and array indexing)
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Generates an array of date keys starting today and ending exactly one year from today
const generateYearOfDates = () => {
  const dates = [];
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Calculate one year plus one day for the last date
  const oneYearFromNow = new Date(currentDate);
  oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);
  
  let runner = new Date(currentDate);
  while (runner <= oneYearFromNow) {
    dates.push(formatDateKey(runner));
    runner.setDate(runner.getDate() + 1);
  }
  return dates;
};

const DATES = generateYearOfDates();
const MIN_DATE = DATES[0];
const MAX_DATE = DATES[DATES.length - 1];

const getInitialDateIndex = () => {
  // Since DATES array always starts with today's date, the index is 0
  return 0; 
};

// Helper to format the key (e.g., '2025-11-17') into a display string
const formatDisplayDate = (dateKey) => {
  const dateParts = dateKey.split('-').map(Number);
  // Date constructor (year, monthIndex, day)
  const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};


// --- FIREBASE INITIALIZATION ---
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Default empty structure for tasks (only needed for initialization/merging)
const defaultTasks = {}; 

const App = () => {
  const [tasks, setTasks] = useState(defaultTasks);
  const [currentDateIndex, setCurrentDateIndex] = useState(getInitialDateIndex());
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // New state for modal
  
  const swipeRef = useRef(null);
  const [touchStart, setTouchStart] = useState(0);

  const currentDateKey = DATES[currentDateIndex];
  const displayDate = formatDisplayDate(currentDateKey);

  // Function to handle quick date selection from the modal
  const handleDateSelection = (dateString) => {
    // dateString will be in YYYY-MM-DD format, which matches the DATES array format
    const newIndex = DATES.indexOf(dateString);
    if (newIndex !== -1) {
      setCurrentDateIndex(newIndex);
    } else {
      console.error("Selected date is outside the planner range.");
    }
    setIsCalendarOpen(false);
  };
  
  // 1. AUTHENTICATION EFFECT
  useEffect(() => {
    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    const initializeAuth = async () => {
      try {
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
        
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
          } else {
            console.warn("User signed out unexpectedly or initial anonymous sign-in failed.");
            setUserId(null);
            setIsAuthReady(false);
          }
        });
      } catch (error) {
        console.error("Firebase Authentication failed:", error);
        setIsAuthReady(true); 
      }
    };
    
    if (auth && app) { 
      initializeAuth();
    } else {
      setIsAuthReady(true);
      console.error("Firebase services were not initialized due to configuration errors.");
    }

  }, []);

  // 2. FIREBASE WRITE/UPDATE FUNCTION (using exponential backoff)
  const updateTasksInFirestore = useCallback(async (newTasks) => {
    if (!isAuthReady) {
      console.log("Firestore initialization in progress. Skipping save.");
      return;
    }
    
    setIsSaving(true);
    const docRef = doc(db, TASK_DOC_PATH); 
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // We set the entire tasks object (which contains all dates)
        await setDoc(docRef, newTasks); 
        setIsSaving(false);
        return;
      } catch (error) {
        if (error.code === 'unavailable' && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`Firestore unavailable, retrying in ${delay / 1000}s... (Attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error("Failed to update tasks in Firestore after retries:", error);
          setIsSaving(false);
          return; 
        }
      }
    }
  }, [isAuthReady]); 

  // 3. FIREBASE READ/SNAPSHOT EFFECT
  useEffect(() => {
    if (!isAuthReady) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const docRef = doc(db, TASK_DOC_PATH);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const fetchedTasks = docSnap.data();
        setTasks(fetchedTasks);
      } else {
        // Document doesn't exist, initialize it with a blank object
        console.log("Planner document does not exist, initializing...");
        updateTasksInFirestore({});
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to Firestore updates:", error);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [isAuthReady, updateTasksInFirestore]); 

  // --- NAVIGATION LOGIC ---

  const goToNextDay = () => {
    setCurrentDateIndex((prev) => (prev < DATES.length - 1 ? prev + 1 : prev));
  };

  const goToPreviousDay = () => {
    setCurrentDateIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // --- SWIPE LOGIC ---
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe left -> Next day
        goToNextDay();
      } else {
        // Swipe right -> Previous day
        goToPreviousDay();
      }
    }
    setTouchStart(0);
  };

  // --- NOTE MANAGEMENT LOGIC ---

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;

    const newNote = { // Renamed from Task to Note in concept
      id: Date.now(),
      text: newTaskInput.trim(),
    };

    const newTasks = {
      ...tasks,
      [currentDateKey]: [...(tasks[currentDateKey] || []), newNote],
    };

    setTasks(newTasks);
    updateTasksInFirestore(newTasks);
    setNewTaskInput('');
  };
  
  const handleDeleteTask = (noteId) => {
    const newTasks = {
      ...tasks,
      [currentDateKey]: (tasks[currentDateKey] || []).filter((note) => note.id !== noteId),
    };

    setTasks(newTasks);
    updateTasksInFirestore(newTasks);
  };
  
  // Render function for the current day's notes
  const renderNotes = () => {
    const currentNotes = tasks[currentDateKey] || [];
    
    if (isLoading && !currentNotes.length) {
      return (
        <div className="flex justify-center items-center py-10 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={24} /> Loading notes...
        </div>
      );
    }

    if (!currentNotes.length) {
      return (
        <p className="text-center text-gray-500 py-10 italic">
          No notes added for {displayDate}. Start typing!
        </p>
      );
    }

    return (
      <ul className="space-y-3 p-4 divide-y divide-gray-100">
        {currentNotes.map((note) => (
          <li key={note.id} className="pt-3 flex items-start justify-between group">
            <div 
              className="flex-1 pr-4 flex items-start" 
            >
              <Pin className="flex-shrink-0 w-5 h-5 text-slate-500 mt-0.5 mr-3 rotate-45" />
              <span
                className={`text-gray-800 flex-1 leading-relaxed font-medium whitespace-pre-wrap`}
              >
                {note.text}
              </span>
            </div>
            <button
              onClick={() => handleDeleteTask(note.id)}
              className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full hover:bg-red-50"
              aria-label={`Delete note: ${note.text}`}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  // Modal Component for Quick Date Selection
  const CalendarModal = () => {
    if (!isCalendarOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsCalendarOpen(false)} 
        >
            <div 
                className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm"
                onClick={(e) => e.stopPropagation()} 
            >
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Jump to Date</h3>
                <input
                    type="date"
                    min={MIN_DATE}
                    max={MAX_DATE}
                    // Current date key is YYYY-MM-DD
                    value={currentDateKey} 
                    onChange={(e) => handleDateSelection(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-slate-500 focus:border-slate-500 transition-all"
                />
                <p className="mt-3 text-sm text-gray-500">
                    Range: {formatDisplayDate(MIN_DATE)} to {formatDisplayDate(MAX_DATE)}
                </p>
                <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="mt-4 w-full p-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    );
  };


  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg">
          <Loader2 className="animate-spin text-slate-500 mb-3" size={32} />
          <p className="text-gray-600 font-semibold">Initializing Planner...</p>
        </div>
      </div>
    );
  }
  
  // Conditionally render warning if standalone config is still in use
  const isPlaceholder = firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY" && typeof __firebase_config === 'undefined';

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 flex flex-col items-center">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header and Date Navigation */}
        <div className="p-6 bg-slate-700 text-white shadow-md">
          <h1 className="text-3xl font-extrabold mb-1">Year-Long Note Planner</h1>
          <p className="text-slate-300 text-sm">Use this daily diary to save notes and memories.</p>
        </div>

        {isPlaceholder && (
          <div className="p-3 bg-red-100 text-red-700 text-sm font-medium border-b border-red-300">
            ⚠️ **SETUP NOTE:** This code contains your Firebase keys and is ready to be deployed.
          </div>
        )}

        {/* Date Display and Navigation */}
        <div className="flex items-center justify-between p-4 bg-stone-100 border-b border-stone-200">
          <button
            onClick={goToPreviousDay}
            className={`p-2 bg-stone-200 text-slate-700 rounded-full hover:bg-stone-300 transition-colors ${currentDateIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Previous Day"
            disabled={currentDateIndex === 0}
          >
            <ChevronLeft size={20} />
          </button>
          
          {/* Date Display and Calendar Icon */}
          <div className="flex flex-col items-center">
            <h2 className="text-lg md:text-xl font-bold text-slate-800 text-center transition-transform duration-300 ease-in-out">
              {displayDate}
            </h2>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="mt-1 flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              aria-label="Open Calendar to jump to date"
            >
              <Calendar size={16} className="mr-1" />
              Jump to Date
            </button>
          </div>

          <button
            onClick={goToNextDay}
            className={`p-2 bg-stone-200 text-slate-700 rounded-full hover:bg-stone-300 transition-colors ${currentDateIndex === DATES.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Next Day"
            disabled={currentDateIndex === DATES.length - 1}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Note List Area - Swipeable */}
        <div
          ref={swipeRef}
          className="min-h-[300px] transition-all duration-300 ease-in-out"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {renderNotes()}
        </div>

        {/* New Note Input Form */}
        <form onSubmit={handleAddNote} className="p-4 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            placeholder={`Add a note for ${displayDate.split(',')[0]}...`}
            className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all outline-none"
            aria-label={`New note input for ${displayDate}`}
            required
          />
          <button
            type="submit"
            className="flex-shrink-0 p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-md disabled:bg-slate-400 flex items-center justify-center"
            disabled={!newTaskInput.trim()}
            aria-label="Add Note"
          >
            <Send size={20} />
          </button>
        </form>

        {/* Footer/Status */}
        <div className="p-3 text-xs text-center text-gray-500 border-t border-gray-100 flex justify-between items-center">
          <p>Document Key: <span className="font-mono text-gray-600 break-all">{TASK_DOC_PATH}</span></p>
          {isSaving && (
            <div className="flex items-center text-slate-600 font-medium">
              <Loader2 className="animate-spin mr-1" size={14} /> Saving...
            </div>
          )}
        </div>
      </div>
      
      {/* Calendar Modal rendered here */}
      <CalendarModal />
    </div>
  );
};

export default App;

