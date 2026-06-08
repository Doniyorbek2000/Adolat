import 'package:dio/dio.dart';

import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/network_exceptions.dart';
import '../models/auth_response_model.dart';
import '../models/auth_user_model.dart';
import '../models/forgot_password_request_model.dart';
import '../models/login_request_model.dart';
import '../models/register_request_model.dart';
import '../models/verify_otp_request_model.dart';

class AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSource(this._dio);

  Future<RegisterResultModel> register(RegisterRequestModel request) async {
    try {
      final res = await _dio.post(ApiEndpoints.authRegister, data: request.toJson());
      return RegisterResultModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<AuthResponseModel> verifyOtp(VerifyOtpRequestModel request) async {
    try {
      final res = await _dio.post(ApiEndpoints.authVerifyOtp, data: request.toJson());
      return AuthResponseModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> resendOtp({required String target, required String type}) async {
    try {
      await _dio.post(ApiEndpoints.authResendOtp, data: {'target': target, 'type': type});
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<AuthResponseModel> login(LoginRequestModel request) async {
    try {
      final res = await _dio.post(ApiEndpoints.authLogin, data: request.toJson());
      return AuthResponseModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<AuthResponseModel> refresh(String refreshToken) async {
    try {
      final res = await _dio.post(ApiEndpoints.authRefresh, data: {'refreshToken': refreshToken});
      return AuthResponseModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post(ApiEndpoints.authLogout, data: {'refreshToken': refreshToken});
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> forgotPassword(ForgotPasswordRequestModel request) async {
    try {
      await _dio.post(ApiEndpoints.authForgotPassword, data: request.toJson());
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> resetPassword(ResetPasswordRequestModel request) async {
    try {
      await _dio.post(ApiEndpoints.authResetPassword, data: request.toJson());
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<AuthUserModel> getMe() async {
    try {
      final res = await _dio.get(ApiEndpoints.authMe);
      return AuthUserModel.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
