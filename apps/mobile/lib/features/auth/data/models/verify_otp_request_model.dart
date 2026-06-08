class VerifyOtpRequestModel {
  final String target;
  final String code;
  final String type;

  const VerifyOtpRequestModel({
    required this.target,
    required this.code,
    required this.type,
  });

  Map<String, dynamic> toJson() => {'target': target, 'code': code, 'type': type};
}
