"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, TextField, Button, IconButton,
  Chip, Divider, CircularProgress,
} from "@mui/material";
import { Send, CheckCircle, ChatBubbleOutline } from "@mui/icons-material";
import { Decks, type DeckComment } from "@/lib/api";

interface CommentsPanelProps {
  deckId: string;
  activeSlide: number;
  onCountChange?: (count: number) => void;
}

export default function CommentsPanel({ deckId, activeSlide, onCountChange }: CommentsPanelProps) {
  const [comments, setComments] = useState<DeckComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "slide">("slide");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Decks.listComments(deckId);
      setComments(data);
      onCountChange?.(data.filter((c) => !c.resolved).length);
    } catch { /* ignore */ }
    setLoading(false);
  }, [deckId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "slide"
    ? comments.filter((c) => c.slide_index === activeSlide)
    : comments;

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await Decks.createComment(deckId, {
        slide_index: activeSlide,
        body: body.trim(),
      });
      setBody("");
      await load();
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleResolve = async (id: string) => {
    try {
      await Decks.resolveComment(deckId, id);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FAFAFA" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 1 }}>
        <ChatBubbleOutline sx={{ fontSize: 18, color: "#14BB87" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0E1116" }}>Comments</Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          label="This slide"
          size="small"
          variant={filter === "slide" ? "filled" : "outlined"}
          onClick={() => setFilter("slide")}
          sx={{ fontSize: 11, height: 24, ...(filter === "slide" && { bgcolor: "#14BB87", color: "#fff" }) }}
        />
        <Chip
          label="All"
          size="small"
          variant={filter === "all" ? "filled" : "outlined"}
          onClick={() => setFilter("all")}
          sx={{ fontSize: 11, height: 24, ...(filter === "all" && { bgcolor: "#14BB87", color: "#fff" }) }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: "#14BB87" }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography sx={{ color: "#9CA3AF", fontSize: 13, py: 4, textAlign: "center" }}>
            No comments yet
          </Typography>
        ) : (
          filtered.map((c) => (
            <Box
              key={c.id}
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: c.resolved ? "#F3F4F6" : "#fff",
                border: "1px solid #E5E7EB",
                opacity: c.resolved ? 0.7 : 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#0E1116" }}>
                  {c.author}
                </Typography>
                <Chip
                  label={`Slide ${c.slide_index + 1}`}
                  size="small"
                  sx={{ fontSize: 10, height: 18, bgcolor: "#E5E7EB" }}
                />
                {c.resolved && (
                  <CheckCircle sx={{ fontSize: 14, color: "#14BB87", ml: "auto" }} />
                )}
              </Box>
              <Typography sx={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                {c.body}
              </Typography>
              {!c.resolved && (
                <Button
                  size="small"
                  onClick={() => handleResolve(c.id)}
                  sx={{ mt: 0.5, fontSize: 11, textTransform: "none", color: "#14BB87", p: 0, minWidth: 0 }}
                >
                  Resolve
                </Button>
              )}
            </Box>
          ))
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          multiline
          maxRows={3}
          placeholder={`Comment on slide ${activeSlide + 1}...`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          size="small"
          fullWidth
          sx={{ "& .MuiOutlinedInput-root": { fontSize: 13 } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!body.trim() || sending}
          sx={{ color: "#14BB87" }}
        >
          {sending ? <CircularProgress size={18} /> : <Send sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
    </Box>
  );
}
