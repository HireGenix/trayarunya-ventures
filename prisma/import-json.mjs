/**
 * One-time, idempotent import of the legacy JSON stores into Azure Postgres.
 * Run with:  node prisma/import-json.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

function read(name, fallback) {
  const file = path.join(dataDir, name);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function importUsers() {
  const users = read('users.json', []);
  let n = 0;
  for (const u of users) {
    if (!u?.id) continue;
    const data = {
      id: String(u.id),
      email: String(u.email).toLowerCase(),
      name: u.name ?? '',
      role: u.role === 'superadmin' ? 'superadmin' : 'admin',
      passwordHash: u.passwordHash ?? '',
      active: u.active ?? true,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
    };
    await prisma.user.upsert({ where: { id: data.id }, create: data, update: data });
    n++;
  }
  return n;
}

async function importLeads() {
  const leads = read('leads.json', []);
  let n = 0;
  for (const l of leads) {
    if (!l?.id) continue;
    const data = {
      id: String(l.id),
      name: l.name ?? '',
      email: l.email ?? '',
      phone: l.phone ?? null,
      company: l.company ?? null,
      position: l.position ?? null,
      message: l.message ?? null,
      source: l.source ?? 'Other',
      status: l.status ?? 'New',
      date: l.date ?? new Date().toISOString(),
      lastContactedDate: l.lastContactedDate ?? null,
      notes: Array.isArray(l.notes) ? l.notes : [],
      tags: Array.isArray(l.tags) ? l.tags : [],
      assignedTo: l.assignedTo ?? null,
      priority: l.priority ?? 'Medium',
      formType: l.formType ?? null,
      formData: l.formData ?? undefined,
      pageUrl: l.pageUrl ?? null,
    };
    await prisma.lead.upsert({ where: { id: data.id }, create: data, update: data });
    n++;
  }
  return n;
}

async function importProposals() {
  const items = read('proposals.json', []);
  let n = 0;
  for (const p of items) {
    if (!p?.id) continue;
    const data = {
      id: String(p.id),
      type: p.type ?? 'deck',
      title: p.title ?? 'Untitled',
      client: p.client ?? '',
      spec: p.spec ?? {},
      createdAt: p.createdAt ?? new Date().toISOString(),
      createdBy: p.createdBy ?? 'Admin',
      leadId: p.leadId ?? null,
    };
    await prisma.proposal.upsert({ where: { id: data.id }, create: data, update: data });
    n++;
  }
  return n;
}

async function importBlog() {
  const items = read('blog.json', []);
  let n = 0;
  for (const b of items) {
    if (!b?.id) continue;
    const data = {
      id: String(b.id),
      title: b.title ?? 'Untitled',
      slug: b.slug ?? String(b.id),
      excerpt: b.excerpt ?? '',
      content: b.content ?? '',
      author: b.author ?? 'Admin',
      category: b.category ?? 'General',
      tags: Array.isArray(b.tags) ? b.tags : [],
      coverImage: b.coverImage ?? null,
      status: b.status === 'Published' ? 'Published' : 'Draft',
      views: b.views ?? 0,
      date: b.date ?? new Date().toISOString().split('T')[0],
      updatedAt: b.updatedAt ?? new Date().toISOString(),
    };
    await prisma.blogPost.upsert({ where: { id: data.id }, create: data, update: data });
    n++;
  }
  return n;
}

async function importAnalytics() {
  const events = read('analytics-events.json', []);
  if (!events.length) return 0;
  const rows = events
    .filter((e) => e?.id)
    .map((e) => ({
      id: String(e.id),
      type: e.type === 'event' ? 'event' : 'pageview',
      path: e.path ?? '/',
      title: e.title ?? null,
      referrer: e.referrer ?? null,
      source: e.source ?? 'direct',
      device: e.device ?? 'desktop',
      browser: e.browser ?? 'Other',
      os: e.os ?? 'Other',
      country: e.country ?? 'Unknown',
      countryCode: e.countryCode ?? 'XX',
      sessionId: e.sessionId ?? 'anon',
      visitorId: e.visitorId ?? e.sessionId ?? 'anon',
      name: e.name ?? null,
      category: e.category ?? null,
      durationMs: typeof e.durationMs === 'number' ? e.durationMs : null,
      ts: BigInt(e.ts ?? Date.now()),
    }));
  const res = await prisma.analyticsEvent.createMany({ data: rows, skipDuplicates: true });
  return res.count;
}

async function importSettings() {
  const data = read('settings.json', null);
  if (!data) return 0;
  await prisma.setting.upsert({
    where: { id: 'main' },
    create: { id: 'main', data },
    update: { data },
  });
  return 1;
}

async function importSeo() {
  const snap = read('seo.json', null);
  if (!snap) return 0;
  const data = {
    id: 'latest',
    generatedAt: snap.generatedAt ?? new Date().toISOString(),
    pages: snap.pages ?? [],
    issues: snap.issues ?? [],
    keywords: snap.keywords ?? [],
  };
  await prisma.seoSnapshot.upsert({ where: { id: 'latest' }, create: data, update: data });
  return 1;
}

async function main() {
  const counts = {
    users: await importUsers(),
    leads: await importLeads(),
    proposals: await importProposals(),
    blog: await importBlog(),
    analytics: await importAnalytics(),
    settings: await importSettings(),
    seo: await importSeo(),
  };
  console.log('Imported:', JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
