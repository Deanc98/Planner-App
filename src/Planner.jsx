    import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2 } from 'lucide-react';

// --- CONFIGURATION ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START_DATE = new Date();
START_DATE.setHours(0, 0, 0, 0); // Normalize to start of today

const END_DATE = new Date(START_DATE);
END_DATE.setFullYear(START_DATE.getFullYear() + 1);

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

// --- DATA MANAGEMENT (LOCAL STORAGE) ---
const loadNotes = (dateKey) => {
  const data = localStorage.getItem(dateKey);
  return data ? JSON.parse(data) : [];
};

const saveNotes = (dateKey, notes) => {
  localStorage.setItem(dateKey, JSON.stringify(notes));
};


// --- MAIN APPLICATION COMPONENT ---
function PlannerComponent() {
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false); 

  const currentDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);
  
  useEffect(() => {
    setNotes(loadNotes(currentDateKey));
  }, [currentDateKey]);

  // --- NAVIGATION LOGIC ---

  const navigateDate = useCallback((direction) => {
    const newTime = currentDate.getTime() + direction * MS_PER_DAY;
    const newDate = new Date(newTime);
    setCurrentDate(newDate); 
  }, [currentDate]);

  const handleSwipe = (direction) => {
    navigateDate(direction);
  };

  const handleDateChange = (event) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    setCurrentDate(selectedDate); 
    setShowModal(false);
  };

  // --- WEEKLY VIEW LOGIC ---

  const weeklyNotes = useMemo(() => {
    const weekStart = new Date(currentDate);
    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * MS_PER_DAY);
      const dateKey = formatDateKey(date);
      const displayDate = formatDisplayDate(date);
      const notesForDay = loadNotes(dateKey);

      weekData.push({
        date: displayDate,
        notes: notesForDay,
        isCurrent: dateKey === currentDateKey,
      });
    }
    return weekData;
  }, [currentDate, currentDateKey]); 

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
          <div className="flex space-x-3">
            {/* WEEKLY BUTTON */}
            <button
              onClick={() => setShowWeeklyModal(true)}
              className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition text-sm font-medium"
              aria-label="View Weekly Overview"
            >
              View Week
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 rounded-full hover:bg-slate-600 transition"
              aria-label="Jump to Date"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>

        {/* Date Navigation & Display */}
        <div 
          className="p-4 flex items-center justify-between text-slate-800 border-b border-slate-100"
          onTouchStart={(e) => this.touchStartX = e.touches[0].clientX}
          onTouchEnd={(e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { 
              handleSwipe(diff > 0 ? 1 : -1);
            }
          }}
        >
          {/* Left Button */}
          <button 
            onClick={() => navigateDate(-1)} 
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
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
      
      {/* MODAL 1: Jump to Date */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Jump to Date</h3>
            <input
              type="date"
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-700 focus:ring-slate-500 focus:border-slate-500"
              value={formatDateKey(currentDate)}
              onChange={handleDateChange}
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

      {/* MODAL 2: Weekly Overview */}
      {showWeeklyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-700 mb-4 border-b pb-2">Weekly Overview (7 Days Starting {formatDisplayDate(currentDate)})</h3>
            
            <div className="divide-y divide-slate-100">
              {weeklyNotes.map((day, index) => (
                <div key={index} className="py-3">
                  <h4 className={`text-lg font-semibold ${day.isCurrent ? 'text-slate-700' : 'text-slate-500'}`}>
                    {day.date}
                  </h4>
                  {day.notes.length === 0 ? (
                    <p className="text-sm text-slate-400 italic mt-1 ml-4">— No notes recorded.</p>
                  ) : (
                    <ul className="list-disc list-inside mt-1 ml-4 space-y-1">
                      {day.notes.map((note) => (
                        <li key={note.id} className="text-sm text-slate-600 break-words">
                          {note.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWeeklyModal(false)}
              className="mt-6 w-full bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-600 transition font-medium"
            >
              Close Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// IMPORTANT: This line is required to make the component visible in the project
export default PlannerComponent;

