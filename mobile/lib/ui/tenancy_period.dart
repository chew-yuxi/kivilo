import 'package:flutter/material.dart';
import 'kivilo_components.dart';

DateTime tenancyEndDate(DateTime start, int years) =>
    DateTime(start.year + years, start.month, start.day - 1);

const tenancyYears = [1, 2, 3];

int matchingTenancyYears(DateTime start, DateTime end) =>
    tenancyYears.firstWhere(
      (years) => DateUtils.isSameDay(tenancyEndDate(start, years), end),
      orElse: () => 0,
    );

Future<DateTime?> pickTenancyDate(
  BuildContext context,
  DateTime selected, {
  DateTime? earliest,
}) {
  final first = DateTime(2000);
  final last = DateTime(2100, 12, 31);
  return showDatePicker(
    context: context,
    initialDate: selected,
    firstDate: earliest ?? (selected.isBefore(first) ? selected : first),
    lastDate: selected.isAfter(last) ? selected : last,
  );
}

class TenancyLengthPicker extends StatelessWidget {
  const TenancyLengthPicker({super.key, required this.years, this.onChanged});
  final int years;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) => KiviloSelectField<int>(
    label: 'Tenancy length',
    sheetTitle: 'Choose tenancy length',
    value: years,
    enabled: onChanged != null,
    options: const [
      KiviloSelectOption(value: 1, label: '1 year'),
      KiviloSelectOption(value: 2, label: '2 years'),
      KiviloSelectOption(value: 3, label: '3 years'),
      KiviloSelectOption(value: 0, label: 'Custom dates'),
    ],
    onChanged: (value) => onChanged?.call(value),
  );
}
