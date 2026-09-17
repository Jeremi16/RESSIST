package id.ac.itera.ressist.api

/** Typed errors thrown by the API layer. */
open class RessistApiException(
    val status: Int,
    val code: String,
    override val message: String,
) : Exception("[$status] $code: $message")

class ValidationException(code: String, message: String) : RessistApiException(400, code, message)
class UnauthorizedException(code: String, message: String) : RessistApiException(401, code, message)
open class ForbiddenException(code: String, message: String) : RessistApiException(403, code, message)

/** Login with non-ITERA email. */
class DomainNotAllowedException(message: String = "Hanya email @student.itera.ac.id yang didukung") :
    ForbiddenException("email_domain_not_allowed", message)

/** Google account already linked to another user. */
class IdentityConflictException(message: String = "Akun Google sudah terhubung ke pengguna lain") :
    RessistApiException(409, "user_identity_conflict", message)

class NotFoundException(code: String, message: String) : RessistApiException(404, code, message)
class RateLimitedException(message: String = "Terlalu banyak permintaan, coba lagi nanti") :
    RessistApiException(429, "too many requests", message)
class ServerException(status: Int, code: String, message: String) : RessistApiException(status, code, message)

/** Classroom tasks are read-only (server returns 400); checked client-side too. */
class ClassroomReadOnlyException(
    message: String = "Tugas Classroom hanya bisa dibaca, tidak bisa ditandai selesai",
) : RessistApiException(400, "classroom_read_only", message)

/** Refresh failed or missing — caller must navigate to Login. */
class SessionExpiredException(cause: Throwable? = null) :
    Exception("Sesi berakhir, silakan login ulang", cause)

class NetworkException(cause: Throwable) : Exception("Tidak dapat terhubung ke server", cause)
