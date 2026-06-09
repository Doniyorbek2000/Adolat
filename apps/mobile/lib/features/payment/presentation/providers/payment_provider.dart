import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/payment_remote_datasource.dart';
import '../../data/models/invoice_model.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------
final paymentRemoteDataSourceProvider =
    Provider<PaymentRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return PaymentRemoteDataSource(dio);
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
class PaymentState {
  final bool isLoading;
  final InvoiceModel? invoice;
  final String? paymentUrl;
  final String? errorMessage;
  final double? discountedAmount;
  final bool promoApplied;

  const PaymentState({
    this.isLoading = false,
    this.invoice,
    this.paymentUrl,
    this.errorMessage,
    this.discountedAmount,
    this.promoApplied = false,
  });

  PaymentState copyWith({
    bool? isLoading,
    InvoiceModel? invoice,
    String? paymentUrl,
    String? errorMessage,
    double? discountedAmount,
    bool? promoApplied,
    bool clearError = false,
    bool clearInvoice = false,
  }) {
    return PaymentState(
      isLoading: isLoading ?? this.isLoading,
      invoice: clearInvoice ? null : (invoice ?? this.invoice),
      paymentUrl: clearInvoice ? null : (paymentUrl ?? this.paymentUrl),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      discountedAmount: discountedAmount ?? this.discountedAmount,
      promoApplied: promoApplied ?? this.promoApplied,
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------
final paymentProvider = StateNotifierProvider.autoDispose<PaymentNotifier, PaymentState>(
  (ref) => PaymentNotifier(ref.watch(paymentRemoteDataSourceProvider)),
);

class PaymentNotifier extends StateNotifier<PaymentState> {
  final PaymentRemoteDataSource _dataSource;

  PaymentNotifier(this._dataSource) : super(const PaymentState());

  /// Creates invoice. [provider] is 'CLICK' or 'PAYME'.
  Future<void> createInvoice(String planId, String provider) async {
    state = state.copyWith(isLoading: true, clearError: true, clearInvoice: true);
    try {
      final invoice = await _dataSource.createInvoice(
        planId: planId,
        provider: provider,
      );
      state = state.copyWith(
        isLoading: false,
        invoice: invoice,
        paymentUrl: invoice.paymentUrl,
      );
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          isLoading: false, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<void> applyPromo(String code, String planId) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _dataSource.applyPromo(code: code, planId: planId);
      final discounted = result['discountedAmount'] != null
          ? (result['discountedAmount'] as num).toDouble()
          : null;
      state = state.copyWith(
        isLoading: false,
        discountedAmount: discounted,
        promoApplied: true,
      );
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          isLoading: false, errorMessage: 'Promo kod noto\'g\'ri');
    }
  }
}
