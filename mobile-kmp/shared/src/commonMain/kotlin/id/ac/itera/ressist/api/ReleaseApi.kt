package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.GithubReleaseDto
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header

/**
 * Update-checker publik ala Mihon ReleaseServiceImpl: langsung ke GitHub API
 * repo RESSIST-MOBILE (public), tanpa token dan tanpa sesi login.
 * Pakai bare [HttpClient] seperti [AuthApi] — jangan [AuthedHttpClient].
 */
class ReleaseApi(
    private val client: HttpClient,
) {
    companion object {
        const val RELEASES_REPO = "Jeremi16/RESSIST-MOBILE"
        const val LATEST_URL = "https://api.github.com/repos/$RELEASES_REPO/releases/latest"
    }

    suspend fun latest(): GithubReleaseDto = client.get(LATEST_URL) {
        header("Accept", "application/vnd.github+json")
        header("X-Request-ID", randomUuid())
    }.bodyOrThrow()
}
