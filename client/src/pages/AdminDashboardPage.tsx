import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare,
  FileCheck,
  Search,
  RefreshCw,
  X,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi, recordsApi } from '../api/client';
import { AdminStats, FeedbackReport, GovernmentRecord } from '../types';
import { CategoryBadge } from '../components/EligibilityBadge';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'schemes' | 'feedback' | 'audit'>('schemes');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New scheme modal state
  const [isNewSchemeModalOpen, setIsNewSchemeModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'AGRICULTURE',
    recordType: 'SCHEME',
    shortDescription: '',
    detailedDescription: '',
    benefits: '',
    officialUrl: '',
    geographicScope: 'national',
  });
  const [submittingScheme, setSubmittingScheme] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, recordsRes, feedbackRes, auditRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRecords({ limit: 50 }),
        adminApi.getFeedback(),
        adminApi.getAuditLogs(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (recordsRes.success) setRecords(recordsRes.data);
      if (feedbackRes.success) setFeedback(feedbackRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this government scheme?')) return;
    try {
      await adminApi.deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      if (stats) setStats({ ...stats, totalRecords: stats.totalRecords - 1 });
    } catch (err) {
      alert('Failed to delete scheme.');
    }
  };

  const handleResolveFeedback = async (id: string) => {
    try {
      await adminApi.updateFeedbackStatus(id, 'resolved', 'Verified and resolved by administrator');
      setFeedback(prev =>
        prev.map(f => (f.id === id ? { ...f, status: 'resolved' } : f))
      );
    } catch (err) {
      alert('Failed to update feedback status');
    }
  };

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingScheme(true);
    try {
      const payload = {
        ...formData,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        beneficiaries: ['Citizens', 'Target Group'],
        stateScope: formData.geographicScope === 'national' ? [] : ['Uttar Pradesh'],
      };
      const res = await adminApi.createRecord(payload);
      if (res.success) {
        setIsNewSchemeModalOpen(false);
        setFormData({
          title: '',
          slug: '',
          category: 'AGRICULTURE',
          recordType: 'SCHEME',
          shortDescription: '',
          detailedDescription: '',
          benefits: '',
          officialUrl: '',
          geographicScope: 'national',
        });
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create scheme');
    } finally {
      setSubmittingScheme(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">
              CARbon Setu Administrative Operations
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Maintain verified public schemes, review citizen discrepancy reports, and audit changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNewSchemeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Scheme</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Cataloged
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit']">
                {stats.totalRecords}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {stats.publishedRecords} Published
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Registered Citizens
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit']">
                {stats.totalUsers}
              </span>
              <span className="text-xs text-slate-500 font-medium">Verified Accounts</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              AI Consultations
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit']">
                {stats.totalSessions}
              </span>
              <span className="text-xs text-orange-600 font-semibold">Intake Sessions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Discrepancy Reports
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit']">
                {stats.pendingFeedback}
              </span>
              <span className="text-xs text-amber-600 font-semibold">Pending Review</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('schemes')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'schemes'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Schemes Directory ({records.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'feedback'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Citizen Feedback</span>
          {stats && stats.pendingFeedback > 0 && (
            <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {stats.pendingFeedback}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit History ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Schemes Management Table */}
      {activeTab === 'schemes' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Scheme Title</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/schemes/${rec.slug}`}
                        className="font-bold text-slate-900 hover:text-orange-600 line-clamp-1"
                      >
                        {rec.title}
                      </Link>
                      <span className="text-[11px] text-slate-400 font-mono">
                        slug: /{rec.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <CategoryBadge category={rec.category} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {rec.department?.name || 'Central Ministry'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        to={`/schemes/${rec.slug}`}
                        className="p-1 text-slate-500 hover:text-slate-800"
                        title="View Public Dossier"
                      >
                        <ExternalLink className="w-4 h-4 inline" />
                      </Link>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete Scheme"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Feedback & Citizen Reports */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {feedback.length > 0 ? (
            feedback.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {item.issueType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      Reported on {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'resolved' ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveFeedback(item.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No pending citizen reports or discrepancies.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">
            System Administrative Logs
          </div>
          <div className="divide-y divide-slate-100">
            {auditLogs.length > 0 ? (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 uppercase tracking-wide">
                      {log.action}
                    </span>
                    <span className="text-slate-500 ml-2">by {log.admin?.name || 'System Admin'}</span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">No audit records yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Create Scheme Modal */}
      {isNewSchemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg font-['Outfit']">
                Publish New Government Scheme
              </h3>
              <button
                onClick={() => setIsNewSchemeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScheme} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Scheme Official Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Pradhan Mantri Kisan Samman Nidhi"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="EDUCATION">Education</option>
                    <option value="HEALTHCARE">Healthcare</option>
                    <option value="HOUSING">Housing</option>
                    <option value="WOMEN_AND_CHILD">Women & Child</option>
                    <option value="BUSINESS_AND_ENTREPRENEURSHIP">MSME & Business</option>
                    <option value="SOCIAL_WELFARE">Social Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Benefit Type
                  </label>
                  <select
                    value={formData.recordType}
                    onChange={e => setFormData({ ...formData, recordType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="SCHEME">Scheme</option>
                    <option value="SUBSIDY">Direct Subsidy</option>
                    <option value="SCHOLARSHIP">Scholarship</option>
                    <option value="LOAN">Subsidized Loan</option>
                    <option value="INSURANCE">Insurance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Primary Benefit (₹ Amount or Guarantee)
                </label>
                <input
                  type="text"
                  required
                  value={formData.benefits}
                  onChange={e => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="e.g. ₹6,000 per year directly to bank account in 3 installments"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.shortDescription}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Summary of objectives for the scheme card..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Official Portal URL
                </label>
                <input
                  type="url"
                  value={formData.officialUrl}
                  onChange={e => setFormData({ ...formData, officialUrl: e.target.value })}
                  placeholder="https://pmkisan.gov.in"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSchemeModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingScheme}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-sm"
                >
                  {submittingScheme ? 'Publishing...' : 'Publish Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
