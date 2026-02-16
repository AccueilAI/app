import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { createHash } from 'crypto';

export const maxDuration = 60;

function contentHash(text: string): string {
  return createHash('sha256').update(text.slice(0, 500)).digest('hex').slice(0, 16);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    // Get 20 oldest URLs from crawlable sources
    const { data: staleChunks } = await supabase
      .from('document_chunks')
      .select('id, source, source_url, content, last_crawled_at')
      .not('source_url', 'is', null)
      .in('source', ['service-public', 'france-visas', 'welcome-to-france', 'immigration-interieur', 'ameli'])
      .order('last_crawled_at', { ascending: true, nullsFirst: true })
      .limit(20);

    if (!staleChunks || staleChunks.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    // Deduplicate by source_url
    const uniqueByUrl = [...new Map(staleChunks.map(c => [c.source_url, c])).values()];

    let changed = 0;
    let unchanged = 0;
    let errors = 0;

    for (const chunk of uniqueByUrl) {
      try {
        const res = await fetch(chunk.source_url, {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'AccueilAI-FreshnessBot/1.0' },
        });
        if (!res.ok) {
          errors++;
          continue;
        }

        const html = await res.text();
        const newHash = contentHash(html);
        const oldHash = contentHash(chunk.content);

        if (newHash !== oldHash) {
          // Content changed — flag for recrawl
          await supabase.from('recrawl_candidates').insert({
            source: chunk.source,
            source_url: chunk.source_url,
            chunk_id: chunk.id,
            reason: 'content_changed',
          });
          changed++;
        } else {
          // Content unchanged — update freshness timestamp
          await supabase
            .from('document_chunks')
            .update({ last_crawled_at: new Date().toISOString() })
            .eq('id', chunk.id);
          unchanged++;
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ checked: uniqueByUrl.length, changed, unchanged, errors });
  } catch (err) {
    console.error('[recrawl] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
