import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ExternalLink, ShieldCheck, PhoneCall, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      {/* Important Public Disclaimer Banner */}
      <div className="bg-orange-950/40 border-b border-orange-900/30 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-orange-200/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              <strong>Statutory Disclosure:</strong> CARbon Setu is an independent civic-tech open platform facilitating public discovery of government schemes. It is NOT affiliated with or endorsed by the Government of India or any State Government. Applications must be submitted through official government portals.
            </span>
          </div>
          <a
            href="https://india.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-orange-300 hover:text-white underline whitespace-nowrap"
          >
            <span>india.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-600 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white font-['Outfit']">
                CARbon <span className="text-orange-400">Setu</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bridging 1.4 billion citizens to life-transforming welfare schemes, educational subsidies, direct bank transfers, and health insurance.
            </p>
            <div className="text-xs text-slate-500">
              Zero bias • Free public service • Privacy protected
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Citizen Discovery
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/intake" className="hover:text-orange-400 transition-colors">
                  AI Eligibility Finder
                </Link>
              </li>
              <li>
                <Link to="/schemes?category=AGRICULTURE" className="hover:text-orange-400 transition-colors">
                  Farmers & Agriculture (PM-KISAN)
                </Link>
              </li>
              <li>
                <Link to="/schemes?category=EDUCATION" className="hover:text-orange-400 transition-colors">
                  Student Scholarships (NSP)
                </Link>
              </li>
              <li>
                <Link to="/schemes?category=HEALTHCARE" className="hover:text-orange-400 transition-colors">
                  Health & Medical (Ayushman Bharat)
                </Link>
              </li>
              <li>
                <Link to="/schemes?category=WOMEN_AND_CHILD" className="hover:text-orange-400 transition-colors">
                  Women & Child Welfare
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-orange-400 transition-colors">
                  Scheme Comparison Matrix
                </Link>
              </li>
              <li>
                <Link to="/rti" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  RTI & Appeal Assistant (Sec 6(1) & 19(1))
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Portals */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Official Portals
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/directory" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  Authority & Helpline Directory
                </Link>
              </li>
              <li>
                <a
                  href="https://www.myscheme.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-orange-400 transition-colors"
                >
                  <span>myScheme Portal</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://dbtbharat.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-orange-400 transition-colors"
                >
                  <span>DBT Bharat (Direct Benefit)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://scholarships.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-orange-400 transition-colors"
                >
                  <span>National Scholarship Portal</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://pmjay.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-orange-400 transition-colors"
                >
                  <span>PM-JAY Ayushman Bharat</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* National Helplines */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>National Helplines</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/50">
                <span className="block text-slate-200 font-medium">Kisan Call Centre</span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">1800-180-1551</span>
              </div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/50">
                <span className="block text-slate-200 font-medium">Ayushman Bharat Toll-free</span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">14555 / 1800-111-565</span>
              </div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/50">
                <span className="block text-slate-200 font-medium">National Cyber Crime</span>
                <span className="text-orange-400 font-mono text-sm font-semibold">1930</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 CARbon Setu. Dedicated to digital inclusion & citizen empowerment across Bharat.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Built with care for public good</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
