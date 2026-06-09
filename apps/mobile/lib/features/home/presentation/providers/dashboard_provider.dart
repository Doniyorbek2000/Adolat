import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/network_exceptions.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/dashboard_remote_data_source.dart';
import '../../data/repositories/dashboard_repository_impl.dart';
import '../../domain/repositories/dashboard_repository.dart';
import 'dashboard_state.dart';

final dashboardRemoteDataSourceProvider = Provider<DashboardRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider).dio;
  return DashboardRemoteDataSource(dio);
});

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final remote = ref.watch(dashboardRemoteDataSourceProvider);
  return DashboardRepositoryImpl(remote);
});

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>(
  (ref) => DashboardNotifier(ref.watch(dashboardRepositoryProvider)),
);

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(const DashboardState());

  Future<void> loadDashboard() async {
    if (state.isLoading) return;
    state = state.copyWith(status: DashboardStatus.loading, clearError: true);
    try {
      final data = await _repository.getDashboard();
      state = state.copyWith(status: DashboardStatus.loaded, data: data);
    } on DioException catch (e) {
      final exception = mapDioException(e);
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: exception.message,
      );
    } on AppException catch (e) {
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: 'Xatolik yuz berdi',
      );
    }
  }

  Future<void> refreshDashboard() async {
    state = state.copyWith(status: DashboardStatus.loading, clearError: true);
    try {
      final data = await _repository.getDashboard();
      state = state.copyWith(status: DashboardStatus.loaded, data: data);
    } on DioException catch (e) {
      final exception = mapDioException(e);
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: exception.message,
      );
    } on AppException catch (e) {
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        status: DashboardStatus.error,
        errorMessage: 'Xatolik yuz berdi',
      );
    }
  }
}
