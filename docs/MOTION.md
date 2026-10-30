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

## Commands

```bash
uv run stagorix effects                                 # the library with roles and intensities
uv run stagorix check-plan examples/plans/showcase.json # check a plan; --rules rules.json for a brand's rules
```

Every edit plan entry carries a `reason`, shown to the user next to the effect in the approval step.
