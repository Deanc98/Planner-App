import React from 'react';
import ReactDOM from 'react-dom/client';
// CRITICAL: Importing the final component name
import PlannerComponent from './Planner.jsx'; 

// This is a minimal substitute for the required Tailwind CSS setup
const style = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  body { font-family: 'Inter', sans-serif; }
`;

// Add minimal CSS and render the App component
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <style>{style}</style>
      <PlannerComponent />
    </React.StrictMode>
  );
}
