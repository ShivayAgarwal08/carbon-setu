import { PrismaClient, RecordType, RecordCategory, PublicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CARbon Setu database...');

  // ── Admin User Creation ─────────────────────────────────────────────
  const skipUserSeed = process.env.SKIP_USER_SEED === 'true' || process.env.NODE_ENV === 'production';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@carbonsetu.in';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (skipUserSeed) {
    console.log('🛡️  SKIP_USER_SEED is active: Skipping default admin & demo user creation for cloud database.');
  } else if (!adminPassword) {
    console.log('ℹ️  No ADMIN_PASSWORD supplied; skipping admin creation to avoid insecure defaults.');
  } else {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'CARbon Setu Admin',
          role: 'ADMIN',
          profile: { create: {} },
        },
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }
  }

  // ── Create Departments ──────────────────────────────────────────────
  const departments = [
    {
      name: 'Ministry of Agriculture & Farmers Welfare',
      shortName: 'MoAFW',
      description: 'Central ministry responsible for agriculture policy, crop insurance, farmer welfare, and agricultural development.',
      website: 'https://agricoop.nic.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '1800-180-1551', description: 'Kisan Call Centre (Toll Free)', isVerified: true },
        { contactType: 'website', value: 'https://agricoop.nic.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Education',
      shortName: 'MoE',
      description: 'Central ministry responsible for education policy, scholarships, and educational development.',
      website: 'https://www.education.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '1800-111-001', description: 'National Scholarship Portal Helpline', isVerified: true },
        { contactType: 'website', value: 'https://www.education.gov.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Health & Family Welfare',
      shortName: 'MoHFW',
      description: 'Central ministry responsible for health policy, public health programs, and healthcare services.',
      website: 'https://www.mohfw.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '14555', description: 'Ayushman Bharat Helpline', isVerified: true },
        { contactType: 'website', value: 'https://www.mohfw.gov.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Women & Child Development',
      shortName: 'MoWCD',
      description: 'Central ministry responsible for women empowerment, child development, and related welfare programs.',
      website: 'https://wcd.nic.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '181', description: 'Women Helpline (All India)', isVerified: true },
        { contactType: 'website', value: 'https://wcd.nic.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Micro, Small & Medium Enterprises',
      shortName: 'MoMSME',
      description: 'Central ministry responsible for MSME policy, subsidies, and enterprise development.',
      website: 'https://msme.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '1800-11-1955', description: 'MSME Toll Free Helpline', isVerified: true },
        { contactType: 'website', value: 'https://msme.gov.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Finance - Department of Posts',
      shortName: 'DoP',
      description: 'Department managing India Post services including small savings schemes, postal banking, and financial services.',
      website: 'https://www.indiapost.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '1800-266-6868', description: 'India Post Helpline (Toll Free)', isVerified: true },
        { contactType: 'website', value: 'https://www.indiapost.gov.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Ministry of Labour & Employment',
      shortName: 'MoLE',
      description: 'Central ministry responsible for labour welfare, pensions, social security, and employment programs.',
      website: 'https://labour.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'helpline', value: '14434', description: 'Shram Suvidha Helpline', isVerified: true },
        { contactType: 'website', value: 'https://labour.gov.in/', description: 'Official Website', isVerified: true },
      ],
    },
    {
      name: 'Department of Administrative Reforms & Public Grievances',
      shortName: 'DARPG',
      description: 'Department handling public grievances and administrative reforms across government.',
      website: 'https://pgportal.gov.in/',
      level: 'central',
      contacts: [
        { contactType: 'website', value: 'https://pgportal.gov.in/', description: 'Centralized Public Grievance Redress and Monitoring System (CPGRAMS)', isVerified: true },
      ],
    },
  ];

  const deptMap: Record<string, string> = {};
  for (const dept of departments) {
    const { contacts, ...deptData } = dept;
    const existing = await prisma.governmentDepartment.findUnique({ where: { name: dept.name } });
    if (existing) {
      deptMap[dept.shortName!] = existing.id;
      continue;
    }
    const created = await prisma.governmentDepartment.create({
      data: {
        ...deptData,
        contacts: { create: contacts },
      },
    });
    deptMap[dept.shortName!] = created.id;
  }
  console.log(`✅ ${departments.length} departments seeded`);

  // ── Create Source Registry ──────────────────────────────────────────
  const sourceRegistries = [
    { name: 'National Portal of India', baseUrl: 'https://www.india.gov.in', description: 'Official portal of the Government of India' },
    { name: 'MyScheme', baseUrl: 'https://www.myscheme.gov.in', description: 'Government scheme discovery portal' },
    { name: 'PMFBY Portal', baseUrl: 'https://pmfby.gov.in', description: 'Pradhan Mantri Fasal Bima Yojana portal' },
    { name: 'National Scholarship Portal', baseUrl: 'https://scholarships.gov.in', description: 'Central scholarship portal' },
    { name: 'India Post', baseUrl: 'https://www.indiapost.gov.in', description: 'India Post official portal' },
    { name: 'Ayushman Bharat', baseUrl: 'https://pmjay.gov.in', description: 'Ayushman Bharat PM-JAY portal' },
  ];

  for (const sr of sourceRegistries) {
    const existing = await prisma.sourceRegistry.findUnique({ where: { baseUrl: sr.baseUrl } });
    if (!existing) {
      await prisma.sourceRegistry.create({ data: sr });
    }
  }
  console.log(`✅ ${sourceRegistries.length} source registries seeded`);

  // ── Government Records ─────────────────────────────────────────────
  // Each record is based on genuine Indian government schemes with verified details
  const records = [
    {
      title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      slug: 'pmfby-crop-insurance',
      recordType: 'INSURANCE' as RecordType,
      category: 'AGRICULTURE' as RecordCategory,
      shortDescription: 'Government crop insurance scheme providing financial support to farmers suffering crop loss due to natural calamities, pests, and diseases.',
      detailedDescription: 'Pradhan Mantri Fasal Bima Yojana (PMFBY) is a government-sponsored crop insurance scheme launched in 2016. It aims to provide insurance coverage and financial support to farmers in the event of failure of notified crops as a result of natural calamities, pests, and diseases. The scheme is administered by the Ministry of Agriculture & Farmers Welfare. Farmers pay a nominal premium and the remaining premium is shared between State and Central Government. The scheme covers all Food & Oilseed crops and Annual Commercial/Horticultural crops for which past yield data is available.',
      beneficiaries: ['farmer', 'agricultural_worker'],
      stateScope: [], // National
      geographicScope: 'national',
      eligibilityDetails: 'All farmers growing notified crops in notified areas are eligible. Both loanee and non-loanee farmers can participate. Sharecroppers and tenant farmers are also eligible provided they have insurable interest in the crop.',
      benefits: 'Insurance coverage for crop loss due to natural calamities. Low premium rates: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops. Claims are settled directly to farmer bank accounts.',
      requiredDocuments: ['Aadhaar card', 'Land records / Tenancy agreement', 'Bank account details', 'Sowing certificate from local authority'],
      applicationProcess: 'Apply through nearest bank branch, Common Service Centre (CSC), or authorized insurance company. Online application available through PMFBY portal. Loanee farmers are automatically covered if they have crop loans.',
      officialUrl: 'https://pmfby.gov.in/',
      applicationUrl: 'https://pmfby.gov.in/farmerRegistrationForm',
      departmentId: deptMap['MoAFW'],
      sourceUrl: 'https://pmfby.gov.in/aboutPage',
      sourceExcerpt: 'PMFBY provides comprehensive insurance coverage against failure of crop thus helping in stabilizing the income of farmers.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-12-01'),
      lastCheckedAt: new Date('2024-12-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      knownLimitations: 'Coverage limited to notified crops in notified areas. Claim settlement timelines can vary by state and season.',
      eligibilityRules: [
        { fieldName: 'category', operator: 'in', value: '["farmer","agricultural_worker"]', description: 'Must be a farmer or agricultural worker', isRequired: true },
      ],
    },
    {
      title: 'PM Kisan Samman Nidhi (PM-KISAN)',
      slug: 'pm-kisan-samman-nidhi',
      recordType: 'SCHEME' as RecordType,
      category: 'AGRICULTURE' as RecordCategory,
      shortDescription: 'Income support scheme providing ₹6,000 per year in three equal installments to eligible farmer families.',
      detailedDescription: 'Pradhan Mantri Kisan Samman Nidhi is a central sector scheme providing income support of ₹6,000 per year to all landholding farmer families across the country. The amount is paid in three equal installments of ₹2,000 each, directly transferred to the bank accounts of beneficiaries. The scheme was launched in February 2019 and aims to supplement the financial needs of small and marginal farmers.',
      beneficiaries: ['farmer', 'small_farmer', 'marginal_farmer'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'All landholding farmer families (subject to certain exclusion criteria). Exclusions include: institutional landholders, farmer families with any member who is a former/present minister, MP, MLA, or holds constitutional position, professionals like doctors, engineers, lawyers, CAs who are registered with professional bodies, or retired pensioners with monthly pension above ₹10,000.',
      benefits: '₹6,000 per year in 3 installments of ₹2,000 each. Amount directly transferred to bank account via DBT (Direct Benefit Transfer).',
      requiredDocuments: ['Aadhaar card', 'Land ownership records', 'Bank account linked with Aadhaar'],
      applicationProcess: 'Register through the PM-KISAN portal or visit the local Patwari / Revenue officer / Common Service Centre (CSC). Self-registration is available on the PM-KISAN website.',
      officialUrl: 'https://pmkisan.gov.in/',
      applicationUrl: 'https://pmkisan.gov.in/RegistrationForm.aspx',
      departmentId: deptMap['MoAFW'],
      sourceUrl: 'https://pmkisan.gov.in/',
      sourceExcerpt: 'PM-KISAN is a Central Sector scheme with 100% funding from Government of India providing income support to all landholding farmer families.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-11-15'),
      lastCheckedAt: new Date('2024-11-15'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'category', operator: 'in', value: '["farmer","small_farmer","marginal_farmer"]', description: 'Must be a landholding farmer', isRequired: true },
      ],
    },
    {
      title: 'Post-Matric Scholarship for SC Students',
      slug: 'post-matric-scholarship-sc',
      recordType: 'SCHOLARSHIP' as RecordType,
      category: 'EDUCATION' as RecordCategory,
      shortDescription: 'Central government scholarship for Scheduled Caste (SC) students pursuing post-matriculation education.',
      detailedDescription: 'The Post-Matric Scholarship for SC Students is a centrally sponsored scheme that provides financial assistance to Scheduled Caste students studying at post-matriculation or post-secondary level. The scholarship covers maintenance allowance, non-refundable fees, study tour charges, thesis typing/printing charges, and book allowance. The scheme aims to increase gross enrollment ratio of SC category students in higher education.',
      beneficiaries: ['student', 'sc_category'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'The applicant must belong to Scheduled Caste (SC) category. Must be studying in a recognized institution in a post-matriculation or post-secondary course. Annual family income should not exceed ₹2.5 lakh. The student must not be receiving any other scholarship for the same purpose.',
      benefits: 'Covers: maintenance allowance, non-refundable compulsory fees, study tour charges, thesis typing/printing. Amount varies by course level and day scholar/hosteller status.',
      requiredDocuments: ['Caste certificate (SC)', 'Income certificate', 'Previous year mark sheet', 'Fee receipt', 'Bank account details', 'Aadhaar card'],
      applicationProcess: 'Apply through the National Scholarship Portal (NSP). The application window typically opens annually. Apply through respective state government scholarship portal if directed.',
      officialUrl: 'https://scholarships.gov.in/',
      departmentId: deptMap['MoE'],
      sourceUrl: 'https://scholarships.gov.in/',
      sourceExcerpt: 'Post-Matric Scholarship for SC Students provides financial support for higher education.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-10-01'),
      lastCheckedAt: new Date('2024-10-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'category', operator: 'eq', value: 'student', description: 'Must be a student', isRequired: true },
        { fieldName: 'income', operator: 'lte', value: '250000', description: 'Annual family income should not exceed ₹2.5 lakh', isRequired: true },
      ],
    },
    {
      title: 'Ayushman Bharat PM-JAY (Pradhan Mantri Jan Arogya Yojana)',
      slug: 'ayushman-bharat-pmjay',
      recordType: 'INSURANCE' as RecordType,
      category: 'HEALTHCARE' as RecordCategory,
      shortDescription: "World's largest government health insurance scheme providing ₹5 lakh coverage per family per year for secondary and tertiary hospitalization.",
      detailedDescription: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY) provides health insurance coverage of up to ₹5 lakh per family per year for secondary and tertiary care hospitalization. The scheme targets approximately 55 crore beneficiaries from economically vulnerable families. It covers pre and post hospitalization expenses, day care surgeries, and over 1,900 treatment procedures. The scheme is cashless and paperless at point of service.',
      beneficiaries: ['general', 'bpl_family', 'economically_vulnerable'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Families identified based on deprivation and occupational criteria in SECC 2011 database. No restrictions on family size, age, or gender. Beneficiary families are pre-identified. Check eligibility on the PM-JAY portal or by calling the helpline.',
      benefits: 'Up to ₹5 lakh per family per year. Covers 1,900+ treatment procedures. Cashless and paperless at empanelled hospitals. Covers pre-hospitalization (3 days) and post-hospitalization (15 days) expenses.',
      requiredDocuments: ['Aadhaar card or eligible alternative ID', 'SECC/RSBY card if available', 'Ration card for family identification'],
      applicationProcess: 'Check eligibility on pmjay.gov.in or call 14555. Visit nearest empanelled hospital or Ayushman Mitra at a government hospital. Get e-card generated with Aadhaar verification.',
      officialUrl: 'https://pmjay.gov.in/',
      departmentId: deptMap['MoHFW'],
      sourceUrl: 'https://pmjay.gov.in/about/pmjay',
      sourceExcerpt: 'AB PM-JAY provides health cover of Rs. 5 lakh per family per year for secondary and tertiary care hospitalization.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-11-01'),
      lastCheckedAt: new Date('2024-11-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      knownLimitations: 'Only available at empanelled hospitals. Beneficiary must be in the SECC 2011 database. Some states have their own health insurance schemes that may overlap.',
      eligibilityRules: [],
    },
    {
      title: 'Sukanya Samriddhi Yojana (SSY)',
      slug: 'sukanya-samriddhi-yojana',
      recordType: 'SAVINGS_PRODUCT' as RecordType,
      category: 'SAVINGS' as RecordCategory,
      shortDescription: 'Government savings scheme for the girl child offering attractive interest rates and tax benefits under Section 80C.',
      detailedDescription: 'Sukanya Samriddhi Yojana is a small savings scheme launched as part of the Beti Bachao, Beti Padhao campaign. It allows parents/guardians to open a deposit account for a girl child under 10 years of age. The account can be opened at any post office or authorized bank. Deposits are eligible for tax deduction under Section 80C, and interest earned and maturity amount are tax-free. The account matures 21 years from the date of opening.',
      beneficiaries: ['girl_child', 'parent', 'guardian', 'woman'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Account can be opened by natural or legal guardian for a girl child below 10 years of age. Maximum two accounts for two girl children (exception for twins/triplets). Minimum deposit: ₹250 per year. Maximum deposit: ₹1.5 lakh per year.',
      benefits: 'Attractive interest rate (set quarterly by government — please check current rate at official source). Tax benefits under Section 80C. Interest earned is tax-free. Maturity amount is tax-free. Partial withdrawal allowed after girl turns 18 for education/marriage.',
      productTerms: 'Interest rate is set quarterly by the Government of India. Please verify the current applicable rate at the India Post website or your bank. The rate mentioned in promotional materials may not reflect the most recent revision.',
      requiredDocuments: ['Birth certificate of girl child', 'Identity proof of guardian (Aadhaar/Voter ID/Passport)', 'Address proof of guardian', 'Photographs'],
      applicationProcess: 'Visit any post office or authorized bank with required documents. Fill the SSY account opening form. Make the initial deposit (minimum ₹250).',
      officialUrl: 'https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samriddhi-Accounts.aspx',
      departmentId: deptMap['DoP'],
      sourceUrl: 'https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samriddhi-Accounts.aspx',
      sourceExcerpt: 'Sukanya Samriddhi Account can be opened in the name of Girl child below 10 years of age.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-10-15'),
      lastCheckedAt: new Date('2024-10-15'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      knownLimitations: 'Interest rate changes quarterly. Current rate should be verified from official sources. Account locked until maturity (21 years) with limited withdrawal options.',
      eligibilityRules: [
        { fieldName: 'gender', operator: 'eq', value: 'female', description: 'Account is for a girl child', isRequired: false },
      ],
    },
    {
      title: 'Pradhan Mantri Mudra Yojana (PMMY)',
      slug: 'pm-mudra-yojana',
      recordType: 'SCHEME' as RecordType,
      category: 'SMALL_BUSINESS' as RecordCategory,
      shortDescription: 'Loan scheme for micro and small enterprises providing collateral-free loans up to ₹10 lakh for non-corporate, non-farm small/micro enterprises.',
      detailedDescription: 'Pradhan Mantri Mudra Yojana provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises. The loans are given by commercial banks, RRBs, small finance banks, MFIs, and NBFCs. Three products: Shishu (up to ₹50,000), Kishore (₹50,001 to ₹5 lakh), Tarun (₹5,00,001 to ₹10 lakh). No collateral is required for loans under MUDRA.',
      beneficiaries: ['business_owner', 'entrepreneur', 'self_employed', 'small_business'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Any Indian citizen with a business plan for non-farm income generating activity. Business should be non-corporate, non-farm sector. Manufacturing, processing, trading, and service sector activities are eligible.',
      benefits: 'Collateral-free loans up to ₹10 lakh. Three loan categories: Shishu (up to ₹50,000), Kishore (up to ₹5 lakh), Tarun (up to ₹10 lakh). Interest rates vary by lending institution. Mudra Card for working capital needs.',
      requiredDocuments: ['Identity proof (Aadhaar/Voter ID)', 'Address proof', 'Business plan/proposal', 'Category certificate (SC/ST/OBC if applicable)', 'Photographs'],
      applicationProcess: 'Apply at nearest bank, NBFC, or MFI. Submit business plan with loan application. Online application also available through some banks and the MUDRA portal.',
      officialUrl: 'https://www.mudra.org.in/',
      departmentId: deptMap['MoMSME'],
      sourceUrl: 'https://www.mudra.org.in/offerings',
      sourceExcerpt: 'MUDRA provides refinance support to Banks/MFIs/NBFCs for lending to micro/small business entities.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-11-01'),
      lastCheckedAt: new Date('2024-11-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'category', operator: 'in', value: '["business_owner","entrepreneur","self_employed","small_business"]', description: 'For small/micro business owners and entrepreneurs', isRequired: false },
      ],
    },
    {
      title: 'Pradhan Mantri Shram Yogi Maan-Dhan (PM-SYM)',
      slug: 'pm-shram-yogi-maan-dhan',
      recordType: 'PENSION' as RecordType,
      category: 'PENSION_SOCIAL_SECURITY' as RecordCategory,
      shortDescription: 'Voluntary pension scheme for unorganized sector workers providing assured monthly pension of ₹3,000 after age 60.',
      detailedDescription: 'PM-SYM is a voluntary and contributory pension scheme for unorganized workers. The subscriber gets a minimum assured pension of ₹3,000 per month after attaining the age of 60. If the subscriber dies during receipt of pension, the spouse is entitled to 50% of the pension. The Central Government gives equal matching contribution. The scheme is managed by LIC.',
      beneficiaries: ['unorganized_worker', 'daily_wage_worker', 'street_vendor', 'domestic_worker', 'general'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Unorganized sector worker with monthly income up to ₹15,000. Age between 18-40 years at the time of joining. Should not be covered under EPFO/ESIC/NPS (government contribution). Should not be an income tax payer.',
      benefits: 'Assured monthly pension of ₹3,000 after age 60. 50% pension to spouse on death of subscriber. Government contributes equal amount as the worker. Monthly contribution ranges from ₹55 to ₹200 based on age at entry.',
      requiredDocuments: ['Aadhaar card', 'Bank account / Jan Dhan account', 'Mobile number'],
      applicationProcess: 'Visit nearest Common Service Centre (CSC) with Aadhaar and bank details. Self-enrollment also available on the MAANDHAN portal. Monthly contributions auto-debited from bank account.',
      officialUrl: 'https://maandhan.in/',
      departmentId: deptMap['MoLE'],
      sourceUrl: 'https://maandhan.in/shramyogi',
      sourceExcerpt: 'PM-SYM provides a minimum assured pension of Rs.3000/- per month after attaining the age of 60 years.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-10-15'),
      lastCheckedAt: new Date('2024-10-15'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'age', operator: 'between', value: '[18,40]', description: 'Age must be between 18-40 years', isRequired: true },
        { fieldName: 'income', operator: 'lte', value: '15000', description: 'Monthly income should not exceed ₹15,000', isRequired: false },
      ],
    },
    {
      title: 'Beti Bachao, Beti Padhao (BBBP)',
      slug: 'beti-bachao-beti-padhao',
      recordType: 'SCHEME' as RecordType,
      category: 'WOMEN_AND_FAMILY' as RecordCategory,
      shortDescription: 'Flagship scheme to address declining child sex ratio and promote education of the girl child through awareness and multi-sectoral interventions.',
      detailedDescription: 'Beti Bachao, Beti Padhao is a joint initiative of Ministry of Women and Child Development, Ministry of Health and Family Welfare, and Ministry of Education. It aims to address the declining child sex ratio, ensure survival and protection of the girl child, and ensure education and participation of the girl child. The scheme provides for a coordinated set of actions across sectors to improve the child sex ratio.',
      beneficiaries: ['girl_child', 'woman', 'parent', 'family'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'The scheme benefits are at the community and district level through awareness campaigns and interventions. Individual financial benefits are linked to specific sub-schemes like Sukanya Samriddhi Yojana.',
      benefits: 'Awareness and advocacy campaigns. Enforcement of PC & PNDT Act. Multi-sectoral action in selected districts. Training of stakeholders. Community mobilization. Links to Sukanya Samriddhi Yojana for financial benefits.',
      requiredDocuments: [],
      applicationProcess: 'This is primarily an awareness and enforcement scheme. For financial benefits, see Sukanya Samriddhi Yojana. Contact nearest Anganwadi Centre or District Programme Officer for information.',
      officialUrl: 'https://wcd.nic.in/bbbp-schemes',
      departmentId: deptMap['MoWCD'],
      sourceUrl: 'https://wcd.nic.in/bbbp-schemes',
      sourceExcerpt: 'Beti Bachao Beti Padhao addresses the issue of declining Child Sex Ratio and related issues of empowerment of women.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-09-01'),
      lastCheckedAt: new Date('2024-09-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [],
    },
    {
      title: 'Public Provident Fund (PPF)',
      slug: 'public-provident-fund',
      recordType: 'SAVINGS_PRODUCT' as RecordType,
      category: 'SAVINGS' as RecordCategory,
      shortDescription: 'Long-term government savings scheme with tax benefits under Section 80C, available at post offices and banks.',
      detailedDescription: 'Public Provident Fund (PPF) is a government-backed long-term savings scheme available at all post offices and most nationalized banks. It offers attractive interest rates set quarterly by the government, with a 15-year lock-in period. Deposits qualify for tax deduction under Section 80C, and both interest earned and maturity amount are tax-free (EEE status). Partial withdrawals are allowed from the 7th year.',
      beneficiaries: ['general', 'salaried', 'self_employed'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Any resident Indian individual can open a PPF account. Only one account per person. Minimum annual deposit: ₹500. Maximum annual deposit: ₹1.5 lakh. Non-Resident Indians (NRIs) cannot open new PPF accounts.',
      benefits: 'Interest rate set quarterly by government (verify current rate at official source). Tax deduction under Section 80C. Interest is tax-free. Maturity amount is tax-free. Loan facility from 3rd to 6th financial year. Partial withdrawal from 7th year.',
      productTerms: 'Interest rate is set quarterly by the Government of India. The rate mentioned here may not be current. Please verify at the India Post or bank website. 15-year maturity period extendable in blocks of 5 years.',
      requiredDocuments: ['Identity proof (Aadhaar/PAN/Voter ID)', 'Address proof', 'Photographs', 'Initial deposit cheque/cash'],
      applicationProcess: 'Visit any post office or authorized bank to open an account. Fill the PPF account opening form. Submit KYC documents and make initial deposit.',
      officialUrl: 'https://www.indiapost.gov.in/Financial/Pages/Content/PPF.aspx',
      departmentId: deptMap['DoP'],
      sourceUrl: 'https://www.indiapost.gov.in/Financial/Pages/Content/PPF.aspx',
      sourceExcerpt: 'Public Provident Fund is a popular long term investment option backed by Government of India.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-10-01'),
      lastCheckedAt: new Date('2024-10-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      knownLimitations: 'Interest rate changes quarterly. 15-year lock-in period. Only one account per person.',
      eligibilityRules: [],
    },
    {
      title: 'Centralized Public Grievance Redress and Monitoring System (CPGRAMS)',
      slug: 'cpgrams-grievance-portal',
      recordType: 'GRIEVANCE_CHANNEL' as RecordType,
      category: 'GOVERNMENT_SERVICES' as RecordCategory,
      shortDescription: 'Online portal for citizens to lodge public grievances with any Central Government Ministry/Department and track their resolution.',
      detailedDescription: 'CPGRAMS is an online web-enabled system developed by the Department of Administrative Reforms & Public Grievances (DARPG). It enables citizens to lodge grievances to any Central Government Ministry/Department/Organization through a single portal. The system allows tracking of grievance status, escalation, and feedback. Grievances can be filed in English or Hindi.',
      beneficiaries: ['general', 'citizen'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Any Indian citizen can lodge a grievance. No specific eligibility criteria. Grievance must relate to a Central Government Ministry/Department/Organization.',
      benefits: 'Free online grievance registration. Unique registration number for tracking. Grievance forwarded to concerned department. Status tracking available. Feedback mechanism after resolution. Available 24/7.',
      requiredDocuments: ['Name and contact details', 'Description of grievance', 'Supporting documents if any'],
      applicationProcess: 'Register on pgportal.gov.in. Login and submit grievance with details. Track status using registration number. Provide feedback after resolution.',
      officialUrl: 'https://pgportal.gov.in/',
      departmentId: deptMap['DARPG'],
      sourceUrl: 'https://pgportal.gov.in/',
      sourceExcerpt: 'CPGRAMS is a single portal connected to all Ministries/Departments of Government of India to facilitate online lodging and tracking of grievances.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-11-01'),
      lastCheckedAt: new Date('2024-11-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [],
    },
    {
      title: 'National Apprenticeship Promotion Scheme (NAPS)',
      slug: 'national-apprenticeship-promotion-scheme',
      recordType: 'SCHEME' as RecordType,
      category: 'EMPLOYMENT' as RecordCategory,
      shortDescription: 'Government scheme promoting apprenticeship training by sharing 25% of stipend cost with employers for new apprentices.',
      detailedDescription: 'The National Apprenticeship Promotion Scheme promotes apprenticeship training and incentivizes employers to engage apprentices. The government shares 25% of the prescribed stipend (up to ₹1,500 per month per apprentice) with employers. It aims to increase apprenticeship engagement across industries.',
      beneficiaries: ['student', 'youth', 'job_seeker', 'employee'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Candidates: Must have completed education (Class 5 to graduate level depending on trade). Age: Minimum 14 years. Employers: Must be registered on the Apprenticeship portal.',
      benefits: '25% of prescribed stipend reimbursed to employer (up to ₹1,500/month). Practical training in actual work environment. National trade certificate on completion. Improved employability.',
      requiredDocuments: ['Aadhaar card', 'Education certificates', 'Bank account details'],
      applicationProcess: 'Register on apprenticeshipindia.gov.in. Search and apply for available apprenticeship opportunities. Employer and apprentice both register on the portal.',
      officialUrl: 'https://www.apprenticeshipindia.gov.in/',
      departmentId: deptMap['MoLE'],
      sourceUrl: 'https://www.apprenticeshipindia.gov.in/',
      sourceExcerpt: 'NAPS promotes apprenticeship training by providing financial support to establishments undertaking apprenticeship programs.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-09-15'),
      lastCheckedAt: new Date('2024-09-15'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'age', operator: 'gte', value: '14', description: 'Minimum age is 14 years', isRequired: true },
      ],
    },
    {
      title: 'Pradhan Mantri Awas Yojana - Gramin (PMAY-G)',
      slug: 'pmay-gramin-housing',
      recordType: 'SCHEME' as RecordType,
      category: 'HOUSING' as RecordCategory,
      shortDescription: 'Government housing scheme providing financial assistance for construction of pucca houses for eligible rural households.',
      detailedDescription: 'PMAY-G aims to provide a pucca house to all eligible rural households by providing financial assistance. The beneficiaries are selected from SECC 2011 data and validated by Gram Sabhas. Unit assistance is ₹1.20 lakh in plain areas and ₹1.30 lakh in hilly/difficult/IAP areas. In addition, beneficiaries get ₹12,000 for toilet construction under SBM-G.',
      beneficiaries: ['rural_household', 'homeless', 'kutcha_house', 'general'],
      stateScope: [],
      geographicScope: 'national',
      eligibilityDetails: 'Households living in kutcha/dilapidated houses as per SECC 2011 data. Priority given to households with no adult member between 16-59 years, female-headed households, SC/ST households, households with disabled members, and households with no literate adult.',
      benefits: 'Financial assistance of ₹1.20 lakh (plains) / ₹1.30 lakh (hilly areas). Additional ₹12,000 for toilet under Swachh Bharat Mission. 90 days of unskilled labour wages under MGNREGA.',
      requiredDocuments: ['Aadhaar card', 'Bank account details', 'SECC data verification', 'Gram Sabha validation'],
      applicationProcess: 'Beneficiaries are selected from SECC 2011 data validated by Gram Sabhas. No separate application needed. Check Awaas+ app or contact Gram Panchayat for status.',
      officialUrl: 'https://pmayg.nic.in/',
      departmentId: deptMap['MoAFW'],
      sourceUrl: 'https://pmayg.nic.in/',
      sourceExcerpt: 'PMAY-G aims at providing a pucca house with basic amenities to all houseless and households living in kutcha and dilapidated houses.',
      status: 'PUBLISHED' as PublicationStatus,
      lastVerifiedAt: new Date('2024-10-01'),
      lastCheckedAt: new Date('2024-10-01'),
      verifiedBy: 'seed',
      requiresHumanReview: false,
      eligibilityRules: [
        { fieldName: 'areaType', operator: 'eq', value: 'rural', description: 'For rural households', isRequired: true },
      ],
    },
  ];

  let recordCount = 0;
  for (const record of records) {
    const { eligibilityRules, ...recordData } = record;
    const existing = await prisma.governmentRecord.findUnique({ where: { slug: record.slug } });
    
    if (existing) {
      console.log(`ℹ️  Record already exists: ${record.title}`);
      continue;
    }

    const created = await prisma.governmentRecord.create({
      data: {
        ...recordData,
        eligibilityRules: {
          create: eligibilityRules,
        },
      },
    });
    recordCount++;
  }
  console.log(`✅ ${recordCount} government records seeded`);

  console.log('\n🎉 Seeding complete!');
  console.log(`📊 Summary:`);
  if (!skipUserSeed && adminPassword) {
    console.log(`   - Admin user: ${adminEmail}`);
  } else {
    console.log(`   - Admin/User seeding: Skipped (Cloud/Production safe mode)`);
  }
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Government records: ${records.length}`);
  console.log(`   - Source registries: ${sourceRegistries.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
