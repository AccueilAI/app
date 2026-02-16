import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    // Sample 100 random distinct source_urls
    const { data: urls } = await supabase
      .from('document_chunks')
      .select('source_url, source')
      .not('source_url', 'is', null)
      .limit(500);

    if (!urls || urls.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    // Deduplicate and sample
    const uniqueUrls = [...new Map(urls.map(u => [u.source_url, u])).values()];
    const sampled = uniqueUrls.sort(() => Math.random() - 0.5).slice(0, 100);

    // Check URLs in batches of 5
    const results: { source_url: string; source: string; status_code: number | null; is_available: boolean }[] = [];

    for (let i = 0; i < sampled.length; i += 5) {
      const batch = sampled.slice(i, i + 5);
      const checks = await Promise.all(
        batch.map(async ({ source_url, source }) => {
          try {
            const res = await fetch(source_url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(10000),
              redirect: 'follow',
            });
            return { source_url, source, status_code: res.status, is_available: res.ok };
          } catch {
            return { source_url, source, status_code: null, is_available: false };
          }
        }),
      );
      results.push(...checks);
    }

    // Insert results
    if (results.length > 0) {
      await supabase.from('url_health_checks').insert(results);
    }

    const unavailable = results.filter(r => !r.is_available);
    if (unavailable.length >= 10) {
      console.error(`[url-health-check] ${unavailable.length}/${results.length} URLs unavailable`);
    }

    return NextResponse.json({
      checked: results.length,
      available: results.filter(r => r.is_available).length,
      unavailable: unavailable.length,
    });
  } catch (err) {
    console.error('[url-health-check] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
