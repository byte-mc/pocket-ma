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

Prize analysis: the project is eligible for three independent prize pools:
- Main Track (up to $50K)
- Health & Sciences Impact Track ($10K)
- Special Technology Track ($10K) — initially targeting Cactus ("best local-first mobile app"), later switched to llama.cpp ("innovative Gemma 4 on resource-constrained hardware") after the Cactus SDK blocker

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

## 2026-04-24 — Location-Aware Triage: Knowledge-Augmented On-Device Inference

### The insight

Medical triage is not geographically neutral. The same symptom cluster — fever, headache, muscle pain — has meaningfully different probable causes in rural Vietnam (dengue, scrub typhus) versus California (Valley fever, Lyme disease) versus sub-Saharan Africa (malaria, typhoid). A generic global model treats all locations identically.

The naive fix is fine-tuning. But fine-tuning a quantized GGUF model requires full-precision weights, training infrastructure, and re-quantization — and produces a model that is frozen in time. Disease prevalence changes with outbreaks, seasons, and climate. A fine-tuned model goes stale; a data file doesn't.

### The architecture: two-layer separation

```
Layer 1 — Reasoning engine (immutable, on-device)
  Gemma 4 E2B Q4_K_M, ~3.1 GB
  Runs fully offline. Never needs to change.

Layer 2 — Knowledge base (lightweight, updatable)
  src/data/regionalKnowledge.ts — 8 regions, ~50 lines of data
  Bundled with the app. Can be updated via app update without touching the model.
  Future: silent background sync when connectivity is available.
```

The knowledge base injects a location context string into the system prompt at inference time:

```
Location: Southeast Asia. Regional conditions to weight more heavily when symptoms
are consistent: Dengue fever — mosquito bite, high fever + severe bone pain + rash;
Scrub typhus — mite bite, eschar + fever; Melioidosis — soil/water exposure...
```

At ~50 tokens, this adds ~0.8s to prefill on Pixel 6. No retraining. No model update. No internet required.

### Why this framing matters for the hackathon

This architecture makes a principled argument: **LLMs are good reasoning engines, not good knowledge stores.** Rather than trying to bake regional epidemiology into model weights (expensive, brittle, opaque), we keep the model as a reasoning layer and treat domain knowledge as data.

The implication for health equity: a WHO epidemiologist or local health ministry can update the knowledge file without any ML infrastructure. Community health workers in the field receive updated triage guidance via a lightweight app update — no model retraining cycle required.

This positions Pocket MA not just as an offline AI app, but as a **deployable, maintainable health intelligence platform** where the knowledge layer is independently governed by domain experts.

### Demo narrative: "Same model. Different knowledge. Different answer."

*User reports: fever, headache, muscle pain.*

→ Without location: generic differential (viral illness, flu-like)
→ With Southeast Asia: dengue fever highlighted, ask about rash + bone pain
→ With California: Valley fever highlighted, ask about dust/soil exposure
→ With Sub-Saharan Africa: malaria highlighted, ask about mosquito exposure + chills

Same Gemma 4 model. Same device. Same inference pipeline. Entirely different clinical focus.

### Regions implemented (v1 knowledge base)

| Region | Key differentiating conditions |
|---|---|
| California, USA | Valley fever, Lyme disease, rattlesnake, hantavirus, wildfire smoke |
| US Southeast | Rocky Mountain spotted fever, ehrlichiosis, copperhead, fire ant anaphylaxis |
| Southeast Asia | Dengue, scrub typhus, melioidosis, leptospirosis, malaria |
| Sub-Saharan Africa | Malaria, typhoid, cholera, schistosomiasis, meningococcal meningitis |
| South Asia | Dengue, chikungunya, typhoid, kala-azar, Japanese encephalitis |
| Latin America | Dengue, Zika, Chagas disease, yellow fever, leishmaniasis |
| Middle East & North Africa | Heat stroke, MERS-CoV, cutaneous leishmaniasis, brucellosis, scorpion |
| Mountain / Wilderness | AMS, HAPE, hypothermia, frostbite, giardia, lightning strike |

### UI implementation

- **Header pill** — always-visible `🌍 Location` button opens the region picker. Shows selected region emoji + name when set (e.g., `🌴 Southeast Asia`).
- **Empty state banner** — prominent "Set your location / For region-specific triage" card before the first message, with chevron to open picker.
- **Region picker** — bottom sheet modal with all 8 regions, checkmark on selected, "Clear location" option.
- **Zero friction** — location is optional. App works identically without it; knowledge injection only fires when a region is selected.

---

## Open threads (as of 2026-04-24)

- [x] Test location-aware triage on device — verified different outputs for same symptom across regions
- [x] Test image + voice input end-to-end on device
- [x] Verify Chinese language output (text + TTS)
- [ ] Cactus SDK watch: check if cactus-react-native ≥ 1.12 is on npm
- [x] Knowledge base expansion — Southeast China region added
- [ ] Background knowledge sync — future work
- [x] Demo video — filmed and produced
- [x] Kaggle writeup (1,431 words)
- [x] Submission by May 18, 2026

---

## 2026-04-25 — Chinese i18n

### Full bilingual UI

Implemented Chinese internationalization without a third-party i18n library. Architecture:

- `src/i18n/translations.ts` — flat key-value translation objects for `en` and `zh`
- `src/i18n/index.ts` — locale detection via `Intl.DateTimeFormat().resolvedOptions().locale`, exports `t()`, `msgCount()`, `lang`, `voiceLocale`
- All hardcoded strings in `HomeScreen.tsx` replaced with `t()` calls
- `msgCount()` handles Chinese pluralization (no plural forms: "X 条消息")

### Triage output localization — two-layer approach

The model reliably outputs structural English keywords (TRIAGE, Severity, Likely cause, Immediate action, Seek help if) for parser compatibility. Two mechanisms handle Chinese content:

1. **`ZH_TRIAGE_HINT`** — a concrete filled example appended to the system prompt when `lang === 'zh'`. Instructs the model to fill triage *values* in Chinese while keeping structural keywords in English. Abstract instructions ("respond in Chinese") failed; a concrete example worked reliably.

2. **`localizeTriageBody()`** — client-side label replacement. Maps English structural labels to Chinese display labels after the model response is received. Keeps the parser independent of display language.

### Voice locale

`zh-TW` ASR on Pixel 7 returns Pinyin romanization instead of Chinese characters — unusable for triage input. Fixed by hardcoding `voiceLocale = 'en-US'`. Users type in Chinese; voice input falls back to English.

---

## 2026-04-25 — Voice Input Fixes

### Android SpeechRecognizer error codes

Three errors encountered during testing:

- **Error 12 (LANGUAGE_NOT_SUPPORTED)** — zh-CN SODA offline pack not installed on test device
- **Error 13 (LANGUAGE_UNAVAILABLE)** — zh-TW pack listed but unavailable at runtime
- **Error 11 (SERVER_DISCONNECTED)** — caused by immediate retry inside `onError` callback (SpeechRecognizer crashes if restarted synchronously)

### Fix: `startListeningInternal()` with delayed retry

Refactored `SpeechModule.kt` to use `Handler(Looper.getMainLooper()).postDelayed(200ms)` for language fallback retries. The 200ms delay avoids the synchronous restart crash. Language errors (12, 13) retry with `en-US`; other errors reject the promise immediately.

---

## 2026-04-26 — Session Delete + App Icon

### Session delete

Added `deleteSession(id)` to `sessions.ts` using filter-and-rewrite pattern on the JSON sessions file. Added a 🗑 button per session row in the history list with an `Alert.alert` confirmation before deletion.

### App icon replacement

Replaced the default React Native icon and the custom `BrandIcon` text component with a real PNG app icon. Generated all required densities using Python/Pillow from a 1024×1024 transparent PNG master:

- `mipmap-mdpi` through `mipmap-xxxhdpi` — `ic_launcher.png` + `ic_launcher_round.png` (teal background composited in Python)
- `mipmap-anydpi-v26` — adaptive icon XML pointing to `@color/ic_launcher_background` + `@drawable/ic_launcher_foreground`
- `drawable-*/ic_launcher_foreground.png` — transparent PNG on 108dp canvas with 72dp safe-zone artwork

Key lesson: adaptive icon foreground must be a separate drawable — cannot reference `@mipmap/ic_launcher` as its own foreground (circular reference). Old icon persisted after reinstall until `adb uninstall com.pocketmd` cleared the launcher cache.

---

## 2026-05-01 — Southeast China Region + Knowledge Base Localization

### Southeast China region

Added 🏮 Southeast China to the knowledge base with 6 high-yield conditions specific to Guangdong/Fujian:
- Dengue fever (Aug–Nov peak season callout)
- Scrub typhus (field/grassland exposure)
- Hand, foot and mouth disease (young children)
- Clonorchiasis / liver fluke (raw freshwater fish)
- Avian influenza H5N1/H7N9 (live poultry contact)
- Leptospirosis (flood/paddy field exposure)

### Knowledge base localization

Added `labelZh` and `conditionsZh` fields to the `Region` type. All 9 regions now have full Chinese translations. Added `regionLabel(region, lang)` and `regionConditions(region, lang)` helper functions. Region picker and knowledge modal display in the user's language.

---

## 2026-05-12 — Release Builds + Submission Prep

### Release builds

Built signed release APKs for both Pixel 6 and Pixel 7 using `./gradlew assembleRelease`. Release builds bundle the JS inline — app runs without Metro or USB connection. Tested triage flow end-to-end on both devices in airplane mode.

### Rename: Pocket MD → Pocket MA

"MD" implies a medical degree and a licensed doctor. This app plays an assistant role — triaging symptoms and providing guidance at urgent moments when no alternative is available. It is not a doctor and does not intend to act as one. Renamed to "Pocket MA" (Medical Assistant) across all layers: `package.json`, `strings.xml`, `MainActivity.kt`, app icons.

---

## 2026-05-15 — Demo Video Production

### Assets gathered

- 5 hiking clips (Live Photos exported as .mov) — personal hiking footage on California trails across various terrain
- 3 village photos — personal photos from childhood home in rural China and neighboring villages
- 3 screen recordings on Pixel 7 (airplane mode ON throughout):
  - Wilderness/English scenario: ankle swelling + puncture mark, Mountain/Wilderness region
  - Image input: ankle photo uploaded via camera, California region
  - Chinese scenario: same symptom typed in Chinese, Southeast China region selected

### Video structure

~2:50 narrative in 4 acts, under the 3-minute limit:

1. **The Hiker** — personal trail footage, "anything can happen" + ankle swelling setup
2. **The World** — childhood village photos, "1.8 billion people don't have a hospital 30 minutes away"
3. **The Demo** — airplane mode proof, full triage flow, image input, Chinese UI
4. **Close** — village photo fade to black, "For Everyone, Everywhere, Every Time."

Assembled in iMovie. hiking4 played at 25% speed (captured at 150fps) for the slow-motion wildflower shot. Cross Dissolve transitions between village photos; hard cuts within the app demo.

### Key editing decisions

- Village photos personal to the developer (childhood home in remote rural China) — more emotionally authentic than stock footage
- App demo kept at natural speed for model response and triage card reveal; typing sections sped up ~20x (slow natural typing pace)
- Act 1 → Act 2 transition: Fade to Black (chapter break between "the problem" and "the solution")
- Title overlay on hiking1 opening shot (iMovie Fade title, white on trail footage)

---

## 2026-05-17 — Kaggle Submission

### Submission package

- **Writeup** — 1,431 words covering architecture, challenges, performance, and impact. Tracks: Main, Impact (Health & Sciences), Special Technology (llama.cpp).
- **Video** — uploaded to YouTube, public, under 3 minutes.
- **Code repository** — `github.com/byte-mc/pocket-ma`, public.
- **Live demo** — GitHub Release v1.0.0 with signed release APK (129 MB).
- **Media Gallery** — 6 curated screenshots + cover image (`triage-english-itchy.png`) + card thumbnail (560×280, generated with Python/Pillow).

### Writeup challenges section

Three engineering challenges called out explicitly for judges:
1. Gemma 4 thinking tokens: 38s → 5–9s via `enable_thinking: false`
2. No maintained RN voice library: wrote custom Kotlin `SpeechRecognizer` module
3. Cactus SDK incompatibility: switched to `llama.rn` on day one

**Submitted May 17, 2026 — one day before the May 18 deadline.**
