import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';
import '../widgets/auth_header.dart';
import '../widgets/password_strength_view.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _termsAccepted = false;
  String _passwordValue = '';

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foydalanish shartlariga rozilik bildirilishi shart')),
      );
      return;
    }

    final phone = _phoneCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final locale = context.locale.languageCode.toUpperCase();

    await ref.read(authStateProvider.notifier).register(
          firstName: _firstNameCtrl.text.trim(),
          lastName: _lastNameCtrl.text.trim(),
          phone: phone.isNotEmpty ? phone : null,
          email: email.isNotEmpty ? email : null,
          password: _passwordCtrl.text,
          language: locale,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authStateProvider);
    final isLoading = state.isLoading;

    ref.listen<AuthState>(authStateProvider, (_, next) {
      if (next.status == AuthStatus.needsVerification && next.verificationTarget != null) {
        context.pushNamed(
          RouteNames.otpVerification,
          extra: {'target': next.verificationTarget, 'type': next.verificationType ?? 'REGISTER'},
        );
      }
    });

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
                AuthHeader(title: LocaleKeys.register.tr()),
                const SizedBox(height: 24),
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
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: LocaleKeys.firstName.tr(),
                        controller: _firstNameCtrl,
                        enabled: !isLoading,
                        textInputAction: TextInputAction.next,
                        validator: (v) => Validators.validateRequired(v, fieldName: 'Ism'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        label: LocaleKeys.lastName.tr(),
                        controller: _lastNameCtrl,
                        enabled: !isLoading,
                        textInputAction: TextInputAction.next,
                        validator: (v) => Validators.validateRequired(v, fieldName: 'Familiya'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: LocaleKeys.phone.tr(),
                  hint: '+998901234567',
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.phone_outlined),
                  validator: (v) {
                    if ((v == null || v.trim().isEmpty) && _emailCtrl.text.trim().isEmpty) {
                      return 'Telefon yoki email kiritilishi shart';
                    }
                    if (v != null && v.trim().isNotEmpty && !Validators.isValidPhoneUz(v.trim())) {
                      return 'Noto\'g\'ri telefon format (+998XXXXXXXXX)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: LocaleKeys.email.tr(),
                  hint: 'example@email.com',
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.email_outlined),
                  validator: (v) {
                    if (v != null && v.trim().isNotEmpty && !Validators.isValidEmail(v.trim())) {
                      return 'Noto\'g\'ri email format';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: LocaleKeys.password.tr(),
                  controller: _passwordCtrl,
                  obscureText: true,
                  showPasswordToggle: true,
                  textInputAction: TextInputAction.next,
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
                  textInputAction: TextInputAction.done,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.lock_outline),
                  validator: (v) => Validators.validateConfirmPassword(v, _passwordCtrl.text),
                ),
                const SizedBox(height: 16),
                CheckboxListTile(
                  value: _termsAccepted,
                  onChanged: isLoading ? null : (v) => setState(() => _termsAccepted = v ?? false),
                  title: Text(LocaleKeys.termsAgree.tr(), style: const TextStyle(fontSize: 13)),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 24),
                AppButton(
                  text: LocaleKeys.register.tr(),
                  onPressed: isLoading ? null : _submit,
                  isLoading: isLoading,
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(LocaleKeys.alreadyHaveAccount.tr()),
                    TextButton(
                      onPressed: isLoading ? null : () => context.pop(),
                      child: Text(LocaleKeys.login.tr(), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
