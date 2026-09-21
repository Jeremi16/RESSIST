package id.ac.itera.ressist

import id.ac.itera.ressist.api.AssignmentApi
import id.ac.itera.ressist.api.AuthApi
import id.ac.itera.ressist.api.AuthedHttpClient
import id.ac.itera.ressist.api.ClassroomReadOnlyException
import id.ac.itera.ressist.api.DomainNotAllowedException
import id.ac.itera.ressist.api.IdentityConflictException
import id.ac.itera.ressist.api.RateLimitedException
import id.ac.itera.ressist.api.ServerException
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.TokenRefresher
import id.ac.itera.ressist.api.createHttpClient
import id.ac.itera.ressist.api.dto.AssignmentDto
import id.ac.itera.ressist.api.dto.AuthUserDto
import id.ac.itera.ressist.data.InMemorySessionStorage
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.AuthRepository
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun MockRequestHandleScope.json(body: String, status: HttpStatusCode) =
    respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))

/** Single-response engine for tests that need no routing. */
private fun mockJson(body: String, status: HttpStatusCode = HttpStatusCode.OK) =
    MockEngine { respond(body, status, headersOf(HttpHeaders.ContentType, "application/json")) }

private const val TOKENS = """{"access_token":"access-1","token_type":"Bearer",
  "expires_at":"2026-09-17T15:00:00Z","refresh_token":"refresh-1",
  "user":{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs"}}"""

private const val ASSIGNMENTS = """[{"id":"a-1","title":"Tugas 1",
  "course":"Matematika","deadline":"2026-09-20T23:59:00Z",
  "completed":false,"source":"moodle"}]"""

private fun MockRequestHandleScope.notFound() = json("""{"error":"not found"}""", HttpStatusCode.NotFound)

class AuthFlowTest {

    private fun graph(
        engine: MockEngine,
        storage: InMemorySessionStorage = InMemorySessionStorage(),
    ): Triple<AuthRepository, AuthedHttpClient, InMemorySessionStorage> {
        val client = createHttpClient(engine)
        val authApi = AuthApi(client, "https://test")
        val authed = AuthedHttpClient(client, storage, TokenRefresher(authApi, storage), "https://test")
        return Triple(AuthRepository(authApi, authed, storage), authed, storage)
    }

    @Test
    fun loginNative_storesTokens() = runTest {
        val (repo, _, storage) = graph(mockJson(TOKENS))
        val account = repo.loginNative("code-123")
        assertEquals("mhs@student.itera.ac.id", account.email)
        assertEquals("access-1", storage.accessToken())
        assertEquals("refresh-1", storage.refreshToken())
        assertTrue(storage.hasSession())
    }

    @Test
    fun loginNative_nonIteraEmail_throwsDomainNotAllowed() = runTest {
        val (repo, _, _) = graph(mockJson(
            """{"error":"email_domain_not_allowed"}""",
            HttpStatusCode.Forbidden,
        ))
        assertFailsWith<DomainNotAllowedException> { repo.loginNative("code-x") }
    }

    @Test
    fun loginNative_conflict_throwsIdentityConflict() = runTest {
        val (repo, _, _) = graph(mockJson(
            """{"error":"user_identity_conflict"}""",
            HttpStatusCode.Conflict,
        ))
        assertFailsWith<IdentityConflictException> { repo.loginNative("code-x") }
    }

    @Test
    fun expiredAccess_silentRefreshThenRetry() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "refresh-1", null)
        var assignmentsCalls = 0
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/assignments" -> {
                    assignmentsCalls++
                    if (assignmentsCalls == 1) {
                        json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                    } else {
                        json(ASSIGNMENTS, HttpStatusCode.OK)
                    }
                }
                "/v1/auth/refresh" -> json(
                    TOKENS.replace("access-1", "access-2").replace("refresh-1", "refresh-2"),
                    HttpStatusCode.OK,
                )
                else -> notFound()
            }
        }, storage)
        val list: List<AssignmentDto> = authed.get("/v1/assignments")
        assertEquals(1, list.size)
        assertEquals(2, assignmentsCalls)
        assertEquals("access-2", storage.accessToken())
        assertEquals("refresh-2", storage.refreshToken())
    }

    @Test
    fun refreshFails_wipesSessionAndThrowsExpired() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "bad-refresh", null)
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/auth/me" -> json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                "/v1/auth/refresh" -> json("""{"error":"invalid refresh token"}""", HttpStatusCode.Unauthorized)
                else -> notFound()
            }
        }, storage)
        assertFailsWith<SessionExpiredException> {
            authed.get<AuthUserDto>("/v1/auth/me")
        }
        assertNull(storage.accessToken())
        assertNull(storage.refreshToken())
    }

    @Test
    fun logout_clearsStorage() = runTest {
        val (repo, _, storage) = graph(MockEngine {
            respond("", HttpStatusCode.NoContent, headersOf())
        })
        storage.save("a", "r", null)
        repo.logout()
        assertNull(storage.refreshToken())
    }

    @Test
    fun concurrent401_singleRefreshCall() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "refresh-1", null)
        var refreshCalls = 0
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/assignments" -> {
                    if (request.headers[HttpHeaders.Authorization] == "Bearer stale-access") {
                        json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                    } else {
                        json(ASSIGNMENTS, HttpStatusCode.OK)
                    }
                }
                "/v1/auth/refresh" -> {
                    refreshCalls++
                    json(
                        TOKENS.replace("access-1", "access-2").replace("refresh-1", "refresh-2"),
                        HttpStatusCode.OK,
                    )
                }
                else -> notFound()
            }
        }, storage)
        // Dua request paralel dengan access basi: hanya 1 refresh ke backend,
        // keduanya sukses (tanpa singleflight, yang kalah race bisa logout).
        val first = async { authed.get<List<AssignmentDto>>("/v1/assignments") }
        val second = async { authed.get<List<AssignmentDto>>("/v1/assignments") }
        assertEquals(1, first.await().size)
        assertEquals(1, second.await().size)
        assertEquals(1, refreshCalls)
        assertEquals("access-2", storage.accessToken())
        assertEquals("refresh-2", storage.refreshToken())
    }

    @Test
    fun refreshRateLimited_preservesSession() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "refresh-1", null)
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/auth/me" -> json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                "/v1/auth/refresh" -> json("""{"error":"too many requests"}""", HttpStatusCode.TooManyRequests)
                else -> notFound()
            }
        }, storage)
        // 429 = transient: error aslinya dilempar, sesi TIDAK dihapus.
        assertFailsWith<RateLimitedException> {
            authed.get<AuthUserDto>("/v1/auth/me")
        }
        assertEquals("stale-access", storage.accessToken())
        assertEquals("refresh-1", storage.refreshToken())
    }

    @Test
    fun refreshServerError_preservesSession() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "refresh-1", null)
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/auth/me" -> json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                "/v1/auth/refresh" -> json("""{"error":"internal"}""", HttpStatusCode.InternalServerError)
                else -> notFound()
            }
        }, storage)
        assertFailsWith<ServerException> {
            authed.get<AuthUserDto>("/v1/auth/me")
        }
        assertEquals("stale-access", storage.accessToken())
        assertEquals("refresh-1", storage.refreshToken())
    }

    @Test
    fun refreshWithoutNewToken_keepsOldRefresh() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("stale-access", "refresh-1", null)
        var meCalls = 0
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/auth/me" -> {
                    meCalls++
                    if (meCalls == 1) {
                        json("""{"error":"invalid access token"}""", HttpStatusCode.Unauthorized)
                    } else {
                        json("""{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs"}""", HttpStatusCode.OK)
                    }
                }
                // Grace-hit backend: 200 tanpa refresh_token baru.
                "/v1/auth/refresh" -> json("""{"access_token":"access-2","token_type":"Bearer"}""", HttpStatusCode.OK)
                else -> notFound()
            }
        }, storage)
        val me: AuthUserDto = authed.get("/v1/auth/me")
        assertEquals("u-1", me.id)
        assertEquals("access-2", storage.accessToken())
        assertEquals("refresh-1", storage.refreshToken())
    }

    @Test
    fun expiredAccess_proactiveRefreshWithout401() = runTest {
        val storage = InMemorySessionStorage()
        storage.save("old-access", "refresh-1", "2020-01-01T00:00:00Z")
        var assignmentsCalls = 0
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/assignments" -> {
                    assignmentsCalls++
                    json(ASSIGNMENTS, HttpStatusCode.OK)
                }
                "/v1/auth/refresh" -> json(
                    TOKENS.replace("access-1", "access-2").replace("refresh-1", "refresh-2"),
                    HttpStatusCode.OK,
                )
                else -> notFound()
            }
        }, storage)
        // Tanpa proaktif refresh, assignments akan dipanggil 2x (401 + retry).
        val list: List<AssignmentDto> = authed.get("/v1/assignments")
        assertEquals(1, list.size)
        assertEquals(1, assignmentsCalls)
        assertEquals("access-2", storage.accessToken())
    }

    @Test
    fun freshAccess_noRefreshCall() = runTest {
        val future = Instant.fromEpochSeconds(Clock.System.now().epochSeconds + 3600).toString()
        val storage = InMemorySessionStorage()
        storage.save("access-1", "refresh-1", future)
        var refreshCalls = 0
        val (_, authed, _) = graph(MockEngine { request ->
            when (request.url.encodedPath) {
                "/v1/assignments" -> json(ASSIGNMENTS, HttpStatusCode.OK)
                "/v1/auth/refresh" -> {
                    refreshCalls++
                    json(TOKENS, HttpStatusCode.OK)
                }
                else -> notFound()
            }
        }, storage)
        val list: List<AssignmentDto> = authed.get("/v1/assignments")
        assertEquals(1, list.size)
        assertEquals(0, refreshCalls)
    }
}

class AssignmentRepositoryTest {

    private fun repo(engine: MockEngine) =
        AssignmentRepository(AssignmentApi(authedFor(engine)))

    private fun authedFor(engine: MockEngine): AuthedHttpClient {
        val client = createHttpClient(engine)
        val storage = InMemorySessionStorage()
        val authApi = AuthApi(client, "https://test")
        return AuthedHttpClient(client, storage, TokenRefresher(authApi, storage), "https://test")
    }

    @Test
    fun buckets_splitOverdueUpcomingDone() = runTest {
        val r = repo(MockEngine {
            json(
                """[
                  {"id":"o","title":"Lewat","deadline":"2026-09-01T00:00:00Z","completed":false,"source":"moodle"},
                  {"id":"u","title":"Nanti","deadline":"2026-10-01T00:00:00Z","completed":false,"source":"moodle"},
                  {"id":"d","title":"Selesai","deadline":"2026-08-01T00:00:00Z","completed":true,"source":"moodle"}
                ]""",
                HttpStatusCode.OK,
            )
        })
        val buckets = r.buckets(now = kotlinx.datetime.Instant.parse("2026-09-17T00:00:00Z"))
        assertEquals(listOf("o"), buckets.overdue.map { it.id })
        assertEquals(listOf("u"), buckets.upcoming.map { it.id })
        assertEquals(listOf("d"), buckets.done.map { it.id })
        assertEquals(3, buckets.total)
    }

    @Test
    fun complete_classroomTask_blockedWithoutNetwork() = runTest {
        var networkHit = false
        val r = repo(MockEngine {
            networkHit = true
            notFound()
        })
        val task = id.ac.itera.ressist.domain.model.Assignment(
            id = "g-1", title = "Classroom", course = null, classCode = null,
            deadline = kotlinx.datetime.Instant.parse("2026-10-01T00:00:00Z"),
            completed = false, completedAt = null,
            source = "google_classroom", description = null, url = null,
        )
        assertTrue(task.isReadOnly)
        assertFailsWith<ClassroomReadOnlyException> { r.complete(task) }
        assertEquals(false, networkHit)
    }

    @Test
    fun complete_moodleTask_returnsCompletedAt() = runTest {
        val r = repo(MockEngine { request ->
            if (request.url.encodedPath == "/v1/assignments/complete") {
                json("""{"success":true,"completed_at":"2026-09-17T10:00:00Z"}""", HttpStatusCode.OK)
            } else {
                notFound()
            }
        })
        val task = id.ac.itera.ressist.domain.model.Assignment(
            id = "a-1", title = "Tugas", course = null, classCode = null,
            deadline = kotlinx.datetime.Instant.parse("2026-10-01T00:00:00Z"),
            completed = false, completedAt = null,
            source = "moodle", description = null, url = null,
        )
        val at = r.complete(task)
        assertEquals(kotlinx.datetime.Instant.parse("2026-09-17T10:00:00Z"), at)
    }
}
