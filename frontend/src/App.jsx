import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PrivateRoute from './routes/PrivateRoute';

/**
 * Nova Pay — Main App Router Architecture
 * 
 * Concept Explanation for Learning:
 * - `<Routes>` & `<Route>`: Maps browser URLs to specific Page Components (`/` -> LandingPage, `/login` -> LoginPage).
 * - `<PrivateRoute>`: Route Guard wrapper that ensures protected routes (`/dashboard`) require authentication.
 */
export default function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Pages (Day 5) */}
      <Route path="/login" element={<div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">Login Page (Coming in Day 5)</div>} />
      <Route path="/register" element={<div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">Register Page (Coming in Day 5)</div>} />

      {/* Protected App Pages (Day 6 - 9) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-white font-medium text-lg">
              Dashboard Page (Coming in Day 6)
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
