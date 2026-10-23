import 'package:intl/intl.dart';

import '../l10n/l10n.dart';

/// "12 Oct 2026", in the phone's time zone.
String shortDate(String iso) =>
    DateFormat(t.dateShortPattern, t.localeName).format(DateTime.parse(iso).toLocal());

/// "October 2026", for grouping a feed by month.
String monthYear(String iso) => DateFormat(
  t.dateMonthYearPattern,
  t.localeName,
).format(DateTime.parse(iso).toLocal());

/// An agreed calendar date: do not shift it into the phone's time zone.
String calendarDate(String value) =>
    DateFormat(t.dateShortPattern, t.localeName).format(DateTime.parse(value));
