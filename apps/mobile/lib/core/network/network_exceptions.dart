import 'package:dio/dio.dart';

class AppException implements Exception {
  final String message;
  final int? statusCode;

  const AppException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException(super.message, {super.statusCode});
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Sessiya tugagan. Iltimos, qayta kiring.']);
}

AppException mapDioException(DioException e) {
  if (e.type == DioExceptionType.connectionError ||
      e.type == DioExceptionType.connectionTimeout) {
    return const NetworkException('Server bilan bog\'lanib bo\'lmadi');
  }
  if (e.type == DioExceptionType.receiveTimeout ||
      e.type == DioExceptionType.sendTimeout) {
    return const NetworkException('So\'rov muddati tugadi');
  }

  final status = e.response?.statusCode;
  final data = e.response?.data;
  String message = 'Xatolik yuz berdi';
  if (data is Map<String, dynamic> && data['message'] is String) {
    message = data['message'] as String;
  }

  if (status == 401) return UnauthorizedException(message);
  return NetworkException(message, statusCode: status);
}
