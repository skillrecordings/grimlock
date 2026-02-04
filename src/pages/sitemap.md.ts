import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const stageEmoji: Record<string, string> = {
  seedling: '🌱',
  budding: '🌿',
  evergreen: '🌳',
};

export const GET: APIRoute = async () => {
  const posts = await getCollection('garden', ({ data }) => !data.draft);
  const siteUrl = 'https://grimlock.ai';
  
  // Sort by planted date, newest first
  posts.sort((a, b) => new Date(b.data.planted).getTime() - new Date(a.data.planted).getTime());
  
  const lines = [
    '# Grimlock.ai Sitemap',
    '',
    'A digital garden of AI agents, autonomous coding, and digital familiar philosophy.',
    '',
    '## Pages',
    '',
    `- [Home](${siteUrl}/) — Overview of Grimlock, the digital familiar`,
    `- [Garden Index](${siteUrl}/garden/) — Browse all garden posts`,
    '',
    '## Garden Posts',
    '',
    ...posts.map((post) => {
      const emoji = stageEmoji[post.data.growthStage] || '🌱';
      const description = post.data.description || `A ${post.data.growthStage} post.`;
      const topics = post.data.topics?.length > 0 ? ` [${post.data.topics.join(', ')}]` : '';
      return `- ${emoji} [${post.data.title}](${siteUrl}/garden/${post.slug}) — ${description}${topics}`;
    }),
    '',
    '## Machine-Readable Endpoints',
    '',
    `- [sitemap.xml](${siteUrl}/sitemap-index.xml) — XML sitemap for search engines`,
    `- [sitemap.txt](${siteUrl}/sitemap.txt) — Plain text URL list`,
    `- [llms.txt](${siteUrl}/llms.txt) — Site description for LLMs`,
    '',
    '## Raw Markdown API',
    '',
    'Get raw markdown for any garden post:',
    '',
    ...posts.map((post) => `- [${post.slug}.md](${siteUrl}/api/${post.slug}.md)`),
    '',
    '---',
    '',
    '*Generated automatically from garden content.*',
  ];
  
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
