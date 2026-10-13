import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Layers, ArrowRight, Trash2 } from 'lucide-react';
import { useCompare } from '../context/CompareContext';

export const CompareDrawer: React.FC = () => {
  const { selectedRecords, removeRecord, clearCompare, isDrawerOpen, setDrawerOpen } = useCompare();
  const navigate = useNavigate();

  if (!isDrawerOpen || selectedRecords.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-300 shadow-2xl animate-in slide-in-from-bottom duration-200">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Header & count */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Compare Schemes ({selectedRecords.length}/3)
              </p>
              <p className="text-xs text-slate-500">
                Compare benefits, eligibility rules, and required documents side by side
              </p>
            </div>
          </div>

          {/* Scheme Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedRecords.map(scheme => (
              <div
                key={scheme.id}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
              >
                <span className="font-medium max-w-[150px] truncate">{scheme.title}</span>
                <button
                  onClick={() => removeRecord(scheme.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Remove scheme"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearCompare}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              title="Clear all schemes"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDrawerOpen(false);
                navigate('/compare');
              }}
              disabled={selectedRecords.length < 2}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all"
            >
              <span>Compare Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
