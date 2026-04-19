# Pocket MA

**A medical assistant in every pocket. For everyone, everywhere, every time.**

On-device AI medical assistant powered by Gemma 4 — instant guidance for anyone, anywhere, even without internet.

Submission for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) · Health & Sciences track

---

## What It Does

Describe or photograph a symptom and receive structured triage guidance — **entirely on-device, no internet required**.

- **Multimodal input** — photo, voice, or text
- **Conversational** — asks 1–2 follow-up questions, then delivers a structured assessment
- **Local language** — auto-detects and responds in the user's language (English, Chinese, Swahili, etc.)
- **Offline-first** — works in airplane mode, deep in the wilderness or a remote village

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
| UI | React Native |
| ML runtime | llama.rn (llama.cpp bindings) |
| Model | Gemma 4 E2B, int4 quantized (~3GB) |
| Voice input | Android SpeechRecognizer (offline) |
| Voice output | Android TTS (offline, multi-language) |
| Target device | Pixel 7 / Android (8GB RAM, Google Tensor G2) |

---

## Links

| | |
|---|---|
| Demo video | _coming soon_ |
| Kaggle writeup | _coming soon_ |
| Live demo | _coming soon_ |

---

## Docs

- [Project Plan](docs/PLAN.md) — video narrative, prize targets, build checklist
