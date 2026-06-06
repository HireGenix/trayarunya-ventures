"""Theme & template registry for enterprise-grade deck design.

Each theme bundles a colour palette, font pairing and layout accent style.
Themes are selectable at generation time and switchable after (re-theme
without regenerating content). The registry is in-memory for now — no DB
table needed.
"""
from __future__ import annotations

from typing import Any

# Font pairings: (heading_font, body_font). Names are Google Fonts / web-safe.
# PPTX export maps these to available system fonts with safe fallbacks.
_FONT_MAP: dict[str, tuple[str, str]] = {
    "inter":      ("Inter", "Inter"),
    "poppins":    ("Poppins", "Inter"),
    "playfair":   ("Playfair Display", "Source Sans 3"),
    "montserrat": ("Montserrat", "Open Sans"),
    "dm_sans":    ("DM Sans", "DM Sans"),
    "roboto":     ("Roboto", "Roboto"),
    "lato":       ("Lato", "Lato"),
    "raleway":    ("Raleway", "Open Sans"),
}

# Safe PPTX/PDF fallbacks when the exact font isn't embedded.
PPTX_FALLBACK: dict[str, str] = {
    "Inter": "Calibri",
    "Poppins": "Calibri",
    "Playfair Display": "Georgia",
    "Source Sans 3": "Calibri",
    "Montserrat": "Calibri",
    "Open Sans": "Calibri",
    "DM Sans": "Calibri",
    "Roboto": "Arial",
    "Lato": "Calibri",
    "Raleway": "Calibri",
}

# PDF reportlab font mapping (built-in families).
PDF_FONT_MAP: dict[str, tuple[str, str]] = {
    # (regular, bold) — reportlab built-in names
    "Inter": ("Helvetica", "Helvetica-Bold"),
    "Poppins": ("Helvetica", "Helvetica-Bold"),
    "Playfair Display": ("Times-Roman", "Times-Bold"),
    "Source Sans 3": ("Helvetica", "Helvetica-Bold"),
    "Montserrat": ("Helvetica", "Helvetica-Bold"),
    "Open Sans": ("Helvetica", "Helvetica-Bold"),
    "DM Sans": ("Helvetica", "Helvetica-Bold"),
    "Roboto": ("Helvetica", "Helvetica-Bold"),
    "Lato": ("Helvetica", "Helvetica-Bold"),
    "Raleway": ("Helvetica", "Helvetica-Bold"),
}


class Theme:
    __slots__ = ("id", "name", "primary", "accent", "ink", "heading_font",
                 "body_font", "accent_style", "font_key")

    def __init__(
        self,
        id: str,
        name: str,
        primary: str,
        accent: str,
        ink: str,
        font_key: str = "inter",
        accent_style: str = "solid",
    ) -> None:
        self.id = id
        self.name = name
        self.primary = primary
        self.accent = accent
        self.ink = ink
        self.font_key = font_key
        fonts = _FONT_MAP.get(font_key, ("Inter", "Inter"))
        self.heading_font = fonts[0]
        self.body_font = fonts[1]
        self.accent_style = accent_style  # solid | gradient | outline

    def to_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "primary": self.primary,
            "accent": self.accent,
            "ink": self.ink,
            "heading_font": self.heading_font,
            "body_font": self.body_font,
            "accent_style": self.accent_style,
        }


# Professional template gallery.
THEMES: dict[str, Theme] = {}


def _r(t: Theme) -> Theme:
    THEMES[t.id] = t
    return t


# -- Templates --
_r(Theme("minimal",    "Minimal",     "#111827", "#14BB87", "#111827", "dm_sans",     "outline"))
_r(Theme("bold",       "Bold",        "#7C3AED", "#EC4899", "#190B2E", "poppins",     "gradient"))
_r(Theme("corporate",  "Corporate",   "#1E40AF", "#3B82F6", "#0F172A", "montserrat",  "solid"))
_r(Theme("editorial",  "Editorial",   "#B45309", "#0F766E", "#1C1410", "playfair",    "solid"))
_r(Theme("pitch",      "Pitch",       "#059669", "#10B981", "#022C22", "inter",       "gradient"))
_r(Theme("modern",     "Modern",      "#14BB87", "#0FA874", "#0B1B16", "inter",       "solid"))
_r(Theme("gradient",   "Gradient",    "#2563EB", "#14BB87", "#0A1530", "raleway",     "gradient"))
_r(Theme("dark",       "Dark",        "#E5E7EB", "#FFAF06", "#0E1116", "dm_sans",     "solid"))
_r(Theme("warm",       "Warm",        "#DC2626", "#F59E0B", "#1C1917", "lato",        "gradient"))
_r(Theme("ocean",      "Ocean",       "#0891B2", "#06B6D4", "#083344", "roboto",      "solid"))

# Backwards-compat mapping from old style names to theme ids.
STYLE_TO_THEME: dict[str, str] = {
    "modern": "modern",
    "bold": "bold",
    "minimal": "minimal",
    "editorial": "editorial",
    "gradient": "gradient",
}


def get_theme(theme_id: str | None) -> Theme:
    """Look up a theme by id; default to 'modern'."""
    if not theme_id:
        return THEMES["modern"]
    return THEMES.get(theme_id, THEMES["modern"])


def get_theme_for_style(style: str) -> Theme:
    """Map an old-style palette name to a theme."""
    tid = STYLE_TO_THEME.get(style, "modern")
    return THEMES[tid]


def list_themes() -> list[dict[str, str]]:
    """Return all themes for the gallery picker."""
    return [t.to_dict() for t in THEMES.values()]


def resolve_theme_dict(
    theme_id: str | None,
    style: str | None,
    brand_primary: str | None = None,
    brand_accent: str | None = None,
    brand_name: str = "",
    logo_url: str = "",
) -> dict[str, Any]:
    """Build the deck theme dict, merging brand colours onto a theme template."""
    if theme_id:
        t = get_theme(theme_id)
    elif style:
        t = get_theme_for_style(style)
    else:
        t = THEMES["modern"]

    d: dict[str, Any] = {
        "primary": brand_primary or t.primary,
        "accent": brand_accent or t.accent,
        "ink": t.ink,
        "style": t.id,
        "heading_font": t.heading_font,
        "body_font": t.body_font,
        "accent_style": t.accent_style,
        "brand_name": brand_name,
        "logo_url": logo_url,
        "theme_id": t.id,
        "theme_name": t.name,
    }
    return d
