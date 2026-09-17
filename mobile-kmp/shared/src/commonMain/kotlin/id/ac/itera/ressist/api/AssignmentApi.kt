package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.AssignmentDto
import id.ac.itera.ressist.api.dto.CompleteAssignmentRequest
import id.ac.itera.ressist.api.dto.CompleteAssignmentResponse

class AssignmentApi(private val http: AuthedHttpClient) {
    /** Server returns the full filtered list ordered deadline ASC (no paging). */
    suspend fun list(): List<AssignmentDto> =
        http.get("/v1/assignments")

    suspend fun complete(assignmentId: String): CompleteAssignmentResponse {
        require(assignmentId.isNotBlank()) { "assignment_id is required" }
        return http.post("/v1/assignments/complete", CompleteAssignmentRequest(assignmentId))
    }
}
