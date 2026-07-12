enum AppEnvironment { development, staging, production }

class AppConfig {
  static const String appName = 'Adolat AI';
  static const String supportEmail = 'support@adolat.ai';
  static const String websiteUrl = 'https://adolat.ai';

  /// Build vaqtida beriladigan API manzili (eng ustun turadi):
  ///   flutter build appbundle --dart-define=API_BASE_URL=https://api.adolat.uz/api/v1
  static const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');

  /// Production backend manzili. O'z domeningizga almashtiring
  /// (yoki yuqoridagi --dart-define orqali bering).
  static const String productionBaseUrl = 'https://api.adolat.uz/api/v1';

  // Lokal ishlab chiqish (emulyator/simulyator).
  // Android emulyatori host localhost'ga 10.0.2.2 orqali ulanadi.
  static const String _androidDevBaseUrl = 'http://10.0.2.2:4000/api/v1';
  static const String _iosDevBaseUrl = 'http://localhost:4000/api/v1';

  /// Amaldagi API manzilini aniqlaydi:
  /// 1) --dart-define=API_BASE_URL berilgan bo'lsa — o'sha;
  /// 2) debug rejimida — platformaga mos lokal URL;
  /// 3) release rejimida — production URL.
  static String resolveBaseUrl({required bool isAndroid, required bool isDebug}) {
    if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
    if (isDebug) return isAndroid ? _androidDevBaseUrl : _iosDevBaseUrl;
    return productionBaseUrl;
  }
}
