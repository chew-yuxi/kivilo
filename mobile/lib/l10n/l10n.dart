import 'dart:io';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:path_provider/path_provider.dart';

import 'app_localizations.dart';

export 'app_localizations.dart';

/// The app's words in the chosen language.
///
/// Read without a BuildContext, because much of what a person reads is made outside a
/// widget: an [ApiFailure]'s message, a model's status label, a notification. English
/// until [AppLanguage.load] runs, which is also what every widget test reads.
AppLocalizations t = lookupAppLocalizations(const Locale('en'));

/// The language setting. It belongs to the phone, not the account: two people sharing
/// a phone share its language, as they share its other settings.
class AppLanguage {
  AppLanguage._();

  static const _pilot = bool.fromEnvironment('KIVILO_LANGUAGE_PILOT', defaultValue: kDebugMode);
  static const codes = _pilot ? ['en', 'zh', 'th'] : ['en'];

  /// A code from [codes], or null to follow the phone.
  static final choice = ValueNotifier<String?>(null);

  static Locale locale = const Locale('en');

  static Future<File> _file() async =>
      File('${(await getApplicationSupportDirectory()).path}/language');

  static Future<void> load() async {
    await initializeDateFormatting();
    final file = await _file();
    final saved = await file.exists() ? (await file.readAsString()).trim() : '';
    choice.value = codes.contains(saved) ? saved : null;
    resolve(PlatformDispatcher.instance.locales);
  }

  static Future<void> select(String? code) async {
    final file = await _file();
    if (code == null) {
      if (await file.exists()) await file.delete();
    } else {
      await file.writeAsString(code);
    }
    choice.value = code;
  }

  static String? _reported;

  /// Tells the server the language in use, once per account and language, so the
  /// notifications and emails written for this person are in it too. A failure is
  /// tried again on the next resume.
  static Future<void> report(
    Future<void> Function(String locale) save,
    String userId,
  ) async {
    final reported = '$userId:${locale.languageCode}';
    if (_reported == reported) return;
    await save(locale.languageCode);
    _reported = reported;
  }

  /// The chosen language, or the first of the phone's languages the app speaks.
  static Locale resolve(List<Locale> phone) {
    final code =
        (codes.contains(choice.value) ? choice.value : null) ??
        phone
            .map((locale) => locale.languageCode)
            .firstWhere(codes.contains, orElse: () => 'en');
    locale = Locale(code);
    t = lookupAppLocalizations(locale);
    return locale;
  }
}
