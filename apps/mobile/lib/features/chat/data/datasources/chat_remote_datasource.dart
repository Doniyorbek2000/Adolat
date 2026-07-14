import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/chat_message_model.dart';
import '../models/chat_thread_model.dart';

/// SSE oqimidan keladigan hodisa: 'user' | 'token' | 'done' | 'error'.
class ChatStreamEvent {
  final String event;
  final Map<String, dynamic> data;
  const ChatStreamEvent(this.event, this.data);
}

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

  /// Javobni SSE oqimi (token'lar) sifatida qaytaradi.
  Stream<ChatStreamEvent> streamMessage(
      String threadId, String question, String language) async* {
    final response = await _dio.post<ResponseBody>(
      '/chat/threads/$threadId/messages/stream',
      data: {'question': question, 'language': language},
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Accept': 'text/event-stream'},
      ),
    );

    final stream = response.data!.stream;
    var buffer = '';

    await for (final chunk in stream) {
      buffer += utf8.decode(chunk, allowMalformed: true);

      // SSE hodisalari bo'sh qator (\n\n) bilan ajratiladi
      int idx;
      while ((idx = buffer.indexOf('\n\n')) != -1) {
        final rawEvent = buffer.substring(0, idx);
        buffer = buffer.substring(idx + 2);
        final evt = _parseSseEvent(rawEvent);
        if (evt != null) yield evt;
      }
    }
  }

  ChatStreamEvent? _parseSseEvent(String raw) {
    String? eventName;
    final dataLines = <String>[];
    for (final line in raw.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.add(line.substring(5).trim());
      }
    }
    if (eventName == null || dataLines.isEmpty) return null;
    try {
      final data = jsonDecode(dataLines.join('\n')) as Map<String, dynamic>;
      return ChatStreamEvent(eventName, data);
    } catch (_) {
      return null;
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
