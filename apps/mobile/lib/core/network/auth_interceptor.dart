import 'package:dio/dio.dart';

import '../storage/secure_storage_service.dart';
import 'api_endpoints.dart';

// Paths that should never have the access token injected / retried
const _noAuthPaths = {
  ApiEndpoints.authLogin,
  ApiEndpoints.authRegister,
  ApiEndpoints.authRefresh,
  ApiEndpoints.authVerifyOtp,
  ApiEndpoints.authResendOtp,
  ApiEndpoints.authForgotPassword,
  ApiEndpoints.authResetPassword,
};

class AuthInterceptor extends Interceptor {
  final SecureStorageService _storage;
  final Dio _refreshDio;
  final Future<void> Function() _onUnauthenticated;

  bool _isRefreshing = false;

  AuthInterceptor({
    required SecureStorageService storage,
    required String baseUrl,
    required Future<void> Function() onUnauthenticated,
  })  : _storage = storage,
        _onUnauthenticated = onUnauthenticated,
        _refreshDio = Dio(BaseOptions(baseUrl: baseUrl));

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getAccessToken();
    if (token != null && !_isPathExcluded(options.path)) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401 || _isPathExcluded(err.requestOptions.path)) {
      return handler.next(err);
    }

    if (_isRefreshing) {
      await _onUnauthenticated();
      return handler.reject(err);
    }

    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) {
      await _onUnauthenticated();
      return handler.reject(err);
    }

    _isRefreshing = true;
    try {
      final response = await _refreshDio.post(
        ApiEndpoints.authRefresh,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final newAccess = data['accessToken'] as String;
      final newRefresh = data['refreshToken'] as String;
      await _storage.saveAccessToken(newAccess);
      await _storage.saveRefreshToken(newRefresh);

      // Retry the original request with the new token
      final retryOptions = err.requestOptions..headers['Authorization'] = 'Bearer $newAccess';
      final retryResponse = await _refreshDio.fetch(retryOptions);
      return handler.resolve(retryResponse);
    } on DioException {
      await _storage.clearTokens();
      await _onUnauthenticated();
      return handler.reject(err);
    } finally {
      _isRefreshing = false;
    }
  }

  bool _isPathExcluded(String path) => _noAuthPaths.any((p) => path.endsWith(p));
}
