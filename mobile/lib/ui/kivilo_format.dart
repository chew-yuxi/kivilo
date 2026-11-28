import 'package:intl/intl.dart';

import '../l10n/l10n.dart';

/// "12 Oct 2026", in the phone's time zone.
String shortDate(String iso) => DateFormat(
  t.dateShortPattern,
  t.localeName,
).format(DateTime.parse(iso).toLocal());

/// "October 2026", for grouping a feed by month.
String monthYear(String iso) => DateFormat(
  t.dateMonthYearPattern,
  t.localeName,
).format(DateTime.parse(iso).toLocal());

/// An agreed calendar date: do not shift it into the phone's time zone.
String calendarDate(String value) =>
    DateFormat(t.dateShortPattern, t.localeName).format(DateTime.parse(value));

/// The currency the server sends beside every amount, "SGD" or "MYR". A copy of a
/// response saved on this phone before currencies existed holds none, and every such
/// copy is Singapore's.
String currencyOf(Map<String, dynamic> json) =>
    json['currency'] as String? ?? 'SGD';

/// A property's country, "SG" or "MY", on the same terms as [currencyOf].
String countryOf(Map<String, dynamic> json) =>
    json['country'] as String? ?? 'SG';

/// "S$" or "RM": written straight before an amount, and as an amount field's prefix.
String currencySymbol(String currency) => currency == 'MYR' ? 'RM' : 'S\$';

/// "S$1200.00" or "RM1200.00".
String money(num amount, String currency) =>
    '${currencySymbol(currency)}${amount.toStringAsFixed(2)}';

/// "Singapore" or "Malaysia", for wording such as where a deadline's day ends.
String countryName(String country) =>
    country == 'MY' ? 'Malaysia' : 'Singapore';

/// The currency a property's money is in, from its country.
String currencyFor(String country) => country == 'MY' ? 'MYR' : 'SGD';

/// The register an agent's number is on: CEA in Singapore, REN in Malaysia. Agent
/// wording follows the agent's own country; a report header follows its property's.
String registrationName(String? country) => country == 'MY' ? 'REN' : 'CEA';
