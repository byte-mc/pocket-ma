# Pocket MA: Gemma 4 Good Hackathon

**Submission by:** Makeable Club | makeable.club@gmail.com

---

## The Problem: AI That Assumes Connectivity

Most AI health tools share a silent assumption: the user has internet access. That assumption fails in two situations — both happen to be exactly when medical guidance matters most.

**Remote communities:** 1.8 billion people live more than two hours from a clinic. For a village health worker with no data plan, lack of connectivity is not a temporary inconvenience — it is the permanent condition of their lives.

**Off-grid adventurers:** Hikers carry powerful smartphones into places with zero signal. A snake bite, a fall at altitude, an allergic reaction miles from the trailhead — moments where every cloud-dependent AI tool goes silent.

Pocket MA was built to serve them.

---

## The Solution: Gemma 4, Fully On-Device

Pocket MA runs Gemma 4 E2B entirely on an Android phone — no cloud call, no API key, no data plan required. The app downloads the model once on first launch and runs every subsequent inference locally. Once cached, it works in airplane mode indefinitely.

**Why Gemma 4 E2B?** The 2B edge variant (Q4_K_M, ~3.1 GB) fits in 8 GB RAM and reliably produces structured triage output — strict schema, auto language detection, coherent multi-turn dialogue.

**Stack:** React Native (bare CLI) + `llama.rn` (llama.cpp React Native bindings) + Android `SpeechRecognizer` for offline voice input + Android TTS for voice output.

---

## Triage Flow: Structured, Conversational, Reliable

The app follows a three-phase flow designed to mirror how a triage nurse actually thinks:

1. **Symptom intake** — user describes the problem via text, voice recording, or photo
2. **Follow-up** — model asks up to 2 targeted questions to narrow the differential
3. **Assessment** — model delivers a structured triage card

The assessment follows a strict schema that any user can act on immediately:

```
Severity:         Low / Medium / High / Emergency
Likely cause:     <one-line differential>
Immediate action:
  1. <step>
  2. <step>
Seek help if:     <clear condition>
```

A hard cap ensures gathering never exceeds 2 turns — after two assistant replies, a system injection forces triage. The user can also tap "Assess Now" to skip remaining questions immediately.

---

## The Core Innovation: Knowledge-Augmented On-Device Inference

Medical triage is not geographically neutral.

The same symptom cluster — fever, headache, muscle pain — has meaningfully different probable causes in rural Vietnam (dengue, scrub typhus), California (Valley fever, Lyme disease), or sub-Saharan Africa (malaria, typhoid). A generic global model treats all locations identically. That is clinically wrong.

The naive fix is fine-tuning — but that produces a model frozen in time. Disease prevalence changes with outbreaks and seasons. A fine-tuned model goes stale; a data file doesn't.

**The insight:** LLMs are excellent reasoning engines, but poor knowledge stores. Rather than baking regional epidemiology into model weights — expensive, brittle, opaque — we keep the model as a pure reasoning layer and treat domain knowledge as data.

### Architecture: Two-Layer Separation

```
Layer 1 — Reasoning engine (immutable, on-device)
  Gemma 4 E2B Q4_K_M, ~3.1 GB
  Runs fully offline. Never needs to change.

Layer 2 — Knowledge base (lightweight, updatable)
  src/data/regionalKnowledge.ts — 9 regions, ~50 lines of data
  Bundled with the app. Updated via normal app release.
  Future: silent background sync when connectivity is available.
```

At inference time, the selected region injects a context string into the system prompt:

```
Location: Southeast Asia. Regional conditions to weight more heavily when
symptoms are consistent: Dengue fever — mosquito bite, high fever + severe
bone pain + rash; Scrub typhus — mite bite, eschar + fever + swollen lymph
nodes; Melioidosis — soil/water exposure, pneumonia or skin infection...
```

At ~50 tokens, this context adds under one second to prefill. No retraining. No model update. No internet required.

### The Demo: Same Model, Different Knowledge, Different Answer

The demo opens with a hiker — off-grid, no signal — then transitions to a community health worker in a remote village with the same symptoms. Two people. Two worlds. One tool.

_User reports: fever, headache, muscle pain._

| Region             | Model's clinical focus                                                                 |
| ------------------ | -------------------------------------------------------------------------------------- |
| No location        | Generic viral illness differential                                                     |
| Southeast Asia     | Dengue fever → asks about rash, bone pain                                              |
| California         | Valley fever → asks about dust/soil exposure                                           |
| Sub-Saharan Africa | Malaria → asks about mosquito exposure, cyclical chills                                |
| Southeast China    | Dengue (Guangdong/Fujian, Aug–Nov peak) + avian influenza → asks about poultry contact |

Same Gemma 4 model. Same device. Same inference pipeline. Entirely different clinical focus.

### Regions in v1

9 regions implemented, each encoding 5–6 high-yield endemic or environmental conditions:

### Why This Matters for Health Equity

A WHO epidemiologist can update the knowledge file without any ML infrastructure. Community health workers receive updated triage guidance via a normal app update — no retraining, no data science team. The knowledge layer is governed by domain experts, not ML engineers.

---

## Multimodal and Multilingual

**Multimodal input:** The app accepts text, voice, and photo. Images are passed to Gemma 4's vision encoder via a multimodal projector file (`mmproj-F16.gguf`, ~985 MB, lazy-downloaded on first camera use). A wound photo, a rash, or a medication label can be included in the triage context alongside the symptom description.

**Multilingual:** The app auto-detects device locale and serves the full UI in English or Chinese. The model responds in the user's language. Structural triage keywords stay in English for parser compatibility; client-side label replacement renders them in the user's language. Generalizable to any language Gemma 4 supports.

**Voice input (offline):** Standard React Native speech packages were archived in January 2026. We wrote a custom Kotlin native module wrapping Android's `SpeechRecognizer` with `EXTRA_PREFER_OFFLINE: true`. Android TTS handles voice output, fully offline.

---

## Challenges & Solutions

**Gemma 4 thinking tokens:** The first build took 38 seconds per inference. Gemma 4's chain-of-thought generated ~270 tokens of internal reasoning the user never saw — paid for in full latency. Discovery of `enable_thinking: false` in the llama.rn API dropped token count from 358 to 24, delivering most of the 7x speedup without any loss in triage quality.

**No maintained voice library:** `@react-native-voice/voice` was archived in January 2026. Expo-based alternatives were incompatible with bare React Native. We wrote a minimal Kotlin native module (~55 lines) wrapping Android's `SpeechRecognizer` directly — handling offline packs, language fallback, and UI thread constraints.

**Cactus SDK incompatibility:** Initial plan used Cactus Framework. On day one, `cactus-react-native` v1.10.4 couldn't load Gemma 4 E2B (requires SDK v1.12, unreleased at the time). Switched to `llama.rn` — a direct llama.cpp React Native binding — within hours. Inference logic was unchanged; only the initialization call differed.

---

## Performance Engineering

The first working build on Pixel 6 took 38 seconds per inference. With Gemma 4's thinking mode enabled, the model generated ~270 tokens of internal reasoning before producing any output — tokens the user never saw, but paid for in latency.

Two changes cut response time to 5–9 seconds per turn — a ~7x speedup:

1. **`enable_thinking: false`** — skips the reasoning phase entirely. Token count dropped from ~358 to ~24 on the same prompt. Triage quality held because the structured system prompt does the scaffolding work.

2. **`n_predict: 150` cap** — gathering turns need 15–35 tokens; triage peaks at ~100. One tight cap prevents runaway decode without risking truncation.

**Measured on device:**

| Device              | Gathering turn | Triage turn | Decode speed |
| ------------------- | -------------- | ----------- | ------------ |
| Pixel 6 (Tensor G1) | 2–5s           | 6–8s        | ~12 t/s      |
| Pixel 7 (Tensor G2) | 1.6–4s         | 7–9s        | ~11 t/s      |

A full conversation (2 gathering turns + triage) completes in 15–20 seconds — acceptable when the alternative is no guidance at all.

---

## The Broader Argument

The people who most need medical triage guidance are least likely to have connectivity, most likely to face regionally-specific diseases, and most likely to speak a language underserved by mainstream health AI.

Pocket MA runs where the internet doesn't. It knows local disease burden. It speaks your language. And because the knowledge layer is separate from the model, it can be updated by domain experts — not just ML engineers.

That is the architecture health AI should have.

---

_Built for the Gemma 4 Good Hackathon | Stack: React Native + llama.rn (llama.cpp) + Gemma 4 E2B Q4_K_M_

**Tracks:** Main · Impact (Health & Sciences) · Special Technology (llama.cpp — Gemma 4 on resource-constrained hardware)
