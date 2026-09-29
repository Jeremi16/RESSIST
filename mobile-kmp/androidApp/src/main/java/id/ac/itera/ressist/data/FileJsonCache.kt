package id.ac.itera.ressist.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/** Cache offline di filesDir/offline_cache/<key>.json (bukan cacheDir agar tak dibersihkan OS). */
class FileJsonCache(context: Context) : JsonCache {
    private val dir = File(context.filesDir, "offline_cache")

    private fun file(key: String) = File(dir, key.replace(Regex("[^A-Za-z0-9_-]"), "_") + ".json")

    override suspend fun read(key: String): String? = withContext(Dispatchers.IO) {
        file(key).takeIf { it.exists() }?.readText()
    }

    override suspend fun write(key: String, value: String) = withContext(Dispatchers.IO) {
        dir.mkdirs()
        // Tulis ke tmp lalu rename agar file tak setengah jadi saat proses mati.
        val tmp = File(dir, "${file(key).name}.tmp")
        tmp.writeText(value)
        if (!tmp.renameTo(file(key))) {
            file(key).delete()
            tmp.renameTo(file(key))
        }
        Unit
    }

    override suspend fun clear() = withContext(Dispatchers.IO) {
        dir.deleteRecursively()
        Unit
    }
}
