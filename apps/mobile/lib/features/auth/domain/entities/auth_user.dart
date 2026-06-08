import 'package:equatable/equatable.dart';

class AuthUser extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String language;
  final List<String> roles;

  const AuthUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.email,
    required this.language,
    required this.roles,
  });

  String get fullName => '$firstName $lastName';

  String get displayName => firstName.isNotEmpty ? firstName : (phone ?? email ?? 'User');

  @override
  List<Object?> get props => [id, firstName, lastName, phone, email, language, roles];
}
