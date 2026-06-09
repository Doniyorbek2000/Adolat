import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/auth_state.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final initials = [
      if (user.firstName.isNotEmpty) user.firstName[0].toUpperCase(),
      if (user.lastName.isNotEmpty) user.lastName[0].toUpperCase(),
    ].join();

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.profileTitle.tr()),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        children: [
          // Avatar + name
          Center(
            child: CircleAvatar(
              radius: 44,
              backgroundColor: AppColors.primary,
              child: Text(
                initials.isNotEmpty ? initials : 'U',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              user.fullName,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          if (user.phone != null) ...[
            const SizedBox(height: 4),
            Center(
              child: Text(
                user.phone!,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ),
          ],
          if (user.email != null) ...[
            const SizedBox(height: 4),
            Center(
              child: Text(
                user.email!,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ),
          ],
          const SizedBox(height: 32),

          // Language section
          _SectionLabel(label: LocaleKeys.changeLanguage.tr()),
          _LanguageSelector(currentLanguage: user.language, context: context),
          const SizedBox(height: 20),

          // Security section
          _SectionLabel(label: LocaleKeys.changePassword.tr()),
          _ProfileTile(
            icon: Icons.lock_outline,
            title: LocaleKeys.changePassword.tr(),
            onTap: () {
              // Navigate to change password — goes through forgot-password flow
              context.goNamed(RouteNames.forgotPassword);
            },
          ),
          const SizedBox(height: 20),

          // Notifications toggle
          _NotificationsToggleTile(),
          const SizedBox(height: 20),

          // About / Legal
          _SectionLabel(label: LocaleKeys.aboutApp.tr()),
          _ProfileTile(
            icon: Icons.info_outline,
            title: LocaleKeys.aboutApp.tr(),
            trailing: const Text(
              'v1.0.0',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            onTap: () {},
          ),
          _ProfileTile(
            icon: Icons.privacy_tip_outlined,
            title: LocaleKeys.privacyPolicy.tr(),
            onTap: () {},
          ),
          _ProfileTile(
            icon: Icons.article_outlined,
            title: LocaleKeys.termsOfUse.tr(),
            onTap: () {},
          ),
          const SizedBox(height: 32),

          // Logout button
          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            tileColor: AppColors.error.withValues(alpha: 0.07),
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: Text(
              LocaleKeys.logout.tr(),
              style: const TextStyle(
                color: AppColors.error,
                fontWeight: FontWeight.w600,
              ),
            ),
            onTap: () => _showLogoutDialog(context, ref),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Future<void> _showLogoutDialog(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(LocaleKeys.logout.tr()),
        content: Text(LocaleKeys.logoutConfirm.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(LocaleKeys.logoutConfirmNo.tr()),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(LocaleKeys.logoutConfirmYes.tr()),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authStateProvider.notifier).logout();
    }
  }
}

// ---------------------------------------------------------------------------
// Language selector
// ---------------------------------------------------------------------------
class _LanguageSelector extends StatelessWidget {
  final String currentLanguage;
  final BuildContext context;

  const _LanguageSelector({
    required this.currentLanguage,
    required this.context,
  });

  @override
  Widget build(BuildContext outerContext) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surfaceLight,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            const Icon(Icons.language, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                LocaleKeys.changeLanguage.tr(),
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            _LangChip(
              label: "O'z",
              selected: currentLanguage == 'uz',
              onTap: () {
                outerContext.setLocale(const Locale('uz'));
              },
            ),
            const SizedBox(width: 8),
            _LangChip(
              label: 'Ru',
              selected: currentLanguage == 'ru',
              onTap: () {
                outerContext.setLocale(const Locale('ru'));
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _LangChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LangChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.border.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Notifications toggle (local state)
// ---------------------------------------------------------------------------
class _NotificationsToggleTile extends StatefulWidget {
  @override
  State<_NotificationsToggleTile> createState() => _NotificationsToggleTileState();
}

class _NotificationsToggleTileState extends State<_NotificationsToggleTile> {
  bool _enabled = true;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surfaceLight,
      child: SwitchListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        secondary: const Icon(Icons.notifications_outlined, color: AppColors.primary),
        title: Text(
          'Bildirishnomalar',
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        value: _enabled,
        activeColor: AppColors.primary,
        onChanged: (v) => setState(() => _enabled = v),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 6),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
              letterSpacing: 0.3,
            ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    this.trailing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surfaceLight,
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        trailing: trailing ?? const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        onTap: onTap,
      ),
    );
  }
}
