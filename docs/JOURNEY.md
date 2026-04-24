# Pocket MA — Project Journey

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

---

## 2026-04-22 — Conversational Chat UI & Multi-turn Triage Flow

### From single-shot to multi-turn conversation

The original UI was a single text input → single triage output. Replaced it with a full chat interface: scrollable message list, user/AI bubbles, and a conversation history that persists across turns within a session.

The model now follows a structured flow:
1. User describes symptom (text, voice, or photo)
2. Model asks up to 2 follow-up questions
3. Model delivers structured triage assessment

An "Assess Now" button lets the user skip remaining questions and force triage immediately — useful when the situation is urgent or the user is on voice.

### Conversation history management

Each turn passes the full prior conversation to the model as a `messages` array. `buildHistory()` maps the internal `ChatMessage[]` state into `ConversationMessage[]` format for the llama.rn API.

Truncated responses (model hit token limit mid-thinking) are detected and the user message is rolled back so history stays clean for the next attempt.

### Thinking token format — updated

Gemma 4 changed its thinking wrapper from `<thinking>...</thinking>` to `<|channel>thought\n...<channel|>`. Updated the stripping logic to use `lastIndexOf('<channel|>')` to find the boundary between reasoning and actual output.

---

## 2026-04-23 — Rename to Pocket MA & UI Polish

### Rename: Pocket MD → Pocket MA (Medical Assistant)

"MD" could be mistaken for a medical degree claim. Renamed to "Pocket MA" (Medical Assistant) across all layers:
- `package.json` name, `yarn.lock` workspace
- `MainActivity.kt` component name
- `strings.xml` app display name
- App icons regenerated at all densities (mdpi → xxxhdpi)

### Full UI redesign

Replaced the plain white placeholder UI with a polished design system:

**Design tokens** — a single `C` object holds the full color palette: teal primary (`#0E7C6E`), background, text hierarchy, bubble colors, severity colors. All styles reference `C.*` — no hardcoded hex strings scattered through `StyleSheet`.

**Brand icon** — a custom `BrandIcon` component renders a bold "P" with an orange "+" tucked at the lower-right, composited from `Text` elements (no SVG dependency needed on Android).

**Splash / loading screens** — the download and initialization states now show the brand logo, app name, and a `ProgressBar` component (animated fill, percentage readout) instead of a bare `ActivityIndicator`.

**Chat bubbles** — user messages in teal, AI messages in white with a subtle shadow. AI turns include a small avatar dot with the brand icon.

**Triage card** — triage results render in a dedicated `TriageCard` component with a colored left border and severity badge (green / amber / orange / red based on Low / Medium / High / Emergency).

**Thinking indicator** — replaced spinner with an animated `ThinkingDots` component ("Thinking", "Thinking.", "Thinking..", "Thinking...") cycling at 400ms.

**Empty state** — three quick-start chips ("Twisted ankle", "Chest pain", "Rash on skin") let users tap to send a symptom instantly, reducing friction for first-time use.

---

## 2026-04-24 — Inference Performance Measurement & Optimisation

### Adding timing instrumentation

`llama.rn`'s completion result includes a `timings` object with: `prompt_n`, `prompt_ms`, `prompt_per_second`, `predicted_n`, `predicted_ms`, `predicted_per_second`. Added a `[PERF]` log line after every inference:

```
[PERF] wall=38245ms | prefill: 144 tok @ 49.4 t/s (2914ms) | decode: 358 tok @ 10.2 t/s (35020ms)
```

Monitored live via `adb logcat | grep "\[PERF\]"`.

### Baseline: Gemma 4 thinking tokens are very expensive

First measurement on Pixel 6 (Tensor G1):

| Metric | Value |
|---|---|
| Wall time | 38s |
| Tokens generated | 358 |
| Decode speed | 10.2 t/s |

Of the 358 tokens, ~270 were the model's internal thinking block — generated in full, then stripped from the output before display. The user waited 35 seconds for content they never saw.

### Fix 1: Disable thinking entirely

`llama.rn`'s completion API exposes `enable_thinking: boolean`. Setting `enable_thinking: false` tells the model to skip the reasoning phase and go directly to output.

Result: the thinking block disappeared entirely. Token count dropped from 358 to 24 on the same prompt.

### Fix 2: Cap n_predict per turn

Old value: `n_predict: 600` (effectively unlimited for these responses).

Gathering turns need ~15–35 tokens (a short question). Triage format peaks at ~100 tokens. Set a single cap of `n_predict: 150` — tight enough to skip wasted decode, loose enough that triage never truncates.

An earlier attempt at phase-specific caps (`n_predict: 80` for gathering, `200` for triage) failed because the phase heuristic (`history.length >= 4`) was wrong — triage can fire after just one exchange. Reverted to a single 150 cap.

### Results after optimisation

**Pixel 6 (Tensor G1):**

| Turn | Wall time | Decode tok | Decode t/s |
|---|---|---|---|
| Gathering Q1 | 4–5s | 12–31 | ~12 t/s |
| Gathering Q2 | 2–3s | 9–18 | ~12 t/s |
| Triage | 6–8s | 64–86 | ~11 t/s |

**Pixel 7 (Tensor G2):**

| Turn | Wall time | Decode tok | Decode t/s |
|---|---|---|---|
| Gathering Q1 | 4s | 16–17 | ~13 t/s |
| Gathering Q2 | 1.6–2s | 9–12 | ~12 t/s |
| Triage | 7–9s | 69–86 | ~11 t/s |

**Overall speedup: ~7x** (38s → 5–9s per turn). Total conversation (2 questions + triage) completes in 15–20s on both devices.

Key finding: decode speed (~12 t/s) is nearly identical on Pixel 6 and Pixel 7 — both are memory-bandwidth bound during token generation. The Pixel 7's Tensor G2 is faster at prefill (~60 t/s vs ~47 t/s) but that only accounts for 2–3s of total wall time.

### Conversation flow fixes

During testing, two model behaviour issues surfaced:

**Issue 1: Model mixed questions and triage in one response** — produced a question followed immediately by a triage block in the same turn. Fixed in two places: (1) system prompt reworded to "always ask 1-2 questions before triaging, never both in the same reply"; (2) parser now searches for `\nTRIAGE` mid-text and extracts just the triage block if found.

**Issue 2: Model appended questions after the triage block** — triage card showed extra text after "Seek help if:". Fixed by truncating the response at the end of the "Seek help if:" line via regex.

**Issue 3: Model skipped questions entirely** — prompt said "you *may* ask", which the model treated as optional. Changed to "always ask 1-2 follow-up questions before triaging".

**Hard cap in code** — after 2 assistant turns, a system message is injected: "You have asked enough questions. Provide the triage assessment now." Ensures the gathering phase can never run indefinitely regardless of model behaviour.

---

## Open threads (as of 2026-04-24)

- [ ] Test image + voice input end-to-end on device
- [ ] Verify Chinese language output (text + TTS)
- [ ] Cactus SDK watch: check if cactus-react-native ≥ 1.12 is on npm
- [ ] Model routing: fast first-pass classifier → deep reasoning for High/Emergency
- [ ] Demo video
- [ ] Kaggle writeup (max 1,500 words)
- [ ] Submission by May 18, 2026
