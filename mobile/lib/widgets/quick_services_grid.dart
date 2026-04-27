import 'package:flutter/material.dart';
import 'package:app/core/app_spacing.dart';
import 'package:app/widgets/quick_service_card.dart';

class QuickServicesGrid extends StatelessWidget {
  const QuickServicesGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = screenWidth > 600 ? 3 : 2;

    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.medium),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: AppSpacing.medium,
        mainAxisSpacing: AppSpacing.medium,
        childAspectRatio: 0.8, // Adjusted for card content
      ),
      itemCount: 10, // Placeholder for now
      itemBuilder: (context, index) {
        return QuickServiceCard(
          icon: Icons.car_repair,
          title: 'Service $index',
          subtitle: 'Description for service $index',
          price: '\$${(index + 1) * 10}',
          category: index % 2 == 0 ? 'Popular' : null,
        );
      },
    );
  }
}
