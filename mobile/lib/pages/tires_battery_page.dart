import 'package:flutter/material.dart';
import '../services/product_service.dart';
import '../services/booking_service.dart';
import '../services/vehicle_service.dart';
import '../models/booking.dart';

class TiresBatteryPage extends StatefulWidget {
  const TiresBatteryPage({super.key});

  @override
  State<TiresBatteryPage> createState() => _TiresBatteryPageState();
}

class _TiresBatteryPageState extends State<TiresBatteryPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _productService = ProductService();
  final _bookingService = BookingService();
  final _vehicleService = VehicleService();

  bool _loading = false;
  String? _error;
  List<Product> _products = [];
  List<Booking> _bookings = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _productService.getAllProducts(),
        _vehicleService.listMyVehicles(),
        _bookingService.listMyBookings(),
      ]);

      if (mounted) {
        setState(() {
          _products = results[0] as List<Product>;
          _bookings = results[2] as List<Booking>;
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

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tires = _products
        .where((p) => p.category.toLowerCase().contains('tire'))
        .toList();
    final batteries = _products
        .where((p) => p.category.toLowerCase().contains('battery'))
        .toList();
    final warranties = _bookings
        .where(
          (b) =>
              b.batteryTire?.isBatteryTireService == true &&
              b.batteryTire?.warrantyName != null,
        )
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Tires & Battery',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF2563EB),
          labelColor: const Color(0xFF2563EB),
          unselectedLabelColor: isDark
              ? Colors.grey.shade400
              : Colors.grey.shade600,
          tabs: const [
            Tab(icon: Icon(Icons.circle_outlined), text: 'Tires'),
            Tab(icon: Icon(Icons.battery_full), text: 'Batteries'),
            Tab(icon: Icon(Icons.shield_outlined), text: 'Warranties'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildProductGrid(tires, isDark, 'tires'),
                _buildProductGrid(batteries, isDark, 'batteries'),
                _buildWarrantyList(warranties, isDark),
              ],
            ),
    );
  }

  Widget _buildProductGrid(List<Product> products, bool isDark, String type) {
    if (products.isEmpty) {
      return Center(child: Text('No $type available'));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.7,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return _buildProductCard(product, isDark);
      },
    );
  }

  Widget _buildProductCard(Product product, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withAlpha(10)
                    : Colors.grey.shade100,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(20),
                ),
              ),
              child: const Center(
                child: Icon(Icons.image, size: 40, color: Colors.grey),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${product.price}',
                  style: const TextStyle(
                    color: Color(0xFF2563EB),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('${product.name} added to cart!'),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Order Now',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarrantyList(List<Booking> warranties, bool isDark) {
    if (warranties.isEmpty) {
      return const Center(child: Text('No active warranties found'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: warranties.length,
      itemBuilder: (context, index) {
        final booking = warranties[index];
        final warranty = booking.batteryTire!;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? Colors.black : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(20),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.shield, color: Colors.green),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      warranty.warrantyName ?? 'Unknown Warranty',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${warranty.warrantyMonths} months warranty',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        );
      },
    );
  }
}
