"""Typed results of media analysis. Every analysis step writes one of these as JSON."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Word(BaseModel):
    text: str
    start: float = Field(ge=0, description="Seconds from the start of the input.")
    end: float = Field(ge=0)
    probability: float = Field(ge=0, le=1)


class Transcript(BaseModel):
    source: str
    language: str = Field(description="Language code used, given or detected.")
    language_detected: bool
    model: str
    duration: float = Field(ge=0, description="Audio duration in seconds.")
    words: list[Word]

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)
