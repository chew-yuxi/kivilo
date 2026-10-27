import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:number_flow_flutter/number_flow_flutter.dart';

Widget _screen(NumberFlow flow) => MaterialApp(
  home: Scaffold(body: Center(child: flow)),
);

void main() {
  testWidgets('upload percentage can leave the screen during a digit exit', (
    tester,
  ) async {
    await tester.pumpWidget(
      _screen(const NumberFlow(value: 100, suffix: '% · ', tabularNums: true)),
    );
    await tester.pumpWidget(
      _screen(const NumberFlow(value: 9, suffix: '% · ', tabularNums: true)),
    );
    await tester.pump(const Duration(milliseconds: 20));

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('upload size can finish during a unit and digit transition', (
    tester,
  ) async {
    NumberFlow uploaded(num value, String unit) => NumberFlow(
      value: value,
      format: const NumberFlowFormat.decimal(minFraction: 1, maxFraction: 1),
      suffix: ' $unit of 2.0 MB',
      tabularNums: true,
    );

    await tester.pumpWidget(_screen(uploaded(999.9, 'KB')));
    await tester.pumpWidget(_screen(uploaded(1.0, 'MB')));
    await tester.pump(const Duration(milliseconds: 20));

    // A completed queue row disappears as soon as registration succeeds.
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('room review count can leave during a suffix transition', (
    tester,
  ) async {
    await tester.pumpWidget(
      _screen(
        const NumberFlow(
          value: 3,
          suffix: '/10 rooms reviewed',
          tabularNums: true,
        ),
      ),
    );
    await tester.pumpWidget(
      _screen(
        const NumberFlow(
          value: 3,
          suffix: '/9 rooms reviewed',
          tabularNums: true,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 20));

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('rapid digit removal and revival settles and remains usable', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      for (final value in [100, 9, 100, 8, 101, 7]) {
        await tester.pumpWidget(
          _screen(NumberFlow(value: value, suffix: '% · ', tabularNums: true)),
        );
        await tester.pump(const Duration(milliseconds: 10));
      }
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('7'), findsOneWidget);

      await tester.pumpWidget(
        _screen(const NumberFlow(value: 99, suffix: '% · ', tabularNums: true)),
      );
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('99'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('continued progress updates do not restart exiting digits', (
    tester,
  ) async {
    NumberFlow flow(num value) => NumberFlow(
      value: value,
      tabularNums: true,
      opacityTiming: const TimingConfig(
        duration: Duration(milliseconds: 100),
        curve: Curves.linear,
      ),
    );
    await tester.pumpWidget(_screen(flow(1000)));
    await tester.pumpWidget(_screen(flow(9)));
    final dynamic state = tester.state(find.byType(NumberFlow));
    // Three removed digits and the thousands separator share the same fade.
    expect(state.exitingKeys, hasLength(4));
    await tester.pump(const Duration(milliseconds: 40));
    await tester.pumpWidget(_screen(flow(8)));
    expect(state.exitingKeys, hasLength(4));
    await tester.pump(const Duration(milliseconds: 50));
    expect(state.exitingKeys, hasLength(4));
    // The first exit began 110ms ago; another progress update must not extend
    // its 100ms fade or cancel its cleanup early.
    await tester.pump(const Duration(milliseconds: 20));
    expect(state.exitingKeys, isEmpty);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(
      _screen(const NumberFlow(value: 1000, tabularNums: true)),
    );
    await tester.pumpAndSettle();
    await tester.pumpWidget(const SizedBox.shrink());
    expect(tester.takeException(), isNull);
  });

  testWidgets('changed digits still roll and settle after the lifecycle fix', (
    tester,
  ) async {
    await tester.pumpWidget(_screen(const NumberFlow(value: 12)));
    await tester.pumpWidget(_screen(const NumberFlow(value: 13)));
    await tester.pump(const Duration(milliseconds: 20));
    final dynamic state = tester.state(find.byType(NumberFlow));
    expect(state.animatingDigitKeys, hasLength(1));
    await tester.pumpAndSettle();
    expect(state.animatingDigitKeys, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a revived digit can exit again before cancellation completes', (
    tester,
  ) async {
    final value = ValueNotifier<num>(100);
    try {
      await tester.pumpWidget(
        _screen(NumberFlow.scrub(value: value, tabularNums: true)),
      );
      value.value = 9;
      value.value = 100;
      value.value = 8;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      value.value = 100;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    } finally {
      value.dispose();
    }
  });

  for (final reduceMotion in [false, true]) {
    testWidgets(
      '${reduceMotion ? 'Reduced motion' : 'Disabling animation'} completes an in-flight digit exit',
      (tester) async {
        Widget flow(num value, {bool disableAnimation = false}) => MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              disableAnimations: reduceMotion && disableAnimation,
            ),
            child: NumberFlow(
              value: value,
              animated: reduceMotion || !disableAnimation,
              tabularNums: true,
            ),
          ),
        );

        await tester.pumpWidget(flow(100));
        await tester.pumpWidget(flow(9));
        await tester.pump(const Duration(milliseconds: 20));
        await tester.pumpWidget(flow(8, disableAnimation: true));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'leaving while removed digits are still rolling stops every ticker',
    (tester) async {
      for (final value in [111, 999, 9]) {
        await tester.pumpWidget(_screen(NumberFlow(value: value)));
        await tester.pump(const Duration(milliseconds: 20));
      }

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('completed digit exits keep the next value paintable', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(_screen(const NumberFlow(value: 100)));
      await tester.pumpWidget(_screen(const NumberFlow(value: 9)));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('9'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(_screen(const NumberFlow(value: 99)));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('99'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    } finally {
      semantics.dispose();
    }
  });
}
