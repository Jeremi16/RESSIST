package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.AssignmentApi
import id.ac.itera.ressist.api.ClassroomReadOnlyException
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.domain.model.bucketize
import id.ac.itera.ressist.domain.time.parseInstantOrNull
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

class AssignmentRepository(
    private val api: AssignmentApi,
    private val nowProvider: () -> Instant = { Clock.System.now() },
) {
    suspend fun list(): List<Assignment> = api.list().map { it.toDomain() }

    suspend fun buckets(now: Instant = nowProvider()): TaskBuckets =
        list().bucketize(now)

    /**
     * Client-side guard mirrors the server 400 for `source~google`
     * (avoids a doomed network call; same message as the API).
     */
    suspend fun complete(assignment: Assignment): Instant {
        if (assignment.isReadOnly) throw ClassroomReadOnlyException()
        val res = api.complete(assignment.id)
        return parseInstantOrNull(res.completedAt) ?: nowProvider()
    }
}
