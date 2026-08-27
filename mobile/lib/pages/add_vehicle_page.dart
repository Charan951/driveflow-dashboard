import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_colors.dart';
import '../../core/form_validation.dart';
import '../../services/vehicle_service.dart';

class AddVehiclePage extends StatefulWidget {
  const AddVehiclePage({super.key});

  @override
  State<AddVehiclePage> createState() => _AddVehiclePageState();
}

class _AddVehiclePageState extends State<AddVehiclePage> {
  final _service = VehicleService();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;

  final _licensePlateController = TextEditingController();
  final _frontTyresController = TextEditingController();
  final _rearTyresController = TextEditingController();
  final _batteryDetailsController = TextEditingController();
  final _pickupDropPriceController = TextEditingController();
  final String _type = 'Car';
  String? _fuelType = 'Petrol';

  static const _fuelTypeOptions = ['Petrol', 'Diesel', 'EV'];

  // Brand → Model → Variant are dropdowns sourced from the Vehicle
  // Reference Data catalog (admin-managed) instead of free text, so
  // customers only ever pick models the workshop actually has priced.
  List<Map<String, dynamic>> _allReferences = [];
  bool _isLoadingReferences = false;
  String? _selectedBrand;
  String? _selectedModel;
  String? _selectedVariant;

  @override
  void initState() {
    super.initState();
    _loadReferenceCatalog();
  }

  @override
  void dispose() {
    _licensePlateController.dispose();
    _frontTyresController.dispose();
    _rearTyresController.dispose();
    _batteryDetailsController.dispose();
    _pickupDropPriceController.dispose();
    super.dispose();
  }

  Future<void> _loadReferenceCatalog() async {
    setState(() => _isLoadingReferences = true);
    try {
      final refs = await _service.listAllReferences();
      if (mounted) setState(() => _allReferences = refs);
    } catch (e) {
      debugPrint('Failed to load vehicle reference catalog: $e');
    } finally {
      if (mounted) setState(() => _isLoadingReferences = false);
    }
  }

  List<String> get _brandOptions {
    final set = <String>{};
    for (final r in _allReferences) {
      final b = (r['brand_name'] ?? '').toString().trim();
      if (b.isNotEmpty) set.add(b);
    }
    return set.toList()..sort();
  }

  List<String> get _modelOptions {
    if (_selectedBrand == null) return [];
    final set = <String>{};
    for (final r in _allReferences) {
      if ((r['brand_name'] ?? '').toString() == _selectedBrand) {
        final m = (r['model'] ?? '').toString().trim();
        if (m.isNotEmpty) set.add(m);
      }
    }
    return set.toList()..sort();
  }

  List<String> get _variantOptions {
    if (_selectedBrand == null || _selectedModel == null) return [];
    final set = <String>{};
    for (final r in _allReferences) {
      if ((r['brand_name'] ?? '').toString() == _selectedBrand &&
          (r['model'] ?? '').toString() == _selectedModel) {
        final v = (r['brand_model'] ?? '').toString().trim();
        if (v.isNotEmpty) set.add(v);
      }
    }
    return set.toList()..sort();
  }

  Map<String, dynamic>? get _matchedReference {
    if (_selectedBrand == null || _selectedModel == null) return null;
    for (final r in _allReferences) {
      final matchesVariant =
          _selectedVariant == null ||
          (r['brand_model'] ?? '').toString() == _selectedVariant;
      if ((r['brand_name'] ?? '').toString() == _selectedBrand &&
          (r['model'] ?? '').toString() == _selectedModel &&
          matchesVariant) {
        return r;
      }
    }
    return null;
  }

  void _onBrandChanged(String? value) {
    setState(() {
      _selectedBrand = value;
      _selectedModel = null;
      _selectedVariant = null;
    });
  }

  void _onModelChanged(String? value) {
    setState(() {
      _selectedModel = value;
      _selectedVariant = null;
    });
    _applyReferenceAutofill();
  }

  void _onVariantChanged(String? value) {
    setState(() => _selectedVariant = value);
    _applyReferenceAutofill();
  }

  void _applyReferenceAutofill() {
    final ref = _matchedReference;
    if (ref == null) return;
    setState(() {
      if (ref['front_tyres'] != null) {
        _frontTyresController.text = ref['front_tyres'].toString();
      }
      if (ref['rear_tyres'] != null) {
        _rearTyresController.text = ref['rear_tyres'].toString();
      }
      if (ref['battery_details'] != null) {
        _batteryDetailsController.text = ref['battery_details'].toString();
      }
      if (ref['pickup_drop_price'] != null) {
        _pickupDropPriceController.text = ref['pickup_drop_price'].toString();
      }
      final fuel = _normalizeFuelType(ref['fuel_type']?.toString());
      if (fuel != null) {
        _fuelType = fuel;
      }
    });
  }

  String? _normalizeFuelType(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v == 'petrol') return 'Petrol';
    if (v == 'diesel') return 'Diesel';
    if (v == 'ev' || v == 'electric') return 'EV';
    return null;
  }

  /// Matches a free-text value (e.g. from RC lookup) against the given
  /// catalog options case-insensitively, so it can populate a dropdown
  /// without violating Flutter's "value must be one of items" requirement.
  String? _matchOption(String? raw, List<String> options) {
    final v = (raw ?? '').trim();
    if (v.isEmpty) return null;
    for (final o in options) {
      if (o.toLowerCase() == v.toLowerCase()) return o;
    }
    return null;
  }

  Future<void> _handleFinalSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedBrand == null ||
        _selectedModel == null ||
        _selectedVariant == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a brand, model and variant'),
        ),
      );
      return;
    }
    if (_fuelType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a fuel type')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _service.addVehicle(
        licensePlate: _licensePlateController.text.trim().toUpperCase(),
        make: _selectedBrand!,
        model: _selectedModel!,
        variant: _selectedVariant,
        type: _type,
        fuelType: _fuelType,
        frontTyres: _frontTyresController.text.trim(),
        rearTyres: _rearTyresController.text.trim(),
        batteryDetails: _batteryDetailsController.text.trim(),
        pickupDropPrice: _pickupDropPriceController.text.trim(),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark
          ? AppColors.backgroundPrimary
          : AppColors.backgroundPrimaryLight,
      appBar: AppBar(
        centerTitle: true,
        title: Text(
          'Add Vehicle',
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: _buildForm(),
      ),
    );
  }

  Widget _buildForm() {
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
          if (_isLoadingReferences && _allReferences.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else ...[
            _buildAutocompleteField(
              key: const ValueKey('brand-field'),
              label: 'Brand',
              options: _brandOptions,
              selectedValue: _selectedBrand,
              onSelected: _onBrandChanged,
              hint: 'Type to search brand',
              required: true,
            ),
            const SizedBox(height: 16),
            _buildAutocompleteField(
              // Resetting the key when the brand changes forces the field to
              // rebuild with a fresh internal controller, clearing stale text.
              key: ValueKey('model-field-$_selectedBrand'),
              label: 'Model',
              options: _modelOptions,
              selectedValue: _selectedModel,
              onSelected: _onModelChanged,
              hint: _selectedBrand == null
                  ? 'Select brand first'
                  : 'Type to search model',
              enabled: _selectedBrand != null,
              required: true,
            ),
            const SizedBox(height: 16),
            _buildAutocompleteField(
              key: ValueKey('variant-field-$_selectedBrand-$_selectedModel'),
              label: 'Variant/Class',
              options: _variantOptions,
              selectedValue: _selectedVariant,
              onSelected: _onVariantChanged,
              hint: _selectedModel == null
                  ? 'Select model first'
                  : 'Type to search variant',
              enabled: _selectedModel != null,
              required: true,
            ),
          ],
          const SizedBox(height: 16),
          _buildDropdownField(
            'Fuel Type',
            _fuelType,
            _fuelTypeOptions,
            (v) => setState(() => _fuelType = v),
            hint: 'Select fuel type',
            required: true,
          ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
          inputFormatters: keyboardType == TextInputType.number
              ? [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ]
              : [
                  LengthLimitingTextInputFormatter(
                    FormValidation.maxVehicleFieldLength,
                  ),
                ],
          style: TextStyle(
            color: isDark ? AppColors.textPrimary : Colors.black87,
          ),
          validator: (v) {
            if (label == 'Registration Number') {
              return FormValidation.validateLicensePlate(v);
            }
            if (label == 'Year') {
              return FormValidation.validateVehicleYear(v);
            }
            return FormValidation.validateVehicleTextField(
              v,
              required: required,
            );
          },
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark ? AppColors.textMuted : AppColors.textMutedLight,
            ),
            filled: true,
            fillColor: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundSecondaryLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark
                    ? AppColors.borderColor
                    : AppColors.borderColorLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark
                    ? AppColors.borderColor
                    : AppColors.borderColorLight,
              ),
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
    Function(String?) onChanged, {
    String? hint,
    bool required = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final enabled = items.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          required ? '$label *' : label,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundSecondaryLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? AppColors.borderColor
                  : AppColors.borderColorLight,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              hint: Text(
                hint ?? 'Select',
                style: TextStyle(
                  color: isDark
                      ? AppColors.textMuted
                      : AppColors.textMutedLight,
                ),
              ),
              dropdownColor: isDark
                  ? AppColors.backgroundSurface
                  : AppColors.backgroundSurfaceLight,
              style: TextStyle(
                color: isDark ? AppColors.textPrimary : Colors.black87,
              ),
              items: items
                  .map((i) => DropdownMenuItem(value: i, child: Text(i)))
                  .toList(),
              onChanged: enabled ? onChanged : null,
            ),
          ),
        ),
      ],
    );
  }

  /// Type-to-search field: filters [options] as the user types and shows a
  /// suggestion list, instead of requiring an open-then-scroll dropdown.
  /// Pass a `key` that changes whenever the field should reset (e.g. when
  /// its parent selection changes), since [Autocomplete] owns its internal
  /// controller and won't otherwise pick up an external value change.
  Widget _buildAutocompleteField({
    Key? key,
    required String label,
    required List<String> options,
    required String? selectedValue,
    required ValueChanged<String?> onSelected,
    String? hint,
    bool required = false,
    bool enabled = true,
  }) {
    return _SearchableDropdownField(
      key: key,
      label: label,
      options: options,
      selectedValue: selectedValue,
      onSelected: onSelected,
      hint: hint,
      required: required,
      enabled: enabled,
      matchOption: _matchOption,
    );
  }
}

/// A text field that shows a filterable dropdown of [options] as soon as
/// it's focused (not just once the user has typed something) — the full
/// list on focus, narrowing as they type. Built on a self-owned
/// FocusNode + OverlayEntry rather than [Autocomplete], since Autocomplete
/// only recomputes its options list on a text *change* event, so it never
/// has anything to show on the very first focus of an empty field.
class _SearchableDropdownField extends StatefulWidget {
  final String label;
  final List<String> options;
  final String? selectedValue;
  final ValueChanged<String?> onSelected;
  final String? hint;
  final bool required;
  final bool enabled;
  final String? Function(String? raw, List<String> options) matchOption;

  const _SearchableDropdownField({
    super.key,
    required this.label,
    required this.options,
    required this.selectedValue,
    required this.onSelected,
    required this.matchOption,
    this.hint,
    this.required = false,
    this.enabled = true,
  });

  @override
  State<_SearchableDropdownField> createState() =>
      _SearchableDropdownFieldState();
}

class _SearchableDropdownFieldState extends State<_SearchableDropdownField> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _fieldKey = GlobalKey();
  OverlayEntry? _overlayEntry;
  List<String> _filtered = const [];

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.selectedValue ?? '');
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    _removeOverlay();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      _updateFilteredAndShow(_controller.text);
    } else {
      _removeOverlay();
    }
  }

  void _updateFilteredAndShow(String query) {
    if (!widget.enabled) return;
    final q = query.trim().toLowerCase();
    _filtered = q.isEmpty
        ? widget.options
        : widget.options.where((o) => o.toLowerCase().startsWith(q)).toList();
    if (_filtered.isEmpty) {
      _removeOverlay();
      return;
    }
    if (_overlayEntry == null) {
      _overlayEntry = _buildOverlayEntry();
      Overlay.of(context).insert(_overlayEntry!);
    } else {
      _overlayEntry!.markNeedsBuild();
    }
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _selectOption(String option) {
    _controller.text = option;
    _controller.selection = TextSelection.collapsed(offset: option.length);
    widget.onSelected(option);
    _removeOverlay();
    _focusNode.unfocus();
  }

  OverlayEntry _buildOverlayEntry() {
    return OverlayEntry(
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final renderBox =
            _fieldKey.currentContext?.findRenderObject() as RenderBox?;
        final width = renderBox?.size.width ?? 280;
        return Positioned(
          width: width,
          child: CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            offset: const Offset(0, 56),
            child: Align(
              alignment: Alignment.topLeft,
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(12),
                color: isDark
                    ? AppColors.backgroundSurface
                    : AppColors.backgroundSurfaceLight,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shrinkWrap: true,
                    itemCount: _filtered.length,
                    itemBuilder: (context, index) {
                      final option = _filtered[index];
                      return InkWell(
                        onTap: () => _selectOption(option),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Text(
                            option,
                            style: TextStyle(
                              color: isDark
                                  ? AppColors.textPrimary
                                  : Colors.black87,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  void didUpdateWidget(covariant _SearchableDropdownField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedValue != oldWidget.selectedValue &&
        widget.selectedValue != _controller.text) {
      _controller.text = widget.selectedValue ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.required ? '${widget.label} *' : widget.label,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        CompositedTransformTarget(
          key: _fieldKey,
          link: _layerLink,
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            enabled: widget.enabled,
            style: TextStyle(
              color: isDark ? AppColors.textPrimary : Colors.black87,
            ),
            onChanged: (v) {
              if (v.trim().isEmpty && widget.selectedValue != null) {
                widget.onSelected(null);
              }
              // Auto-accept an exact (case-insensitive) match without
              // forcing the user to tap the suggestion.
              final match = widget.matchOption(v, widget.options);
              if (match != null && match != widget.selectedValue) {
                widget.onSelected(match);
              }
              _updateFilteredAndShow(v);
            },
            decoration: InputDecoration(
              hintText: widget.enabled
                  ? (widget.hint ?? 'Type to search')
                  : widget.hint,
              hintStyle: TextStyle(
                color: isDark ? AppColors.textMuted : AppColors.textMutedLight,
              ),
              suffixIcon: Icon(
                Icons.keyboard_arrow_down,
                color: widget.enabled
                    ? (isDark
                          ? AppColors.textMuted
                          : AppColors.textMutedLight)
                    : (isDark
                          ? AppColors.textMuted.withValues(alpha: 0.4)
                          : AppColors.textMutedLight.withValues(alpha: 0.4)),
              ),
              filled: true,
              fillColor: isDark
                  ? AppColors.backgroundSecondary
                  : AppColors.backgroundSecondaryLight,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? AppColors.borderColor
                      : AppColors.borderColorLight,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? AppColors.borderColor
                      : AppColors.borderColorLight,
                ),
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
        ),
      ],
    );
  }
}
