'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import SendIcon from '@mui/icons-material/SendRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import LanguageIcon from '@mui/icons-material/LanguageRounded';
import AttachFileIcon from '@mui/icons-material/AttachFileRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/CloseRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAIModels } from '@/lib/useAIModels';
import { MarkdownMessage, TypingDots } from '@/components/MarkdownMessage';
import {
  TeamChat,
  type ChatAttachment,
  type ChatMessage,
  type Conversation,
  type ConversationDetail,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const SUGGESTIONS = [
  'Draft 3 LinkedIn posts for this month',
  'Build a 2-week content calendar',
  'Analyse our top competitor',
  'Write a cold outreach sequence',
];

function MessageBubble({ m }: { m: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = m.role === 'user';
  const atts = m.meta?.attachments || [];
  const copy = () => {
    navigator.clipboard?.writeText(m.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Stack direction="row" spacing={1.25} justifyContent={isUser ? 'flex-end' : 'flex-start'}>
      {!isUser && (
        <Avatar sx={{ bgcolor: BRAND.teal, width: 30, height: 30, mt: 0.25 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
      <Box sx={{ maxWidth: '82%' }}>
        <Box
          sx={{
            px: 2, py: 1.25, borderRadius: 2.5,
            bgcolor: isUser ? BRAND.teal : 'action.hover',
            color: isUser ? '#fff' : 'text.primary',
            borderTopRightRadius: isUser ? 6 : 20,
            borderTopLeftRadius: isUser ? 20 : 6,
          }}
        >
          {atts.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: m.content ? 1 : 0 }}>
              {atts.map((a, i) => (
                <Chip
                  key={i}
                  size="small"
                  icon={a.kind === 'image' ? <ImageIcon /> : <DescriptionIcon />}
                  label={a.name}
                  sx={{
                    bgcolor: isUser ? 'rgba(255,255,255,0.18)' : 'background.paper',
                    color: isUser ? '#fff' : 'text.primary',
                    maxWidth: 200,
                  }}
                />
              ))}
            </Stack>
          )}
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
              {m.content}
            </Typography>
          ) : (
            <MarkdownMessage text={m.content} />
          )}
        </Box>
        {!isUser && m.content && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, ml: 0.5 }}>
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton size="small" onClick={copy} sx={{ color: 'text.secondary' }}>
                {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>
            {m.meta?.web_search && (
              <Chip size="small" icon={<LanguageIcon />} label="web" variant="outlined" sx={{ height: 20 }} />
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

export default function TeamChatPage() {
  const confirm = useConfirm();
  const { models, defaultId } = useAIModels();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [model, setModel] = useState<string>('');
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!model && defaultId) setModel(defaultId);
  }, [defaultId, model]);

  const loadList = useCallback(async () => {
    try {
      setConvos(await TeamChat.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chats');
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingThread(true);
    setError(null);
    try {
      const detail = await TeamChat.get(id);
      setMessages(detail.messages || []);
      if (detail.model_key) setModel(detail.model_key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open chat');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setPending([]);
    setError(null);
  }, []);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        const ref = await TeamChat.upload(f);
        setPending((p) => [...p, ref]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && pending.length === 0) || sending) return;
    setError(null);
    setInput('');
    const atts = pending;
    setPending([]);
    setSending(true);
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: activeId || '',
      role: 'user',
      content: text,
      meta: atts.length ? { attachments: atts.map((a) => ({ name: a.name, kind: a.kind, url: a.url })) } : null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const opts = { model_key: model, web_search: webSearch, attachments: atts };
      if (!activeId) {
        const detail: ConversationDetail = await TeamChat.create({ message: text || '(see attachment)', ...opts });
        setActiveId(detail.id);
        setMessages(detail.messages || []);
      } else {
        const res = await TeamChat.send(activeId, text || '(see attachment)', opts);
        setMessages((m) => [...m, res.message]);
      }
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message failed. Try again.');
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
      setPending(atts);
    } finally {
      setSending(false);
    }
  }, [input, pending, sending, activeId, model, webSearch, loadList]);

  const removeConvo = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Delete chat?',
        message: 'This conversation and its messages will be permanently removed.',
        confirmText: 'Delete',
        danger: true,
      });
      if (!ok) return;
      try {
        await TeamChat.remove(id);
        if (activeId === id) newChat();
        await loadList();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [confirm, activeId, newChat, loadList],
  );

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      {/* command bar */}
      <Box sx={{
        position: 'relative', overflow: 'hidden', borderRadius: 4, mb: 2,
        p: { xs: 2, md: 2.5 }, color: '#fff',
        background: 'linear-gradient(135deg, #0E141B 0%, #15202B 55%, #0C1A16 100%)',
        boxShadow: '0 14px 38px rgba(12,17,22,0.26)',
      }}>
        <Box sx={{ position: 'absolute', top: -90, right: -50, width: 230, height: 230, borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.teal}40, transparent 65%)` }} />
        <Box sx={{ position: 'absolute', bottom: -110, left: '32%', width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.amber}2E, transparent 65%)` }} />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: '#062019' }}>
            <AutoAwesomeIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 19, md: 22 }, fontWeight: 900, lineHeight: 1.12,
              background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Team Chat
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)' }}>
              An AI co-pilot grounded on this workspace&apos;s ICP, brand, strategy &amp; research.
            </Typography>
          </Box>
          <Select
            size="small" value={model || ''} onChange={(e) => setModel(e.target.value)}
            IconComponent={KeyboardArrowDownRoundedIcon}
            renderValue={(val) => {
              const m = models.find((x) => x.id === val);
              return (
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <AutoAwesomeIcon sx={{ fontSize: 15, color: BRAND.teal }} />
                  <Box component="span" sx={{ fontWeight: 700 }}>{m?.label || 'Model'}</Box>
                </Stack>
              );
            }}
            sx={{
              minWidth: 170, color: '#fff', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.16)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.teal },
              '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.6)' },
            }}
          >
            {models.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2 }}>
        {/* Sidebar */}
        <Box
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            bgcolor: 'background.paper', p: 1.5, height: { xs: 'auto', md: 660 },
            overflowY: 'auto', display: { xs: activeId ? 'none' : 'block', md: 'block' },
          }}
        >
          <Button
            fullWidth variant="contained" startIcon={<AddIcon />} onClick={newChat}
            sx={{ mb: 1.5, bgcolor: BRAND.teal, '&:hover': { bgcolor: BRAND.tealDeep } }}
          >
            New chat
          </Button>
          <Stack spacing={0.5}>
            {convos.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                No conversations yet. Start one!
              </Typography>
            )}
            {convos.map((c) => (
              <Stack
                key={c.id} direction="row" alignItems="center"
                sx={{
                  px: 1, py: 0.75, borderRadius: 2, cursor: 'pointer',
                  bgcolor: activeId === c.id ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' }, '&:hover .del': { opacity: 1 },
                }}
                onClick={() => openConversation(c.id)}
              >
                <ChatBubbleIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{c.title}</Typography>
                  {c.preview && (
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {c.preview}
                    </Typography>
                  )}
                </Box>
                <Tooltip title="Delete">
                  <IconButton
                    className="del" size="small"
                    sx={{ opacity: { xs: 1, md: 0 }, transition: '0.15s' }}
                    onClick={(e) => { e.stopPropagation(); removeConvo(c.id); }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Thread */}
        <Box
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', height: 660,
          }}
        >
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {loadingThread ? (
              <Stack alignItems="center" sx={{ pt: 6 }}><CircularProgress size={22} /></Stack>
            ) : messages.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={1.5}>
                <Box sx={{ width: 60, height: 60, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: `linear-gradient(135deg, ${BRAND.teal}1A, ${BRAND.amber}1A)`, border: '1px solid', borderColor: 'divider' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 30, color: BRAND.teal }} />
                </Box>
                <Typography variant="h6" fontWeight={800}>Ask anything about this workspace</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 440 }}>
                  Draft posts, plan campaigns, analyse competitors or refine your messaging —
                  every answer is tailored to this client&apos;s profile and strategy.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, maxWidth: 540, width: '100%', mt: 1.5 }}>
                  {SUGGESTIONS.map((s) => (
                    <Box
                      key={s}
                      onClick={() => setInput(s)}
                      sx={{
                        cursor: 'pointer', px: 1.75, py: 1.5, borderRadius: 2.5,
                        border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                        transition: 'all .15s',
                        '&:hover': { borderColor: BRAND.teal, bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>{s}</Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>
            ) : (
              <Stack spacing={2}>
                {messages.map((m) => <MessageBubble key={m.id} m={m} />)}
                {sending && (
                  <Stack direction="row" spacing={1.25}>
                    <Avatar sx={{ bgcolor: BRAND.teal, width: 30, height: 30 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: 'action.hover' }}>
                      <TypingDots label={webSearch ? 'Searching the web…' : undefined} />
                    </Box>
                  </Stack>
                )}
              </Stack>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mx: 2, mb: 1 }} onClose={() => setError(null)}>{error}</Alert>
          )}

          {pending.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ px: 2, pt: 1 }}>
              {pending.map((a, i) => (
                <Chip
                  key={i} size="small"
                  icon={a.kind === 'image' ? <ImageIcon /> : <DescriptionIcon />}
                  label={a.name}
                  onDelete={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                  deleteIcon={<CloseIcon />}
                  sx={{ maxWidth: 220 }}
                />
              ))}
            </Stack>
          )}

          <Divider sx={{ mt: pending.length ? 1 : 0 }} />
          <Box sx={{ p: 1.5 }}>
            <Stack
              direction="row" spacing={0.5} alignItems="flex-end"
              sx={{
                px: 1, py: 0.5, borderRadius: 3,
                border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                transition: 'border-color .15s',
                '&:focus-within': { borderColor: BRAND.teal },
              }}
            >
              <input
                ref={fileRef} type="file" hidden multiple
                accept="image/*,.pdf,.docx,.txt,.md,.csv"
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <Tooltip title="Attach image or document">
                <span>
                  <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={uploading || sending}>
                    {uploading ? <CircularProgress size={18} /> : <AttachFileIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={webSearch ? 'Web search ON' : 'Search the web'}>
                <IconButton
                  size="small"
                  onClick={() => setWebSearch((v) => !v)}
                  sx={{ color: webSearch ? BRAND.teal : 'text.secondary', bgcolor: webSearch ? 'action.selected' : 'transparent' }}
                >
                  <LanguageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth size="small" multiline maxRows={6}
                variant="standard"
                placeholder="Message your workspace co-pilot…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                disabled={sending}
                InputProps={{ disableUnderline: true, sx: { px: 1, py: 0.75, fontSize: 14.5 } }}
              />
              <Button
                variant="contained" onClick={send}
                disabled={sending || (!input.trim() && pending.length === 0)}
                sx={{ borderRadius: 2.5, minWidth: 44, height: 38, px: 0, bgcolor: BRAND.teal, '&:hover': { bgcolor: BRAND.tealDeep } }}
              >
                <SendIcon fontSize="small" />
              </Button>
            </Stack>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'center', mt: 0.75 }}>
              {webSearch ? 'Web search is on · ' : ''}Enter to send · Shift+Enter for a new line
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
