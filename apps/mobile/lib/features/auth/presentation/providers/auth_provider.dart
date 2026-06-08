import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/storage/local_storage_service.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_state.dart';

// Infrastructure providers
final secureStorageProvider = Provider<SecureStorageService>((_) => SecureStorageService());

final sharedPreferencesProvider = FutureProvider<SharedPreferences>((_) => SharedPreferences.getInstance());

final localStorageProvider = Provider<LocalStorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider).maybeWhen(
        data: (p) => p,
        orElse: () => null,
      );
  if (prefs == null) throw StateError('SharedPreferences not initialized');
  return LocalStorageService(prefs);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final apiClient = ref.watch(apiClientProvider);
  return AuthRepositoryImpl(
    remote: AuthRemoteDataSource(apiClient.dio),
    storage: storage,
  );
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(
    secureStorage: storage,
    onUnauthenticated: () async {
      // Clear tokens; UI listens to authStateProvider and redirects
      await storage.clearTokens();
    },
  );
});

// Auth state notifier
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.watch(authRepositoryProvider)),
);

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  /// Called on app start — restores session from secure storage.
  Future<void> bootstrap() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final user = await _repo.getMe();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on UnauthorizedException {
      await _repo.clearTokens();
      state = const AuthState(status: AuthStatus.unauthenticated);
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    String? phone,
    String? email,
    required String password,
    required String language,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    try {
      final result = await _repo.register(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        email: email,
        password: password,
        language: language,
      );
      state = state.copyWith(
        status: AuthStatus.needsVerification,
        verificationTarget: result.target,
        verificationType: 'REGISTER',
      );
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    }
  }

  Future<void> verifyOtp({
    required String target,
    required String code,
    required String type,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    try {
      final result = await _repo.verifyOtp(target: target, code: code, type: type);
      state = AuthState(status: AuthStatus.authenticated, user: result.user);
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    }
  }

  Future<void> resendOtp({required String target, required String type}) async {
    try {
      await _repo.resendOtp(target: target, type: type);
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    }
  }

  Future<void> login({required String identifier, required String password}) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    try {
      final result = await _repo.login(identifier: identifier, password: password);
      state = AuthState(status: AuthStatus.authenticated, user: result.user);
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    }
  }

  Future<bool> forgotPassword(String target) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    try {
      await _repo.forgotPassword(target);
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
      return false;
    }
  }

  Future<bool> resetPassword({
    required String target,
    required String code,
    required String newPassword,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    try {
      await _repo.resetPassword(target: target, code: code, newPassword: newPassword);
      state = const AuthState(status: AuthStatus.unauthenticated);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
      return false;
    }
  }

  Future<void> getMe() async {
    try {
      final user = await _repo.getMe();
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() {
    state = state.copyWith(clearError: true, status: AuthStatus.unauthenticated);
  }
}
