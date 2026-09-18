import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

export function App() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-gray-900">Rust SQLite + React CRUD</h1>
      <p className="mt-2 text-gray-600">Frontend scaffold initialized.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
