package com.pocketmd

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class SpeechModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName() = "SpeechModule"

    private var recognizer: SpeechRecognizer? = null

    private fun destroyRecognizer() {
        recognizer?.stopListening()
        recognizer?.destroy()
        recognizer = null
    }

    @ReactMethod
    fun startListening(locale: String, promise: Promise) {
        UiThreadUtil.runOnUiThread { startListeningInternal(locale, promise, retried = false) }
    }

    private fun startListeningInternal(locale: String, promise: Promise, retried: Boolean) {
        destroyRecognizer()
        recognizer = SpeechRecognizer.createSpeechRecognizer(ctx).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onResults(results: Bundle) {
                    val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    destroyRecognizer()
                    promise.resolve(matches?.firstOrNull() ?: "")
                }
                override fun onError(error: Int) {
                    destroyRecognizer()
                    // Language pack missing — defer retry so old recognizer fully unwinds
                    val langError = error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                                    error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE
                    if (langError && !retried) {
                        Handler(Looper.getMainLooper()).postDelayed({
                            startListeningInternal("en-US", promise, retried = true)
                        }, 200)
                    } else {
                        promise.reject("STT_ERROR", "Recognition error: $error")
                    }
                }
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onPartialResults(partialResults: Bundle?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
                putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            })
        }
    }

    @ReactMethod
    fun stopListening() {
        UiThreadUtil.runOnUiThread { destroyRecognizer() }
    }

    // Required for RN event emitter compatibility
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
