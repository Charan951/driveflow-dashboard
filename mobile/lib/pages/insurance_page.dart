import 'package:flutter/material.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Insurance',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!))
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
        label: const Text('Get Quote'),
        icon: const Icon(Icons.shield),
        backgroundColor: const Color(0xFF2563EB),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
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
                color: isDark ? Colors.black : Colors.grey.shade100,
                shape: BoxShape.circle,
                border: isDark ? Border.all(color: Colors.grey.shade900) : null,
              ),
              child: Icon(
                Icons.shield_outlined,
                size: 40,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No Active Policies',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "You don't have any active insurance policies linked to your vehicles.",
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Get a Quote'),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isExpired
              ? Colors.red.withAlpha(50)
              : (isExpiringSoon
                    ? Colors.orange.withAlpha(50)
                    : (isDark ? Colors.grey.shade900 : Colors.grey.shade200)),
        ),
      ),
      child: Column(
        children: [
          if (isExpired || isExpiringSoon)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              decoration: BoxDecoration(
                color: isExpired
                    ? Colors.red.withAlpha(20)
                    : Colors.orange.withAlpha(20),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    size: 16,
                    color: isExpired ? Colors.red : Colors.orange,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isExpired ? 'Policy Expired' : 'Expires in $daysLeft days',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isExpired ? Colors.red : Colors.orange,
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
                        color: const Color(0xFF2563EB).withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.shield, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Comprehensive Policy',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            insurance.provider ?? 'Unknown Provider',
                            style: TextStyle(
                              color: isDark
                                  ? Colors.white
                                  : Colors.grey.shade600,
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
                            ? Colors.green.withAlpha(20)
                            : Colors.red.withAlpha(20),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        insurance.status ?? 'Active',
                        style: TextStyle(
                          color: insurance.status == 'Active'
                              ? Colors.green
                              : Colors.red,
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
                        ? Colors.black.withAlpha(50)
                        : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.directions_car,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant != null && vehicle.variant!.isNotEmpty ? ' ${vehicle.variant}' : ''} • ${vehicle.licensePlate}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
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
                    ),
                    child: const Text('View Details'),
                  ),
                ),
                if (isExpired || isExpiringSoon) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Renew Now'),
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

  Widget _buildInfoItem(String label, String value, bool isDark) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.white : Colors.grey.shade600,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
