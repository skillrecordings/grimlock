import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('garden', ({ data }) => !data.draft);
  const siteUrl = 'https://grimlock.ai';
  
  const urls = [
    siteUrl,
    `${siteUrl}/garden`,
    ...posts.map((post) => `${siteUrl}/garden/${post.slug}`),
  ];
  
  return new Response(urls.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
