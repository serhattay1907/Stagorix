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
HESITATION_GAP = 0.5  # a gap inside a sentence longer than this is a hesitation
HESITATION_KEEP = 0.2
STRETCH_RATIO = 2.0  # word slower than this multiple of the speaker's norm
SHORT_WORD = 2  # letters; short words are often stretched on purpose for emphasis
MAX_REPEAT_WORDS = 4
MAX_RESTART_DISTANCE = 3  # words allowed between the first take and the restart
APPROVE_FROM = 0.6

SENTENCE_END = re.compile(r"[.!?…。！？؟।]+[\"'”’»)\]]*$")


def _letters(text: str) -> int:
    return sum(ch.isalpha() for ch in text)


def _norm(text: str) -> str:
    return "".join(ch for ch in text.casefold() if ch.isalnum())


def _ends_sentence(word: Word) -> bool:
    return bool(SENTENCE_END.search(word.text))


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
        if _ends_sentence(prev):
            if gap > PAUSE_KEEP:
                found.append(
                    _flub(
                        FlubKind.PAUSE,
                        prev.end,
                        nxt.start,
                        context,
                        0.9,
                        FlubAction.SHORTEN,
                        keep=PAUSE_KEEP,
                        detail=f"{gap:.2f}s pause after a sentence → {PAUSE_KEEP}s",
                    )
                )
        elif gap > HESITATION_GAP:
            found.append(
                _flub(
                    FlubKind.HESITATION,
                    prev.end,
                    nxt.start,
                    context,
                    0.4 + 0.5 * (gap - HESITATION_GAP),  # 0.5 s → 0.4, 1.0 s → 0.65, 1.6 s → 0.95
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
        conf = 0.5 + 0.3 * (ratio - STRETCH_RATIO)  # ×2 → 0.5, ×3 → 0.8
        notes = []
        if n <= SHORT_WORD:
            conf *= 0.5
            notes.append("short word, may be emphasis")
        if i in (0, last):
            conf *= 0.8
            notes.append("edge word, timing less reliable")
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
                if any(_ends_sentence(w) for w in take):
                    continue  # finished sentence: deliberate repetition, keep it
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
