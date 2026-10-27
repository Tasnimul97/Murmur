package com.murmur.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "dictionary")
data class DictionaryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val term: String,
    val category: String, // "name", "jargon", "abbreviation"
    val timestamp: Long = System.currentTimeMillis()
)
