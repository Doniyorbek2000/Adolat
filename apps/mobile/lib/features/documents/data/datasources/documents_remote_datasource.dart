import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

import '../../../../core/network/network_exceptions.dart';
import '../models/document_analysis_model.dart';
import '../models/generated_document_model.dart';

class DocumentsRemoteDataSource {
  final Dio _dio;

  DocumentsRemoteDataSource(this._dio);

  Future<List<DocumentAnalysisModel>> getAnalyses() async {
    try {
      final response = await _dio.get('/documents/analyses');
      final data = response.data;
      final list = data is List
          ? data
          : (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
      return list
          .map((e) =>
              DocumentAnalysisModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<DocumentAnalysisModel> startAnalysis(
      String fileId, String language) async {
    try {
      final response = await _dio.post('/documents/analyses', data: {
        'fileId': fileId,
        'language': language,
      });
      return DocumentAnalysisModel.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<GeneratedDocumentModel>> getGeneratedDocuments() async {
    try {
      final response = await _dio.get('/documents/generated');
      final data = response.data;
      final list = data is List
          ? data
          : (data as Map<String, dynamic>)['data'] as List<dynamic>? ?? [];
      return list
          .map((e) =>
              GeneratedDocumentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<GeneratedDocumentModel> generateDocument(
      String type, Map<String, String> answers, String language) async {
    try {
      final response = await _dio.post('/documents/generate', data: {
        'documentType': type,
        'answers': answers,
        'language': language,
      });
      return GeneratedDocumentModel.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Export a generated document as PDF.
  /// GET /generated-documents/:id/export-pdf
  /// Returns the local file path of the downloaded PDF.
  Future<String> exportPdf(String documentId) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final filePath = '${tempDir.path}/document_$documentId.pdf';
      await _dio.download(
        '/generated-documents/$documentId/export-pdf',
        filePath,
        options: Options(
          responseType: ResponseType.bytes,
          headers: {'Accept': 'application/pdf'},
        ),
      );
      // Verify the file was written
      final file = File(filePath);
      if (!await file.exists() || await file.length() == 0) {
        throw const AppException('PDF fayli yuklanmadi');
      }
      return filePath;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Export a generated document as DOCX.
  /// GET /generated-documents/:id/export-docx
  /// Returns the local file path of the downloaded DOCX.
  Future<String> exportDocx(String documentId) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final filePath = '${tempDir.path}/document_$documentId.docx';
      await _dio.download(
        '/generated-documents/$documentId/export-docx',
        filePath,
        options: Options(
          responseType: ResponseType.bytes,
          headers: {
            'Accept':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ),
      );
      // Verify the file was written
      final file = File(filePath);
      if (!await file.exists() || await file.length() == 0) {
        throw const AppException('DOCX fayli yuklanmadi');
      }
      return filePath;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<String> uploadFile(String filePath, String fileName) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });
      final response = await _dio.post('/files/upload', data: formData);
      return (response.data as Map<String, dynamic>)['id'] as String;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
