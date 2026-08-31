import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:http/http.dart' as http;

import '../models/user.dart';
import '../core/api_client.dart';
import '../core/app_colors.dart';
import '../core/env.dart';
import '../core/form_validation.dart';
import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../widgets/customer_drawer.dart';
import '../widgets/guest_login_prompt.dart';
import '../core/socket_sync.dart';
import '../widgets/global_sync_refresh.dart';
import '../utils/location_helper.dart';
import '../services/vehicle_service.dart';
import '../core/places_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Color get _accentPurple => const Color(0xFF3B82F6);

  int? _vehicleCount;
  bool _isAddAddressSheetOpen = false;

  @override
  void initState() {
    super.initState();
    _loadVehicleCount();
  }

  Future<void> _loadVehicleCount({bool forceRefresh = false}) async {
    try {
      final vehicles = await VehicleService().listMyVehicles(
        forceRefresh: forceRefresh,
      );
      if (mounted) {
        setState(() => _vehicleCount = vehicles.length);
      }
    } catch (_) {
      // Leave count as-is (loading/unknown) on failure.
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    // Resolve against the *effective* theme, not just the stored preference —
    // when the preference is ThemeMode.system this reflects the device's
    // current brightness and updates automatically if it changes.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final theme = Theme.of(context);

    return GlobalSyncRefresh(
      entities: SyncEntities.profile,
      onSync: () {
        if (!mounted) return;
        context.read<AuthProvider>().refreshUser();
        _loadVehicleCount(forceRefresh: true);
      },
      child: PopScope(
        canPop: Navigator.of(context).canPop(),
        onPopInvokedWithResult: (didPop, _) {
          if (didPop) return;
          Navigator.of(
            context,
          ).pushNamedAndRemoveUntil('/customer', (route) => false);
        },
        child: Scaffold(
          backgroundColor: isDark
              ? AppColors.backgroundPrimary
              : AppColors.backgroundPrimaryLight,
          drawer: const CustomerDrawer(currentRouteName: '/profile'),
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            centerTitle: true,
            leading: Builder(
              builder: (context) => Padding(
                padding: const EdgeInsets.all(8.0),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.28)
                          : Colors.black.withValues(alpha: 0.16),
                      width: 1.0,
                    ),
                  ),
                  child: IconButton(
                    icon: Icon(
                      Icons.menu,
                      size: 20,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    tooltip: 'Menu',
                    onPressed: () => Scaffold.of(context).openDrawer(),
                  ),
                ),
              ),
            ),
            title: Text(
              'Profile',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black,
                fontWeight: FontWeight.w800,
              ),
            ),
            actions: [
              if (user != null)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.28)
                            : Colors.black.withValues(alpha: 0.16),
                        width: 1.0,
                      ),
                    ),
                    child: IconButton(
                      icon: Icon(
                        Icons.edit_note_rounded,
                        size: 20,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      tooltip: 'Edit Profile',
                      onPressed: () => _editProfile(context, user),
                    ),
                  ),
                ),
            ],
          ),
          body: user == null
              ? const GuestLoginPrompt(
                  title: 'Your profile',
                  message:
                      'Log in to manage your account, addresses, and preferences.',
                )
              : SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            RepaintBoundary(
                              child: _buildProfileHeader(context, user, isDark),
                            ),
                            const SizedBox(height: 28),
                            RepaintBoundary(
                              child: _buildStatsRow(context, user, isDark),
                            ),
                            const SizedBox(height: 32),
                            if (user.addresses.isNotEmpty) ...[
                              _SectionHeader(
                                title: 'Saved Addresses',
                                icon: Icons.map_rounded,
                                onAdd: () => _addAddress(context, user),
                              ),
                              const SizedBox(height: 12),
                              RepaintBoundary(
                                child: Column(
                                  children: [
                                    ...user.addresses.map(
                                      (a) => _AddressCard(
                                        address: a,
                                        onDelete: () =>
                                            _deleteAddress(context, user, a),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ] else
                              RepaintBoundary(
                                child: _AddAddressCard(
                                  isDark: isDark,
                                  onTap: () => _addAddress(context, user),
                                ),
                              ),

                            const SizedBox(height: 32),
                            Text(
                              'Settings & Preferences',
                              style: theme.textTheme.titleSmall?.copyWith(
                                color: isDark ? Colors.white70 : Colors.black54,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            RepaintBoundary(
                              child: _buildAppearanceSettingsItem(
                                context: context,
                                isDark: isDark,
                                themeProvider: themeProvider,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _buildDeleteAccountButton(context, isDark),
                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, User? user, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: isDark
              ? AppColors.borderColor
              : Colors.black.withValues(alpha: 0.08),
          width: isDark ? 1 : 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
            blurRadius: 30,
            offset: const Offset(0, 15),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            user?.name ?? 'Guest User',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 16),
          _buildProfileInfoRow(
            context,
            icon: Icons.email_outlined,
            label: user?.email ?? 'Sign in to sync data',
            isDark: isDark,
          ),
          if (user?.phone != null && user!.phone!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildProfileInfoRow(
              context,
              icon: Icons.phone_outlined,
              label: user.phone!,
              isDark: isDark,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProfileInfoRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: _accentPurple.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 15, color: _accentPurple),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: isDark ? Colors.white70 : Colors.black87,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(BuildContext context, User? user, bool isDark) {
    return Row(
      children: [
        _buildStatItem(
          context,
          'Addresses',
          user?.addresses.length.toString() ?? '0',
          Icons.location_on_rounded,
          isDark,
        ),

        const SizedBox(width: 12),
        _buildStatItem(
          context,
          'Vehicles',
          _vehicleCount?.toString() ?? '—',
          Icons.directions_car_rounded,
          isDark,
        ),
      ],
    );
  }

  Widget _buildStatItem(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    bool isDark,
  ) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.backgroundSecondary
              : AppColors.backgroundSecondaryLight,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isDark
                ? AppColors.borderColor
                : Colors.black.withValues(alpha: 0.08),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.07),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _accentPurple.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: _accentPurple, size: 20),
            ),
            const SizedBox(height: 14),
            Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: -1,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.white54 : Colors.black54,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppearanceSettingsItem({
    required BuildContext context,
    required bool isDark,
    required ThemeProvider themeProvider,
  }) {
    final subtitle = switch (themeProvider.mode) {
      ThemeMode.light => 'Light Mode',
      ThemeMode.dark => 'Dark Mode',
      ThemeMode.system => 'System Default',
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        border: Border.all(
          color: isDark
              ? AppColors.borderColor
              : Colors.black.withValues(alpha: 0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.06),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (isDark ? Colors.white : Colors.black).withValues(
                    alpha: 0.06,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                  color: isDark ? Colors.white : Colors.black,
                  size: 22,
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Appearance',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white38 : Colors.black38,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _ThemeOptionChip(
                label: 'Light',
                icon: Icons.light_mode_rounded,
                isDark: isDark,
                selected: themeProvider.mode == ThemeMode.light,
                onTap: () => themeProvider.setThemeMode(ThemeMode.light),
              ),
              const SizedBox(width: 8),
              _ThemeOptionChip(
                label: 'Dark',
                icon: Icons.dark_mode_rounded,
                isDark: isDark,
                selected: themeProvider.mode == ThemeMode.dark,
                onTap: () => themeProvider.setThemeMode(ThemeMode.dark),
              ),
              const SizedBox(width: 8),
              _ThemeOptionChip(
                label: 'System',
                icon: Icons.settings_suggest_rounded,
                isDark: isDark,
                selected: themeProvider.mode == ThemeMode.system,
                onTap: () => themeProvider.setThemeMode(ThemeMode.system),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeleteAccountButton(BuildContext context, bool isDark) {
    return OutlinedButton.icon(
      onPressed: () => _showDeleteAccountConfirmation(context),
      icon: const Icon(Icons.delete_outline_rounded, size: 22),
      label: const Text(
        'Delete Account',
        style: TextStyle(
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
          fontSize: 15,
        ),
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.red.shade700,
        side: BorderSide(color: Colors.red.shade300, width: 1.5),
        minimumSize: const Size(double.infinity, 64),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: isDark
            ? Colors.red.withValues(alpha: 0.08)
            : Colors.red.withValues(alpha: 0.04),
      ),
    );
  }

  Future<void> _showDeleteAccountConfirmation(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account?'),
        content: const Text(
          'This will permanently delete your profile, vehicles, and '
          'notifications. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );

    if (result != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final auth = context.read<AuthProvider>();
    final ok = await auth.deleteAccount();
    if (!context.mounted) return;

    if (ok) {
      Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(auth.lastError ?? 'Failed to delete account'),
        ),
      );
    }
  }

  Future<void> _editProfile(BuildContext context, User? user) async {
    if (user == null) return;
    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone);
    final formKey = GlobalKey<FormState>();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Edit Profile',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: nameController,
                maxLength: FormValidation.maxNameLength,
                validator: FormValidation.validateName,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                validator: FormValidation.validatePhone,
                decoration: const InputDecoration(
                  labelText: 'Phone',
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  try {
                    await context.read<AuthProvider>().updateProfile(
                      name: nameController.text.trim(),
                      phone: FormValidation.digitsOnly(phoneController.text),
                    );
                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                  } catch (e) {
                    if (context.mounted) {
                      final msg = e is ApiException
                          ? e.message
                          : e.toString().replaceFirst('Exception: ', '');
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text(msg)));
                    }
                  }
                },
                child: const Text('Save Changes'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _addAddress(BuildContext context, User? user) async {
    if (user == null) return;
    // Guard against a double-tap opening two overlapping bottom sheets.
    if (_isAddAddressSheetOpen) return;
    _isAddAddressSheetOpen = true;
    try {
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _AddAddressSheet(user: user),
      );
    } finally {
      _isAddAddressSheetOpen = false;
    }
  }

  Future<void> _deleteAddress(
    BuildContext context,
    User? user,
    SavedAddress address,
  ) async {
    if (user == null) return;
    final newList = List<SavedAddress>.from(user.addresses);
    newList.remove(address);
    try {
      await context.read<AuthProvider>().updateProfile(addresses: newList);
    } catch (e) {
      if (context.mounted) {
        final msg = e is ApiException
            ? e.message
            : e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onAdd;

  const _SectionHeader({
    required this.title,
    required this.icon,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (isDark ? Colors.white : Colors.black).withValues(
              alpha: 0.05,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 18,
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        const Spacer(),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onAdd,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: (isDark ? Colors.white : Colors.black).withValues(
                  alpha: 0.05,
                ),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: (isDark ? Colors.white : Colors.black).withValues(
                    alpha: 0.05,
                  ),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.add_rounded,
                    size: 18,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Add',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddressCard extends StatelessWidget {
  final SavedAddress address;
  final VoidCallback onDelete;

  const _AddressCard({required this.address, required this.onDelete});

  IconData _getIcon() {
    switch (address.label.toLowerCase()) {
      case 'home':
        return Icons.home_rounded;
      case 'work':
        return Icons.business_center_rounded;
      default:
        return Icons.place_rounded;
    }
  }

  Color _getIconColor() {
    switch (address.label.toLowerCase()) {
      case 'home':
        return const Color(0xFF7C3AED); // Purple
      case 'work':
        return const Color(0xFF146EEC); // Blue
      default:
        return const Color(0xFF10B981); // Emerald
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? AppColors.borderColor
              : Colors.black.withValues(alpha: 0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _getIconColor().withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(_getIcon(), color: _getIconColor(), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      address.label,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'DEFAULT',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                            color: Colors.green,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  address.address,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: isDark ? Colors.white38 : Colors.black38,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: onDelete,
            icon: Icon(
              Icons.delete_outline_rounded,
              color: Colors.red.withValues(alpha: 0.7),
              size: 20,
            ),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

class _ThemeOptionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isDark;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeOptionChip({
    required this.label,
    required this.icon,
    required this.isDark,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const accent = AppColors.primaryBlue;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected
                  ? accent.withValues(alpha: 0.14)
                  : (isDark ? Colors.white : Colors.black).withValues(
                      alpha: 0.04,
                    ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected
                    ? accent.withValues(alpha: 0.5)
                    : Colors.transparent,
                width: 1.2,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: selected
                      ? accent
                      : (isDark ? Colors.white54 : Colors.black45),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: selected
                        ? accent
                        : (isDark ? Colors.white54 : Colors.black45),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AddAddressCard extends StatelessWidget {
  final bool isDark;
  final VoidCallback onTap;

  const _AddAddressCard({required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(28),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
          decoration: BoxDecoration(
            color: (isDark ? Colors.white : Colors.black).withValues(
              alpha: 0.02,
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: isDark
                  ? AppColors.borderColor
                  : Colors.black.withValues(alpha: 0.08),
            ),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.add_location_alt_outlined,
                  size: 28,
                  color: AppColors.primaryBlue,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'No saved addresses yet',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.white38 : Colors.black38,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Tap to add your first address',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.primaryBlue,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Add Address bottom sheet content. A dedicated StatefulWidget (rather
/// than an inline StatefulBuilder closure) so it has its own clean Element
/// lifecycle — `mounted`/dispose are unambiguous and every field is real
/// instance state, avoiding the class of reconciliation bugs that ad-hoc
/// closures over mutable locals inside `showModalBottomSheet` are prone to.
class _AddAddressSheet extends StatefulWidget {
  final User user;

  const _AddAddressSheet({required this.user});

  @override
  State<_AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends State<_AddAddressSheet> {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;

  String _label = 'Home';
  LatLng? _selectedLatLng;
  String? _selectedAddress;
  bool _resolvingAddress = false;
  bool _locating = false;
  bool _searching = false;
  List<PlacePrediction> _searchResults = [];
  String _placesSessionToken = PlacesService.newSessionToken();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _useCurrentLocation(silent: true);
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String query) async {
    final q = query.trim();
    if (q.isEmpty) {
      if (mounted) setState(() => _searchResults = []);
      return;
    }
    if (mounted) setState(() => _searching = true);
    try {
      final results = await PlacesService.autocomplete(
        q,
        sessionToken: _placesSessionToken,
        near: _selectedLatLng,
      );
      if (!mounted) return;
      setState(() {
        _searchResults = results;
        _searching = false;
      });
    } on PlacesApiException catch (e) {
      if (!mounted) return;
      setState(() => _searching = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Place search failed: ${e.status}')),
      );
    } catch (e) {
      debugPrint('[Places] search error: $e');
      if (!mounted) return;
      setState(() => _searching = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Place search failed: $e')));
    }
  }

  Future<void> _selectPrediction(PlacePrediction prediction) async {
    FocusManager.instance.primaryFocus?.unfocus();
    _searchController.text = prediction.description;
    setState(() => _searchResults = []);
    final details = await PlacesService.getPlaceDetails(
      prediction.placeId,
      sessionToken: _placesSessionToken,
    );
    // Start a fresh session token now that this search-and-select is done.
    _placesSessionToken = PlacesService.newSessionToken();
    if (details == null) return;
    setState(() {
      _selectedLatLng = details.location;
      _selectedAddress = details.formattedAddress.isNotEmpty
          ? details.formattedAddress
          : prediction.description;
      _resolvingAddress = false;
    });
    _moveMap(details.location, 17);
  }

  void _onSearchChanged(String query) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(
      const Duration(milliseconds: 450),
      () => _runSearch(query),
    );
  }

  void _moveMap(LatLng point, [double? zoom]) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      try {
        _mapController.move(point, zoom ?? _mapController.camera.zoom);
      } catch (_) {
        // Controller not attached yet (e.g. sheet still animating in).
      }
    });
  }

  Future<void> _setSelectedLocation(LatLng next, {double? zoom}) async {
    setState(() {
      _selectedLatLng = next;
      _selectedAddress = null;
      _resolvingAddress = true;
    });
    _moveMap(next, zoom);
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'format': 'jsonv2',
        'lat': next.latitude.toString(),
        'lon': next.longitude.toString(),
      });
      final res = await http.get(
        uri,
        headers: const {'User-Agent': 'CarzziMobile/1.0'},
      );
      if (!mounted) return;
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded['display_name'] is String) {
          setState(() {
            _selectedAddress = decoded['display_name'];
            _resolvingAddress = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _resolvingAddress = false);
    }
  }

  Future<void> _useCurrentLocation({bool silent = false}) async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      bool granted;
      if (silent) {
        final p = await Geolocator.checkPermission();
        granted =
            p == LocationPermission.always || p == LocationPermission.whileInUse;
      } else {
        if (!mounted) return;
        granted = await LocationHelper.ensureLocationAccess(context);
      }
      if (!granted) return;

      // Check for precise location (Android 12+)
      if (!kIsWeb && Platform.isAndroid) {
        final accuracy = await Geolocator.getLocationAccuracy();
        if (accuracy == LocationAccuracyStatus.reduced) {
          debugPrint(
            'MobileApp: Reduced accuracy granted, requesting precise location',
          );
          final permission = await Geolocator.requestPermission();
          if (permission == LocationPermission.denied ||
              permission == LocationPermission.deniedForever) {
            return;
          }
        }
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 15),
      );
      await _setSelectedLocation(LatLng(pos.latitude, pos.longitude), zoom: 18);
    } catch (e) {
      if (!silent && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    final newList = List<SavedAddress>.from(widget.user.addresses);
    newList.add(
      SavedAddress(
        label: _label,
        address: _selectedAddress ?? '',
        lat: _selectedLatLng!.latitude,
        lng: _selectedLatLng!.longitude,
        isDefault: widget.user.addresses.isEmpty,
      ),
    );
    try {
      await context.read<AuthProvider>().updateProfile(addresses: newList);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        final msg = e is ApiException
            ? e.message
            : e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        top: 20,
        left: 20,
        right: 20,
      ),
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Add Address', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: _label,
              decoration: const InputDecoration(
                labelText: 'Label',
                border: OutlineInputBorder(),
              ),
              items: ['Home', 'Work', 'Other']
                  .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                  .toList(),
              onChanged: (v) => setState(() => _label = v!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                labelText: 'Search for a place',
                hintText: 'e.g. Star Hills Enclave',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : (_searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                _searchDebounce?.cancel();
                                setState(() => _searchResults = []);
                              },
                            )
                          : null),
                border: const OutlineInputBorder(),
              ),
            ),
            if (_searchResults.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 220),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.white10 : Colors.grey[300]!,
                  ),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  itemCount: _searchResults.length,
                  separatorBuilder: (_, _) => Divider(
                    height: 1,
                    color: isDark ? Colors.white10 : Colors.grey[300],
                  ),
                  itemBuilder: (context, i) {
                    final prediction = _searchResults[i];
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.place_outlined),
                      title: Text(
                        prediction.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => _selectPrediction(prediction),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Select location on map',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Container(
              height: 250,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? Colors.white10 : Colors.grey[300]!,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: const LatLng(12.9716, 77.5946),
                    initialZoom: 14,
                    onTap: (_, latLng) => _setSelectedLocation(latLng),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: Env.userAgent,
                      tileProvider: CancellableNetworkTileProvider(),
                    ),
                    MarkerLayer(
                      markers: [
                        if (_selectedLatLng != null)
                          Marker(
                            point: _selectedLatLng!,
                            width: 40,
                            height: 40,
                            child: const Icon(
                              Icons.location_on,
                              size: 40,
                              color: Colors.red,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (_selectedAddress != null || _resolvingAddress) ...[
              const SizedBox(height: 12),
              Text(
                _resolvingAddress ? 'Resolving address...' : _selectedAddress!,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
              ),
            ],
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _locating ? null : _useCurrentLocation,
              icon: const Icon(Icons.my_location),
              label: Text(_locating ? 'Locating...' : 'Use my location'),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: (_selectedLatLng == null || _resolvingAddress)
                  ? null
                  : _submit,
              child: const Text('Add Address'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
