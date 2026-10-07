// ============================================================
// LeadLens — Web Scraper
// Ethical scraping: respects robots.txt, rate limits, public data only
// ============================================================

import * as cheerio from "cheerio";
import { ScrapeResult, SocialLinks } from "./types";
import { domainToUrl } from "./utils";

const USER_AGENT = "LeadLens/1.0 (Lead Generation Tool; +https://leadlens.vercel.app)";
const FETCH_TIMEOUT = 8000; // 8 seconds
const MAX_RETRIES = 1;

/** Fetch a URL with timeout and retry logic */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            const response = await fetch(url, {
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                signal: controller.signal,
                redirect: "follow",
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (attempt < retries) continue;
                return null;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) {
                return null;
            }

            return await response.text();
        } catch (error) {
            if (attempt < retries) continue;
            console.error(`Failed to fetch ${url}:`, error);
            return null;
        }
    }
    return null;
}

/** robots.txt text per domain, fetched once per request lifecycle */
const robotsCache = new Map<string, string | null>();

async function getRobotsTxt(domain: string): Promise<string | null> {
    if (robotsCache.has(domain)) return robotsCache.get(domain) ?? null;
    const text = await fetchWithRetry(`${domainToUrl(domain)}/robots.txt`, 0);
    robotsCache.set(domain, text);
    return text;
}

/** Check robots.txt to see if we can scrape a path (respects User-agent: * and LeadLens rules) */
export async function checkRobotsTxt(domain: string, path: string = "/"): Promise<boolean> {
    try {
        const text = await getRobotsTxt(domain);
        if (!text) return true; // No robots.txt = allowed

        let isRelevantAgent = false;
        let lastWasAgent = false;
        const disallowed: string[] = [];
        const allowed: string[] = [];

        for (const rawLine of text.split("\n")) {
            const line = rawLine.split("#")[0].trim();
            if (!line) continue;
            const [rawKey, ...rest] = line.split(":");
            const key = rawKey.trim().toLowerCase();
            const value = rest.join(":").trim();

            if (key === "user-agent") {
                const agent = value.toLowerCase();
                const relevant = agent === "*" || agent.includes("leadlens");
                // consecutive user-agent lines share one group
                isRelevantAgent = lastWasAgent ? isRelevantAgent || relevant : relevant;
                lastWasAgent = true;
                continue;
            }
            lastWasAgent = false;
            if (!isRelevantAgent) continue;
            // An empty "Disallow:" means everything is allowed
            if (key === "disallow" && value) disallowed.push(value);
            if (key === "allow" && value) allowed.push(value);
        }

        const longestMatch = (rules: string[]) =>
            rules.filter((r) => path.startsWith(r.replace(/\*$/, ""))).reduce((max, r) => Math.max(max, r.length), -1);

        // Most specific rule wins (Google's robots.txt semantics)
        return longestMatch(allowed) >= longestMatch(disallowed);
    } catch {
        return true; // If we can't read robots.txt, assume allowed
    }
}

/** Extract emails from HTML text */
function extractEmails(html: string, text: string): string[] {
    const emailSet = new Set<string>();

    // Extract from mailto: links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
        emailSet.add(match[1].toLowerCase());
    }

    // Extract from visible text  
    const textEmailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    while ((match = textEmailRegex.exec(text)) !== null) {
        const email = match[0].toLowerCase();
        // Filter out common false positives
        if (!email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".svg") && !email.endsWith(".css") && !email.endsWith(".js")) {
            emailSet.add(email);
        }
    }

    return Array.from(emailSet);
}

/** Extract phone numbers: tel: links first (most reliable), then text patterns with 10-15 digits */
function extractPhones(text: string, html = ""): string[] {
    const phoneSet = new Set<string>();
    const seenDigits = new Set<string>();
    const add = (raw: string) => {
        const phone = raw.replace(/\s+/g, " ").trim();
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) return;
        if (/^(\d)\1+$/.test(digits)) return; // 0000000000 etc.
        if (/^((19|20)\d{2}[\s.-]?){2,}$/.test(phone)) return; // year ranges like "2024 2025 2026"
        if (seenDigits.has(digits.slice(-10))) return;
        seenDigits.add(digits.slice(-10));
        phoneSet.add(phone);
    };

    let match;
    const telRegex = /href=["']tel:([^"']+)["']/gi;
    while ((match = telRegex.exec(html)) !== null) add(decodeURIComponent(match[1]));

    const phoneRegex = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}/g;
    while ((match = phoneRegex.exec(text)) !== null) add(match[0]);

    return Array.from(phoneSet).slice(0, 5);
}

/** Extract social media links */
function extractSocialLinks($: cheerio.CheerioAPI): SocialLinks {
    const social: SocialLinks = {};

    $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";

        if (href.includes("linkedin.com") && !social.linkedin) {
            social.linkedin = href;
        }
        if ((href.includes("twitter.com") || href.includes("x.com")) && !social.twitter) {
            social.twitter = href;
        }
        if (href.includes("facebook.com") && !social.facebook) {
            social.facebook = href;
        }
    });

    return social;
}

/** Extract company name from page: og:site_name > application-name > best title segment > domain */
function extractCompanyName($: cheerio.CheerioAPI, url: string): string {
    const host = url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    const root = host.split(".")[0].toLowerCase();
    const fromDomain = root.charAt(0).toUpperCase() + root.slice(1);

    const clean = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim();
    const ogSiteName = clean($('meta[property="og:site_name"]').attr("content"));
    if (ogSiteName && ogSiteName.length <= 40) return ogSiteName;
    const appName = clean($('meta[name="application-name"]').attr("content"));
    if (appName && appName.length <= 40) return appName;

    const title = clean($("title").first().text());
    if (title) {
        const parts = title.split(/\s[|\-–—:]\s|\s?[|–—]\s?/).map((p) => p.trim()).filter(Boolean);
        // Prefer the title segment that contains the domain's brand word
        const brandPart = parts.find((p) => p.toLowerCase().replace(/[^a-z0-9]/g, "").includes(root));
        if (brandPart && brandPart.length <= 40) return brandPart;
        const short = parts.find((p) => p.length <= 25);
        if (short && short.toLowerCase().includes(root)) return short;
    }
    return fromDomain;
}

/** Scrape a single page and extract data */
async function scrapePage(url: string): Promise<{
    html: string;
    text: string;
    emails: string[];
    phones: string[];
    socialLinks: SocialLinks;
    companyName: string;
    description: string;
    $: cheerio.CheerioAPI;
} | null> {
    const html = await fetchWithRetry(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Remove script and style elements for clean text
    $("script, style, noscript, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        text.substring(0, 300);

    return {
        html,
        text,
        emails: extractEmails(html, text),
        phones: extractPhones(text, html),
        socialLinks: extractSocialLinks($),
        companyName: extractCompanyName($, url),
        description: description.substring(0, 500),
        $,
    };
}

/** Scrape a company website — homepage + /about + /contact */
export async function scrapeCompany(domain: string): Promise<ScrapeResult> {
    const baseUrl = domainToUrl(domain);
    const result: ScrapeResult = {
        companyName: domain,
        description: "",
        emails: [],
        phones: [],
        socialLinks: {},
    };

    const allEmails = new Set<string>();
    const allPhones = new Set<string>();
    let socialLinks: SocialLinks = {};

    // Pages to scrape
    const pages = [
        { path: "/", url: baseUrl },
        { path: "/about", url: `${baseUrl}/about` },
        { path: "/contact", url: `${baseUrl}/contact` },
    ];

    for (const page of pages) {
        // Check robots.txt
        const allowed = await checkRobotsTxt(domain, page.path);
        if (!allowed) continue;

        const data = await scrapePage(page.url);
        if (!data) continue;

        // Use homepage data for name and description
        if (page.path === "/") {
            result.companyName = data.companyName;
            result.description = data.description;
            result.rawText = data.text.substring(0, 1000);
        }

        // About page might have better description
        if (page.path === "/about" && data.description && data.description.length > (result.description?.length || 0)) {
            result.description = data.description;
        }

        // Collect contact info
        if (page.path === "/contact") {
            result.contactPageUrl = page.url;
        }

        data.emails.forEach((e) => allEmails.add(e));
        data.phones.forEach((p) => allPhones.add(p));
        socialLinks = { ...socialLinks, ...data.socialLinks };
    }

    result.emails = Array.from(allEmails);
    result.phones = Array.from(allPhones);
    result.socialLinks = socialLinks;

    // Try to detect country from common patterns
    const countryHints = result.description + " " + (result.rawText || "");
    if (/united states|usa|u\.s\./i.test(countryHints)) result.countryHint = "United States";
    else if (/united kingdom|\buk\b|britain|london/i.test(countryHints)) result.countryHint = "United Kingdom";
    else if (/canada|canadian/i.test(countryHints)) result.countryHint = "Canada";
    else if (/australia|australian/i.test(countryHints)) result.countryHint = "Australia";
    else if (/india|indian/i.test(countryHints)) result.countryHint = "India";
    else if (/germany|german/i.test(countryHints)) result.countryHint = "Germany";

    return result;
}
