class ApiEndpoints {
  // Auth
  static const String authRegister = '/auth/register';
  static const String authVerifyOtp = '/auth/verify-otp';
  static const String authResendOtp = '/auth/resend-otp';
  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';
  static const String authMe = '/auth/me';

  // Health
  static const String health = '/health';

  // Dashboard
  static const String dashboardMe = '/dashboard/me';

  // Chat
  static const String chatThreads = '/chat/threads';
  static String chatThread(String threadId) => '/chat/threads/$threadId';
  static String chatMessages(String threadId) =>
      '/chat/threads/$threadId/messages';

  // Voice
  static const String voiceSessions = '/voice/sessions';
  static String voiceSession(String id) => '/voice/sessions/$id';

  // Subscriptions & Plans
  static const String plans = '/plans';
  static const String subscriptionsCurrent = '/subscriptions/current';
  static const String subscriptionsUsage = '/subscriptions/usage';

  // Payments
  static const String paymentsInvoice = '/payments/invoice';
  static const String paymentsInvoices = '/payments/invoices';
  static const String paymentsPromo = '/payments/promo';

  // Notifications
  static const String notifications = '/notifications';
  static const String notificationsUnreadCount = '/notifications/unread-count';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';

  // Support
  static const String supportTickets = '/support/tickets';
  static String supportTicketMessages(String ticketId) =>
      '/support/tickets/$ticketId/messages';

  // Files
  static const String filesUpload = '/files/upload';

  // Document Analysis
  static const String documentsAnalyses = '/documents/analyses';

  // Document Generator
  static const String documentsGenerated = '/documents/generated';
  static const String documentsGenerate = '/documents/generate';

  // Document Export
  static String exportPdf(String id) => '/generated-documents/$id/export-pdf';
  static String exportDocx(String id) => '/generated-documents/$id/export-docx';
}
