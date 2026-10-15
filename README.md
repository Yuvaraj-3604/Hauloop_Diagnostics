# HAULOOP CAN Diagnostics · Teltonika FMC650 Console & Mobile APK

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Hauloop__Diagnostics-red?style=for-the-badge&logo=github)](https://github.com/Yuvaraj-3604/Hauloop_Diagnostics.git)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![Android](https://img.shields.io/badge/Android-APK_Build-3DDC84?style=for-the-badge&logo=android)](https://developer.android.com/)

A modern, high-performance telematics diagnostic console and mobile Android APK built for fleet engineers working with **Teltonika FMC650** heavy commercial vehicle trackers and **SAE J1939 CAN 2.0B / CAN FD** networks.

---

## 🚀 Key Features

### 1. Diagnostic Pipeline Control Center (Screen 1)
- **Live Ingestion Switch**: Toggle real-time streaming simulation (250 Kbps live bus telemetry vs paused).
- **Core Diagnostics Metrics**: 2×2 mobile-responsive grid showing Total Configured CAN IDs, Receiving IDs, Stale IDs, and Protocol Decoding Errors.
- **End-to-End Visualizer**: Interactive pipeline stage flow (`FMC650 Tracker` ➔ `CAN1 Transceiver` ➔ `AVL Ingestion Engine` ➔ `Decoded Signals` ➔ `AWS IoT Core`).
- **Live Signal Chart**: Real-time Area chart tracking Engine RPM & Vehicle Speed continuous trace powered by Recharts.
- **Vehicle Vitals**: Live metrics for heavy haulers (Tata Signa 4825.TK, BharatBenz, Ashok Leyland AVTR) with health gauges.

### 2. Manual CAN ID Monitor (Screen 2)
- Inspect all **15 Teltonika Configurator Hardware Slots**.
- Hex dump inspection with delta bit highlighting (green/red change flags).
- Live frequency calculation (Hz), frame counts, timestamps, and status pills (Receiving, Stale, No Data).

### 3. CAN ID & J1939 Bitfield Analyzer (Screen 3)
- **Vector CANoe-Style 64-Bit Payload Matrix**: Complete bit-level breakdown across all 8 data bytes.
- **J1939 29-bit Identifier Decoder**: Automatic decomposition of Priority, Extended Data Page (EDP), Data Page (DP), Parameter Group Number (PGN), Destination Address (DA), and Source Address (SA).
- Standard SPN decoders (Engine Speed, Wheel-Based Vehicle Speed, Engine Coolant Temp, Fuel Delivery Rate, Battery Voltage).

### 4. AVL ID Mapping (Screen 4)
- Mapping table linking device AVL Property IDs (Codec 8 / Codec 8 Extended) directly to CAN SPNs.
- Configuration parameters including data length, multipliers, offsets, and physical units.

### 5. Automated Bench Tests (Screen 5)
- Automated bench validation suite:
  - Transceiver Loopback Test
  - 120Ω Physical Bus Termination Check
  - Bitrate Auto-Detection (250 / 500 kbps)
  - AWS IoT Core MQTT Broker Roundtrip Verification
- Real-time execution logs with visual progress meters and pass/fail indicators.

### 6. Fleet & Hardware Management (Screen 6)
- Switch active diagnostic target vehicles (Tata Signa 4825.TK, BharatBenz 3528C, Ashok Leyland AVTR 4825, Scania R500).
- Hardware identity inspection (IMEI, VIN, Firmware revision, Config profile).

### 7. Event Auditing & History (Screens 7 & 8)
- Real-time diagnostic event audit trail with level filters (Info, Warning, Error).
- Multi-axis historical signal trend graphs with physical correlation views.

### 8. Split-Screen Authentication & Security
- Logistics terminal split-screen authentication screen.
- Peterbilt heavy-duty commercial red truck hero showcase.
- Interactive math Captcha verification with refresh and validation.
- Role-based terminal switching (Diagnostic Engineer, Fleet Admin, Field Tech).

### 9. Native Mobile & Android APK
- Re-architected 2-tier responsive mobile header with safe-area top inset clearance.
- Floating bottom navigation bar with gesture navigation clearance.
- Branded Android launcher icon featuring the HAULOOP red infinity track loop symbol.
- Standalone debug APK ready in project root: `hauloop-fmc650-diagnostics.apk`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 6, JavaScript (ES Modules) |
| **Styling & Design System** | Pure CSS3 (Design tokens, Glassmorphism, CSS Grid & Flexbox, Fluid Typography) |
| **Data Visualization** | Recharts (Responsive Area, Line, and Bar charts) |
| **Iconography** | Lucide React |
| **Mobile Runtime** | Capacitor 8 (Android Bridge) |
| **Android Build System** | Gradle 9.2, Android SDK 34 / 35, Java 17+ |
| **Deployment Target** | Vercel (Web SPA), GitHub Pages, Android APK |

---

## 📦 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or later)
- [npm](https://www.npmjs.com/) (version 9.0 or later)
- [Android Studio](https://developer.android.com/studio) (optional, only needed for compiling APK)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yuvaraj-3604/Hauloop_Diagnostics.git
   cd Hauloop_Diagnostics
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173` (or the port displayed in your terminal).

4. **Build production bundle:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 🌐 Deploy to Vercel

The project includes an optimized [`vercel.json`](./vercel.json) configured for Vite single-page application routing.

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Push your repository to GitHub: `https://github.com/Yuvaraj-3604/Hauloop_Diagnostics.git`.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Select **Import Git Repository** and choose **`Yuvaraj-3604/Hauloop_Diagnostics`**.
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**. Vercel will build and deploy your diagnostics web application to a live HTTPS URL.

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to your Vercel account
vercel login

# Deploy directly from repository root
vercel

# Deploy to production
vercel --prod
```

---

## 📱 Compiling the Android APK

The project uses `@capacitor/android` with Gradle.

### Quick Build (Command Line)
```bash
# 1. Build Vite web assets
npm run build

# 2. Sync web build to Android project
npx cap sync android

# 3. Compile Debug APK via Gradle
cd android
./gradlew assembleDebug      # On Linux/macOS
gradlew.bat assembleDebug   # On Windows
cd ..

# 4. The compiled APK is located at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Build with Android Studio
1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync to complete.
3. Select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4. Locate the generated APK under `android/app/build/outputs/apk/debug/`.

---

## 🔐 Default Operator Credentials

For testing and terminal access, use the pre-configured credentials on the login screen:

| Username | Password | Default Role |
| :--- | :--- | :--- |
| `admin` | `admin123` | Master Diagnostic Engineer |
| `engineer` | `admin123` | CAN Systems Specialist |
| `fieldtech` | `admin123` | Field Service Technician |

*Note: The login page includes an interactive Captcha challenge. Enter the two-digit sum or answer displayed in the badge to sign in.*

---

## 📁 Project Structure

```text
├── android/                         # Capacitor Native Android Studio project
│   ├── app/                         # Android application module
│   │   ├── src/main/AndroidManifest.xml
│   │   └── src/main/res/            # Android mipmap icons & styles
│   └── gradlew.bat                  # Windows Gradle wrapper
├── public/                          # Static public assets
│   ├── hauloop-icon.png             # 512x512 App Icon
│   └── hauloop-logo.png             # HAULOOP Brandmark
├── src/                             # React application source code
│   ├── assets/                      # Bundled images & assets
│   │   ├── hauloop-logo.png
│   │   ├── hauloop-truck.jpg        # Peterbilt red truck hero
│   │   └── hauloop-icon.png         # Red infinity track loop
│   ├── components/                  # Reusable UI components
│   │   ├── Sidebar.jsx              # Navigation drawer
│   │   ├── Topbar.jsx               # 2-Tier responsive header & controls
│   │   └── Ui.jsx                   # MetricCard, Modal, StatusPill, Gauges
│   ├── data/                        # Diagnostic database & definitions
│   │   ├── canDefinitions.js        # J1939 PGNs, SPNs, bit masks, scale factors
│   │   └── demoData.js              # Hardware slots & telemetry fixtures
│   ├── lib/                         # Diagnostic computation engines
│   │   ├── can.js                   # 29-bit CAN ID bitwise parser
│   │   └── telematicsEngine.js      # Simulation engine (250 Kbps generator)
│   ├── screens/                     # Main Application Screens
│   │   ├── DashboardScreen.jsx      # Screen 1: Pipeline & Live Vitals
│   │   ├── CanMonitorScreen.jsx     # Screen 2: 15 Manual Slots
│   │   ├── CanAnalyzerScreen.jsx    # Screen 3: CANoe Bitfield Matrix
│   │   ├── AvlMappingScreen.jsx     # Screen 4: Teltonika AVL IDs
│   │   ├── DiagnosticsScreen.jsx    # Screen 5: Automated Tests
│   │   ├── DeviceFleetScreen.jsx    # Screen 6: Device Fleet
│   │   ├── EventLogScreen.jsx       # Screen 7: Event Log
│   │   ├── HistoryScreen.jsx        # Screen 8: Historical Trends
│   │   └── LoginScreen.jsx          # Split-Screen Auth & Captcha
│   ├── App.jsx                      # Main App Shell & State Router
│   ├── main.jsx                     # React DOM entry point
│   └── styles.css                   # Comprehensive Responsive Design System
├── capacitor.config.json            # Capacitor Android configuration
├── index.html                       # HTML5 entry with mobile meta tags
├── package.json                     # Node.js dependencies & scripts
├── vercel.json                      # Vercel deployment configuration
├── vite.config.js                   # Vite configuration
└── README.md                        # Documentation
```

---

## 📄 License & Credits

Developed for **HAULOOP Fleet Diagnostics** and **Teltonika FMC650** telematics protocol engineering.  
SAE J1939 standard specifications referenced for commercial vehicle CAN bus decoding.
