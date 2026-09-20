package id.ac.itera.ressist

import id.ac.itera.ressist.api.ReleaseApi
import id.ac.itera.ressist.api.createHttpClient
import id.ac.itera.ressist.api.dto.GithubAssetDto
import id.ac.itera.ressist.api.dto.GithubReleaseDto
import id.ac.itera.ressist.data.repository.UpdateRepository
import id.ac.itera.ressist.data.repository.UpdateResult
import id.ac.itera.ressist.data.repository.isNewSemVer
import id.ac.itera.ressist.data.repository.versionCodeFromAssetName
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class UpdateRepositoryTest {

    private fun releaseDto(
        tag: String = "v0.2.3",
        assetName: String = "ressist-0.2.3-code5-release.apk",
        download: String = "https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/v0.2.3/ressist-0.2.3-code5-release.apk",
    ) = GithubReleaseDto(
        version = tag,
        info = "- Perbaikan X",
        releaseLink = "https://github.com/Jeremi16/RESSIST-MOBILE/releases/tag/$tag",
        assets = listOf(GithubAssetDto(assetName, download, 3_576_000)),
    )

    @Test
    fun codeInName_parsed() {
        assertEquals(5, versionCodeFromAssetName("ressist-0.2.3-code5-release.apk"))
        assertEquals(12, versionCodeFromAssetName("RESSIST-1.0.0-CODE12-release.APK"))
        assertNull(versionCodeFromAssetName("ressist-0.2.3-release.apk"))
    }

    @Test
    fun semVer_newerDetected() {
        assertTrue(isNewSemVer("0.2.2", "v0.2.3"))
        assertTrue(isNewSemVer("0.2.9", "v0.2.10"))
        assertFalse(isNewSemVer("0.2.3", "v0.2.3"))
        assertFalse(isNewSemVer("0.2.4", "v0.2.3"))
    }

    @Test
    fun decide_codeNewer_available() {
        val result = UpdateRepository.decide(releaseDto(), currentCode = 4, currentName = "0.2.2")
        assertTrue(result is UpdateResult.Available)
        assertEquals("v0.2.3", result.release.versionTag)
        assertEquals(5, result.release.versionCode)
    }

    @Test
    fun decide_codeSame_upToDate() {
        val result = UpdateRepository.decide(releaseDto(), currentCode = 5, currentName = "0.2.3")
        assertTrue(result is UpdateResult.UpToDate)
    }

    @Test
    fun decide_noCodeName_fallsBackToSemVer() {
        val dto = releaseDto(tag = "v0.2.3", assetName = "ressist-0.2.3-release.apk")
        assertTrue(UpdateRepository.decide(dto, 4, "0.2.2") is UpdateResult.Available)
        assertTrue(UpdateRepository.decide(dto, 99, "0.2.3") is UpdateResult.UpToDate)
    }

    @Test
    fun decide_noApkAsset_upToDate() {
        val dto = releaseDto().copy(assets = emptyList())
        assertTrue(UpdateRepository.decide(dto, 1, "0.0.1") is UpdateResult.UpToDate)
    }

    @Test
    fun check_parsesGithubApiResponse() = runTest {
        val body = """{"tag_name":"v0.2.3","body":"- X",
          "html_url":"https://github.com/Jeremi16/RESSIST-MOBILE/releases/tag/v0.2.3",
          "assets":[{"name":"ressist-0.2.3-code5-release.apk",
          "browser_download_url":"https://github.com/x/y.apk","size":100}]}"""
        val engine = MockEngine {
            respond(body, HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json"))
        }
        val repo = UpdateRepository(ReleaseApi(createHttpClient(engine)))
        val result = repo.check(currentCode = 4, currentName = "0.2.2")
        assertTrue(result is UpdateResult.Available)
    }
}
