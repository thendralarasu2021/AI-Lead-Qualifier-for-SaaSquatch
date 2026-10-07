// ============================================================
// LeadLens — Main Enrich API Route
// POST /api/enrich
// Streams NDJSON results with concurrency control (max 4 parallel)
// ============================================================

import { NextRequest } from "next/server";
import { scrapeCompany, checkRobotsTxt } from "@/lib/scraper";
import { validateEmails } from "@/lib/validate";
import { scoreLeadWithAI } from "@/lib/ai";
import { getCachedLead, setCachedLead } from "@/lib/cache";
import { deduplicateDomains, generateId } from "@/lib/utils";
import {
    EnrichRequest,
    EnrichedLead,
    ProgressUpdate,
    EmailInfo,
    ScrapeResult,
} from "@/lib/types";

export const maxDuration = 60; // Vercel serverless timeout

/** Semaphore for concurrency control */
class Semaphore {
    private queue: (() => void)[] = [];
    private current = 0;

    constructor(private max: number) { }

    async acquire(): Promise<void> {
        if (this.current < this.max) {
            this.current++;
            return;
        }
        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        this.current--;
        const next = this.queue.shift();
        if (next) {
            this.current++;
            next();
        }
    }
}

/** Process a single domain */
async function processDomain(
    domain: string,
    icp: EnrichRequest["icp"]
): Promise<EnrichedLead> {
    const lead: EnrichedLead = {
        id: generateId(),
        domain,
        companyName: domain,
        description: "",
        emails: [],
        phones: [],
        socialLinks: {},
        status: "processing",
    };

    try {
        // 1. Check cache first (scraped + validated data only; scoring always uses the current ICP)
        const cached = await getCachedLead(domain);
        if (cached) {
            const data = cached.scraped_data;
            const emails = (data.emails as unknown as EmailInfo[]) || [];
            const scrapeForAI: ScrapeResult = {
                companyName: data.companyName || domain,
                description: data.description || "",
                emails: emails.map((e) => e.email),
                phones: data.phones || [],
                socialLinks: data.socialLinks || {},
                contactPageUrl: data.contactPageUrl,
                countryHint: data.countryHint,
                rawText: data.rawText,
            };
            return {
                ...lead,
                companyName: scrapeForAI.companyName,
                description: scrapeForAI.description,
                emails,
                phones: scrapeForAI.phones,
                socialLinks: scrapeForAI.socialLinks,
                contactPageUrl: data.contactPageUrl,
                countryHint: data.countryHint,
                aiScore: await scoreLeadWithAI(scrapeForAI, icp),
                status: "completed",
                cachedResult: true,
            };
        }

        // 2. Check robots.txt for homepage
        const allowed = await checkRobotsTxt(domain);
        if (!allowed) {
            return {
                ...lead,
                status: "blocked",
                errorMessage: "Blocked by robots.txt — respecting site's crawling policy",
            };
        }

        // 3. Scrape the website
        const scrapeData: ScrapeResult = await scrapeCompany(domain);
        lead.companyName = scrapeData.companyName;
        lead.description = scrapeData.description;
        lead.phones = scrapeData.phones;
        lead.socialLinks = scrapeData.socialLinks;
        lead.contactPageUrl = scrapeData.contactPageUrl;
        lead.countryHint = scrapeData.countryHint;

        // 4. Validate emails
        lead.emails = await validateEmails(scrapeData.emails);

        // 5. AI scoring
        lead.aiScore = await scoreLeadWithAI(scrapeData, icp);

        // 6. Cache the result
        await setCachedLead(domain, {
            ...scrapeData,
            emails: lead.emails,
        } as unknown as Record<string, unknown>);

        lead.status = "completed";
        return lead;
    } catch (error) {
        console.error(`Error processing ${domain}:`, error);
        return {
            ...lead,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as EnrichRequest;

        if (!body.domains || !Array.isArray(body.domains) || body.domains.length === 0) {
            return new Response(
                JSON.stringify({ error: "No domains provided" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (body.domains.length > 25) {
            return new Response(
                JSON.stringify({ error: "Maximum 25 domains allowed" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Deduplicate
        const { unique: domains, duplicatesRemoved } = deduplicateDomains(body.domains);
        const total = domains.length;

        // Stream results using NDJSON
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const semaphore = new Semaphore(4); // Max 4 concurrent
                let processed = 0;

                // Send initial progress
                const initialUpdate: ProgressUpdate = {
                    type: "progress",
                    processed: 0,
                    total,
                    duplicatesRemoved,
                    message: `Starting enrichment of ${total} leads...`,
                };
                controller.enqueue(encoder.encode(JSON.stringify(initialUpdate) + "\n"));

                // Process all domains with concurrency control
                const promises = domains.map(async (domain) => {
                    await semaphore.acquire();
                    try {
                        const lead = await processDomain(domain, body.icp);
                        processed++;

                        const update: ProgressUpdate = {
                            type: "result",
                            processed,
                            total,
                            lead,
                            duplicatesRemoved,
                        };
                        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"));
                    } finally {
                        semaphore.release();
                    }
                });

                await Promise.all(promises);

                // Send completion
                const completeUpdate: ProgressUpdate = {
                    type: "complete",
                    processed: total,
                    total,
                    duplicatesRemoved,
                    message: "Enrichment complete!",
                };
                controller.enqueue(encoder.encode(JSON.stringify(completeUpdate) + "\n"));
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Enrich API error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
