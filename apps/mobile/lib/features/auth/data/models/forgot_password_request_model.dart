class ForgotPasswordRequestModel {
  final String target;

  const ForgotPasswordRequestModel({required this.target});

  Map<String, dynamic> toJson() => {'target': target};
}

class ResetPasswordRequestModel {
  final String target;
  final String code;
  final String newPassword;

  const ResetPasswordRequestModel({
    required this.target,
    required this.code,
    required this.newPassword,
  });

  Map<String, dynamic> toJson() => {
        'target': target,
        'code': code,
        'newPassword': newPassword,
      };
}
