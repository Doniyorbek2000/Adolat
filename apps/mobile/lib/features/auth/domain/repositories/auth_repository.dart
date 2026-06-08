import '../entities/auth_tokens.dart';
import '../entities/auth_user.dart';

abstract class AuthRepository {
  Future<({String userId, String target})> register({
    required String firstName,
    required String lastName,
    String? phone,
    String? email,
    required String password,
    required String language,
  });

  Future<({AuthTokens tokens, AuthUser user})> verifyOtp({
    required String target,
    required String code,
    required String type,
  });

  Future<void> resendOtp({required String target, required String type});

  Future<({AuthTokens tokens, AuthUser user})> login({
    required String identifier,
    required String password,
  });

  Future<void> forgotPassword(String target);

  Future<void> resetPassword({
    required String target,
    required String code,
    required String newPassword,
  });

  Future<AuthUser> getMe();

  Future<void> logout();

  Future<void> saveTokens(AuthTokens tokens);

  Future<void> clearTokens();
}
