package id.ac.itera.ressist.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Mirror backend GET /v1/user. All optional — PUT uses the same keys. */
@Serializable
data class UserDto(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("email_verified") val emailVerified: Boolean? = null,
    @SerialName("moodle_enabled") val moodleEnabled: Boolean = false,
    @SerialName("moodle_calendar_url") val moodleCalendarUrl: String? = null,
    @SerialName("google_classroom_enabled") val googleClassroomEnabled: Boolean = false,
    @SerialName("google_connected") val googleConnected: Boolean = false,
    @SerialName("telegram_chat_id") val telegramChatId: String? = null,
    @SerialName("telegram_enabled") val telegramEnabled: Boolean = false,
    @SerialName("telegram_bot_username") val telegramBotUsername: String? = null,
    /** Encoded as string, e.g. "[24,12]". Parsed by domain layer. */
    @SerialName("reminder_hours") val reminderHours: String? = null,
    @SerialName("morning_briefing") val morningBriefing: Boolean = false,
    @SerialName("muted_courses") val mutedCourses: List<String> = emptyList(),
    @SerialName("course_aliases") val courseAliases: Map<String, String> = emptyMap(),
    @SerialName("class_code") val classCode: String? = null,
    @SerialName("available_class_codes") val availableClassCodes: List<String> = emptyList(),
    @SerialName("lms_last_synced_at") val lmsLastSyncedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)
