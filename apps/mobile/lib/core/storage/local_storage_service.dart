import 'package:shared_preferences/shared_preferences.dart';

import 'storage_keys.dart';

class LocalStorageService {
  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  Future<bool> setBool(String key, bool value) => _prefs.setBool(key, value);
  bool? getBool(String key) => _prefs.getBool(key);

  Future<bool> setString(String key, String value) => _prefs.setString(key, value);
  String? getString(String key) => _prefs.getString(key);

  Future<bool> remove(String key) => _prefs.remove(key);

  bool get hasSeenOnboarding => _prefs.getBool(StorageKeys.hasSeenOnboarding) ?? false;
  Future<void> setHasSeenOnboarding(bool value) => _prefs.setBool(StorageKeys.hasSeenOnboarding, value);

  String? get selectedLanguage => _prefs.getString(StorageKeys.selectedLanguage);
  Future<void> setSelectedLanguage(String lang) => _prefs.setString(StorageKeys.selectedLanguage, lang);
}
