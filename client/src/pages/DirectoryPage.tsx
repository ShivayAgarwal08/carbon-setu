import React, { useState } from 'react';
import {
  Building2,
  PhoneCall,
  ExternalLink,
  Search,
  ShieldCheck,
  MapPin,
  Globe,
  Copy,
  CheckCircle2,
  FileQuestion,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DirectoryAuthority {
  id: string;
  name: string;
  shortName: string;
  category: string;
  portalUrl: string;
  helpline: string;
  address: string;
  description: string;
  lastVerified: string;
}

export const VERIFIED_AUTHORITIES_DIRECTORY: DirectoryAuthority[] = [
  {
    id: 'moa-fw',
    name: 'Ministry of Agriculture & Farmers Welfare',
    shortName: 'MoA&FW',
    category: 'AGRICULTURE',
    portalUrl: 'https://agricoop.gov.in',
    helpline: '1800-180-1551 (Kisan Call Centre, Toll Free)',
    address: 'Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    description: 'Nodal ministry for PM-Kisan Samman Nidhi, PM Fasal Bima Yojana (PMFBY), and Soil Health Card scheme.',
    lastVerified: 'October 2026',
  },
  {
    id: 'mohf-w',
    name: 'Ministry of Health & Family Welfare / National Health Authority',
    shortName: 'MoHFW / NHA',
    category: 'HEALTHCARE',
    portalUrl: 'https://pmjay.gov.in',
    helpline: '14555 / 1800-111-565 (Ayushman Bharat Helpline)',
    address: '3rd Floor, Tower-l, Jeevan Bharati Building, Connaught Place, New Delhi - 110001',
    description: 'Administering Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY) and Ayushman Bharat Digital Mission (ABHA).',
    lastVerified: 'October 2026',
  },
  {
    id: 'mosj-e',
    name: 'Ministry of Social Justice and Empowerment',
    shortName: 'MoSJE',
    category: 'SOCIAL_JUSTICE',
    portalUrl: 'https://socialjustice.gov.in',
    helpline: '14566 (National Helpline for Senior Citizens - Elderline)',
    address: 'Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    description: 'Administers Post-Matric Scholarships for SC/OBC, PM-DAKSH, and national senior citizen welfare funds.',
    lastVerified: 'October 2026',
  },
  {
    id: 'dfpd',
    name: 'Department of Food & Public Distribution',
    shortName: 'NFSA / PDS',
    category: 'FOOD_AND_RATION',
    portalUrl: 'https://nfsa.gov.in',
    helpline: '1967 (National Food Security & Ration Card Helpline)',
    address: 'Krishi Bhawan, New Delhi - 110001',
    description: 'Manages One Nation One Ration Card (ONORC), Pradhan Mantri Garib Kalyan Anna Yojana (PMGKAY), and targeted PDS distribution.',
    lastVerified: 'October 2026',
  },
  {
    id: 'dop-ip',
    name: 'Department of Posts (India Post)',
    shortName: 'India Post',
    category: 'SAVINGS_AND_FINANCE',
    portalUrl: 'https://indiapost.gov.in',
    helpline: '1800-266-6868 (Toll Free)',
    address: 'Dak Bhawan, Sansad Marg, New Delhi - 110001',
    description: 'Savings accounts, Sukanya Samriddhi Yojana (SSY), Post Office Monthly Income Scheme, and IPPB Direct Benefit Transfers.',
    lastVerified: 'October 2026',
  },
  {
    id: 'moe-nsp',
    name: 'National Scholarship Portal (Ministry of Education)',
    shortName: 'NSP Portal',
    category: 'EDUCATION',
    portalUrl: 'https://scholarships.gov.in',
    helpline: '0120-6619540 (NSP Technical Support)',
    address: 'National Informatics Centre (NIC), CGO Complex, Lodhi Road, New Delhi - 110003',
    description: 'Single unified national portal for pre-matric, post-matric, merit-cum-means, and higher education government scholarships.',
    lastVerified: 'October 2026',
  },
  {
    id: 'dopt-rti',
    name: 'Central Information Commission & RTI Online',
    shortName: 'CIC / RTI Online',
    category: 'GRIEVANCES_AND_RTI',
    portalUrl: 'https://rtionline.gov.in',
    helpline: '011-26183996 / 011-26183997 (Central Information Commission)',
    address: 'CIC Bhawan, Baba Gangnath Marg, Munirka, New Delhi - 110067',
    description: 'Official central public portal to file Right to Information applications and First Appeals under RTI Act 2005.',
    lastVerified: 'October 2026',
  },
  {
    id: 'darpg-cpgrams',
    name: 'CPGRAMS — Central Public Grievance Redressal and Monitoring System',
    shortName: 'DARPG',
    category: 'GRIEVANCES_AND_RTI',
    portalUrl: 'https://pgportal.gov.in',
    helpline: '1800-11-2246 (Toll Free Grievance Helpline)',
    address: 'Department of Administrative Reforms and Public Grievances, Sardar Patel Bhawan, New Delhi - 110001',
    description: 'Apex portal to file official grievances against government service delivery delays, unpaid subsidies, or department inaction.',
    lastVerified: 'October 2026',
  },
];

export const DirectoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Portals' },
    { id: 'AGRICULTURE', label: 'Agriculture & Farming' },
    { id: 'HEALTHCARE', label: 'Healthcare & AB-PMJAY' },
    { id: 'FOOD_AND_RATION', label: 'Ration & Food Security' },
    { id: 'EDUCATION', label: 'Education & Scholarships' },
    { id: 'SAVINGS_AND_FINANCE', label: 'Finance & Post Office' },
    { id: 'GRIEVANCES_AND_RTI', label: 'RTI & Grievances' },
  ];

  const filtered = VERIFIED_AUTHORITIES_DIRECTORY.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.helpline.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopyHelpline = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Official Government Directory</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-['Outfit']">
            Public Authorities & <span className="text-emerald-400">Application Portals</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Direct, verified access to official central and state government ministries, national helplines, application portals, and grievance resolution channels. All links are strictly verified against official <strong>.gov.in</strong> and <strong>.nic.in</strong> domains.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search ministry, portal, or helpline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Authorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {item.shortName}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified: {item.lastVerified}</span>
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 font-['Outfit']">{item.name}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

              {/* Contact info list */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                {/* Helpline */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium font-mono text-[11px]">{item.helpline}</span>
                  </div>
                  <button
                    onClick={() => handleCopyHelpline(item.id, item.helpline)}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                    title="Copy helpline number"
                  >
                    {copiedId === item.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Physical Address */}
                <div className="flex items-start gap-2 text-slate-500 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{item.address}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Link
                to={`/schemes?category=${item.category}`}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <span>View Schemes</span>
              </Link>

              <a
                href={item.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
