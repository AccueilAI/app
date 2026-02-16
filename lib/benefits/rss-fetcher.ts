import OpenAI from 'openai';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface FilteredItem {
  source: 'legifrance_rss' | 'service_public_rss';
  title: string;
  summary_fr: string | null;
  summary_en: string | null;
  summary_ko: string | null;
  source_url: string;
  benefit_id: string | null;
  is_relevant: boolean;
  published_at: string;
}

const RSS_FEEDS = [
  {
    url: 'https://www.legifrance.gouv.fr/rss/lois-et-decrets.xml',
    source: 'legifrance_rss' as const,
  },
  {
    url: 'https://www.service-public.fr/actualites/rss',
    source: 'service_public_rss' as const,
  },
];

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
    const description = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/)?.[1] ?? block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

function findRelatedBenefit(
  title: string,
  summary: string,
  benefits: { id: string; slug: string; name_fr: string }[],
): string | null {
  const text = `${title} ${summary}`.toLowerCase();
  const keywords: Record<string, string[]> = {
    'apl': ['apl', 'aide personnalisée au logement'],
    'rsa': ['rsa', 'revenu de solidarité'],
    'css': ['css', 'complémentaire santé solidaire', 'cmu'],
    'are': ['are', 'allocation chômage', 'retour à l\'emploi'],
    'cpf': ['cpf', 'compte personnel de formation'],
    'ame': ['ame', 'aide médicale'],
    'puma': ['puma', 'protection universelle maladie'],
    'prime-activite': ['prime d\'activité', 'prime activité'],
  };

  for (const b of benefits) {
    // Check slug keywords
    const slugKeys = keywords[b.slug];
    if (slugKeys?.some(k => text.includes(k))) return b.id;
    // Check name
    if (text.includes(b.name_fr.toLowerCase())) return b.id;
  }
  return null;
}

export async function fetchAndFilterRSS(benefits?: { id: string; slug: string; name_fr: string }[]): Promise<FilteredItem[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const allItems: { item: RSSItem; source: FilteredItem['source'] }[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSSItems(xml);
      for (const item of items.slice(0, 10)) {
        allItems.push({ item, source: feed.source });
      }
    } catch (err) {
      console.error(`[rss-fetcher] Failed to fetch ${feed.url}:`, err);
    }
  }

  const batch = allItems;
  const results: FilteredItem[] = [];

  for (const { item, source } of batch) {
    try {
      const input = `${item.title}\n${item.description.slice(0, 500)}`;
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content:
              'You classify French government updates. Reply JSON only, no markdown: {"relevant": boolean, "summary_fr": "...", "summary_en": "...", "summary_ko": "..."}',
          },
          {
            role: 'user',
            content: `Is this French government update relevant to immigrants/foreigners in France?\n\n${input}`,
          },
        ],
        temperature: 0,
        max_completion_tokens: 300,
      });

      const text = response.choices[0]?.message?.content?.trim() ?? '';
      const parsed = JSON.parse(text);

      if (parsed.relevant) {
        results.push({
          source,
          title: item.title,
          summary_fr: parsed.summary_fr ?? null,
          summary_en: parsed.summary_en ?? null,
          summary_ko: parsed.summary_ko ?? null,
          source_url: item.link,
          benefit_id: benefits ? findRelatedBenefit(item.title, parsed.summary_fr ?? '', benefits) : null,
          is_relevant: true,
          published_at: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[rss-fetcher] Error classifying "${item.title}":`, err);
    }
  }

  return results;
}
