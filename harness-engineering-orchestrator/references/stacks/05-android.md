## 05. Android App

### Kotlin + Jetpack Compose

```bash
# Option A: Android Studio (recommended)
# File → New → New Project → Empty Activity (Compose)
# Set language to Kotlin, minimum SDK to API 26+

# Option B: Gradle init (headless)
mkdir [NAME] && cd [NAME]
gradle init --type kotlin-application --dsl kotlin
```

### Recommended Dependencies

Add to `app/build.gradle.kts`:

```kotlin
dependencies {
    // Jetpack Compose (BOM)
    implementation(platform("androidx.compose:compose-bom:2025.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // Room (local database)
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    ksp("androidx.room:room-compiler:2.7.0")

    // Hilt (dependency injection)
    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-compiler:2.52")

    // Retrofit (networking)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Coil (image loading)
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
```

### Project Structure

```
app/src/main/java/com/example/[name]/
├── MainActivity.kt
├── di/                  # Hilt modules
│   └── AppModule.kt
├── data/
│   ├── local/           # Room DAOs, entities, database
│   ├── remote/          # Retrofit services, DTOs
│   └── repository/      # Repository implementations
├── domain/
│   ├── model/           # Domain models
│   └── usecase/         # Use cases
├── ui/
│   ├── theme/           # Material3 theme, colors, typography
│   ├── navigation/      # NavHost, routes
│   └── screens/         # Composable screens
└── util/                # Extensions, helpers
```

### Build & Test Commands

```bash
# Build debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Run instrumented tests
./gradlew connectedAndroidTest

# Lint check
./gradlew lint

# Clean build
./gradlew clean build
```

### Notes

- Use Kotlin DSL (`build.gradle.kts`) for all Gradle files
- Enable Compose compiler in `build.gradle.kts` with `buildFeatures { compose = true }`
- Use KSP instead of kapt for annotation processing (Room, Hilt)
- Still generate Harness documentation and runtime files
