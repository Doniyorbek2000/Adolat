enum AppEnvironment { development, staging, production }

class AppConfig {
  static const String appName = 'Adolat AI';
  static const String supportEmail = 'support@adolat.ai';
  static const String websiteUrl = 'https://adolat.ai';

  static const AppEnvironment environment = AppEnvironment.development;

  // Android emulator uses 10.0.2.2 to reach host localhost.
  // iOS simulator uses localhost directly.
  static const String _androidBaseUrl = 'http://10.0.2.2:4000/api/v1';
  static const String _iosBaseUrl = 'http://localhost:4000/api/v1';

  static String get apiBaseUrl {
    // Detect platform at runtime in api_client.dart; here we default to Android.
    // Override via environment.dart if needed.
    return _androidBaseUrl;
  }

  static String get androidBaseUrl => _androidBaseUrl;
  static String get iosBaseUrl => _iosBaseUrl;
}
