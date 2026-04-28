import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api_client.dart';
import '../../services/auth_service.dart';
import '../../models/user.dart';
import '../../widgets/merchant/merchant_nav.dart';
import '../../core/app_colors.dart';

class MerchantProfilePage extends StatefulWidget {
  const MerchantProfilePage({super.key});

  @override
  State<MerchantProfilePage> createState() => _MerchantProfilePageState();
}

class _MerchantProfilePageState extends State<MerchantProfilePage> {
  final AuthService _authService = AuthService();
  final ApiClient _api = ApiClient();
  StaffUser? _user;
  bool _isLoading = true;

  Future<UserLocation?> _pickCurrentLocationAddress() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw ApiException(
        statusCode: 400,
        message: 'Location services are disabled',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw ApiException(statusCode: 403, message: 'Location permission denied');
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    String address = '${position.latitude}, ${position.longitude}';
    try {
      final reverse = await _api.getAny(
        '/tracking/reverse?lat=${position.latitude}&lng=${position.longitude}',
      );
      if (reverse is Map && reverse['display_name'] != null) {
        address = reverse['display_name'].toString();
      }
    } catch (_) {}

    return UserLocation(
      address: address,
      lat: position.latitude,
      lng: position.longitude,
    );
  }

  Future<void> _showEditProfileDialog() async {
    if (_user == null) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameController = TextEditingController(text: _user!.name);
    final phoneController = TextEditingController(text: _user!.phone ?? '');
    final addressController = TextEditingController(
      text: _user!.location?.address ?? '',
    );
    double? selectedLat = _user!.location?.lat;
    double? selectedLng = _user!.location?.lng;
    bool isPickingLocation = false;

    final didSave =
        await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          backgroundColor: isDark ? const Color(0xFF0B1220) : Colors.white,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (context) => StatefulBuilder(
            builder: (context, setModalState) => Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 8,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Edit Profile',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameController,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Shop/Owner Name',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: addressController,
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Address',
                        labelStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                        ),
                        filled: true,
                        fillColor: isDark
                            ? const Color(0xFF111827)
                            : const Color(0xFFF9FAFB),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                            color: isDark
                                ? const Color(0xFF374151)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 1.4,
                          ),
                        ),
                        suffixIcon: IconButton(
                          tooltip: 'Use current location',
                          onPressed: isPickingLocation
                              ? null
                              : () async {
                                  setModalState(() => isPickingLocation = true);
                                  try {
                                    final location =
                                        await _pickCurrentLocationAddress();
                                    if (location != null) {
                                      addressController.text =
                                          location.address ?? '';
                                      selectedLat = location.lat;
                                      selectedLng = location.lng;
                                    }
                                  } catch (e) {
                                    if (!mounted) return;
                                    final message = e is ApiException
                                        ? e.message
                                        : 'Failed to fetch current location';
                                    ScaffoldMessenger.of(
                                      context,
                                    ).showSnackBar(SnackBar(content: Text(message)));
                                  } finally {
                                    if (context.mounted) {
                                      setModalState(() => isPickingLocation = false);
                                    }
                                  }
                                },
                          icon: isPickingLocation
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Icon(
                                  Icons.my_location_rounded,
                                  color: isDark
                                      ? const Color(0xFF93C5FD)
                                      : const Color(0xFF2563EB),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context, false),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: isDark
                                  ? Colors.white
                                  : const Color(0xFF1F2937),
                              side: BorderSide(
                                color: isDark
                                    ? const Color(0xFF6B7280)
                                    : const Color(0xFFD1D5DB),
                              ),
                            ),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Save'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ) ??
        false;

    if (!didSave) return;
    setState(() => _isLoading = true);
    try {
      final trimmedName = nameController.text.trim();
      final trimmedPhone = phoneController.text.trim();
      final trimmedAddress = addressController.text.trim();
      final payload = <String, dynamic>{
        if (trimmedName.isNotEmpty) 'name': trimmedName,
        'phone': trimmedPhone,
        'location': {
          'address': trimmedAddress,
          'lat': selectedLat,
          'lng': selectedLng,
        },
      };
      await _authService.updateProfile(payload);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      final message = e is ApiException ? e.message : 'Failed to update profile';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _isLoading = true);
    try {
      final user = await _authService.getCurrentUser(forceRefresh: true);
      if (mounted) {
        setState(() {
          _user = user;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return MerchantScaffold(
      title: 'Merchant Profile',
      actions: [
        IconButton(
          tooltip: 'Edit Profile',
          onPressed: _isLoading ? null : _showEditProfileDialog,
          icon: const Icon(Icons.edit_outlined),
        ),
      ],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _user == null
          ? Center(
              child: Text(
                'User not found',
                style: TextStyle(
                  fontSize: 16,
                  color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                ),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.backgroundSecondary : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark
                        ? AppColors.borderColor
                        : const Color(0xFFE5E7EB),
                  ),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: isDark
                          ? AppColors.backgroundSurface
                          : const Color(0xFFE0EAFF),
                      child: Icon(
                        Icons.store_rounded,
                        size: 48,
                        color: isDark
                            ? AppColors.primaryBlue
                            : const Color(0xFF2563EB),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _user!.name,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF111827),
                      ),
                    ),
                    Text(
                      _user!.role.toUpperCase(),
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? AppColors.primaryBlue
                            : const Color(0xFF2563EB),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Divider(height: 1),
                    const SizedBox(height: 24),
                    _ProfileDetailItem(
                      icon: Icons.email_outlined,
                      label: 'Email Address',
                      value: _user!.email,
                      isDark: isDark,
                    ),
                    const SizedBox(height: 16),
                    _ProfileDetailItem(
                      icon: Icons.phone_android_rounded,
                      label: 'Phone Number',
                      value: _user!.phone ?? 'Not provided',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 16),
                    if (_user!.subRole != null) ...[
                      const SizedBox(height: 16),
                      _ProfileDetailItem(
                        icon: Icons.work_outline_rounded,
                        label: 'Department',
                        value: _user!.subRole!,
                        isDark: isDark,
                      ),
                    ],
                    if (_user!.location?.address != null) ...[
                      const SizedBox(height: 16),
                      _ProfileDetailItem(
                        icon: Icons.location_on_outlined,
                        label: 'Address',
                        value: _user!.location!.address!,
                        isDark: isDark,
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          await _authService.logout();
                          if (!mounted) return;
                          Navigator.pushNamedAndRemoveUntil(
                            context,
                            '/login',
                            (route) => false,
                          );
                        },
                        icon: const Icon(
                          Icons.logout_rounded,
                          color: AppColors.error,
                        ),
                        label: const Text(
                          'Logout',
                          style: TextStyle(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(
                            color: isDark
                                ? AppColors.error.withValues(alpha: 0.45)
                                : AppColors.error.withValues(alpha: 0.25),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _ProfileDetailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _ProfileDetailItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSurface
                : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: isDark ? Colors.grey[400] : const Color(0xFF4B5563),
            size: 20,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.white : const Color(0xFF111827),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
