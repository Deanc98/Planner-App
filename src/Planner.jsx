import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2 } from 'lucide-react';

// --- CONFIGURATION ---
// Set the application's base time frame
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
// Functions to load and save data directly to the user's browser

const loadNotes = (dateKey) => {
  // Retrieve data using the unique date key
  const data = localStorage.getItem(dateKey);
  return data ? JSON.parse(data) : [];
};

const saveNotes = (dateKey, notes) => {
  // Store the notes array as a JSON string
  localStorage.setItem(dateKey, JSON.stringify(notes));
};


// --- MAIN APPLICATION COMPONENT (The code starts here) ---
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
    
    // Check bounds (prevents navigating outside the defined year range)
    if (newDate.getTime() < START_DATE.getTime() || newDate.getTime() > END_DATE.getTime()) {
      return; 
    }
    
    setCurrentDate(newDate);
  }, [currentDate, START_DATE, END_DATE]);

  const handleSwipe = (direction) => {
    navigateDate(direction);
  };

  const handleDateChange = (event) => {
    // Parse the date from the input value (e.g., "2025-11-17")
    const [year, month, day] = event.target.value.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // Month is 0-indexed
    
    // Check bounds before setting the date
    if (selectedDate.getTime() >= START_DATE.getTime() && selectedDate.getTime() <= END_DATE.getTime()) {
        setCurrentDate(selectedDate);
    }
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

