"""Content templates registry + bulk generation.

Structured prompt templates for common content formats, plus a bulk
generation endpoint that fans out a template across variable rows.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field, asdict

from app.llm.adapters import complete, _extract_json

logger = logging.getLogger(__name__)

# ── Template definitions (code-level registry) ──────────────────────────────
@dataclass
class TemplateVariable:
    name: str
    label: str
    placeholder: str = ""
    required: bool = True


@dataclass
class ContentTemplate:
    id: str
    name: str
    category: str
    description: str
    content_type: str  # maps to ContentType enum
    variables: list[TemplateVariable] = field(default_factory=list)
    system_prompt: str = ""
    user_prompt_template: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


TEMPLATE_REGISTRY: dict[str, ContentTemplate] = {}


def _register(t: ContentTemplate) -> ContentTemplate:
    TEMPLATE_REGISTRY[t.id] = t
    return t


_register(ContentTemplate(
    id="blog_post",
    name="Blog Post",
    category="Long-form",
    description="SEO-optimized blog post with structured headings, intro, body sections, and CTA.",
    content_type="blog",
    variables=[
        TemplateVariable("topic", "Topic / Title", "e.g. 10 Ways to Improve Email Open Rates"),
        TemplateVariable("target_keyword", "Target Keyword", "e.g. email open rates", required=False),
        TemplateVariable("audience", "Target Audience", "e.g. B2B marketers", required=False),
        TemplateVariable("tone", "Tone", "e.g. authoritative, friendly", required=False),
        TemplateVariable("word_count", "Target Word Count", "e.g. 1200", required=False),
    ],
    system_prompt=(
        "You are an expert content writer. Write a well-structured blog post in markdown. "
        "Include an engaging intro, 3-5 H2 sections with H3 subsections where appropriate, "
        "and a conclusion with CTA. Optimize for the target keyword naturally. "
        "Return JSON: {\"title\": \"...\", \"body\": \"...markdown...\"}"
    ),
    user_prompt_template=(
        "Write a blog post about: {topic}\n"
        "Target keyword: {target_keyword}\n"
        "Audience: {audience}\n"
        "Tone: {tone}\n"
        "Target length: {word_count} words"
    ),
))

_register(ContentTemplate(
    id="landing_copy",
    name="Landing Page Copy",
    category="Conversion",
    description="High-converting landing page with hero headline, benefits, social proof, and CTA sections.",
    content_type="ad_copy",
    variables=[
        TemplateVariable("product", "Product / Service", "e.g. AI-powered CRM platform"),
        TemplateVariable("offer", "Offer / Hook", "e.g. Free 14-day trial", required=False),
        TemplateVariable("audience", "Target Audience", "e.g. SaaS founders", required=False),
        TemplateVariable("key_benefits", "Key Benefits (comma-separated)", "e.g. saves 10hrs/week, 3x conversion", required=False),
    ],
    system_prompt=(
        "You are an expert conversion copywriter. Write landing page copy sections: "
        "hero headline + subheadline, 3 benefit blocks, social proof section, FAQ (3 items), "
        "and final CTA. Use persuasion principles. No fluff. "
        "Return JSON: {\"title\": \"...\", \"body\": \"...markdown...\"}"
    ),
    user_prompt_template=(
        "Product: {product}\nOffer: {offer}\nAudience: {audience}\nKey benefits: {key_benefits}"
    ),
))

_register(ContentTemplate(
    id="ad_set",
    name="Ad Copy Set",
    category="Ads",
    description="Multiple ad variants with headlines, descriptions, and CTAs for A/B testing.",
    content_type="ad_copy",
    variables=[
        TemplateVariable("product", "Product / Service", "e.g. Project management tool"),
        TemplateVariable("platform", "Ad Platform", "e.g. Google Ads, Facebook", required=False),
        TemplateVariable("audience", "Target Audience", "e.g. remote teams"),
        TemplateVariable("usp", "Unique Selling Point", "e.g. AI-powered task prioritization", required=False),
    ],
    system_prompt=(
        "You are an expert ad copywriter. Create 3 ad variants, each with: headline (≤30 chars), "
        "primary text (≤125 chars), description (≤30 chars), and CTA text. Vary the angle: "
        "one benefit-focused, one urgency-driven, one social-proof based. "
        "Return JSON: {\"title\": \"Ad Set\", \"body\": \"...all variants as markdown...\"}"
    ),
    user_prompt_template=(
        "Product: {product}\nPlatform: {platform}\nAudience: {audience}\nUSP: {usp}"
    ),
))

_register(ContentTemplate(
    id="email",
    name="Marketing Email",
    category="Email",
    description="Email with subject line, preview text, body, and CTA for campaigns or sequences.",
    content_type="newsletter",
    variables=[
        TemplateVariable("purpose", "Email Purpose", "e.g. Product launch announcement"),
        TemplateVariable("audience", "Recipient Segment", "e.g. active trial users"),
        TemplateVariable("key_message", "Key Message", "e.g. New AI features now live"),
        TemplateVariable("cta", "Call to Action", "e.g. Start free trial", required=False),
        TemplateVariable("tone", "Tone", "e.g. excited, professional", required=False),
    ],
    system_prompt=(
        "You are an expert email marketer. Write a marketing email with: subject line (≤60 chars), "
        "preview text (≤90 chars), email body (200-400 words), and CTA button text. "
        "Use proven email structure: hook → value → proof → CTA. "
        "Return JSON: {\"title\": \"<subject line>\", \"body\": \"...email body markdown...\"}"
    ),
    user_prompt_template=(
        "Purpose: {purpose}\nAudience: {audience}\nKey message: {key_message}\n"
        "CTA: {cta}\nTone: {tone}"
    ),
))

_register(ContentTemplate(
    id="product_description",
    name="Product Description",
    category="E-commerce",
    description="Compelling product description with features, benefits, and specifications.",
    content_type="ad_copy",
    variables=[
        TemplateVariable("product_name", "Product Name", "e.g. EcoBreeze Air Purifier"),
        TemplateVariable("category", "Product Category", "e.g. Home appliances"),
        TemplateVariable("features", "Key Features (comma-separated)", "e.g. HEPA filter, whisper-quiet, smart app"),
        TemplateVariable("price_range", "Price Range", "e.g. $199-$299", required=False),
        TemplateVariable("audience", "Target Buyer", "e.g. health-conscious homeowners", required=False),
    ],
    system_prompt=(
        "You are an expert e-commerce copywriter. Write a product description with: "
        "compelling headline, 2-3 sentence hook, 3-5 benefit-focused feature descriptions, "
        "and a closing line with purchase motivation. "
        "Return JSON: {\"title\": \"...\", \"body\": \"...markdown...\"}"
    ),
    user_prompt_template=(
        "Product: {product_name}\nCategory: {category}\nFeatures: {features}\n"
        "Price: {price_range}\nTarget buyer: {audience}"
    ),
))

_register(ContentTemplate(
    id="case_study",
    name="Case Study",
    category="Long-form",
    description="Customer success story with challenge, solution, results, and testimonial framework.",
    content_type="blog",
    variables=[
        TemplateVariable("company", "Company / Customer Name", "e.g. Acme Corp"),
        TemplateVariable("industry", "Industry", "e.g. FinTech"),
        TemplateVariable("challenge", "Challenge / Problem", "e.g. manual invoice processing taking 40hrs/week"),
        TemplateVariable("solution", "Solution Used", "e.g. AI-powered document processing"),
        TemplateVariable("results", "Key Results", "e.g. 90% time reduction, $500K annual savings", required=False),
    ],
    system_prompt=(
        "You are an expert B2B content writer. Write a case study in markdown with these sections: "
        "Executive Summary (2-3 sentences), The Challenge, The Solution, The Results (with metrics), "
        "Key Takeaways. Use a professional, credible tone. "
        "Return JSON: {\"title\": \"...\", \"body\": \"...markdown...\"}"
    ),
    user_prompt_template=(
        "Company: {company}\nIndustry: {industry}\nChallenge: {challenge}\n"
        "Solution: {solution}\nResults: {results}"
    ),
))


def list_templates() -> list[dict]:
    return [t.to_dict() for t in TEMPLATE_REGISTRY.values()]


def get_template(template_id: str) -> ContentTemplate | None:
    return TEMPLATE_REGISTRY.get(template_id)


def render_prompt(template: ContentTemplate, variables: dict[str, str]) -> tuple[str, str]:
    """Render a template with variables. Returns (system_prompt, user_message)."""
    # Fill in variables with defaults for missing optional ones
    filled = {}
    for var in template.variables:
        val = variables.get(var.name, "")
        if not val and not var.required:
            val = "not specified"
        filled[var.name] = val

    user_msg = template.user_prompt_template
    for k, v in filled.items():
        user_msg = user_msg.replace(f"{{{k}}}", v)

    return template.system_prompt, user_msg


async def generate_from_template(
    template_id: str,
    variables: dict[str, str],
    *,
    brand_voice_context: str = "",
    provider: str | None = None,
) -> dict:
    """Generate content from a template + variables. Returns {title, body}."""
    template = get_template(template_id)
    if not template:
        return {"title": "", "body": "", "error": f"Unknown template: {template_id}"}

    system, user_msg = render_prompt(template, variables)
    if brand_voice_context:
        system += f"\n\n{brand_voice_context}"

    try:
        raw = await complete(
            messages=[{"role": "user", "content": user_msg}],
            system=system,
            provider=provider,
        )
        parsed = json.loads(_extract_json(raw))
        return {
            "title": parsed.get("title") or "",
            "body": parsed.get("body") or raw,
            "content_type": template.content_type,
            "template_id": template_id,
        }
    except Exception as exc:
        logger.warning("Template generation failed: %s", exc)
        return {"title": "", "body": "", "error": str(exc)}


async def bulk_generate(
    template_id: str,
    rows: list[dict[str, str]],
    *,
    brand_voice_context: str = "",
    provider: str | None = None,
) -> list[dict]:
    """Generate content for multiple variable sets (bulk / CSV rows)."""
    results: list[dict] = []
    for row in rows[:50]:  # cap at 50 rows
        result = await generate_from_template(
            template_id, row,
            brand_voice_context=brand_voice_context,
            provider=provider,
        )
        results.append(result)
    return results
