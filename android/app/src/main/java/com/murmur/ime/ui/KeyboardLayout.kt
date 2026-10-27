package com.murmur.app.ime.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin

enum class ToneMode(val label: String) {
    CASUAL("Casual"),
    PROFESSIONAL("Professional"),
    PLAIN("Plain")
}

data class KeyboardUiState(
    val isRecording: Boolean = false,
    val isTranscribing: Boolean = false,
    val isSecureField: Boolean = false,
    val isMicPermissionGranted: Boolean = true,
    val recordingDurationSeconds: Int = 0,
    val hostPackage: String = "",
    val tone: ToneMode = ToneMode.CASUAL,
    val isCustomTonePinned: Boolean = false,
    val isQwertyMode: Boolean = false,
    val isHoldToTalkMode: Boolean = false,
    val interimTranscript: String = "",
    val hasNetworkError: Boolean = false,
    val errorMessage: String? = null,
    val amplitudeLevel: Float = 0f
)

/**
 * Jetpack Compose Keyboard Layout for Murmur InputMethodService (Milestone 3).
 * Features:
 * - Real-time STT streaming with interim transcript preview
 * - AudioRecord amplitude-driven dynamic waveform Canvas
 * - Offline/network failure handling with "Retry" button
 * - Mic permission denied banner with deep-link to Companion App
 * - Tap-to-start/stop and Hold-to-talk gesture support
 * - Visual timer, QWERTY fallback, tone toggle, space, del, enter, switch IME
 */
@Composable
fun KeyboardScreen(
    state: KeyboardUiState,
    onToggleMic: () -> Unit,
    onStartHoldMic: () -> Unit,
    onStopHoldMic: () -> Unit,
    onOpenPermissionGrant: () -> Unit,
    onRetryStt: () -> Unit,
    onSwitchKeyboard: () -> Unit,
    onDelete: () -> Unit,
    onSpace: () -> Unit,
    onEnter: () -> Unit,
    onToneChange: (ToneMode) -> Unit,
    onToggleQwerty: () -> Unit,
    onKeyPress: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(264.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest,
        tonalElevation = 6.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Toolbar: Tone Toggle, Status/Timer, QWERTY switch
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tone Selector Pills
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(2.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    ToneMode.entries.forEach { toneOption ->
                        val isSelected = state.tone == toneOption
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primary
                                    else Color.Transparent
                                )
                                .clickable { onToneChange(toneOption) }
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = toneOption.label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Status Indicator: Recording timer, Transcribing spinner, or Package hint
                if (state.isRecording) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.error)
                        )
                        val mins = state.recordingDurationSeconds / 60
                        val secs = state.recordingDurationSeconds % 60
                        Text(
                            text = String.format("%02d:%02d", mins, secs),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                } else if (state.isTranscribing) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(10.dp),
                            strokeWidth = 1.5.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Transcribing...",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                } else {
                    Text(
                        text = state.hostPackage.removePrefix("com."),
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        maxLines = 1
                    )
                }

                // Fallback QWERTY toggle button
                IconButton(
                    onClick = onToggleQwerty,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (state.isQwertyMode) Icons.Rounded.Mic else Icons.Rounded.Keyboard,
                        contentDescription = "Toggle QWERTY Fallback",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Middle section: Network Error OR Permission Warning OR Secure Field OR QWERTY OR Voice Hub
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                if (state.hasNetworkError) {
                    // Offline / Failed Network State with Retry
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.CloudOff,
                            contentDescription = "Network error",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(26.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Speech transcription failed (offline)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Audio buffer preserved in memory",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Button(
                            onClick = onRetryStt,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Retry", fontSize = 11.sp)
                        }
                    }
                } else if (!state.isMicPermissionGranted) {
                    // Permission Denied Card with Deep-Link Action
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.MicOff,
                            contentDescription = "Mic permission needed",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Microphone access is required",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Grant permission via Murmur companion app",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Button(
                            onClick = onOpenPermissionGrant,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("Open Murmur App", fontSize = 11.sp)
                        }
                    }
                } else if (state.isSecureField) {
                    // Secure Password Field Banner
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Lock,
                            contentDescription = "Password field",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Voice dictation disabled on secure fields",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Medium
                        )
                    }
                } else if (state.isQwertyMode) {
                    // Minimal QWERTY Fallback Matrix
                    MinimalQwertyLayout(onKeyPress = onKeyPress)
                } else {
                    // Voice Dictation Center with Live Waveform & Interim Transcript Preview
                    VoiceRecordingCenter(
                        isRecording = state.isRecording,
                        isTranscribing = state.isTranscribing,
                        interimTranscript = state.interimTranscript,
                        isHoldToTalk = state.isHoldToTalkMode,
                        amplitude = state.amplitudeLevel,
                        onToggleMic = onToggleMic,
                        onStartHoldMic = onStartHoldMic,
                        onStopHoldMic = onStopHoldMic
                    )
                }
            }

            // Bottom Command Row: Switch IME, Space, Delete, Enter
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Switch Keyboard (IME) Key
                FilledTonalIconButton(
                    onClick = onSwitchKeyboard,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Language,
                        contentDescription = "Switch Keyboard"
                    )
                }

                // Space Key
                FilledTonalButton(
                    onClick = onSpace,
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Space", fontSize = 13.sp)
                }

                // Delete Key
                FilledTonalIconButton(
                    onClick = onDelete,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Backspace,
                        contentDescription = "Delete"
                    )
                }

                // Enter Key
                Button(
                    onClick = onEnter,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.KeyboardReturn,
                        contentDescription = "Enter"
                    )
                }
            }
        }
    }
}

/**
 * Animated Live Waveform Canvas responding to live AudioRecord amplitude.
 */
@Composable
fun LiveWaveform(
    amplitude: Float,
    isRecording: Boolean,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "waveAnim")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 6.28f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )

    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)

    Canvas(modifier = modifier) {
        val barCount = 28
        val barWidth = 3.dp.toPx()
        val spacing = (size.width - (barCount * barWidth)) / (barCount - 1)
        val centerY = size.height / 2f
        val maxBarHeight = size.height * 0.9f

        for (i in 0 until barCount) {
            val x = i * (barWidth + spacing)
            val waveModifier = if (isRecording) {
                0.3f + 0.7f * (0.5f + 0.5f * sin(phase + i * 0.35f).toFloat())
            } else {
                0.1f
            }
            val barHeight = if (isRecording) {
                (maxOf(0.12f, amplitude) * maxBarHeight * waveModifier).coerceIn(4.dp.toPx(), maxBarHeight)
            } else {
                4.dp.toPx()
            }

            drawRoundRect(
                color = if (i % 2 == 0) primaryColor else secondaryColor,
                topLeft = Offset(x, centerY - barHeight / 2),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(2.dp.toPx(), 2.dp.toPx())
            )
        }
    }
}

@Composable
private fun VoiceRecordingCenter(
    isRecording: Boolean,
    isTranscribing: Boolean,
    interimTranscript: String,
    isHoldToTalk: Boolean,
    amplitude: Float,
    onToggleMic: () -> Unit,
    onStartHoldMic: () -> Unit,
    onStopHoldMic: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isRecording) 1.25f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Waveform or Interim Streaming Transcript Area
        Box(
            modifier = Modifier
                .height(30.dp)
                .fillMaxWidth(0.85f)
                .padding(bottom = 2.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isRecording) {
                if (interimTranscript.isNotEmpty()) {
                    Text(
                        text = "\"$interimTranscript\"",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                } else {
                    LiveWaveform(
                        amplitude = amplitude,
                        isRecording = true,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            } else if (isTranscribing) {
                Text(
                    text = "Streaming to Deepgram...",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Box(contentAlignment = Alignment.Center) {
            if (isRecording) {
                Box(
                    modifier = Modifier
                        .size(76.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.22f))
                )
            }

            // Mic Button
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .clip(CircleShape)
                    .background(
                        if (isRecording) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.primary
                    )
                    .then(
                        if (isHoldToTalk) {
                            Modifier.pointerInput(Unit) {
                                detectTapGestures(
                                    onPress = {
                                        onStartHoldMic()
                                        tryAwaitRelease()
                                        onStopHoldMic()
                                    }
                                )
                            }
                        } else {
                            Modifier.clickable { onToggleMic() }
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Rounded.Stop else Icons.Rounded.Mic,
                    contentDescription = if (isRecording) "Stop Recording" else "Start Dictation",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(30.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = when {
                isRecording && isHoldToTalk -> "Listening... Release to insert"
                isRecording -> "Listening... Tap to insert raw transcript"
                isHoldToTalk -> "Hold mic to talk"
                else -> "Tap mic to stream speech"
            },
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MinimalQwertyLayout(onKeyPress: (String) -> Unit) {
    val rows = listOf(
        listOf("q","w","e","r","t","y","u","i","o","p"),
        listOf("a","s","d","f","g","h","j","k","l"),
        listOf("z","x","c","v","b","n","m",".",",")
    )

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        rows.forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                row.forEach { char ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .clickable { onKeyPress(char) }
                            .padding(horizontal = 9.dp, vertical = 7.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = char,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
