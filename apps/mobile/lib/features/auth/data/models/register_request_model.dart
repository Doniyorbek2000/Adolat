class RegisterRequestModel {
  final String firstName;
  final String lastName;
  final String? phone;
  final String? email;
  final String password;
  final String language;

  const RegisterRequestModel({
    required this.firstName,
    required this.lastName,
    this.phone,
    this.email,
    required this.password,
    required this.language,
  });

  Map<String, dynamic> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        'password': password,
        'language': language,
      };
}
