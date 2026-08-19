import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import GraphDashboard from './components/GraphDashboard';

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<GraphDashboard />} />
          <Route path="/dashboard" element={<GraphDashboard />} />
          <Route path="/trip/:tripId" element={<GraphDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          className: "!bg-slate-900 !text-white !border !border-slate-800",
          style: { fontSize: "13px" },
        }}
      />
    </div>
  );
};

export default App;