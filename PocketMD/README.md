# Pocket MA

### A medical assistant in every pocket. For everyone, everywhere, every time.

On-device AI medical assistant powered by Gemma 4 — instant guidance for anyone, anywhere, even without internet.

Submission for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) · Main Track · Impact Track (Health & Sciences) · Special Technology Track (llama.cpp)

---

## Demo

[YouTube Demo Video](https://youtube.com) <!-- replace with actual URL -->

---

## Features

- **Fully offline** — Gemma 4 E2B Q4_K_M (~3.1 GB) runs entirely on-device after first download. Works in airplane mode indefinitely.
- **Knowledge-Augmented On-Device Inference** — 9 regional disease profiles injected into the system prompt at runtime. Same model, different knowledge, different clinical focus.
- **Conversational triage** — up to 2 follow-up questions before a structured assessment (Severity / Likely cause / Immediate action / Seek help if).
- **Multimodal input** — text, voice, and photo.
- **Bilingual** — full UI and triage output in English and Chinese. Generalizable to any language Gemma 4 supports.
- **Session history** — conversations persist across app restarts with delete support.

---

## Architecture

```
Layer 1 — Reasoning engine (immutable, on-device)
  Gemma 4 E2B Q4_K_M, ~3.1 GB
  Runs fully offline. Never needs to change.

Layer 2 — Knowledge base (lightweight, updatable)
  src/data/regionalKnowledge.ts — 9 regions
  Updated via normal app release. No model retraining required.
```

Regional knowledge is injected into the system prompt at inference time (~50 tokens, <1s prefill overhead). A WHO epidemiologist can update disease profiles without any ML infrastructure.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React Native (bare CLI) |
| ML runtime | llama.rn (llama.cpp React Native bindings) |
| Model | Gemma 4 E2B, Q4_K_M quantized (~3.1 GB) |
| Voice input | Custom Kotlin native module wrapping Android SpeechRecognizer (offline) |
| Voice output | Android TTS (offline, multi-language) |
| Target devices | Pixel 6 / Pixel 7 (Android, 8 GB RAM) |

---

## Performance

| Device | Gathering turn | Triage turn | Decode speed |
|---|---|---|---|
| Pixel 6 (Tensor G1) | 2–5s | 6–8s | ~12 t/s |
| Pixel 7 (Tensor G2) | 1.6–4s | 7–9s | ~11 t/s |

Key optimisation: `enable_thinking: false` + `n_predict: 150` cap → **7x speedup** (38s → 5–9s per turn).

---

## Regional Knowledge Base

9 regions implemented:

| Region | Key conditions |
|---|---|
| California, USA | Valley fever, Lyme disease, rattlesnake, hantavirus, wildfire smoke |
| US Southeast | Rocky Mountain spotted fever, ehrlichiosis, copperhead, fire ant anaphylaxis |
| Southeast Asia | Dengue, scrub typhus, melioidosis, leptospirosis, malaria |
| Sub-Saharan Africa | Malaria, typhoid, cholera, schistosomiasis, meningococcal meningitis |
| South Asia | Dengue, chikungunya, typhoid, kala-azar, Japanese encephalitis |
| Latin America | Dengue, Zika, Chagas disease, yellow fever, leishmaniasis |
| Middle East & North Africa | Heat stroke, MERS-CoV, leishmaniasis, brucellosis, scorpion |
| Southeast China | Dengue (Aug–Nov peak), scrub typhus, HFMD, avian influenza, leptospirosis |
| Mountain / Wilderness | AMS, HAPE, hypothermia, frostbite, giardia, lightning strike |

---

## Build

### Prerequisites

- Android Studio (with JDK 17+)
- Android SDK platform tools
- Yarn
- A physical Android device with 8 GB RAM (Pixel 6 or later recommended)

### Dev build

```sh
yarn install
yarn android
```

### Release build

```sh
cd android
./gradlew assembleRelease
# APK at: app/build/outputs/apk/release/app-release.apk
```

### First launch

On first launch the app downloads Gemma 4 E2B Q4_K_M (~3.1 GB). Requires WiFi. All subsequent inference runs fully offline.

---

## Project Docs

- [`docs/JOURNEY.md`](../docs/JOURNEY.md) — chronological development log (proof of work)
- [`docs/PLAN.md`](../docs/PLAN.md) — hackathon plan and submission checklist
- [`docs/WRITEUP.md`](../docs/WRITEUP.md) — Kaggle submission writeup
- [`docs/VIDEO_SCRIPT.md`](../docs/VIDEO_SCRIPT.md) — demo video voiceover script
