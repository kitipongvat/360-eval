import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SetupPin from './pages/SetupPin';
import EvalList from './pages/EvalList';
import EvalForm from './pages/EvalForm';
import Success from './pages/Success';
import Admin from './pages/Admin';

// ─── Auth Context ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('employee');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const login = (employee, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('employee', JSON.stringify(employee));
    setUser(employee);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('employee');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.isAdmin ? children : <Navigate to="/" replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 font-thai">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/setup-pin" element={<SetupPin />} />
            <Route path="/eval" element={<PrivateRoute><EvalList /></PrivateRoute>} />
            <Route path="/eval/:id" element={<PrivateRoute><EvalForm /></PrivateRoute>} />
            <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
