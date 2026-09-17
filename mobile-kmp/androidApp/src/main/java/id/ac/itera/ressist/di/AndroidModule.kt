package id.ac.itera.ressist.di

import id.ac.itera.ressist.BuildConfig
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.auth.GoogleSignInHelper
import id.ac.itera.ressist.data.AndroidSessionStorage
import id.ac.itera.ressist.data.ThemePrefs
import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.data.SessionStorage
import id.ac.itera.ressist.reminders.ReminderScheduler
import id.ac.itera.ressist.ui.kelas.KelasViewModel
import id.ac.itera.ressist.ui.login.LoginViewModel
import id.ac.itera.ressist.ui.pengingat.PengingatViewModel
import id.ac.itera.ressist.ui.overview.OverviewViewModel
import id.ac.itera.ressist.ui.tugas.TugasViewModel
import id.ac.itera.ressist.ui.kalender.KalenderViewModel
import id.ac.itera.ressist.ui.lms.LmsViewModel
import id.ac.itera.ressist.ui.profil.ProfilViewModel
import org.koin.android.ext.koin.androidContext
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

/**
 * Android-specific graph. Overrides shared [SessionStorage] (DataStore)
 * on top of [sharedModule].
 */
val androidModule = module {
    single<SessionStorage> { AndroidSessionStorage(androidContext()) }
    single { ThemePrefs(androidContext()) }
    single { GoogleSignInHelper(androidContext(), BuildConfig.GOOGLE_WEB_CLIENT_ID) }
    single { AuthManager(get<AuthRepository>()) }
    single { ReminderScheduler(androidContext(), get(), get()) }
    viewModel { LoginViewModel(get(), get(), get()) }
    viewModel { OverviewViewModel(get(), get(), get(), get()) }
    viewModel { TugasViewModel(get(), get(), get()) }
    viewModel { KalenderViewModel(get(), get()) }
    viewModel { LmsViewModel(get(), get(), get()) }
    viewModel { KelasViewModel(get(), get(), get()) }
    viewModel { PengingatViewModel(get(), get(), get(), get()) }
    viewModel { ProfilViewModel(get(), get(), { get<GoogleSignInHelper>().signOut() }, get()) }
}
