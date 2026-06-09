import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/localization/locale_keys.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/notification_model.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(notificationsProvider.notifier).loadNotifications(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.notifications.tr()),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: Text(
                LocaleKeys.markAllRead.tr(),
                style: const TextStyle(color: AppColors.secondary, fontSize: 13),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(notificationsProvider.notifier).loadNotifications(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(NotificationsState state) {
    switch (state.status) {
      case NotificationsStatus.initial:
      case NotificationsStatus.loading:
        return const Center(child: CircularProgressIndicator());

      case NotificationsStatus.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline,
                    size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                Text(
                  state.errorMessage ?? LocaleKeys.error.tr(),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref
                      .read(notificationsProvider.notifier)
                      .loadNotifications(),
                  child: Text(LocaleKeys.retry.tr()),
                ),
              ],
            ),
          ),
        );

      case NotificationsStatus.loaded:
        if (state.notifications.isEmpty) {
          return _EmptyNotifications();
        }
        return ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: state.notifications.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 16),
          itemBuilder: (context, index) {
            final notification = state.notifications[index];
            return _NotificationTile(
              notification: notification,
              onTap: () {
                if (!notification.isRead) {
                  ref
                      .read(notificationsProvider.notifier)
                      .markAsRead(notification.id);
                }
              },
            );
          },
        );
    }
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
class _EmptyNotifications extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_off_outlined,
            size: 72,
            color: AppColors.textSecondary.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            LocaleKeys.noNotifications.tr(),
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Notification tile
// ---------------------------------------------------------------------------
class _NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isUnread = !notification.isRead;

    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isUnread
              ? AppColors.secondary.withValues(alpha: 0.05)
              : Colors.transparent,
          border: isUnread
              ? const Border(
                  left: BorderSide(color: AppColors.secondary, width: 3),
                )
              : null,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _typeIcon(notification.type),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: TextStyle(
                      fontWeight:
                          isUnread ? FontWeight.w700 : FontWeight.w500,
                      color: isUnread
                          ? null
                          : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.body,
                    style: TextStyle(
                      fontSize: 13,
                      color: isUnread
                          ? AppColors.textSecondary
                          : AppColors.textSecondary.withValues(alpha: 0.7),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatDate(notification.createdAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isUnread)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4, left: 8),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondary,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _typeIcon(String type) {
    final (IconData icon, Color color) = switch (type) {
      'PAYMENT' => (Icons.payment_outlined, AppColors.success),
      'SUBSCRIPTION' => (Icons.star_outline, AppColors.warningAmber),
      'SECURITY' => (Icons.security_outlined, AppColors.error),
      'SUPPORT' => (Icons.support_agent_outlined, AppColors.primary),
      'PROMO' => (Icons.local_offer_outlined, AppColors.accent),
      _ => (Icons.info_outline, AppColors.textSecondary),
    };

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.12),
      ),
      child: Icon(icon, size: 20, color: color),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Hozir';
    if (diff.inHours < 1) return '${diff.inMinutes} daqiqa oldin';
    if (diff.inDays < 1) return '${diff.inHours} soat oldin';
    if (diff.inDays < 7) return '${diff.inDays} kun oldin';
    return '${dt.day}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
  }
}
