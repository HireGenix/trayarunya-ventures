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
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Provider = 'gpt-5.5' | 'claude-opus';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
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
        const res = await fetch('/api/admin/conversations', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id: id || undefined, provider: prov, messages: msgs }),
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

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    const baseMessages = [...messages, userMsg];
    setMessages([...baseMessages, { role: 'assistant', content: '', ts: Date.now() }]);
    setInput('');
    setStreaming(true);
    pinnedRef.current = true;

    let assistantText = '';
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider,
          messages: baseMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        assistantText = d.message || 'The AI is unavailable right now. Please try again.';
        setMessages([...baseMessages, { role: 'assistant', content: assistantText, ts: Date.now() }]);
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
            setMessages([
              ...baseMessages,
              { role: 'assistant', content: assistantText, ts: Date.now() },
            ]);
          } else if (evt === 'error') {
            assistantText =
              assistantText || (payload.message as string) || 'Something went wrong.';
            setMessages([
              ...baseMessages,
              { role: 'assistant', content: assistantText, ts: Date.now() },
            ]);
          }
        }
      }
    } catch {
      assistantText = assistantText || 'Connection error. Please try again.';
      setMessages([...baseMessages, { role: 'assistant', content: assistantText, ts: Date.now() }]);
    } finally {
      setStreaming(false);
      const finalMessages: Msg[] = [
        ...baseMessages,
        { role: 'assistant', content: assistantText, ts: Date.now() },
      ];
      persist(finalMessages, provider, activeIdRef.current);
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text);
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
                    {m.role === 'assistant' && m.content === '' && streaming ? (
                      <CircularProgress size={16} />
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
          <Box
            sx={{
              maxWidth: 820,
              mx: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder={`Message ${PROVIDER_LABEL[provider]}…`}
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
              disabled={!input.trim() || streaming}
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 1 }}
          >
            Enter to send · Shift+Enter for a new line
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
