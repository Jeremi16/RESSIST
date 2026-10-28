package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.ReleaseApi
import id.ac.itera.ressist.api.dto.GithubReleaseDto
import kotlinx.serialization.Serializable

/** Hasil cek pembaruan ala Mihon GetApplicationRelease.Result. */
sealed interface UpdateResult {
    data class Available(val release: AppRelease) : UpdateResult
    data object UpToDate : UpdateResult
}

/** Bentuk rilis yang dipakai UI (sudah dinormalisasi dari GitHub API). */
@Serializable
data class AppRelease(
    val versionTag: String,
    val versionCode: Int,
    val changelog: String,
    val releaseLink: String,
    val downloadUrl: String,
    val assetName: String,
    val assetSize: Long,
    /** SHA-256 (hex lowercase) dari SHA256SUMS.txt rilis; null bila tidak tersedia. */
    val sha256: String? = null,
)

const val SHA256SUMS_ASSET = "SHA256SUMS.txt"

private val CodeInName = Regex("""-code(\d+)""", RegexOption.IGNORE_CASE)
private val Sha256Hex = Regex("""^[0-9a-fA-F]{64}$""")

/** Ambil versionCode dari konvensi nama file ressist-X.Y.Z-codeN-release.apk. */
fun versionCodeFromAssetName(name: String): Int? =
    CodeInName.find(name)?.groupValues?.getOrNull(1)?.toIntOrNull()

/**
 * Banding semver "v0.2.3" vs "0.2.2" (fallback kalau codeN tidak ada).
 * Suffix pre-release ("-rc1", "-dev") dibuang, bukan ditempel ke angka.
 */
fun isNewSemVer(currentName: String, latestTag: String): Boolean {
    fun parts(s: String) = s.trim().removePrefix("v").removePrefix("V")
        .substringBefore('-').substringBefore('+')
        .split(".").map { p -> p.takeWhile { it.isDigit() }.toIntOrNull() ?: 0 }
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

/** Cari hash untuk [assetName] di isi SHA256SUMS.txt (format `sha256sum`: "<hex>  [*]<path>"). */
fun sha256FromSums(sums: String, assetName: String): String? =
    sums.lineSequence()
        .map { it.trim().split(Regex("""\s+"""), limit = 2) }
        .filter { it.size == 2 && Sha256Hex.matches(it[0]) }
        .firstOrNull { it[1].removePrefix("*").substringAfterLast('/') == assetName }
        ?.get(0)?.lowercase()

class UpdateRepository(
    private val releaseApi: ReleaseApi,
) {
    suspend fun check(currentCode: Int, currentName: String): UpdateResult {
        val dto = releaseApi.latest()
        val result = decide(dto, currentCode, currentName)
        if (result !is UpdateResult.Available) return result
        val sumsUrl = dto.assets.firstOrNull { it.name == SHA256SUMS_ASSET }?.downloadLink
            ?: return result
        // Gagal ambil checksum tidak memblokir update; installer tetap cek ukuran file.
        val sha = runCatching { sha256FromSums(releaseApi.text(sumsUrl), result.release.assetName) }
            .getOrNull()
        return UpdateResult.Available(result.release.copy(sha256 = sha))
    }

    companion object {
        /** Logika murni agar bisa di-unit-test tanpa network. */
        fun decide(dto: GithubReleaseDto, currentCode: Int, currentName: String): UpdateResult {
            val apks = dto.assets.filter { it.name.endsWith(".apk", ignoreCase = true) }
            // Utamakan APK yang mengikuti konvensi codeN (paling tinggi bila lebih dari satu).
            val asset = apks.maxByOrNull { versionCodeFromAssetName(it.name) ?: -1 }
                ?: return UpdateResult.UpToDate
            val latestCode = versionCodeFromAssetName(asset.name)
            // Tanpa codeN tidak ada versionCode yang bisa dipercaya: jangan tawarkan
            // update otomatis (dulu dikarang currentCode + 1, membuat skip salah sasaran).
            if (latestCode == null || latestCode <= currentCode) return UpdateResult.UpToDate
            return UpdateResult.Available(
                AppRelease(
                    versionTag = dto.version.ifBlank { asset.name },
                    versionCode = latestCode,
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
