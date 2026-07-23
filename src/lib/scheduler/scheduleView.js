export function createScheduleEntryKey(
  dayOfWeek,
  shiftPeriodId,
) {
  return `${dayOfWeek}-${shiftPeriodId}`;
}

export function createScheduleEntriesMap(entries) {
  return new Map(
    entries.map((entry) => [
      createScheduleEntryKey(
        entry.day_of_week,
        entry.shift_period_id,
      ),
      entry,
    ]),
  );
}

export function groupPeriodsByShift(periods) {
  const shiftsMap = new Map();

  for (const period of periods) {
    const shift = period.shift;

    if (!shift?.id) {
      continue;
    }

    if (!shiftsMap.has(shift.id)) {
      shiftsMap.set(shift.id, {
        id: shift.id,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        periods: [],
      });
    }

    shiftsMap.get(shift.id).periods.push(period);
  }

  return Array.from(shiftsMap.values())
    .map((shift) => ({
      ...shift,
      periods: shift.periods.sort(
        (first, second) =>
          first.period_number -
          second.period_number,
      ),
    }))
    .sort((first, second) =>
      String(first.start_time ?? "").localeCompare(
        String(second.start_time ?? ""),
      ),
    );
}

export function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}