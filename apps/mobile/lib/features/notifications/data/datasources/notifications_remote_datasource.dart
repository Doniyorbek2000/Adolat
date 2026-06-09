import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/notification_model.dart';

class NotificationsRemoteDataSource {
  final Dio _dio;

  NotificationsRemoteDataSource(this._dio);

  Future<List<NotificationModel>> getNotifications() async {
    try {
      final response = await _dio.get('/notifications');
      final data = response.data;
      if (data is List) {
        return data
            .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      // Handle paginated response shape {items: [...]}
      if (data is Map<String, dynamic> && data.containsKey('items')) {
        return (data['items'] as List)
            .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await _dio.get('/notifications/unread-count');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return (data['count'] as int?) ?? 0;
      }
      return 0;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _dio.patch('/notifications/$id/read');
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _dio.patch('/notifications/read-all');
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
