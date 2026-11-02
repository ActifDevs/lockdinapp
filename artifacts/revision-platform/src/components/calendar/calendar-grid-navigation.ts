import {
  addDays,
  addWeeks,
  endOfWeek,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
} from "date-fns";

function calendarDay(value: Date): Date {
  return startOfDay(value);
}

export function moveCalendarFocus(
  current: Date,
  key: string,
  rangeStart: Date,
  rangeEnd: Date,
): Date | null {
  let next: Date;
  switch (key) {
    case "ArrowLeft":
      next = addDays(current, -1);
      break;
    case "ArrowRight":
      next = addDays(current, 1);
      break;
    case "ArrowUp":
      next = addWeeks(current, -1);
      break;
    case "ArrowDown":
      next = addWeeks(current, 1);
      break;
    case "Home":
      next = startOfWeek(current, { weekStartsOn: 1 });
      break;
    case "End":
      next = startOfDay(endOfWeek(current, { weekStartsOn: 1 }));
      break;
    default:
      return null;
  }

  next = calendarDay(next);
  if (isBefore(next, calendarDay(rangeStart)) || isAfter(next, calendarDay(rangeEnd))) {
    return null;
  }
  return next;
}
