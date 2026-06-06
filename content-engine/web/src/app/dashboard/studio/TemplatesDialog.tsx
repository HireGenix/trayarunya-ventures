'use client';

/**
 * Templates library + bulk generation dialog.
 *
 * Shows a gallery of content templates, lets users pick one, fill variables
 * (or upload CSV for bulk), generate, and view results.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArticleIcon from '@mui/icons-material/Article';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  SectionLabel,
  FieldGrid,
  FullSpan,
  DialogFooter,
  inkPillSx,
  ghostPillSx,
  softPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';
import {
  ContentOptimize,
  type ContentTemplate,
} from '@/lib/api';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const TEAL = BRAND.teal;

const CATEGORY_COLORS: Record<string, string> = {
  'Long-form': BRAND.teal,
  'Conversion': BRAND.amber,
  'Ads': BRAND.pink,
  'Email': '#0a66c2',
  'E-commerce': '#e4405f',
};

// ── Template card ───────────────────────────────────────────────────────────
function TemplateCard({ t, onClick, onEdit, onDelete }: { t: ContentTemplate; onClick: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const color = CATEGORY_COLORS[t.category] || TEAL;
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5, borderRadius: 4, cursor: 'pointer', position: 'relative',
        border: '1px solid rgba(14,17,22,0.08)',
        transition: 'all 0.15s',
        '&:hover': { borderColor: color, boxShadow: `0 4px 20px -6px ${color}30`, transform: 'translateY(-1px)' },
        '&:hover .tpl-actions': { opacity: 1 },
      }}
    >
      {(onEdit || onDelete) && (
        <Stack
          direction="row"
          spacing={0.25}
          className="tpl-actions"
          sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.15s' }}
        >
          {onEdit && (
            <IconButton
              size="small"
              aria-label="Edit template"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              sx={{ color: SUBTLE, '&:hover': { color: INK } }}
            >
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              aria-label="Delete template"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              sx={{ color: SUBTLE, '&:hover': { color: BRAND.pink } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Stack>
      )}
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: `${color}14`, color,
          '& svg': { fontSize: 20 },
        }}>
          <ArticleIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK, mb: 0.25 }}>{t.name}</Typography>
          <Typography sx={{ fontSize: 12, color: SUBTLE, lineHeight: 1.4, mb: 0.75 }}>{t.description}</Typography>
          <Stack direction="row" gap={0.5}>
            <Chip size="small" label={t.category} sx={{ fontSize: 10, fontWeight: 700, height: 20, background: `${color}14`, color }} />
            <Chip size="small" label={`${t.variables.length} vars`} sx={{ fontSize: 10, fontWeight: 600, height: 20, background: 'rgba(14,17,22,0.04)', color: SUBTLE }} />
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}

// ── Main dialog ─────────────────────────────────────────────────────────────
interface TemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  provider?: string;
  onGenerated?: (results: { title: string; body: string }[]) => void;
}

export default function TemplatesDialog({ open, onClose, provider, onGenerated }: TemplatesDialogProps) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [selected, setSelected] = useState<ContentTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ title: string; body: string; error?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setVariables({});
    setResults([]);
    setCsvRows([]);
    setMode('single');
    setEditingTemplate(null);
    setCustomName('');
    setCustomDesc('');
    setCustomPrompt('');
    ContentOptimize.templates()
      .then(r => setTemplates(r.templates))
      .catch(() => {});
  }, [open]);

  const selectTemplate = useCallback((t: ContentTemplate) => {
    setSelected(t);
    const vars: Record<string, string> = {};
    t.variables.forEach(v => { vars[v.name] = ''; });
    setVariables(vars);
    setResults([]);
    setCsvRows([]);
  }, []);

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ''; });
        rows.push(row);
      }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  }, [selected]);

  const generate = useCallback(async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      if (mode === 'single') {
        const res = await ContentOptimize.templateGenerate({
          template_id: selected.id,
          variables,
          provider,
        });
        setResults([{ title: res.title, body: res.body }]);
      } else if (csvRows.length > 0) {
        const res = await ContentOptimize.bulkGenerate({
          template_id: selected.id,
          rows: csvRows,
          provider,
        });
        setResults(res.results);
      }
    } catch { /* */ }
    setGenerating(false);
  }, [selected, mode, variables, csvRows, provider]);

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const saveCustomTemplate = useCallback(async () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        const updated = await ContentOptimize.templateUpdate(editingTemplate.id, {
          name: customName,
          description: customDesc,
          system_prompt: customPrompt,
        });
        setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await ContentOptimize.templateCreate({
          template_key: customName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80),
          name: customName,
          description: customDesc,
          content_type: 'blog',
          system_prompt: customPrompt,
          user_prompt_template: 'Generate content about: {{topic}}',
          variables: [{ key: 'topic', label: 'Topic', placeholder: 'Enter topic' }] as unknown as Record<string, string>[],
        });
        setTemplates(prev => [...prev, created]);
      }
      setSelected(null);
      setEditingTemplate(null);
      setCustomName('');
      setCustomDesc('');
      setCustomPrompt('');
    } catch { /* ignore */ }
    setSavingTemplate(false);
  }, [customName, customDesc, customPrompt, editingTemplate]);

  const startEditTemplate = useCallback((t: ContentTemplate) => {
    setEditingTemplate(t);
    setCustomName(t.name);
    setCustomDesc(t.description);
    setCustomPrompt(t.system_prompt);
    setSelected({
      id: '__new__',
      name: '',
      category: 'Custom',
      description: '',
      content_type: 'blog',
      variables: [],
      system_prompt: '',
      user_prompt_template: '',
    });
    setResults([]);
    setCsvRows([]);
    setMode('single');
  }, []);

  const deleteTemplate = useCallback(async (t: ContentTemplate) => {
    try {
      await ContentOptimize.templateDelete(t.id);
      setTemplates(prev => prev.filter(x => x.id !== t.id));
    } catch { /* ignore */ }
  }, []);

  const canGenerate = selected && selected.id !== '__new__' && (
    mode === 'single'
      ? selected.variables.filter(v => v.required).every(v => variables[v.name]?.trim())
      : csvRows.length > 0
  );

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<DescriptionIcon />}
        title="Content Templates"
        subtitle={selected ? selected.name : 'Pick a template to get started'}
        onClose={onClose}
        tint={BRAND.amber}
        tintSoft={BRAND.amberSoft}
        right={selected && (
          <Button sx={ghostPillSx} onClick={() => { setSelected(null); setResults([]); setEditingTemplate(null); }} size="small">
            Back to gallery
          </Button>
        )}
      />
      <DialogBody>
        {!selected ? (
          /* Gallery */
          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => {
                const custom: ContentTemplate = {
                  id: '__new__',
                  name: '',
                  category: 'Custom',
                  description: '',
                  content_type: 'blog',
                  variables: [],
                  system_prompt: '',
                  user_prompt_template: '',
                };
                selectTemplate(custom);
                setMode('single');
              }}
              sx={{ borderRadius: '14px', textTransform: 'none', fontWeight: 700, borderStyle: 'dashed', borderColor: 'rgba(15,17,22,0.2)', color: INK, py: 1.5 }}
            >
              + Create custom template
            </Button>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {templates.map(t => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  onClick={() => selectTemplate(t)}
                  onEdit={() => startEditTemplate(t)}
                  onDelete={() => deleteTemplate(t)}
                />
              ))}
              {templates.length === 0 && (
                <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: TEAL }} />
                </Box>
              )}
            </Box>
          </Stack>
        ) : results.length > 0 ? (
          /* Results */
          <Stack spacing={2}>
            <SectionLabel>Generated content ({results.length} items)</SectionLabel>
            {results.map((r, i) => (
              <Card key={i} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                {r.error ? (
                  <Typography sx={{ fontSize: 13, color: BRAND.pink }}>{r.error}</Typography>
                ) : (
                  <>
                    <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: TEAL }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK }}>{r.title || 'Untitled'}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 13, color: SUBTLE, whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 200, overflow: 'auto' }}>{r.body.slice(0, 1000)}{r.body.length > 1000 ? '...' : ''}</Typography>
                  </>
                )}
              </Card>
            ))}
          </Stack>
        ) : (
          /* Variable form */
          <Stack spacing={2.5}>
            {selected.id === '__new__' ? (
              <>
                <SectionLabel>{editingTemplate ? 'Edit template' : 'Create custom template'}</SectionLabel>
                <FieldGrid>
                  <TextField
                    label="Template name *"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                  <TextField
                    label="Description"
                    value={customDesc}
                    onChange={e => setCustomDesc(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                  <FullSpan>
                    <TextField
                      label="System prompt *"
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      size="small"
                      fullWidth
                      multiline
                      minRows={4}
                      placeholder="Describe how the AI should generate content for this template..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </FullSpan>
                </FieldGrid>
              </>
            ) : (
            <>
            {/* Mode toggle */}
            <Stack direction="row" gap={1}>
              <Button
                size="small"
                onClick={() => setMode('single')}
                sx={mode === 'single' ? inkPillSx : ghostPillSx}
              >
                Single
              </Button>
              <Button
                size="small"
                onClick={() => setMode('bulk')}
                sx={mode === 'bulk' ? inkPillSx : ghostPillSx}
              >
                Bulk (CSV)
              </Button>
            </Stack>

            {mode === 'single' ? (
              <>
                <SectionLabel>Fill in variables</SectionLabel>
                <FieldGrid>
                  {selected.variables.map(v => (
                    <TextField
                      key={v.name}
                      label={`${v.label}${v.required ? ' *' : ''}`}
                      placeholder={v.placeholder}
                      value={variables[v.name] || ''}
                      onChange={e => setVariables(prev => ({ ...prev, [v.name]: e.target.value }))}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  ))}
                </FieldGrid>
              </>
            ) : (
              <>
                <SectionLabel>Upload CSV</SectionLabel>
                <Typography sx={{ fontSize: 12.5, color: SUBTLE, mb: 1 }}>
                  CSV headers should match variable names: {selected.variables.map(v => v.name).join(', ')}
                </Typography>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSV}
                  style={{ display: 'none' }}
                />
                <Button
                  sx={softPillSx}
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileRef.current?.click()}
                >
                  {csvRows.length > 0 ? `${csvRows.length} rows loaded` : 'Choose CSV file'}
                </Button>
                {csvRows.length > 0 && (
                  <Typography sx={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>
                    {csvRows.length} rows ready for generation
                  </Typography>
                )}
              </>
            )}
            </>
            )}
          </Stack>
        )}
      </DialogBody>

      <DialogFooter hint={results.length > 0 ? `${results.filter(r => !r.error).length} of ${results.length} generated successfully` : undefined}>
        <Button sx={ghostPillSx} onClick={onClose}>Close</Button>
        {selected?.id === '__new__' && (
          <Button
            sx={inkPillSx}
            onClick={saveCustomTemplate}
            disabled={savingTemplate || !customName.trim() || !customPrompt.trim()}
            startIcon={savingTemplate ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
          >
            {savingTemplate ? 'Saving...' : editingTemplate ? 'Update template' : 'Save template'}
          </Button>
        )}
        {results.length === 0 && selected && selected.id !== '__new__' && (
          <Button
            sx={inkPillSx}
            onClick={generate}
            disabled={generating || !canGenerate}
            startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {generating ? 'Generating...' : mode === 'bulk' ? `Generate ${csvRows.length} items` : 'Generate'}
          </Button>
        )}
        {results.length > 0 && (
          <Button
            sx={inkPillSx}
            onClick={() => { onGenerated?.(results.filter(r => !r.error)); onClose(); }}
          >
            Done
          </Button>
        )}
      </DialogFooter>
    </PremiumDialog>
  );
}
