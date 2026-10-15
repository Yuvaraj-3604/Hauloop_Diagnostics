# Teltonika FMC650 SAE J1939 Commercial Vehicle Telematics Platform

A high-performance, real-time fleet cockpit and diagnostic telemetry application built for the **Teltonika FMC650** heavy commercial vehicle telematics unit and **SAE J1939 CAN** bus protocol.

Designed for automotive control rooms, fleet dispatchers, and vehicle diagnostic engineers.

---

## 1. End-to-End System Architecture

```text
[ FMC650 Telematics Tracker ]
         │ (Cellular LTE / Codec 8 Extended)
         ▼
[ AWS IoT Core ] (MQTT Topic: FMC650/{imei}/data)
         │
         ▼ (MQTT Subscription / REST Webhook)
[ Backend Telematics Engine ] (Node.js / Express + WebSockets)
         ├── J1939 AVL Protocol Decoder (Manual CAN00 - CAN14)
         ├── Driveline Safety Rule Evaluator (DTC Faults, Over-Rev, Overheat)
         ├── In-Memory History Ring Buffer (Rolling Sparklines)
         └── Realistic Commercial Vehicle Simulator (NH-45 Corridor)
         │
         ▼ (Real-Time WebSocket Push < 30ms latency)
[ Frontend Fleet Cockpit Dashboard ] (Dark Glassmorphism UI)
         ├── Animated Analog Tachometer (0 - 3,500 RPM, Sweet Spot & Redline)
         ├── Digital Speedometer (0 - 140 km/h) & Transmission Gear HUD
         ├── Coolant Temp, Oil Pressure, Air Tanks, 24V Voltage Dials
         ├── Fluid Glass Meters: Diesel Fuel % & BS-VI DEF / AdBlue %
         ├── Live Leaflet GPS Map with Rotating Vehicle Heading Marker
         ├── Real-Time Multi-Series Streaming Sparklines (Chart.js)
         └── Live CAN Signal Inspector Table (Raw Hex, Decoded KPIs, Formulas)
```

---

## 2. J1939 AVL Signal Decoding Reference

The backend `j1939Decoder.js` converts incoming raw Teltonika AVL properties into physical engineering units:

| AVL ID | FMC650 Channel | J1939 Parameter | PGN (Hex) | PGN (Dec) | Scaling Factor / Formula | Engineering Range |
|---|---|---|---|---|---|---|
| **145** | `CAN00` | Engine Speed (RPM) | `0xF004` | 61444 | $\text{Raw} \times 0.125$ | 0 – 8,000 RPM |
| **146** | `CAN01` | Vehicle Road Speed | `0xFEF1` | 65265 | $\text{Raw} \times \frac{1}{256}$ | 0 – 250 km/h |
| **147** | `CAN02` | Accelerator Pedal Pos % | `0xF003` | 61443 | $\text{Raw} \times 0.4$ | 0 – 100 % |
| **148** | `CAN03` | Actual Engine Torque % | `0xF004` | 61444 | $\text{Raw} - 125$ | -125 % to +125 % |
| **149** | `CAN04` | Cumulative Total Fuel | `0xFEE9` | 65257 | $\text{Raw} \times 0.5$ | Cumulative Liters |
| **150** | `CAN05` | Total Engine Run Hours | `0xFEE5` | 65253 | $\text{Raw} \times 0.05$ | Cumulative Hours |
| **151** | `CAN06` | Instantaneous Fuel Rate | `0xFEF2` | 65266 | $\text{Raw} \times 0.05$ | 0 – 300 L/h |
| **152** | `CAN07` | Engine Coolant Temp | `0xFEEE` | 65262 | $\text{Raw} - 40$ | -40 °C to +210 °C |
| **153** | `CAN08` | Engine Oil Pressure | `0xFEEF` | 65263 | $\text{Raw} \times 4$ | 0 – 1,000 kPa |
| **154** | `CAN09` | DEF / AdBlue Tank Level | `0xFE56` | 65110 | $\text{Raw} \times 0.4$ | 0 – 100 % |
| **380** | `CAN10` | Service Air Tank 1 Press | `0xFEAE` | 65198 | $\text{Raw} \times 8$ | 0 – 2,000 kPa |
| **381** | `CAN11` | Service Air Tank 2 Press | `0xFEAE` | 65198 | $\text{Raw} \times 8$ | 0 – 2,000 kPa |
| **382** | `CAN12` | Active Transmission Gear | `0xF005` | 61445 | $\text{Raw} - 125$ | N, G1–G12, R1, R2 |
| **383** | `CAN13` | DPF Delta Pressure | `0xFD7B` | 64891 | $\text{Raw} \times 0.1$ | 0 – 50 kPa |
| **384** | `CAN14` | Bogie Axle Weight | `0xFEEA` | 65258 | $\text{Raw} \times 0.5$ | 0 – 35,000 kg |
| **239** | `DIN/IGN` | Ignition Status | N/A | N/A | `0 = OFF, 1 = ON` | Binary |
| **66** | `PWR` | External Power Voltage | N/A | N/A | $\text{Raw} / 1000$ | Volts (24V System) |
| **67** | `BAT` | Backup Battery Voltage | N/A | N/A | $\text{Raw} / 1000$ | Volts (Li-ion) |

---

## 3. Quick Start & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Telematics Application
```bash
npm start
```

### 3. Open the Dashboard
Navigate to: **`http://localhost:3000`** in any web browser.

---

## 4. Key Features & Live Controls

### A. Digital Cockpit & Dials
- **Sweeping Analog Tachometer**: Features green max-efficiency sweet spot (1,000 – 1,700 RPM), amber caution zone (1,700 – 2,200 RPM), and redline indicator (> 2,200 RPM).
- **Speedometer**: Integrated digital transmission gear indicator badge (e.g. `G8`, `N`, `R1`).
- **Engine Health Cluster**: Real-time dials for Coolant Temperature, Oil Pressure, Dual Air Brake Tanks, and Alternator Charging Voltage.
- **Fluid Reservoirs**: Dynamic glass progress bars for Diesel Fuel Level and BS-VI DEF / AdBlue.

### B. Live Fleet GPS Map
- Centered on commercial haulage corridor: **Tiruchirappalli (Trichy), Tamil Nadu** (`10.823078, 78.685815`).
- Rotating truck marker reflecting real-time **vehicle heading / bearing**.
- Breadcrumb route trail showing speed profile and historical track.
- Floating HUD overlay displaying Latitude, Longitude, Heading, and Altitude.

### C. Live CAN Signal Inspector
- Displays active FMC650 Manual CAN channels with **Channel Name**, **AVL ID**, **PGN**, **Raw Hex Payload**, **Decoded Engineering Value**, and **Mathematical J1939 Conversion Formula**.
- Highlight flash animation on incoming packets.

### D. Interactive Truck Simulator Mode
Test the platform anytime without physical hardware:
- **Scenarios**:
  - `Highway Cruise (NH-45)`: Smooth highway driving, gear shifting, nominal temperatures.
  - `Heavy Haul Uphill`: 90% engine load, high torque demand, increased fuel rate.
  - `Engine Overheat (111°C)`: Triggers coolant temperature critical alerts and DTC code `SPN 110 FMI 0`.
  - `Low Oil Starvation`: Oil pressure drops below 150 kPa triggering lubrication emergency alert `SPN 100 FMI 1`.
  - `Harsh Braking Event`: Rapid deceleration spike (-0.58g), air brake consumption.
  - `Idle Docking`: 650 RPM, stationary at terminal.
- **Pedal Throttle Slider**: Dynamically adjust engine RPM and vehicle acceleration in real time.

### E. Test Payload Injector
Click **"Test Payload Injector"** in the top header to inject any raw JSON packet directly:
```json
{
  "imei": "867530901234567",
  "lat": 10.823078,
  "lng": 78.685815,
  "avl": {
    "145": 14400,
    "146": 18432,
    "152": 130,
    "153": 105,
    "154": 185
  }
}
```

---

## 5. Connecting AWS IoT Core MQTT

To stream directly from AWS IoT Core, configure environment variables before launching:
```bash
set MQTT_BROKER=mqtts://your-iot-endpoint.iot.us-east-1.amazonaws.com
set MQTT_TOPIC=FMC650/+/data
npm start
```
Or post configuration directly via REST:
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"brokerUrl\":\"mqtts://...\",\"topic\":\"FMC650/+/data\"}" http://localhost:3000/api/mqtt/config
```
When no MQTT broker is connected, the application gracefully operates in **Simulator / Local Testing Mode**.
