'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box, Button, Typography, CircularProgress, Container, TextField,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Checkbox, Select, MenuItem, Rating, Stack, Alert,
} from '@mui/material';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const BASE = `${API}/api/v1/public`;

function getAnonId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('_tv_anon');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('_tv_anon', id);
  }
  return id;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  condition?: {
    depends_on?: string;
    field_id?: string;
    operator?: string;
    value?: string;
  };
}

interface FormData {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  fields: FormField[];
  settings: Record<string, unknown>;
  slug: string;
}

function evaluateCondition(
  condition: FormField['condition'],
  values: Record<string, string>
): boolean {
  if (!condition) return true;
  const depField = condition.depends_on || condition.field_id || '';
  const op = condition.operator || 'eq';
  const expected = condition.value || '';
  const actual = values[depField] || '';

  if (!actual && op !== 'neq') return false;
  switch (op) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'contains': return actual.includes(expected);
    default: return true;
  }
}

function FieldRenderer({
  field, value, onChange, onFocus,
}: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  onFocus: () => void;
}) {
  const common = { fullWidth: true, size: 'small' as const, onFocus };

  switch (field.type) {
    case 'email':
      return <TextField {...common} type="email" label={field.label} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'text':
      return <TextField {...common} label={field.label} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'select':
      return (
        <FormControl {...common}>
          <FormLabel sx={{ fontSize: 13, mb: 0.5 }}>{field.label}</FormLabel>
          <Select value={value} onChange={(e) => onChange(e.target.value as string)} size="small">
            <MenuItem value=""><em>Select...</em></MenuItem>
            {(field.options || []).map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
      );
    case 'radio':
      return (
        <FormControl>
          <FormLabel sx={{ fontSize: 13 }}>{field.label}</FormLabel>
          <RadioGroup value={value} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map((opt) => (
              <FormControlLabel key={opt} value={opt} control={<Radio size="small" />} label={opt} />
            ))}
          </RadioGroup>
        </FormControl>
      );
    case 'checkbox':
      return (
        <FormControlLabel
          control={<Checkbox checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} size="small" />}
          label={field.label}
        />
      );
    case 'rating':
      return (
        <Box>
          <Typography sx={{ fontSize: 13, mb: 0.5 }}>{field.label}</Typography>
          <Rating value={Number(value) || 0} onChange={(_, v) => onChange(String(v || 0))} />
        </Box>
      );
    case 'nps':
      return (
        <Box>
          <Typography sx={{ fontSize: 13, mb: 1 }}>{field.label}</Typography>
          <Stack direction="row" spacing={0.5}>
            {Array.from({ length: 11 }, (_, i) => (
              <Button
                key={i}
                variant={value === String(i) ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onChange(String(i))}
                sx={{
                  minWidth: 32, px: 0.5,
                  bgcolor: value === String(i) ? '#14BB87' : undefined,
                  borderColor: '#E5E7EB',
                  color: value === String(i) ? '#fff' : '#374151',
                  '&:hover': { bgcolor: value === String(i) ? '#10a076' : '#F9FAFB' },
                }}
              >
                {i}
              </Button>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>Not likely</Typography>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>Very likely</Typography>
          </Stack>
        </Box>
      );
    default:
      return <TextField {...common} label={field.label} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.id as string;
  const [form, setForm] = useState<FormData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const loadTime = useRef(Date.now());
  const trackedFields = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!formId) return;
    fetch(`${BASE}/forms/${formId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Form not found' : 'Failed to load');
        return r.json();
      })
      .then((data: FormData) => {
        setForm(data);
        loadTime.current = Date.now();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  const trackField = useCallback((fieldId: string, eventType: string) => {
    const key = `${fieldId}:${eventType}`;
    if (trackedFields.current.has(key)) return;
    trackedFields.current.add(key);
    fetch(`${BASE}/forms/${formId}/field-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, event_type: eventType, anon_id: getAnonId() }),
    }).catch(() => {});
  }, [formId]);

  const handleSubmit = async () => {
    if (!form) return;
    setValidationErrors([]);
    setSubmitting(true);

    // Track completed for all filled fields
    Object.entries(values).forEach(([fid, val]) => {
      if (val) trackField(fid, 'completed');
    });

    try {
      const res = await fetch(`${BASE}/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: values,
          anon_id: getAnonId(),
          timestamp: loadTime.current,
        }),
      });
      if (res.status === 422) {
        const err = await res.json();
        const errs = err?.detail?.errors || err?.errors || ['Validation failed'];
        setValidationErrors(Array.isArray(errs) ? errs : [String(errs)]);
        return;
      }
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (e: unknown) {
      setValidationErrors([e instanceof Error ? e.message : 'Submission failed']);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA' }}>
        <CircularProgress sx={{ color: '#14BB87' }} />
      </Box>
    );
  }

  if (error || !form) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA', gap: 2 }}>
        <Typography sx={{ fontSize: 48, color: '#E5E7EB' }}>404</Typography>
        <Typography sx={{ fontSize: 16, color: '#6B7280' }}>{error || 'Form not found'}</Typography>
      </Box>
    );
  }

  if (submitted) {
    const redirect = form.settings?.redirect as string | undefined;
    if (redirect) {
      if (typeof window !== 'undefined') window.location.href = redirect;
    }
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA', gap: 2 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#14BB87' }}>Thank you!</Typography>
        <Typography sx={{ fontSize: 14, color: '#6B7280' }}>Your response has been recorded.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAFA', py: 6 }}>
      <Container maxWidth="sm">
        <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #E5E7EB', p: { xs: 3, md: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0E1116', mb: 1 }}>{form.name}</Typography>
          {form.description && (
            <Typography sx={{ fontSize: 14, color: '#6B7280', mb: 3 }}>{form.description}</Typography>
          )}

          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {form.fields.map((field) => {
              if (field.condition && !evaluateCondition(field.condition, values)) {
                return null;
              }
              return (
                <Box key={field.id}>
                  <FieldRenderer
                    field={field}
                    value={values[field.id] || ''}
                    onChange={(val) => {
                      setValues((prev) => ({ ...prev, [field.id]: val }));
                      trackField(field.id, 'completed');
                    }}
                    onFocus={() => trackField(field.id, 'started')}
                  />
                </Box>
              );
            })}

            {/* Honeypot (hidden from real users) */}
            <Box sx={{ position: 'absolute', left: -9999, opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <TextField
                name="_hp"
                tabIndex={-1}
                autoComplete="off"
                value={values['_hp'] || ''}
                onChange={(e) => setValues((prev) => ({ ...prev, _hp: e.target.value }))}
              />
            </Box>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              variant="contained"
              sx={{
                bgcolor: '#14BB87', color: '#fff', fontWeight: 600, py: 1.2,
                '&:hover': { bgcolor: '#10a076' }, textTransform: 'none', mt: 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
