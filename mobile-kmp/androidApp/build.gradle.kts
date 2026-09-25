plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

import java.util.Properties

android {
    // v0.3.6 rilis sideload: versionCode 12 (skema +1 dari v0.3.5 code 11).
    // Konsekuensi: pemilik KMP 0.2.3/code 5 lama (bila masih ada) wajib
    // uninstall manual karena Android menolak code yang sama/turun.
    namespace = "id.ac.itera.ressist"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.ac.itera.ressist"
        minSdk = 26
        targetSdk = 35
        versionCode = 12
        versionName = "0.3.6"

        // NOTE: project.findProperty does NOT read local.properties, so load it
        // manually. Order: -P flag > local.properties > fallback.
        val localProps = Properties().apply {
            rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use(::load)
        }
        fun prop(name: String, fallback: String): String =
            (project.findProperty(name) as String?) ?: localProps.getProperty(name, fallback)
        val apiBaseUrl = prop("ressist.apiBaseUrl", "http://10.0.2.2:8080")
        val googleWebClientId = prop("ressist.googleWebClientId", "")
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
        // Update-checker butuh versionCode int (banding versi via codeN di nama file
        // rilis RESSIST-MOBILE, bukan string semver). Sinkron dengan versionCode di atas.
        buildConfigField("int", "VERSION_CODE", "$versionCode")
    }

    // Release signing uses mobile-kmp/ressist-release.jks (gitignored, never lose it).
    // Passwords live in mobile-kmp/keystore.properties (gitignored, never commit).
    // Ala Mihon: build debug TIDAK BOLEH pakai key release. Debug pakai debug key
    // bawaan + applicationIdSuffix ".dev" (lihat buildTypes.debug di bawah),
    // sehingga 1 package release selalu 1 cert di mata Play Protect.
    // Konsekuensi OAuth: daftarkan 2 SHA-1 di GCP (debug + release).
    val keystorePropsFile = rootProject.file("keystore.properties")
    if (keystorePropsFile.exists()) {
        val props = Properties().apply { load(keystorePropsFile.inputStream()) }
        val releaseKeystore = rootProject.file(props.getProperty("storeFile"))
        signingConfigs {
            create("release") {
                storeFile = releaseKeystore
                storePassword = props.getProperty("storePassword")
                keyAlias = props.getProperty("keyAlias")
                keyPassword = props.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            // Ala Mihon (.dev): package debug = id.ac.itera.ressist.dev,
            // cert = debug key bawaan. Tidak mencemari reputasi cert rilis.
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            // Production backend, hardcoded so every machine builds identical
            // release artifacts regardless of local.properties (debug keeps
            // using ressist.apiBaseUrl for emulator/LAN development).
            buildConfigField("String", "API_BASE_URL", "\"https://ressist-api.jsx.qzz.io\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (keystorePropsFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(platform(libs.compose.bom))
    androidTestImplementation(platform(libs.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.kotlinx.datetime)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.koin.core)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.play.services.auth)
    implementation(libs.androidx.work.runtime)
    implementation(libs.koin.android)
    implementation(libs.koin.androidx.compose)
}
