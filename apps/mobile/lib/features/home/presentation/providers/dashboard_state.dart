import 'package:equatable/equatable.dart';

import '../../data/models/dashboard_model.dart';

enum DashboardStatus { initial, loading, loaded, error }

class DashboardState extends Equatable {
  final DashboardStatus status;
  final DashboardModel? data;
  final String? errorMessage;

  const DashboardState({
    this.status = DashboardStatus.initial,
    this.data,
    this.errorMessage,
  });

  bool get isInitial => status == DashboardStatus.initial;
  bool get isLoading => status == DashboardStatus.loading;
  bool get isLoaded => status == DashboardStatus.loaded;
  bool get hasError => status == DashboardStatus.error;

  DashboardState copyWith({
    DashboardStatus? status,
    DashboardModel? data,
    String? errorMessage,
    bool clearError = false,
    bool clearData = false,
  }) {
    return DashboardState(
      status: status ?? this.status,
      data: clearData ? null : (data ?? this.data),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, data, errorMessage];
}
