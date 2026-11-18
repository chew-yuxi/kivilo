const _months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/// "12 Oct 2026", in the phone's time zone.
String shortDate(String iso) {
  final date = DateTime.parse(iso).toLocal();
  return '${date.day} ${_months[date.month - 1].substring(0, 3)} ${date.year}';
}

/// "October 2026", for grouping a feed by month.
String monthYear(String iso) {
  final date = DateTime.parse(iso).toLocal();
  return '${_months[date.month - 1]} ${date.year}';
}

/// An agreed calendar date: do not shift it into the phone's time zone.
String calendarDate(String value) {
  final date = DateTime.parse(value);
  return '${date.day} ${_months[date.month - 1].substring(0, 3)} ${date.year}';
}

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
