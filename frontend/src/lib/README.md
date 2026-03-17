# Time-Based Greeting System

## Overview
The application now includes a dynamic greeting system that displays appropriate greetings based on the current time in Indian Standard Time (IST).

## Features

### Dynamic Greetings
The system automatically displays different greetings based on the time of day:

- **🌅 Good Morning!** - 5:00 AM to 11:59 AM IST
- **☀️ Good Afternoon!** - 12:00 PM to 4:59 PM IST  
- **🌆 Good Evening!** - 5:00 PM to 8:59 PM IST
- **🌙 Good Night!** - 9:00 PM to 4:59 AM IST

### Auto-Update
The greeting automatically updates every minute without requiring a page refresh, ensuring users always see the current appropriate greeting.

## Implementation

### Location
The time-based greeting is currently implemented in:
- `frontend/src/pages/customer/DashboardPage.tsx` - Main customer dashboard

### Utility Functions
Time utilities are available in `frontend/src/lib/timeUtils.ts`:

```typescript
import { getTimeBasedGreeting, getCurrentISTTime, formatISTTime } from '@/lib/timeUtils';

// Get current greeting
const greeting = getTimeBasedGreeting();

// Get current IST time
const istTime = getCurrentISTTime();

// Format time in IST
const formattedTime = formatISTTime(new Date());
```

### Usage Example
```typescript
const [greeting, setGreeting] = useState(getTimeBasedGreeting());

useEffect(() => {
  const updateGreeting = () => {
    setGreeting(getTimeBasedGreeting());
  };

  // Update every minute
  const interval = setInterval(updateGreeting, 60000);
  return () => clearInterval(interval);
}, []);
```

## Testing
Unit tests are available in `frontend/src/lib/__tests__/timeUtils.test.ts` to verify the greeting logic works correctly for all time periods.

## Future Enhancements
- Personalized greetings with user names
- Seasonal variations in greetings
- Localization for different languages
- Integration with other dashboard pages (admin, staff, merchant)