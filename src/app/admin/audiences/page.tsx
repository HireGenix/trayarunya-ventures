'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InsightsIcon from '@mui/icons-material/Insights';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { motion } from 'framer-motion';

import { GlassCard, IconBadge, SoftHero } from '@/components/dashboard/primitives';
import { DASH, PASTEL, SOFT } from '@/components/dashboard/tokens';
import type {
  Audience,
  AudienceInsights,
  PropertyDef,
  SegmentCondition,
  SegmentDefinition,
  SegmentOperator,
  SegmentResult,
  SegmentRow,
  SegmentSubFilter,
} from '@/lib/marketingOs/types';

const ACCENTS = [PASTEL.sky.fg, PASTEL.mint.fg, PASTEL.peach.fg, PASTEL.lavender.fg, PASTEL.sage.fg, PASTEL.coral.fg];
const SYNC_TARGETS = ['Meta Ads', 'Google Ads', 'LinkedIn', 'Webhook', 'CSV'] as const;
const OPERATOR_LABELS: Record<SegmentOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  is_any_of: 'is any of',
  contains: 'contains',
  within_past_days: 'within past days',
  gte: 'greater than or equal',
  lte: 'less than or equal',
  is_set: 'is set',
  is_not_set: 'is not set',
};

const emptyResult: SegmentResult = {
  total: 0,
  universe: 0,
  byStatus: [],
  bySource: [],
  byPriority: [],
  byCountry: [],
  trend: [],
  visitorReach: 0,
  sample: [],
};

interface ToastState {
  severity: 'success' | 'error' | 'info';
  message: string;
}

interface EnrichmentSource {
  title: string;
  url: string;
  content: string;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
}

function uid(prefix = 'seg') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(response.status === 503 ? 'AI not configured' : 'Request failed') as ApiError;
    error.status = response.status;
    if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
      error.code = payload.error;
      error.message = payload.error === 'not_configured' ? 'AI not configured' : payload.error;
    }
    throw error;
  }

  return payload as T;
}

function firstValueFor(property: PropertyDef): string | string[] | number | null {
  if (property.type === 'boolean') return null;
  if (property.type === 'enum') return property.options?.[0] ?? '';
  if (property.type === 'number' || property.type === 'days') return property.type === 'days' ? 30 : 1;
  return '';
}

function normalizeValue(property: PropertyDef, operator: SegmentOperator): string | string[] | number | null {
  if (operator === 'is_set' || operator === 'is_not_set' || property.type === 'boolean') return null;
  if (operator === 'is_any_of') return property.type === 'enum' ? [property.options?.[0] ?? ''].filter(Boolean) : [];
  return firstValueFor(property);
}

function createCondition(property: PropertyDef): SegmentCondition {
  const operator = property.operators[0] ?? 'equals';
  return { id: uid('condition'), property: property.key, operator, value: normalizeValue(property, operator) };
}

function createRow(property: PropertyDef): SegmentRow {
  return { id: uid('row'), condition: createCondition(property), sub: null };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number, universe: number) {
  if (!universe) return '0%';
  return `${Math.round((value / universe) * 100)}%`;
}

function propertyByKey(properties: PropertyDef[]) {
  return new Map(properties.map((property) => [property.key, property]));
}

function TinyChip({ children, color = DASH.ink }: { children: React.ReactNode; color?: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.2,
        py: 0.65,
        borderRadius: 999,
        bgcolor: DASH.bgSoft,
        border: `1px solid ${DASH.line}`,
        color,
        fontSize: 12.5,
        fontWeight: 850,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

function JoinerPill({ value, onToggle }: { value: SegmentDefinition['joiner']; onToggle: () => void }) {
  return (
    <Box sx={{ display: 'flex', pl: { xs: 0, md: 4 }, my: 1 }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        sx={{
          border: 0,
          cursor: 'pointer',
          px: 1.4,
          py: 0.55,
          borderRadius: 999,
          bgcolor: '#dff4f3',
          color: '#0f766e',
          fontWeight: 900,
          fontSize: 12,
          letterSpacing: 0.6,
          boxShadow: 'inset 0 0 0 1px rgba(15,118,110,0.12)',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  children,
  minWidth = 142,
}: {
  label: string;
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: minWidth } }}>
      <InputLabel sx={{ fontSize: 13, fontWeight: 800 }}>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          borderRadius: 999,
          bgcolor: DASH.bgSoft,
          fontSize: 13,
          fontWeight: 800,
          color: DASH.ink,
          '& .MuiSelect-select': { py: 0.9, px: 1.35 },
          '& fieldset': { borderColor: DASH.lineStrong },
        }}
      >
        {children}
      </Select>
    </FormControl>
  );
}

function ValueControl({
  property,
  operator,
  value,
  onChange,
}: {
  property: PropertyDef | undefined;
  operator: SegmentOperator;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number | null) => void;
}) {
  if (!property || operator === 'is_set' || operator === 'is_not_set' || property.type === 'boolean') {
    return <TinyChip color={DASH.muted}>No value needed</TinyChip>;
  }

  if (property.type === 'enum') {
    const options = property.options ?? [];
    if (operator === 'is_any_of') {
      const selected = Array.isArray(value) ? value : [];
      return (
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
          <InputLabel sx={{ fontSize: 13, fontWeight: 800 }}>Values</InputLabel>
          <Select<string[]>
            multiple
            value={selected}
            label="Values"
            onChange={(event) => {
              const raw = event.target.value;
              onChange(typeof raw === 'string' ? raw.split(',') : raw);
            }}
            renderValue={(selectedValues) => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedValues.map((item) => (
                  <Chip key={item} label={item} size="small" sx={{ height: 22, fontWeight: 800 }} />
                ))}
              </Box>
            )}
            sx={{ borderRadius: 999, bgcolor: '#fff', fontSize: 13, fontWeight: 800, '& fieldset': { borderColor: DASH.lineStrong } }}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={selected.includes(option)} size="small" />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <FieldSelect label="Value" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} minWidth={170}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </FieldSelect>
    );
  }

  const numeric = property.type === 'number' || property.type === 'days';
  return (
    <TextField
      value={value ?? ''}
      onChange={(event) => onChange(numeric ? Number(event.target.value) : event.target.value)}
      size="small"
      label={property.unit ? `Value (${property.unit})` : 'Value'}
      type={numeric ? 'number' : 'text'}
      sx={{
        minWidth: { xs: '100%', sm: 190 },
        '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: '#fff', fontSize: 13, fontWeight: 800 },
        '& .MuiOutlinedInput-input': { py: 0.9, px: 1.35 },
        '& fieldset': { borderColor: DASH.lineStrong },
      }}
    />
  );
}

function ConditionEditor({
  title,
  condition,
  properties,
  onChange,
  onRemove,
}: {
  title: string;
  condition: SegmentCondition | SegmentSubFilter;
  properties: PropertyDef[];
  onChange: (condition: SegmentCondition | SegmentSubFilter) => void;
  onRemove?: () => void;
}) {
  const propertiesMap = useMemo(() => propertyByKey(properties), [properties]);
  const selectedProperty = propertiesMap.get(condition.property) ?? properties[0];
  const operators = selectedProperty?.operators ?? [];

  const handlePropertyChange = (event: SelectChangeEvent<string>) => {
    const nextProperty = propertiesMap.get(event.target.value) ?? properties[0];
    if (!nextProperty) return;
    const operator = nextProperty.operators[0] ?? 'equals';
    onChange({ ...condition, property: nextProperty.key, operator, value: normalizeValue(nextProperty, operator) });
  };

  const handleOperatorChange = (event: SelectChangeEvent<string>) => {
    const operator = event.target.value as SegmentOperator;
    onChange({ ...condition, operator, value: selectedProperty ? normalizeValue(selectedProperty, operator) : null });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography sx={{ color: DASH.muted, fontSize: 13, fontWeight: 850, mr: 0.25 }}>{title}</Typography>
      <FieldSelect label="Property" value={condition.property} onChange={handlePropertyChange} minWidth={180}>
        {properties.map((property) => (
          <MenuItem key={property.key} value={property.key}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
              <PublicIcon sx={{ fontSize: 16, color: property.source === 'visitor' ? PASTEL.peach.fg : PASTEL.sky.fg }} />
              {property.label}
            </Box>
          </MenuItem>
        ))}
      </FieldSelect>
      <FieldSelect label="Operator" value={condition.operator} onChange={handleOperatorChange} minWidth={170}>
        {operators.map((operator) => (
          <MenuItem key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </MenuItem>
        ))}
      </FieldSelect>
      <ValueControl property={selectedProperty} operator={condition.operator} value={condition.value} onChange={(value) => onChange({ ...condition, value })} />
      <Box sx={{ flex: 1 }} />
      {onRemove && (
        <IconButton size="small" onClick={onRemove} aria-label="Remove filter">
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

function ConditionRowCard({
  row,
  index,
  properties,
  canRemove,
  onChange,
  onRemove,
}: {
  row: SegmentRow;
  index: number;
  properties: PropertyDef[];
  canRemove: boolean;
  onChange: (row: SegmentRow) => void;
  onRemove: () => void;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const addSubFilter = () => {
    const property = properties[0];
    if (!property) return;
    const operator = property.operators[0] ?? 'equals';
    onChange({ ...row, sub: { property: property.key, operator, value: normalizeValue(property, operator) } });
  };

  return (
    <Box
      component={motion.div}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      sx={{ position: 'relative', overflow: 'hidden', borderRadius: 3, bgcolor: DASH.panel, border: `1px solid ${DASH.line}`, boxShadow: '0 12px 30px -20px rgba(15,23,42,0.38)' }}
    >
      <Box sx={{ position: 'absolute', insetBlock: 0, left: 0, width: 5, bgcolor: accent }} />
      <Box sx={{ p: { xs: 2, md: 2.25 }, pl: { xs: 2.5, md: 3 }, display: 'grid', gap: 1.5 }}>
        <ConditionEditor
          title="Have property"
          condition={row.condition}
          properties={properties}
          onChange={(condition) => onChange({ ...row, condition: condition as SegmentCondition })}
          onRemove={canRemove ? onRemove : undefined}
        />
        {row.sub ? (
          <Box sx={{ ml: { xs: 0, md: 3 }, pt: 1.25, borderTop: `1px dashed ${DASH.lineStrong}` }}>
            <ConditionEditor
              title="where"
              condition={row.sub}
              properties={properties}
              onChange={(condition) => onChange({ ...row, sub: condition as SegmentSubFilter })}
              onRemove={() => onChange({ ...row, sub: null })}
            />
          </Box>
        ) : (
          <Box sx={{ ml: { xs: 0, md: 3 }, pt: 0.5 }}>
            <Button onClick={addSubFilter} size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, color: DASH.muted, fontWeight: 850, textTransform: 'none' }}>
              Add where sub-filter
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function BreakdownBars({ title, items, color }: { title: string; items: SegmentResult['byStatus']; color: string }) {
  const topItems = (items ?? []).slice(0, 5);
  const max = Math.max(1, ...topItems.map((item) => item.count));

  return (
    <GlassCard sx={{ p: 2.4 }}>
      <Typography sx={{ fontWeight: 900, color: DASH.ink, mb: 1.8 }}>{title}</Typography>
      {topItems.length === 0 ? (
        <Typography sx={{ color: DASH.faint, fontSize: 13, fontWeight: 700 }}>No breakdown yet</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.35 }}>
          {topItems.map((item, index) => (
            <Box key={`${title}-${item.label}`}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: DASH.body }}>{item.label}</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: DASH.ink }}>{formatNumber(item.count)}</Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 999, bgcolor: DASH.bgSoft, overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.max(4, (item.count / max) * 100)}%`, height: '100%', borderRadius: 999, bgcolor: index === 0 ? color : PASTEL.lavender.fg, opacity: index === 0 ? 1 : 0.72 }} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </GlassCard>
  );
}

function Sparkline({ trend }: { trend: SegmentResult['trend'] }) {
  const points = (trend ?? []).slice(-14);
  const max = Math.max(1, ...points.map((point) => point.count));

  return (
    <Box sx={{ display: 'flex', alignItems: 'end', gap: 0.55, height: 58 }}>
      {points.length === 0
        ? Array.from({ length: 14 }).map((_, index) => <Box key={index} sx={{ flex: 1, minWidth: 5, height: 8, borderRadius: 999, bgcolor: DASH.bgSoft }} />)
        : points.map((point) => (
            <Box key={point.date} sx={{ flex: 1, minWidth: 5, height: `${Math.max(10, (point.count / max) * 100)}%`, borderRadius: 999, bgcolor: PASTEL.mint.fg, opacity: 0.35 + (point.count / max) * 0.65 }} />
          ))}
    </Box>
  );
}

function OverlapDiagram({ result }: { result: SegmentResult }) {
  const legend = (result.byStatus.length ? result.byStatus : result.bySource).slice(0, 2);
  const overlap = result.universe ? Math.round((result.total / result.universe) * 100) : 0;

  return (
    <GlassCard sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 900, color: DASH.ink }}>Audience overlap</Typography>
        <TravelExploreIcon sx={{ color: PASTEL.lavender.fg }} />
      </Box>
      <Box sx={{ position: 'relative', height: 172, my: 1, borderRadius: 4, bgcolor: '#f8fafc', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', width: 134, height: 134, borderRadius: '50%', left: 32, top: 20, bgcolor: 'rgba(46,124,246,0.62)' }} />
        <Box sx={{ position: 'absolute', width: 134, height: 134, borderRadius: '50%', right: 32, top: 20, bgcolor: 'rgba(232,133,58,0.62)' }} />
        <Box sx={{ position: 'absolute', width: 72, height: 110, borderRadius: '50%', left: 'calc(50% - 36px)', top: 32, bgcolor: 'rgba(109,92,240,0.72)' }} />
      </Box>
      <Box sx={{ display: 'grid', gap: 1.1 }}>
        {[
          { label: legend[0]?.label ?? 'Matched leads', color: PASTEL.sky.fg },
          { label: legend[1]?.label ?? 'Visitor reach', color: PASTEL.peach.fg },
          { label: `Universe overlap · ${overlap}%`, color: PASTEL.lavender.fg },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: item.color }} />
            <Typography sx={{ fontSize: 13, color: DASH.body, fontWeight: 700 }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </GlassCard>
  );
}

function InsightsPanel({ insights, sources }: { insights: AudienceInsights | null; sources: EnrichmentSource[] }) {
  if (!insights) {
    return (
      <GlassCard sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, color: DASH.ink }}>AI insights</Typography>
        <Typography sx={{ mt: 1, color: DASH.muted, fontSize: 14.5, lineHeight: 1.6 }}>Generate insights or enrich with web context to see personas, messages, channels and next actions.</Typography>
      </GlassCard>
    );
  }

  return (
    <GlassCard sx={{ p: 2.5 }}>
      <Typography sx={{ fontWeight: 900, color: DASH.ink }}>{insights.persona}</Typography>
      <Typography sx={{ mt: 1, color: DASH.body, fontSize: 14.5, lineHeight: 1.6 }}>{insights.summary}</Typography>
      <Divider sx={{ my: 2, borderColor: DASH.line }} />
      {[
        ['Recommended channels', insights.recommendedChannels],
        ['Messaging angles', insights.messagingAngles],
        ['Next best actions', insights.nextBestActions],
        ['Risk flags', insights.riskFlags],
      ].map(([label, values]) => (
        <Box key={label as string} sx={{ mb: 1.7 }}>
          <Typography sx={{ mb: 0.8, fontSize: 12, fontWeight: 900, color: DASH.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label as string}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {(values as string[]).map((value) => (
              <Chip key={value} label={value} size="small" sx={{ borderRadius: 999, fontWeight: 800, bgcolor: DASH.bgSoft, border: `1px solid ${DASH.line}` }} />
            ))}
          </Box>
        </Box>
      ))}
      {sources.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ mb: 0.8, fontSize: 12, fontWeight: 900, color: DASH.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>Sources</Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {sources.map((source) => (
              <Box key={source.url} component="a" href={source.url} target="_blank" rel="noreferrer" sx={{ color: DASH.ink, textDecoration: 'none', fontWeight: 800, fontSize: 13.5, display: 'flex', gap: 0.8, alignItems: 'center' }}>
                <LinkIcon sx={{ fontSize: 16, color: PASTEL.sky.fg }} /> {source.title}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </GlassCard>
  );
}

export default function AudiencesPage() {
  const [properties, setProperties] = useState<PropertyDef[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<SegmentDefinition>({ joiner: 'AND', rows: [] });
  const [snapshot, setSnapshot] = useState<SegmentResult>(emptyResult);
  const [insights, setInsights] = useState<AudienceInsights | null>(null);
  const [sources, setSources] = useState<EnrichmentSource[]>([]);
  const [name, setName] = useState('New AI audience');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [syncTargets, setSyncTargets] = useState<string[]>([]);
  const [generatePrompt, setGeneratePrompt] = useState('High intent visitors likely to convert in the next 14 days');
  const [enrichPrompt, setEnrichPrompt] = useState('Find market context and messaging ideas for this audience.');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentMode, setAgentMode] = useState<'generate' | 'insights' | 'enrich' | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedAudience = useMemo(() => audiences.find((audience) => audience.id === selectedAudienceId) ?? null, [audiences, selectedAudienceId]);
  const memberPercent = formatPercent(snapshot.total, snapshot.universe);

  const showToast = useCallback((severity: ToastState['severity'], message: string) => {
    setToast({ severity, message });
  }, []);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      const apiError = error as Partial<ApiError>;
      showToast('error', apiError.code === 'not_configured' || apiError.message === 'AI not configured' ? 'AI not configured' : fallback);
    },
    [showToast],
  );

  const resetDraft = useCallback(
    (registry: PropertyDef[] = properties) => {
      setSelectedAudienceId(null);
      setName('New AI audience');
      setDescription('');
      setStatus('draft');
      setSyncTargets([]);
      setInsights(null);
      setSources([]);
      setSnapshot(emptyResult);
      setDefinition({ joiner: 'AND', rows: registry[0] ? [createRow(registry[0])] : [] });
    },
    [properties],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [registryResponse, audienceResponse] = await Promise.all([
          apiRequest<{ properties: PropertyDef[] }>('/api/admin/audiences/evaluate'),
          apiRequest<{ audiences: Audience[] }>('/api/admin/audiences'),
        ]);
        if (!active) return;
        const registry = registryResponse.properties ?? [];
        const saved = audienceResponse.audiences ?? [];
        setProperties(registry);
        setAudiences(saved);
        const firstAudience = saved[0];
        if (firstAudience) {
          setSelectedAudienceId(firstAudience.id);
          setName(firstAudience.name);
          setDescription(firstAudience.description ?? '');
          setStatus(firstAudience.status ?? 'draft');
          setSyncTargets(firstAudience.syncTargets ?? []);
          setInsights(firstAudience.insights ?? null);
          setDefinition(firstAudience.definition);
          setSnapshot(firstAudience.snapshot ?? emptyResult);
        } else {
          setSelectedAudienceId(null);
          setName('New AI audience');
          setDescription('');
          setStatus('draft');
          setSyncTargets([]);
          setInsights(null);
          setSources([]);
          setSnapshot(emptyResult);
          setDefinition({ joiner: 'AND', rows: registry[0] ? [createRow(registry[0])] : [] });
        }
      } catch (error) {
        handleError(error, 'Could not load audiences');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [handleError]);

  useEffect(() => {
    if (definition.rows.length === 0) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const evaluate = async () => {
        setEvaluating(true);
        try {
          const response = await apiRequest<{ result: SegmentResult }>('/api/admin/audiences/evaluate', {
            method: 'POST',
            body: JSON.stringify({ definition }),
          });
          if (active) setSnapshot(response.result);
        } catch (error) {
          handleError(error, 'Could not evaluate audience');
        } finally {
          if (active) setEvaluating(false);
        }
      };
      void evaluate();
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [definition, handleError]);

  const selectAudience = (audience: Audience) => {
    setSelectedAudienceId(audience.id);
    setName(audience.name);
    setDescription(audience.description ?? '');
    setStatus(audience.status ?? 'draft');
    setSyncTargets(audience.syncTargets ?? []);
    setInsights(audience.insights ?? null);
    setSources([]);
    setDefinition(audience.definition);
    setSnapshot(audience.snapshot ?? emptyResult);
  };

  const updateRow = (row: SegmentRow) => {
    setDefinition((current) => ({ ...current, rows: current.rows.map((existing) => (existing.id === row.id ? row : existing)) }));
  };

  const addRow = () => {
    const property = properties[0];
    if (!property) return;
    setDefinition((current) => ({ ...current, rows: [...current.rows, createRow(property)] }));
  };

  const removeRow = (rowId: string) => {
    setDefinition((current) => ({ ...current, rows: current.rows.length > 1 ? current.rows.filter((row) => row.id !== rowId) : current.rows }));
  };

  const toggleSyncTarget = (target: string) => {
    setSyncTargets((current) => (current.includes(target) ? current.filter((item) => item !== target) : [...current, target]));
  };

  const runGenerate = async () => {
    setAgentMode('generate');
    try {
      const response = await apiRequest<{ definition: SegmentDefinition; snapshot: SegmentResult }>('/api/admin/audiences/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'generate', prompt: generatePrompt }),
      });
      setDefinition(response.definition);
      setSnapshot(response.snapshot);
      showToast('success', 'AI generated audience definition');
    } catch (error) {
      handleError(error, 'Could not generate audience');
    } finally {
      setAgentMode(null);
    }
  };

  const runInsights = async () => {
    setAgentMode('insights');
    try {
      const response = await apiRequest<{ insights: AudienceInsights }>('/api/admin/audiences/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'insights', name, definition, snapshot }),
      });
      setInsights(response.insights);
      showToast('success', 'AI insights ready');
    } catch (error) {
      handleError(error, 'Could not generate insights');
    } finally {
      setAgentMode(null);
    }
  };

  const runEnrich = async () => {
    setAgentMode('enrich');
    try {
      const response = await apiRequest<{ insights: AudienceInsights; sources: EnrichmentSource[] }>('/api/admin/audiences/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'enrich', prompt: enrichPrompt }),
      });
      setInsights(response.insights);
      setSources(response.sources ?? []);
      showToast('success', 'Web enrichment complete');
    } catch (error) {
      handleError(error, 'Could not enrich audience');
    } finally {
      setAgentMode(null);
    }
  };

  const saveAudience = async () => {
    setSaving(true);
    try {
      if (selectedAudience) {
        const response = await apiRequest<{ audience: Audience }>(`/api/admin/audiences/${selectedAudience.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description, definition, insights, syncTargets, status, reevaluate: true }),
        });
        setAudiences((current) => current.map((audience) => (audience.id === response.audience.id ? response.audience : audience)));
        setSnapshot(response.audience.snapshot ?? snapshot);
        showToast('success', 'Audience saved');
      } else {
        const response = await apiRequest<{ audience: Audience }>('/api/admin/audiences', {
          method: 'POST',
          body: JSON.stringify({ name, description, definition, syncTargets }),
        });
        const finalAudience =
          insights || (status && status !== response.audience.status)
            ? (
                await apiRequest<{ audience: Audience }>(`/api/admin/audiences/${response.audience.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ insights, status, reevaluate: true }),
                })
              ).audience
            : response.audience;
        setAudiences((current) => [finalAudience, ...current]);
        selectAudience(finalAudience);
        showToast('success', 'Audience created');
      }
    } catch (error) {
      handleError(error, 'Could not save audience');
    } finally {
      setSaving(false);
    }
  };

  const deleteAudience = async () => {
    if (!selectedAudience || !window.confirm(`Delete ${selectedAudience.name}?`)) return;
    try {
      await apiRequest<{ ok: true }>(`/api/admin/audiences/${selectedAudience.id}`, { method: 'DELETE' });
      const remaining = audiences.filter((audience) => audience.id !== selectedAudience.id);
      setAudiences(remaining);
      if (remaining[0]) selectAudience(remaining[0]);
      else resetDraft();
      showToast('success', 'Audience deleted');
    } catch (error) {
      handleError(error, 'Could not delete audience');
    }
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <SoftHero
        eyebrow="Audience studio"
        title="Agentic audience builder"
        subtitle="Build production segments from the live property registry, evaluate real reach, and ask AI to generate, enrich and activate audiences."
        gradient={SOFT.teal}
        right={
          <GlassCard sx={{ px: 2.4, py: 1.7, minWidth: 210, bgcolor: 'rgba(255,255,255,0.78)', boxShadow: 'none' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', color: DASH.faint }}>Live members</Typography>
            <Typography component={motion.div} key={snapshot.total} initial={{ opacity: 0.55, y: 5 }} animate={{ opacity: 1, y: 0 }} sx={{ mt: 0.35, fontWeight: 900, fontSize: 30, color: DASH.ink }}>
              {formatNumber(snapshot.total)}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: DASH.muted }}>{memberPercent} of universe</Typography>
          </GlassCard>
        }
      />

      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr 360px' }, gap: 3, alignItems: 'start' }}>
        <GlassCard sx={{ p: 2.2, position: { md: 'sticky' }, top: { md: 16 } }}>
          <Button fullWidth variant="contained" onClick={() => resetDraft()} startIcon={<AddIcon />} sx={{ mb: 2, borderRadius: 999, bgcolor: DASH.pillActive, fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#000' } }}>
            New audience
          </Button>
          <Typography sx={{ mb: 1.4, fontSize: 12, fontWeight: 900, color: DASH.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>Saved audiences</Typography>
          {loading ? (
            <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>
          ) : audiences.length === 0 ? (
            <Typography sx={{ color: DASH.muted, fontSize: 14 }}>No saved audiences yet.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {audiences.map((audience) => {
                const active = audience.id === selectedAudienceId;
                return (
                  <Box key={audience.id} onClick={() => selectAudience(audience)} sx={{ p: 1.35, borderRadius: 3, cursor: 'pointer', bgcolor: active ? '#eaf8f6' : '#fff', border: `1px solid ${active ? 'rgba(15,118,110,0.18)' : DASH.line}`, transition: 'all .2s ease' }}>
                    <Typography sx={{ fontWeight: 900, color: DASH.ink, fontSize: 14.5 }}>{audience.name}</Typography>
                    <Typography sx={{ mt: 0.4, color: DASH.muted, fontSize: 12.5, fontWeight: 800 }}>{formatNumber(audience.snapshot?.total ?? 0)} members</Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </GlassCard>

        <GlassCard sx={{ p: { xs: 2.25, md: 3 }, background: 'linear-gradient(180deg,#ffffff 0%,#fbfdfc 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, display: 'grid', gap: 1.5 }}>
              <TextField label="Audience name" value={name} onChange={(event) => setName(event.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontWeight: 850 } }} />
              <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} fullWidth multiline minRows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField label="Status" value={status} onChange={(event) => setStatus(event.target.value)} size="small" sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 999, fontWeight: 850 } }} />
                {SYNC_TARGETS.map((target) => (
                  <Chip key={target} label={target} onClick={() => toggleSyncTarget(target)} color={syncTargets.includes(target) ? 'success' : 'default'} variant={syncTargets.includes(target) ? 'filled' : 'outlined'} sx={{ borderRadius: 999, fontWeight: 850 }} />
                ))}
              </Box>
            </Box>
            <IconBadge tone="mint" size={48}><AutoAwesomeIcon /></IconBadge>
          </Box>

          <GlassCard sx={{ p: 2, mb: 3, bgcolor: '#fbfdfc', boxShadow: 'none' }}>
            <Box sx={{ display: 'grid', gap: 1.4 }}>
              <Typography sx={{ fontWeight: 900, color: DASH.ink }}>✨ Generate with AI</Typography>
              <TextField value={generatePrompt} onChange={(event) => setGeneratePrompt(event.target.value)} placeholder="Describe who you want to reach" fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={runGenerate} disabled={agentMode !== null} startIcon={agentMode === 'generate' ? <CircularProgress size={16} /> : <AutoAwesomeIcon />} sx={{ borderRadius: 999, fontWeight: 900, textTransform: 'none' }}>Generate with AI</Button>
                <Button onClick={runInsights} disabled={agentMode !== null || definition.rows.length === 0} startIcon={agentMode === 'insights' ? <CircularProgress size={16} /> : <InsightsIcon />} sx={{ borderRadius: 999, fontWeight: 900, textTransform: 'none' }}>AI insights</Button>
                <TextField value={enrichPrompt} onChange={(event) => setEnrichPrompt(event.target.value)} size="small" placeholder="Web enrichment prompt" sx={{ flex: '1 1 220px', '& .MuiOutlinedInput-root': { borderRadius: 999 } }} />
                <Button onClick={runEnrich} disabled={agentMode !== null} startIcon={agentMode === 'enrich' ? <CircularProgress size={16} /> : <TravelExploreIcon />} sx={{ borderRadius: 999, fontWeight: 900, textTransform: 'none' }}>Enrich (web)</Button>
              </Box>
            </Box>
          </GlassCard>

          <Box sx={{ mb: 2.4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: DASH.ink }}>Builder</Typography>
              <Typography sx={{ mt: 0.6, color: DASH.body, fontWeight: 700 }}>Include members if they match these live data rules.</Typography>
            </Box>
            <JoinerPill value={definition.joiner} onToggle={() => setDefinition((current) => ({ ...current, joiner: current.joiner === 'AND' ? 'OR' : 'AND' }))} />
          </Box>

          {properties.length === 0 ? (
            <Box sx={{ p: 3, borderRadius: 3, bgcolor: DASH.bgSoft, textAlign: 'center' }}><Typography sx={{ color: DASH.muted, fontWeight: 800 }}>Loading property registry…</Typography></Box>
          ) : (
            <Box sx={{ display: 'grid' }}>
              {definition.rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <ConditionRowCard row={row} index={index} properties={properties} canRemove={definition.rows.length > 1} onChange={updateRow} onRemove={() => removeRow(row.id)} />
                  {index < definition.rows.length - 1 && <JoinerPill value={definition.joiner} onToggle={() => setDefinition((current) => ({ ...current, joiner: current.joiner === 'AND' ? 'OR' : 'AND' }))} />}
                </React.Fragment>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 2.25, display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Button onClick={addRow} disabled={properties.length === 0} startIcon={<AddIcon />} sx={{ borderRadius: 999, px: 1.5, color: DASH.ink, fontWeight: 900, textTransform: 'none', bgcolor: '#eaf8f6' }}>Add filter</Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedAudience && <Button color="error" onClick={deleteAudience} startIcon={<DeleteOutlineIcon />} sx={{ borderRadius: 999, fontWeight: 900, textTransform: 'none' }}>Delete</Button>}
              <Button variant="contained" onClick={saveAudience} disabled={saving || definition.rows.length === 0} startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />} sx={{ borderRadius: 999, bgcolor: DASH.pillActive, fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#000' } }}>Save</Button>
            </Box>
          </Box>
        </GlassCard>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <GlassCard sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography component={motion.div} key={`members-${snapshot.total}`} initial={{ opacity: 0.5, y: 5 }} animate={{ opacity: 1, y: 0 }} sx={{ fontSize: 28, fontWeight: 900, color: DASH.ink }}>{formatNumber(snapshot.total)} members</Typography>
                <Typography sx={{ mt: 0.6, fontSize: 13, color: DASH.muted, fontWeight: 700 }}>{evaluating ? 'Evaluating live reach…' : `${memberPercent} of ${formatNumber(snapshot.universe)} leads`}</Typography>
              </Box>
              {evaluating ? <CircularProgress size={22} /> : <TinyChip color={PASTEL.mint.fg}>Real count</TinyChip>}
            </Box>
            <Divider sx={{ my: 2, borderColor: DASH.line }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box><Typography sx={{ fontSize: 12, color: DASH.faint, fontWeight: 900 }}>Universe</Typography><Typography sx={{ fontWeight: 900, color: DASH.ink }}>{formatNumber(snapshot.universe)}</Typography></Box>
              <Box><Typography sx={{ fontSize: 12, color: DASH.faint, fontWeight: 900 }}>Estimated reach</Typography><Typography sx={{ fontWeight: 900, color: DASH.ink }}>{formatNumber(snapshot.visitorReach)}</Typography></Box>
            </Box>
            <Box sx={{ mt: 2 }}><Sparkline trend={snapshot.trend} /></Box>
          </GlassCard>
          <OverlapDiagram result={snapshot} />
          <BreakdownBars title="Status mix" items={snapshot.byStatus ?? []} color={PASTEL.mint.fg} />
          <BreakdownBars title="Source mix" items={snapshot.bySource ?? []} color={PASTEL.sky.fg} />
          <BreakdownBars title="Priority mix" items={snapshot.byPriority ?? []} color={PASTEL.peach.fg} />
          <BreakdownBars title="Country / state value" items={snapshot.byCountry ?? []} color={PASTEL.lavender.fg} />
          <GlassCard sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, color: DASH.ink, mb: 1.5 }}>Sample members</Typography>
            {(snapshot.sample ?? []).length === 0 ? <Typography sx={{ color: DASH.faint, fontSize: 13, fontWeight: 700 }}>No sample members yet</Typography> : (snapshot.sample ?? []).slice(0, 4).map((item) => (
              <Box key={item.id} sx={{ py: 1, borderTop: `1px solid ${DASH.line}` }}>
                <Typography sx={{ fontWeight: 900, color: DASH.ink, fontSize: 13.5 }}>{item.name}</Typography>
                <Typography sx={{ color: DASH.muted, fontSize: 12.5 }}>{item.company} · {item.status}</Typography>
              </Box>
            ))}
          </GlassCard>
          <InsightsPanel insights={insights} sources={sources} />
        </Box>
      </Box>

      <Snackbar open={Boolean(toast)} autoHideDuration={4200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
