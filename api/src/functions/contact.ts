import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

type ContactRequest = {
  name: string;
  email: string;
  subject: string;
  details: string;
  website?: string;
  turnstileToken?: string;
};

type ContactChannelResult = {
  ok: boolean;
  channel: 'email' | 'whatsapp';
  reason?: string;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const inMemoryRateLimit = new Map<string, number[]>();

export async function contact(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (req.method !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const body = (await req.json()) as Partial<ContactRequest>;
    const input = normalizeAndValidate(body);
    if (!input.ok) {
      return json(400, { error: input.error });
    }

    // Honeypot field must remain empty.
    if ((body.website ?? '').trim().length > 0) {
      return json(202, { ok: true });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!consumeRateLimit(ip)) {
      return json(429, { error: 'Too many requests. Please try again shortly.' });
    }

    if (process.env['TURNSTILE_SECRET_KEY']) {
      const token = (body.turnstileToken ?? '').trim();
      if (!token) return json(400, { error: 'Missing anti-spam token.' });
      const verified = await verifyTurnstile(token, ip);
      if (!verified) return json(400, { error: 'Anti-spam verification failed.' });
    }

    const payload = input.value;

    const [emailResult, whatsappResult] = await Promise.all([
      sendEmailNotification(payload, ctx),
      sendWhatsAppNotification(payload, ctx),
    ]);

    const succeeded = [emailResult, whatsappResult].filter((x) => x.ok).length;
    if (succeeded === 0) {
      return json(502, { error: 'Unable to deliver message right now. Please try again later.' });
    }

    return json(202, {
      ok: true,
      delivered: {
        email: emailResult.ok,
        whatsapp: whatsappResult.ok,
      },
    });
  } catch (error) {
    ctx.error('contact endpoint failed', error);
    return json(500, { error: 'Unexpected server error.' });
  }
}

function normalizeAndValidate(body: Partial<ContactRequest>): { ok: true; value: ContactRequest } | { ok: false; error: string } {
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const subject = (body.subject ?? '').trim();
  const details = (body.details ?? '').trim();

  if (!name || name.length < 2) return { ok: false, error: 'Please provide your name.' };
  if (!isEmail(email)) return { ok: false, error: 'Please provide a valid email.' };
  if (!subject || subject.length < 3) return { ok: false, error: 'Please provide a subject.' };
  if (!details || details.length < 10) return { ok: false, error: 'Please provide more project details.' };

  return {
    ok: true,
    value: {
      name: limit(name, 120),
      email: limit(email, 160),
      subject: limit(subject, 180),
      details: limit(details, 4000),
      website: body.website,
      turnstileToken: body.turnstileToken,
    },
  };
}

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const previous = inMemoryRateLimit.get(key) ?? [];
  const next = previous.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (next.length >= RATE_LIMIT_MAX) {
    inMemoryRateLimit.set(key, next);
    return false;
  }
  next.push(now);
  inMemoryRateLimit.set(key, next);
  return true;
}

async function verifyTurnstile(token: string, remoteip: string): Promise<boolean> {
  const secret = process.env['TURNSTILE_SECRET_KEY'];
  if (!secret) return true;

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

async function sendEmailNotification(payload: ContactRequest, ctx: InvocationContext): Promise<ContactChannelResult> {
  const to = process.env['CONTACT_EMAIL_TO'];
  const from = process.env['CONTACT_EMAIL_FROM'];
  const apiKey = process.env['RESEND_API_KEY'];

  if (!to || !from || !apiKey) {
    ctx.warn('Email channel skipped: missing CONTACT_EMAIL_TO, CONTACT_EMAIL_FROM, or RESEND_API_KEY');
    return { ok: false, channel: 'email', reason: 'email config missing' };
  }

  const text = [
    'New portfolio enquiry',
    '',
    `From:    ${payload.name}`,
    `Email:   ${payload.email}`,
    `Subject: ${payload.subject}`,
    '',
    'Message:',
    payload.details,
    '',
    '— Sent from arunsudi.dev. Reply directly to respond.',
  ].join('\n');

  const html = renderEmailHtml(payload);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: `New enquiry from ${payload.name} — ${payload.subject}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const msg = await safeText(res);
    ctx.error('Email send failed', res.status, msg);
    return { ok: false, channel: 'email', reason: `email failed (${res.status})` };
  }

  return { ok: true, channel: 'email' };
}

async function sendWhatsAppNotification(payload: ContactRequest, ctx: InvocationContext): Promise<ContactChannelResult> {
  const sid = process.env['TWILIO_ACCOUNT_SID'];
  const token = process.env['TWILIO_AUTH_TOKEN'];
  const from = process.env['TWILIO_WHATSAPP_FROM'];
  const to = process.env['WHATSAPP_TO'];

  if (!sid || !token || !from || !to) {
    ctx.warn('WhatsApp channel skipped: missing TWILIO_* or WHATSAPP_TO');
    return { ok: false, channel: 'whatsapp', reason: 'whatsapp config missing' };
  }

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: [
      '*\u{1F4EC} New portfolio enquiry*',
      '',
      `*From:* ${payload.name}`,
      `*Email:* ${payload.email}`,
      `*Subject:* ${payload.subject}`,
      '',
      limit(payload.details, 800),
      '',
      '_via arunsudi.dev_',
    ].join('\n'),
  });

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const msg = await safeText(res);
    ctx.error('WhatsApp send failed', res.status, msg);
    return { ok: false, channel: 'whatsapp', reason: `whatsapp failed (${res.status})` };
  }

  return { ok: true, channel: 'whatsapp' };
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function limit(v: string, n: number): string {
  return v.length <= n ? v : v.slice(0, n);
}

/** Escape visitor-supplied text before embedding it in the HTML email. */
function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Neo-brutalist HTML notification (inline styles — email-client safe). */
function renderEmailHtml(payload: ContactRequest): string {
  const name = escapeHtml(payload.name);
  const email = escapeHtml(payload.email);
  const subject = escapeHtml(payload.subject);
  const details = escapeHtml(payload.details);

  return [
    '<div style="margin:0;padding:24px;background:#f5f5dc;font-family:Inter,Arial,sans-serif;color:#1a1a1a;">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:4px solid #1a1a1a;box-shadow:8px 8px 0 0 #1a1a1a;border-radius:12px;overflow:hidden;">',
    '<div style="background:#ff6b9d;border-bottom:4px solid #1a1a1a;padding:16px 24px;">',
    '<h1 style="margin:0;font-size:20px;font-weight:900;text-transform:uppercase;">&#128236; New portfolio enquiry</h1>',
    '</div>',
    '<div style="padding:24px;">',
    '<table style="width:100%;border-collapse:collapse;font-size:15px;">',
    `<tr><td style="padding:6px 0;font-weight:700;width:90px;">From</td><td style="padding:6px 0;">${name}</td></tr>`,
    `<tr><td style="padding:6px 0;font-weight:700;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}" style="color:#e60076;">${email}</a></td></tr>`,
    `<tr><td style="padding:6px 0;font-weight:700;">Subject</td><td style="padding:6px 0;">${subject}</td></tr>`,
    '</table>',
    `<div style="margin-top:16px;padding:16px;background:#f5f5dc;border:2px solid #1a1a1a;border-radius:8px;white-space:pre-wrap;line-height:1.5;">${details}</div>`,
    '<p style="margin:20px 0 0;font-size:12px;color:#44403c;">Sent from arunsudi.dev &middot; Reply directly to respond.</p>',
    '</div>',
    '</div>',
    '</div>',
  ].join('');
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function json(status: number, jsonBody: unknown): HttpResponseInit {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    jsonBody,
  };
}

app.http('contact', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: contact,
});

