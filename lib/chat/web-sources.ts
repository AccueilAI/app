import type { WebSource } from './types';

export function extractWebSources(
  response: {
    output?: Array<{
      type: string;
      content?: Array<{
        type: string;
        annotations?: Array<{
          type: string;
          url?: string;
          title?: string;
        }>;
      }>;
    }>;
  },
): WebSource[] {
  const sources: WebSource[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type !== 'output_text') continue;
      for (const ann of content.annotations ?? []) {
        if (ann.type === 'url_citation' && ann.url) {
          try {
            const url = new URL(ann.url);
            sources.push({
              url: ann.url,
              title: ann.title ?? url.hostname,
              snippet: '',
              domain: url.hostname,
            });
          } catch {
            /* skip invalid URLs */
          }
        }
      }
    }
  }
  // Deduplicate by URL
  const unique = [...new Map(sources.map((s) => [s.url, s])).values()];
  if (unique.length > 0) {
    console.log(
      `[web-sources] Extracted ${unique.length} sources: [${unique.map((s) => s.domain).join(', ')}]`,
    );
  }
  return unique;
}
