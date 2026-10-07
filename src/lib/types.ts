// ============================================================
// LeadLens — Core TypeScript Types
// ============================================================

/** Ideal Customer Profile configuration from the wizard Step 2 */
export interface ICPConfig {
  targetIndustry: string;
  targetLocation: string;
  companyType: "B2B" | "B2C" | "Both";
  whatISell: string;
}

/** Social media links extracted from a website */
export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
}

/** Email information after validation */
export interface EmailInfo {
  email: string;
  isValid: boolean;
  hasMX: boolean;
  type: "personal" | "generic";
}

/** Raw data extracted from scraping */
export interface ScrapeResult {
  companyName: string;
  description: string;
  emails: string[];
  phones: string[];
  socialLinks: SocialLinks;
  contactPageUrl?: string;
  countryHint?: string;
  rawText?: string;
}

/** AI scoring result from Gemini */
export interface AIScore {
  score: number; // 0-100
  fit: "High" | "Medium" | "Low";
  reason: string;
  industry: string;
  outreach_line: string;
  source?: "gemini" | "rules";
}

/** Full enriched lead data */
export interface EnrichedLead {
  id: string;
  domain: string;
  companyName: string;
  description: string;
  emails: EmailInfo[];
  phones: string[];
  socialLinks: SocialLinks;
  contactPageUrl?: string;
  countryHint?: string;
  aiScore?: AIScore;
  status: "pending" | "processing" | "completed" | "failed" | "blocked";
  errorMessage?: string;
  cachedResult?: boolean;
}

/** API request body for /api/enrich */
export interface EnrichRequest {
  domains: string[];
  icp: ICPConfig;
}

/** Progress update sent via streaming */
export interface ProgressUpdate {
  type: "progress" | "result" | "complete" | "error";
  processed: number;
  total: number;
  lead?: EnrichedLead;
  message?: string;
  duplicatesRemoved?: number;
}

/** Supabase leads_cache row */
export interface LeadsCacheRow {
  id: string;
  domain: string;
  scraped_data: ScrapeResult & { aiScore?: AIScore; emails?: EmailInfo[] };
  scraped_at: string;
}

/** Summary statistics for the results page */
export interface ResultsSummary {
  totalLeads: number;
  highFitLeads: number;
  verifiedEmails: number;
  duplicatesRemoved: number;
}
