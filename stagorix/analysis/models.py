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


class FaceDetection(BaseModel):
    frame: int = Field(ge=0)
    x: float
    y: float
    w: float = Field(gt=0)
    h: float = Field(gt=0)
    score: float = Field(ge=0, le=1)


class FaceTrack(BaseModel):
    source: str
    width: int
    height: int
    fps: float
    frames: int
    sample_every: int = Field(ge=1, description="Detection ran on every Nth frame.")
    detections: list[FaceDetection]
    face_ratio: float = Field(ge=0, le=1, description="Share of sampled frames with a face.")
    crop_width: int = Field(description="Width of the full-height 9:16 window in source pixels.")
    crop_x: list[int] = Field(description="Left edge of the window for every frame.")


class Cutout(BaseModel):
    source: str
    frames: int = Field(ge=0, description="RGBA frames written, from the start of the video.")
    fps: float
    model: str
    person_ratio: float = Field(ge=0, le=1, description="Average share of each frame marked as person.")


class VoiceTrack(BaseModel):
    source: str
    lufs_before: float
    lufs_after: float
    target_lufs: float
