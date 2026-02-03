import { ImageResponse } from '@vercel/og';
import type { APIRoute } from 'astro';

export const config = {
  runtime: 'edge',
};

const stageEmoji: Record<string, string> = {
  seedling: '🌱',
  budding: '🌿',
  evergreen: '🌳',
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const title = url.searchParams.get('title') || 'Grimlock.ai';
  const stage = url.searchParams.get('stage') || '';
  const description = url.searchParams.get('description') || '';

  const emoji = stageEmoji[stage] || '🦖';

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '20px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { fontSize: '64px' },
                    children: emoji,
                  },
                },
                stage && {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '24px',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    },
                    children: stage,
                  },
                },
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: title.length > 40 ? '48px' : '64px',
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
                backgroundClip: 'text',
                color: 'transparent',
                lineHeight: 1.2,
                marginBottom: '20px',
              },
              children: title,
            },
          },
          description && {
            type: 'div',
            props: {
              style: {
                fontSize: '28px',
                color: '#888',
                lineHeight: 1.4,
                maxWidth: '900px',
              },
              children: description,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '60px',
                right: '80px',
                fontSize: '24px',
                color: '#444',
              },
              children: 'grimlock.ai',
            },
          },
        ].filter(Boolean),
      },
    },
    {
      width: 1200,
      height: 630,
    }
  ) as Response;
};
