package com.murmur.app.ime.audio

import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Calculates audio amplitudes from 16-bit linear PCM byte buffers for real-time waveform rendering.
 */
object AudioAmplitudeCalculator {

    /**
     * Compute normalized RMS (Root Mean Square) volume level (0.0f to 1.0f).
     * Applies decibel scaling for natural human perceptual responsiveness.
     */
    fun calculateNormalizedRms(pcmBytes: ByteArray, readSize: Int): Float {
        if (readSize <= 0) return 0f

        var sumSquare = 0.0
        val sampleCount = readSize / 2

        for (i in 0 until readSize step 2) {
            // Convert two little-endian bytes to a signed 16-bit short
            val low = pcmBytes[i].toInt() and 0xFF
            val high = pcmBytes[i + 1].toInt()
            val sample = (high shl 8) or low

            sumSquare += sample.toDouble() * sample.toDouble()
        }

        val rms = sqrt(sumSquare / sampleCount)
        if (rms <= 0.0) return 0f

        // Convert to dB scale (reference max is 32767.0)
        val db = 20.0 * log10(rms / 32767.0)
        // Map roughly -60 dB .. 0 dB to 0.0f .. 1.0f
        val normalized = ((db + 60.0) / 60.0).toFloat().coerceIn(0f, 1f)
        return normalized
    }
}
