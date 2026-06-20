class ApiEndpoints {
  static const String authRegister = '/auth/register';
  static const String authVerifyOtp = '/auth/verify-otp';
  static const String authResendOtp = '/auth/resend-otp';
  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';
  static const String authMe = '/auth/me';
  static const String health = '/health';
  static const String dashboardMe = '/dashboard/me';

  // Voice
  static const String voiceSessions = '/voice/sessions';
  static String voiceSession(String id) => '/voice/sessions/$id';

  // Document Export
  static String exportPdf(String id) => '/generated-documents/$id/export-pdf';
  static String exportDocx(String id) => '/generated-documents/$id/export-docx';
}
