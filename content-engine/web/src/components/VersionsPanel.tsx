"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import { History, Restore, Save } from "@mui/icons-material";
import { Decks, type DeckVersion, type Deck } from "@/lib/api";

interface VersionsPanelProps {
  deckId: string;
  onRestored: (deck: Deck) => void;
}

export default function VersionsPanel({ deckId, onRestored }: VersionsPanelProps) {
  const [versions, setVersions] = useState<DeckVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [showSave, setShowSave] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await Decks.listVersions(deckId));
    } catch { /* ignore */ }
    setLoading(false);
  }, [deckId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Decks.saveVersion(deckId, label || undefined);
      setLabel("");
      setShowSave(false);
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleRestore = async (vId: string) => {
    setRestoring(vId);
    setConfirmId(null);
    try {
      const deck = await Decks.restoreVersion(deckId, vId);
      onRestored(deck);
      await load();
    } catch { /* ignore */ }
    setRestoring(null);
  };

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FAFAFA" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 1 }}>
        <History sx={{ fontSize: 18, color: "#14BB87" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0E1116" }}>Versions</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<Save />}
          size="small"
          onClick={() => setShowSave(true)}
          sx={{ textTransform: "none", fontSize: 12, color: "#14BB87" }}
        >
          Save checkpoint
        </Button>
      </Box>

      {showSave && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #E5E7EB", display: "flex", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Version label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { fontSize: 13 } }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ textTransform: "none", bgcolor: "#14BB87", "&:hover": { bgcolor: "#0FA874" } }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Save"}
          </Button>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: "#14BB87" }} />
          </Box>
        ) : versions.length === 0 ? (
          <Typography sx={{ color: "#9CA3AF", fontSize: 13, py: 4, textAlign: "center" }}>
            No saved versions
          </Typography>
        ) : (
          versions.map((v) => (
            <Box
              key={v.id}
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "#fff",
                border: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0E1116" }}>
                  v{v.version_number}{v.label ? ` — ${v.label}` : ""}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#9CA3AF" }}>
                  {fmt(v.created_at)} by {v.created_by}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setConfirmId(v.id)}
                disabled={restoring !== null}
                sx={{ color: "#6B7280" }}
              >
                {restoring === v.id ? <CircularProgress size={16} /> : <Restore sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
          ))
        )}
      </Box>

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: "#0E1116" }}>Restore version?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            This will replace the current slides with the snapshot from this version. A new version checkpoint will be saved automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            onClick={() => confirmId && handleRestore(confirmId)}
            variant="contained"
            sx={{ textTransform: "none", bgcolor: "#D92C4A", "&:hover": { bgcolor: "#b91c3a" } }}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
