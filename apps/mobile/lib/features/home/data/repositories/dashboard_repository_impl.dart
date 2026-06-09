import '../../domain/repositories/dashboard_repository.dart';
import '../datasources/dashboard_remote_data_source.dart';
import '../models/dashboard_model.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardRemoteDataSource _remote;

  DashboardRepositoryImpl(this._remote);

  @override
  Future<DashboardModel> getDashboard() => _remote.getDashboard();
}
