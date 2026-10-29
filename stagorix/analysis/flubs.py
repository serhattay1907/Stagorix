"""Flub detector: finds hesitations, stretched words, restarts and long pauses.

Works only on word timestamps from the transcript, so it is fast and
language-neutral: speaking rate is measured in seconds per letter (any
alphabet), and sentence ends are recognised by Unicode punctuation. Every
finding carries a confidence score and is only a proposal: the user approves
or rejects each one before anything is cut (principle 3).
"""

from __future__ import annotations

import re
import statistics

from stagorix.analysis.models import Flub, FlubAction, FlubKind, FlubReport, Transcript, Word

PAUSE_KEEP = 0.6  # a long pause at a sentence end is shortened to this, not removed
CLAUSE_KEEP = 0.4  # same after a comma or similar clause break
HESITATION_GAP = 0.5  # a gap inside a sentence longer than this is a hesitation
HESITATION_KEEP = 0.2
STRETCH_RATIO = 2.5  # word slower than this multiple of the speaker's norm
SHORT_WORD_MAX_CONFIDENCE = 0.5  # never pre-approve a stretched short word
SHORT_WORD = 2  # letters; short words are often stretched on purpose for emphasis
MAX_REPEAT_WORDS = 4
MAX_RESTART_DISTANCE = 3  # words allowed between the first take and the restart
APPROVE_FROM = 0.6

SENTENCE_END = re.compile(r"[.!?…。！？؟।]+[\"'”’»)\]]*$")
CLAUSE_END = re.compile(r"[,;:،、，；：]+[\"'”’»)\]]*$")


def _letters(text: str) -> int:
    return sum(ch.isalpha() for ch in text)


def _norm(text: str) -> str:
    return "".join(ch for ch in text.casefold() if ch.isalnum())


def _ends_sentence(word: Word) -> bool:
    return bool(SENTENCE_END.search(word.text))


def _ends_clause(word: Word) -> bool:
    return bool(CLAUSE_END.search(word.text))


def letter_seconds(words: list[Word]) -> float:
    """Median seconds per letter over words long enough to be reliable."""
    rates = [(w.end - w.start) / n for w in words if (n := _letters(w.text)) > SHORT_WORD and w.end > w.start]
    if not rates:
        rates = [(w.end - w.start) / n for w in words if (n := _letters(w.text)) and w.end > w.start]
    return statistics.median(rates) if rates else 0.0


def _clamp(x: float) -> float:
    return round(min(max(x, 0.0), 0.95), 2)


def _flub(kind: FlubKind, start: float, end: float, text: str, conf: float, action: FlubAction, **kw) -> Flub:  # type: ignore[no-untyped-def]
    c = _clamp(conf)
    return Flub(
        kind=kind,
        start=round(start, 2),
        end=round(end, 2),
        text=text,
        confidence=c,
        action=action,
        approved=c >= APPROVE_FROM,
        **kw,
    )


def find_gaps(words: list[Word]) -> list[Flub]:
    found: list[Flub] = []
    for prev, nxt in zip(words, words[1:], strict=False):
        gap = nxt.start - prev.end
        context = f"{prev.text} … {nxt.text}"
        if _ends_sentence(prev) or _ends_clause(prev):
            keep, where = (PAUSE_KEEP, "sentence") if _ends_sentence(prev) else (CLAUSE_KEEP, "clause")
            if gap > PAUSE_KEEP:
                found.append(
                    _flub(
                        FlubKind.PAUSE,
                        prev.end,
                        nxt.start,
                        context,
                        0.9,
                        FlubAction.SHORTEN,
                        keep=keep,
                        detail=f"{gap:.2f}s pause after a {where} → {keep}s",
                    )
                )
        elif gap > HESITATION_GAP:
            found.append(
                _flub(
                    FlubKind.HESITATION,
                    prev.end,
                    nxt.start,
                    context,
                    0.6 + 0.5 * (gap - HESITATION_GAP),  # 0.5 s → 0.6, 1.0 s → 0.85
                    FlubAction.SHORTEN,
                    keep=HESITATION_KEEP,
                    detail=f"{gap:.2f}s gap inside a sentence → {HESITATION_KEEP}s",
                )
            )
    return found


def find_stretches(words: list[Word], per_letter: float) -> list[Flub]:
    if per_letter <= 0:
        return []
    found: list[Flub] = []
    last = len(words) - 1
    for i, w in enumerate(words):
        n = _letters(w.text)
        if not n:
            continue
        ratio = (w.end - w.start) / (n * per_letter)
        if ratio < STRETCH_RATIO:
            continue
        conf = 0.55 + 0.4 * (ratio - STRETCH_RATIO)  # ×2.5 → 0.55, ×3 → 0.75
        notes = []
        if n <= SHORT_WORD:
            conf = min(conf * 0.5, SHORT_WORD_MAX_CONFIDENCE)
            notes.append("short word, may be emphasis")
        if i in (0, last):
            conf *= 0.8
            notes.append("edge word, timing less reliable")
        elif _ends_sentence(w):
            conf *= 0.7
            notes.append("last word of a sentence, often drawn out")
        note = f" ({'; '.join(notes)})" if notes else ""
        found.append(
            _flub(
                FlubKind.STRETCH,
                w.start,
                w.end,
                w.text,
                conf,
                FlubAction.REVIEW,
                detail=f"×{ratio:.1f} slower than usual{note}",
            )
        )
    return found


def find_repeats(words: list[Word]) -> list[Flub]:
    """A phrase said again after an unfinished first take: keep the last take."""
    keys = [_norm(w.text) for w in words]
    found: list[Flub] = []
    i = 0
    while i < len(words):
        hit = None
        for n in range(MAX_REPEAT_WORDS, 0, -1):
            first = keys[i : i + n]
            if len(first) < n or not all(first):
                continue
            for j in range(i + n, min(i + n + MAX_RESTART_DISTANCE, len(words) - n) + 1):
                if keys[j : j + n] != first:
                    continue
                take = words[i:j]
                if any(_ends_sentence(w) for w in take) or _ends_clause(take[-1]):
                    continue  # finished sentence or clause: deliberate repetition (a list), keep it
                hit = (n, j)
                break
            if hit:
                break
        if not hit:
            i += 1
            continue
        n, j = hit
        take = words[i:j]
        gap_before_restart = words[j].start - words[j - 1].end
        conf = 0.55 + 0.1 * (n - 1) + (0.2 if gap_before_restart > 0.2 else 0)
        if n == 1 and len(take) > 1:
            conf -= 0.2  # one shared word followed by different words is weak evidence
        found.append(
            _flub(
                FlubKind.REPEAT,
                take[0].start,
                words[j].start,
                " ".join(w.text for w in take),
                conf,
                FlubAction.CUT,
                detail=f"restarted after {len(take)} word(s); keeping the last take",
            )
        )
        i = j
    return found


def detect_flubs(transcript: Transcript) -> FlubReport:
    words = transcript.words
    per_letter = letter_seconds(words)
    flubs = [*find_gaps(words), *find_stretches(words, per_letter), *find_repeats(words)]
    flubs.sort(key=lambda f: (f.start, f.kind))
    return FlubReport(
        source=transcript.source,
        language=transcript.language,
        letter_seconds=round(per_letter, 4),
        approve_from=APPROVE_FROM,
        flubs=flubs,
    )
