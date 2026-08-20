import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripwise_mobile/core/theme/app_theme.dart';
import 'package:tripwise_mobile/features/dev/component_preview_screen.dart';
import 'package:tripwise_mobile/shared/widgets/avatars/tw_avatar.dart';
import 'package:tripwise_mobile/shared/widgets/feedback/tw_empty_state.dart';
import 'package:tripwise_mobile/shared/widgets/feedback/tw_error_banner.dart';
import 'package:tripwise_mobile/shared/widgets/feedback/tw_loading.dart';
import 'package:tripwise_mobile/shared/widgets/lists/tw_settings_row.dart';

Widget _wrapWithTheme(Widget child) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(
      body: Center(child: child),
    ),
  );
}

void main() {
  group('TWAvatar Tests', () {
    testWidgets('renders initials correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWAvatar(
            initials: 'NK',
            size: TWAvatarSize.md,
          ),
        ),
      );

      expect(find.text('NK'), findsOneWidget);
    });

    testWidgets('renders fallback icon when initials is null',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWAvatar(
            fallbackIcon: Icons.person,
          ),
        ),
      );

      expect(find.byIcon(Icons.person), findsOneWidget);
    });

    testWidgets('renders avatar group with +N overflow indicator',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWAvatarGroup(
            avatars: [
              TWAvatar(initials: 'A1'),
              TWAvatar(initials: 'A2'),
              TWAvatar(initials: 'A3'),
              TWAvatar(initials: 'A4'),
              TWAvatar(initials: 'A5'),
            ],
            maxVisible: 3,
          ),
        ),
      );

      expect(find.text('A1'), findsOneWidget);
      expect(find.text('A2'), findsOneWidget);
      expect(find.text('A3'), findsOneWidget);
      expect(find.text('A4'), findsNothing);
      expect(find.text('+2'), findsOneWidget);
    });
  });

  group('TWEmptyState Tests', () {
    testWidgets('renders title, description and triggers action',
        (WidgetTester tester) async {
      bool actionTriggered = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWEmptyState(
            icon: Icons.flight_takeoff,
            title: 'No Upcoming Trips',
            description: 'Start planning your next adventure today!',
            primaryActionLabel: 'Create Trip',
            onPrimaryAction: () => actionTriggered = true,
          ),
        ),
      );

      expect(find.text('No Upcoming Trips'), findsOneWidget);
      expect(find.text('Start planning your next adventure today!'),
          findsOneWidget);
      expect(find.byIcon(Icons.flight_takeoff), findsOneWidget);

      await tester.tap(find.text('Create Trip'));
      await tester.pump();
      expect(actionTriggered, isTrue);
    });

    testWidgets('renders without action buttons when omitted',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWEmptyState(
            title: 'Empty Search',
            description: 'No destinations found matching your filter.',
          ),
        ),
      );

      expect(find.text('Empty Search'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsNothing);
    });
  });

  group('TWSettingsRow Tests', () {
    testWidgets('renders title, subtitle and chevron',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWSettingsRow(
            title: 'Language',
            subtitle: 'English (US)',
            showChevron: true,
            onTap: () => tapped = true,
          ),
        ),
      );

      expect(find.text('Language'), findsOneWidget);
      expect(find.text('English (US)'), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsOneWidget);

      await tester.tap(find.text('Language'));
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('renders controlled switch and triggers change callback',
        (WidgetTester tester) async {
      bool switchState = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          StatefulBuilder(
            builder: (context, setState) {
              return TWSettingsRow(
                title: 'Dark Mode',
                switchValue: switchState,
                onSwitchChanged: (val) {
                  setState(() => switchState = val);
                },
              );
            },
          ),
        ),
      );

      expect(find.byType(Switch), findsOneWidget);
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      expect(switchState, isTrue);
    });

    testWidgets('does not trigger callback when disabled',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWSettingsRow(
            title: 'Locked Setting',
            enabled: false,
            onTap: () => tapped = true,
          ),
        ),
      );

      await tester.tap(find.text('Locked Setting'));
      await tester.pump();
      expect(tapped, isFalse);
    });
  });

  group('Loading Primitives Tests', () {
    testWidgets('renders TWLoadingIndicator with message',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWLoadingIndicator(
            message: 'Loading places...',
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading places...'), findsOneWidget);
    });

    testWidgets('renders TWSkeleton and TWCardSkeleton without error',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const Column(
            children: [
              TWSkeleton(width: 120, height: 20),
              TWCardSkeleton(),
            ],
          ),
        ),
      );

      expect(find.byType(TWSkeleton), findsNWidgets(5));
    });
  });

  group('Error Feedback Tests', () {
    testWidgets('renders TWErrorBanner and handles retry and dismiss',
        (WidgetTester tester) async {
      bool retried = false;
      bool dismissed = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWErrorBanner(
            title: 'Connection Error',
            message: 'Failed to reach map server.',
            onRetry: () => retried = true,
            onDismiss: () => dismissed = true,
          ),
        ),
      );

      expect(find.text('Connection Error'), findsOneWidget);
      expect(find.text('Failed to reach map server.'), findsOneWidget);

      await tester.tap(find.text('Retry'));
      await tester.pump();
      expect(retried, isTrue);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pump();
      expect(dismissed, isTrue);
    });
  });

  group('ComponentPreviewScreen Tests', () {
    testWidgets('renders catalog screen without throwing exception',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ComponentPreviewScreen(),
        ),
      );

      expect(find.byType(ComponentPreviewScreen), findsOneWidget);
      expect(find.text('TripWise Components Catalog'), findsOneWidget);
      expect(find.text('1. Buttons (TWButton)'), findsOneWidget);
      expect(find.text('2. Icon Buttons (TWIconButton)'), findsOneWidget);
    });
  });
}
