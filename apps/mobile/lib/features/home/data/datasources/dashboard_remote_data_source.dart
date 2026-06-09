import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/dashboard_model.dart';

class DashboardRemoteDataSource {
  final Dio _dio;

  DashboardRemoteDataSource(this._dio);

  Future<DashboardModel> getDashboard() async {
    try {
      final response = await _dio.get('/dashboard/me');
      return DashboardModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
