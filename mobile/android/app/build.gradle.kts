plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val uploadKeyStore = System.getenv("KIVILO_UPLOAD_KEYSTORE")
val uploadStorePassword = System.getenv("KIVILO_UPLOAD_STORE_PASSWORD")
val uploadKeyAlias = System.getenv("KIVILO_UPLOAD_KEY_ALIAS")
val uploadKeyPassword = System.getenv("KIVILO_UPLOAD_KEY_PASSWORD")
val releaseRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}
if (releaseRequested && listOf(uploadKeyStore, uploadStorePassword, uploadKeyAlias, uploadKeyPassword).any { it.isNullOrBlank() }) {
    error("Android release signing requires KIVILO_UPLOAD_KEYSTORE, KIVILO_UPLOAD_STORE_PASSWORD, KIVILO_UPLOAD_KEY_ALIAS, and KIVILO_UPLOAD_KEY_PASSWORD")
}

android {
    namespace = "one.kivilo.kivilo"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "one.kivilo.kivilo"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    if (uploadKeyStore != null && uploadStorePassword != null && uploadKeyAlias != null && uploadKeyPassword != null) {
        signingConfigs {
            create("upload") {
                storeFile = file(uploadKeyStore)
                storePassword = uploadStorePassword
                keyAlias = uploadKeyAlias
                keyPassword = uploadKeyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("upload")
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
