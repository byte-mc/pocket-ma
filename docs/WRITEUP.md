# Pocket MA — Kaggle Writeup

**Gemma 4 Good Hackathon | Health & Sciences Track**
**Submission by:** Byte Maker | makeable.club@gmail.com
**Deadline:** May 18, 2026

---

## The Problem: AI That Assumes Connectivity

Most AI health tools share a silent assumption: the user has internet access. That assumption fails in two very different situations — and both happen to be exactly when medical guidance matters most.

**Remote communities:** 1.8 billion people live more than two hours from a clinic. A village health worker in rural Vietnam with no data plan. A family in a mountain community where the nearest hospital is a day's journey away. For them, lack of connectivity is not a temporary inconvenience — it is the permanent condition of their lives.

**Off-grid adventurers:** Hikers, mountaineers, and wilderness travelers carry powerful smartphones into places with zero signal. A snake bite on a trail, a fall at altitude, a sudden allergic reaction miles from the trailhead — these are moments where a triage assistant would be invaluable, and where every cloud-dependent AI tool goes silent.

These are not edge cases. Together they represent hundreds of millions of situations every year where people need medical guidance and have no way to reach it.

Pocket MA was built to serve them.

---

## The Solution: Gemma 4, Fully On-Device

Pocket MA runs Gemma 4 E2B entirely on an Android phone — no cloud call, no API key, no data plan required. The app downloads the model once on first launch and runs every subsequent inference locally. Once cached, it works in airplane mode indefinitely.

**Why Gemma 4 E2B?** The 2B parameter edge variant (Q4\_K\_M quantization, ~3.1 GB) fits comfortably in 8 GB RAM. It is the smallest Gemma model that reliably produces structured triage output — following a strict schema, auto-detecting the user's language, and maintaining coherent multi-turn dialogue.

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

A hard cap in code ensures the gathering phase never runs beyond 2 turns: after two assistant replies, a system injection forces triage. The user can also tap "Assess Now" at any point to skip remaining questions and get the assessment immediately — important when the situation is urgent or the user is on voice input.

---

## The Core Innovation: Knowledge-Augmented On-Device Inference

Medical triage is not geographically neutral.

The same symptom cluster — fever, headache, muscle pain — has meaningfully different probable causes in rural Vietnam (dengue, scrub typhus), California (Valley fever, Lyme disease), or sub-Saharan Africa (malaria, typhoid). A generic global model treats all locations identically. That is clinically wrong.

The naive fix is fine-tuning. But fine-tuning a quantized GGUF model requires full-precision weights, training infrastructure, and re-quantization — and produces a model that is frozen in time. Disease prevalence changes with outbreaks, seasons, and climate shifts. A fine-tuned model goes stale; a data file doesn't.

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

The demo opens with a hiker — outdoors, off-grid, no signal — who encounters a medical situation on the trail. The same app, same model, then transitions to a community health worker in a rural village facing a patient with identical symptoms. Two people. Two worlds. One tool that works for both.

*User reports: fever, headache, muscle pain.*

| Region | Model's clinical focus |
|--------|----------------------|
| No location | Generic viral illness differential |
| Southeast Asia | Dengue fever → asks about rash, bone pain |
| California | Valley fever → asks about dust/soil exposure |
| Sub-Saharan Africa | Malaria → asks about mosquito exposure, cyclical chills |
| Southeast China | Dengue (Guangdong/Fujian, Aug–Nov peak) + avian influenza → asks about poultry contact |

Same Gemma 4 model. Same device. Same inference pipeline. Entirely different clinical focus.

### Regions in v1

9 regions implemented, each encoding 5–6 high-yield endemic or environmental conditions:

### Why This Matters for Health Equity

A WHO epidemiologist or local health ministry can update the knowledge file without any ML infrastructure — no retraining, no data science team. Community health workers receive updated triage guidance via a normal app update. The knowledge layer is governed by domain experts, not ML engineers.

This makes Pocket MA not just an offline AI app, but a deployable, maintainable health intelligence platform.

---

## Multimodal and Multilingual

**Multimodal input:** The app accepts text, voice, and photo. Images are passed to Gemma 4's vision encoder via a multimodal projector file (`mmproj-F16.gguf`, ~985 MB, lazy-downloaded on first camera use). A wound photo, a rash, or a medication label can be included in the triage context alongside the symptom description.

**Multilingual:** The app auto-detects the device locale and serves the full UI in English or Chinese. Triage output is in the user's language — the system prompt instructs the model to respond in the same language the user wrote in. The structural keywords (TRIAGE, Severity, Likely cause, Immediate action, Seek help if) are kept in English for parser compatibility; client-side label replacement (`localizeTriageBody()`) displays them in the user's language. This approach is generalizable to any language the model supports.

**Voice input (offline):** Standard React Native speech packages were archived in January 2026, so we wrote a minimal Kotlin native module (~55 lines) wrapping Android's `SpeechRecognizer` with `EXTRA_PREFER_OFFLINE: true`. When a language pack is unavailable, it retries in English automatically. Android TTS handles voice output, fully offline.

---

## Performance Engineering

The first working build on Pixel 6 took 38 seconds per inference. With Gemma 4's thinking mode enabled, the model generated ~270 tokens of internal reasoning before producing any output — tokens the user never saw, but paid for in latency.

Two changes cut response time to 5–9 seconds per turn — a ~7x speedup:

1. **`enable_thinking: false`** — skips the reasoning phase entirely. Token count dropped from ~358 to ~24 on the same prompt. Triage quality held because the structured system prompt does the scaffolding work.

2. **`n_predict: 150` cap** — gathering turns need 15–35 tokens; triage peaks at ~100. One tight cap prevents runaway decode without risking truncation.

**Measured on device:**

| Device | Gathering turn | Triage turn | Decode speed |
|--------|---------------|-------------|-------------|
| Pixel 6 (Tensor G1) | 2–5s | 6–8s | ~12 t/s |
| Pixel 7 (Tensor G2) | 1.6–4s | 7–9s | ~11 t/s |

Both devices are memory-bandwidth bound during token generation — decode speed is nearly identical. A full conversation (2 gathering turns + triage) completes in 15–20 seconds — acceptable when the alternative is no guidance at all.

---

## The Broader Argument

The people who most need medical triage guidance are least likely to have connectivity, most likely to face regionally-specific diseases, and most likely to speak a language underserved by mainstream health AI.

Pocket MA runs where the internet doesn't. It knows what diseases are endemic where you are. It speaks your language. And because the knowledge layer is separate from the model, it can be updated by the people who know the local disease burden — not just the ones who know how to fine-tune a transformer.

That is the architecture health AI should have.

---

*Built for the Gemma 4 Good Hackathon — Health & Sciences track | Stack: React Native + llama.rn + Gemma 4 E2B Q4_K_M*
