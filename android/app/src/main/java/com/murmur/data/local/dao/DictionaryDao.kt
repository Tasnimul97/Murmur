package com.murmur.app.data.local.dao

import androidx.room.*
import com.murmur.app.data.local.entities.DictionaryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DictionaryDao {
    @Query("SELECT * FROM dictionary ORDER BY term ASC")
    fun getAllTerms(): Flow<List<DictionaryEntity>>

    @Query("SELECT term FROM dictionary")
    suspend fun getAllTermStrings(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTerm(item: DictionaryEntity)

    @Delete
    suspend fun deleteTerm(item: DictionaryEntity)
}
