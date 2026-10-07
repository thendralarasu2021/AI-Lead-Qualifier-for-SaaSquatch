// ============================================================
// LeadLens — Email Validation
// Format check, MX record verification, generic vs personal classification
// ============================================================

import { EmailInfo } from "./types";

/** Common generic email prefixes */
const GENERIC_PREFIXES = [
    "info",
    "contact",
    "sales",
    "support",
    "hello",
    "admin",
    "help",
    "team",
    "office",
    "service",
    "mail",
    "enquiry",
    "inquiry",
    "general",
    "billing",
    "noreply",
    "no-reply",
    "marketing",
    "hr",
    "careers",
    "jobs",
    "press",
    "media",
    "webmaster",
    "postmaster",
];

/** Patterns that indicate fake/placeholder emails */
const FAKE_PATTERNS = [
    "example.com",
    "example.org",
    "test.com",
    "test@",
    "sample@",
    "demo@",
    "email@email",
    "your@",
    "name@",
    "user@",
    "placeholder",
    "abc@",
    "123@",
    "domain.com",
    "yoursite.com",
    "yourdomain.com",
    "sentry.io",
    "wixpress.com",
    "sentry-next",
];

/** Validate email format using regex */
export function validateEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/** Check if email is generic (info@, contact@, etc.) vs personal */
export function classifyEmail(email: string): "personal" | "generic" {
    const localPart = email.split("@")[0].toLowerCase();
    return GENERIC_PREFIXES.includes(localPart) ? "generic" : "personal";
}

/** Check if email looks fake/placeholder */
export function isFakeEmail(email: string): boolean {
    const lower = email.toLowerCase();
    return FAKE_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Check MX records for a domain (must be called server-side) */
export async function checkMXRecord(domain: string): Promise<boolean> {
    try {
        // Use DNS over HTTPS (works in Edge runtime / serverless)
        const response = await fetch(
            `https://dns.google/resolve?name=${domain}&type=MX`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (!response.ok) return false;

        const data = await response.json();
        return data.Answer && data.Answer.length > 0;
    } catch {
        // If DNS check fails, give benefit of doubt
        return true;
    }
}

/** Validate and enrich a list of emails */
export async function validateEmails(emails: string[]): Promise<EmailInfo[]> {
    const results: EmailInfo[] = [];
    const seenDomains = new Map<string, boolean>();

    for (const email of emails) {
        // Skip invalid format
        if (!validateEmailFormat(email)) continue;

        // Skip fake emails
        if (isFakeEmail(email)) continue;

        const domain = email.split("@")[1];

        // Check MX records (cache per domain)
        let hasMX: boolean;
        if (seenDomains.has(domain)) {
            hasMX = seenDomains.get(domain)!;
        } else {
            hasMX = await checkMXRecord(domain);
            seenDomains.set(domain, hasMX);
        }

        results.push({
            email,
            isValid: hasMX,
            hasMX,
            type: classifyEmail(email),
        });
    }

    return results;
}
