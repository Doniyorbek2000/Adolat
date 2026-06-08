import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_header.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _targetCtrl = TextEditingController();

  @override
  void dispose() {
    _targetCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final target = _targetCtrl.text.trim();
    final ok = await ref.read(authStateProvider.notifier).forgotPassword(target);
    if (ok && mounted) {
      context.pushNamed(RouteNames.resetPassword, extra: {'target': target});
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
                  title: LocaleKeys.forgotPassword.tr(),
                  subtitle: 'Telefon yoki emailingizni kiriting, tiklash kodi yuboramiz',
                ),
                const SizedBox(height: 32),
                AppTextField(
                  label: LocaleKeys.phoneOrEmail.tr(),
                  controller: _targetCtrl,
                  keyboardType: TextInputType.emailAddress,
                  enabled: !isLoading,
                  prefixIcon: const Icon(Icons.person_outline),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Telefon yoki email kiritilishi shart' : null,
                ),
                const SizedBox(height: 24),
                AppButton(
                  text: LocaleKeys.sendCode.tr(),
                  onPressed: isLoading ? null : _submit,
                  isLoading: isLoading,
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: isLoading ? null : () => context.pop(),
                  child: Text(LocaleKeys.backToLogin.tr()),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
