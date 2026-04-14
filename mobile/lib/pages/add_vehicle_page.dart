import 'package:flutter/material.dart';
import '../../services/vehicle_service.dart';
import '../../core/app_colors.dart';

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
  final _variantController = TextEditingController();
  final _registrationDateController = TextEditingController();
  final _yearController = TextEditingController(
    text: DateTime.now().year.toString(),
  );
  final _colorController = TextEditingController();
  final _frontTyresController = TextEditingController();
  final _rearTyresController = TextEditingController();
  final _batteryDetailsController = TextEditingController();
  String _type = 'Car';
  String _fuelType = 'Petrol';

  @override
  void initState() {
    super.initState();
    _makeController.addListener(_onVehicleInfoChanged);
    _modelController.addListener(_onVehicleInfoChanged);
    _variantController.addListener(_onVehicleInfoChanged);
  }

  @override
  void dispose() {
    _makeController.removeListener(_onVehicleInfoChanged);
    _modelController.removeListener(_onVehicleInfoChanged);
    _variantController.removeListener(_onVehicleInfoChanged);
    _licensePlateController.dispose();
    _makeController.dispose();
    _modelController.dispose();
    _variantController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _frontTyresController.dispose();
    _rearTyresController.dispose();
    _batteryDetailsController.dispose();
    super.dispose();
  }

  void _onVehicleInfoChanged() {
    final make = _makeController.text.trim();
    final model = _modelController.text.trim();
    final variant = _variantController.text.trim();

    if (make.isNotEmpty && model.isNotEmpty && variant.isNotEmpty) {
      // Debounce logic could be added here, but for simplicity:
      _fetchReferenceData(make, model, variant);
    }
  }

  bool _isFetchingRef = false;
  Future<void> _fetchReferenceData(
    String make,
    String model,
    String variant,
  ) async {
    if (_isFetchingRef) return;
    setState(() => _isFetchingRef = true);
    try {
      final ref = await _service.searchReference(
        make: make,
        model: model,
        variant: variant.isNotEmpty ? variant : null,
      );
      if (ref != null) {
        if (ref['front_tyres'] != null) {
          _frontTyresController.text = ref['front_tyres'].toString();
        }
        if (ref['rear_tyres'] != null) {
          _rearTyresController.text = ref['rear_tyres'].toString();
        }
        if (ref['battery_details'] != null) {
          _batteryDetailsController.text = ref['battery_details'].toString();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch reference: $e');
    } finally {
      if (mounted) setState(() => _isFetchingRef = false);
    }
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
          _variantController.text = details['variant']?.toString() ?? '';
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
        registrationDate: _registrationDateController.text.trim(),
        fuelType: _fuelType,
        frontTyres: _frontTyresController.text.trim(),
        rearTyres: _rearTyresController.text.trim(),
        batteryDetails: _batteryDetailsController.text.trim(),
      );
      _service.clearCache();
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
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: const Text('Add Vehicle'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildStepIndicator(),
            const SizedBox(height: 32),
            if (_step == 1) _buildStep1() else _buildStep2(),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Row(
      children: [
        _indicatorCircle(1, _step >= 1),
        Expanded(
          child: Divider(
            color: _step >= 2 ? AppColors.primaryBlue : AppColors.borderColor,
            thickness: 2,
          ),
        ),
        _indicatorCircle(2, _step >= 2),
      ],
    );
  }

  Widget _indicatorCircle(int num, bool active) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: active
            ? const LinearGradient(
                colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
              )
            : null,
        color: active ? null : AppColors.backgroundSecondary,
        border: active ? null : Border.all(color: AppColors.borderColor),
        boxShadow: active
            ? [
                BoxShadow(
                  color: AppColors.primaryBlue.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Center(
        child: Text(
          num.toString(),
          style: TextStyle(
            color: active ? AppColors.textPrimary : AppColors.textSecondary,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Enter Registration Number',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'We will try to fetch your vehicle details automatically.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 32),
        TextField(
          controller: _licensePlateController,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'e.g. MH12AB1234',
            hintStyle: const TextStyle(color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.backgroundSecondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primaryBlue,
                width: 2,
              ),
            ),
          ),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        AppColors.primaryBlue,
                        AppColors.primaryBlueDark,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton(
                    onPressed: _isFetching ? null : _handleRegNoSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      foregroundColor: AppColors.textPrimary,
                    ),
                    child: _isFetching
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: AppColors.textPrimary,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Next',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = 2),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: const BorderSide(color: AppColors.borderColor),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Manual'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Confirm Vehicle Details',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 24),
          _buildTextField(
            'Registration Number',
            _licensePlateController,
            'e.g. MH12AB1234',
            textCapitalization: TextCapitalization.characters,
          ),
          const SizedBox(height: 16),
          _buildTextField('Brand', _makeController, 'e.g. Toyota'),
          const SizedBox(height: 16),
          _buildTextField('Model', _modelController, 'e.g. Camry'),
          const SizedBox(height: 16),
          _buildTextField(
            'Variant/Class (Optional)',
            _variantController,
            'e.g. VXI / SUV',
            required: false,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            'Registration Date (DD-MM-YYYY)',
            _registrationDateController,
            'e.g. 15-08-2022',
            required: false,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  'Year',
                  _yearController,
                  'e.g. 2022',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildTextField('Color', _colorController, 'e.g. White'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Additional Info',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          _buildDropdownField('Fuel Type', _fuelType, [
            'Petrol',
            'Diesel',
            'Electric',
            'Hybrid',
            'CNG',
          ], (v) => setState(() => _fuelType = v!)),
          const SizedBox(height: 32),
          Container(
            width: double.infinity,
            height: 54,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleFinalSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: AppColors.textPrimary,
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: AppColors.textPrimary,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      'Save Vehicle',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    String hint, {
    TextInputType? keyboardType,
    bool required = true,
    TextCapitalization textCapitalization = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          style: const TextStyle(color: AppColors.textPrimary),
          validator: required
              ? (v) => (v == null || v.isEmpty) ? 'Required' : null
              : null,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.backgroundSecondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primaryBlue,
                width: 2,
              ),
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
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              dropdownColor: AppColors.backgroundSurface,
              style: const TextStyle(color: AppColors.textPrimary),
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
