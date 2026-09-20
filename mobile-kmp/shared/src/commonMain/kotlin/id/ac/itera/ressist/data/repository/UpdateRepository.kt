package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.ReleaseApi
import id.ac.itera.ressist.api.dto.GithubReleaseDto

/** Hasil cek pembaruan ala Mihon GetApplicationRelease.Result. */
sealed interface UpdateResult {
    data class Available(val release: AppRelease) : UpdateResult
    data object UpToDate : UpdateResult
}

/** Bentuk rilis yang dipakai UI (sudah dinormalisasi dari GitHub API). */
data class AppRelease(
    val versionTag: String,
    val versionCode: Int,
    val changelog: String,
    val releaseLink: String,
    val downloadUrl: String,
    val assetName: String,
    val assetSize: Long,
)

private val CodeInName = Regex("""code(\d+)""", RegexOption.IGNORE_CASE)

/** Ambil versionCode dari konvensi nama file ressist-X.Y.Z-codeN-release.apk. */
fun versionCodeFromAssetName(name: String): Int? =
    CodeInName.find(name)?.groupValues?.getOrNull(1)?.toIntOrNull()

/** Banding semver "v0.2.3" vs "0.2.2" (fallback kalau codeN tidak ada). */
fun isNewSemVer(currentName: String, latestTag: String): Boolean {
    fun parts(s: String) = s.replace("[^\\d.]".toRegex(), "")
        .split(".").map { it.toIntOrNull() ?: 0 }
    val old = parts(currentName)
    val new = parts(latestTag)
    val n = maxOf(old.size, new.size)
    for (i in 0 until n) {
        val o = old.getOrElse(i) { 0 }
        val w = new.getOrElse(i) { 0 }
        if (w > o) return true
        if (w < o) return false
    }
    return false
}

class UpdateRepository(
    private val releaseApi: ReleaseApi,
) {
    suspend fun check(currentCode: Int, currentName: String): UpdateResult {
        val dto = releaseApi.latest()
        return decide(dto, currentCode, currentName)
    }

    companion object {
        /** Logika murni agar bisa di-unit-test tanpa network. */
        fun decide(dto: GithubReleaseDto, currentCode: Int, currentName: String): UpdateResult {
            val asset = dto.assets.firstOrNull { it.name.endsWith(".apk", ignoreCase = true) }
                ?: return UpdateResult.UpToDate
            val latestCode = versionCodeFromAssetName(asset.name)
            val isNew = if (latestCode != null) {
                latestCode > currentCode
            } else {
                isNewSemVer(currentName, dto.version)
            }
            if (!isNew) return UpdateResult.UpToDate
            return UpdateResult.Available(
                AppRelease(
                    versionTag = dto.version.ifBlank { asset.name },
                    versionCode = latestCode ?: currentCode + 1,
                    changelog = dto.info,
                    releaseLink = dto.releaseLink,
                    downloadUrl = asset.downloadLink,
                    assetName = asset.name,
                    assetSize = asset.size,
                ),
            )
        }
    }
}
