import 'package:dio/dio.dart';

import '../models/plan_model.dart';

class SubscriptionRemoteDatasource {
  const SubscriptionRemoteDatasource(this._dio);
  final Dio _dio;

  Future<List<PlanModel>> getPlans() async {
    final res = await _dio.get<Map<String, dynamic>>('/plans');
    final list = res.data?['plans'] as List? ?? [];
    return list.map((e) => PlanModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> getCurrentSubscription() async {
    final res = await _dio.get<Map<String, dynamic>>('/subscriptions/current');
    return res.data ?? {};
  }

  Future<Map<String, dynamic>> getUsage() async {
    final res = await _dio.get<Map<String, dynamic>>('/subscriptions/usage');
    return res.data ?? {};
  }

  Future<Map<String, dynamic>> createInvoice(String planId, String provider) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/payments/invoice',
      data: {'planId': planId, 'provider': provider},
    );
    return res.data ?? {};
  }
}
