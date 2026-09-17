package id.ac.itera.ressist.data

import id.ac.itera.ressist.api.dto.AssignmentDto
import id.ac.itera.ressist.api.dto.AuthUserDto
import id.ac.itera.ressist.api.dto.CalendarPreviewDto
import id.ac.itera.ressist.api.dto.CourseDto
import id.ac.itera.ressist.api.dto.EventPreviewDto
import id.ac.itera.ressist.api.dto.NewAssignmentDto
import id.ac.itera.ressist.api.dto.SyncResponseDto
import id.ac.itera.ressist.api.dto.UserDto
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.domain.model.CalendarEvent
import id.ac.itera.ressist.domain.model.CalendarPreview
import id.ac.itera.ressist.domain.model.Course
import id.ac.itera.ressist.domain.model.NewAssignmentInfo
import id.ac.itera.ressist.domain.model.SyncSummary
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.domain.time.parseInstantOrNull
import id.ac.itera.ressist.domain.time.parseReminderHours
import kotlinx.datetime.Instant

fun AuthUserDto.toDomain() = AuthAccount(id, email, name, avatarUrl)

fun AssignmentDto.toDomain() = Assignment(
    id = id,
    title = title,
    course = course ?: originalCourse,
    classCode = classCode,
    deadline = parseInstantOrNull(deadline) ?: Instant.DISTANT_FUTURE,
    completed = completed,
    completedAt = parseInstantOrNull(completedAt),
    source = source,
    description = description,
    url = url,
)

fun EventPreviewDto.toDomain() = CalendarEvent(
    id = id,
    title = title,
    course = course,
    deadline = parseInstantOrNull(deadline) ?: Instant.DISTANT_FUTURE,
    source = source,
    completed = completed,
)

fun CalendarPreviewDto.toDomain() = CalendarPreview(
    events = events.map { it.toDomain() },
    total = total,
    fromCache = fromCache,
    lastSyncedAt = parseInstantOrNull(lastSyncedAt),
)

fun UserDto.toDomain() = User(
    id = id,
    email = email,
    name = name,
    avatarUrl = avatarUrl,
    moodleEnabled = moodleEnabled,
    moodleCalendarUrl = moodleCalendarUrl,
    googleClassroomEnabled = googleClassroomEnabled,
    googleConnected = googleConnected,
    telegramChatId = telegramChatId,
    telegramEnabled = telegramEnabled,
    reminderHours = parseReminderHours(reminderHours),
    morningBriefing = morningBriefing,
    mutedCourses = mutedCourses,
    courseAliases = courseAliases,
    courseClassFilters = courseClassFilters,
    classCode = classCode,
    availableClassCodes = availableClassCodes,
    lmsLastSyncedAt = parseInstantOrNull(lmsLastSyncedAt),
)

fun CourseDto.toDomain() = Course(id, name)

fun NewAssignmentDto.toDomain() = NewAssignmentInfo(
    title = title,
    course = course,
    deadline = parseInstantOrNull(deadline),
    source = source,
)

fun SyncResponseDto.toDomain() = SyncSummary(
    totalEvents = if (totalEvents != 0) totalEvents else totalEventsAlt,
    newAssignments = (newAssignments + newAssignmentsAlt).map { it.toDomain() },
    message = message,
)
