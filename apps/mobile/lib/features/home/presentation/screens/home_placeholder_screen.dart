import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/routes/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/auth_state.dart';

class HomePlaceholderScreen extends ConsumerStatefulWidget {
  const HomePlaceholderScreen({super.key});

  @override
  ConsumerState<HomePlaceholderScreen> createState() => _HomePlaceholderScreenState();
}

class _HomePlaceholderScreenState extends ConsumerState<HomePlaceholderScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    // Redirect to login if unauthenticated
    ref.listen<AuthState>(authStateProvider, (_, next) {
      if (next.status == AuthStatus.unauthenticated) {
        context.goNamed(RouteNames.login);
      }
    });

    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final tabs = [
      _TabItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: LocaleKeys.home.tr()),
      _TabItem(icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble, label: LocaleKeys.chat.tr()),
      _TabItem(icon: Icons.description_outlined, activeIcon: Icons.description, label: LocaleKeys.documents.tr()),
      _TabItem(icon: Icons.star_outline, activeIcon: Icons.star, label: LocaleKeys.subscription.tr()),
      _TabItem(icon: Icons.person_outline, activeIcon: Icons.person, label: LocaleKeys.profile.tr()),
    ];

    final bodies = [
      _HomeTab(user: user),
      _PlaceholderTab(icon: Icons.chat_bubble_outline, label: LocaleKeys.chat.tr()),
      _PlaceholderTab(icon: Icons.description_outlined, label: LocaleKeys.documents.tr()),
      _PlaceholderTab(icon: Icons.star_outline, label: LocaleKeys.subscription.tr()),
      _ProfileTab(
        user: user,
        onLogout: () async {
          await ref.read(authStateProvider.notifier).logout();
        },
      ),
    ];

    return Scaffold(
      body: bodies[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        items: tabs
            .map((t) => BottomNavigationBarItem(
                  icon: Icon(t.icon),
                  activeIcon: Icon(t.activeIcon),
                  label: t.label,
                ))
            .toList(),
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabItem({required this.icon, required this.activeIcon, required this.label});
}

class _HomeTab extends StatelessWidget {
  final dynamic user;
  const _HomeTab({required this.user});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Adolat AI', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.balance, size: 64, color: AppColors.primary),
              ),
              const SizedBox(height: 24),
              Text(
                'Salom, ${user.displayName}!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Adolat AI ilovasiga xush kelibsiz',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  final IconData icon;
  final String label;
  const _PlaceholderTab({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(label), automaticallyImplyLeading: false),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(label, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Tez orada...', style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final dynamic user;
  final VoidCallback onLogout;
  const _ProfileTab({required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profil'), automaticallyImplyLeading: false),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary,
              child: Text(
                user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : 'U',
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              user.fullName,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          if (user.phone != null)
            Center(child: Text(user.phone!, style: TextStyle(color: AppColors.textSecondary))),
          if (user.email != null)
            Center(child: Text(user.email!, style: TextStyle(color: AppColors.textSecondary))),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: Text(LocaleKeys.logout.tr(), style: const TextStyle(color: AppColors.error)),
            onTap: onLogout,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: AppColors.error.withValues(alpha: 0.05),
          ),
        ],
      ),
    );
  }
}
