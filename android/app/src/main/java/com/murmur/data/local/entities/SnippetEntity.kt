package com.murmur.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "snippets")
data class SnippetEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val cue: String, // e.g. "my email"
    val expansion: String, // e.g. "alex@murmur.app"
    val timestamp: Long = System.currentTimeMillis()
)
