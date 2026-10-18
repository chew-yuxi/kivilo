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
