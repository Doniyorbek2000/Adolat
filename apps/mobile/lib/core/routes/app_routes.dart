import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../features/chat/presentation/screens/chat_thread_screen.dart';
import '../../features/documents/presentation/screens/document_analysis_screen.dart';
import '../../features/documents/presentation/screens/document_generator_screen.dart';
import '../../features/home/presentation/screens/main_shell_screen.dart';
import '../../features/language/presentation/screens/language_selection_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../features/splash/presentation/screens/splash_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/payment/presentation/screens/payment_screen.dart';
import '../../features/support/presentation/screens/support_screen.dart';
import '../../features/support/presentation/screens/create_ticket_screen.dart';
import '../../features/support/presentation/screens/ticket_detail_screen.dart';
import '../../features/support/data/models/support_ticket_model.dart';
import '../../features/chat/data/models/chat_thread_model.dart';
import '../../features/voice/presentation/screens/voice_screen.dart';
import 'route_names.dart';

class AppRoutes {
  static final router = GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        name: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        name: RouteNames.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/language',
        name: RouteNames.language,
        builder: (context, state) => const LanguageSelectionScreen(),
      ),
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: RouteNames.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/otp',
        name: RouteNames.otpVerification,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return OtpVerificationScreen(
            target: extra?['target'] as String? ?? '',
            otpType: extra?['type'] as String? ?? 'REGISTER',
          );
        },
      ),
      GoRoute(
        path: '/forgot-password',
        name: RouteNames.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        name: RouteNames.resetPassword,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ResetPasswordScreen(target: extra?['target'] as String? ?? '');
        },
      ),
      GoRoute(
        path: '/home',
        name: RouteNames.home,
        builder: (context, state) => const MainShellScreen(),
      ),
      GoRoute(
        path: '/chat/:threadId',
        name: RouteNames.chatThread,
        builder: (context, state) {
          final threadId = state.pathParameters['threadId']!;
          final extra = state.extra;
          final ChatThreadModel? thread =
              extra is ChatThreadModel ? extra : null;
          final String? initialMessage = extra is String ? extra : null;
          return ChatThreadScreen(
            threadId: threadId,
            initialThread: thread,
            initialMessage: initialMessage,
          );
        },
      ),
      GoRoute(
        path: '/document-analysis',
        name: RouteNames.documentAnalysis,
        builder: (context, state) => const DocumentAnalysisScreen(),
      ),
      GoRoute(
        path: '/document-generator',
        name: RouteNames.documentGenerator,
        builder: (context, state) => const DocumentGeneratorScreen(),
      ),
      GoRoute(
        path: '/voice',
        name: RouteNames.voice,
        builder: (context, state) => const VoiceScreen(),
      ),
      GoRoute(
        path: '/notifications',
        name: RouteNames.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/payment',
        name: RouteNames.payment,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return PaymentScreen(
            planId: extra['planId'] as String? ?? '',
            planName: extra['planName'] as String? ?? '',
            price: (extra['price'] as num?)?.toDouble() ?? 0,
            features: (extra['features'] as List<String>?) ?? const [],
          );
        },
      ),
      GoRoute(
        path: '/support',
        name: RouteNames.support,
        builder: (context, state) => const SupportScreen(),
      ),
      GoRoute(
        path: '/support/create',
        name: RouteNames.createTicket,
        builder: (context, state) => const CreateTicketScreen(),
      ),
      GoRoute(
        path: '/support/ticket',
        name: RouteNames.ticketDetail,
        builder: (context, state) {
          final ticket = state.extra as SupportTicketModel;
          return TicketDetailScreen(ticket: ticket);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Sahifa topilmadi: ${state.uri}')),
    ),
  );
}
