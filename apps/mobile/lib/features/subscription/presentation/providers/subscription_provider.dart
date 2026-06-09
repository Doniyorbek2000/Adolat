import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/subscription_remote_datasource.dart';
import '../../data/models/plan_model.dart';

final subscriptionDatasourceProvider = Provider<SubscriptionRemoteDatasource>(
  (ref) => SubscriptionRemoteDatasource(ref.read(apiClientProvider).dio),
);

// Plans
final plansProvider = FutureProvider<List<PlanModel>>((ref) async {
  return ref.read(subscriptionDatasourceProvider).getPlans();
});

// Current subscription
final currentSubscriptionProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(subscriptionDatasourceProvider).getCurrentSubscription();
});

// Usage
final usageProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(subscriptionDatasourceProvider).getUsage();
});

// Invoice creation state
final invoiceCreationProvider =
    StateNotifierProvider<InvoiceNotifier, AsyncValue<Map<String, dynamic>?>>(
  (ref) => InvoiceNotifier(ref.read(subscriptionDatasourceProvider)),
);

class InvoiceNotifier extends StateNotifier<AsyncValue<Map<String, dynamic>?>> {
  InvoiceNotifier(this._ds) : super(const AsyncData(null));
  final SubscriptionRemoteDatasource _ds;

  Future<String?> createInvoice(String planId, String provider) async {
    state = const AsyncLoading();
    try {
      final result = await _ds.createInvoice(planId, provider);
      state = AsyncData(result);
      return result['paymentUrl'] as String?;
    } on DioException catch (e) {
      state = AsyncError(e, StackTrace.current);
      return null;
    }
  }
}
