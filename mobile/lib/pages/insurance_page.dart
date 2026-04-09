import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../services/vehicle_service.dart';
import '../models/vehicle.dart';

class InsurancePage extends StatefulWidget {
  const InsurancePage({super.key});

  @override
  State<InsurancePage> createState() => _InsurancePageState();
}

class _InsurancePageState extends State<InsurancePage> {
  final _vehicleService = VehicleService();
  bool _loading = false;
  String? _error;
  List<Vehicle> _vehiclesWithInsurance = [];

  @override
  void initState() {
    super.initState();
    _fetchPolicies();
  }

  Future<void> _fetchPolicies() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final vehicles = await _vehicleService.listMyVehicles();
      if (mounted) {
        setState(() {
          _vehiclesWithInsurance = vehicles
              .where(
                (v) => v.insurance != null && v.insurance?.policyNumber != null,
              )
              .toList();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  int _getDaysUntilExpiry(DateTime? expiryDate) {
    if (expiryDate == null) return 0;
    final now = DateTime.now();
    return expiryDate.difference(now).inDays;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark
        ? AppColors.backgroundSecondary
        : Colors.white;
    final textColor = isDark
        ? AppColors.textPrimary
        : AppColors.textPrimaryLight;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Insurance',
          style: TextStyle(fontWeight: FontWeight.bold, color: textColor),
        ),
        elevation: 0,
        backgroundColor: backgroundColor,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Text(_error!, style: TextStyle(color: textColor)),
            )
          : _vehiclesWithInsurance.isEmpty
          ? _buildEmptyState(isDark)
          : RefreshIndicator(
              onRefresh: _fetchPolicies,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _vehiclesWithInsurance.length,
                itemBuilder: (context, index) {
                  final vehicle = _vehiclesWithInsurance[index];
                  final insurance = vehicle.insurance!;
                  final daysLeft = _getDaysUntilExpiry(insurance.expiryDate);
                  final isExpiringSoon = daysLeft <= 30 && daysLeft >= 0;
                  final isExpired = daysLeft < 0;

                  return _buildInsuranceCard(
                    vehicle,
                    insurance,
                    daysLeft,
                    isExpiringSoon,
                    isExpired,
                    isDark,
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Get a new quote feature coming soon!'),
            ),
          );
        },
        label: const Text(
          'Get Quote',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        icon: const Icon(Icons.shield),
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    final textColor = isDark
        ? AppColors.textPrimary
        : AppColors.textPrimaryLight;
    final secondaryTextColor = isDark
        ? AppColors.textSecondary
        : AppColors.textSecondaryLight;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.backgroundSecondary
                    : Colors.grey.shade100,
                shape: BoxShape.circle,
                border: isDark
                    ? Border.all(color: AppColors.borderColor)
                    : null,
              ),
              child: Icon(
                Icons.shield_outlined,
                size: 40,
                color: isDark ? AppColors.textMuted : Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Active Policies',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "You don't have any active insurance policies linked to your vehicles.",
              textAlign: TextAlign.center,
              style: TextStyle(color: secondaryTextColor),
            ),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Get a Quote',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsuranceCard(
    Vehicle vehicle,
    VehicleInsurance insurance,
    int daysLeft,
    bool isExpiringSoon,
    bool isExpired,
    bool isDark,
  ) {
    final cardBorderColor = isExpired
        ? AppColors.error.withAlpha(50)
        : (isExpiringSoon
              ? AppColors.warning.withAlpha(50)
              : (isDark ? AppColors.borderColor : AppColors.borderColorLight));

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 60 : 20),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          if (isExpired || isExpiringSoon)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              decoration: BoxDecoration(
                color: isExpired
                    ? AppColors.error.withAlpha(20)
                    : AppColors.warning.withAlpha(20),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    size: 16,
                    color: isExpired ? AppColors.error : AppColors.warning,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isExpired ? 'Policy Expired' : 'Expires in $daysLeft days',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isExpired ? AppColors.error : AppColors.warning,
                    ),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.shield,
                        color: AppColors.primaryBlue,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Comprehensive Policy',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: isDark
                                  ? AppColors.textPrimary
                                  : AppColors.textPrimaryLight,
                            ),
                          ),
                          Text(
                            insurance.provider ?? 'Unknown Provider',
                            style: TextStyle(
                              color: isDark
                                  ? AppColors.textSecondary
                                  : AppColors.textSecondaryLight,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: insurance.status == 'Active'
                            ? AppColors.success.withAlpha(20)
                            : AppColors.error.withAlpha(20),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        insurance.status ?? 'Active',
                        style: TextStyle(
                          color: insurance.status == 'Active'
                              ? AppColors.success
                              : AppColors.error,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundSurface
                        : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.directions_car,
                        size: 16,
                        color: isDark
                            ? AppColors.textMuted
                            : Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant != null && vehicle.variant!.isNotEmpty ? ' ${vehicle.variant}' : ''} • ${vehicle.licensePlate}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isDark
                                ? AppColors.textPrimary
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _buildInfoItem(
                      'Policy Number',
                      insurance.policyNumber ?? 'N/A',
                      isDark,
                    ),
                    _buildInfoItem(
                      'Expiry Date',
                      insurance.expiryDate?.toString().split(' ')[0] ?? 'N/A',
                      isDark,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: BorderSide(
                        color: isDark
                            ? AppColors.borderColor
                            : AppColors.borderColorLight,
                      ),
                      foregroundColor: isDark
                          ? AppColors.textPrimary
                          : AppColors.textPrimaryLight,
                    ),
                    child: const Text(
                      'View Details',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                if (isExpired || isExpiringSoon) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        'Renew Policy',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String title, String value, bool isDark) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.textMuted : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark
                  ? AppColors.textPrimary
                  : AppColors.textPrimaryLight,
            ),
          ),
        ],
      ),
    );
  }
}
