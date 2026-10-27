package com.murmur.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.murmur.app.data.local.dao.DictionaryDao
import com.murmur.app.data.local.dao.HistoryDao
import com.murmur.app.data.local.dao.SnippetDao
import com.murmur.app.data.local.entities.DictionaryEntity
import com.murmur.app.data.local.entities.HistoryEntity
import com.murmur.app.data.local.entities.SnippetEntity

@Database(
    entities = [DictionaryEntity::class, SnippetEntity::class, HistoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class MurmurDatabase : RoomDatabase() {
    abstract fun dictionaryDao(): DictionaryDao
    abstract fun snippetDao(): SnippetDao
    abstract fun historyDao(): HistoryDao

    companion object {
        @Volatile
        private var INSTANCE: MurmurDatabase? = null

        fun getInstance(context: Context): MurmurDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MurmurDatabase::class.java,
                    "murmur_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
