import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:http/http.dart' as http;

import '../models/user.dart';
import '../core/app_colors.dart';
import '../core/env.dart';
import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../widgets/customer_drawer.dart';
import '../services/socket_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Color get _accentPurple => const Color(0xFF3B82F6);
  Color get _accentBlue => const Color(0xFF22D3EE);
  late final SocketService _socketService;

  @override
  void initState() {
    super.initState();
    _socketService = SocketService();
    _socketService.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    _socketService.removeListener(_onSocketUpdate);
    super.dispose();
  }

  void _onSocketUpdate() {
    final event = _socketService.value;
    if (event == null) return;

    if ((event.contains('sync:user') || event.contains('sync:vehicle')) &&
        mounted) {
      // Refresh user data through AuthProvider
      context.read<AuthProvider>().refreshUser();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.mode == ThemeMode.dark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final theme = Theme.of(context);

    return PopScope(
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
          automaticallyImplyLeading: false,
          titleSpacing: 16,
          title: Row(
            children: [
              Builder(
                builder: (context) => Container(
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
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    tooltip: 'Menu',
                    onPressed: () => Scaffold.of(context).openDrawer(),
                    constraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 40,
                    ),
                    padding: EdgeInsets.zero,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Profile',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
        body: SingleChildScrollView(
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
                    _SectionHeader(
                      title: 'Saved Addresses',
                      icon: Icons.map_rounded,
                      onAdd: () => _addAddress(context, user),
                    ),
                    const SizedBox(height: 12),
                    RepaintBoundary(
                      child: Column(
                        children: [
                          if (user?.addresses.isEmpty ?? true)
                            const _EmptyState(
                              icon: Icons.location_off_rounded,
                              message: 'No saved addresses yet',
                            )
                          else
                            ...user!.addresses.map(
                              (a) => _AddressCard(
                                address: a,
                                onDelete: () =>
                                    _deleteAddress(context, user, a),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    _SectionHeader(
                      title: 'Payment Methods',
                      icon: Icons.payments_rounded,
                      onAdd: () => _addPaymentMethod(context, user),
                    ),
                    const SizedBox(height: 12),
                    RepaintBoundary(
                      child: Column(
                        children: [
                          if (user?.paymentMethods.isEmpty ?? true)
                            const _EmptyState(
                              icon: Icons.credit_card_off_rounded,
                              message: 'No saved payment methods yet',
                            )
                          else
                            ...user!.paymentMethods.map(
                              (p) => _PaymentCard(
                                method: p,
                                onDelete: () =>
                                    _deletePaymentMethod(context, user, p),
                              ),
                            ),
                        ],
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
                      child: _buildSettingsItem(
                        context: context,
                        isDark: isDark,
                        icon: isDark
                            ? Icons.dark_mode_rounded
                            : Icons.light_mode_rounded,
                        title: 'Appearance',
                        subtitle: isDark ? 'Dark Mode' : 'Light Mode',
                        trailing: Switch.adaptive(
                          value: isDark,
                          activeColor: _accentPurple,
                          onChanged: (_) => themeProvider.toggleTheme(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildLogoutButton(context),
                    const SizedBox(height: 40),
                  ],
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [_accentPurple, _accentBlue]),
            ),
            child: CircleAvatar(
              radius: 35,
              backgroundColor: isDark ? Colors.black : Colors.white,
              child: user?.avatar != null
                  ? ClipOval(child: Image.network(user!.avatar!))
                  : Text(
                      (user?.name.isNotEmpty ?? false)
                          ? user!.name[0].toUpperCase()
                          : 'U',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
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
                const SizedBox(height: 4),
                Text(
                  user?.email ?? 'Sign in to sync data',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
                if (user?.role != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _accentPurple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _accentPurple.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(
                      user!.role!.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: _accentPurple,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _editProfile(context, user),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _accentPurple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.edit_note_rounded,
                  color: _accentPurple,
                  size: 24,
                ),
              ),
            ),
          ),
        ],
      ),
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
          'Payments',
          user?.paymentMethods.length.toString() ?? '0',
          Icons.account_balance_wallet_rounded,
          isDark,
        ),
        const SizedBox(width: 12),
        _buildStatItem(
          context,
          'Vehicles',
          '3', // Mocked for now
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
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.backgroundSecondary
              : AppColors.backgroundSecondaryLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: _accentPurple, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? Colors.white38 : Colors.black38,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsItem({
    required BuildContext context,
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withValues(
                alpha: 0.05,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: isDark ? Colors.white70 : Colors.black87,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white38 : Colors.black38,
                  ),
                ),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: FilledButton.icon(
        onPressed: () async {
          await context.read<AuthProvider>().logout();
          if (!context.mounted) return;
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/login',
            (route) => false,
          );
        },
        icon: const Icon(Icons.logout_rounded, size: 20),
        label: const Text(
          'Logout Account',
          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: Colors.red.withValues(alpha: 0.1),
          foregroundColor: Colors.red,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: Colors.red.withValues(alpha: 0.2)),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  Future<void> _editProfile(BuildContext context, User? user) async {
    if (user == null) return;
    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone);

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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit Profile', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(
                labelText: 'Phone',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                try {
                  await context.read<AuthProvider>().updateProfile(
                    name: nameController.text,
                    phone: phoneController.text,
                  );
                  if (context.mounted) {
                    Navigator.pop(context);
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text('Error: $e')));
                  }
                }
              },
              child: const Text('Save Changes'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Future<void> _addAddress(BuildContext context, User? user) async {
    if (user == null) return;
    final messenger = ScaffoldMessenger.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mapController = MapController();

    String label = 'Home';
    LatLng? selectedLatLng;
    String? selectedAddress;
    var resolvingAddress = false;
    var locating = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> setSelectedLocation(LatLng next) async {
            setModalState(() {
              selectedLatLng = next;
              selectedAddress = null;
              resolvingAddress = true;
            });
            try {
              final zoom = mapController.camera.zoom;
              mapController.move(next, zoom);

              final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
                'format': 'jsonv2',
                'lat': next.latitude.toString(),
                'lon': next.longitude.toString(),
              });
              final res = await http.get(
                uri,
                headers: const {'User-Agent': 'DriveFlowMobile/1.0'},
              );
              if (res.statusCode == 200) {
                final decoded = jsonDecode(res.body);
                if (decoded is Map && decoded['display_name'] is String) {
                  setModalState(() {
                    selectedAddress = decoded['display_name'];
                    resolvingAddress = false;
                  });
                }
              }
            } catch (_) {
              setModalState(() => resolvingAddress = false);
            }
          }

          Future<void> useCurrentLocation() async {
            if (locating) return;
            setModalState(() => locating = true);
            try {
              final enabled = await Geolocator.isLocationServiceEnabled();
              if (!enabled) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('Enable location services to continue'),
                  ),
                );
                return;
              }
              var permission = await Geolocator.checkPermission();
              if (permission == LocationPermission.denied) {
                permission = await Geolocator.requestPermission();
              }
              if (permission == LocationPermission.denied ||
                  permission == LocationPermission.deniedForever) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('Location permission is required'),
                  ),
                );
                return;
              }

              // Check for precise location (Android 12+)
              if (!kIsWeb && Platform.isAndroid) {
                final accuracy = await Geolocator.getLocationAccuracy();
                if (accuracy == LocationAccuracyStatus.reduced) {
                  debugPrint(
                    'MobileApp: Reduced accuracy granted, requesting precise location',
                  );
                  permission = await Geolocator.requestPermission();
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
              await setSelectedLocation(LatLng(pos.latitude, pos.longitude));
              mapController.move(LatLng(pos.latitude, pos.longitude), 18);
            } catch (e) {
              messenger.showSnackBar(SnackBar(content: Text(e.toString())));
            } finally {
              if (context.mounted) {
                setModalState(() => locating = false);
              }
            }
          }

          return Container(
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              top: 20,
              left: 20,
              right: 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Add Address',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  initialValue: label,
                  decoration: const InputDecoration(
                    labelText: 'Label',
                    border: OutlineInputBorder(),
                  ),
                  items: ['Home', 'Work', 'Other']
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (v) => setModalState(() => label = v!),
                ),
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
                      mapController: mapController,
                      options: MapOptions(
                        initialCenter: const LatLng(12.9716, 77.5946),
                        initialZoom: 14,
                        onTap: (_, latLng) => setSelectedLocation(latLng),
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
                            if (selectedLatLng != null)
                              Marker(
                                point: selectedLatLng!,
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
                if (selectedAddress != null || resolvingAddress) ...[
                  const SizedBox(height: 12),
                  Text(
                    resolvingAddress
                        ? 'Resolving address...'
                        : selectedAddress!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: locating ? null : useCurrentLocation,
                  icon: const Icon(Icons.my_location),
                  label: Text(locating ? 'Locating...' : 'Use my location'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: (selectedLatLng == null || resolvingAddress)
                      ? null
                      : () async {
                          final newList = List<SavedAddress>.from(
                            user.addresses,
                          );
                          newList.add(
                            SavedAddress(
                              label: label,
                              address: selectedAddress ?? '',
                              lat: selectedLatLng!.latitude,
                              lng: selectedLatLng!.longitude,
                              isDefault: user.addresses.isEmpty,
                            ),
                          );
                          try {
                            await context.read<AuthProvider>().updateProfile(
                              addresses: newList,
                            );
                            if (context.mounted) {
                              Navigator.pop(context);
                            }
                          } catch (e) {
                            if (context.mounted) {
                              messenger.showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          }
                        },
                  child: const Text('Add Address'),
                ),
                const SizedBox(height: 20),
              ],
            ),
          );
        },
      ),
    );
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _addPaymentMethod(BuildContext context, User? user) async {
    if (user == null) return;
    final labelController = TextEditingController();
    final detailsController = TextEditingController();
    String type = 'card';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Add Payment Method',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                initialValue: type,
                items: ['card', 'upi', 'wallet']
                    .map(
                      (e) => DropdownMenuItem(
                        value: e,
                        child: Text(e.toUpperCase()),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setModalState(() => type = v!),
                decoration: const InputDecoration(
                  labelText: 'Type',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: labelController,
                decoration: const InputDecoration(
                  labelText: 'Label (e.g. HDFC Bank)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: detailsController,
                decoration: const InputDecoration(
                  labelText: 'Details (e.g. **** 1234)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  final newList = List<PaymentMethod>.from(user.paymentMethods);
                  newList.add(
                    PaymentMethod(
                      type: type,
                      label: labelController.text,
                      details: detailsController.text,
                    ),
                  );
                  try {
                    await context.read<AuthProvider>().updateProfile(
                      paymentMethods: newList,
                    );
                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  }
                },
                child: const Text('Add Payment Method'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _deletePaymentMethod(
    BuildContext context,
    User? user,
    PaymentMethod method,
  ) async {
    if (user == null) return;
    final newList = List<PaymentMethod>.from(user.paymentMethods);
    newList.remove(method);
    try {
      await context.read<AuthProvider>().updateProfile(paymentMethods: newList);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
        Icon(icon, size: 20, color: isDark ? Colors.white70 : Colors.black54),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            letterSpacing: -0.3,
          ),
        ),
        const Spacer(),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onAdd,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: (isDark ? Colors.white : Colors.black).withValues(
                  alpha: 0.05,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.add_rounded,
                    size: 16,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Add',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
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
        return Icons.work_rounded;
      default:
        return Icons.location_on_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(_getIcon(), color: Colors.blue, size: 22),
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

class _PaymentCard extends StatelessWidget {
  final PaymentMethod method;
  final VoidCallback onDelete;

  const _PaymentCard({required this.method, required this.onDelete});

  IconData _getIcon() {
    switch (method.type.toLowerCase()) {
      case 'card':
        return Icons.credit_card_rounded;
      case 'upi':
        return Icons.qr_code_rounded;
      case 'wallet':
        return Icons.account_balance_wallet_rounded;
      default:
        return Icons.payments_rounded;
    }
  }

  Color _getColor() {
    switch (method.type.toLowerCase()) {
      case 'card':
        return Colors.purple;
      case 'upi':
        return Colors.orange;
      case 'wallet':
        return Colors.teal;
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundSecondary
            : AppColors.backgroundSecondaryLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _getColor().withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(_getIcon(), color: _getColor(), size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      method.label,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (method.isDefault) ...[
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
                if (method.details != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    method.details!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.white38 : Colors.black38,
                    ),
                  ),
                ],
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

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;

  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      decoration: BoxDecoration(
        color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withValues(
                alpha: 0.04,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 40,
              color: isDark ? Colors.white12 : Colors.black12,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.white38 : Colors.black38,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
