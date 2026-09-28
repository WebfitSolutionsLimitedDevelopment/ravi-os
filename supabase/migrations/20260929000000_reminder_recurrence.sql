-- Repeating reminders. recurrence_pattern / recurrence_end_date already
-- existed; recurrence_start anchors the series so monthly reminders on the
-- 29th-31st return to their day after a short month.
alter table public.ravi_os_reminders
  add column if not exists recurrence_start date;

update public.ravi_os_reminders
  set recurrence_start = event_date
  where recurrence_pattern is not null and recurrence_start is null;

alter table public.ravi_os_reminders
  drop constraint if exists ravi_os_reminders_recurrence_pattern_check;
alter table public.ravi_os_reminders
  add constraint ravi_os_reminders_recurrence_pattern_check
  check (recurrence_pattern is null or recurrence_pattern in ('daily','weekly','fortnightly','monthly','yearly'));
