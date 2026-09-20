package id.ac.itera.ressist.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Mirror GitHub Releases API (tiru Mihon GithubRelease.kt):
 * GET https://api.github.com/repos/<owner>/RESSIST-MOBILE/releases/latest
 * Hanya field yang dipakai update-checker; sisanya diabaikan via
 * ignoreUnknownKeys di [id.ac.itera.ressist.api.RessistJson].
 */
@Serializable
data class GithubReleaseDto(
    @SerialName("tag_name")
    val version: String = "",
    @SerialName("body")
    val info: String = "",
    @SerialName("html_url")
    val releaseLink: String = "",
    @SerialName("assets")
    val assets: List<GithubAssetDto> = emptyList(),
)

@Serializable
data class GithubAssetDto(
    val name: String = "",
    @SerialName("browser_download_url")
    val downloadLink: String = "",
    val size: Long = 0,
)
