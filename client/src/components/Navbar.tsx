import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Bookmark,
  User,
  Shield,
  Menu,
  X,
  LogOut,
  Layers,
  Search,
  Languages,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useLanguage } from '../context/LanguageContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedRecords } = useCompare();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
      {/* Top micro banner for GoI Disclaimer & National Helpline */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span>{t('nav.tagline')}</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">{t('nav.disclaimer')}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-orange-400 font-medium">{t('nav.helpline')}</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-['Outfit']">
                  CARbon <span className="text-orange-600">Setu</span>
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-800 font-medium font-hindi">
                  कार्बन सेतु
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5">
                {language === 'hi' ? 'नागरिक कल्याण सेवा सेतु' : 'Citizen Benefits Discovery Platform'}
              </p>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/intake"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/intake')
                  ? 'bg-orange-50 text-orange-700 font-semibold'
                  : 'text-slate-700 hover:text-orange-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>{t('nav.benefitFinder')}</span>
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider font-bold">
                {t('nav.smartBadge')}
              </span>
            </Link>

            <Link
              to="/schemes"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/schemes')
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>{t('nav.browseSchemes')}</span>
            </Link>

            <Link
              to="/compare"
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/compare')
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>{t('nav.compare')}</span>
              {selectedRecords.length > 0 && (
                <span className="w-5 h-5 bg-orange-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {selectedRecords.length}
                </span>
              )}
            </Link>

            <Link
              to="/rti"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/rti')
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-600" />
              <span>{language === 'hi' ? 'आरटीआई ड्राफ्ट' : 'RTI Assistant'}</span>
            </Link>

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.admin')}</span>
              </Link>
            )}
          </nav>

          {/* User, Auth & Language Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 bg-slate-50 hover:bg-orange-50/50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title={language === 'en' ? 'हिंदी में बदलें (Switch to Hindi)' : 'Switch to English'}
            >
              <Languages className="w-3.5 h-3.5 text-orange-600" />
              <span className="font-hindi">{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  {user.role === 'ADMIN' && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                      ADMIN
                    </span>
                  )}
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Citizen Profile</span>
                    </Link>
                    <Link
                      to="/profile#saved"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Bookmark className="w-4 h-4 text-slate-500" />
                      <span>Saved Schemes</span>
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth?mode=login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm transition-all shadow-orange-600/20 hover:shadow-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Language / भाषा</span>
            <button
              onClick={() => {
                toggleLanguage();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-xs font-bold text-orange-800"
            >
              <Languages className="w-3.5 h-3.5 text-orange-600" />
              <span>{language === 'en' ? 'हिंदी में पढ़ें' : 'Switch to English'}</span>
            </button>
          </div>

          <Link
            to="/intake"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-orange-700 bg-orange-50"
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>{t('nav.benefitFinder')}</span>
          </Link>
          <Link
            to="/schemes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>{t('nav.browseSchemes')}</span>
          </Link>
          <Link
            to="/compare"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>{t('nav.compare')}</span>
            </div>
            {selectedRecords.length > 0 && (
              <span className="w-5 h-5 bg-orange-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {selectedRecords.length}
              </span>
            )}
          </Link>
          <Link
            to="/rti"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-900 bg-amber-50"
          >
            <Scale className="w-4 h-4 text-amber-600" />
            <span>{language === 'hi' ? 'सूचना का अधिकार (RTI)' : 'RTI Assistant'}</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-800 bg-emerald-50"
            >
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>{t('nav.admin')}</span>
            </Link>
          )}

          <div className="border-t border-slate-100 pt-3">
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{user.name} (My Profile)</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/auth?mode=login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700"
                >
                  Log In
                </Link>
                <Link
                  to="/auth?mode=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
