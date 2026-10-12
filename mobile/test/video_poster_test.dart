import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/video_screen.dart';

void main() {
  Widget tile(String? posterUrl) => MaterialApp(
    home: SizedBox(
      width: 120,
      height: 90,
      child: VideoPoster(posterUrl: posterUrl),
    ),
  );

  testWidgets('a video with no poster yet keeps the camcorder icon', (
    tester,
  ) async {
    await tester.pumpWidget(tile(null));
    expect(find.byIcon(Icons.videocam_outlined), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('a video with a poster shows it under a play badge', (
    tester,
  ) async {
    await tester.pumpWidget(tile('https://example.test/poster.jpg'));
    expect(find.byType(Image), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
  });
}
