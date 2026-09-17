package id.ac.itera.ressist

// Placeholder so iosMain source set exists and is ready.
// The iosX64/iosArm64/iosSimulatorArm64 targets in shared/build.gradle.kts
// stay commented until iosApp/ is created — then add:
//   actual fun platformName(): String = UIDevice.currentDevice.systemName()
actual fun platformName(): String = "iOS"
