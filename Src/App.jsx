import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2 } from 'lucide-react';

// --- CONFIGURATION ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = new Date();
START_DATE.setHours(0, 0, 0, 0); // Normalize to start of today

// Determine the end date (one year from now)
const END_DATE = new Date(START_DATE);
END_DATE.setFullYear(START_DATE.getFullYear() + 1);

// --- HELPER FUNCTIONS ---

// Formats a date object into a simple YYYY-MM-DD string for use as a localStorage key
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Formats a date object into a readable display string
const formatDisplayDate = (date) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

// --- DATA MANAGEMENT (LOCAL STORAGE) ---

const loadNotes = (dateKey) => {
  const data = localStorage.getItem(dateKey);
  return data ? JSON.parse(data) : [];
};

const saveNotes = (dateKey, notes) => {
  localStorage.setItem(dateKey, JSON.stringify(notes));
};


// --- MAIN APPLICATION COMPONENT ---
function App() {
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Memoize the current date key for stability
  const currentDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  // Load notes whenever currentDateKey changes
  useEffect(() => {
    setNotes(loadNotes(currentDateKey));
  }, [currentDateKey]);

  // --- NAVIGATION LOGIC ---

  const navigateDate = useCallback((direction) => {
    const newTime = currentDate.getTime() + direction * MS_PER_DAY;
    const newDate = new Date(newTime);
    
    // Check bounds (optional: prevents going beyond start/end of the defined year)
    if (newDate.getTime() < START_DATE.getTime() || newDate.getTime() > END_DATE.getTime()) {
      // You could loop here, but here we just prevent navigation
      return; 
    }
    
    setCurrentDate(newDate);
  }, [currentDate, START_DATE, END_DATE]);

  const handleSwipe = (direction) => {
    navigateDate(direction);
  };

  const handleDateChange = (event) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    setCurrentDate(selectedDate);
    setShowModal(false);
  };

  // --- NOTE MANAGEMENT LOGIC ---

  const handleAddNote = () => {
    if (newNoteText.trim() !== '') {
      const newNote = {
        id: Date.now(),
        text: newNoteText.trim(),
      };
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      saveNotes(currentDateKey, updatedNotes);
      setNewNoteText('');
    }
  };

  const handleDeleteNote = (idToDelete) => {
    const updatedNotes = notes.filter(note => note.id !== idToDelete);
    setNotes(updatedNotes);
    saveNotes(currentDateKey, updatedNotes);
  };
  
  // --- UI RENDERING ---

  return (
    <div className="min-h-screen bg-stone-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden my-4">
        
        {/* Header Bar */}
        <div className="bg-slate-700 text-white p-4 flex justify-between items-center shadow-lg">
          <h1 className="text-xl font-bold tracking-tight">Yearly Note Planner</h1>
          <button 
            onClick={() => setShowModal(true)} 
            className="p-2 rounded-full hover:bg-slate-600 transition"
            aria-label="Jump to Date"
          >
            <Calendar size={20} />
          </button>
        </div>

        {/* Date Navigation & Display */}
        <div 
          className="p-4 flex items-center justify-between text-slate-800 border-b border-slate-100"
          // Implementing basic touch/swipe interaction for mobile navigation
          onTouchStart={(e) => this.touchStartX = e.touches[0].clientX}
          onTouchEnd={(e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { // Threshold for a swipe
              handleSwipe(diff > 0 ? 1 : -1);
            }
          }}
        >
          {/* Left Button */}
          <button 
            onClick={() => navigateDate(-1)} 
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            disabled={currentDate.getTime() <= START_DATE.getTime()}
            aria-label="Previous Day"
          >
            <ChevronLeft size={24} />
          </button>
          
          {/* Date Display */}
          <h2 className="text-lg font-semibold text-slate-700 tracking-wide select-none">
            {formatDisplayDate(currentDate)}
          </h2>
          
          {/* Right Button */}
          <button 
            onClick={() => navigateDate(1)} 
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            disabled={currentDate.getTime() >= END_DATE.getTime()}
            aria-label="Next Day"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Note Input Area */}
        <div className="p-4 flex gap-2 border-b border-slate-100 bg-gray-50">
          <input
            type="text"
            className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 text-sm placeholder-slate-400"
            placeholder="Add a new note for this day..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            aria-label="New note text input"
          />
          <button
            onClick={handleAddNote}
            className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-600 transition shadow-md flex items-center"
            aria-label="Add Note"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Notes List */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto divide-y divide-slate-100">
          {notes.length === 0 ? (
            <p className="p-6 text-center text-slate-500 italic">No notes for this day. Tap to add one!</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-4 transition duration-150 hover:bg-stone-50"
              >
                <span className="text-slate-700 text-sm flex-1 break-words pr-4">
                  {note.text}
                </span>
                
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-slate-400 hover:text-red-500 p-2 transition"
                  aria-label={`Delete note: ${note.text}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Jump to Date Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Jump to Date</h3>
            <input
              type="date"
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-700 focus:ring-slate-500 focus:border-slate-500"
              value={formatDateKey(currentDate)}
              onChange={handleDateChange}
              min={formatDateKey(START_DATE)}
              max={formatDateKey(END_DATE)}
              aria-label="Select date"
            />
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full bg-slate-200 text-slate-700 p-3 rounded-lg hover:bg-slate-300 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// IMPORTANT: This line is required to make the component visible in the project
export default App;



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

