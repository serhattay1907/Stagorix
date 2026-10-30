# Motion language

Effects are not decoration: each one has a reason to be on screen. The motion language gives every effect a **role** and an **intensity**, and lets each brand set **rules** for how often effects may appear. Edit plans (written by hand now, by the Editor agent in phase 5) are checked against these rules before rendering. The code lives in `stagorix/render/motion.py`.

## Roles

| Role | Purpose | Examples |
| --- | --- | --- |
| hook | Grab attention in the opening seconds | title behind the speaker |
| emphasis | Underline a word, number or idea | punch-in zoom, shake, emoji pop, number pop |
| transition | Mark a change of section | whip, light leak |
| info | Show structured information | label, cards |
| outro | Close and ask for action | outro card |

Captions run under the whole video, so they are a layer, not a planned effect.

## Intensity

`subtle` · `medium` · `strong`. Like the calm and expressive motion tiers of design systems (IBM Carbon's productive and expressive motion, Material's standard and emphasized easing), strong effects are kept for moments that deserve them.

## Rules (per brand)

| Rule | Default | Meaning |
| --- | --- | --- |
| `hook_within` | 1.0 s | A hook effect starts this early |
| `min_gap` | 2.5 s | Time between two emphasis or transition beats |
| `same_effect_gap` | 6 s | Time before the same effect repeats |
| `strong_per_minute` | 4 | Strong effects after the hook, per minute of video |
| `outro_required` | true | The video ends with an outro |
| `signature` | all | The brand's own effects; others are rejected |

Effects that start within 0.3 s of each other share one **beat** (a whip with a light leak), so spacing is measured between beats.

The defaults are a starting point, not a verdict: they will be tuned with real videos and retention data.

## Sound

Every effect has a default sound (or none), set in `render/src/sound/sounds.json`:

| Effect | Sound | Lines up on |
| --- | --- | --- |
| title.behind | impact-punch | the accent line landing (+0.4 s) |
| camera.zoom | impact-thump | the punch-in |
| camera.whip | whoosh-fast | the middle of the whip |
| camera.shake | impact-hit | the shake |
| emoji.pop | pop-bubble | the pop |
| number.pop | tick-counter | the count (ticks slow down, then land) |
| transition.glitch | glitch-stutter | the cut |
| transition.iris | whoosh-reverse | the cut (sucks in, then stops) |
| transition.zoomblur | riser-micro | the cut (+0.1 s) |
| label | notify-blip | the label appearing |
| chart.bar | swipe-wide | the card entering |
| chart.line | riser-micro | the line reaching its last point (+1.45 s) |
| compare.versus | impact-thump | the VS badge landing (+0.35 s) |
| stats.row | tick-counter | the numbers counting (+0.2 s) |
| outro.card | chime-success | the card |
| grade.leak | none | it rides on a whip |

- **One sound per beat.** When effects share a beat, only the strongest one sounds (a whip with a light leak is one whoosh; a shake with an emoji is one hit). Stacked sounds turn to mush.
- **Each sound has a hit point** (`peak`): the moment in the file that lines up with the effect, so a whoosh peaks on the whip, not after it.
- **Levels:** every file is loudness-matched (loudest 50 ms at −14 dBFS RMS, peaks under −1 dBFS); the category gain (0.4–0.7) sets the mix about 8–12 dB under the voice, and the brand's `sound.volume` (0 = off) scales it all. Calm looks are quieter (Minimal, Luxury 0.45), loud looks louder (Energetic 1.0).
- **Phones first:** most viewers hear Shorts on a phone speaker, which plays almost nothing under ~150 Hz. Impacts and drops carry harmonics so they stay audible; `drop-long` is the one sub-only sound, for headphones and cinematic cuts.

## Commands

```bash
uv run stagorix effects                                 # the library with roles and intensities
uv run stagorix check-plan examples/plans/showcase.json # check a plan; --rules rules.json for a brand's rules
uv run stagorix sounds list [-c whoosh]                 # the sound library by category, with licenses
uv run stagorix sounds build                            # write the sound files (downloads CC0 packs once)
uv run stagorix sounds reel [-c impact]                 # a video that plays each sound, to listen and pick
```

Every edit plan entry carries a `reason`, shown to the user next to the effect in the approval step.
