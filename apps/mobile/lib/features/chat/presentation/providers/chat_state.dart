import 'package:equatable/equatable.dart';

import '../../data/models/chat_message_model.dart';
import '../../data/models/chat_thread_model.dart';

enum ChatStatus { initial, loading, loaded, sending, error }

class ChatListState extends Equatable {
  final ChatStatus status;
  final List<ChatThreadModel> threads;
  final String? errorMessage;

  const ChatListState({
    this.status = ChatStatus.initial,
    this.threads = const [],
    this.errorMessage,
  });

  bool get isInitial => status == ChatStatus.initial;
  bool get isLoading => status == ChatStatus.loading;
  bool get isLoaded => status == ChatStatus.loaded;
  bool get hasError => status == ChatStatus.error;

  ChatListState copyWith({
    ChatStatus? status,
    List<ChatThreadModel>? threads,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ChatListState(
      status: status ?? this.status,
      threads: threads ?? this.threads,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, threads, errorMessage];
}

class ChatThreadState extends Equatable {
  final ChatStatus status;
  final ChatThreadModel? thread;
  final List<ChatMessageModel> messages;
  final bool isSending;
  final String? errorMessage;

  const ChatThreadState({
    this.status = ChatStatus.initial,
    this.thread,
    this.messages = const [],
    this.isSending = false,
    this.errorMessage,
  });

  bool get isInitial => status == ChatStatus.initial;
  bool get isLoading => status == ChatStatus.loading;
  bool get isLoaded => status == ChatStatus.loaded;
  bool get hasError => status == ChatStatus.error;

  ChatThreadState copyWith({
    ChatStatus? status,
    ChatThreadModel? thread,
    List<ChatMessageModel>? messages,
    bool? isSending,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ChatThreadState(
      status: status ?? this.status,
      thread: thread ?? this.thread,
      messages: messages ?? this.messages,
      isSending: isSending ?? this.isSending,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, thread, messages, isSending, errorMessage];
}
