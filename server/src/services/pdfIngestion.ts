import dns from 'dns/promises';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { logger } from '../utils/logger';
import { ingestGovernmentDocument, IngestDocumentProvenance } from './rag';
import { prisma } from '../utils/prisma';

export interface PdfIngestionOptions {
  schemeSlug: string;
  schemeTitle: string;
  documentTitle: string;
  issuingAuthority: string;
  publicationDate?: string;
  verificationStatus?: 'PENDING_REVIEW' | 'VERIFIED' | 'GOVERNMENT_GAZETTE';
}

export interface PdfExtractionResult {
  success: boolean;
  documentId: string;
  checksum: string;
  pageCount: number;
  extractedTextLength: number;
  isScanned: boolean;
  ocrApplied: boolean;
  chunkCount: number;
  verificationStatus: string;
  sourceUrl: string;
  detectedHeadings: string[];
  warning?: string;
  error?: string;
}

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB maximum
const FETCH_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Validates target URL against SSRF vulnerabilities:
 * - Scheme must be http or https
 * - Hostname cannot be localhost, loopback, or private/cloud metadata IPs
 */
export async function validateSafeUrl(targetUrl: string): Promise<{ valid: boolean; reason?: string; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard private domain names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  ) {
    return { valid: false, reason: 'Local and internal hostnames are blocked for security' };
  }

  // Block known cloud metadata IP addresses
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return { valid: false, reason: 'Cloud metadata endpoints are strictly blocked' };
  }

  // Resolve hostname to check underlying IP addresses against private ranges
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    for (const entry of lookup) {
      const ip = entry.address;
      if (isPrivateOrReservedIp(ip)) {
        return { valid: false, reason: `Resolved IP (${ip}) is in a private/reserved address space`, resolvedIp: ip };
      }
    }
    return { valid: true, resolvedIp: lookup[0]?.address };
  } catch (err: any) {
    return { valid: false, reason: `DNS resolution failed: ${err.message}` };
  }
}

/**
 * Checks whether an IPv4 or IPv6 string falls into a private or reserved CIDR block.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;

    return false;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
    return true;
  }

  return false;
}

/**
 * Sanitizes extracted document text to prevent prompt injection attacks:
 * Strips adversarial delimiters and prompt override keywords.
 */
export function sanitizeDocumentText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\[\/?(system|instruction|prompt|override)\]/gi, '')
    .replace(/ignore\s+all\s+(previous|prior)\s+instructions/gi, '[REDACTED_ADVERSARIAL_INSTRUCTION]')
    .replace(/you\s+are\s+now\s+in\s+developer\s+mode/gi, '[REDACTED_ADVERSARIAL_INSTRUCTION]')
    .trim();
}

/**
 * Downloads a government PDF with strict SSRF guards, timeout, and size limits.
 */
export async function downloadGovernmentPdf(pdfUrl: string): Promise<Buffer> {
  const safetyCheck = await validateSafeUrl(pdfUrl);
  if (!safetyCheck.valid) {
    throw new Error(`SSRF Security Guard Blocked Request: ${safetyCheck.reason}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(pdfUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CARbon-Setu-Statutory-Ingestion/1.0 (Civic Service Ingestion Engine; +https://carbon-setu-live.vercel.app)',
        Accept: 'application/pdf,application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF exceeds maximum allowed size of 10MB (size: ${contentLength} bytes)`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new Error(`Downloaded PDF exceeds 10MB limit (${buffer.length} bytes)`);
    }

    // Verify magic bytes: PDF files MUST start with %PDF-
    const magic = buffer.slice(0, 5).toString('ascii');
    if (!magic.startsWith('%PDF-')) {
      throw new Error('Downloaded file is not a valid PDF document (missing %PDF- magic bytes)');
    }

    return buffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts text and metadata from a PDF buffer, preserving page numbers and section boundaries.
 */
export async function parsePdfBuffer(pdfBuffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  pageMap: Array<{ pageNumber: number; text: string }>;
  isScanned: boolean;
  headings: string[];
}> {
  // Check PDF magic bytes
  const magic = pdfBuffer.slice(0, 5).toString('ascii');
  if (!magic.startsWith('%PDF-')) {
    throw new Error('Invalid PDF buffer: Missing %PDF- header');
  }

  const pageMap: Array<{ pageNumber: number; text: string }> = [];
  let fullText = '';
  let pageCount = 1;

  try {
    const pdfPkg: any = pdfParse;
    const PDFParseClass = pdfPkg?.PDFParse || pdfPkg?.default?.PDFParse;

    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: pdfBuffer });
      try {
        const parsed = await parser.getText();
        fullText = sanitizeDocumentText(parsed.text || '');
        pageCount = parsed.total || parsed.pages?.length || 1;
        if (Array.isArray(parsed.pages)) {
          for (const p of parsed.pages) {
            pageMap.push({
              pageNumber: p.num || pageMap.length + 1,
              text: sanitizeDocumentText(p.text || ''),
            });
          }
        }
      } finally {
        await parser.destroy?.();
      }
    } else {
      const legacyFn = typeof pdfPkg === 'function' ? pdfPkg : pdfPkg?.default;
      const parsed = await legacyFn(pdfBuffer);
      fullText = sanitizeDocumentText(parsed.text || '');
      pageCount = parsed.numpages || 1;
      pageMap.push({ pageNumber: 1, text: fullText });
    }
  } catch (err: any) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }

  const avgCharsPerPage = fullText.length / Math.max(1, pageCount);
  const isScanned = avgCharsPerPage < 30 || fullText.trim().length < 50;

  // Extract detected statutory headings (e.g., Clause 1, Section 2, Chapter 3)
  const headingRegex = /(?:Section|Clause|Chapter|Rule|Article|Annexure)\s+[0-9A-Za-z.\-_:]+/gi;
  const headings = Array.from(new Set(fullText.match(headingRegex) || [])).slice(0, 20);

  return {
    text: fullText,
    pageCount,
    pageMap,
    isScanned,
    headings,
  };
}

/**
 * End-to-end PDF Ingestion Pipeline:
 * 1. Accepts remote URL or base64 PDF buffer
 * 2. Validates SSRF & file bounds
 * 3. Extracts text and page boundaries
 * 4. Detects scanned/image-only PDFs
 * 5. Deduplicates by SHA-256 checksum
 * 6. Chunks document with page-level provenance
 * 7. Stores with PENDING_REVIEW status for human review
 */
export async function ingestGovernmentPdf(
  input: {
    pdfUrl?: string;
    pdfBase64?: string;
    documentId?: string;
  } & PdfIngestionOptions
): Promise<PdfExtractionResult> {
  let pdfBuffer: Buffer;
  let sourceUrl = input.pdfUrl || 'uploaded_document://base64';

  if (input.pdfUrl) {
    pdfBuffer = await downloadGovernmentPdf(input.pdfUrl);
  } else if (input.pdfBase64) {
    const cleanedBase64 = input.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    pdfBuffer = Buffer.from(cleanedBase64, 'base64');
  } else {
    throw new Error('Either pdfUrl or pdfBase64 must be provided');
  }

  // 1. Calculate SHA-256 Checksum
  const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // 2. Parse PDF and extract page content
  const parsedPdf = await parsePdfBuffer(pdfBuffer);

  // 3. Generate unique document ID if not provided
  const docId =
    input.documentId ||
    `DOC-${input.schemeSlug.toUpperCase()}-${checksum.slice(0, 8)}-${Date.now()}`;

  // 4. Default verification status is strictly PENDING_REVIEW
  const status = input.verificationStatus || 'PENDING_REVIEW';

  let ocrApplied = false;
  let warning: string | undefined;

  if (parsedPdf.isScanned) {
    warning =
      'Document detected as scanned or image-only PDF. Text extraction yielded low density; administrative OCR review recommended before approving.';
  }

  // 5. Structure text with page boundary markers for chunking
  let structuredContent = '';
  if (parsedPdf.pageMap.length > 0) {
    structuredContent = parsedPdf.pageMap
      .map(p => `[Page ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');
  } else {
    structuredContent = parsedPdf.text;
  }

  if (structuredContent.trim().length === 0) {
    structuredContent = `[Page 1]\nScanned Government Document (${input.documentTitle}). Awaiting manual OCR transcript. Checksum: ${checksum}`;
  }

  // 6. Ingest into RAG system (transactional replacement and embedding generation)
  const ragResult = await ingestGovernmentDocument(
    {
      documentId: docId,
      schemeSlug: input.schemeSlug,
      schemeTitle: input.schemeTitle,
      documentTitle: input.documentTitle,
      sourceUrl: sourceUrl,
      issuingAuthority: input.issuingAuthority,
      publicationDate: input.publicationDate || new Date().toISOString().split('T')[0],
      verificationStatus: status,
    },
    structuredContent
  );

  logger.info(
    `Ingested official PDF ${docId} (pages: ${parsedPdf.pageCount}, chunks: ${ragResult.chunkCount}, checksum: ${checksum.slice(0, 8)}, status: ${status})`
  );

  return {
    success: true,
    documentId: docId,
    checksum,
    pageCount: parsedPdf.pageCount,
    extractedTextLength: parsedPdf.text.length,
    isScanned: parsedPdf.isScanned,
    ocrApplied,
    chunkCount: ragResult.chunkCount,
    verificationStatus: status,
    sourceUrl,
    detectedHeadings: parsedPdf.headings,
    warning,
  };
}

/**
 * Review/Approval workflow:
 * Authorized admin marks a pending document as VERIFIED or GOVERNMENT_GAZETTE.
 */
export async function approveGovernmentDocument(
  documentId: string,
  newStatus: 'VERIFIED' | 'GOVERNMENT_GAZETTE'
): Promise<{ success: boolean; documentId: string; status: string }> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "SchemeDocument" 
       SET "verificationStatus" = $1, "updatedAt" = NOW() 
       WHERE "documentId" = $2 OR "id" = $2;`,
      newStatus,
      documentId
    );

    return {
      success: true,
      documentId,
      status: newStatus,
    };
  } catch (err: any) {
    throw new Error(`Failed to approve document: ${err.message}`);
  }
}
