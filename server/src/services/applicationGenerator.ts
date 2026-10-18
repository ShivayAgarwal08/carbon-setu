import { logger } from '../utils/logger';

export interface CitizenApplicationInput {
  schemeSlug: string;
  schemeTitle: string;
  applicantName: string;
  fatherOrSpouseName?: string;
  dobOrAge?: string;
  gender?: string;
  category?: string; // General, OBC, SC, ST, EWS
  occupation?: string;
  annualIncome?: number | string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  mobileNumber?: string;
  email?: string;
  hasAadhaarLinkedBank: boolean;
  bankAccountDeclaration?: boolean;
  // Scheme specific attributes
  landholdingAcres?: number | string;
  khasraKhatauniNumber?: string;
  vendingLocationOrMarket?: string;
  vendingCertificateNumber?: string;
  housingCondition?: string;
  preferredLanguage?: 'en' | 'hi';
}

export interface GeneratedApplicationDraft {
  documentId: string;
  schemeTitle: string;
  schemeSlug: string;
  officialPortalUrl: string;
  submissionAuthority: string;
  filingMode: 'OFFLINE_AT_CSC_OR_TEHSIL' | 'ONLINE_PORTAL' | 'HYBRID';
  generatedDate: string;
  draftText: string;
  missingRequiredFields: string[];
  mandatoryChecklist: string[];
  submissionInstructions: string[];
  statutoryDisclaimer: string;
}

export function generateSchemeApplicationDraft(input: CitizenApplicationInput): GeneratedApplicationDraft {
  const missingFields: string[] = [];
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const lang = input.preferredLanguage || 'en';
  let draftText = '';
  let officialPortalUrl = 'https://myscheme.gov.in';
  let submissionAuthority = 'District Collector / Concerned Department Office';
  let filingMode: GeneratedApplicationDraft['filingMode'] = 'HYBRID';
  let mandatoryChecklist: string[] = [];
  let submissionInstructions: string[] = [];

  // Identify missing basic fields
  if (!input.applicantName) missingFields.push('Applicant Full Name');
  if (!input.address) missingFields.push('Complete Residential Address');
  if (!input.state) missingFields.push('State');
  if (!input.district) missingFields.push('District');
  if (!input.pincode) missingFields.push('PIN Code');
  if (!input.mobileNumber) missingFields.push('Active Mobile Number');

  // Scheme-specific drafting
  if (input.schemeSlug.includes('pm-kisan') || input.schemeSlug.includes('kisan')) {
    officialPortalUrl = 'https://pmkisan.gov.in';
    submissionAuthority = 'Tehsildar / District Agriculture Officer / Common Service Centre (CSC)';
    filingMode = 'ONLINE_PORTAL';

    if (!input.landholdingAcres) missingFields.push('Cultivable Landholding (Acres / Hectares)');
    if (!input.khasraKhatauniNumber) missingFields.push('Land Record / Khasra-Khatauni Details');

    mandatoryChecklist = [
      'Copy of Aadhaar Card (Applicant & Spouse)',
      'Certified Copy of Land Record / RoR / Khasra-Khatauni in applicant\'s name',
      'Bank Account Passbook showing active Aadhaar-seeding with NPCI DBT mandate',
      'Self-declaration of not belonging to any exclusion category (Income Tax / Govt Employee)',
    ];

    submissionInstructions = [
      'Self-registration online: Visit https://pmkisan.gov.in and click "New Farmer Registration" using your Aadhaar and mobile OTP.',
      'Offline submission: If unable to file online, present this signed draft along with original documents to your nearest Common Service Centre (CSC) or local Patwari/Lekhpal.',
      'Verification: Ensure your land records are verified in the State Land Seeding portal to trigger installment disbursement.',
    ];

    if (lang === 'hi') {
      draftText = `प्रारूप आवेदन पत्र: प्रधानमंत्री किसान सम्मान निधि योजना (PM-KISAN)
(केवल सहायता एवं पूर्वाभ्यास हेतु - आधिकारिक आवेदन हेतु pmkisan.gov.in पर जाएँ)

सेवा में,
तहसीलदार / जिला कृषि अधिकारी
जिला: ${input.district || '[जिला का नाम]'}, राज्य: ${input.state || '[राज्य का नाम]'}

विषय: प्रधानमंत्री किसान सम्मान निधि योजना (PM-KISAN) के अंतर्गत नवीन कृषक पंजीकरण हेतु आवेदन पत्र।

महोदय,
मैं सविनय निवेदन करता हूँ कि मैं एक पात्र लघु/सीमांत कृषक परिवार से संबंध रखता हूँ और योजना के अंतर्गत वित्तीय सहायता प्राप्त करने हेतु अपना विवरण प्रस्तुत कर रहा हूँ:

1. आवेदक का विवरण:
   (क) पूरा नाम: ${input.applicantName || '[भरना अनिवार्य]'}
   (ख) पिता/पति का नाम: ${input.fatherOrSpouseName || '[भरना अनिवार्य]'}
   (ग) जन्म तिथि / आयु: ${input.dobOrAge || '[उपलब्ध नहीं]'}
   (घ) लिंग: ${input.gender || '[उपलब्ध नहीं]'}
   (ङ) सामाजिक श्रेणी: ${input.category || 'सामान्य/ओबीसी/एससी/एसटी'}
   (च) संपर्क दूरभाष: ${input.mobileNumber || '[मोबाइल नंबर अनिवार्य]'}

2. पूर्ण आवासीय पता:
   गाँव/मोहल्ला: ${input.address || '[पता भरें]'}
   जिला: ${input.district || '[जिला]'}, राज्य: ${input.state || '[राज्य]'} - पिन: ${input.pincode || '[पिन]'}

3. कृषि भूमि का विवरण:
   (क) कुल कृषि योग्य भूमि: ${input.landholdingAcres ? `${input.landholdingAcres} एकड़` : '[भूमि का क्षेत्रफल दर्ज करें]'}
   (ख) खसरा / खतौनी / जमाबंदी संख्या: ${input.khasraKhatauniNumber || '[खसरा खतौनी संख्या दर्ज करें]'}
   (ग) भूमि रिकॉर्ड कट-ऑफ तिथि (01.02.2019 से पूर्व): हाँ, सत्यापित रिकॉर्ड संलग्न है।

4. आधार एवं बैंक लिंकिंग घोषणा:
   (क) क्या बैंक खाता आधार एवं एनपीसीआई डीबीटी (NPCI DBT) से लिंक्ड है: ${input.hasAadhaarLinkedBank ? 'हाँ, सक्रिय है' : '[लंबित - बैंक जाकर डीबीटी सक्रिय कराएं]'}

5. अपवर्जन (Ineligibility) से मुक्ति का घोषणापत्र:
   मैं सत्यनिष्ठा से प्रतिज्ञा करता हूँ कि मेरे परिवार का कोई भी सदस्य आयकरदाता, संवैधानिक पदधारक, सरकारी/पीएसयू कर्मचारी, अथवा ₹10,000/माह से अधिक का पेंशनभोगी नहीं है।

दिनांक: ${currentDate}
स्थान: ${input.district || input.state || 'भारत'}

आवेदक के हस्ताक्षर / अंगूठे का निशान: ________________________
नाम: ${input.applicantName || 'कृषक'}`;
    } else {
      draftText = `APPLICATION DRAFT: PRADHAN MANTRI KISAN SAMMAN NIDHI (PM-KISAN)
(Informational & Preparation Draft — Submit Officially via pmkisan.gov.in or CSC)

To:
The Tehsildar / District Agriculture Officer
District: ${input.district || '[District Name]'}, State: ${input.state || '[State Name]'}

Subject: Application for New Farmer Registration under PM-KISAN Scheme.

Sir/Madam,
I hereby submit my particulars for enrollment under the PM-KISAN scheme for financial assistance:

1. Applicant Particulars:
   (a) Full Name: ${input.applicantName || '[MANDATORY]'}
   (b) Father / Spouse Name: ${input.fatherOrSpouseName || '[MANDATORY]'}
   (c) Date of Birth / Age: ${input.dobOrAge || '[Not Specified]'}
   (d) Gender: ${input.gender || '[Not Specified]'}
   (e) Social Category: ${input.category || 'General / OBC / SC / ST'}
   (f) Mobile Number: ${input.mobileNumber || '[MANDATORY]'}

2. Residential Address:
   Village / Town: ${input.address || '[Address]'}
   District: ${input.district || '[District]'}, State: ${input.state || '[State]'} - PIN: ${input.pincode || '[Pincode]'}

3. Landholding & Cultivation Details:
   (a) Total Cultivable Land: ${input.landholdingAcres ? `${input.landholdingAcres} Acres` : '[Enter Area]'}
   (b) Khasra / Khatauni / Revenue Survey No.: ${input.khasraKhatauniNumber || '[Enter Land Record Details]'}
   (c) Land ownership prior to 01.02.2019 cutoff: Yes, documented proof enclosed.

4. Bank Account & DBT Declaration:
   Aadhaar-seeded Bank Account with Active NPCI DBT Mandate: ${input.hasAadhaarLinkedBank ? 'Verified Active' : 'PENDING - Must be linked at bank branch'}

5. Exclusion Criteria Declaration:
   I solemnly affirm that neither I nor any member of my family is an income tax payer, constitutional post holder, government/autonomous body employee, or pensioner receiving ₹10,000/month or higher.

Date: ${currentDate}
Place: ${input.district || input.state || 'India'}

Signature / Thumb Impression of Applicant: ________________________
Name: ${input.applicantName || 'Applicant'}`;
    }
  } else if (input.schemeSlug.includes('ayushman') || input.schemeSlug.includes('pmjay') || input.schemeSlug.includes('health')) {
    officialPortalUrl = 'https://beneficiary.nha.gov.in';
    submissionAuthority = 'Ayushman Mitra at Empanelled Hospital / Common Service Centre (CSC)';
    filingMode = 'HYBRID';

    mandatoryChecklist = [
      'Original Aadhaar Card with active mobile linking for OTP',
      'Valid NFSA Ration Card or SECC Household Letter / HHID',
      'Passport size photograph',
    ];

    submissionInstructions = [
      'Step 1: Check your SECC/Ration Card status on https://beneficiary.nha.gov.in using your Mobile or Aadhaar number.',
      'Step 2: If listed, complete e-KYC online or visit any government hospital / CSC to generate your PVC Ayushman Card.',
      'Step 3: Once generated, your Ayushman Card provides ₹5 Lakh/year cashless coverage at all empanelled hospitals.',
    ];

    if (lang === 'hi') {
      draftText = `प्रारूप: आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना (AB-PMJAY) कार्ड सहायता पत्र
(आधिकारिक सत्यापन एवं कार्ड निर्माण हेतु beneficiary.nha.gov.in पर जाएँ)

सेवा में,
आयुष्मान मित्र / संबंधित अधिकारी
आयुष्मान भारत सेवा केंद्र / निकटतम सूचीबद्ध चिकित्सालय, जिला: ${input.district || '[जिला]'}

विषय: आयुष्मान भारत गोल्डन कार्ड (Ayushman Card) निर्माण एवं सत्यापन हेतु विवरण।

1. लाभार्थी का विवरण:
   पूरा नाम: ${input.applicantName || '[नाम दर्ज करें]'}
   पिता/पति का नाम: ${input.fatherOrSpouseName || '[दर्ज करें]'}
   पता: ${input.address || '[पता]'}, ${input.district || '[जिला]'}, ${input.state || '[राज्य]'} - ${input.pincode || '[पिन]'}
   मोबाइल नंबर: ${input.mobileNumber || '[मोबाइल नंबर]'}

2. पात्रता संदर्भ:
   राशन कार्ड / एसईसीसी परिवार आईडी संलग्न है।
   परिवार के सदस्यों के आधार कार्ड संलग्न हैं।

दिनांक: ${currentDate}
हस्ताक्षर: ________________________ (आवेदक: ${input.applicantName || 'नागरिक'})`;
    } else {
      draftText = `ASSISTANCE DRAFT: AYUSHMAN BHARAT PM-JAY HEALTH CARD ENROLLMENT
(To be verified via beneficiary.nha.gov.in or at any empanelled hospital)

To:
The Ayushman Mitra / Verification Officer
Ayushman Bharat Helpdesk / Empanelled Hospital, District: ${input.district || '[District]'}

Subject: Verification of Beneficiary Entitlement for Ayushman Golden Card.

1. Applicant Particulars:
   Full Name: ${input.applicantName || '[Enter Name]'}
   Father / Spouse Name: ${input.fatherOrSpouseName || '[Enter Name]'}
   Address: ${input.address || '[Address]'}, ${input.district || '[District]'}, ${input.state || '[State]'} - ${input.pincode || '[PIN]'}
   Contact Phone: ${input.mobileNumber || '[Mobile]'}

2. Supporting Reference:
   Valid NFSA Ration Card / Aadhaar Enclosed for e-KYC.

Date: ${currentDate}
Signature: ________________________ (Applicant: ${input.applicantName || 'Citizen'})`;
    }
  } else {
    // Generic Government Welfare Scheme Application Draft
    officialPortalUrl = 'https://myscheme.gov.in';
    submissionAuthority = 'Concerned Public Department / District Welfare Office';
    filingMode = 'HYBRID';

    mandatoryChecklist = [
      'Self-attested copy of Aadhaar Card',
      'Address & Domicile Proof of the State',
      'Income Certificate issued by Tehsildar / SDO',
      'Bank Account Passbook with IFSC and Aadhaar linkage',
      'Category Certificate (SC/ST/OBC/EWS) if claiming reservation/special subsidy',
    ];

    submissionInstructions = [
      'Verify requirements at https://myscheme.gov.in or the official department portal.',
      'Submit the printed and signed draft along with self-attested document photocopies to the designated office.',
      'Obtain an acknowledgment slip containing your tracking/acknowledgment number.',
    ];

    draftText = `APPLICATION DRAFT: ${input.schemeTitle.toUpperCase()}
(Citizen Service Draft — Verify & Submit through Official Government Channels)

To:
The Competent Authority / District Welfare Officer
Department of Public Services & Welfare
District: ${input.district || '[District]'}, State: ${input.state || '[State]'}

Subject: Formal Application for Benefits under ${input.schemeTitle}.

1. Particulars of the Applicant:
   (a) Full Name: ${input.applicantName || '[MANDATORY]'}
   (b) Father / Spouse Name: ${input.fatherOrSpouseName || '[Not Specified]'}
   (c) Date of Birth / Age: ${input.dobOrAge || '[Not Specified]'}
   (d) Complete Address: ${input.address || '[Address]'}, ${input.district || '[District]'}, ${input.state || '[State]'} - ${input.pincode || '[PIN]'}
   (e) Contact Mobile: ${input.mobileNumber || '[Mobile]'}
   (f) Occupation: ${input.occupation || '[Not Specified]'}
   (g) Annual Family Income: ${input.annualIncome ? `₹${input.annualIncome}` : '[Attach Income Certificate]'}

2. Declaration of Eligibility:
   I declare that the information stated above is true and correct to the best of my knowledge and that I satisfy the published criteria for the scheme.

Date: ${currentDate}
Place: ${input.district || input.state || 'India'}

Signature: ________________________
(Applicant: ${input.applicantName || 'Applicant'})`;
  }

  const statutoryDisclaimer =
    'DISCLAIMER: This document is a computer-generated prefilled draft intended solely to assist citizens in preparing their application. CARbon Setu is an independent civic information platform and does NOT possess the statutory authority to approve applications or grant benefits. You must review, sign, and submit this application through official government channels (e.g. Common Service Centres or designated departmental web portals).';

  return {
    documentId: `APP-${Date.now()}`,
    schemeTitle: input.schemeTitle,
    schemeSlug: input.schemeSlug,
    officialPortalUrl,
    submissionAuthority,
    filingMode,
    generatedDate: currentDate,
    draftText,
    missingRequiredFields: missingFields,
    mandatoryChecklist,
    submissionInstructions,
    statutoryDisclaimer,
  };
}
