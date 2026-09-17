package id.ac.itera.ressist

import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.CalendarSort
import id.ac.itera.ressist.api.CourseApi
import id.ac.itera.ressist.api.UserApi
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.api.createHttpClient
import id.ac.itera.ressist.data.repository.CalendarRepository
import id.ac.itera.ressist.data.repository.CourseRepository
import id.ac.itera.ressist.data.repository.UserRepository
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun MockRequestHandleScope.json(body: String, status: HttpStatusCode) =
    respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))

/** Single-response engine for tests that need no routing. */
private fun mockJson(body: String, status: HttpStatusCode = HttpStatusCode.OK) =
    MockEngine { respond(body, status, headersOf(HttpHeaders.ContentType, "application/json")) }

private const val USER = """{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs",
  "moodle_enabled":true,"google_classroom_enabled":false,
  "reminder_hours":"[24,12]","morning_briefing":true,
  "muted_courses":["Kimia"],"class_code":"IF-42",
  "available_class_codes":["IF-41","IF-42"],
  "lms_last_synced_at":"2026-09-17T08:00:00Z"}"""

class CalendarCourseTest {

    @Test
    fun preview_parsesEventsAndCacheFlags() = runTest {
        val repo = CalendarRepository(CalendarApi(authed(mockJson(
            """{"events":[{"id":"e-1","title":"Kuis","course":"Fisika",
               "deadline":"2026-09-25T10:00:00Z","source":"moodle","completed":false}],
               "total":1,"fromCache":true,
               "lastSyncedAt":"2026-09-17T08:00:00Z"}""",
        ))))
        val preview = repo.preview(force = true)
        assertEquals(1, preview.total)
        assertTrue(preview.fromCache)
        assertEquals("Kuis", preview.events.first().title)
    }

    @Test
    fun preview_sendsForceAndSortParams() = runTest {
        var path = ""
        var query = ""
        val engine = MockEngine { request ->
            path = request.url.encodedPath
            query = request.url.encodedQuery
            json("""{"events":[],"total":0}""", HttpStatusCode.OK)
        }
        val repo = CalendarRepository(CalendarApi(authed(engine)))
        repo.preview(force = true, sort = CalendarSort.DEADLINE_DESC)
        assertEquals("/v1/calendar/preview", path)
        assertTrue(query.contains("force=true"), "query was: $query")
        assertTrue(query.contains("sort=deadline_desc"), "query was: $query")
    }

    @Test
    fun courses_unwrapsEnvelope() = runTest {
        val repo = CourseRepository(CourseApi(authed(
            mockJson("""{"courses":[{"id":"c-1","name":"Matematika"}]}"""),
        )))
        val courses = repo.list()
        assertEquals(listOf("Matematika"), courses.map { it.name })
    }

    @Test
    fun user_parsesReminderHoursAndClass() = runTest {
        val repo = UserRepository(UserApi(authed(mockJson(USER))))
        val user = repo.get()
        assertEquals(listOf(24, 12), user.reminderHours)
        assertTrue(user.morningBriefing)
        assertEquals("IF-42", user.classCode)
        assertEquals(listOf("Kimia"), user.mutedCourses)
        assertTrue(user.isConnected)
        assertFalse(id.ac.itera.ressist.domain.time.isStale(
            user.lmsLastSyncedAt,
            kotlinx.datetime.Instant.parse("2026-09-17T10:00:00Z"),
        ))
    }

    @Test
    fun update_sendsOnlyNonNullFields() = runTest {
        var captured = ""
        val engine = MockEngine { request ->
            captured = request.body.toByteArray().decodeToString()
            json(USER, HttpStatusCode.OK)
        }
        val repo = UserRepository(UserApi(authed(engine)))
        repo.update(UserUpdate(reminderHours = listOf(24, 6), morningBriefing = true))
        assertTrue(captured.contains("reminder_hours"), "body was: $captured")
        assertTrue(captured.contains("[24,6]"), "body was: $captured")
        assertTrue(captured.contains("morning_briefing"), "body was: $captured")
        assertFalse(captured.contains("muted_courses"), "body was: $captured")
        assertFalse(captured.contains("class_code"), "body was: $captured")
    }

    private fun authed(engine: MockEngine): id.ac.itera.ressist.api.AuthedHttpClient {
        val client = createHttpClient(engine)
        val storage = id.ac.itera.ressist.data.InMemorySessionStorage()
        val authApi = id.ac.itera.ressist.api.AuthApi(client, "https://test")
        return id.ac.itera.ressist.api.AuthedHttpClient(
            client, storage,
            id.ac.itera.ressist.api.TokenRefresher(authApi, storage), "https://test",
        )
    }
}
