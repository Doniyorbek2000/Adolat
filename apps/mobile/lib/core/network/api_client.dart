import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../constants/app_constants.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient({
    required SecureStorageService secureStorage,
    required Future<void> Function() onUnauthenticated,
  }) {
    // Use platform-specific base URL
    final baseUrl = Platform.isAndroid ? AppConfig.androidBaseUrl : AppConfig.iosBaseUrl;

    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        sendTimeout: AppConstants.sendTimeout,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      AuthInterceptor(
        storage: secureStorage,
        baseUrl: baseUrl,
        onUnauthenticated: onUnauthenticated,
      ),
    );

    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          // Do not log Authorization header values
          requestHeader: false,
          responseHeader: false,
        ),
      );
    }
  }

  Dio get dio => _dio;
}
