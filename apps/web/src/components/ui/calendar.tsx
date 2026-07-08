import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors'
        ),
        button_next: cn(
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center',
        weeks: 'w-full',
        week: 'flex w-full mt-2',
        day: 'flex-1 text-center text-sm p-0 relative',
        day_button: cn(
          'h-9 w-9 p-0 font-normal mx-auto flex items-center justify-center rounded-md',
          'hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer'
        ),
        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md',
        today: 'bg-accent text-accent-foreground rounded-md',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50 cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
