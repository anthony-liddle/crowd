# Crowd - React Native Expo Application

A modern React Native mobile application built with Expo, TypeScript, and NativeWind (Tailwind CSS). The app features a message feed and message submission system with a beautiful, mobile-first UI.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Feature Descriptions](#feature-descriptions)
- [Troubleshooting](#troubleshooting)
- [Extending the Project](#extending-the-project)

## ✨ Features

- **Splash Screen**: Custom megaphone-themed splash screen
- **Message Feed**: Browse messages (Global or Crowd-specific) with pull-to-refresh functionality
- **Crowds**: Create, join, and manage private/public groups with 24-hour expiration
- **Message Creation**: Create new messages w/ optional crowd targeting, duration, and distance settings
- **Form Validation**: Real-time character counting and validation
- **Real-time Updates**: Live feed updates and crowd membership changes
- **Beautiful UI**: Modern, clean design using Tailwind CSS via NativeWind
- **TypeScript**: Full type safety throughout the application

## 🛠 Tech Stack

- **React Native**: 0.74.5
- **Expo**: ~51.0.0
- **TypeScript**: ^5.1.3
- **React Navigation**: Bottom tab navigation
- **NativeWind**: Tailwind CSS for React Native
- **React Hook Form**: Form management and validation
- **react-native-toast-message**: Toast notifications
- **@react-native-community/slider**: Slider components
- **pnpm**: Package manager

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher
- **pnpm**: Latest version (`npm install -g pnpm`)
- **Expo CLI**: (`npm install -g expo-cli` or use `npx expo`)
- **iOS Simulator** (for macOS) or **Android Emulator** (for testing)

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Assets

The project includes a splash screen SVG (`assets/splash-megaphone.svg`). For production, you'll need to:

- Convert the SVG to PNG format (1024x1024 recommended)
- Place it at `assets/splash-megaphone.png`
- Update `app.json` if needed

You can use online tools like [CloudConvert](https://cloudconvert.com/svg-to-png) or ImageMagick:

```bash
# Using ImageMagick (if installed)
convert assets/splash-megaphone.svg -resize 1024x1024 assets/splash-megaphone.png
```

### 3. Start the Development Server

```bash
pnpm start
```

This will start the Expo development server. You can then:

- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go app on your physical device

## 🏃 Running the App

### Development Mode

```bash
# Start Expo dev server
pnpm start

# Or use specific platform
pnpm ios      # iOS Simulator
pnpm android  # Android Emulator
pnpm web      # Web browser
```

### Building for Production

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## 📁 Project Structure

```
react-native-expo-app/
├── assets/                 # Images and static assets
│   ├── splash-megaphone.svg
│   ├── icon.png
│   └── ...
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── CharacterCounter.tsx
│   │   ├── EmptyList.tsx
│   │   ├── MessageCard.tsx
│   │   ├── PageHeader.tsx
│   │   ├── SortFeed.tsx
│   │   └── ToastConfig.tsx
│   ├── hooks/              # Custom React hooks (future use)
│   │   └── useLocation.ts
│   ├── navigation/         # Navigation configuration
│   │   └── TabNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── FeedScreen.tsx
│   │   └── CreateMessageScreen.tsx
│   ├── services/           # API and business logic
│   │   └── api.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── location.ts
│   │   └── message.ts
│   └── utils/              # Utility functions
│       ├── formatters.ts
│       ├── identity.ts
│       └── storage.ts
├── App.tsx                 # Root component
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🏗 Architecture Overview

### Component Hierarchy

```
App
├── NavigationContainer
│   └── TabNavigator
│       ├── FeedScreen
│       │   └── FlatList
│       │       └── MessageCard (multiple)
│       └── CreateMessageScreen
│           └── Form (React Hook Form)
│               ├── TextInput
│               ├── Slider (Duration)
│               └── Slider (Distance)
```

### Data Flow

1. **Feed Screen**:
   - Fetches messages from `api.getMessages()`
   - Displays messages in a FlatList
   - Supports pull-to-refresh

2. **Create Screen**:
   - User fills form with validation
   - Submits to `api.createMessage()`
   - Shows success toast
   - Navigates back to Feed

3. **API Service**:
   - Stores data in memory

### State Management

- **Local State**: React `useState` for component-level state
- **Form State**: React Hook Form for form management
- **Navigation State**: React Navigation handles navigation state
- **API State**: Local state in components

## 📱 Feature Descriptions

### Splash Screen

- Displays a megaphone icon
- Shows for 2 seconds on app launch
- Configured in `app.json` and `App.tsx`

### Message Feed Screen

- **Pull-to-Refresh**: Swipe down to refresh messages
- **Message Display**: Shows text, timestamp, distance, and time left
- **Empty State**: Friendly message when no messages exist
- **Loading State**: Activity indicator while fetching

### Crowds
- **Create**: Create public or closed groups with custom names
- **Join**: Join crowds via invite codes/links
- **Manage**: View member counts, ownership status, and expiration
- **Expiration**: All crowds automatically expire after 24 hours
- **Integration**: Post messages specifically to crowd members
- **Crowd-Specific Identity**: Each crowd gets its own stable user ID that doesn't rotate, ensuring membership persists even when your main user ID changes

### Message Submission Screen

- **Text Input**: 
  - 120 character limit
  - Real-time character counter
  - Multi-line support
  
- **Duration Slider**:
  - Range: 5 minutes to 24 hours
  - Step: 5 minutes
  - Live preview of selected duration
  
- **Distance Slider**:
  - Range: 1 to 5 miles
  - Step: 0.1 miles
  - Live preview of selected distance

- **Form Validation**:
  - Required field validation
  - Character limit enforcement
  - Error messages display

- **Submission**:
  - Async API call
  - Success toast notification
  - Form reset
  - Navigation to Feed screen

## 🔧 Troubleshooting

### Common Issues

#### 1. Metro Bundler Errors

```bash
# Clear cache and restart
pnpm start --clear
```

#### 2. NativeWind Styles Not Working

Ensure `babel.config.js` includes the NativeWind plugin:

```js
plugins: ['nativewind/babel']
```

#### 3. TypeScript Errors

```bash
# Restart TypeScript server in your IDE
# Or run type check
npx tsc --noEmit
```

#### 4. Navigation Errors

Ensure all navigation dependencies are installed:

```bash
pnpm install @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

#### 5. Slider Not Appearing

The slider component requires native modules. For Expo:

```bash
# If using bare workflow, you may need to rebuild
expo prebuild
```

#### 6. Toast Not Showing

Ensure `Toast` component is included in `App.tsx`:

```tsx
<Toast />
```

### Platform-Specific Issues

#### iOS

- Ensure Xcode and iOS Simulator are installed
- Run `pod install` in `ios/` directory if using bare workflow

#### Android

- Ensure Android Studio and Android SDK are installed
- Set up Android emulator or connect physical device

## 🚀 Extending the Project

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add to navigation in `src/navigation/TabNavigator.tsx`
3. Update types if needed

### Integrating Real API

Replace `src/services/api.ts`:

```typescript
// Replace mock functions with real API calls
export const getMessages = async (): Promise<Message[]> => {
  const response = await fetch('https://api.example.com/messages');
  return response.json();
};
```

### Adding Push Notifications

```bash
pnpm install expo-notifications
```

### Adding Image Upload

```bash
pnpm install expo-image-picker
```

### Styling Enhancements

- Add custom Tailwind theme in `tailwind.config.js`
- Create reusable style components
- Add dark mode support

### Testing

Add testing framework:

```bash
pnpm install -D jest @testing-library/react-native
```

### Performance Optimization

- Implement React.memo for expensive components
- Use useMemo/useCallback for expensive computations
- Add FlatList optimizations (getItemLayout, etc.)
- Implement pagination for large lists

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

This is a template project. Feel free to fork and modify for your needs.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Expo documentation: https://docs.expo.dev
3. Check React Navigation docs: https://reactnavigation.org

---

**Built with ❤️ using React Native and Expo**
