# Pocket MA

### A medical assistant in every pocket. For everyone, everywhere, every time.

On-device AI medical assistant powered by Gemma 4 — instant guidance for anyone, anywhere, even without internet.

Submission for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) · Main Track · Impact Track (Health & Sciences) · Special Technology Track (llama.cpp)

---

## Demo

[YouTube Demo Video](https://youtu.be/sC3FywXJ8ws)

[Kaggle Writeup](https://www.kaggle.com/competitions/gemma-4-good-hackathon/writeups/pocket-ma)

[Live Demo APK](https://github.com/byte-mc/pocket-ma/releases/tag/v1.0.0) — Android 8.0+, tested on Pixel 6 and Pixel 7. Gemma 4 model (~3.1 GB) downloads on first launch.

---

## What It Does

Describe or photograph a symptom and receive structured triage guidance — **entirely on-device, no internet required**.

- **Multimodal input** — photo, voice, or text
- **Conversational** — asks 1–2 follow-up questions, then delivers a structured assessment
- **Location-aware** — 9 regional disease profiles adjust the clinical focus based on where you are
- **Multilingual** — full UI and triage output in English and Chinese
- **Offline-first** — works in airplane mode, in the wilderness or a remote village

## Assessment Output

```
Severity:     [Low / Medium / High / Emergency]
Likely cause: ...
Immediate action:
  1. ...
  2. ...
Seek help if: ...
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React Native (bare CLI) |
| ML runtime | llama.rn (llama.cpp React Native bindings) |
| Model | Gemma 4 E2B, Q4_K_M quantized (~3.1 GB) |
| Voice input | Custom Kotlin module wrapping Android SpeechRecognizer (offline) |
| Voice output | Android TTS (offline, multi-language) |
| Target devices | Pixel 6 / Pixel 7 (Android, 8 GB RAM) |

---

## Docs

- [Development Journal](docs/JOURNEY.md) — chronological log of design decisions, technical challenges, and lessons learned (proof of work)
- [Project Plan](docs/PLAN.md) — hackathon plan and submission checklist
- [Kaggle Writeup](docs/WRITEUP.md) — full submission writeup
- [Video Script](docs/VIDEO_SCRIPT.md) — demo video voiceover script
- [App README](PocketMD/README.md) — build instructions and architecture details
