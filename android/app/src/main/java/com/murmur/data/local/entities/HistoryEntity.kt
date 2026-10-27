package com.murmur.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val rawText: String,
    val cleanedText: String,
    val tone: String,
    val hostPackage: String,
    val durationSeconds: Int
)
