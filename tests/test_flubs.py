from stagorix.analysis.flubs import detect_flubs, find_gaps, find_repeats, find_stretches, letter_seconds
from stagorix.analysis.models import FlubAction, FlubKind, Transcript, Word

PER_LETTER = 0.07  # a typical speaking rate


def words(
    spec: str, gaps: dict[int, float] | None = None, slow: dict[int, float] | None = None
) -> list[Word]:
    """Words at a steady rate; `gaps[i]` adds silence before word i, `slow[i]` stretches word i."""
    out, t = [], 0.0
    for i, text in enumerate(spec.split()):
        t += (gaps or {}).get(i, 0.08)
        letters = sum(c.isalpha() for c in text)
        dur = letters * PER_LETTER * (slow or {}).get(i, 1.0)
        out.append(Word(text=text, start=round(t, 3), end=round(t + dur, 3), probability=0.9))
        t += dur
    return out


def test_steady_speech_has_no_flubs() -> None:
    ws = words("Bugün size yeni bir fikir anlatacağım. Çok basit ama işe yarıyor.")
    report = detect_flubs(
        Transcript(
            source="x", language="tr", language_detected=True, model="small", duration=ws[-1].end, words=ws
        )
    )
    assert report.flubs == []
    assert abs(report.letter_seconds - PER_LETTER) < 0.005


def test_long_pause_after_sentence_is_shortened_not_removed() -> None:
    (flub,) = find_gaps(words("Merhaba arkadaşlar. Bugün başlıyoruz", gaps={2: 0.92}))
    assert flub.kind is FlubKind.PAUSE and flub.action is FlubAction.SHORTEN
    assert flub.keep == 0.6 and flub.approved


def test_short_pause_after_sentence_is_kept() -> None:
    assert find_gaps(words("Merhaba arkadaşlar. Bugün başlıyoruz", gaps={2: 0.5})) == []


def test_gap_inside_sentence_is_a_hesitation_scored_by_length() -> None:
    (short,) = find_gaps(words("ben ofise gittim", gaps={1: 0.6}))
    (long,) = find_gaps(words("ben ofise gittim", gaps={1: 1.0}))
    assert short.kind is FlubKind.HESITATION and not short.approved
    assert long.confidence > short.confidence and long.approved
    assert long.keep == 0.2


def test_stretched_word_is_flagged_for_review() -> None:
    ws = words("sabah ofis çok kalabalıktı bugün", slow={1: 2.6})
    (flub,) = find_stretches(ws, letter_seconds(ws))
    assert flub.text == "ofis" and flub.action is FlubAction.REVIEW and flub.approved


def test_stretched_short_word_gets_low_confidence() -> None:
    ws = words("sabah bu çok kalabalıktı bugün", slow={1: 3.2})
    (flub,) = find_stretches(ws, letter_seconds(ws))
    assert flub.text == "bu" and not flub.approved
    assert "emphasis" in flub.detail


def test_restart_keeps_the_last_take() -> None:
    ws = words("bugün size bugün size anlatacağım şeyi", gaps={2: 0.4})
    (flub,) = find_repeats(ws)
    assert flub.kind is FlubKind.REPEAT and flub.action is FlubAction.CUT
    assert flub.text == "bugün size"
    assert flub.start == ws[0].start and flub.end == ws[2].start
    assert flub.approved


def test_stutter_on_one_word() -> None:
    (flub,) = find_repeats(words("ben ben gittim"))
    assert flub.text == "ben"


def test_deliberate_repetition_across_sentences_is_kept() -> None:
    assert find_repeats(words("Bu kolay. Bu hızlı. Bu ücretsiz.")) == []


def test_language_neutral_punctuation_and_letters() -> None:
    (flub,) = find_gaps(words("Привет всем. Начнём", gaps={2: 1.0}))
    assert flub.kind is FlubKind.PAUSE
    (flub,) = find_gaps(words("こんにちは。 はじめます", gaps={1: 1.0}))
    assert flub.kind is FlubKind.PAUSE
