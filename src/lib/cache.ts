// ============================================================
// LeadLens — Supabase Cache Layer
// 24-hour TTL caching for scraped lead data
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LeadsCacheRow } from "./types";

let supabaseClient: SupabaseClient | null = null;

/** Get or create Supabase client */
function getSupabase(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.warn("Supabase credentials not configured — caching disabled");
        return null;
    }

    supabaseClient = createClient(url, key);
    return supabaseClient;
}

/** Check cache for a domain (within 24 hours) */
export async function getCachedLead(domain: string): Promise<LeadsCacheRow | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("leads_cache")
            .select("*")
            .eq("domain", domain)
            .gte("scraped_at", twentyFourHoursAgo)
            .single();

        if (error || !data) return null;

        return data as LeadsCacheRow;
    } catch {
        return null;
    }
}

/** Write lead data to cache (upsert) */
export async function setCachedLead(
    domain: string,
    scrapedData: Record<string, unknown>
): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        await supabase.from("leads_cache").upsert(
            {
                domain,
                scraped_data: scrapedData,
                scraped_at: new Date().toISOString(),
            },
            { onConflict: "domain" }
        );
    } catch (error) {
        console.error("Cache write failed:", error);
    }
}
