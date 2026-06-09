import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/invoice_model.dart';

class PaymentRemoteDataSource {
  final Dio _dio;

  PaymentRemoteDataSource(this._dio);

  /// Creates a payment invoice for the given plan and provider.
  /// [provider] is 'CLICK' or 'PAYME'.
  Future<InvoiceModel> createInvoice({
    required String planId,
    required String provider,
  }) async {
    try {
      final response = await _dio.post('/payments/invoices', data: {
        'planId': planId,
        'provider': provider,
      });
      return InvoiceModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Applies a promo code and returns the updated invoice / discount info.
  Future<Map<String, dynamic>> applyPromo({
    required String code,
    required String planId,
  }) async {
    try {
      final response = await _dio.post('/payments/promo', data: {
        'code': code,
        'planId': planId,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
