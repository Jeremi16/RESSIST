package id.ac.itera.ressist.di

import id.ac.itera.ressist.api.AssignmentApi
import id.ac.itera.ressist.api.AuthApi
import id.ac.itera.ressist.api.AuthedHttpClient
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.CourseApi
import id.ac.itera.ressist.api.ReleaseApi
import id.ac.itera.ressist.api.TokenRefresher
import id.ac.itera.ressist.api.UserApi
import id.ac.itera.ressist.api.createHttpClient
import id.ac.itera.ressist.data.InMemorySessionStorage
import id.ac.itera.ressist.data.SessionStorage
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.data.repository.CalendarRepository
import id.ac.itera.ressist.data.repository.CourseRepository
import id.ac.itera.ressist.data.repository.UpdateRepository
import id.ac.itera.ressist.data.repository.UserRepository
import io.ktor.client.engine.HttpClientEngine
import org.koin.dsl.module

/**
 * Shared DI graph. [engine] is platform-supplied (OkHttp on Android,
 * Darwin on iOS, MockEngine in tests). F2 overrides [SessionStorage]
 * with the DataStore impl via `modules(sharedModule(...), androidModule)`.
 */
fun sharedModule(
    engine: HttpClientEngine,
    baseUrl: String,
    enableLogging: Boolean = false,
) = module {
    single { createHttpClient(engine, enableLogging) }
    single { AuthApi(get(), baseUrl) }
    single<SessionStorage> { InMemorySessionStorage() }
    single { TokenRefresher(get(), get()) }
    single { AuthedHttpClient(get(), get(), get(), baseUrl) }
    single { AssignmentApi(get()) }
    single { CalendarApi(get()) }
    single { UserApi(get()) }
    single { CourseApi(get()) }
    single { ReleaseApi(get()) }
    single { AuthRepository(get(), get(), get()) }
    single { AssignmentRepository(get()) }
    single { CalendarRepository(get()) }
    single { UserRepository(get()) }
    single { CourseRepository(get()) }
    single { UpdateRepository(get()) }
}
