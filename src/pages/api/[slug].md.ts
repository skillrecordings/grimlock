import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('garden', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getCollection>>[number] };
  
  // Read the raw markdown file
  const filePath = path.join(process.cwd(), 'src', 'content', 'garden', `${post.slug}.md`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Source': 'grimlock.ai',
        'X-Growth-Stage': post.data.growthStage,
      },
    });
  } catch (error) {
    return new Response(`# Not Found\n\nNo garden post found with slug: ${post.slug}`, {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  }
};
