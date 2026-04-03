# Pocket MD

**Title:** Pocket MD: A Doctor for Everyone, Everywhere, Every Time
**Subtitle:** On-device AI triage powered by Gemma 4 — instant medical guidance for anyone, anywhere, even without internet.

> A doctor in every pocket. For everyone.

**Gemma 4 Good Hackathon submission** — Track: Health & Sciences

---

## The Story

*Lead with yourself. Land on the world.*

A vivid hiker. A trail gone wrong. No signal. Uncertainty. A phone that answers.

Then the pull-back: **"But I'm one of the lucky ones."**

1.8 billion people live more than 2 hours from a doctor. Community health workers in rural Africa, rural China, remote Southeast Asia face life-or-death triage decisions every day — with no backup, no connectivity, no specialist to call.

Same app. Same phone. Same Gemma 4. For everyone.

---

## What It Does

A mobile app that lets you describe or photograph a symptom and receive structured triage guidance — **entirely on-device, no internet required**.

- **Multimodal input**: photo, voice, or text
- **Structured output**: triage severity, likely cause, immediate action steps, when to evacuate
- **Local language**: responds in the user's language (Chinese, Swahili, English, etc.)
- **Offline-first**: works in airplane mode, deep in the wilderness or a remote village

---

## Video Narrative (3 min)

**Act 1 — Personal (45s)**
Hiker on a trail. Something goes wrong (swollen ankle, allergic reaction, cut). No signal. Opens Pocket MD. Photographs + describes the symptom by voice. Gemma 4 responds instantly with clear guidance. Relief.

**Act 2 — The World (60s)**
"But I'm one of the lucky ones."
Cut to: rural village. Community health worker with a sick child. No doctor within 100km. Same app. Gemma 4 triages in local language — CHW knows exactly what to do.

**Act 3 — The Tech (45s)**
Airplane mode shown on screen. Live demo: photo + voice input → structured triage output.
"Runs entirely on this phone. No cloud. No internet. No waiting."

**Close (30s)**

Spoken word (voiceover):
> "Because where you're born — or just where you are — shouldn't determine whether you survive."

[Screen fades to black]

Title card:
>         Pocket MD
> "For everyone, everywhere, every time."

---

## Tech Stack


| Layer        | Choice                               | Why                                           |
| ------------ | ------------------------------------ | --------------------------------------------- |
| Device       | Pixel 7 (Android)                    | 8GB RAM, Google Tensor G2, LiteRT-native      |
| Model        | Gemma 4 E2B (int4 quantized, ~3GB)   | Fits on-device, supports Text + Image + Audio |
| Runtime      | Cactus Framework (llama.cpp wrapper) | Cross-platform, React Native bindings         |
| Voice input  | Android SpeechRecognizer (offline)   | No internet needed                            |
| Voice output | Android TTS (offline)                | Multi-language incl. Chinese                  |
| UI           | React Native                         | Fast dev, cross-platform if needed later      |


---

## Triage Output Format

```
Severity:     [Low / Medium / High / Emergency]
Likely cause: ...
Immediate action:
  1. ...
  2. ...
Evacuate if:  ...
Language:     [auto-detected from input]
```

---

## Hackathon Scoring


| Criterion            | Weight | Our Advantage                           |
| -------------------- | ------ | --------------------------------------- |
| Impact & Vision      | 40 pts | Dual narrative: personal + global scale |
| Video & Storytelling | 30 pts | Authentic hiker story → rural CHW pivot |
| Technical Depth      | 30 pts | Multimodal + offline + LiteRT/Cactus    |


---

## Project Status

- Narrative & storyboard finalized
- Tech stack validated (model fits on Pixel 7)
- Triage prompt design
- Android app scaffold
- On-device Gemma 4 E2B integration
- Multimodal input (image + voice)
- Chinese language output (text + TTS)
- Demo video filmed
- Kaggle writeup (max 1,500 words)
- Submission

