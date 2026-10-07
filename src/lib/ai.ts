// ============================================================
// LeadLens — AI Scoring with Google Gemini
// Scores leads against ICP using structured JSON output
// ============================================================

import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { AIScore, ICPConfig, ScrapeResult } from "./types";

/** Get Gemini AI client */
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    return new GoogleGenerativeAI(apiKey);
}

/** Schema for structured JSON output from Gemini */
const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        score: {
            type: SchemaType.NUMBER,
            description: "Lead quality score from 0 to 100",
        },
        fit: {
            type: SchemaType.STRING,
            description: "Lead fit category: High, Medium, or Low",
            format: "enum",
            enum: ["High", "Medium", "Low"],
        },
        reason: {
            type: SchemaType.STRING,
            description: "1-2 sentence explanation of the score",
        },
        industry: {
            type: SchemaType.STRING,
            description: "Detected industry of the company",
        },
        outreach_line: {
            type: SchemaType.STRING,
            description: "Personalized first line for a cold email to this lead",
        },
    },
    required: ["score", "fit", "reason", "industry", "outreach_line"],
};

/** Score a lead against the user's ICP using Gemini AI */
export async function scoreLeadWithAI(
    scrapeData: ScrapeResult,
    icp: ICPConfig
): Promise<AIScore> {
    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.3,
                maxOutputTokens: 500,
            },
        });

        const prompt = `You are a B2B lead qualification expert. Score this company as a potential lead based on the Ideal Customer Profile (ICP).

## Company Data (scraped from their website):
- Company Name: ${scrapeData.companyName}
- Description: ${scrapeData.description || "No description available"}
- Emails found: ${scrapeData.emails.length > 0 ? scrapeData.emails.join(", ") : "None"}
- Phone numbers: ${scrapeData.phones.length > 0 ? scrapeData.phones.join(", ") : "None"}
- Social media: ${JSON.stringify(scrapeData.socialLinks)}
- Contact page: ${scrapeData.contactPageUrl || "Not found"}
- Country hint: ${scrapeData.countryHint || "Unknown"}

## Ideal Customer Profile (ICP):
- Target Industry: ${icp.targetIndustry}
- Target Location: ${icp.targetLocation}
- Company Type: ${icp.companyType}
- What the user sells: ${icp.whatISell}

## Scoring Rules:
- Score 75-100 (High fit): Strong industry match, right location, good company type match, would clearly benefit from what the user sells
- Score 50-74 (Medium fit): Partial match, some alignment but not perfect
- Score 0-49 (Low fit): Poor match, different industry/location/type, unlikely to benefit
- Consider: industry relevance, location match, company type (B2B/B2C), potential need for the product, quality of contact data available
- The outreach_line should be a natural, personalized opening line referencing something specific about the company

Return a JSON object with: score (0-100), fit (High/Medium/Low), reason (1-2 sentences), industry (detected industry), outreach_line (personalized cold email opener).`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text) as AIScore;

        // Validate and clamp score
        parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));

        // Ensure fit matches score
        if (parsed.score >= 75) parsed.fit = "High";
        else if (parsed.score >= 50) parsed.fit = "Medium";
        else parsed.fit = "Low";

        return { ...parsed, source: "gemini" };
    } catch (error) {
        console.error("AI scoring failed, using rule-based fallback:", error);
        return ruleBasedScore(scrapeData, icp);
    }
}

/**
 * Deterministic fallback when Gemini is unavailable (no key, quota, timeout).
 * Keeps the tool usable and transparent: the UI labels these scores as "Rules".
 */
export function ruleBasedScore(scrapeData: ScrapeResult, icp: ICPConfig): AIScore {
    const text = `${scrapeData.companyName} ${scrapeData.description} ${scrapeData.rawText ?? ""}`.toLowerCase();
    let score = 30;
    const reasons: string[] = [];

    const industryTerms = icp.targetIndustry
        .toLowerCase()
        .split(/[,/&]|\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2);
    if (industryTerms.some((t) => text.includes(t))) {
        score += 30;
        reasons.push(`mentions ${icp.targetIndustry}`);
    }

    const location = icp.targetLocation.toLowerCase().trim();
    if (location && (scrapeData.countryHint?.toLowerCase().includes(location) || text.includes(location))) {
        score += 15;
        reasons.push(`located in ${icp.targetLocation}`);
    }

    if (icp.companyType !== "B2C" && /\b(b2b|enterprise|businesses|teams|platform|saas|api)\b/.test(text)) {
        score += 10;
        reasons.push("B2B signals on website");
    }

    if (scrapeData.emails.length > 0) {
        score += 10;
        reasons.push("public contact email found");
    }
    if (scrapeData.socialLinks.linkedin) score += 5;

    score = Math.max(0, Math.min(100, score));
    const fit = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";

    return {
        score,
        fit,
        reason: reasons.length
            ? `Rule-based score: ${reasons.join(", ")}.`
            : "Rule-based score: few signals matched your target profile.",
        industry: industryTerms.some((t) => text.includes(t)) ? icp.targetIndustry : "Unknown",
        outreach_line: buildOpener(scrapeData.companyName, icp.whatISell),
        source: "rules",
    };
}

/** Grammatical fallback opener, e.g. "Hi Zoho team, we help sales teams find leads faster with ..." */
function buildOpener(company: string, offering: string): string {
    const product = offering.trim().replace(/[.!\s]+$/, "");
    if (!product) return `Hi ${company} team, I'd love to show you how we could support your growth.`;
    const phrase = product.charAt(0).toLowerCase() + product.slice(1);
    return `Hi ${company} team, I'd love to show you ${/^(a|an|the|our)\b/i.test(phrase) ? phrase : `our ${phrase}`} and how it could help you.`;
}
