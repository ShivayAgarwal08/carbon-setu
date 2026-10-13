import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';
import { UserProfileData } from './eligibility';

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genai) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genai;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

interface ClassificationResult {
  categories: string[];
  beneficiaryType: string | null;
  urgency: 'high' | 'medium' | 'low';
  missingFields: string[];
  followUpQuestions: string[];
  extractedProfile: Partial<UserProfileData>;
}

/**
 * Classify user's problem and extract profile information.
 */
export async function classifyAndExtract(
  problem: string,
  existingProfile: Partial<UserProfileData> = {}
): Promise<ClassificationResult> {
  const client = getClient();

  const fallback: ClassificationResult = {
    categories: inferCategoriesFromText(problem),
    beneficiaryType: inferBeneficiaryFromText(problem),
    urgency: 'medium',
    missingFields: getMissingFields(existingProfile),
    followUpQuestions: generateFallbackQuestions(existingProfile),
    extractedProfile: extractProfileFromText(problem),
  };

  if (!client) {
    logger.warn('Gemini not available, using fallback classification');
    return fallback;
  }

  try {
    const prompt = `You are an AI assistant for CARbon Setu, an Indian government benefits discovery platform. You are NOT a government website and cannot approve applications.

Analyze the following user problem and extract relevant information.

User's problem: "${problem}"

Existing profile: ${JSON.stringify(existingProfile)}

Respond ONLY in valid JSON with these fields:
{
  "categories": ["AGRICULTURE", "EDUCATION", "HEALTHCARE", "WOMEN_AND_FAMILY", "SMALL_BUSINESS", "PENSION_SOCIAL_SECURITY", "SAVINGS", "GOVERNMENT_SERVICES", "HOUSING", "EMPLOYMENT", "OTHER"],
  "beneficiaryType": "farmer|student|employee|business_owner|senior_citizen|woman|child|general|null",
  "urgency": "high|medium|low",
  "missingFields": ["state", "age", "income", "occupation", "gender", "areaType", "category"],
  "followUpQuestions": ["Question 1?", "Question 2?"],
  "extractedProfile": { "state": "...", "occupation": "...", "category": "..." }
}

Rules:
- Only include categories relevant to the problem
- Follow-up questions should be simple, in plain language
- Only ask for genuinely useful information
- Do not ask for Aadhaar, bank details, or passwords
- Extract any profile info that's clearly stated
- List fields that would help narrow down recommendations`;

    const response = await client.models.generateContent({
      model: getModelName(),
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text?.trim() || '';
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        categories: Array.isArray(parsed.categories) ? parsed.categories : fallback.categories,
        beneficiaryType: parsed.beneficiaryType || fallback.beneficiaryType,
        urgency: ['high', 'medium', 'low'].includes(parsed.urgency) ? parsed.urgency : 'medium',
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : fallback.missingFields,
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions.slice(0, 3) : fallback.followUpQuestions,
        extractedProfile: parsed.extractedProfile || fallback.extractedProfile,
      };
    }

    return fallback;
  } catch (error) {
    logger.error('Gemini classification error', error);
    return fallback;
  }
}

/**
 * Generate explanation and action plan for recommended records.
 */
export async function explainRecommendations(
  problem: string,
  profile: Partial<UserProfileData>,
  records: Array<{
    title: string;
    shortDescription: string;
    detailedDescription: string;
    benefits: string | null;
    eligibilityDetails: string | null;
    applicationProcess: string | null;
    officialUrl: string | null;
    requiredDocuments: string[];
    sourceUrl: string | null;
    lastVerifiedAt: Date | null;
    matchReasons: string[];
    missingInfo: string[];
    relevanceLabel: string;
  }>
): Promise<string> {
  const client = getClient();

  if (!client || records.length === 0) {
    return generateFallbackExplanation(records);
  }

  try {
    const recordSummaries = records.map((r, i) => `
Record ${i + 1}: ${r.title}
- Description: ${r.shortDescription}
- Benefits: ${r.benefits || 'See official source'}
- Eligibility: ${r.eligibilityDetails || 'See official source'}
- Application: ${r.applicationProcess || 'See official source'}
- Official URL: ${r.officialUrl || 'N/A'}
- Source: ${r.sourceUrl || 'N/A'}
- Last verified: ${r.lastVerifiedAt ? r.lastVerifiedAt.toISOString().split('T')[0] : 'Not recently verified'}
- Match reasons: ${r.matchReasons.join(', ')}
- Missing info: ${r.missingInfo.join(', ') || 'None'}
- Relevance: ${r.relevanceLabel}
`).join('\n');

    const prompt = `You are an assistant for CARbon Setu, an INDEPENDENT Indian government benefits discovery platform. You are NOT a government website and CANNOT approve applications or guarantee eligibility.

User's problem: "${problem}"
User's profile: ${JSON.stringify(profile)}

Here are government records that may be relevant (from our verified database):
${recordSummaries}

Write a helpful, clear explanation in plain language. For each relevant record:
1. Explain why it might help the user
2. Summarize the key benefits
3. List what documents/info they might need
4. Explain the application process simply
5. Mention what additional information would help confirm eligibility
6. Include the official URL for verification

CRITICAL RULES:
- ONLY discuss the records provided above. Do NOT invent or mention schemes not listed.
- Do NOT fabricate interest rates, deadlines, phone numbers, or any factual details not present in the records.
- If information is missing, say "Please verify this detail at the official source."
- Clearly state that this is informational guidance, not an official determination.
- If verification date is old, mention that the user should check for updates.
- Keep language simple and accessible.
- Format with clear headings and bullet points.`;

    const response = await client.models.generateContent({
      model: getModelName(),
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    return response.text || generateFallbackExplanation(records);
  } catch (error) {
    logger.error('Gemini explanation error', error);
    return generateFallbackExplanation(records);
  }
}

/**
 * Process a follow-up message in an intake conversation.
 */
export async function processFollowUp(
  conversationHistory: Array<{ role: string; content: string }>,
  latestMessage: string,
  currentProfile: Partial<UserProfileData>
): Promise<{
  response: string;
  extractedData: Partial<UserProfileData>;
  isComplete: boolean;
}> {
  const client = getClient();

  const fallback = {
    response: 'Thank you for that information. Let me search for relevant government schemes and services based on what you have shared.',
    extractedData: extractProfileFromText(latestMessage),
    isComplete: true,
  };

  if (!client) {
    return fallback;
  }

  try {
    const historyStr = conversationHistory
      .slice(-6)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `You are an AI assistant for CARbon Setu, helping Indian citizens discover government schemes.

Conversation so far:
${historyStr}

Current user profile data: ${JSON.stringify(currentProfile)}

Latest user message: "${latestMessage}"

Tasks:
1. Extract any profile data from the user's message (state, age, income, occupation, category, gender, area_type, etc.)
2. Determine if you have enough info to search for schemes (need at least: the problem + 1-2 profile details)
3. If more info needed, ask ONE clear follow-up question
4. If enough info, confirm you'll search for relevant schemes

Respond in JSON:
{
  "response": "Your conversational response to the user",
  "extractedData": { "field": "value" },
  "isComplete": true/false
}

Keep responses warm, simple, and conversational. Do not ask for Aadhaar, bank details, or passwords.`;

    const response = await client.models.generateContent({
      model: getModelName(),
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response: parsed.response || fallback.response,
        extractedData: parsed.extractedData || {},
        isComplete: parsed.isComplete ?? true,
      };
    }

    return fallback;
  } catch (error) {
    logger.error('Gemini follow-up error', error);
    return fallback;
  }
}

// ── Fallback helpers (work without Gemini) ──────────────────────────────

function inferCategoriesFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const categories: string[] = [];

  if (/farm|crop|agri|kisan|kheti|fasal/.test(lower)) categories.push('AGRICULTURE');
  if (/student|college|school|scholarship|education|study|padhai/.test(lower)) categories.push('EDUCATION');
  if (/health|hospital|medical|doctor|treatment|ilaj|bimar/.test(lower)) categories.push('HEALTHCARE');
  if (/woman|women|girl|mahila|ladki|widow|vidhwa|maternity/.test(lower)) categories.push('WOMEN_AND_FAMILY');
  if (/business|startup|msme|udyam|entrepreneur|vyapar/.test(lower)) categories.push('SMALL_BUSINESS');
  if (/pension|senior|old age|vridha|retire/.test(lower)) categories.push('PENSION_SOCIAL_SECURITY');
  if (/saving|deposit|ppf|nsc|sukanya|post office/.test(lower)) categories.push('SAVINGS');
  if (/complaint|grievance|helpline|department|service/.test(lower)) categories.push('GOVERNMENT_SERVICES');
  if (/house|home|awas|housing|shelter/.test(lower)) categories.push('HOUSING');
  if (/job|employ|work|naukri|rojgar/.test(lower)) categories.push('EMPLOYMENT');

  return categories.length > 0 ? categories : ['OTHER'];
}

function inferBeneficiaryFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (/farmer|kisan/.test(lower)) return 'farmer';
  if (/student|vidyarthi/.test(lower)) return 'student';
  if (/woman|women|mahila/.test(lower)) return 'woman';
  if (/senior|old|vridha|retire/.test(lower)) return 'senior_citizen';
  if (/business|entrepreneur|vyapari/.test(lower)) return 'business_owner';
  if (/employee|worker|karmchari/.test(lower)) return 'employee';
  return null;
}

function extractProfileFromText(text: string): Partial<UserProfileData> {
  const profile: Partial<UserProfileData> = {};
  const lower = text.toLowerCase();

  // State detection
  const states = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'jammu and kashmir', 'ladakh',
  ];
  for (const state of states) {
    if (lower.includes(state)) {
      profile.state = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  // Occupation / category
  if (/farmer|kisan/.test(lower)) { profile.occupation = 'farmer'; profile.category = 'farmer'; }
  if (/student/.test(lower)) { profile.occupation = 'student'; profile.category = 'student'; }
  if (/business/.test(lower)) { profile.occupation = 'business_owner'; profile.category = 'business_owner'; }

  // Area type
  if (/rural|village|gaon/.test(lower)) profile.areaType = 'rural';
  if (/urban|city|shahar/.test(lower)) profile.areaType = 'urban';

  // Gender
  if (/\b(woman|female|lady|girl|mahila)\b/.test(lower)) profile.gender = 'female';
  if (/\b(man|male|ladka)\b/.test(lower)) profile.gender = 'male';

  return profile;
}

function getMissingFields(profile: Partial<UserProfileData>): string[] {
  const important = ['state', 'category', 'occupation'];
  const nice = ['ageRange', 'incomeRange', 'areaType', 'gender'];
  const missing: string[] = [];

  for (const field of important) {
    if (!profile[field]) missing.push(field);
  }
  for (const field of nice) {
    if (!profile[field]) missing.push(field);
  }

  return missing;
}

function generateFallbackQuestions(profile: Partial<UserProfileData>): string[] {
  const questions: string[] = [];

  if (!profile.state) questions.push('Which state do you live in?');
  if (!profile.category && !profile.occupation) questions.push('What is your occupation or primary role? (e.g., farmer, student, business owner)');
  if (!profile.ageRange) questions.push('What is your approximate age group?');

  return questions.slice(0, 3);
}

function generateFallbackExplanation(
  records: Array<{ title: string; shortDescription: string; officialUrl: string | null; matchReasons: string[] }>
): string {
  if (records.length === 0) {
    return 'We could not find matching government schemes in our current database. Please try browsing all available records or refining your search. Our database covers a limited selection of schemes and is regularly being expanded.';
  }

  let text = '## Relevant Government Schemes Found\n\n';
  text += '*Note: This is informational guidance from CARbon Setu, not an official government determination.*\n\n';

  for (const record of records) {
    text += `### ${record.title}\n`;
    text += `${record.shortDescription}\n\n`;
    if (record.matchReasons.length > 0) {
      text += `**Why this may be relevant:** ${record.matchReasons.join(', ')}\n\n`;
    }
    if (record.officialUrl) {
      text += `**Official source:** ${record.officialUrl}\n\n`;
    }
    text += '---\n\n';
  }

  text += '*Please verify all details at the official government sources linked above. CARbon Setu is an independent platform and cannot guarantee eligibility or approval.*';

  return text;
}
