import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const rtiRouter = Router();

// Verified central public authorities with official RTI contacts & portal details
export const VERIFIED_PUBLIC_AUTHORITIES = [
  {
    id: 'moa-fw',
    name: 'Ministry of Agriculture and Farmers Welfare',
    department: 'Department of Agriculture & Farmers Welfare',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'mohf-w',
    name: 'Ministry of Health and Family Welfare',
    department: 'Department of Health & Family Welfare',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Nirman Bhawan, Maulana Azad Road, New Delhi - 110011',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'mosj-e',
    name: 'Ministry of Social Justice and Empowerment',
    department: 'Department of Social Justice and Empowerment',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'mord',
    name: 'Ministry of Rural Development',
    department: 'Department of Rural Development',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'moe',
    name: 'Ministry of Education',
    department: 'Department of Higher Education / Department of School Education',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'dop',
    name: 'Department of Posts (India Post)',
    department: 'Ministry of Communications',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'Central RTI Online Portal',
    address: 'Dak Bhawan, Sansad Marg, New Delhi - 110001',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'up-state',
    name: 'Uttar Pradesh State Government Departments',
    department: 'State Public Information System',
    portalUrl: 'http://rtionline.up.gov.in',
    portalType: 'State RTI Portal (UP)',
    address: 'Concerned District Magistrate / Tehsildar / State Directorate Office',
    standardFee: '₹10 via Court Fee Stamp / IPO / Treasury Challan',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
  {
    id: 'other-public-authority',
    name: 'Other Public Authority / State Department',
    department: 'Concerned Ministry or State Department',
    portalUrl: 'https://rtionline.gov.in',
    portalType: 'RTI Online or Offline Submission',
    address: 'Office of the Central/State Public Information Officer (CPIO/SPIO)',
    standardFee: '₹10 (Exempt for BPL Cardholders)',
    appealWindowDays: 30,
    responseWindowDays: 30,
  },
];

// ── GET /api/rti/authorities ──────────────────────────────────────────────
rtiRouter.get('/authorities', (_req, res: Response) => {
  return res.json({
    success: true,
    data: VERIFIED_PUBLIC_AUTHORITIES,
    statutoryNotice: {
      centralAct: 'Right to Information Act, 2005 (Act No. 22 of 2005)',
      centralApplicationSection: 'Section 6(1)',
      firstAppealSection: 'Section 19(1)',
      secondAppealSection: 'Section 19(3)',
      officialPortal: 'https://rtionline.gov.in',
      disclaimer: 'CARbon Setu provides drafting assistance only. This application must be verified, signed, and submitted by the citizen through official government channels.',
    },
  });
});

// Schema for Section 6(1) RTI Application Draft
const rtiApplicationSchema = z.object({
  type: z.literal('RTI_REQUEST'),
  publicAuthority: z.string().min(2).max(200),
  authorityAddress: z.string().optional(),
  applicantName: z.string().min(2).max(100),
  fatherOrSpouseName: z.string().optional(),
  address: z.string().min(5).max(300),
  state: z.string().min(2).max(100),
  pincode: z.string().min(4).max(10),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isBpl: z.boolean().default(false),
  bplCardNumber: z.string().optional(),
  subject: z.string().min(5).max(250),
  specificQueries: z.array(z.string().min(5)).min(1).max(10),
  timePeriod: z.string().min(2).max(100),
  relatedScheme: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
  saveDraft: z.boolean().default(false),
});

// Schema for Section 19(1) First Appeal Draft
const rtiAppealSchema = z.object({
  type: z.literal('FIRST_APPEAL'),
  publicAuthority: z.string().min(2).max(200),
  firstAppellateAuthority: z.string().min(2).max(200),
  faaAddress: z.string().optional(),
  originalRtiDate: z.string().min(4).max(50),
  originalRtiRegNumber: z.string().optional(),
  cpioNameOrDesignation: z.string().min(2).max(100),
  cpioReplyDate: z.string().optional(),
  receivedNoResponse: z.boolean().default(true),
  groundsOfAppeal: z.array(z.string().min(5)).min(1),
  specificReliefSought: z.string().min(10).max(1000),
  applicantName: z.string().min(2).max(100),
  fatherOrSpouseName: z.string().optional(),
  address: z.string().min(5).max(300),
  state: z.string().min(2).max(100),
  pincode: z.string().min(4).max(10),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isBpl: z.boolean().default(false),
  bplCardNumber: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
  saveDraft: z.boolean().default(false),
});

const generateSchema = z.discriminatedUnion('type', [rtiApplicationSchema, rtiAppealSchema]);

// ── POST /api/rti/generate ────────────────────────────────────────────────
rtiRouter.post('/generate', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = generateSchema.parse(req.body);
    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    let draftText = '';
    let title = '';
    let statutoryReferences: string[] = [];
    let filingInstructions: string[] = [];
    let attachmentsChecklist: string[] = [];

    if (data.type === 'RTI_REQUEST') {
      title = `RTI Application: ${data.subject}`;
      statutoryReferences = [
        'Section 6(1) of the Right to Information Act, 2005 (Application for obtaining information)',
        'Section 7(1) of the Right to Information Act, 2005 (Mandatory 30-day response period)',
        data.isBpl
          ? 'Rule 7 of Right to Information Rules, 2012 / Proviso to Section 7(5) (Exemption from application & copying fee for citizens Below Poverty Line)'
          : 'Rule 3 & 4 of Right to Information Rules, 2012 (Application fee of ₹10 via IPO / DD / Banker Cheque / Cash or Online)',
      ];

      filingInstructions = [
        'ONLINE FILING: If the authority is a Central Ministry/Department, file directly at https://rtionline.gov.in using credit card, debit card, UPI, or Net Banking.',
        'OFFLINE FILING: Submit to the Public Information Officer (CPIO/SPIO) in person or by Speed Post/Registered Post.',
        data.isBpl
          ? 'FEE EXEMPTION: Attach a self-attested photocopy of your BPL/Antyodaya Ration Card to claim full fee exemption.'
          : 'FEE PAYMENT: Pay ₹10 fee via Indian Postal Order (IPO) or Demand Draft in favor of "Accounts Officer, [Name of Public Authority]", payable at head office.',
        'REMEDY ON DELAY: If information is not provided within 30 days of receipt, the citizen has the statutory right to file a First Appeal under Section 19(1).',
      ];

      attachmentsChecklist = [
        data.isBpl ? `Self-attested copy of BPL Card (Card No: ${data.bplCardNumber || 'Attached'})` : 'IPO / Demand Draft / Online Fee Receipt of ₹10',
        'Self-attested identity/address proof (if filing offline)',
        'Copy of any earlier representation, grievance token, or application receipt (optional supporting reference)',
      ];

      if (data.preferredLanguage === 'hi') {
        draftText = `प्रारूप: सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत आवेदन

सेवा में,
केंद्रीय/राज्य लोक सूचना अधिकारी (CPIO/SPIO)
${data.publicAuthority}
${data.authorityAddress || 'संबंधित मंत्रालय / विभाग, भारत सरकार / राज्य सरकार'}

विषय: सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के तहत सूचना उपलब्ध कराने हेतु आवेदन।

महोदय/महोदया,

1. आवेदक का विवरण:
   (क) पूरा नाम: ${data.applicantName}
   (ख) पिता/पति का नाम: ${data.fatherOrSpouseName || 'उपलब्ध नहीं'}
   (ग) पूर्ण पत्राचार का पता: ${data.address}, ${data.state} - ${data.pincode}
   (घ) संपर्क दूरभाष / मोबाइल: ${data.phone || 'उपलब्ध नहीं'}
   (ङ) ईमेल आईडी: ${data.email || 'उपलब्ध नहीं'}

2. गरीबी रेखा से नीचे (BPL) स्थिति:
   ${data.isBpl ? `हाँ, आवेदक गरीबी रेखा से नीचे (BPL) श्रेणी में आता है (कार्ड संख्या: ${data.bplCardNumber || 'संलग्न है'})। आरटीआई अधिनियम, 2005 की धारा 7(5) के तहत आवेदक किसी भी प्रकार का शुल्क देने से मुक्त है।` : 'नहीं, सामान्य वर्ग (₹10 का वैधानिक शुल्क संलग्न/भुगतान किया गया है)।'}

3. मांगी गई सूचना का विषय:
   ${data.subject}
   ${data.relatedScheme ? `(संबंधित सरकारी योजना/सेवा: ${data.relatedScheme})` : ''}

4. सूचना का समय काल:
   ${data.timePeriod}

5. वांछित सूचना का विशिष्ट विवरण:
${data.specificQueries.map((q, idx) => `   (${idx + 1}) ${q}`).join('\n\n')}

6. वैधानिक घोषणा:
   (क) मैं प्रमाणित करता/करती हूँ कि मैं भारत का/की नागरिक हूँ।
   (ख) मेरे द्वारा मांगी गई जानकारी सूचना का अधिकार अधिनियम, 2005 की धारा 8 एवं 9 के अंतर्गत आने वाले अपवादों से बाहर है।
   (ग) कृपया मांगी गई सूचना आरटीआई अधिनियम, 2005 की धारा 7(1) के अंतर्गत वैधानिक 30 दिनों की अवधि के भीतर उपरोक्त पते पर स्पीड पोस्ट अथवा ईमेल द्वारा उपलब्ध कराने की कृपा करें।

दिनांक: ${currentDate}
स्थान: ${data.state}

हस्ताक्षर / अंगूठे का निशान: ________________________
(आवेदक: ${data.applicantName})`;
      } else {
        draftText = `FORM: APPLICATION FOR OBTAINING INFORMATION UNDER SECTION 6(1)
OF THE RIGHT TO INFORMATION ACT, 2005

To:
The Central Public Information Officer (CPIO) / State Public Information Officer (SPIO)
${data.publicAuthority}
${data.authorityAddress || 'Concerned Public Authority, Government of India / State Government'}

Subject: Application under Section 6(1) of the Right to Information Act, 2005 for seeking information.

Sir / Madam,

1. Particulars of the Applicant:
   (a) Full Name: ${data.applicantName}
   (b) Father's / Spouse's Name: ${data.fatherOrSpouseName || 'Not specified'}
   (c) Complete Postal Address: ${data.address}, ${data.state} - ${data.pincode}
   (d) Mobile / Telephone: ${data.phone || 'Not specified'}
   (e) Email Address: ${data.email || 'Not specified'}

2. Below Poverty Line (BPL) Status:
   ${data.isBpl ? `YES. The applicant belongs to Below Poverty Line (BPL) category (BPL Card No: ${data.bplCardNumber || 'Attached herewith'}). Hence, fee is exempt pursuant to proviso to Section 7(5) of RTI Act 2005 and Rule 7 of RTI Rules 2012.` : 'NO. Standard statutory application fee of ₹10 is attached / paid online.'}

3. Subject Matter of Information:
   ${data.subject}
   ${data.relatedScheme ? `(Related Government Scheme / Benefit: ${data.relatedScheme})` : ''}

4. Time Period to which Information Relates:
   ${data.timePeriod}

5. Specific Queries / Particulars of Information Sought:
${data.specificQueries.map((q, idx) => `   Query ${idx + 1}: ${q}`).join('\n\n')}

6. Statutory Declaration:
   (i) I hereby declare that I am a citizen of India.
   (ii) To the best of my knowledge and belief, the information sought above does not fall within the exemptions contained in Section 8 or Section 9 of the Right to Information Act, 2005.
   (iii) Pursuant to Section 7(1) of the Act, kindly provide the certified information within the mandatory statutory period of thirty (30) days from the date of receipt of this application.

Date: ${currentDate}
Place: ${data.state}

Yours faithfully,

___________________________________
(Signature / Thumb Impression of Applicant)
Name: ${data.applicantName}`;
      }
    } else {
      // FIRST_APPEAL
      title = `First Appeal under Section 19(1): ${data.publicAuthority}`;
      statutoryReferences = [
        'Section 19(1) of the Right to Information Act, 2005 (First Appeal to Appellate Authority within 30 days)',
        'Section 19(6) of the Right to Information Act, 2005 (Mandatory disposal of First Appeal within 30 to 45 days)',
        'Section 7(6) of the Right to Information Act, 2005 (Information to be provided free of cost if not provided within time limit)',
      ];

      filingInstructions = [
        'TIME LIMIT: A First Appeal must be filed within 30 days from the date on which the decision was received from the CPIO, or within 30 days from the expiry of the statutory period for receiving a reply.',
        'SUBMISSION: Address this appeal directly to the designated First Appellate Authority (FAA), who is an officer senior in rank to the CPIO.',
        'NO APPEAL FEE: Under Central RTI Rules, no fee is charged for filing a First Appeal before a Central Public Authority.',
        'ATTACHMENTS: Always enclose a self-attested copy of your original RTI application, postal tracking / receipt, and the CPIO reply letter (if received).',
      ];

      attachmentsChecklist = [
        'Self-attested copy of original Section 6(1) RTI Application',
        'Proof of filing / Postal dispatch receipt / Speed Post tracking report',
        data.receivedNoResponse ? 'Affidavit / Statement confirming no response was received within 30 days' : 'Photocopy of the CPIO decision / reply letter impugned herein',
        data.isBpl ? `Self-attested copy of BPL Card (Card No: ${data.bplCardNumber || 'Attached'})` : 'Copy of original fee receipt',
      ];

      if (data.preferredLanguage === 'hi') {
        draftText = `प्रारूप: सूचना का अधिकार अधिनियम, 2005 की धारा 19(1) के अंतर्गत प्रथम अपील

सेवा में,
प्रथम अपीलीय अधिकारी (First Appellate Authority)
${data.firstAppellateAuthority}
${data.publicAuthority}
${data.faaAddress || 'संबंधित मंत्रालय / विभाग, भारत सरकार / राज्य सरकार'}

विषय: आरटीआई अधिनियम, 2005 की धारा 19(1) के अंतर्गत प्रथम अपील।
(मूल आरटीआई आवेदन दिनांक: ${data.originalRtiDate}${data.originalRtiRegNumber ? `, पंजीकरण सं.: ${data.originalRtiRegNumber}` : ''})

महोदय/महोदया,

1. अपीलार्थी का विवरण:
   (क) पूरा नाम: ${data.applicantName}
   (ख) पिता/पति का नाम: ${data.fatherOrSpouseName || 'उपलब्ध नहीं'}
   (ग) पत्राचार का पता: ${data.address}, ${data.state} - ${data.pincode}
   (घ) दूरभाष / मोबाइल: ${data.phone || 'उपलब्ध नहीं'}
   (ङ) ईमेल आईडी: ${data.email || 'उपलब्ध नहीं'}

2. संबंधित केंद्रीय/राज्य लोक सूचना अधिकारी (CPIO/SPIO) का विवरण:
   अधिकारी / पदनाम: ${data.cpioNameOrDesignation}
   लोक प्राधिकरण: ${data.publicAuthority}

3. मूल आवेदन एवं आदेश का विवरण:
   (क) मूल आरटीआई आवेदन दाखिल करने का दिनांक: ${data.originalRtiDate}
   (ख) मूल आरटीआई पंजीकरण/डाक संख्या: ${data.originalRtiRegNumber || 'संलग्न पावती के अनुसार'}
   (ग) क्या सीपीआईओ से कोई उत्तर प्राप्त हुआ: ${data.receivedNoResponse ? 'नहीं, निर्धारित 30 दिनों में कोई उत्तर नहीं मिला।' : `हाँ, उत्तर दिनांक ${data.cpioReplyDate || 'संलग्न'} को प्राप्त हुआ (असंतोषजनक/अधूरा)।`}

4. अपील के आधार:
${data.groundsOfAppeal.map((g, idx) => `   (${idx + 1}) ${g}`).join('\n')}

5. मांगी गई राहत (Prayer for Relief):
   ${data.specificReliefSought}
   (कृपया सीपीआईओ को आरटीआई अधिनियम की धारा 7(6) के तहत बिना किसी शुल्क के संपूर्ण प्रामाणिक जानकारी तत्काल प्रदान करने का निर्देश दें।)

दिनांक: ${currentDate}
स्थान: ${data.state}

हस्ताक्षर: ________________________
(अपीलार्थी: ${data.applicantName})`;
      } else {
        draftText = `MEMORANDUM OF FIRST APPEAL UNDER SECTION 19(1)
OF THE RIGHT TO INFORMATION ACT, 2005

BEFORE THE FIRST APPELLATE AUTHORITY
${data.firstAppellateAuthority}
${data.publicAuthority}
${data.faaAddress || 'Concerned Public Authority, Government of India / State Government'}

IN THE MATTER OF:
${data.applicantName}                                                ... Appellant
VERSUS
Central/State Public Information Officer (${data.cpioNameOrDesignation}) ... Respondent

SUBJECT: First Appeal under Section 19(1) of the RTI Act, 2005 against ${data.receivedNoResponse ? 'non-furnishing of information within statutory 30-day period' : 'impugned decision/refusal of the CPIO'}.

1. Particulars of the Appellant:
   (a) Full Name: ${data.applicantName}
   (b) Father's / Spouse's Name: ${data.fatherOrSpouseName || 'Not specified'}
   (c) Complete Address: ${data.address}, ${data.state} - ${data.pincode}
   (d) Telephone / Mobile: ${data.phone || 'Not specified'}
   (e) Email: ${data.email || 'Not specified'}

2. Particulars of the Respondent CPIO/SPIO:
   Designation / Name: ${data.cpioNameOrDesignation}
   Public Authority: ${data.publicAuthority}

3. Facts & Chronology of the Case:
   (a) Date of submission of RTI Application under Section 6(1): ${data.originalRtiDate}
   (b) Application / Speed Post Registration No.: ${data.originalRtiRegNumber || 'Attached in Annexure-A'}
   (c) Expiry date of mandatory 30-day response period under Sec 7(1): 30 days from receipt
   (d) CPIO Reply: ${data.receivedNoResponse ? 'No response received till date (Deemed Refusal under Section 7(2))' : `Reply dated ${data.cpioReplyDate || 'Attached'}, which is incomplete/misleading/arbitrary`}

4. Grounds of Appeal:
${data.groundsOfAppeal.map((g, idx) => `   (${idx + 1}) ${g}`).join('\n\n')}

5. Prayer / Relief Sought:
   ${data.specificReliefSought}
   In view of the unreasonable delay/default by the Respondent CPIO, it is respectfully prayed that this Appellate Authority may be pleased to:
   (i) Order the CPIO to immediately supply the complete requested certified records FREE OF COST pursuant to Section 7(6) of the RTI Act, 2005.
   (ii) Direct appropriate disciplinary or penal observation under Section 20 of the Act.

Date: ${currentDate}
Place: ${data.state}

Yours faithfully,

___________________________________
(Signature of Appellant)
Name: ${data.applicantName}`;
      }
    }

    let savedDraftId: string | null = null;

    // If user requested to save draft and is authenticated, persist in DB
    if (data.saveDraft && req.userId) {
      const plan = await prisma.savedActionPlan.create({
        data: {
          userId: req.userId,
          title: title,
          recordId: data.type === 'RTI_REQUEST' ? 'RTI_DRAFT' : 'RTI_FIRST_APPEAL',
          notes: `Public Authority: ${data.publicAuthority}`,
          plan: {
            type: data.type,
            publicAuthority: data.publicAuthority,
            draftText,
            formData: data,
            statutoryReferences,
            filingInstructions,
            attachmentsChecklist,
            steps: [
              { order: 1, text: 'Review and verify draft factual details', completed: true },
              { order: 2, text: data.isBpl ? 'Attach self-attested BPL Card copy' : 'Prepare ₹10 fee via IPO/DD or RTI Online portal', completed: false },
              { order: 3, text: 'Print and sign application draft (or copy paste into rtionline.gov.in)', completed: false },
              { order: 4, text: 'File via Speed Post or RTI Online and note tracking number', completed: false },
              { order: 5, text: 'Await CPIO response (30-day statutory timeline)', completed: false },
            ],
          } as any,
        },
      });
      savedDraftId = plan.id;
    }

    const feePayable = data.type === 'FIRST_APPEAL'
      ? 'NIL (Under Central RTI Rules, no fee is charged for First Appeal)'
      : data.isBpl
        ? 'NIL (Exempt under Section 7(5) of RTI Act 2005 for BPL Cardholders)'
        : '₹10 (Statutory application fee under Rule 3 of RTI Rules 2012)';

    return res.status(200).json({
      success: true,
      data: {
        type: data.type,
        title,
        draftText,
        savedDraftId,
        feePayable,
        statutoryReferences,
        filingInstructions,
        attachmentsChecklist,
        officialPortalUrl: 'https://rtionline.gov.in',
        disclaimer: 'CARbon Setu provides drafting assistance only. This draft is not automatically filed with any government body. The citizen must review, print/save, and officially submit the request.',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('RTI generate error', error);
    return res.status(500).json({ success: false, error: 'Failed to generate RTI draft' });
  }
});

// ── GET /api/rti/drafts — List saved RTI drafts ───────────────────────────
rtiRouter.get('/drafts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.savedActionPlan.findMany({
      where: {
        userId: req.userId!,
        recordId: { in: ['RTI_DRAFT', 'RTI_FIRST_APPEAL'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: plans.map((p) => ({
        id: p.id,
        title: p.title,
        type: (p.plan as any)?.type || (p.recordId === 'RTI_FIRST_APPEAL' ? 'FIRST_APPEAL' : 'RTI_REQUEST'),
        publicAuthority: (p.plan as any)?.publicAuthority || p.notes?.replace('Public Authority: ', ''),
        draftText: (p.plan as any)?.draftText,
        formData: (p.plan as any)?.formData,
        steps: (p.plan as any)?.steps || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Get RTI drafts error', error);
    return res.status(500).json({ success: false, error: 'Failed to get saved RTI drafts' });
  }
});

// ── GET /api/rti/drafts/:id — Single draft ────────────────────────────────
rtiRouter.get('/drafts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.savedActionPlan.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
        recordId: { in: ['RTI_DRAFT', 'RTI_FIRST_APPEAL'] },
      },
    });

    if (!plan) return res.status(404).json({ success: false, error: 'Draft not found' });

    return res.json({
      success: true,
      data: {
        id: plan.id,
        title: plan.title,
        notes: plan.notes,
        ...(plan.plan as any),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get RTI draft detail error', error);
    return res.status(500).json({ success: false, error: 'Failed to get draft details' });
  }
});

// ── PUT /api/rti/drafts/:id — Update draft text or status ─────────────────
rtiRouter.put('/drafts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.savedActionPlan.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
        recordId: { in: ['RTI_DRAFT', 'RTI_FIRST_APPEAL'] },
      },
    });

    if (!plan) return res.status(404).json({ success: false, error: 'Draft not found' });

    const currentPlan = (plan.plan as any) || {};
    const updatedPlan = {
      ...currentPlan,
      draftText: req.body.draftText !== undefined ? req.body.draftText : currentPlan.draftText,
      steps: req.body.steps !== undefined ? req.body.steps : currentPlan.steps,
    };

    const updated = await prisma.savedActionPlan.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title || plan.title,
        notes: req.body.notes !== undefined ? req.body.notes : plan.notes,
        plan: updatedPlan as any,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update RTI draft error', error);
    return res.status(500).json({ success: false, error: 'Failed to update RTI draft' });
  }
});

// ── DELETE /api/rti/drafts/:id — Delete draft ─────────────────────────────
rtiRouter.delete('/drafts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.savedActionPlan.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
        recordId: { in: ['RTI_DRAFT', 'RTI_FIRST_APPEAL'] },
      },
    });

    if (!plan) return res.status(404).json({ success: false, error: 'Draft not found' });

    await prisma.savedActionPlan.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'RTI draft deleted' });
  } catch (error) {
    logger.error('Delete RTI draft error', error);
    return res.status(500).json({ success: false, error: 'Failed to delete RTI draft' });
  }
});
