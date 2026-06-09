import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/notifications_remote_datasource.dart';
import '../../data/models/notification_model.dart';

// ---------------------------------------------------------------------------
// Infrastructure provider
// ---------------------------------------------------------------------------
final notificationsRemoteDataSourceProvider =
    Provider<NotificationsRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return NotificationsRemoteDataSource(dio);
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
enum NotificationsStatus { initial, loading, loaded, error }

class NotificationsState extends Equatable {
  final NotificationsStatus status;
  final List<NotificationModel> notifications;
  final int unreadCount;
  final String? errorMessage;

  const NotificationsState({
    this.status = NotificationsStatus.initial,
    this.notifications = const [],
    this.unreadCount = 0,
    this.errorMessage,
  });

  NotificationsState copyWith({
    NotificationsStatus? status,
    List<NotificationModel>? notifications,
    int? unreadCount,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsState(
      status: status ?? this.status,
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props =>
      [status, notifications, unreadCount, errorMessage];
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------
final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>(
  (ref) => NotificationsNotifier(
    ref.watch(notificationsRemoteDataSourceProvider),
  ),
);

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final NotificationsRemoteDataSource _dataSource;

  NotificationsNotifier(this._dataSource)
      : super(const NotificationsState());

  Future<void> loadNotifications() async {
    state = state.copyWith(
        status: NotificationsStatus.loading, clearError: true);
    try {
      final results = await Future.wait([
        _dataSource.getNotifications(),
        _dataSource.getUnreadCount(),
      ]);
      final notifications = results[0] as List<NotificationModel>;
      final unreadCount = results[1] as int;
      state = state.copyWith(
        status: NotificationsStatus.loaded,
        notifications: notifications,
        unreadCount: unreadCount,
      );
    } on AppException catch (e) {
      state = state.copyWith(
        status: NotificationsStatus.error,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        status: NotificationsStatus.error,
        errorMessage: 'Xatolik yuz berdi',
      );
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _dataSource.markAsRead(id);
      final updated = state.notifications.map((n) {
        if (n.id == id) {
          return n.copyWith(isRead: true, readAt: DateTime.now());
        }
        return n;
      }).toList();
      final newUnread = updated.where((n) => !n.isRead).length;
      state = state.copyWith(
        notifications: updated,
        unreadCount: newUnread,
      );
    } on AppException catch (_) {
      // Silently ignore mark-as-read errors
    } catch (_) {}
  }

  Future<void> markAllAsRead() async {
    try {
      await _dataSource.markAllAsRead();
      final updated = state.notifications
          .map((n) => n.copyWith(isRead: true, readAt: DateTime.now()))
          .toList();
      state = state.copyWith(notifications: updated, unreadCount: 0);
    } on AppException catch (e) {
      state = state.copyWith(errorMessage: e.message);
    } catch (_) {}
  }
}
