import 'package:flutter/material.dart';
import '../../services/vehicle_service.dart';
import '../../widgets/merchant/merchant_nav.dart';

class MerchantVehiclesPage extends StatefulWidget {
  const MerchantVehiclesPage({super.key});

  @override
  State<MerchantVehiclesPage> createState() => _MerchantVehiclesPageState();
}

class _MerchantVehiclesPageState extends State<MerchantVehiclesPage> {
  final VehicleService _service = VehicleService();
  List<Vehicle> _vehicles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _isLoading = true);
    try {
      final data = await _service.getVehicles();
      if (mounted) {
        setState(() {
          _vehicles = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load vehicles')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MerchantScaffold(
      title: 'Customer Vehicles',
      body: RefreshIndicator(
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _vehicles.isEmpty
                ? const Center(child: Text('No vehicles found'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _vehicles.length,
                    itemBuilder: (context, index) {
                      final vehicle = _vehicles[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.grey[200]!),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.deepPurple[50],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.directions_car, color: Colors.deepPurple),
                          ),
                          title: Text(
                            '${vehicle.brand} ${vehicle.model}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Number: ${vehicle.number}'),
                              if (vehicle.ownerName != null)
                                Text('Owner: ${vehicle.ownerName}'),
                            ],
                          ),
                          trailing: const Icon(Icons.chevron_right),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
