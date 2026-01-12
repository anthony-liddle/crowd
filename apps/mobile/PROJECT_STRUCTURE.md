# Project Structure

Complete file tree and explanation of the React Native Expo application.

## File Tree

```
react-native-expo-app/
├── assets/                         # Static assets
│   ├── splash-megaphone.svg        # Megaphone icon for splash screen
│   ├── icon.png                    # App icon (placeholder)
│   ├── adaptive-icon.png           # Android adaptive icon (placeholder)
│   └── favicon.png                 # Web favicon (placeholder)
│
├── src/                            # Source code directory
│   ├── components/                 # Reusable UI components
│   │   ├── CharacterCounter.tsx    # Character count display component
│   │   ├── EmptyList.tsx           # Empty state component for message feed
│   │   ├── MessageCard.tsx         # Message card display component
│   │   ├── PageHeader.tsx          # Reusable page header with title and subtitle
│   │   ├── SortFeed.tsx            # Sort feed component
│   │   └── ToastConfig.tsx         # Custom toast notification styles
│   │
│   ├── hooks/                     # Custom React hooks
│   │   └── useLocation.ts         # Hook to check location permissions and retrieve location 
│   │
│   ├── navigation/                # Navigation configuration
│   │   └── TabNavigator.tsx       # Bottom tab navigator setup
│   │
│   ├── screens/                   # Screen components
│   │   ├── FeedScreen.tsx         # Message feed screen
│   │   └── CreateMessageScreen.tsx # Message creation form screen
│   │
│   ├── services/                  # API and business logic
│   │   └── api.ts                 # Mock REST API service
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.ts               # Export all types
│   │   ├── location.ts            # Location-related types
│   │   └── message.ts             # Message-related types
│   │
│   └── utils/                     # Utility functions
│       ├── formatters.ts          # Date, time, and distance formatters
│       ├── identity.ts            # User identity management
│       └── storage.ts             # Storage utilities
│
├── app.json                       # Expo configuration
├── App.tsx                        # Root application component
├── babel.config.js                # Babel configuration with NativeWind
├── global.css                     # Tailwind CSS imports
├── index.js                       # Entrypoint to the application
├── metro.config.js                # Metro bundler configuration
├── nativewind-env.d.ts            # TypeScript definitions for NativeWind
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Comprehensive documentation
```

## File Explanations

### Root Files

- **App.tsx**: Root component that sets up navigation, splash screen, and Toast notifications
- **app.json**: Expo configuration including app name, splash screen settings, and platform-specific configs
- **package.json**: Project dependencies, scripts, and metadata
- **tsconfig.json**: TypeScript compiler configuration
- **babel.config.js**: Babel configuration with NativeWind plugin for Tailwind CSS
- **tailwind.config.js**: Tailwind CSS configuration for NativeWind
- **metro.config.js**: Metro bundler configuration for Expo
- **nativewind-env.d.ts**: TypeScript type definitions for NativeWind className prop support
- **global.css**: Tailwind CSS directives import
- **index.js**: Entry point that registers the root App component
- **.gitignore**: Git ignore patterns for node_modules, build files, etc.

### Source Files

#### Components (`src/components/`)

- **MessageCard.tsx**: Displays a single message with text, timestamp, distance, and time left. Uses NativeWind for styling.
- **CharacterCounter.tsx**: Shows character count with color coding (gray/orange/red) based on proximity to limit. Used in CreateMessageScreen.
- **EmptyList.tsx**: Empty state component displayed when no messages exist in the feed. Shows helpful text to pull down to refresh or create a message.
- **PageHeader.tsx**: Reusable page header component with title, optional subtitle, and optional menu slot. Includes safe area padding for top of screen.
- **SortFeed.tsx**: Sort feed component with nearest and soonest options.
- **ToastConfig.tsx**: Custom toast notification configuration with three styled variants (success, error, info). Uses green, red, and blue color schemes respectively with proper typography and shadows.

#### Screens (`src/screens/`)

- **FeedScreen.tsx**: Main feed screen displaying list of messages with pull-to-refresh functionality. Uses FlatList for performance.
- **CreateMessageScreen.tsx**: Form screen for creating new messages with text input, duration slider, and distance slider. Includes validation and submission logic.

#### Hooks (`src/hooks/`)

- **useLocation.ts**: Custom React hook for managing location permissions and retrieving the user's current location. Checks permission status and returns coordinates when available.

#### Navigation (`src/navigation/`)

- **TabNavigator.tsx**: Bottom tab navigator configuration with Feed and Create tabs. Uses React Navigation with custom icons and styling.

#### Services (`src/services/`)

- **api.ts**: Mock REST API service using Faker.js to generate fake messages. Implements `getMessages()` and `createMessage()` functions with simulated network delays.

#### Types (`src/types/`)

- **location.ts**: TypeScript interfaces for `Location` type.
- **message.ts**: TypeScript interfaces for `Message` and `CreateMessagePayload` types.

#### Utils (`src/utils/`)

- **formatters.ts**: Utility functions for formatting dates, times, distances, and durations in human-readable formats.
- **storage.ts**: Utility functions for storing messages in local storage.
- **identity.ts**: Utility functions for generating and retrieving user IDs.

### Assets (`assets/`)

- **splash-megaphone.svg**: Custom megaphone icon for splash screen (can be converted to PNG for production)
- **icon.png, adaptive-icon.png, favicon.png**: Placeholder app icons (should be replaced with actual icons)

## Key Features by File

### Splash Screen
- Implemented in `App.tsx` with 2-second display
- Uses emoji icon (can be replaced with image from `assets/splash-megaphone.svg`)

### Navigation
- Bottom tab navigator in `src/navigation/TabNavigator.tsx`
- Two tabs: Feed and Create
- Integrated in `App.tsx` with NavigationContainer

### Message Feed
- `src/screens/FeedScreen.tsx` displays messages
- Pull-to-refresh using RefreshControl
- Auto-reloads when screen comes into focus
- Uses `MessageCard` component for each message

### Message Creation
- `src/screens/CreateMessageScreen.tsx` handles form
- React Hook Form for validation
- Character counter with 120 character limit
- Two sliders for duration (5min-24h) and distance (1-5mi)
- Toast notifications on success/error
- Navigation back to Feed on success

### Mock API
- `src/services/api.ts` provides fake data
- Uses Faker.js for realistic fake messages
- Simulates network delays
- Stores data in memory

### Styling
- NativeWind (Tailwind CSS) throughout
- Utility classes for consistent design
- Mobile-first responsive design

## Dependencies Summary

### Core
- `expo`: Expo framework
- `react` & `react-native`: React and React Native
- `typescript`: TypeScript support

### Navigation
- `@react-navigation/native`: Core navigation
- `@react-navigation/bottom-tabs`: Bottom tab navigator
- `react-native-screens`: Native screen components
- `react-native-safe-area-context`: Safe area handling

### Styling
- `nativewind`: Tailwind CSS for React Native
- `tailwindcss`: Tailwind CSS core

### Forms & UI
- `react-hook-form`: Form management
- `@react-native-community/slider`: Slider component
- `react-native-toast-message`: Toast notifications

## Scripts

- `pnpm start`: Start Expo development server
- `pnpm ios`: Start on iOS simulator
- `pnpm android`: Start on Android emulator
- `pnpm web`: Start in web browser

