package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.UserApi
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.User

class UserRepository(private val api: UserApi) {
    suspend fun get(): User = api.get().toDomain()

    suspend fun update(update: UserUpdate): User = api.update(update).toDomain()

    suspend fun disconnectGoogle(): User {
        api.disconnectGoogle()
        return get()
    }
}
