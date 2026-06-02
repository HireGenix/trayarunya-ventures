/**
 * Browser-side WebRTC client for the Azure OpenAI Realtime API (GA).
 *
 * Flow:
 *  1. POST /api/ai-marketer/session  -> ephemeral token (server mints it)
 *  2. getUserMedia(mic) -> RTCPeerConnection -> data channel 'oai-events'
 *  3. SDP offer -> POST {resource}/openai/v1/realtime/calls (Bearer ephemeral)
 *  4. setRemoteDescription(answer); play remote audio track
 *  5. Tool calls arrive over the data channel; we dispatch + reply.
 */

export type LeadFields = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  industry?: string;
  segment?: 'B2B' | 'B2C' | 'D2C';
  notes?: string;
};

export type TranscriptRole = 'user' | 'assistant';

export interface RealtimeCallbacks {
  onStatus?: (status: RealtimeStatus, detail?: string) => void;
  onUserLevel?: (level: number) => void;
  onAiLevel?: (level: number) => void;
  onTranscript?: (role: TranscriptRole, text: string, done: boolean) => void;
  onLeadUpdate?: (fields: LeadFields) => void;
  onLeadSubmitted?: (fields: LeadFields) => void;
  onError?: (message: string) => void;
  /** Called when the AI asks for a confirmable field — show typed input */
  onConfirmPrompt?: (field: 'company' | 'name' | 'email' | null) => void;
}

export type RealtimeStatus =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'live'
  | 'ended'
  | 'error';

const SESSION_MAX_MS = 8 * 60 * 1000; // hard cap to control cost

export class AzureRealtimeMarketer {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private rafId: number | null = null;
  private capTimer: ReturnType<typeof setTimeout> | null = null;
  private cb: RealtimeCallbacks;

  private assistantBuffer = '';
  private userBuffer = '';
  private greeted = false;

  constructor(callbacks: RealtimeCallbacks) {
    this.cb = callbacks;
  }

  async start(): Promise<void> {
    try {
      this.cb.onStatus?.('requesting-mic');
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.cb.onStatus?.('connecting');
      const sessionRes = await fetch('/api/ai-marketer/session', { method: 'POST' });
      if (!sessionRes.ok) {
        const data = await sessionRes.json().catch(() => ({}));
        const reason =
          sessionRes.status === 503
            ? 'not_configured'
            : data?.error || `http_${sessionRes.status}`;
        throw new RealtimeStartError(reason, data?.message || 'Could not start AI session.');
      }
      const session = await sessionRes.json();

      const pc = new RTCPeerConnection();
      this.pc = pc;

      // Remote audio (AI voice) — append to DOM for reliable autoplay
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
      this.audioEl.setAttribute('playsinline', 'true');
      this.audioEl.style.display = 'none';
      document.body.appendChild(this.audioEl);
      pc.ontrack = (e) => {
        if (this.audioEl) {
          this.audioEl.srcObject = e.streams[0];
          this.audioEl.play?.().catch(() => {});
        }
        this.monitorLevel(e.streams[0], 'ai');
      };

      // Mic track out
      this.micStream.getTracks().forEach((t) => pc.addTrack(t, this.micStream!));
      this.monitorLevel(this.micStream, 'user');

      // Data channel for events + tool calls
      const dc = pc.createDataChannel('oai-events');
      this.dc = dc;
      dc.onopen = () => this.onChannelOpen();
      dc.onmessage = (e) => this.onServerEvent(e);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this.cb.onError?.('Connection lost.');
          this.stop('error');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callRes = await fetch(
        `${session.baseUrl}/openai/v1/realtime/calls?webrtcfilter=on`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp || '',
        }
      );
      if (!callRes.ok) {
        throw new RealtimeStartError('webrtc_failed', 'Voice connection failed.');
      }
      const answerSdp = await callRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      this.capTimer = setTimeout(() => this.stop('ended'), SESSION_MAX_MS);
      this.cb.onStatus?.('live');
    } catch (err) {
      if (err instanceof RealtimeStartError) {
        this.cb.onStatus?.('error', err.reason);
        this.cb.onError?.(err.message);
      } else if ((err as DOMException)?.name === 'NotAllowedError') {
        this.cb.onStatus?.('error', 'mic_denied');
        this.cb.onError?.('Microphone permission denied.');
      } else {
        this.cb.onStatus?.('error', 'unknown');
        this.cb.onError?.('Something went wrong starting the AI Marketer.');
      }
      this.cleanup();
    }
  }

  stop(status: RealtimeStatus = 'ended'): void {
    this.cleanup();
    this.cb.onStatus?.(status);
  }

  private onChannelOpen(): void {
    // GA WebRTC: session already exists from token mint — session.created may not fire.
    // Trigger greeting on first server message (most reliable).
    // Fallback: 800ms timeout in case the first event is slow.
    setTimeout(() => this.triggerGreeting(), 800);
  }

  private triggerGreeting(): void {
    if (this.greeted) return;
    this.greeted = true;
    // Inject a silent "Hello" from the user to kick off the turn,
    // then response.create to make the AI respond.
    // Using a real user item is more reliable than inline instructions in response.create.
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello' }],
      },
    });
    setTimeout(() => this.send({ type: 'response.create' }), 120);
  }

  private send(obj: unknown): void {
    const state = this.dc?.readyState;
    if (this.dc && state === 'open') {
      this.dc.send(JSON.stringify(obj));
      console.log('[realtime send]', (obj as { type?: string })?.type, obj);
    } else {
      console.warn('[realtime send SKIPPED]', state, (obj as { type?: string })?.type);
    }
  }

  /** Inject typed text (e.g. company name) into the conversation and force AI response. */
  sendUserText(text: string): void {
    this.cb.onTranscript?.('user', text, true);
    // Clear any buffered mic audio first so VAD doesn't interfere
    this.send({ type: 'input_audio_buffer.clear' });
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    // Small delay — give the server time to process the item before requesting response
    setTimeout(() => this.send({ type: 'response.create' }), 150);
  }

  /** Detect when AI asks for confirmable fields → show inline input to the user */
  private detectConfirmPrompt(text: string): void {
    const lower = text.toLowerCase();
    if (
      lower.includes('company') &&
      (lower.includes('name') || lower.includes('called') || lower.includes('spell'))
    ) {
      this.cb.onConfirmPrompt?.('company');
    } else if (
      (lower.includes('your name') || lower.includes('may i know') || lower.includes('what\'s your name') || lower.includes("what's your name"))
    ) {
      this.cb.onConfirmPrompt?.('name');
    } else if (lower.includes('email')) {
      this.cb.onConfirmPrompt?.('email');
    }
  }

  private async onServerEvent(e: MessageEvent): Promise<void> {
    let evt: Record<string, unknown>;
    try {
      evt = JSON.parse(e.data);
    } catch {
      return;
    }
    const type = evt.type as string;

    // Debug: log every event type so we can see exactly what Azure emits
    if (typeof window !== 'undefined') {
      console.log('[realtime evt]', type, evt);
    }

    // The first event from the server proves the channel is alive both ways —
    // trigger the greeting now (guarded so it only fires once).
    this.triggerGreeting();

    switch (type) {
      // Model is ready — trigger greeting if not already done
      case 'session.created':
      case 'session.updated': {
        this.triggerGreeting();
        break;
      }

      // ── Assistant transcript — multiple event name variants across versions ──
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
      case 'response.text.delta':
      case 'response.content_part.delta': {
        const delta =
          (evt.delta as string) ||
          ((evt.delta as Record<string,unknown>)?.text as string) ||
          '';
        if (delta) {
          this.assistantBuffer += delta;
          this.cb.onTranscript?.('assistant', this.assistantBuffer, false);
        }
        break;
      }
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
      case 'response.text.done': {
        const text =
          (evt.transcript as string) ||
          (evt.text as string) ||
          this.assistantBuffer;
        if (text) {
          this.cb.onTranscript?.('assistant', text, true);
          this.detectConfirmPrompt(text);
        }
        this.assistantBuffer = '';
        break;
      }
      // output_item.done carries the final transcript for some model versions
      case 'response.output_item.done': {
        const item = evt.item as Record<string,unknown> | undefined;
        const content = Array.isArray(item?.content) ? item!.content : [];
        for (const part of content) {
          const p = part as Record<string,unknown>;
          const txt = (p.transcript as string) || (p.text as string) || '';
          if (txt) {
            this.cb.onTranscript?.('assistant', txt, true);
            this.detectConfirmPrompt(txt);
            this.assistantBuffer = '';
          }
        }
        break;
      }

      // ── User speech transcription ──
      case 'conversation.item.input_audio_transcription.delta': {
        const d = (evt.delta as string) || '';
        if (d) {
          this.userBuffer += d;
          this.cb.onTranscript?.('user', this.userBuffer, false);
        }
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text = (evt.transcript as string) || this.userBuffer;
        if (text) this.cb.onTranscript?.('user', text, true);
        this.userBuffer = '';
        break;
      }
      // Catch-all for any other transcription completed events
      case 'input_audio_transcription.completed': {
        const text = (evt.transcript as string) || '';
        if (text) this.cb.onTranscript?.('user', text, true);
        this.userBuffer = '';
        break;
      }

      // Tool / function calls
      case 'response.function_call_arguments.done': {
        await this.handleToolCall(
          evt.name as string,
          evt.arguments as string,
          evt.call_id as string
        );
        break;
      }
      case 'error': {
        const msg = (evt.error as { message?: string })?.message || 'Realtime error.';
        this.cb.onError?.(msg);
        break;
      }
      default:
        break;
    }
  }

  private async handleToolCall(name: string, argsJson: string, callId: string): Promise<void> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson || '{}');
    } catch {
      /* ignore */
    }

    let output: unknown = { ok: true };

    if (name === 'research_company') {
      try {
        const res = await fetch('/api/ai-marketer/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: args.name, website: args.website }),
        });
        const data = await res.json();
        output = data?.ok
          ? { brief: data.brief }
          : { brief: '', note: 'No research available; continue naturally.' };
      } catch {
        output = { brief: '', note: 'Research failed; continue naturally.' };
      }
    } else if (name === 'update_lead_details') {
      this.cb.onLeadUpdate?.(args as LeadFields);
      output = { ok: true };
    } else if (name === 'submit_lead') {
      const fields = args as LeadFields;
      this.cb.onLeadUpdate?.(fields);
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildLeadPayload(fields)),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          this.cb.onLeadSubmitted?.(fields);
          output = { ok: true, saved: true };
        } else {
          output = { ok: false, error: data?.error || 'save_failed' };
        }
      } catch {
        output = { ok: false, error: 'save_failed' };
      }
    }

    // Return tool output to the model, then ask it to continue speaking.
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    });
    setTimeout(() => this.send({ type: 'response.create' }), 150);
  }

  private monitorLevel(stream: MediaStream, who: 'user' | 'ai'): void {
    try {
      if (!this.audioCtx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new Ctx();
      }
      const ctx = this.audioCtx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const level = Math.min(1, sum / buf.length / 128);
        if (who === 'user') this.cb.onUserLevel?.(level);
        else this.cb.onAiLevel?.(level);
        this.rafId = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* level metering is best-effort */
    }
  }

  private cleanup(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.capTimer) clearTimeout(this.capTimer);
    this.capTimer = null;
    try {
      this.dc?.close();
    } catch {
      /* noop */
    }
    try {
      this.pc?.close();
    } catch {
      /* noop */
    }
    this.micStream?.getTracks().forEach((t) => t.stop());
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.dc = null;
    this.pc = null;
    this.micStream = null;
    this.audioCtx = null;
    this.greeted = false;
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
  }
}

export class RealtimeStartError extends Error {
  reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'RealtimeStartError';
  }
}

/** Build the /api/leads payload (shared by the AI tool-call and the manual Send button). */
export function buildLeadPayload(fields: LeadFields) {
  const summary = [
    fields.notes ? `Pain / goal: ${fields.notes}` : '',
    fields.segment ? `Segment: ${fields.segment}` : '',
    fields.industry ? `Industry: ${fields.industry}` : '',
    fields.country ? `Country: ${fields.country}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    name: fields.name || 'AI Voice Lead',
    email: fields.email,
    subject: 'AI Sales Partner — new lead',
    message: summary || 'Lead captured via the AI Sales Partner on the contact page.',
    company: fields.company,
    phone: fields.phone,
    source: 'ai-voice-marketer',
    formType: 'ai-voice-marketer',
    pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    formData: {
      country: fields.country,
      industry: fields.industry,
      segment: fields.segment,
    },
  };
}
