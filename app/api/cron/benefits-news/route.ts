import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { fetchAndFilterRSS } from '@/lib/benefits/rss-fetcher';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    // Fetch benefits for auto-linking news to benefits
    const { data: benefits } = await supabase
      .from('benefits')
      .select('id, slug, name_fr');

    const items = await fetchAndFilterRSS(benefits ?? []);

    if (items.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    // Check existing source_urls to skip duplicates
    const sourceUrls = items.map((i) => i.source_url);
    const { data: existing } = await supabase
      .from('benefit_updates')
      .select('source_url')
      .in('source_url', sourceUrls);

    const existingUrls = new Set((existing ?? []).map((e) => e.source_url));
    const newItems = items.filter((i) => !existingUrls.has(i.source_url));

    if (newItems.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: items.length });
    }

    const { error } = await supabase.from('benefit_updates').insert(newItems);

    if (error) {
      console.error('[cron/benefits-news] insert error:', error);
      return NextResponse.json(
        { error: 'Failed to insert updates' },
        { status: 500 },
      );
    }

    // Flag linked benefits for review
    const linkedBenefitIds = newItems
      .filter(i => i.benefit_id)
      .map(i => i.benefit_id);

    if (linkedBenefitIds.length > 0) {
      await supabase
        .from('benefits')
        .update({ needs_review: true })
        .in('id', linkedBenefitIds);

      // Also flag related chunks for recrawl
      const { data: relatedChunks } = await supabase
        .from('document_chunks')
        .select('id, source, source_url')
        .not('source_url', 'is', null)
        .limit(20);

      if (relatedChunks && relatedChunks.length > 0) {
        const recrawlEntries = newItems
          .filter(i => i.source_url)
          .map(i => ({
            source: i.source,
            source_url: i.source_url,
            reason: 'rss_alert' as const,
          }));

        if (recrawlEntries.length > 0) {
          await supabase.from('recrawl_candidates').insert(recrawlEntries);
        }
      }
    }

    return NextResponse.json({
      inserted: newItems.length,
      skipped: items.length - newItems.length,
    });
  } catch (err) {
    console.error('[cron/benefits-news] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
