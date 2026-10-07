import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Normalize a URL: add https://, remove www., remove trailing slash */
export function normalizeUrl(input: string): string {
    let url = input.trim().toLowerCase();

    // Remove protocol if present
    url = url.replace(/^(https?:\/\/)/, "");

    // Remove www.
    url = url.replace(/^www\./, "");

    // Remove trailing slash
    url = url.replace(/\/+$/, "");

    // Remove any path/query/hash for domain extraction
    const domain = url.split("/")[0].split("?")[0].split("#")[0];

    return domain;
}

/** Add https:// prefix to a domain */
export function domainToUrl(domain: string): string {
    return `https://${domain}`;
}

/** Parse URLs from text input (one per line) */
export function parseUrlInput(text: string): string[] {
    return text
        .split(/[\n,]+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map(normalizeUrl)
        .filter((domain) => {
            // Basic domain validation
            return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}(\.[a-z]{2,})?$/.test(domain);
        });
}

/** Deduplicate an array of domains */
export function deduplicateDomains(domains: string[]): {
    unique: string[];
    duplicatesRemoved: number;
} {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const domain of domains) {
        if (!seen.has(domain)) {
            seen.add(domain);
            unique.push(domain);
        }
    }

    return {
        unique,
        duplicatesRemoved: domains.length - unique.length,
    };
}

/** Generate a unique ID */
export function generateId(): string {
    return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
}

/** Format a score as a color class */
export function getScoreColor(score: number): string {
    if (score >= 75) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
}

export function getScoreBgColor(score: number): string {
    if (score >= 75) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    if (score >= 50) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    return "bg-red-500/15 text-red-500 border-red-500/30";
}

export function getFitColor(fit: string): string {
    switch (fit) {
        case "High":
            return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
        case "Medium":
            return "bg-amber-500/15 text-amber-500 border-amber-500/30";
        case "Low":
            return "bg-red-500/15 text-red-500 border-red-500/30";
        default:
            return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
    }
}
