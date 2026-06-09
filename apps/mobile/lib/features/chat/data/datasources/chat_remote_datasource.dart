import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/chat_message_model.dart';
import '../models/chat_thread_model.dart';

class ChatRemoteDataSource {
  final Dio _dio;

  ChatRemoteDataSource(this._dio);

  Future<List<ChatThreadModel>> getThreads() async {
    try {
      final response = await _dio.get('/chat/threads');
      final data = response.data;
      final list = data is List
          ? data
          : (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
      return list
          .map((e) => ChatThreadModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<ChatThreadModel> createThread(String? title, String language) async {
    try {
      final response = await _dio.post(
        '/chat/threads',
        data: {
          if (title != null && title.isNotEmpty) 'title': title,
          'language': language,
        },
      );
      return ChatThreadModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Returns { userMessage: ChatMessageModel, assistantMessage: ChatMessageModel }
  Future<Map<String, ChatMessageModel>> sendMessage(
      String threadId, String question, String language) async {
    try {
      final response = await _dio.post(
        '/chat/threads/$threadId/messages',
        data: {'question': question, 'language': language},
      );
      final data = response.data as Map<String, dynamic>;
      return {
        'userMessage':
            ChatMessageModel.fromJson(data['userMessage'] as Map<String, dynamic>),
        'assistantMessage':
            ChatMessageModel.fromJson(data['assistantMessage'] as Map<String, dynamic>),
      };
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<ChatMessageModel>> getMessages(String threadId) async {
    try {
      final response = await _dio.get('/chat/threads/$threadId/messages');
      final data = response.data;
      final list = data is List
          ? data
          : (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
      return list
          .map((e) => ChatMessageModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> deleteThread(String threadId) async {
    try {
      await _dio.delete('/chat/threads/$threadId');
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
