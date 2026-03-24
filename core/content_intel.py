from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse


_TOKEN_PATTERN = re.compile(r"[a-z0-9]+", re.IGNORECASE)
_SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")
_NOISE_PATTERNS = (
    re.compile(r"^(sign in|log in|sign up|create account|skip to content)\b", re.IGNORECASE),
    re.compile(r"^(privacy|terms|cookies?|copyright|all rights reserved)\b", re.IGNORECASE),
    re.compile(r"^(share|copy link|download|upload|notifications?|settings?|menu|search)\b", re.IGNORECASE),
    re.compile(r"^(home|explore|pricing|enterprise|features|solutions|community|help)\b", re.IGNORECASE),
)
_UI_NOISE_WORDS = {
    "account",
    "accounts",
    "button",
    "buttons",
    "click",
    "close",
    "comment",
    "comments",
    "cookie",
    "cookies",
    "download",
    "enterprise",
    "explore",
    "follow",
    "footer",
    "header",
    "help",
    "home",
    "install",
    "like",
    "likes",
    "loading",
    "login",
    "logout",
    "menu",
    "navigation",
    "next",
    "notification",
    "notifications",
    "open",
    "pricing",
    "previous",
    "profile",
    "reply",
    "search",
    "settings",
    "share",
    "sidebar",
    "signup",
    "subscribe",
    "toolbar",
    "upload",
    "views",
}


@dataclass(slots=True)
class ContentProfile:
    cleaned_text: str
    passages: list[str]
    headings: list[str]
    snippet: str
    keyphrase_source: str


def _normalize_inline(text: str) -> str:
    return re.sub(r"[ \t]+", " ", str(text or "").replace("\xa0", " ")).strip()


def normalize_capture_text(
    value: str | None,
    *,
    preserve_paragraphs: bool = True,
    max_chars: int | None = None,
) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    if preserve_paragraphs:
        blocks: list[str] = []
        for block in re.split(r"\n{2,}", text):
            lines = [_normalize_inline(line) for line in block.split("\n")]
            cleaned = [line for line in lines if line]
            if cleaned:
                blocks.append("\n".join(cleaned))
        normalized = "\n\n".join(blocks).strip()
    else:
        normalized = re.sub(r"\s+", " ", text).strip()
    if max_chars and len(normalized) > max_chars:
        return normalized[:max_chars].rstrip()
    return normalized


def _domain(url: str | None) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    return parsed.netloc.removeprefix("www.").casefold()


def _tokens(text: str) -> list[str]:
    return [token.lower() for token in _TOKEN_PATTERN.findall(text or "")]


def _looks_like_heading(line: str, *, title: str | None) -> bool:
    text = _normalize_inline(line)
    if not text or len(text) < 8 or len(text) > 96:
        return False
    if text.endswith((".", "?", "!")):
        return False
    if title and text.casefold() == _normalize_inline(title).casefold():
        return False
    words = text.split()
    if len(words) > 10:
        return False
    alpha_chars = sum(1 for char in text if char.isalpha())
    if alpha_chars < max(6, len(text) // 3):
        return False
    lower_words = [word for word in words if word[:1].isalpha()]
    if not lower_words:
        return False
    tokens = _tokens(text)
    ui_hits = sum(1 for token in tokens if token in _UI_NOISE_WORDS)
    if ui_hits >= max(2, len(tokens) - 1):
        return False
    title_like = sum(1 for word in lower_words if word[:1].isupper()) >= max(2, len(lower_words) // 2)
    all_caps = alpha_chars > 0 and text.upper() == text
    return title_like or all_caps


def _is_noise_block(text: str, *, title: str | None, app_name: str | None, url: str | None) -> bool:
    candidate = _normalize_inline(text)
    if not candidate:
        return True
    lowered = candidate.casefold()
    if title and lowered == _normalize_inline(title).casefold():
        return False
    if app_name and lowered == _normalize_inline(app_name).casefold():
        return True
    if url and lowered == _domain(url):
        return True
    if any(pattern.search(candidate) for pattern in _NOISE_PATTERNS):
        return True
    tokens = _tokens(candidate)
    if not tokens:
        return True
    if len(tokens) <= 5 and all(token in _UI_NOISE_WORDS for token in tokens):
        return True
    ui_hits = sum(1 for token in tokens if token in _UI_NOISE_WORDS)
    if len(tokens) <= 12 and ui_hits >= max(3, len(tokens) - 1):
        return True
    alnum_chars = sum(1 for char in candidate if char.isalnum())
    if alnum_chars and sum(1 for char in candidate if not char.isalnum() and not char.isspace()) > alnum_chars:
        return True
    return False


def _score_block(text: str, *, title: str | None, app_name: str | None, url: str | None) -> float:
    candidate = _normalize_inline(text)
    if _is_noise_block(candidate, title=title, app_name=app_name, url=url):
        return -1.0
    tokens = _tokens(candidate)
    if not tokens:
        return -1.0

    unique_ratio = len(set(tokens)) / max(len(tokens), 1)
    score = 0.0
    score += min(len(tokens) / 28.0, 1.3)
    score += unique_ratio * 0.6
    if 48 <= len(candidate) <= 420:
        score += 0.4
    if any(mark in candidate for mark in (". ", "? ", "! ", ": ")):
        score += 0.22
    if title:
        title_tokens = set(_tokens(title))
        overlap = sum(1 for token in tokens if token in title_tokens)
        if overlap >= 2:
            score += 0.2
    if url:
        domain_tokens = {token for token in _tokens(_domain(url)) if len(token) >= 3}
        if domain_tokens and sum(1 for token in tokens if token in domain_tokens) >= max(2, len(domain_tokens)):
            score -= 0.35
    ui_hits = sum(1 for token in tokens if token in _UI_NOISE_WORDS)
    score -= min(ui_hits * 0.08, 0.5)
    return score


def _chunk_block(block: str) -> list[str]:
    text = _normalize_inline(block)
    if len(text) <= 420:
        return [text] if text else []
    sentences = [sentence.strip() for sentence in _SENTENCE_SPLIT_PATTERN.split(text) if sentence.strip()]
    if len(sentences) <= 1:
        return [text[:420].rstrip()]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for sentence in sentences:
        extra = len(sentence) + (1 if current else 0)
        if current and current_len + extra > 360:
            chunks.append(" ".join(current))
            current = [sentence]
            current_len = len(sentence)
        else:
            current.append(sentence)
            current_len += extra
    if current:
        chunks.append(" ".join(current))
    return [chunk for chunk in chunks if len(chunk) >= 40] or [text[:420].rstrip()]


def extract_content_profile(
    text: str | None,
    *,
    title: str | None = None,
    app_name: str | None = None,
    url: str | None = None,
    max_passages: int = 6,
) -> ContentProfile:
    normalized = normalize_capture_text(text, preserve_paragraphs=True)
    if not normalized:
        return ContentProfile(cleaned_text="", passages=[], headings=[], snippet="", keyphrase_source="")

    raw_blocks = [block.strip() for block in re.split(r"\n{2,}", normalized) if block.strip()]
    headings: list[str] = []
    heading_seen: set[str] = set()
    scored_blocks: list[tuple[float, int, str]] = []
    block_seen: set[str] = set()

    for block_index, raw_block in enumerate(raw_blocks):
        raw_lines = [_normalize_inline(line) for line in raw_block.split("\n") if _normalize_inline(line)]
        lines = [
            line
            for line in raw_lines
            if not _is_noise_block(line, title=title, app_name=app_name, url=url)
        ]
        if not lines and raw_lines:
            lines = raw_lines[:1]
        if not lines:
            continue
        for line in lines[:2]:
            key = line.casefold()
            if key in heading_seen:
                continue
            if _looks_like_heading(line, title=title):
                headings.append(line)
                heading_seen.add(key)
                if len(headings) >= 3:
                    break
        merged = " ".join(lines)
        for chunk in _chunk_block(merged):
            key = chunk.casefold()
            if key in block_seen:
                continue
            block_seen.add(key)
            score = _score_block(chunk, title=title, app_name=app_name, url=url)
            scored_blocks.append((score, block_index, chunk))

    selected = [
        (score, index, block)
        for score, index, block in scored_blocks
        if score >= 0.45 or (score >= 0.15 and len(_tokens(block)) >= 18)
    ]
    if not selected:
        selected = sorted(scored_blocks, key=lambda item: (item[0], -item[1], len(item[2])), reverse=True)[:max_passages]
    else:
        selected = sorted(selected, key=lambda item: (item[0], -item[1], len(item[2])), reverse=True)[:max_passages]

    passages = [block for _score, _index, block in selected]
    ordered_blocks = [block for _score, _index, block in sorted(selected, key=lambda item: item[1])]
    cleaned_text = "\n\n".join(ordered_blocks).strip()
    if not cleaned_text:
        cleaned_text = normalize_capture_text(text, preserve_paragraphs=False)
    snippet_source = passages[0] if passages else cleaned_text
    snippet = _normalize_inline(snippet_source)
    if len(snippet) > 220:
        snippet = snippet[:217].rstrip() + "..."
    keyphrase_source = "\n\n".join(passages[:4]).strip() or cleaned_text
    return ContentProfile(
        cleaned_text=cleaned_text,
        passages=passages,
        headings=headings[:3],
        snippet=snippet,
        keyphrase_source=keyphrase_source,
    )
