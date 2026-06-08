class AppConstants {
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  static const Duration splashDuration = Duration(milliseconds: 1800);
  static const Duration otpResendCooldown = Duration(seconds: 60);

  static const int otpLength = 6;
  static const int passwordMinLength = 8;

  static const String uzPhonePrefix = '+998';
}
