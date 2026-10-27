package com.murmur.app.companion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

/**
 * Murmur Companion App Launcher Activity.
 * Milestone 2 features:
 * - Runtime RECORD_AUDIO permission request flow
 * - Handling deep-links from IME when permission is missing
 * - Explanatory rationale and direct navigation to App Details Settings
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val isDeepLinkMic = intent?.getStringExtra("deep_link") == "request_mic"

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var hasMicPermission by remember {
                        mutableStateOf(
                            ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.RECORD_AUDIO
                            ) == PackageManager.PERMISSION_GRANTED
                        )
                    }

                    var showRationaleDialog by remember { mutableStateOf(false) }

                    val permissionLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestPermission()
                    ) { isGranted ->
                        hasMicPermission = isGranted
                        if (!isGranted) {
                            showRationaleDialog = true
                        }
                    }

                    // Auto-request if opened via IME deep-link
                    LaunchedEffect(Unit) {
                        if (isDeepLinkMic && !hasMicPermission) {
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Header
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.Mic,
                                    contentDescription = "Murmur",
                                    tint = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                            Column {
                                Text(
                                    text = "Murmur Voice Dictation",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Companion App • Milestone 2",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        // Microphone Status Card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = if (hasMicPermission)
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                else
                                    MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(
                                        imageVector = if (hasMicPermission) Icons.Rounded.CheckCircle else Icons.Rounded.Warning,
                                        contentDescription = null,
                                        tint = if (hasMicPermission) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                    )
                                    Text(
                                        text = if (hasMicPermission) "Microphone Access Granted" else "Microphone Permission Required",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = if (hasMicPermission)
                                        "The Murmur keyboard is authorized to stream 16kHz PCM audio for instant speech-to-text dictation."
                                    else
                                        "Android requires that the companion app request RECORD_AUDIO on behalf of the custom keyboard. No audio is ever stored on disk.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                if (!hasMicPermission) {
                                    Button(
                                        onClick = {
                                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                        },
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("Grant Microphone Access")
                                    }
                                } else {
                                    OutlinedButton(
                                        onClick = {
                                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                        },
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("Verify Permission")
                                    }
                                }
                            }
                        }

                        // System Settings Quick Navigation
                        OutlinedCard(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "System Permissions & App Settings",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "If permission was permanently declined, you can enable it directly in Android App Settings.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = {
                                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                            data = Uri.fromParts("package", packageName, null)
                                        }
                                        startActivity(intent)
                                    },
                                    colors = ButtonDefaults.outlinedButtonColors()
                                ) {
                                    Text("Open Android App Settings", fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    // Rationale dialog if permission denied
                    if (showRationaleDialog) {
                        AlertDialog(
                            onDismissRequest = { showRationaleDialog = false },
                            icon = { Icon(Icons.Rounded.Mic, contentDescription = null) },
                            title = { Text("Microphone Access Needed") },
                            text = {
                                Text(
                                    "Murmur requires microphone access to record and transcribe your voice when you tap the mic on the keyboard. Audio is processed transiently in memory and never written to disk."
                                )
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        showRationaleDialog = false
                                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                            data = Uri.fromParts("package", packageName, null)
                                        }
                                        startActivity(intent)
                                    }
                                ) {
                                    Text("Open Settings")
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { showRationaleDialog = false }) {
                                    Text("Dismiss")
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}
