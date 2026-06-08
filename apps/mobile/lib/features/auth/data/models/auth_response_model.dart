import 'auth_user_model.dart';

class AuthResponseModel {
  final String accessToken;
  final String refreshToken;
  final AuthUserModel user;

  const AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: AuthUserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

class RegisterResultModel {
  final String userId;
  final bool requiresVerification;
  final String target;

  const RegisterResultModel({
    required this.userId,
    required this.requiresVerification,
    required this.target,
  });

  factory RegisterResultModel.fromJson(Map<String, dynamic> json) {
    return RegisterResultModel(
      userId: json['userId'] as String,
      requiresVerification: json['requiresVerification'] as bool? ?? true,
      target: json['target'] as String,
    );
  }
}
