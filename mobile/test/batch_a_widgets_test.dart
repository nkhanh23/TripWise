import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tripwise_mobile/core/theme/app_theme.dart';
import 'package:tripwise_mobile/shared/widgets/buttons/tw_button.dart';
import 'package:tripwise_mobile/shared/widgets/buttons/tw_icon_button.dart';
import 'package:tripwise_mobile/shared/widgets/chips/tw_chip.dart';
import 'package:tripwise_mobile/shared/widgets/inputs/tw_search_bar.dart';
import 'package:tripwise_mobile/shared/widgets/inputs/tw_text_field.dart';

Widget _wrapWithTheme(Widget child) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(
      body: Center(child: child),
    ),
  );
}

void main() {
  group('TWButton Tests', () {
    testWidgets('renders label and executes tap callback',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWButton(
            label: 'Explore Trips',
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.text('Explore Trips'), findsOneWidget);
      await tester.tap(find.text('Explore Trips'));
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('does not execute tap when disabled',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWButton(
            label: 'Disabled Action',
            onPressed: null,
          ),
        ),
      );

      await tester.tap(find.text('Disabled Action'));
      await tester.pump();
      expect(tapped, isFalse);
    });

    testWidgets('shows loading indicator when isLoading is true',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          TWButton(
            label: 'Saving...',
            isLoading: true,
            onPressed: () {},
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Saving...'), findsNothing);
    });
  });

  group('TWIconButton Tests', () {
    testWidgets('executes tap callback when enabled',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWIconButton(
            icon: Icons.bookmark_border,
            tooltip: 'Save Place',
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.byIcon(Icons.bookmark_border), findsOneWidget);
      expect(find.byTooltip('Save Place'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.bookmark_border));
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('does not execute tap when disabled',
        (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWIconButton(
            icon: Icons.close,
            onPressed: null,
          ),
        ),
      );

      await tester.tap(find.byIcon(Icons.close));
      await tester.pump();
      expect(tapped, isFalse);
    });
  });

  group('TWTextField Tests', () {
    testWidgets('renders label, hint and responds to user input',
        (WidgetTester tester) async {
      String value = '';
      await tester.pumpWidget(
        _wrapWithTheme(
          TWTextField(
            label: 'Destination',
            hintText: 'e.g. Bangkok, Thailand',
            onChanged: (text) => value = text,
          ),
        ),
      );

      expect(find.text('Destination'), findsOneWidget);
      expect(find.text('e.g. Bangkok, Thailand'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Da Nang');
      await tester.pump();
      expect(value, 'Da Nang');
    });

    testWidgets('displays error text when provided',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWTextField(
            label: 'Email',
            errorText: 'Please enter a valid email address',
          ),
        ),
      );

      expect(find.text('Please enter a valid email address'), findsOneWidget);
    });

    testWidgets('obscures text when obscureText is true',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWTextField(
            label: 'Password',
            obscureText: true,
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, isTrue);
    });
  });

  group('TWSearchBar Tests', () {
    testWidgets('renders search icon, hint, and invokes query callback',
        (WidgetTester tester) async {
      String query = '';
      await tester.pumpWidget(
        _wrapWithTheme(
          TWSearchBar(
            hintText: 'Search attractions...',
            onQueryChanged: (text) => query = text,
          ),
        ),
      );

      expect(find.byIcon(Icons.search), findsOneWidget);
      expect(find.text('Search attractions...'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Grand Palace');
      await tester.pump();
      expect(query, 'Grand Palace');
    });

    testWidgets('triggers filter tap when filter button is tapped',
        (WidgetTester tester) async {
      bool filterTapped = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWSearchBar(
            onFilterTap: () => filterTapped = true,
          ),
        ),
      );

      expect(find.byIcon(Icons.tune), findsOneWidget);
      await tester.tap(find.byIcon(Icons.tune));
      await tester.pump();
      expect(filterTapped, isTrue);
    });
  });

  group('TWChip Tests', () {
    testWidgets('renders label and handles onSelected toggle',
        (WidgetTester tester) async {
      bool selected = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWChip(
            label: 'Temples',
            isSelected: false,
            onSelected: (val) => selected = val,
          ),
        ),
      );

      expect(find.text('Temples'), findsOneWidget);
      await tester.tap(find.text('Temples'));
      await tester.pump();
      expect(selected, isTrue);
    });

    testWidgets('renders check icon when filter chip is selected',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapWithTheme(
          const TWChip(
            label: 'Top Rated',
            variant: TWChipVariant.filter,
            isSelected: true,
          ),
        ),
      );

      expect(find.byIcon(Icons.check), findsOneWidget);
      expect(find.text('Top Rated'), findsOneWidget);
    });

    testWidgets('does not handle tap when disabled',
        (WidgetTester tester) async {
      bool selected = false;
      await tester.pumpWidget(
        _wrapWithTheme(
          TWChip(
            label: 'Disabled Category',
            enabled: false,
            onSelected: (val) => selected = val,
          ),
        ),
      );

      await tester.tap(find.text('Disabled Category'));
      await tester.pump();
      expect(selected, isFalse);
    });
  });
}
