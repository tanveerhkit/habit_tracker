import { eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export function getWeeksInMonth(currentDate: Date): Date[][] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get the start of the week for the first day of the month (Sunday start)
  const start = startOfWeek(monthStart, { weekStartsOn: 0 });
  // Get the end of the week for the last day of the month
  const end = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start, end });

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  calendarDays.forEach(day => {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}
