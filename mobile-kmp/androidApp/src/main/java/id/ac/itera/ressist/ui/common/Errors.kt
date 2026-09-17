package id.ac.itera.ressist.ui.common

import id.ac.itera.ressist.api.DomainNotAllowedException
import id.ac.itera.ressist.api.IdentityConflictException
import id.ac.itera.ressist.api.NetworkException
import id.ac.itera.ressist.api.RateLimitedException
import id.ac.itera.ressist.api.RessistApiException

fun Throwable.userMessage(): String = when (this) {
    is DomainNotAllowedException -> "Hanya email @student.itera.ac.id yang bisa masuk"
    is IdentityConflictException -> "Akun Google ini sudah terhubung ke pengguna lain"
    is NetworkException -> "Tidak dapat terhubung ke server. Periksa koneksi internet."
    is RateLimitedException -> "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."
    is RessistApiException -> message
    else -> message ?: "Terjadi kesalahan. Coba lagi."
}
