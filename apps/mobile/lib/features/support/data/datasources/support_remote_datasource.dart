import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/support_ticket_model.dart';

class SupportRemoteDataSource {
  final Dio _dio;

  SupportRemoteDataSource(this._dio);

  Future<List<SupportTicketModel>> getTickets() async {
    try {
      final response = await _dio.get('/support/tickets');
      final data = response.data;
      if (data is List) {
        return data
            .map((e) =>
                SupportTicketModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      if (data is Map<String, dynamic> && data.containsKey('items')) {
        return (data['items'] as List)
            .map((e) =>
                SupportTicketModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<SupportTicketModel> createTicket({
    required String subject,
    String? category,
    required String initialMessage,
  }) async {
    try {
      final response = await _dio.post('/support/tickets', data: {
        'subject': subject,
        if (category != null) 'category': category,
        'message': initialMessage,
      });
      return SupportTicketModel.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<SupportMessageModel>> getMessages(String ticketId) async {
    try {
      final response =
          await _dio.get('/support/tickets/$ticketId/messages');
      final data = response.data;
      if (data is List) {
        return data
            .map((e) =>
                SupportMessageModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      if (data is Map<String, dynamic> && data.containsKey('items')) {
        return (data['items'] as List)
            .map((e) =>
                SupportMessageModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<SupportMessageModel> sendMessage({
    required String ticketId,
    required String content,
  }) async {
    try {
      final response =
          await _dio.post('/support/tickets/$ticketId/messages', data: {
        'content': content,
      });
      return SupportMessageModel.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
