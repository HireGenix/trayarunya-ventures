"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  Grid, Card, CardContent, CardActionArea, Chip, CircularProgress,
} from "@mui/material";
import { Palette } from "@mui/icons-material";
import { Decks, type ThemeGalleryItem, type Deck } from "@/lib/api";

interface ThemePickerProps {
  deckId: string;
  currentThemeId?: string;
  onApplied: (deck: Deck) => void;
}

export default function ThemePicker({ deckId, currentThemeId, onApplied }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState<ThemeGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Decks.themeGallery()
      .then(setThemes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleApply = async (themeId: string) => {
    setApplying(themeId);
    try {
      const updated = await Decks.applyTheme(deckId, themeId);
      onApplied(updated);
      setOpen(false);
    } catch { /* ignore */ }
    setApplying(null);
  };

  return (
    <>
      <Button
        startIcon={<Palette />}
        onClick={() => setOpen(true)}
        size="small"
        sx={{ textTransform: "none", color: "#14BB87" }}
      >
        Themes
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#0E1116" }}>Theme Gallery</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: "#14BB87" }} />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {themes.map((t) => (
                <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: t.id === currentThemeId ? "#14BB87" : "divider",
                      borderWidth: t.id === currentThemeId ? 2 : 1,
                    }}
                  >
                    <CardActionArea onClick={() => handleApply(t.id)} disabled={applying !== null}>
                      <Box
                        sx={{
                          height: 80,
                          background: `linear-gradient(135deg, ${t.preview.primary} 0%, ${t.preview.accent} 100%)`,
                          display: "flex",
                          alignItems: "flex-end",
                          p: 1,
                        }}
                      >
                        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                          Aa
                        </Typography>
                      </Box>
                      <CardContent sx={{ py: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#0E1116" }}>
                            {t.name}
                          </Typography>
                          {t.id === currentThemeId && (
                            <Chip label="Active" size="small" sx={{ bgcolor: "#14BB87", color: "#fff", height: 20, fontSize: 11 }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.3 }}>
                          {t.description}
                        </Typography>
                        {applying === t.id && <CircularProgress size={16} sx={{ mt: 0.5, color: "#14BB87" }} />}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
