> **Archived snapshot.** This document captures the state of the project at the time it was written. It is preserved for historical context but is not current. For current state, see the followups doc and the main README.

# **Local Testing Guide: Testing with a Local Backend**

This guide provides a step-by-step workflow for running your **Crowd** backend locally while making it accessible to friends and testers over the internet.

---

## **1. Local Backend Exposure Options**

To let friends connect to your local server, you need a "tunnel" that maps a public URL to your `localhost:8080`.

| Tool | Best For | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **ngrok** | **Quick & Reliable** | Extremely easy setup; very stable; great for friend testing. | Free tier has ephemeral URLs (changes every restart). |
| **Cloudflare Tunnel** | **Stability (Long-term)** | Free permanent hostnames; very secure. | Slightly more complex initial setup. |
| **Tailscale Funnel** | **Privacy** | Works within your private network. | Every tester must also be on your Tailscale network. |

### **Recommendation: Use ngrok**
1.  **Install:** `brew install ngrok`
2.  **Authenticate:** Follow instructions at [ngrok.com](https://ngrok.com) to add your auth token.
3.  **Run Tunnel:**
    ```bash
    ngrok http 8080
    ```
4.  **Keep URL Stable:** If you need a permanent URL, ngrok offers one free static domain (e.g., `your-name.ngrok-free.app`). Claim it in the ngrok dashboard and run:
    ```bash
    ngrok http --domain=your-name.ngrok-free.app 8080
    ```

---

## **2. Backend Configuration for Public Access**

Your Fastify server must be configured to accept external traffic.

### **Environment Variables (`apps/server/.env`)**
Update your local `.env` to allow the tunnel's origin:

```env
PORT=8080
HOST=0.0.0.0
CORS_ORIGIN=https://your-name.ngrok-free.app
DATABASE_URL=postgres://user:pass@localhost:5432/crowd
```

> [!IMPORTANT]
> Setting `HOST=0.0.0.0` is required for the server to listen on all network interfaces, allowing the tunnel to reach it.

### **CORS Safety**
The backend is already set up to use `CORS_ORIGIN`. During friend testing, avoid using `*` if possible; instead, use your specific ngrok URL.

---

## **3. App Configuration for a Local-but-Public Backend**

The mobile app needs to know where to find your server.

### **Option A: Static Tunnel URL (Recommended for Friends)**
In `apps/mobile/.env`, set the tunnel URL:
```env
EXPO_PUBLIC_API_URL=https://your-name.ngrok-free.app
```

### **Option B: Dynamic Local Detection (Best for YOU)**
If you leave `EXPO_PUBLIC_API_URL` blank, the app automatically detects your computer's local IP (via `Constants.expoConfig.hostUri`). This works for you while on the same Wi-Fi, but NOT for friends.

---

## **4. Testing on My Own Device**

### **For iOS (Mac + iPhone)**
1.  **Expo Go:** The fastest way. Ensure your iPhone is on the same Wi-Fi as your Mac.
    ```bash
    pnpm dev
    ```
    Scan the QR code in the terminal with your Camera app.
2.  **Development Build:** Required if you add native modules.
    ```bash
    npx eas build --profile development --platform ios --local
    ```

### **Debugging Network Issues**
If the app can't reach the backend:
*   Check if `ngrok` is running.
*   Open the tunnel URL in your mobile browser. You should see `{"status":"ok"}` from the `/health` endpoint.
*   Verify `CORS_ORIGIN` matches your tunnel URL exactly.

---

## **5. Getting the App on Friends’ Phones**

### **Option A: Expo Go (Instant)**
1.  Friend installs **Expo Go** from the App Store.
2.  You send them the **Expo URL** (e.g., `exp://u.expo.dev/...`).
3.  **Limitation:** This only works if you are running the Expo CLI locally and the URL is accessible.

### **Option B: TestFlight (Best for "Real" Testing)**
1.  Register for an Apple Developer Account ($99/year).
2.  Configure a "Preview" build in EAS.
3.  Upload the build to TestFlight.
4.  Invite friends via email using **App Store Connect**.

---

## **6. Data Safety & Reset Strategy**

Since multiple testers hit your local DB, keep it clean.

*   **View Data:** Run `pnpm server:view:db` to open Drizzle Studio.
*   **Cleanup Expired:** Run `pnpm server:cleanup` to purge old messages/crowds.
*   **Hard Reset:** If the schema breaks:
    ```bash
    # Caution: This deletes ALL local data
    pnpm --filter server drizzle-kit push --force
    ```

---

## **7. Feature-Specific Testing Checklists**

### **📍 Location & Feed**
- [ ] Post a message: Does it appear in your feed immediately?
- [ ] Walk 100m away: Does the "distance" update on refresh?
- [ ] Out of range: Does the message disappear when you are > `radiusMeters` away?

### **👥 Crowds**
- [ ] Create a Crowd: Verify the 24h expiration is set.
- [ ] Invite Friend: Share the `crowd://join/{id}` link. Does it open the app?
- [ ] Member Limit: Test multiple people joining the same crowd.

### **🔄 Identity Rotation**
- [ ] Wait for message expiration: Does the User ID change?
- [ ] Post in Crowd: Verify the user ID remains stable *for that specific crowd*.

---

## **8. Logging, Debugging & Monitoring**

*   **Backend Logs:** Watch your terminal running the server. Fastify logs every request and SQL query.
*   **Mobile Logs:** Run `npx expo start` and press `j` to open the debugger, or use:
    ```bash
    # View logs from a physical device
    npx expo run:ios --device
    ```

---

## **9. Structured Testing Workflow**

1.  **Sanity Check:** You test the flow on a simulator.
2.  **Internal Test:** You test on your physical iPhone via Expo Go.
3.  **Alpha Test:** 1-2 friends join via Expo Go + ngrok.
4.  **Beta Test:** 5+ friends join via TestFlight + ngrok (or hosted staging).

---

## **10. When to Stop Using a Local Backend**

**Move to Fly.io/Production when:**
*   You need the backend up 24/7 without your laptop open.
*   You have more than 5-10 active testers.
*   You are seeing "ngrok limit" errors.
*   You are ready to submit to the App Store.

---

## **Appendix: Friend Onboarding Message Template**

> "Hey! I'm testing my new app, **Crowd**. It's an anonymous local messaging app.
> 
> 1. Install **Expo Go** from the App Store.
> 2. Open this link: [Your Expo Link]
> 3. Ensure you allow Location permissions!
> 
> My backend is running locally for now, so if things are slow, let me know!"
