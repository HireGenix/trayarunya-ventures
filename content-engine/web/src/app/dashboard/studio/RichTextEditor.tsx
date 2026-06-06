'use client';

/**
 * RichTextEditor — a lightweight, dependency-free rich text editor.
 *
 * Built on a contentEditable div. Stores content as Markdown and converts
 * to/from HTML with a small line-by-line parser. Supports a WYSIWYG mode and
 * a raw "Markdown source" mode, a formatting toolbar, and a selection-based
 * floating AI toolbar that transforms the highlighted text via `onInlineAI`.
 *
 * No new npm dependencies: only React, MUI, and browser APIs are used.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ShortTextIcon from '@mui/icons-material/ShortText';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';

const BRAND = {
  ink: '#0E1116',
  amber: '#FFAF06',
  amberDeep: '#E89200',
  tealDeep: '#0FA874',
  gradient: 'linear-gradient(135deg, #FFAF06 0%, #14BB87 100%)',
};

export interface RichTextEditorProps {
  value: string;
  onChange: (md: string) => void;
  onInlineAI?: (text: string, command: string) => Promise<string>;
  placeholder?: string;
  minHeight?: number;
}

const isBrowser = typeof document !== 'undefined';

/* ------------------------------------------------------------------ *
 * Escaping helpers
 * ------------------------------------------------------------------ */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert inline markdown (already HTML-escaped) into inline HTML.
 * Order matters: code spans first so their content is not re-parsed,
 * then links, bold, italic.
 */
function inlineMarkdownToHtml(escaped: string): string {
  let out = escaped;

  // `code`
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);

  // [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, text: string, url: string) => {
      const safeUrl = sanitizeUrl(url);
      return `<a href="${safeUrl}">${text}</a>`;
    },
  );

  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, b) => `<strong>${b}</strong>`);

  // *italic*
  out = out.replace(/\*([^*]+)\*/g, (_m, i) => `<em>${i}</em>`);

  return out;
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Block javascript:, data:, vbscript: and similar dangerous schemes.
  if (/^\s*(javascript|data|vbscript):/i.test(trimmed)) {
    return '#';
  }
  return trimmed;
}

/* ------------------------------------------------------------------ *
 * Markdown -> HTML (line-by-line)
 * ------------------------------------------------------------------ */

function markdownToHtml(markdown: string): string {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      const content = inlineMarkdownToHtml(
        escapeHtml(paragraph.join(' ')),
      );
      html.push(`<p>${content}</p>`);
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');

    // Blank line -> paragraph break.
    if (line.trim() === '') {
      flushParagraph();
      closeList();
      continue;
    }

    // Headings.
    const h3 = /^###\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2 || h3) {
      flushParagraph();
      closeList();
      const level = h3 ? 'h3' : 'h2';
      const text = (h3 ? h3[1] : h2![1]) ?? '';
      html.push(
        `<${level}>${inlineMarkdownToHtml(escapeHtml(text))}</${level}>`,
      );
      continue;
    }

    // Blockquote.
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(
        `<blockquote>${inlineMarkdownToHtml(
          escapeHtml(quote[1] ?? ''),
        )}</blockquote>`,
      );
      continue;
    }

    // Ordered list.
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        html.push('<ol>');
        listType = 'ol';
      }
      html.push(
        `<li>${inlineMarkdownToHtml(escapeHtml(ol[1] ?? ''))}</li>`,
      );
      continue;
    }

    // Unordered list.
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        html.push('<ul>');
        listType = 'ul';
      }
      html.push(
        `<li>${inlineMarkdownToHtml(escapeHtml(ul[1] ?? ''))}</li>`,
      );
      continue;
    }

    // Plain text -> accumulate into a paragraph.
    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  return html.join('\n');
}

/* ------------------------------------------------------------------ *
 * HTML -> Markdown (recursive DOM traversal)
 * ------------------------------------------------------------------ */

function htmlToMarkdown(html: string): string {
  if (!isBrowser) return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  const blocks: string[] = [];

  const serializeInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(serializeInline).join('');

    switch (tag) {
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 'code':
        return `\`${inner}\``;
      case 'a': {
        const href = sanitizeUrl(el.getAttribute('href') || '');
        return `[${inner}](${href})`;
      }
      case 'br':
        return '\n';
      default:
        return inner;
    }
  };

  const serializeList = (
    el: HTMLElement,
    ordered: boolean,
  ): string => {
    const items = Array.from(el.children).filter(
      (c) => c.tagName.toLowerCase() === 'li',
    );
    return items
      .map((li, idx) => {
        const text = Array.from(li.childNodes)
          .map(serializeInline)
          .join('')
          .trim();
        const marker = ordered ? `${idx + 1}.` : '-';
        return `${marker} ${text}`;
      })
      .join('\n');
  };

  const serializeBlock = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').trim();
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
      case 'h2':
        blocks.push(`## ${serializeInlineChildren(el)}`);
        break;
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        blocks.push(`### ${serializeInlineChildren(el)}`);
        break;
      case 'blockquote':
        blocks.push(`> ${serializeInlineChildren(el)}`);
        break;
      case 'ul':
        blocks.push(serializeList(el, false));
        break;
      case 'ol':
        blocks.push(serializeList(el, true));
        break;
      case 'p':
      case 'div': {
        const text = serializeInlineChildren(el);
        if (text.trim()) blocks.push(text.trim());
        else blocks.push('');
        break;
      }
      case 'br':
        blocks.push('');
        break;
      default: {
        const text = serializeInlineChildren(el);
        if (text.trim()) blocks.push(text.trim());
      }
    }
  };

  const serializeInlineChildren = (el: HTMLElement): string =>
    Array.from(el.childNodes).map(serializeInline).join('');

  Array.from(container.childNodes).forEach(serializeBlock);

  return blocks
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------------ *
 * Misc helpers
 * ------------------------------------------------------------------ */

function countWords(markdown: string): number {
  const text = (markdown || '')
    .replace(/[#>*`_\-\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').length;
}

interface AiAction {
  command: string;
  label: string;
  icon: React.ReactNode;
}

const AI_ACTIONS: AiAction[] = [
  { command: 'improve', label: 'Improve', icon: <AutoFixHighIcon fontSize="small" /> },
  { command: 'shorten', label: 'Shorten', icon: <ShortTextIcon fontSize="small" /> },
  { command: 'expand', label: 'Expand', icon: <UnfoldMoreIcon fontSize="small" /> },
  { command: 'fix-grammar', label: 'Fix Grammar', icon: <SpellcheckIcon fontSize="small" /> },
  { command: 'change-tone', label: 'Change Tone', icon: <RecordVoiceOverIcon fontSize="small" /> },
];

interface FloatingState {
  visible: boolean;
  top: number;
  left: number;
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export default function RichTextEditor({
  value,
  onChange,
  onInlineAI,
  placeholder = 'Start writing…',
  minHeight = 280,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [mode, setMode] = useState<'rich' | 'markdown'>('rich');
  const [focused, setFocused] = useState(false);
  const [floating, setFloating] = useState<FloatingState>({
    visible: false,
    top: 0,
    left: 0,
  });
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  // Markdown source mirrors `value` while editing in markdown mode.
  const [markdownDraft, setMarkdownDraft] = useState(value);

  /* --- Sync incoming value into the contentEditable (rich mode) --- */
  useEffect(() => {
    if (mode !== 'rich') return;
    const el = editorRef.current;
    if (!el) return;

    const incomingHtml = markdownToHtml(value);
    // Only overwrite when the rendered markdown differs, to avoid
    // clobbering the caret while the user types.
    const currentMd = htmlToMarkdown(el.innerHTML);
    if (currentMd.trim() !== (value || '').trim()) {
      el.innerHTML = incomingHtml;
    }
  }, [value, mode]);

  useEffect(() => {
    setMarkdownDraft(value);
  }, [value]);

  /* --- Selection tracking for the floating AI toolbar --- */
  const updateFloatingFromSelection = useCallback(() => {
    if (!isBrowser) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setFloating((f) => (f.visible ? { ...f, visible: false } : f));
      return;
    }

    const range = sel.getRangeAt(0);
    const editorEl = editorRef.current;
    if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) {
      setFloating((f) => (f.visible ? { ...f, visible: false } : f));
      return;
    }

    savedRangeRef.current = range.cloneRange();

    const rect = range.getBoundingClientRect();
    const wrapper = wrapperRef.current;
    const wrapRect = wrapper?.getBoundingClientRect();
    const top = rect.top - (wrapRect?.top ?? 0) - 52;
    const left = rect.left - (wrapRect?.left ?? 0) + rect.width / 2;

    setFloating({
      visible: true,
      top: Math.max(top, 4),
      left: Math.max(left, 8),
    });
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const onSelectionChange = () => {
      // Hide toolbar if selection leaves the editor.
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setFloating((f) => (f.visible ? { ...f, visible: false } : f));
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  /* --- Emit changes from the contentEditable --- */
  const emitFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    onChange(md);
  }, [onChange]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      if (!isBrowser) return;
      editorRef.current?.focus();
      document.execCommand(command, false, arg);
      emitFromEditor();
    },
    [emitFromEditor],
  );

  const applyBlock = useCallback(
    (tag: string) => {
      // formatBlock toggles a block-level wrapper (h2, h3, blockquote, pre).
      exec('formatBlock', tag);
    },
    [exec],
  );

  const handleLink = useCallback(() => {
    if (!isBrowser) return;
    const url = window.prompt('Enter URL');
    if (url) exec('createLink', sanitizeUrl(url));
  }, [exec]);

  const handleCode = useCallback(() => {
    // Wrap selection in an inline <code> span using execCommand fallback.
    if (!isBrowser) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      applyBlock('pre');
      return;
    }
    const range = sel.getRangeAt(0);
    const code = document.createElement('code');
    try {
      code.appendChild(range.extractContents());
      range.insertNode(code);
      sel.removeAllRanges();
      emitFromEditor();
    } catch {
      applyBlock('pre');
    }
  }, [applyBlock, emitFromEditor]);

  /* --- Paste as plain text --- */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!isBrowser) return;
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      emitFromEditor();
    },
    [emitFromEditor],
  );

  /* --- Inline AI --- */
  const runAi = useCallback(
    async (command: string) => {
      if (!onInlineAI || !isBrowser) return;

      const sel = window.getSelection();
      const hasSelection =
        !!sel && sel.rangeCount > 0 && !sel.isCollapsed && !!savedRangeRef.current;

      const range = hasSelection ? savedRangeRef.current : null;
      const selectedText = hasSelection
        ? range!.toString()
        : htmlToMarkdown(editorRef.current?.innerHTML ?? '');

      if (!selectedText.trim()) return;

      setAiBusy(command);
      try {
        const result = await onInlineAI(selectedText, command);

        if (hasSelection && range && editorRef.current) {
          // Replace only the selected range with the AI result.
          const selNow = window.getSelection();
          selNow?.removeAllRanges();
          selNow?.addRange(range);
          document.execCommand('insertText', false, result);
        } else if (editorRef.current) {
          // Fallback: replace the entire body.
          editorRef.current.innerHTML = markdownToHtml(result);
        }
        emitFromEditor();
      } catch {
        // Swallow errors; caller is responsible for surfacing them.
      } finally {
        setAiBusy(null);
        setFloating((f) => ({ ...f, visible: false }));
      }
    },
    [onInlineAI, emitFromEditor],
  );

  /* --- Mode toggle --- */
  const handleModeChange = useCallback(
    (_: unknown, next: 'rich' | 'markdown' | null) => {
      if (!next || next === mode) return;
      if (next === 'markdown') {
        // Sync the latest rich content into the markdown draft.
        const el = editorRef.current;
        const md = el ? htmlToMarkdown(el.innerHTML) : value;
        setMarkdownDraft(md);
        onChange(md);
      } else {
        // Coming back to rich mode — value will re-render via effect.
        onChange(markdownDraft);
      }
      setMode(next);
    },
    [mode, value, markdownDraft, onChange],
  );

  const handleMarkdownChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdownDraft(e.target.value);
      onChange(e.target.value);
    },
    [onChange],
  );

  const words = countWords(mode === 'markdown' ? markdownDraft : value);

  /* --- Styling --- */
  const borderColor = focused ? BRAND.amber : 'rgba(14,17,22,0.23)';
  const editorStyle: CSSProperties = {
    minHeight,
    outline: 'none',
    padding: '14px 16px',
    fontSize: 15,
    lineHeight: 1.7,
    color: BRAND.ink,
    overflowY: 'auto',
  };

  const toolbarButtons: {
    key: string;
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[] = [
    { key: 'bold', title: 'Bold', icon: <FormatBoldIcon fontSize="small" />, onClick: () => exec('bold') },
    { key: 'italic', title: 'Italic', icon: <FormatItalicIcon fontSize="small" />, onClick: () => exec('italic') },
    { key: 'h2', title: 'Heading 2', icon: <TitleIcon fontSize="small" />, onClick: () => applyBlock('h2') },
    {
      key: 'h3',
      title: 'Heading 3',
      icon: <TitleIcon sx={{ fontSize: 16 }} />,
      onClick: () => applyBlock('h3'),
    },
    {
      key: 'ul',
      title: 'Bulleted list',
      icon: <FormatListBulletedIcon fontSize="small" />,
      onClick: () => exec('insertUnorderedList'),
    },
    {
      key: 'ol',
      title: 'Numbered list',
      icon: <FormatListNumberedIcon fontSize="small" />,
      onClick: () => exec('insertOrderedList'),
    },
    { key: 'link', title: 'Link', icon: <LinkIcon fontSize="small" />, onClick: handleLink },
    { key: 'quote', title: 'Quote', icon: <FormatQuoteIcon fontSize="small" />, onClick: () => applyBlock('blockquote') },
    { key: 'code', title: 'Code', icon: <CodeIcon fontSize="small" />, onClick: handleCode },
  ];

  return (
    <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Mode toggle */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={handleModeChange}
          sx={{
            '& .MuiToggleButton-root.Mui-selected': {
              color: BRAND.ink,
              background: 'rgba(255,175,6,0.16)',
              borderColor: BRAND.amber,
            },
          }}
        >
          <ToggleButton value="rich">Rich text</ToggleButton>
          <ToggleButton value="markdown">Markdown</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Formatting toolbar (rich mode only) */}
      {mode === 'rich' && (
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          sx={{
            mb: 1,
            p: 0.5,
            borderRadius: 2,
            border: '1px solid rgba(14,17,22,0.12)',
            background: 'rgba(14,17,22,0.02)',
          }}
        >
          {toolbarButtons.map((btn) => (
            <Tooltip key={btn.key} title={btn.title}>
              <IconButton
                size="small"
                onMouseDown={(e) => e.preventDefault()}
                onClick={btn.onClick}
                sx={{
                  color: BRAND.ink,
                  '&:hover': {
                    background: 'rgba(255,175,6,0.18)',
                    color: BRAND.amberDeep,
                  },
                }}
              >
                {btn.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Stack>
      )}

      {/* Editor surface */}
      {mode === 'rich' ? (
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            border: `1px solid ${borderColor}`,
            boxShadow: focused
              ? `0 0 0 2px rgba(255,175,6,0.25)`
              : 'none',
            transition: 'box-shadow .15s ease, border-color .15s ease',
            background: '#fff',
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            style={editorStyle}
            onInput={emitFromEditor}
            onBlur={() => {
              setFocused(false);
              emitFromEditor();
            }}
            onFocus={() => setFocused(true)}
            onMouseUp={updateFloatingFromSelection}
            onKeyUp={updateFloatingFromSelection}
            onPaste={handlePaste}
          />
        </Box>
      ) : (
        <Box
          component="textarea"
          value={markdownDraft}
          onChange={handleMarkdownChange}
          placeholder={placeholder}
          spellCheck={false}
          sx={{
            width: '100%',
            minHeight,
            resize: 'vertical',
            borderRadius: 2,
            border: `1px solid ${borderColor}`,
            p: '14px 16px',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            fontSize: 14,
            lineHeight: 1.6,
            color: BRAND.ink,
            outline: 'none',
            background: '#fff',
            '&:focus': {
              borderColor: BRAND.amber,
              boxShadow: '0 0 0 2px rgba(255,175,6,0.25)',
            },
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}

      {/* Word count */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(14,17,22,0.55)' }}
        >
          {words} {words === 1 ? 'word' : 'words'}
        </Typography>
      </Stack>

      {/* Floating AI toolbar */}
      {mode === 'rich' && floating.visible && onInlineAI && (
        <Paper
          elevation={6}
          onMouseDown={(e) => e.preventDefault()}
          sx={{
            position: 'absolute',
            top: floating.top,
            left: floating.left,
            transform: 'translateX(-50%)',
            zIndex: 20,
            px: 0.5,
            py: 0.25,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            background: BRAND.gradient,
          }}
        >
          {AI_ACTIONS.map((action) => (
            <Tooltip key={action.command} title={action.label}>
              <span>
                <IconButton
                  size="small"
                  disabled={aiBusy !== null}
                  onClick={() => runAi(action.command)}
                  sx={{
                    color: '#fff',
                    '&:hover': { background: 'rgba(255,255,255,0.22)' },
                  }}
                >
                  {aiBusy === action.command ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    action.icon
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Paper>
      )}

      {/* Placeholder styling for the contentEditable */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(14,17,22,0.4);
          pointer-events: none;
        }
        [contenteditable] blockquote {
          margin: 0.5em 0;
          padding-left: 12px;
          border-left: 3px solid ${BRAND.tealDeep};
          color: rgba(14,17,22,0.75);
        }
        [contenteditable] code {
          background: rgba(14,17,22,0.06);
          padding: 1px 5px;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em;
        }
        [contenteditable] a { color: ${BRAND.amberDeep}; }
        [contenteditable] h2 { font-size: 1.4em; margin: 0.6em 0 0.3em; }
        [contenteditable] h3 { font-size: 1.15em; margin: 0.6em 0 0.3em; }
      `}</style>
    </Box>
  );
}
