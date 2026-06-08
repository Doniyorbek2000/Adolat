import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_button.dart';
import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';
import '../widgets/auth_header.dart';
import '../widgets/otp_input.dart';

class OtpVerificationScreen extends ConsumerStatefulWidget {
  final String target;
  final String otpType;

  const OtpVerificationScreen({super.key, required this.target, required this.otpType});

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  String _code = '';
  Timer? _timer;
  int _secondsLeft = AppConstants.otpResendCooldown.inSeconds;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    setState(() => _secondsLeft = AppConstants.otpResendCooldown.inSeconds);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft <= 0) {
        t.cancel();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  Future<void> _verify() async {
    if (_code.length != AppConstants.otpLength) return;
    await ref.read(authStateProvider.notifier).verifyOtp(
          target: widget.target,
          code: _code,
          type: widget.otpType,
        );
  }

  Future<void> _resend() async {
    await ref.read(authStateProvider.notifier).resendOtp(
          target: widget.target,
          type: widget.otpType,
        );
    _startTimer();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authStateProvider);
    final isLoading = state.isLoading;

    ref.listen<AuthState>(authStateProvider, (_, next) {
      if (next.status == AuthStatus.authenticated) {
        context.goNamed(RouteNames.home);
      }
    });

    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              AuthHeader(
                title: LocaleKeys.otpTitle.tr(),
                subtitle: '${LocaleKeys.otpSubtitle.tr()}: ${widget.target}',
              ),
              const SizedBox(height: 40),
              if (state.errorMessage != null && state.status == AuthStatus.error)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(state.errorMessage!, style: const TextStyle(color: AppColors.error)),
                ),
              OtpInput(
                onCompleted: (code) => setState(() => _code = code),
                onChanged: (code) => setState(() => _code = code),
                hasError: state.status == AuthStatus.error,
              ),
              const SizedBox(height: 32),
              AppButton(
                text: LocaleKeys.verify.tr(),
                onPressed: (isLoading || _code.length != AppConstants.otpLength) ? null : _verify,
                isLoading: isLoading,
              ),
              const SizedBox(height: 24),
              Center(
                child: _secondsLeft > 0
                    ? Text(
                        LocaleKeys.resendIn.tr(namedArgs: {'seconds': '$_secondsLeft'}),
                        style: TextStyle(color: AppColors.textSecondary),
                      )
                    : TextButton(
                        onPressed: isLoading ? null : _resend,
                        child: Text(LocaleKeys.resendCode.tr()),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
