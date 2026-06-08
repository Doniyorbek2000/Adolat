class LoginRequestModel {
  final String identifier;
  final String password;

  const LoginRequestModel({required this.identifier, required this.password});

  Map<String, dynamic> toJson() => {'identifier': identifier, 'password': password};
}
