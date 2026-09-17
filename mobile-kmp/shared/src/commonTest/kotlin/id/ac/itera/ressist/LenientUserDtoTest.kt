package id.ac.itera.ressist

import id.ac.itera.ressist.api.createHttpClient
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.api.UserApi
import id.ac.itera.ressist.api.AuthApi
import id.ac.itera.ressist.api.AuthedHttpClient
import id.ac.itera.ressist.api.TokenRefresher
import id.ac.itera.ressist.data.InMemorySessionStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Regression: the real backend string-encodes some collections
 * ("muted_courses":"[]", "course_aliases" may also drift). The app must
 * parse both shapes instead of force-closing (JsonConvertException).
 */
class LenientUserDtoTest {

    private fun repo(payload: String): UserRepository {
        val engine = MockEngine {
            respond(payload, HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json"))
        }
        val client = createHttpClient(engine)
        val storage = InMemorySessionStorage()
        val authApi = AuthApi(client, "https://test")
        val authed = AuthedHttpClient(client, storage, TokenRefresher(authApi, storage), "https://test")
        return UserRepository(UserApi(authed))
    }

    @Test
    fun stringEncodedCollections_parse() = runTest {
        val user = repo(
            """{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs",
               "moodle_enabled":true,"reminder_hours":"[24,12]","morning_briefing":true,
               "muted_courses":"[]","course_aliases":"{}","class_code":"IF-42",
               "available_class_codes":"[\"IF-41\",\"IF-42\"]",
               "lms_last_synced_at":"2026-09-17T08:00:00Z"}""",
        ).get()
        assertEquals(emptyList(), user.mutedCourses)
        assertEquals(emptyMap(), user.courseAliases)
        assertEquals(listOf("IF-41", "IF-42"), user.availableClassCodes)
        assertEquals(listOf(24, 12), user.reminderHours)
    }

    @Test
    fun stringEncodedCollections_withValues_parse() = runTest {
        val user = repo(
            """{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs",
               "muted_courses":"[\"Kimia\",\"Fisika\"]",
               "course_aliases":"{\"KIM-A\":\"Kimia Dasar\"}",
               "reminder_hours":"[24,12,6,1]"}""",
        ).get()
        assertEquals(listOf("Kimia", "Fisika"), user.mutedCourses)
        assertEquals(mapOf("KIM-A" to "Kimia Dasar"), user.courseAliases)
        assertEquals(listOf(24, 12, 6, 1), user.reminderHours)
    }

    @Test
    fun realArrays_stillParse() = runTest {
        val user = repo(
            """{"id":"u-1","email":"mhs@student.itera.ac.id","name":"Mhs",
               "muted_courses":["Kimia"],"course_aliases":{"K":"V"},
               "reminder_hours":[24,6],"available_class_codes":[]}""",
        ).get()
        assertEquals(listOf("Kimia"), user.mutedCourses)
        assertEquals(mapOf("K" to "V"), user.courseAliases)
        assertEquals(listOf(24, 6), user.reminderHours)
        assertTrue(user.availableClassCodes.isEmpty())
    }
}
