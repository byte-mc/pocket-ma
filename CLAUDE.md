# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pocket MA** (Medical Assistant) is an offline-first mobile medical assistant app for the Gemma 4 Good Hackathon (Health & Sciences track). The core premise: run Gemma 4 entirely on-device so it works without any internet connection — serving both individuals in the wilderness and community health workers in remote villages.

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React Native |
| ML runtime | llama.rn (llama.cpp React Native bindings) |
| Model | Gemma 4 E2B, int4 quantized (~3GB) |
| Voice input | Android SpeechRecognizer (offline, custom Kotlin module) |
| Voice output | Android TTS (offline, multi-language incl. Chinese) |
| Target device | Pixel 7 / Android (8GB RAM, Google Tensor G2) |

## Architecture

The app is offline-first and multimodal. The main data flow is:

1. **Input** — user provides a symptom via photo, voice recording, or typed text
2. **Voice processing** — Android SpeechRecognizer transcribes audio offline
3. **Inference** — llama.rn loads the quantized Gemma 4 E2B model and runs inference on-device
4. **Output** — conversational follow-up questions (max 2), then structured assessment

### Assessment output schema

```
Severity:     [Low / Medium / High / Emergency]
Likely cause: ...
Immediate action:
  1. ...
  2. ...
Seek help if: ...
```

The model auto-detects the user's language and responds in it (English, Chinese, Swahili, etc.).

## Status

App is running on Pixel 7. Core conversational flow works. Gemma 4 thinking tokens are stripped from responses via `<|channel>thought...<channel|>` pattern matching.
