import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/auth_tokens.dart';
import '../../domain/entities/auth_user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/forgot_password_request_model.dart';
import '../models/login_request_model.dart';
import '../models/register_request_model.dart';
import '../models/verify_otp_request_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remote;
  final SecureStorageService _storage;

  AuthRepositoryImpl({
    required AuthRemoteDataSource remote,
    required SecureStorageService storage,
  })  : _remote = remote,
        _storage = storage;

  @override
  Future<({String userId, String target})> register({
    required String firstName,
    required String lastName,
    String? phone,
    String? email,
    required String password,
    required String language,
  }) async {
    final result = await _remote.register(RegisterRequestModel(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      password: password,
      language: language,
    ));
    return (userId: result.userId, target: result.target);
  }

  @override
  Future<({AuthTokens tokens, AuthUser user})> verifyOtp({
    required String target,
    required String code,
    required String type,
  }) async {
    final result = await _remote.verifyOtp(VerifyOtpRequestModel(target: target, code: code, type: type));
    final tokens = AuthTokens(accessToken: result.accessToken, refreshToken: result.refreshToken);
    await saveTokens(tokens);
    return (tokens: tokens, user: result.user);
  }

  @override
  Future<void> resendOtp({required String target, required String type}) =>
      _remote.resendOtp(target: target, type: type);

  @override
  Future<({AuthTokens tokens, AuthUser user})> login({
    required String identifier,
    required String password,
  }) async {
    final result = await _remote.login(LoginRequestModel(identifier: identifier, password: password));
    final tokens = AuthTokens(accessToken: result.accessToken, refreshToken: result.refreshToken);
    await saveTokens(tokens);
    return (tokens: tokens, user: result.user);
  }

  @override
  Future<void> forgotPassword(String target) =>
      _remote.forgotPassword(ForgotPasswordRequestModel(target: target));

  @override
  Future<void> resetPassword({
    required String target,
    required String code,
    required String newPassword,
  }) =>
      _remote.resetPassword(ResetPasswordRequestModel(target: target, code: code, newPassword: newPassword));

  @override
  Future<AuthUser> getMe() => _remote.getMe();

  @override
  Future<void> logout() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _remote.logout(refreshToken);
      } catch (_) {}
    }
    await clearTokens();
  }

  @override
  Future<void> saveTokens(AuthTokens tokens) async {
    await _storage.saveAccessToken(tokens.accessToken);
    await _storage.saveRefreshToken(tokens.refreshToken);
  }

  @override
  Future<void> clearTokens() => _storage.clearTokens();
}
