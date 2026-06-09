import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/support_remote_datasource.dart';
import '../../data/models/support_ticket_model.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------
final supportRemoteDataSourceProvider =
    Provider<SupportRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return SupportRemoteDataSource(dio);
});

// ---------------------------------------------------------------------------
// Ticket list state
// ---------------------------------------------------------------------------
class SupportListState {
  final List<SupportTicketModel> tickets;
  final bool isLoading;
  final String? errorMessage;

  const SupportListState({
    this.tickets = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  SupportListState copyWith({
    List<SupportTicketModel>? tickets,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SupportListState(
      tickets: tickets ?? this.tickets,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final supportListProvider =
    StateNotifierProvider<SupportListNotifier, SupportListState>(
  (ref) => SupportListNotifier(ref.watch(supportRemoteDataSourceProvider)),
);

class SupportListNotifier extends StateNotifier<SupportListState> {
  final SupportRemoteDataSource _dataSource;

  SupportListNotifier(this._dataSource) : super(const SupportListState());

  Future<void> loadTickets() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final tickets = await _dataSource.getTickets();
      state = state.copyWith(tickets: tickets, isLoading: false);
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state =
          state.copyWith(isLoading: false, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<SupportTicketModel?> createTicket(
    String subject,
    String? category,
    String initialMessage,
  ) async {
    try {
      final ticket = await _dataSource.createTicket(
        subject: subject,
        category: category,
        initialMessage: initialMessage,
      );
      state = state.copyWith(tickets: [ticket, ...state.tickets]);
      return ticket;
    } on AppException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Xatolik yuz berdi');
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Ticket detail state (messages)
// ---------------------------------------------------------------------------
class TicketDetailState {
  final SupportTicketModel ticket;
  final List<SupportMessageModel> messages;
  final bool isLoading;
  final bool isSending;
  final String? errorMessage;

  const TicketDetailState({
    required this.ticket,
    this.messages = const [],
    this.isLoading = false,
    this.isSending = false,
    this.errorMessage,
  });

  TicketDetailState copyWith({
    SupportTicketModel? ticket,
    List<SupportMessageModel>? messages,
    bool? isLoading,
    bool? isSending,
    String? errorMessage,
    bool clearError = false,
  }) {
    return TicketDetailState(
      ticket: ticket ?? this.ticket,
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final ticketDetailProvider = StateNotifierProvider.autoDispose
    .family<TicketDetailNotifier, TicketDetailState, SupportTicketModel>(
  (ref, ticket) =>
      TicketDetailNotifier(ref.watch(supportRemoteDataSourceProvider), ticket),
);

class TicketDetailNotifier
    extends StateNotifier<TicketDetailState> {
  final SupportRemoteDataSource _dataSource;

  TicketDetailNotifier(this._dataSource, SupportTicketModel ticket)
      : super(TicketDetailState(ticket: ticket));

  Future<void> loadMessages() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final messages =
          await _dataSource.getMessages(state.ticket.id);
      state = state.copyWith(messages: messages, isLoading: false);
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state =
          state.copyWith(isLoading: false, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<void> sendMessage(String content) async {
    state = state.copyWith(isSending: true, clearError: true);
    try {
      final message = await _dataSource.sendMessage(
        ticketId: state.ticket.id,
        content: content,
      );
      state = state.copyWith(
        messages: [...state.messages, message],
        isSending: false,
      );
    } on AppException catch (e) {
      state = state.copyWith(isSending: false, errorMessage: e.message);
    } catch (_) {
      state =
          state.copyWith(isSending: false, errorMessage: 'Xatolik yuz berdi');
    }
  }
}
