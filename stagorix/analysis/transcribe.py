"""Word-level transcription with faster-whisper.

The language comes from the caller (brand profile or CLI flag) or is
detected; nothing here assumes a language (principle 1).
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from stagorix import models
from stagorix.analysis.media import SAMPLE_RATE, decode_audio
from stagorix.analysis.models import Transcript, Word


def _device() -> tuple[str, str]:
    import ctranslate2

    if ctranslate2.get_cuda_device_count() > 0:
        return "cuda", "float16"
    return "cpu", "int8"


def transcribe(
    path: Path,
    model: str = models.DEFAULT_WHISPER,
    language: str | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> Transcript:
    """Transcribe a media file. on_progress receives the fraction done (0..1)."""
    from faster_whisper import WhisperModel

    if model not in models.WHISPER_MODELS:
        raise ValueError(f"unknown Whisper model '{model}'; choose from {', '.join(models.WHISPER_MODELS)}")
    if not models.is_downloaded(model):
        models.download_whisper(model)

    audio = decode_audio(path)
    duration = len(audio) / SAMPLE_RATE
    device, compute_type = _device()
    whisper = WhisperModel(str(models.whisper_path(model)), device=device, compute_type=compute_type)
    segments, info = whisper.transcribe(
        audio, language=language, word_timestamps=True, beam_size=5, vad_filter=True
    )

    words: list[Word] = []
    for segment in segments:
        for w in segment.words or []:
            text = w.word.strip()
            if text:
                words.append(
                    Word(
                        text=text,
                        start=round(max(w.start, 0.0), 3),
                        end=round(max(w.end, 0.0), 3),
                        probability=round(min(max(w.probability, 0.0), 1.0), 3),
                    )
                )
        if on_progress and duration > 0:
            on_progress(min(segment.end / duration, 1.0))

    if on_progress:
        on_progress(1.0)
    return Transcript(
        source=path.name,
        language=info.language,
        language_detected=language is None,
        model=model,
        duration=round(duration, 3),
        words=words,
    )
