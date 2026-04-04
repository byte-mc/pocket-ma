# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pocket MD** is an offline-first mobile medical triage app for the Gemma 4 Good Hackathon (Health & Sciences track). The core premise: run Gemma 4 entirely on-device so it works without any internet connection — serving both individuals in the wilderness and community health workers in remote villages.

## Planned Tech Stack

| Layer | Choice |
|---|---|
| UI | React Native |
| ML runtime | Cactus Framework (llama.cpp wrapper with React Native bindings) |
| Model | Gemma 4 E2B, int4 quantized (~3GB) |
| Voice input | Android SpeechRecognizer (offline) |
| Voice output | Android TTS (offline, multi-language incl. Chinese) |
| Target device | Pixel 7 / Android (8GB RAM, Google Tensor G2) |

## Architecture

The app is offline-first and multimodal. The main data flow is:

1. **Input** — user provides a symptom via photo, voice recording, or typed text
2. **Voice processing** — Android SpeechRecognizer transcribes audio offline
3. **Inference** — Cactus Framework loads the quantized Gemma 4 E2B model and runs inference on-device
4. **Output** — structured triage result rendered in UI and optionally spoken via Android TTS

### Triage output schema

```
Severity:     [Low / Medium / High / Emergency]
Likely cause: ...
Immediate action:
  1. ...
  2. ...
Evacuate if:  ...
Language:     [auto-detected from input]
```

The model should auto-detect the user's language and respond in it (English, Chinese, Swahili, etc.).

## Status

This repo is in the ideation/scaffolding phase — no build system or tests exist yet. When setting up the project, use React Native CLI (not Expo) to maintain full control over native Android modules needed for Cactus/llama.cpp integration.
