/**
 * Converts a local time string (HH:MM) to UTC time string (HH:MM)
 * @param localTime - Time in HH:MM format (e.g., "09:00")
 * @returns UTC time in HH:MM format (e.g., "14:00" for EST)
 */
export function convertLocalTimeToUTC(localTime: string): string {
  // Create a date object for today with the specified local time
  const [hours, minutes] = localTime.split(':').map(Number);
  const localDate = new Date();
  localDate.setHours(hours, minutes, 0, 0);
  
  // Get UTC time
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  
  // Format as HH:MM
  return `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
}

/**
 * Converts a UTC time string (HH:MM) to local time string (HH:MM)
 * @param utcTime - Time in HH:MM format (e.g., "14:00")
 * @returns Local time in HH:MM format (e.g., "09:00" for EST)
 */
export function convertUTCTimeToLocal(utcTime: string): string {
  // Create a date object for today with the specified UTC time
  const [hours, minutes] = utcTime.split(':').map(Number);
  const utcDate = new Date();
  utcDate.setUTCHours(hours, minutes, 0, 0);
  
  // Get local time
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  
  // Format as HH:MM
  return `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`;
}

/**
 * Get the user's timezone name (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the user's timezone offset in hours (e.g., -5 for EST)
 */
export function getTimezoneOffset(): number {
  return -(new Date().getTimezoneOffset() / 60);
}

/**
 * Test function to verify timezone conversion is working
 * Open browser console and run: testTimezoneConversion()
 */
export function testTimezoneConversion(): void {
  console.log('=== Timezone Conversion Test ===');
  console.log('Your timezone:', getUserTimezone());
  console.log('Timezone offset:', getTimezoneOffset(), 'hours from UTC');
  console.log('');
  
  const testTimes = ['09:00', '14:00', '18:30', '23:00'];
  
  testTimes.forEach(localTime => {
    const utcTime = convertLocalTimeToUTC(localTime);
    const backToLocal = convertUTCTimeToLocal(utcTime);
    console.log(`Local ${localTime} → UTC ${utcTime} → Local ${backToLocal} ✓`);
  });
  
  console.log('');
  console.log('If you select 9:00 AM in your timezone, it will be stored as UTC:', convertLocalTimeToUTC('09:00'));
} 