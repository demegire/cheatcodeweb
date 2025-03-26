// ISO week date helper functions
export const getISOWeek = (date: Date): string => {
    const d = new Date(date);
    
    // Set to nearest Thursday (to get correct year for week number)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    
    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1);
    
    // Calculate week number
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    
    // Return ISO week string
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  };
  
  export const getDateFromISOWeek = (isoWeek: string): Date => {
    const [year, week] = isoWeek.split('-W').map(Number);
    
    // Get first day of the year
    const firstDayOfYear = new Date(year, 0, 1);
    
    // Add weeks and adjust to Monday
    const result = new Date(firstDayOfYear);
    result.setDate(firstDayOfYear.getDate() + (week - 1) * 7 - (firstDayOfYear.getDay() || 7) + 1);
    
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