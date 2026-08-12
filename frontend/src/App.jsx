import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PrivateRoute from './routes/PrivateRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">Login Page</div>} />
      <Route path="/register" element={<div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">Register Page</div>} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">
              Dashboard Page
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
