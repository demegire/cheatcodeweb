// ISO week date helper functions
export const getISOWeek = (date: Date): string => {
    const d = new Date(date);
    
    // Set to nearest Thursday (to get correct year for week number)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    
    // Days since Jan 1, counted on calendar dates in UTC so a daylight-saving
    // change between Jan 1 and d can't shift the result by an hour (which
    // pushed weeks forward in places where Jan 1 is in DST, e.g. Australia)
    const dayOfYear = Math.round(
      (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000
    );

    // Calculate week number
    const weekNum = Math.floor(dayOfYear / 7) + 1;
    
    // Return ISO week string
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  };
  
  export const getDateFromISOWeek = (isoWeek: string): Date => {
    const [year, week] = isoWeek.split('-W').map(Number);

    // Jan 4th always falls in ISO week 1, regardless of what day the year starts on
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;

    // Find the Monday of week 1, then add the remaining weeks
    const result = new Date(jan4);
    result.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);

    return result;
  };
  
  export const getWeekDateRange = (isoWeek: string): { start: Date; end: Date } => {
    const mondayDate = getDateFromISOWeek(isoWeek);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    
    return { start: mondayDate, end: sundayDate };
  };
  
  export const formatDateRange = (isoWeek: string): string => {
    const { start, end } = getWeekDateRange(isoWeek);
    
    // Format: "March 10 - March 16"
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  };
  
  export const getCurrentISOWeek = (): string => {
    return getISOWeek(new Date());
  };
  
  export const getRelativeISOWeek = (currentISOWeek: string, offset: number): string => {
    const currentDate = getDateFromISOWeek(currentISOWeek);
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    return getISOWeek(currentDate);
  };

  // Function to get the ISO week containing the first day of a specified month
  export const getMonthFirstWeek = (year: number, month: number): string => {
    // Create a date for the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Get the ISO week containing this date
    return getISOWeek(firstDayOfMonth);
  };