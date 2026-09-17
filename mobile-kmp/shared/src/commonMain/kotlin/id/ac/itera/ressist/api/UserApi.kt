package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.SuccessDto
import id.ac.itera.ressist.api.dto.UserDto
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

/**
 * Field-level update for PUT /v1/user — only non-null fields are sent
 * (explicitNulls=false in [RessistJson] also guards data-class bodies).
 */
data class UserUpdate(
    val name: String? = null,
    val classCode: String? = null,
    val moodleEnabled: Boolean? = null,
    val moodleCalendarUrl: String? = null,
    val googleClassroomEnabled: Boolean? = null,
    val telegramEnabled: Boolean? = null,
    val telegramChatId: String? = null,
    val reminderHours: List<Int>? = null,
    val morningBriefing: Boolean? = null,
    val mutedCourses: List<String>? = null,
    val courseAliases: Map<String, String>? = null,
) {
    fun isEmpty(): Boolean =
        name == null && classCode == null && moodleEnabled == null &&
            moodleCalendarUrl == null && googleClassroomEnabled == null &&
            telegramEnabled == null && telegramChatId == null &&
            reminderHours == null && morningBriefing == null &&
            mutedCourses == null && courseAliases == null

    fun toJson(): JsonObject = buildJsonObject {
        name?.let { put("name", it) }
        classCode?.let { put("class_code", it) }
        moodleEnabled?.let { put("moodle_enabled", it) }
        moodleCalendarUrl?.let { put("moodle_calendar_url", it) }
        googleClassroomEnabled?.let { put("google_classroom_enabled", it) }
        telegramEnabled?.let { put("telegram_enabled", it) }
        telegramChatId?.let { put("telegram_chat_id", it) }
        reminderHours?.let { put("reminder_hours", "[${it.joinToString(",")}]") }
        morningBriefing?.let { put("morning_briefing", it) }
        mutedCourses?.let { list ->
            putJsonArray("muted_courses") { list.forEach { add(JsonPrimitive(it)) } }
        }
        courseAliases?.let { map ->
            putJsonObject("course_aliases") { map.forEach { (k, v) -> put(k, v) } }
        }
    }
}

class UserApi(private val http: AuthedHttpClient) {
    suspend fun get(): UserDto = http.get("/v1/user")

    suspend fun update(update: UserUpdate): UserDto {
        require(!update.isEmpty()) { "nothing to update" }
        return http.put("/v1/user", update.toJson())
    }

    suspend fun disconnectGoogle(): SuccessDto =
        http.post("/v1/user/google/disconnect")
}
