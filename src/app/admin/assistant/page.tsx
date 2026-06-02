'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Select,
  MenuItem,
  Avatar,
  CircularProgress,
  Tooltip,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  Drawer,
  Menu,
  ListItemIcon,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
  Menu as MenuIcon,
  AttachFile as AttachFileIcon,
  TravelExplore as TravelExploreIcon,
  Close as CloseIcon,
  Language as LanguageIcon,
  AutoAwesome as AutoAwesomeIcon,
  Slideshow as SlideshowIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { Chip, Stack } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Provider = 'gpt-5.5' | 'claude-opus';

interface Attachment {
  name: string;
  kind: 'image' | 'text' | 'file';
  dataUrl?: string; // for images
  text?: string; // extracted text for text files
}

interface ToolEvent {
  tool: string;
  status: 'running' | 'done' | 'error';
  label: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  images?: { dataUrl: string }[];
  attachments?: { name: string; kind: string }[];
  tools?: ToolEvent[];
}

interface ConvSummary {
  id: string;
  title: string;
  provider: Provider;
  updatedAt: string;
}

const PROVIDER_LABEL: Record<Provider, string> = {
  'gpt-5.5': 'GPT-5.5',
  'claude-opus': 'Claude Opus',
};

const SIDEBAR_WIDTH = 280;

export default function AssistantPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [provider, setProvider] = useState<Provider>('gpt-5.5');
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [webSearchOn, setWebSearchOn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI document generation (PowerPoint deck / PDF proposal).
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
  const [generating, setGenerating] = useState<null | 'deck' | 'proposal'>(null);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/conversations', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      /* ignore */
    }
  }, [authHeaders]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Only auto-scroll the inner container when the user is pinned near the bottom.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    pinnedRef.current = true;
    if (isMobile) setSidebarOpen(false);
  };

  const openConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/conversations?id=${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const conv = data.conversation;
      setActiveId(conv.id);
      setMessages(conv.messages || []);
      setProvider(conv.provider || 'gpt-5.5');
      pinnedRef.current = true;
      if (isMobile) setSidebarOpen(false);
    } catch {
      /* ignore */
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    await fetch(`/api/admin/conversations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (activeIdRef.current === id) newChat();
    loadConversations();
  };

  const persist = useCallback(
    async (msgs: Msg[], prov: Provider, id: string | null) => {
      try {
        // Strip heavy base64 payloads before persisting to keep storage lean.
        const slim = msgs.map((m) => ({
          ...m,
          images: m.images ? m.images.map(() => ({ dataUrl: '' })) : undefined,
          attachments: m.attachments
            ? m.attachments.map((a) => ({ name: a.name, kind: a.kind }))
            : undefined,
        }));
        const res = await fetch('/api/admin/conversations', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id: id || undefined, provider: prov, messages: slim }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const conv = data.conversation;
        if (conv?.id && !activeIdRef.current) setActiveId(conv.id);
        loadConversations();
      } catch {
        /* ignore */
      }
    },
    [authHeaders, loadConversations]
  );

  const readFile = (file: File): Promise<Attachment> =>
    new Promise((resolve) => {
      const isImage = file.type.startsWith('image/');
      const isText =
        file.type.startsWith('text/') ||
        /\.(md|csv|json|txt|html?|xml|ya?ml|log)$/i.test(file.name) ||
        file.type === 'application/json';
      const reader = new FileReader();
      reader.onload = () => {
        if (isImage) {
          resolve({ name: file.name, kind: 'image', dataUrl: reader.result as string });
        } else if (isText) {
          resolve({ name: file.name, kind: 'text', text: (reader.result as string).slice(0, 12000) });
        } else {
          resolve({ name: file.name, kind: 'file' });
        }
      };
      reader.onerror = () => resolve({ name: file.name, kind: 'file' });
      if (isImage) reader.readAsDataURL(file);
      else if (isText) reader.readAsText(file);
      else resolve({ name: file.name, kind: 'file' });
    });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const picked = await Promise.all(Array.from(files).slice(0, 5).map(readFile));
    setAttachments((prev) => [...prev, ...picked].slice(0, 6));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || streaming) return;

    const images = attachments.filter((a) => a.kind === 'image' && a.dataUrl).map((a) => ({ dataUrl: a.dataUrl! }));
    const textBlocks = attachments
      .filter((a) => a.kind === 'text' && a.text)
      .map((a) => `\n\n--- Attached file: ${a.name} ---\n${a.text}`)
      .join('');
    const otherFiles = attachments.filter((a) => a.kind === 'file').map((a) => a.name);

    let contentForApi = text + textBlocks;
    if (otherFiles.length) contentForApi += `\n\n(Attached files: ${otherFiles.join(', ')})`;

    const userMsg: Msg = {
      role: 'user',
      content: text,
      ts: Date.now(),
      images: images.length ? images : undefined,
      attachments: attachments.length ? attachments.map((a) => ({ name: a.name, kind: a.kind })) : undefined,
    };
    const baseMessages = [...messages, userMsg];
    setMessages([...baseMessages, { role: 'assistant', content: '', ts: Date.now(), tools: [] }]);
    setInput('');
    const sentAttachments = attachments;
    setAttachments([]);
    setStreaming(true);
    pinnedRef.current = true;

    let assistantText = '';
    const toolEvents: ToolEvent[] = [];
    const renderAssistant = () =>
      setMessages([
        ...baseMessages,
        { role: 'assistant', content: assistantText, ts: Date.now(), tools: [...toolEvents] },
      ]);

    try {
      // Build API messages: replace last user content with the enriched version + images.
      const apiMessages = baseMessages.map((m, i) => {
        if (i === baseMessages.length - 1) {
          return {
            role: m.role,
            content: contentForApi,
            images: images.length ? images : undefined,
          };
        }
        return { role: m.role, content: m.content };
      });

      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider,
          messages: apiMessages,
          webSearch: webSearchOn,
        }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        assistantText = d.message || 'The AI is unavailable right now. Please try again.';
        renderAssistant();
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const block of events) {
          const lines = block.split('\n');
          const evtLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const evt = evtLine ? evtLine.slice(6).trim() : 'message';
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }
          if (evt === 'delta') {
            assistantText += (payload.text as string) || '';
            renderAssistant();
          } else if (evt === 'tool') {
            const te: ToolEvent = {
              tool: (payload.tool as string) || 'tool',
              status: (payload.status as ToolEvent['status']) || 'running',
              label: (payload.label as string) || '',
            };
            // Replace a running entry of the same tool, else push.
            const existingIdx = toolEvents.findIndex(
              (t) => t.tool === te.tool && t.status === 'running'
            );
            if (existingIdx !== -1 && te.status !== 'running') toolEvents[existingIdx] = te;
            else toolEvents.push(te);
            renderAssistant();
          } else if (evt === 'error') {
            assistantText = assistantText || (payload.message as string) || 'Something went wrong.';
            renderAssistant();
          }
        }
      }
    } catch {
      assistantText = assistantText || 'Connection error. Please try again.';
      renderAssistant();
      setAttachments(sentAttachments);
    } finally {
      setStreaming(false);
      const finalMessages: Msg[] = [
        ...baseMessages,
        { role: 'assistant', content: assistantText, ts: Date.now(), tools: [...toolEvents] },
      ];
      persist(finalMessages, provider, activeIdRef.current);
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const generateArtifact = async (type: 'deck' | 'proposal') => {
    setCreateMenuAnchor(null);
    if (generating) return;
    setGenerating(type);
    const label = type === 'deck' ? 'PowerPoint deck' : 'PDF proposal';
    setToast({ msg: `Generating your ${label}…`, sev: 'info' });

    // Use the typed input as an extra brief, plus the conversation as source material.
    const prompt = input.trim();
    const conversation = messages
      .filter((m) => m.content && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type, provider, prompt: prompt || undefined, conversation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.proposal) {
        setToast({ msg: data?.message || `Could not generate the ${label}.`, sev: 'error' });
        setGenerating(null);
        return;
      }

      const { proposal } = data;
      if (type === 'deck') {
        const { buildDeckPptx } = await import('@/lib/pptxBuilder');
        await buildDeckPptx(proposal.spec);
      } else {
        const { buildProposalPdf } = await import('@/lib/pdfBuilder');
        await buildProposalPdf(proposal.spec);
      }

      setToast({ msg: `${label} ready — downloaded & saved to Proposals.`, sev: 'success' });

      // Drop a note into the chat so there's a visible record + link.
      const note: Msg = {
        role: 'assistant',
        content: `📎 **${label} generated:** *${proposal.title}*${
          proposal.client ? ` — for ${proposal.client}` : ''
        }\n\nThe file has been downloaded and saved to the **[Proposals](/admin/proposals)** page, where you can preview or re-download it anytime.`,
        ts: Date.now(),
      };
      const next = [...messages, note];
      setMessages(next);
      persist(next, provider, activeIdRef.current);
    } catch {
      setToast({ msg: `Something went wrong creating the ${label}.`, sev: 'error' });
    } finally {
      setGenerating(null);
    }
  };

  const sidebar = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Paper
          onClick={newChat}
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.25,
            cursor: 'pointer',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            fontWeight: 600,
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
          }}
        >
          <AddIcon fontSize="small" /> New chat
        </Paper>
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {conversations.map((c) => (
          <ListItemButton
            key={c.id}
            selected={c.id === activeId}
            onClick={() => openConversation(c.id)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemText
              primary={c.title}
              primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
              secondary={PROVIDER_LABEL[c.provider]}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
            <IconButton
              size="small"
              edge="end"
              onClick={(e) => deleteConversation(c.id, e)}
              sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
        {conversations.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
            No conversations yet.
          </Typography>
        )}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 112px)',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme.palette.background.default,
      }}
    >
      {isMobile ? (
        <Drawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          {sidebar}
        </Drawer>
      ) : (
        sidebar
      )}

      {/* Main chat column */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
          }}
        >
          {isMobile && (
            <IconButton onClick={() => setSidebarOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          )}
          <SmartToyIcon color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            AI Assistant
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Model
          </Typography>
          <Select
            size="small"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            sx={{ minWidth: 150, borderRadius: 2 }}
          >
            <MenuItem value="gpt-5.5">GPT-5.5</MenuItem>
            <MenuItem value="claude-opus">Claude Opus</MenuItem>
          </Select>
        </Box>

        {/* Messages */}
        <Box
          ref={scrollRef}
          onScroll={onScroll}
          sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3 }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <SmartToyIcon sx={{ fontSize: 56, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight={700} color="text.primary">
                How can I help you today?
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, maxWidth: 420 }}>
                Your internal marketing copilot. Draft campaigns, research leads, write content, or
                analyse data — powered by {PROVIDER_LABEL[provider]}.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxWidth: 820, mx: 'auto' }}>
              {messages.map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    mb: 3,
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: m.role === 'user' ? 'secondary.main' : 'primary.main',
                    }}
                  >
                    {m.role === 'user' ? (
                      <PersonIcon fontSize="small" />
                    ) : (
                      <SmartToyIcon fontSize="small" />
                    )}
                  </Avatar>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2,
                      py: 1.25,
                      maxWidth: '85%',
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor:
                        m.role === 'user'
                          ? alpha(theme.palette.secondary.main, 0.08)
                          : theme.palette.background.paper,
                      position: 'relative',
                      '& p': { m: 0, mb: 1 },
                      '& p:last-child': { mb: 0 },
                      '& pre': {
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        p: 1.5,
                        borderRadius: 1.5,
                        overflowX: 'auto',
                        fontSize: 13,
                      },
                      '& code': {
                        fontFamily: 'monospace',
                        fontSize: 13,
                      },
                      '& ul, & ol': { pl: 3, mb: 1 },
                      '& a': { color: theme.palette.primary.main },
                      '& table': { borderCollapse: 'collapse', width: '100%' },
                      '& th, & td': {
                        border: `1px solid ${theme.palette.divider}`,
                        px: 1,
                        py: 0.5,
                      },
                    }}
                  >
                    {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
                      <Stack spacing={0.5} sx={{ mb: m.content ? 1 : 0 }}>
                        {m.tools.map((t, ti) => (
                          <Chip
                            key={ti}
                            size="small"
                            icon={
                              t.tool === 'web_search' ? (
                                <TravelExploreIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <LanguageIcon sx={{ fontSize: 16 }} />
                              )
                            }
                            label={t.label}
                            color={t.status === 'error' ? 'error' : t.status === 'done' ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal' } }}
                          />
                        ))}
                      </Stack>
                    )}
                    {m.role === 'user' && m.images && m.images.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: m.content ? 1 : 0 }}>
                        {m.images.map((img, ii) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={ii}
                            src={img.dataUrl}
                            alt="attachment"
                            style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8 }}
                          />
                        ))}
                      </Box>
                    )}
                    {m.role === 'user' && m.attachments && m.attachments.filter((a) => a.kind !== 'image').length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mb: m.content ? 1 : 0, flexWrap: 'wrap', gap: 0.5 }}>
                        {m.attachments
                          .filter((a) => a.kind !== 'image')
                          .map((a, ai) => (
                            <Chip key={ai} size="small" icon={<AttachFileIcon sx={{ fontSize: 14 }} />} label={a.name} variant="outlined" />
                          ))}
                      </Stack>
                    )}
                    {m.role === 'assistant' && m.content === '' && streaming ? (
                      m.tools && m.tools.length > 0 ? null : <CircularProgress size={16} />
                    ) : m.role === 'assistant' ? (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        {!streaming && m.content && (
                          <Tooltip title="Copy">
                            <IconButton
                              size="small"
                              onClick={() => copyMessage(m.content)}
                              sx={{ position: 'absolute', top: 4, right: 4, opacity: 0.5 }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                    )}
                  </Paper>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Composer */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Box sx={{ maxWidth: 820, mx: 'auto' }}>
            {/* Attachment previews */}
            {attachments.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                {attachments.map((a, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'relative',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      p: a.kind === 'image' ? 0 : 1,
                      pr: a.kind === 'image' ? 0 : 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {a.kind === 'image' && a.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.dataUrl} alt={a.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <>
                        <AttachFileIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </Typography>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeAttachment(i)}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'background.paper',
                        border: `1px solid ${theme.palette.divider}`,
                        p: 0.25,
                        '&:hover': { bgcolor: 'background.paper' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}

            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,text/*,.md,.csv,.json,.txt,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Tooltip title="Attach files or photos">
                <IconButton onClick={() => fileInputRef.current?.click()} disabled={streaming}>
                  <AttachFileIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Create a branded PowerPoint deck or PDF proposal">
                <IconButton
                  onClick={(e) => setCreateMenuAnchor(e.currentTarget)}
                  disabled={streaming || generating !== null}
                  color="primary"
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12) }}
                >
                  {generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={createMenuAnchor}
                open={Boolean(createMenuAnchor)}
                onClose={() => setCreateMenuAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Generate from this chat
                </Typography>
                <MenuItem onClick={() => generateArtifact('deck')}>
                  <ListItemIcon>
                    <SlideshowIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  PowerPoint deck (.pptx)
                </MenuItem>
                <MenuItem onClick={() => generateArtifact('proposal')}>
                  <ListItemIcon>
                    <PictureAsPdfIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  PDF proposal (.pdf)
                </MenuItem>
              </Menu>
              <Tooltip title={webSearchOn ? 'Web search ON — your next message searches the web' : 'Turn on web search'}>
                <IconButton
                  onClick={() => setWebSearchOn((v) => !v)}
                  color={webSearchOn ? 'primary' : 'default'}
                  sx={webSearchOn ? { bgcolor: alpha(theme.palette.primary.main, 0.12) } : undefined}
                >
                  <TravelExploreIcon />
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth
                multiline
                maxRows={6}
                placeholder={
                  webSearchOn
                    ? 'Ask anything — I will search the web…'
                    : `Message ${PROVIDER_LABEL[provider]}…  (tip: “search the web for …” or paste a URL to scrape)`
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton
                color="primary"
                onClick={send}
                disabled={(!input.trim() && attachments.length === 0) || streaming}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: alpha(theme.palette.primary.main, 0.3) },
                  width: 48,
                  height: 48,
                }}
              >
                {streaming ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 1 }}
          >
            Enter to send · Shift+Enter for a new line · Attach images/files · 🌐 web search · ✨ make a deck/proposal
          </Typography>
        </Box>
      </Box>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.sev} variant="filled" sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
