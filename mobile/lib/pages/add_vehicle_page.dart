import 'package:flutter/material.dart';
import '../../services/vehicle_service.dart';

class AddVehiclePage extends StatefulWidget {
  const AddVehiclePage({super.key});

  @override
  State<AddVehiclePage> createState() => _AddVehiclePageState();
}

class _AddVehiclePageState extends State<AddVehiclePage> {
  final _service = VehicleService();
  final _formKey = GlobalKey<FormState>();

  int _step = 1;
  bool _isLoading = false;
  bool _isFetching = false;

  final _licensePlateController = TextEditingController();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController(
    text: DateTime.now().year.toString(),
  );
  final _colorController = TextEditingController();
  final _vinController = TextEditingController();
  final _mileageController = TextEditingController();
  String _type = 'Car';
  String _fuelType = 'Petrol';

  Color get _accentPurple => const Color(0xFF3B82F6);

  @override
  void dispose() {
    _licensePlateController.dispose();
    _makeController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _vinController.dispose();
    _mileageController.dispose();
    super.dispose();
  }

  Future<void> _handleRegNoSubmit() async {
    final plate = _licensePlateController.text.trim();
    if (plate.isEmpty) return;

    setState(() => _isFetching = true);
    try {
      final details = await _service.fetchDetails(plate);
      if (details != null && details['found'] == true) {
        setState(() {
          _makeController.text = details['make']?.toString() ?? '';
          _modelController.text = details['model']?.toString() ?? '';
          _yearController.text = details['year']?.toString() ?? '';
          if (details['type'] != null) {
            _type = details['type'].toString();
          }
          if (details['fuelType'] != null) {
            _fuelType = details['fuelType'].toString();
          }
          if (details['color'] != null) {
            _colorController.text = details['color'].toString();
          }
          if (details['vin'] != null) {
            _vinController.text = details['vin'].toString();
          }
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Vehicle details found!')),
            );
          }
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Details not found. Please enter manually.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Auto-fetch failed. Please enter manually.'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetching = false;
          _step = 2;
        });
      }
    }
  }

  Future<void> _handleFinalSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      await _service.addVehicle(
        licensePlate: _licensePlateController.text.trim().toUpperCase(),
        make: _makeController.text.trim(),
        model: _modelController.text.trim(),
        year: int.tryParse(_yearController.text) ?? DateTime.now().year,
        type: _type,
        color: _colorController.text.trim(),
        vin: _vinController.text.trim(),
        mileage: num.tryParse(_mileageController.text),
        fuelType: _fuelType,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle added successfully!')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to add vehicle: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF020617) : Colors.white,
      appBar: AppBar(
        title: const Text('Add Vehicle'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : Colors.black,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildStepIndicator(isDark),
            const SizedBox(height: 32),
            if (_step == 1) _buildStep1(isDark) else _buildStep2(isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(bool isDark) {
    return Row(
      children: [
        _indicatorCircle(1, _step >= 1, isDark),
        Expanded(
          child: Divider(color: _step >= 2 ? _accentPurple : Colors.grey),
        ),
        _indicatorCircle(2, _step >= 2, isDark),
      ],
    );
  }

  Widget _indicatorCircle(int num, bool active, bool isDark) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? _accentPurple : Colors.grey.withAlpha(50),
      ),
      child: Center(
        child: Text(
          num.toString(),
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildStep1(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Enter Registration Number',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'We will try to fetch your vehicle details automatically.',
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 32),
        TextField(
          controller: _licensePlateController,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            hintText: 'e.g. MH12AB1234',
            filled: true,
            fillColor: isDark
                ? Colors.white.withAlpha(10)
                : Colors.grey.shade100,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: _isFetching ? null : _handleRegNoSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: _accentPurple,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isFetching
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Fetch Details'),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(
            onPressed: () => setState(() => _step = 2),
            child: const Text('Enter details manually'),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2(bool isDark) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Confirm Vehicle Details',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          _buildTextField('Make', _makeController, 'e.g. Toyota', isDark),
          const SizedBox(height: 16),
          _buildTextField('Model', _modelController, 'e.g. Camry', isDark),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  'Year',
                  _yearController,
                  'e.g. 2022',
                  isDark,
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildTextField(
                  'Color',
                  _colorController,
                  'e.g. White',
                  isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildDropdownField(
            'Fuel Type',
            _fuelType,
            ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'],
            (v) => setState(() => _fuelType = v!),
            isDark,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            'Mileage (km)',
            _mileageController,
            'e.g. 50000',
            isDark,
            keyboardType: TextInputType.number,
            required: false,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            'VIN (Optional)',
            _vinController,
            'Enter VIN number',
            isDark,
            required: false,
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleFinalSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: _accentPurple,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Save Vehicle'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    String hint,
    bool isDark, {
    TextInputType? keyboardType,
    bool required = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: required
              ? (v) => (v == null || v.isEmpty) ? 'Required' : null
              : null,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: isDark ? Colors.black : Colors.grey.shade100,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: isDark
                  ? BorderSide(color: Colors.grey.shade900)
                  : BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField(
    String label,
    String? value,
    List<String> items,
    Function(String?) onChanged,
    bool isDark,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: isDark ? Colors.black : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: isDark ? Border.all(color: Colors.grey.shade900) : null,
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              dropdownColor: isDark ? Colors.black : Colors.white,
              items: items
                  .map((i) => DropdownMenuItem(value: i, child: Text(i)))
                  .toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}
