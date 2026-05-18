> **Archived snapshot.** This document captures the state of the project at the time it was written. It is preserved for historical context but is not current. For current state, see the followups doc and the main README.

# Step-by-Step Guide: Releasing Crowd to the iOS App Store

This guide walks you through the entire process of submitting your **Crowd** app to the Apple App Store.

---

## **1. Apple Developer Account Setup**

Before you can build for iOS, you need an active Apple Developer Program membership ($99/year).

1.  **Enroll**: Visit [developer.apple.com/programs/](https://developer.apple.com/programs/) and enroll as an Individual (easiest for anonymous apps).
2.  **Verify Identity**: Apple requires identity verification via the "Apple Developer" app on iPhone.
3.  **App Store Connect**: Once approved, log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com/). This is where you'll manage your app's metadata, screenshots, and builds.

> [!NOTE]
> **Expo handles most of the complex parts** (Certificates, Provisioning Profiles, and App Identifiers) automatically when you run the build command for the first time.

---

## **2. Project Configuration Changes**

Update [app.json](file:///Users/anthonyliddle/Development/crowd/apps/mobile/app.json) with these production-ready values.

### **Required `app.json` Updates**

```json
{
  "expo": {
    "name": "Crowd",
    "slug": "crowd-app",
    "version": "1.0.0",
    "runtimeVersion": { "policy": "appVersion" },
    "ios": {
      "bundleIdentifier": "com.yourname.crowd", // Must be unique globally
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Crowd uses your location to show you relevant messages from people nearby.",
        "NSCameraUsageDescription": "Crowd needs camera access to scan QR codes for joining private crowds."
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

### **Checklist**
- [ ] **Bundle Identifier**: Set a unique value (e.g., `com.liddle.crowd`).
- [ ] **Build Number**: Start at "1". Increment this for every new build you upload to App Store Connect.
- [ ] **Permissions Description**: The `NSLocationWhenInUseUsageDescription` is **CRITICAL**. Apple will reject your app if this is generic or empty.

---

## **3. Environment Variables**

Your app uses `EXPO_PUBLIC_API_URL`. For production, this MUST point to your live Fly.io backend.

### **Production Values**
- **EXPO_PUBLIC_API_URL**: `https://crowd-wtd6ka.fly.dev` (Already set in your `.env`, ensure it's used in the build).

### **Handling via EAS**
Since you are using EAS (Expo Application Services), you should set these variables in your **EAS secrets** so they are baked into the build safely.

**Command**:
```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://crowd-wtd6ka.fly.dev --scope project
```

---

## **4. Images & Assets (Checklist)**

Apple is strict about asset sizes and quality.

### **App Icons**
- [ ] **Icon**: `1024x1024 px` PNG (No transparency, no rounded corners).
- [ ] **Location**: [assets/icon.png](file:///Users/anthonyliddle/Development/crowd/apps/mobile/assets/icon.png).

### **Splash Screen**
- [ ] **Image**: `1242x2436 px` (Portrait).
- [ ] **Update**: Currently [App.tsx](file:///Users/anthonyliddle/Development/crowd/apps/mobile/App.tsx) uses a hardcoded 2s timer. **See Recommendation in Section 11.**

### **App Store Screenshots**
You need screenshots for two primary device sizes:
1.  **iPhone 13/14 Pro Max (6.7")**: 1290 x 2796 pixels.
2.  **iPhone 8 Plus (5.5")**: 1242 x 2208 pixels.

**What to show (5 recommended screenshots):**
1.  **The Feed**: Showing nearby messages.
2.  **Map/Location UI**: Showing the "safety in numbers" concept.
3.  **Create Message**: Showing the radius and active timer.
4.  **Crowds**: Showing a list of active crowds.
5.  **Anonymity Feature**: A screen explaining that no login is required.

---

## **5. App Store Compliance & Metadata**

### **Privacy Policy**
You **must** provide a URL to a privacy policy. Even a simple GitHub Gist works.
- **Key point**: State that you collect **Location Data** but it is **Anonymous** and not linked to a user's identity.

### **Location Justification**
When submitting, Apple will ask why you need background location (if applicable) or foreground location.
- **Answer**: "Crowd is a location-discovery app. We use the user's current location to determine which ephemeral messages are within their physical vicinity."

### **Data Privacy Form (App Store Connect)**
- **Contact Info**: No.
- **Location**: Yes (Precise Location).
- **Identifiers**: No (Since it's anonymous).
- **Linked to user?**: NO.

---

## **6. Backend & Server Readiness**

Your Fly.io server must be ready for a spike in traffic and Apple's reviewer.

- [ ] **HTTPS**: Already handled by Fly.io (Verified).
- [ ] **CORS**: Ensure `CORS_ORIGIN` in production is restricted (though for an anonymous mobile app, `*` is often used unless you have a web version).
- [ ] **Reviewer Traffic**: Apple reviewers in California will test the app. Ensure they can "see" messages or provide **Mock Messages** globally for the review period.

---

## **7. Build & Release Process**

### **Step 1: Install EAS CLI**
```bash
npm install -g eas-cli
```

### **Step 2: Initialize EAS**
Navigate to `apps/mobile`:
```bash
eas build:configure
```

### **Step 3: Create the iOS Build**
This will generate a `.ipa` file and upload it to Expo's servers.
```bash
eas build --platform ios --profile production
```
> [!IMPORTANT]
> The first time you run this, EAS will ask you to log in to your Apple Developer account to generate the necessary keys. Select **"Yes"** to let Expo handle it.

---

## **8. Testing with TestFlight**

Once the build is finished, upload it to Apple:
```bash
eas submit --platform ios
```

1.  Log in to [App Store Connect](https://appstoreconnect.apple.com/).
2.  Go to **TestFlight**.
3.  Add **Internal Testers** (yourself).
4.  Install the **TestFlight** app on your iPhone.
5.  Download "Crowd" and test it exactly like a user would.

---

## **9. App Review Submission**

1.  In App Store Connect, create a **New Version**.
2.  Select the build you uploaded via TestFlight.
3.  Fill in the **Description**, **Keywords**, and **Support URL**.
4.  **App Review Information**: Since there is no login, tell the reviewer: *"No login required. The app is fully accessible upon opening."*
5.  Click **Submit for Review**.

---

## **10. Post-Launch Checklist**

- **Version 1.0.1**: Be prepared to push a hotfix quickly if users find bugs.
- **EAS Update**: You can use `eas update` to push small JS changes without a full App Store re-review.
- **Monitoring**: Check Fly.io logs for 500 errors from real users.

---

## **11. Critical Code Improvement: Splash Screen**

Currently, your [App.tsx](file:///Users/anthonyliddle/Development/crowd/apps/mobile/App.tsx) has a hardcoded `2000ms` timer:

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setIsSplashVisible(false);
  }, 2000);
  return () => clearTimeout(timer);
}, []);
```

### **The Risk**
If the internet is slow or the backend is cold-starting, the app will transition to the Main Screen while data is still loading, often showing a "flash" of empty state.

### **The Fix: use `expo-splash-screen`**
1. **Install**: `npx expo install expo-splash-screen`
2. **Logic**: Keep the splash visible until your initial API call (the feed) returns.

---

**Success!** Following these steps will result in a professional, compliant App Store presence.
