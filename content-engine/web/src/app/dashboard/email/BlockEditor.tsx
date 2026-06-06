'use client';

import { useRef, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Menu,
  IconButton,
  Button,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import TitleRoundedIcon from '@mui/icons-material/TitleRounded';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import SmartButtonRoundedIcon from '@mui/icons-material/SmartButtonRounded';
import HorizontalRuleRoundedIcon from '@mui/icons-material/HorizontalRuleRounded';
import HeightRoundedIcon from '@mui/icons-material/HeightRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatAlignCenterRoundedIcon from '@mui/icons-material/FormatAlignCenterRounded';
import FormatAlignRightRoundedIcon from '@mui/icons-material/FormatAlignRightRounded';
import { BRAND } from '@/theme/theme';
import {
  type Align,
  type Block,
  type BlockType,
  type LeafBlock,
  type ColumnsBlock,
  BLOCK_LABELS,
  MERGE_TAGS,
  makeBlock,
  insertAtCaret,
  INK,
  SUBTLE,
  LINE,
} from './blocks';

const BLOCK_ICON: Record<BlockType, React.ReactNode> = {
  heading: <TitleRoundedIcon sx={{ fontSize: 17 }} />,
  text: <NotesRoundedIcon sx={{ fontSize: 17 }} />,
  image: <ImageRoundedIcon sx={{ fontSize: 17 }} />,
  button: <SmartButtonRoundedIcon sx={{ fontSize: 17 }} />,
  divider: <HorizontalRuleRoundedIcon sx={{ fontSize: 17 }} />,
  spacer: <HeightRoundedIcon sx={{ fontSize: 17 }} />,
  columns: <ViewColumnRoundedIcon sx={{ fontSize: 17 }} />,
};

const ALL_TYPES: BlockType[] = [
  'heading',
  'text',
  'image',
  'button',
  'divider',
  'spacer',
  'columns',
];
const LEAF_TYPES: BlockType[] = ['heading', 'text', 'image', 'button', 'divider', 'spacer'];

// --------------------------------------------------------------------------- //
// Merge-tag menu (reusable). Calls onInsert with the chosen tag string.
// --------------------------------------------------------------------------- //
export function MergeTagMenu({
  onInsert,
  size = 'small',
}: {
  onInsert: (tag: string) => void;
  size?: 'small' | 'medium';
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <>
      <Button
        size={size}
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<DataObjectRoundedIcon sx={{ fontSize: 16 }} />}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          color: SUBTLE,
          borderRadius: '999px',
          border: `1px solid ${LINE}`,
          px: 1.25,
          py: 0.25,
          '&:hover': { background: 'rgba(14,17,22,0.04)' },
        }}
      >
        Merge tags
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
          setCustomOpen(false);
        }}
      >
        {MERGE_TAGS.map((t) =>
          t.custom ? (
            <Box key={t.value} sx={{ px: 1.5, py: 0.5 }}>
              {!customOpen ? (
                <MenuItem
                  sx={{ px: 1, borderRadius: '8px' }}
                  onClick={() => setCustomOpen(true)}
                >
                  {t.label}
                </MenuItem>
              ) : (
                <Stack direction="row" gap={0.75} alignItems="center" sx={{ py: 0.5 }}>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="plan"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    sx={{ width: 140 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    sx={{ textTransform: 'none', borderRadius: '8px', background: INK }}
                    onClick={() => {
                      const key = custom.trim();
                      if (key) onInsert(`{{attributes.${key}}}`);
                      setCustom('');
                      setCustomOpen(false);
                      setAnchor(null);
                    }}
                  >
                    Insert
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            <MenuItem
              key={t.value}
              onClick={() => {
                onInsert(t.value);
                setAnchor(null);
              }}
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
            >
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{t.label}</Typography>
              <Typography sx={{ fontSize: 12, color: SUBTLE, fontFamily: 'monospace' }}>
                {t.value}
              </Typography>
            </MenuItem>
          ),
        )}
      </Menu>
    </>
  );
}

// --------------------------------------------------------------------------- //
// Text field with an attached merge-tag inserter that respects the caret.
// --------------------------------------------------------------------------- //
export function MergeTextField({
  label,
  value,
  onChange,
  multiline,
  minRows,
  placeholder,
  showMerge = true,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  minRows?: number;
  placeholder?: string;
  showMerge?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const caret = useRef<number | null>(null);

  const rememberCaret = () => {
    const el = ref.current;
    if (el) caret.current = el.selectionStart;
  };

  return (
    <Box>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={rememberCaret}
        onKeyUp={rememberCaret}
        onClick={rememberCaret}
        onBlur={rememberCaret}
        inputRef={ref}
        multiline={multiline}
        minRows={minRows}
        placeholder={placeholder}
        fullWidth
        size="small"
      />
      {showMerge && (
        <Box sx={{ mt: 0.75 }}>
          <MergeTagMenu
            onInsert={(tag) => onChange(insertAtCaret(value, tag, caret.current))}
          />
        </Box>
      )}
    </Box>
  );
}

// --------------------------------------------------------------------------- //
// Alignment toggle
// --------------------------------------------------------------------------- //
function AlignToggle({ value, onChange }: { value: Align; onChange: (a: Align) => void }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, v: Align | null) => v && onChange(v)}
      sx={{
        '& .MuiToggleButton-root': {
          border: `1px solid ${LINE}`,
          borderRadius: '10px !important',
          px: 1,
          py: 0.4,
          mx: 0.25,
          color: SUBTLE,
          '&.Mui-selected': { background: INK, color: '#fff', '&:hover': { background: '#000' } },
        },
      }}
    >
      <ToggleButton value="left"><FormatAlignLeftRoundedIcon sx={{ fontSize: 16 }} /></ToggleButton>
      <ToggleButton value="center"><FormatAlignCenterRoundedIcon sx={{ fontSize: 16 }} /></ToggleButton>
      <ToggleButton value="right"><FormatAlignRightRoundedIcon sx={{ fontSize: 16 }} /></ToggleButton>
    </ToggleButtonGroup>
  );
}

// --------------------------------------------------------------------------- //
// Leaf block editor (no columns)
// --------------------------------------------------------------------------- //
function LeafEditor({
  block,
  onChange,
}: {
  block: LeafBlock;
  onChange: (b: LeafBlock) => void;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <Stack gap={1.25}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              label="Level"
              value={block.level}
              onChange={(e) =>
                onChange({ ...block, level: Number(e.target.value) as 1 | 2 | 3 })
              }
              sx={{ width: 100 }}
            >
              <MenuItem value={1}>H1</MenuItem>
              <MenuItem value={2}>H2</MenuItem>
              <MenuItem value={3}>H3</MenuItem>
            </TextField>
            <AlignToggle value={block.align} onChange={(align) => onChange({ ...block, align })} />
          </Stack>
          <MergeTextField
            label="Heading text"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
          />
        </Stack>
      );
    case 'text':
      return (
        <Stack gap={1.25}>
          <AlignToggle value={block.align} onChange={(align) => onChange({ ...block, align })} />
          <MergeTextField
            label="Text"
            value={block.content}
            onChange={(content) => onChange({ ...block, content })}
            multiline
            minRows={3}
          />
        </Stack>
      );
    case 'image':
      return (
        <Stack gap={1.25}>
          <TextField
            size="small"
            label="Image URL"
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            fullWidth
          />
          <Stack direction="row" gap={1} flexWrap="wrap">
            <TextField
              size="small"
              label="Alt text"
              value={block.alt}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              size="small"
              label="Width (e.g. 100%, 320px)"
              value={block.width}
              onChange={(e) => onChange({ ...block, width: e.target.value })}
              sx={{ flex: '1 1 160px' }}
            />
          </Stack>
          <TextField
            size="small"
            label="Link URL (optional)"
            value={block.link}
            onChange={(e) => onChange({ ...block, link: e.target.value })}
            fullWidth
          />
        </Stack>
      );
    case 'button':
      return (
        <Stack gap={1.25}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <MergeTextField
              label="Button text"
              value={block.text}
              onChange={(text) => onChange({ ...block, text })}
              showMerge={false}
            />
          </Stack>
          <TextField
            size="small"
            label="URL"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            fullWidth
          />
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <ColorField
              label="Button color"
              value={block.color}
              onChange={(color) => onChange({ ...block, color })}
            />
            <ColorField
              label="Text color"
              value={block.textColor}
              onChange={(textColor) => onChange({ ...block, textColor })}
            />
            <AlignToggle value={block.align} onChange={(align) => onChange({ ...block, align })} />
          </Stack>
        </Stack>
      );
    case 'divider':
      return (
        <Typography sx={{ fontSize: 13, color: SUBTLE }}>
          A horizontal divider line. No configuration needed.
        </Typography>
      );
    case 'spacer':
      return (
        <TextField
          size="small"
          type="number"
          label="Height (px)"
          value={block.height}
          onChange={(e) =>
            onChange({ ...block, height: Math.max(0, Number(e.target.value) || 0) })
          }
          sx={{ width: 140 }}
          inputProps={{ min: 0, max: 200 }}
        />
      );
  }
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Stack direction="row" gap={0.75} alignItems="center">
      <Box
        component="input"
        type="color"
        value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : '#000000'}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{
          width: 34,
          height: 34,
          p: 0,
          border: `1px solid ${LINE}`,
          borderRadius: '8px',
          background: 'none',
          cursor: 'pointer',
        }}
      />
      <TextField
        size="small"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 130 }}
      />
    </Stack>
  );
}

// --------------------------------------------------------------------------- //
// Add-block control
// --------------------------------------------------------------------------- //
function AddBlock({
  onAdd,
  types,
  label = 'Add block',
}: {
  onAdd: (type: BlockType) => void;
  types: BlockType[];
  label?: string;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<AddRoundedIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          color: INK,
          borderRadius: '12px',
          border: `1px dashed ${LINE}`,
          py: 1,
          width: '100%',
          '&:hover': { background: 'rgba(14,17,22,0.03)' },
        }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {types.map((t) => (
          <MenuItem
            key={t}
            onClick={() => {
              onAdd(t);
              setAnchor(null);
            }}
            sx={{ gap: 1.25, minWidth: 160 }}
          >
            <Box sx={{ color: SUBTLE, display: 'grid', placeItems: 'center' }}>{BLOCK_ICON[t]}</Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{BLOCK_LABELS[t]}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// --------------------------------------------------------------------------- //
// Block card wrapper
// --------------------------------------------------------------------------- //
function BlockCard({
  type,
  index,
  total,
  onMove,
  onDelete,
  children,
}: {
  type: BlockType;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${LINE}`,
        borderRadius: '16px',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${LINE}`, background: 'rgba(14,17,22,0.02)' }}
      >
        <Box sx={{ color: BRAND.tealDeep, display: 'grid', placeItems: 'center', mr: 1 }}>
          {BLOCK_ICON[type]}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK, flex: 1 }}>
          {BLOCK_LABELS[type]}
        </Typography>
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUpwardRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton size="small" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDownwardRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete block">
          <IconButton size="small" onClick={onDelete} sx={{ color: BRAND.pink }}>
            <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ p: 1.75 }}>{children}</Box>
    </Box>
  );
}

// --------------------------------------------------------------------------- //
// Columns editor
// --------------------------------------------------------------------------- //
function ColumnsEditor({
  block,
  onChange,
}: {
  block: ColumnsBlock;
  onChange: (b: ColumnsBlock) => void;
}) {
  const updateCol = (ci: 0 | 1, blocks: LeafBlock[]) => {
    const columns = [...block.columns] as ColumnsBlock['columns'];
    columns[ci] = { blocks };
    onChange({ ...block, columns });
  };

  const renderColumn = (ci: 0 | 1) => {
    const blocks = block.columns[ci].blocks;
    return (
      <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: SUBTLE, mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Column {ci + 1}
        </Typography>
        <Stack gap={1.25}>
          {blocks.map((b, i) => (
            <BlockCard
              key={b.id}
              type={b.type}
              index={i}
              total={blocks.length}
              onMove={(dir) => {
                const next = [...blocks];
                const j = i + dir;
                if (j < 0 || j >= next.length) return;
                [next[i], next[j]] = [next[j], next[i]];
                updateCol(ci, next);
              }}
              onDelete={() => updateCol(ci, blocks.filter((_, k) => k !== i))}
            >
              <LeafEditor
                block={b}
                onChange={(nb) => updateCol(ci, blocks.map((x, k) => (k === i ? nb : x)))}
              />
            </BlockCard>
          ))}
          <AddBlock
            types={LEAF_TYPES}
            label="Add to column"
            onAdd={(t) => {
              const created = makeBlock(t);
              if (created.type !== 'columns') updateCol(ci, [...blocks, created]);
            }}
          />
        </Stack>
      </Box>
    );
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
      {renderColumn(0)}
      {renderColumn(1)}
    </Stack>
  );
}

// --------------------------------------------------------------------------- //
// Main block editor
// --------------------------------------------------------------------------- //
export default function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(blocks.filter((_, k) => k !== i));
  const update = (i: number, b: Block) => onChange(blocks.map((x, k) => (k === i ? b : x)));

  return (
    <Stack gap={1.5}>
      {blocks.length === 0 && (
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            border: `1px dashed ${LINE}`,
            borderRadius: '16px',
            color: SUBTLE,
          }}
        >
          <Typography sx={{ fontSize: 13.5 }}>
            Build your email by adding blocks below.
          </Typography>
        </Box>
      )}
      {blocks.map((b, i) => (
        <BlockCard
          key={b.id}
          type={b.type}
          index={i}
          total={blocks.length}
          onMove={(dir) => move(i, dir)}
          onDelete={() => remove(i)}
        >
          {b.type === 'columns' ? (
            <ColumnsEditor block={b} onChange={(nb) => update(i, nb)} />
          ) : (
            <LeafEditor block={b} onChange={(nb) => update(i, nb)} />
          )}
        </BlockCard>
      ))}
      <AddBlock types={ALL_TYPES} onAdd={(t) => onChange([...blocks, makeBlock(t)])} />
    </Stack>
  );
}
