import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CompareDrawer } from './components/CompareDrawer';

import { HomePage } from './pages/HomePage';
import { IntakePage } from './pages/IntakePage';
import { SchemeCatalogPage } from './pages/SchemeCatalogPage';
import { SchemeDetailPage } from './pages/SchemeDetailPage';
import { ComparePage } from './pages/ComparePage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompareProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-200 selection:text-orange-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/intake" element={<IntakePage />} />
                <Route path="/schemes" element={<SchemeCatalogPage />} />
                <Route path="/schemes/:slug" element={<SchemeDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <CompareDrawer />
            <Footer />
          </div>
        </BrowserRouter>
      </CompareProvider>
    </AuthProvider>
  );
};

export default App;
