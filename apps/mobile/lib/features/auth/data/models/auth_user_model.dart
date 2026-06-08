import '../../domain/entities/auth_user.dart';

class AuthUserModel extends AuthUser {
  const AuthUserModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    super.phone,
    super.email,
    required super.language,
    required super.roles,
  });

  factory AuthUserModel.fromJson(Map<String, dynamic> json) {
    return AuthUserModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      language: json['language'] as String? ?? 'UZ',
      roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}
