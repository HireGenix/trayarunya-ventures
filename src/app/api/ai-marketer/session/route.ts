import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  getRealtimeEnv,
  realtimeBaseUrl,
  buildInstructions,
  realtimeTools,
} from '@/lib/realtimeConfig';

export const runtime = 'nodejs';

// Simple in-memory rate limit (per IP)
const WINDOW = 60 * 1000;
const MAX = 8;
const hits = new Map<string, { count: number; ts: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > WINDOW) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  if (rec.count >= MAX) return true;
  rec.count += 1;
  return false;
}

export async function POST() {
  const env = getRealtimeEnv();
  if (!env) {
    return NextResponse.json(
      { error: 'not_configured', message: 'AI Marketer is not configured.' },
      { status: 503 }
    );
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';
  if (limited(ip)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many attempts. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const res = await fetch(`${realtimeBaseUrl(env.baseUrl)}/client_secrets`, {
      method: 'POST',
      headers: {
        'api-key': env.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: env.deployment,
          instructions: buildInstructions(),
          audio: {
            input: {
              transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 600 },
            },
            output: { voice: env.voice },
          },
          tools: realtimeTools(),
          tool_choice: 'auto',
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[ai-marketer/session] mint failed', res.status, detail);
      return NextResponse.json(
        { error: 'mint_failed', message: 'Could not start the AI session.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const token = data?.value || data?.client_secret?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'no_token', message: 'No session token returned.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      token,
      baseUrl: env.baseUrl,
      deployment: env.deployment,
      voice: env.voice,
      expires_at: data?.expires_at ?? null,
    });
  } catch (err) {
    console.error('[ai-marketer/session] error', err);
    return NextResponse.json(
      { error: 'server_error', message: 'Unexpected error starting session.' },
      { status: 500 }
    );
  }
}
