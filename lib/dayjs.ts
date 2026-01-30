import baseDayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

baseDayjs.extend(utc);
baseDayjs.extend(timezone);
baseDayjs.tz.setDefault('Europe/Amsterdam');

export const dayjs = baseDayjs;

export function formatDateTime(value: string | number | Date) {
  return dayjs(value).tz().format('DD.MM.YYYY HH:mm');
}
