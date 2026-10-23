import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class KiviloColors {
  KiviloColors._();

  static const pink = Color(0xFFEC4899);
  static const pinkDark = Color(0xFFBE185D);
  static const pinkSoft = Color(0xFFFDF2F8);
  static const ink = Color(0xFF111827);
  static const body = Color(0xFF374151);
  static const muted = Color(0xFF6B7280);
  static const subtle = Color(0xFF9CA3AF);
  static const border = Color(0xFFE5E7EB);
  static const canvas = Color(0xFFF9FAFB);
  static const green = Color(0xFF047857);
  static const greenSoft = Color(0xFFECFDF5);
  static const amber = Color(0xFF92400E);
  static const amberSoft = Color(0xFFFFFBEB);
  static const red = Color(0xFFB91C1C);
  static const redSoft = Color(0xFFFEF2F2);
  static const greenBorder = Color(0xFFA7F3D0);
  static const amberBorder = Color(0xFFFDE68A);
  static const redBorder = Color(0xFFFECACA);
  static const pinkBorder = Color(0xFFFBCFE8);
  static const field = Color(0xFFD1D5DB);
  static const disabled = Color(0xFFF3F4F6);
}

/// Deleting from a page is a red outlined button; confirming it in a drawer is red filled.
final kiviloDangerOutlined = OutlinedButton.styleFrom(
  foregroundColor: KiviloColors.red,
  side: const BorderSide(color: KiviloColors.red),
);
final kiviloDangerFilled = FilledButton.styleFrom(
  backgroundColor: KiviloColors.red,
  foregroundColor: Colors.white,
);

ThemeData buildKiviloTheme() {
  final colors = ColorScheme.fromSeed(
    seedColor: KiviloColors.pink,
    primary: KiviloColors.pink,
    onPrimary: Colors.white,
    surface: Colors.white,
    onSurface: KiviloColors.ink,
    surfaceTint: Colors.transparent,
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: KiviloColors.canvas,
    surfaceContainer: KiviloColors.canvas,
    surfaceContainerHigh: const Color(0xFFF3F4F6),
    surfaceContainerHighest: const Color(0xFFF3F4F6),
    error: KiviloColors.red,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colors,
    scaffoldBackgroundColor: Colors.white,
    textTheme: ThemeData.light().textTheme.copyWith(
      headlineLarge: const TextStyle(
        color: KiviloColors.ink,
        fontSize: 30,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.7,
      ),
      headlineMedium: const TextStyle(
        color: KiviloColors.ink,
        fontSize: 25,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.45,
      ),
      headlineSmall: const TextStyle(
        color: KiviloColors.ink,
        fontSize: 22,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
      ),
      titleLarge: const TextStyle(
        color: KiviloColors.ink,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.25,
      ),
      titleMedium: const TextStyle(
        color: KiviloColors.ink,
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: const TextStyle(
        color: KiviloColors.body,
        fontSize: 16,
        height: 1.45,
      ),
      bodyMedium: const TextStyle(
        color: KiviloColors.body,
        fontSize: 14,
        height: 1.4,
      ),
      bodySmall: const TextStyle(
        color: KiviloColors.muted,
        fontSize: 12,
        height: 1.35,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: KiviloColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: true,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: TextStyle(
        color: KiviloColors.ink,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: KiviloColors.pink,
      unselectedItemColor: KiviloColors.subtle,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      unselectedLabelStyle: TextStyle(fontSize: 12),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: KiviloColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: KiviloColors.pink, width: 2),
      ),
      labelStyle: const TextStyle(color: KiviloColors.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: KiviloColors.pink,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: KiviloColors.pinkDark,
        side: const BorderSide(color: Color(0xFF9CA3AF)),
        minimumSize: const Size(0, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: KiviloColors.pinkDark,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        side: const BorderSide(color: Color(0xFFD1D5DB)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    dividerTheme: const DividerThemeData(color: KiviloColors.border),
    dialogTheme: const DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.white,
      modalBackgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
    ),
  );
}
