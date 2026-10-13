import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  CheckCircle2,
  Building2,
  Layers,
} from 'lucide-react';
import { recordsApi, RecordSearchParams } from '../api/client';
import { GovernmentRecord } from '../types';
import { SchemeCard } from '../components/SchemeCard';

export const SchemeCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [recordType, setRecordType] = useState(searchParams.get('type') || '');
  const [sort, setSort] = useState<'relevance' | 'recent' | 'verified'>('verified');
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState<GovernmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Array<{ category: string; count: number }>>([]);

  // Fetch categories on mount
  useEffect(() => {
    recordsApi.getCategories().then(res => {
      if (res.success) setAvailableCategories(res.data);
    });
  }, []);

  // Fetch records when filters change
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const params: RecordSearchParams = {
          q: query || undefined,
          category: category || undefined,
          state: state || undefined,
          recordType: recordType || undefined,
          sort,
          page,
          limit: 12,
        };
        const res = await recordsApi.search(params);
        if (res.success) {
          setRecords(res.data);
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      } catch (err) {
        console.error('Failed to search records', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [query, category, state, recordType, sort, page]);

  const handleClearFilters = () => {
    setQuery('');
    setCategory('');
    setState('');
    setRecordType('');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(query || category || state || recordType);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 font-['Outfit']">
          Government Schemes Directory
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Browse all verified central and state government benefits, scholarships, and welfare programs.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by scheme name, keywords, or department..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="w-full md:w-52">
            <select
              value={state}
              onChange={e => {
                setState(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Regions / Central</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Bihar">Bihar</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="West Bengal">West Bengal</option>
            </select>
          </div>

          {/* Record Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={recordType}
              onChange={e => {
                setRecordType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Benefit Types</option>
              <option value="SCHEME">Scheme</option>
              <option value="SUBSIDY">Direct Subsidy</option>
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="LOAN">Subsidized Loan</option>
              <option value="INSURANCE">Insurance Cover</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="w-full md:w-40">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="verified">Recently Verified</option>
              <option value="recent">Newest Listed</option>
              <option value="relevance">Relevance</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setCategory('');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              !category
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {[
            { key: 'AGRICULTURE', label: 'Agriculture' },
            { key: 'EDUCATION', label: 'Education' },
            { key: 'HEALTHCARE', label: 'Healthcare' },
            { key: 'HOUSING', label: 'Housing' },
            { key: 'WOMEN_AND_CHILD', label: 'Women & Child' },
            { key: 'FINANCIAL_SERVICES', label: 'Financial' },
            { key: 'BUSINESS_AND_ENTREPRENEURSHIP', label: 'MSME & Loans' },
            { key: 'SOCIAL_WELFARE', label: 'Social Welfare' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => {
                setCategory(category === c.key ? '' : c.key);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                category === c.key
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold ml-auto flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing {records.length} of {total} verified welfare schemes
        </span>
        {category && (
          <span className="font-semibold text-slate-700">
            Filtered by: {category.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map(record => (
            <SchemeCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">No schemes found matching criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting or resetting your category and location filters to see more results.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold text-xs shadow-sm hover:bg-orange-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm font-semibold text-slate-700 px-3">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
