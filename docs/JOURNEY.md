# Pocket MD — Project Journey

A chronological record of design decisions, technical challenges, and lessons learned. Written as proof of work for the Gemma 4 Good Hackathon.

---

## 2026-04-03 — Ideation & Architecture

### The idea

Started from a personal observation: most AI health tools assume connectivity. The people who need triage guidance most — hikers in the wilderness, community health workers in remote villages — are often the ones with the least reliable internet access.

The goal: run Gemma 4 entirely on-device. No cloud call, no API key, no data plan required.

### Tech stack decisions

**React Native CLI (not Expo)** — chosen for full control over native Android modules. Gemma 4 integration requires native C++ bindings through llama.cpp; Expo's managed workflow would block this.

**Cactus Framework (initial plan)** — a React Native wrapper for llama.cpp with a clean JS API. Planned as the inference runtime.

**Gemma 4 E2B, int4 quantized** — the 2B parameter edge model fits in ~3.1GB on a Pixel 7 with 8GB RAM. The E2B variant is specifically designed for on-device inference.

**Target device: Pixel 7** — Google Tensor G2, 8GB RAM. Developing on Pixel 6 (Tensor G1, same RAM).

### Docs structure

Set up `README.md` (project identity) and `docs/PLAN.md` (video narrative, prize targets, build checklist) separately from the start. Hackathon URL added to README for reference.

Prize analysis: Pocket MD is eligible for three independent prize pools:
- Health & Sciences Impact Track ($10K)
- Cactus Special Technology Track ($10K) — "best local-first mobile or wearable application that intelligently routes tasks between models"
- Main Track (up to $50K)

---

## 2026-04-03 — Scaffold & First Blocker

### React Native scaffold

```
npx @react-native-community/cli@latest init PocketMD --pm yarn
```

React Native 0.84.1. Source code organized under `PocketMD/src/` immediately to keep the project clean.

### Cactus SDK incompatibility discovered

After installing `cactus-react-native` (v1.10.4), investigated the model registry. Finding: `Cactus-Compute/gemma-4-E2B-it` on HuggingFace was uploaded the same day (2026-04-03) and tagged `v1.12` — but the SDK only accepts weight tags ≤ its own version (1.10.4). Additionally, the model repo only had an `int4.zip`, while the SDK requires both `int4` and `int8`.

**Decision: switch to `llama.rn`**, a direct llama.cpp React Native binding that accepts arbitrary GGUF files. This means losing eligibility for the Cactus $10K prize for now, but gets the app working with actual Gemma 4 today. Noted as a TODO to revisit when cactus-react-native ≥ 1.12 ships.

### Gradle 9 incompatibility

`yarn android` failed immediately: Gradle 9 removed `JvmVendorSpec.IBM_SEMERU`, which React Native's Gradle plugin references. Fixed by pinning to Gradle 8.14 in `gradle-wrapper.properties`.

### Android environment setup

Required: JDK (via Android Studio Panda 3, released 2026-04-02), SDK platform tools, `adb`. Environment variables set in `~/.zshrc`. Device showed as `unauthorized` on first connect — resolved by accepting the USB debugging dialog on the Pixel 6.

### Model: Gemma 4 E2B Q4_K_M

Selected `unsloth/gemma-4-E2B-it-GGUF` Q4_K_M variant (~3.11GB) — smallest good-quality quantization, fits comfortably in Pixel 6/7 RAM. Downloaded at runtime on first launch, cached in the app's document directory.

---

## 2026-04-04 — Triage Prompt & Gemma 4 Thinking Tokens

### Structured output prompt

Designed a system prompt that forces a strict output schema:

```
Severity: [Low / Medium / High / Emergency]
Likely cause: <one line>
Immediate action:
  1. ...
  2. ...
  3. ...
Evacuate if: <condition>
```

Key design: "Respond in the same language the user wrote in." Auto-language detection baked into the prompt — no locale detection code needed.

### Gemma 4 thinking tokens problem

First run showed the model outputting numbered thinking steps ("1. Analyze the request", "2. Determine role"…) before the actual triage output. Two root causes:

1. Gemma 4 has chain-of-thought reasoning enabled by default
2. The streaming callback (`data.token`) included reasoning tokens alongside content tokens

**Fix 1**: Updated system prompt to explicitly suppress thinking: "Do not think out loud. Do not show reasoning steps."

**Fix 2**: Dropped streaming (the `data.content` field turned out to be accumulated text, not deltas — appending it caused repeated output). Switched to non-streaming completion with a spinner.

**Fix 3**: Post-processing — strip `<thinking>...</thinking>` blocks, then use `lastIndexOf('Severity:')` rather than `indexOf()`, because the thinking steps also mention "severity" partway through.

### Performance baseline

- Pixel 6 (Tensor G1, CPU-only): ~24 seconds
- Note: `🚫 Hexagon SDK not found — building CPU-only` in build log — irrelevant, Hexagon is Qualcomm-only; Pixel 6/7 use Google Tensor
- Pixel 7 (Tensor G2) expected to be faster — to be measured

---

## 2026-04-04 — Multimodal Input: Image + Voice

### Image input

llama.rn supports multimodal via a separate mmproj (multimodal projector) file. For Gemma 4 E2B, the projector is `mmproj-F16.gguf` (~985MB, also from unsloth).

Design decision: **lazy download** — the mmproj is only downloaded when the user first taps the camera button. A progress modal blocks until download + init completes. Subsequent uses skip the download.

`initLlama` requires `ctx_shift: false` when multimodal is enabled (to preserve media token positioning).

Images passed to the model as structured message content:
```typescript
{ type: 'image_url', image_url: { url: `file://${imagePath}` } }
```

Used `react-native-image-picker` for camera/gallery access.

### Voice input

`@react-native-voice/voice` — the standard RN speech package — was archived in January 2026. `expo-speech-recognition` is Expo-only. No maintained bare-RN speech package exists.

**Solution: wrote a minimal Kotlin native module** (~55 lines) wrapping Android's `SpeechRecognizer`:
- `EXTRA_PREFER_OFFLINE: true` — forces offline recognition if the language pack is installed
- Returns the top result via a Promise, so the JS side is a simple `await listen()`
- Registered in `MainApplication.kt` via the package list

Lesson: `runOnUiThread` is an Activity method — `SpeechRecognizer` must be created on the UI thread via `UiThreadUtil.runOnUiThread {}` from React Native's bridge utilities.

---

## Open threads (as of 2026-04-18)

- [ ] Test image + voice input end-to-end on device
- [ ] Measure inference latency on Pixel 7 when available
- [ ] Verify Chinese language output (text + TTS)
- [ ] Cactus SDK watch: check if cactus-react-native ≥ 1.12 is on npm
- [ ] Model routing: fast first-pass classifier → deep reasoning for High/Emergency
- [ ] Demo video
- [ ] Kaggle writeup (max 1,500 words)
- [ ] Submission by May 18, 2026
