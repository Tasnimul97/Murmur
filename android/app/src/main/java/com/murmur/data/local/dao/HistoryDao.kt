package com.murmur.app.data.local.dao

import androidx.room.*
import com.murmur.app.data.local.entities.HistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HistoryDao {
    @Query("SELECT * FROM history ORDER BY timestamp DESC LIMIT 100")
    fun getRecentHistory(): Flow<List<HistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: HistoryEntity): Long

    @Query("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT 100)")
    suspend fun pruneOldEntries()

    @Transaction
    suspend fun insertAndPrune(entry: HistoryEntity) {
        insert(entry)
        pruneOldEntries()
    }

    @Query("DELETE FROM history")
    suspend fun clearAll()

    @Delete
    suspend fun delete(entry: HistoryEntity)
}
