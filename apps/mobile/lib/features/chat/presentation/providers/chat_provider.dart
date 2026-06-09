import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/chat_remote_datasource.dart';
import '../../data/models/chat_message_model.dart';
import '../../data/models/chat_thread_model.dart';
import 'chat_state.dart';

final chatRemoteDataSourceProvider = Provider<ChatRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return ChatRemoteDataSource(dio);
});

// ─────────────────────────────────────────────
// Thread LIST provider
// ─────────────────────────────────────────────

final chatListProvider =
    StateNotifierProvider<ChatListNotifier, ChatListState>(
  (ref) => ChatListNotifier(ref.watch(chatRemoteDataSourceProvider)),
);

class ChatListNotifier extends StateNotifier<ChatListState> {
  final ChatRemoteDataSource _dataSource;

  ChatListNotifier(this._dataSource) : super(const ChatListState());

  Future<void> loadThreads() async {
    if (state.isLoading) return;
    state = state.copyWith(status: ChatStatus.loading, clearError: true);
    try {
      final threads = await _dataSource.getThreads();
      state = state.copyWith(status: ChatStatus.loaded, threads: threads);
    } on DioException catch (e) {
      final ex = mapDioException(e);
      state = state.copyWith(status: ChatStatus.error, errorMessage: ex.message);
    } on AppException catch (e) {
      state = state.copyWith(status: ChatStatus.error, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          status: ChatStatus.error, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<ChatThreadModel?> createThread(
      String? title, String language) async {
    try {
      final thread = await _dataSource.createThread(title, language);
      state = state.copyWith(threads: [thread, ...state.threads]);
      return thread;
    } on AppException catch (e) {
      state = state.copyWith(status: ChatStatus.error, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
          status: ChatStatus.error, errorMessage: 'Xatolik yuz berdi');
      return null;
    }
  }

  Future<void> deleteThread(String threadId) async {
    try {
      await _dataSource.deleteThread(threadId);
      state = state.copyWith(
        threads: state.threads.where((t) => t.id != threadId).toList(),
      );
    } on AppException catch (e) {
      state = state.copyWith(status: ChatStatus.error, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          status: ChatStatus.error, errorMessage: 'Xatolik yuz berdi');
    }
  }
}

// ─────────────────────────────────────────────
// Single THREAD messages provider (family)
// ─────────────────────────────────────────────

final chatThreadProvider = StateNotifierProvider.family<ChatThreadNotifier,
    ChatThreadState, String>(
  (ref, threadId) => ChatThreadNotifier(
    threadId,
    ref.watch(chatRemoteDataSourceProvider),
  ),
);

class ChatThreadNotifier extends StateNotifier<ChatThreadState> {
  final String _threadId;
  final ChatRemoteDataSource _dataSource;

  ChatThreadNotifier(this._threadId, this._dataSource)
      : super(const ChatThreadState());

  void setThread(ChatThreadModel thread) {
    state = state.copyWith(thread: thread);
  }

  Future<void> loadMessages() async {
    if (state.isLoading) return;
    state = state.copyWith(status: ChatStatus.loading, clearError: true);
    try {
      final messages = await _dataSource.getMessages(_threadId);
      state = state.copyWith(
        status: ChatStatus.loaded,
        messages: messages,
      );
    } on DioException catch (e) {
      final ex = mapDioException(e);
      state = state.copyWith(status: ChatStatus.error, errorMessage: ex.message);
    } on AppException catch (e) {
      state = state.copyWith(status: ChatStatus.error, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          status: ChatStatus.error, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<void> sendMessage(String question, String language) async {
    if (state.isSending) return;
    state = state.copyWith(isSending: true, clearError: true);
    try {
      final result = await _dataSource.sendMessage(_threadId, question, language);
      final userMsg = result['userMessage']!;
      final assistantMsg = result['assistantMessage']!;
      state = state.copyWith(
        isSending: false,
        status: ChatStatus.loaded,
        messages: [...state.messages, userMsg, assistantMsg],
      );
    } on AppException catch (e) {
      state = state.copyWith(
          isSending: false,
          status: ChatStatus.error,
          errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          isSending: false,
          status: ChatStatus.error,
          errorMessage: 'Xatolik yuz berdi');
    }
  }
}
