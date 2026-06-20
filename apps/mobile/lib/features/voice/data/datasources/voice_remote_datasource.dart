import 'package:dio/dio.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/voice_session_model.dart';

class VoiceRemoteDataSource {
  final Dio _dio;

  VoiceRemoteDataSource(this._dio);

  /// Create a new voice session by uploading an audio file.
  /// POST /voice/sessions with multipart file upload.
  Future<VoiceSessionModel> createSession(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final response = await _dio.post(
        '/voice/sessions',
        data: formData,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
          receiveTimeout: const Duration(seconds: 120),
          sendTimeout: const Duration(seconds: 60),
        ),
      );
      final data = response.data;
      final json = data is Map<String, dynamic>
          ? (data.containsKey('data') ? data['data'] as Map<String, dynamic> : data)
          : data as Map<String, dynamic>;
      return VoiceSessionModel.fromJson(json);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Fetch a single voice session by ID.
  /// GET /voice/sessions/:id
  Future<VoiceSessionModel> getSession(String id) async {
    try {
      final response = await _dio.get('/voice/sessions/$id');
      final data = response.data;
      final json = data is Map<String, dynamic>
          ? (data.containsKey('data') ? data['data'] as Map<String, dynamic> : data)
          : data as Map<String, dynamic>;
      return VoiceSessionModel.fromJson(json);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Fetch all voice sessions.
  /// GET /voice/sessions
  Future<List<VoiceSessionModel>> getSessions() async {
    try {
      final response = await _dio.get('/voice/sessions');
      final data = response.data;
      final list = data is List
          ? data
          : (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
      return list
          .map((e) => VoiceSessionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
