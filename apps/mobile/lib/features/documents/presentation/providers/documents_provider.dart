import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/documents_remote_datasource.dart';
import '../../data/models/document_analysis_model.dart';
import '../../data/models/generated_document_model.dart';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

class DocumentsState extends Equatable {
  final List<DocumentAnalysisModel> analyses;
  final List<GeneratedDocumentModel> generatedDocs;
  final bool isLoading;
  final bool isActionLoading;
  final String? errorMessage;

  const DocumentsState({
    this.analyses = const [],
    this.generatedDocs = const [],
    this.isLoading = false,
    this.isActionLoading = false,
    this.errorMessage,
  });

  DocumentsState copyWith({
    List<DocumentAnalysisModel>? analyses,
    List<GeneratedDocumentModel>? generatedDocs,
    bool? isLoading,
    bool? isActionLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return DocumentsState(
      analyses: analyses ?? this.analyses,
      generatedDocs: generatedDocs ?? this.generatedDocs,
      isLoading: isLoading ?? this.isLoading,
      isActionLoading: isActionLoading ?? this.isActionLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props =>
      [analyses, generatedDocs, isLoading, isActionLoading, errorMessage];
}

// ─────────────────────────────────────────────
// DataSource Provider
// ─────────────────────────────────────────────

final documentsRemoteDataSourceProvider =
    Provider<DocumentsRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return DocumentsRemoteDataSource(dio);
});

// ─────────────────────────────────────────────
// StateNotifierProvider
// ─────────────────────────────────────────────

final documentsProvider =
    StateNotifierProvider<DocumentsNotifier, DocumentsState>(
  (ref) => DocumentsNotifier(ref.watch(documentsRemoteDataSourceProvider)),
);

class DocumentsNotifier extends StateNotifier<DocumentsState> {
  final DocumentsRemoteDataSource _dataSource;

  DocumentsNotifier(this._dataSource) : super(const DocumentsState());

  Future<void> loadAll() async {
    if (state.isLoading) return;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final results = await Future.wait([
        _dataSource.getAnalyses(),
        _dataSource.getGeneratedDocuments(),
      ]);
      state = state.copyWith(
        isLoading: false,
        analyses: results[0] as List<DocumentAnalysisModel>,
        generatedDocs: results[1] as List<GeneratedDocumentModel>,
      );
    } on DioException catch (e) {
      final ex = mapDioException(e);
      state = state.copyWith(isLoading: false, errorMessage: ex.message);
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state =
          state.copyWith(isLoading: false, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<void> startAnalysis(String fileId, String language) async {
    state = state.copyWith(isActionLoading: true, clearError: true);
    try {
      final analysis = await _dataSource.startAnalysis(fileId, language);
      state = state.copyWith(
        isActionLoading: false,
        analyses: [analysis, ...state.analyses],
      );
    } on AppException catch (e) {
      state = state.copyWith(
          isActionLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
          isActionLoading: false, errorMessage: 'Xatolik yuz berdi');
    }
  }

  Future<GeneratedDocumentModel?> generateDocument(
      String type, Map<String, String> answers, String language) async {
    state = state.copyWith(isActionLoading: true, clearError: true);
    try {
      final doc =
          await _dataSource.generateDocument(type, answers, language);
      state = state.copyWith(
        isActionLoading: false,
        generatedDocs: [doc, ...state.generatedDocs],
      );
      return doc;
    } on AppException catch (e) {
      state = state.copyWith(
          isActionLoading: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
          isActionLoading: false, errorMessage: 'Xatolik yuz berdi');
      return null;
    }
  }
}
