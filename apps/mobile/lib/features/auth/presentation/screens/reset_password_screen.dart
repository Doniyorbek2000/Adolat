import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';
import '../widgets/auth_header.dart';
import '../widgets/otp_input.dart';
import '../widgets/password_strength_view.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  final String target;

  const ResetPasswordScreen({super.key, required this.target});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String _code = '';
  String _passwordValue = '';

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_code.length != AppConstants.otpLength) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tasdiqlash kodini kiriting')),
      );
      return;
    }
    final ok = await ref.read(authStateProvider.notifier).resetPassword(
          target: widget.target,
          code: _code,
          newPassword: _passwordCtrl.text,
        );
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Parol muvaffaqiyatli yangilandi')),
      );
      context.goNamed(RouteNames.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authStateProvider);
    final isLoading = state.isLoading;

    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                AuthHeader(
                  title: LocaleKeys.resetPassword.tr(),
                  subtitle: '${widget.target} ga yuborilgan kodni kiriting',
                ),
                const SizedBox(height: 32),
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
                Text('Tasdiqlash kodi', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 12),
                OtpInput(
                  onCompleted: (code) => setState(() => _code = code),
                  onChanged: (code) => setState(() => _code = code),
                ),
                const SizedBox(height: 24),
                AppTextField(
                  label: LocaleKeys.newPassword.tr(),
                  controller: _passwordCtrl,
                  obscureText: true,
                  showPasswordToggle: true,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.lock_outline),
                  onChanged: (v) => setState(() => _passwordValue = v),
                  validator: Validators.validatePassword,
                ),
                PasswordStrengthView(password: _passwordValue),
                const SizedBox(height: 16),
                AppTextField(
                  label: LocaleKeys.confirmPassword.tr(),
                  controller: _confirmCtrl,
                  obscureText: true,
                  showPasswordToggle: true,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.lock_outline),
                  validator: (v) => Validators.validateConfirmPassword(v, _passwordCtrl.text),
                ),
                const SizedBox(height: 32),
                AppButton(
                  text: LocaleKeys.resetPassword.tr(),
                  onPressed: isLoading ? null : _submit,
                  isLoading: isLoading,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
