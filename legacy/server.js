/**
 * FMC650 J1939 Telematics Backend Server
 * Express + WebSockets + MQTT Client + J1939 AVL Decoder Engine + Vehicle Simulator
 */

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const mqtt = require('mqtt');

const { decodeFMC650Packet } = require('./j1939Decoder');
const AlertEngine = require('./alertEngine');
const VehicleSimulator = require('./simulator');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Subsystems
const alertEngine = new AlertEngine();
const simulator = new VehicleSimulator();

let isSimulatorRunning = true;
let simulatorTimer = null;
let latestDecoded = null;
const historyRingBuffer = [];
const MAX_HISTORY = 120;

// MQTT Client State
let mqttClient = null;
let mqttStatus = {
  connected: false,
  brokerUrl: process.env.MQTT_BROKER || 'Offline / Simulator Active',
  topic: process.env.MQTT_TOPIC || 'FMC650/+/data',
  lastMessageTime: null,
  messagesReceived: 0
};

/**
 * Ingest and process a raw telematics payload
 */
function ingestPayload(rawPacket, source = 'SIMULATOR') {
  try {
    const decoded = decodeFMC650Packet(rawPacket);
    const alerts = alertEngine.evaluate(decoded.kpis);

    latestDecoded = {
      ...decoded,
      alerts,
      source,
      receivedAt: new Date().toISOString()
    };

    // Store in history
    historyRingBuffer.push({
      timestamp: decoded.kpis.timestamp,
      rpm: decoded.kpis.rpm,
      speed: decoded.kpis.speed,
      engineLoad: decoded.kpis.engineLoad,
      fuelRate: decoded.kpis.fuelRate,
      coolantTemp: decoded.kpis.coolantTemp,
      oilPressure: decoded.kpis.oilPressure,
      lat: decoded.kpis.lat,
      lng: decoded.kpis.lng,
      heading: decoded.kpis.heading,
      gear: decoded.kpis.gear,
      defLevel: decoded.kpis.defLevel
    });

    if (historyRingBuffer.length > MAX_HISTORY) {
      historyRingBuffer.shift();
    }

    // Broadcast update to all connected WebSocket clients
    broadcast({
      type: 'TELEMETRY_UPDATE',
      data: latestDecoded,
      simulatorRunning: isSimulatorRunning,
      mqttStatus
    });

    return latestDecoded;
  } catch (err) {
    console.error('[Ingest Error]:', err.message);
    return null;
  }
}

/**
 * Broadcast message to all open WebSockets
 */
function broadcast(msgObj) {
  const payload = JSON.stringify(msgObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Start simulation clock
 */
function startSimulator() {
  if (simulatorTimer) clearInterval(simulatorTimer);
  isSimulatorRunning = true;
  simulatorTimer = setInterval(() => {
    if (isSimulatorRunning) {
      const rawSimPacket = simulator.step();
      ingestPayload(rawSimPacket, 'SIMULATOR');
    }
  }, 1000);
  console.log('[Simulator] Started at 1.0s interval');
}

function stopSimulator() {
  isSimulatorRunning = false;
  if (simulatorTimer) {
    clearInterval(simulatorTimer);
    simulatorTimer = null;
  }
  console.log('[Simulator] Stopped');
}

/**
 * Initialize MQTT Client (Optional connection to AWS IoT Core or test broker)
 */
function setupMqttClient(brokerUrl, topic) {
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch (e) {}
  }

  if (!brokerUrl || brokerUrl.toLowerCase().includes('offline')) {
    mqttStatus.connected = false;
    mqttStatus.brokerUrl = 'Offline (Manual / Simulator Mode)';
    return;
  }

  try {
    mqttStatus.brokerUrl = brokerUrl;
    mqttStatus.topic = topic || 'FMC650/+/data';

    mqttClient = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
      connectTimeout: 5000
    });

    mqttClient.on('connect', () => {
      console.log(`[MQTT] Connected to ${brokerUrl}`);
      mqttStatus.connected = true;
      mqttClient.subscribe(mqttStatus.topic, (err) => {
        if (!err) console.log(`[MQTT] Subscribed to topic: ${mqttStatus.topic}`);
      });
      broadcast({ type: 'MQTT_STATUS', data: mqttStatus });
    });

    mqttClient.on('message', (receivedTopic, message) => {
      try {
        const payloadStr = message.toString();
        const rawJson = JSON.parse(payloadStr);
        mqttStatus.messagesReceived++;
        mqttStatus.lastMessageTime = new Date().toISOString();
        console.log(`[MQTT] Message received on ${receivedTopic}`);
        ingestPayload(rawJson, 'AWS_IOT_MQTT');
      } catch (e) {
        console.error('[MQTT] Message parsing error:', e.message);
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('[MQTT Warning]:', err.message);
      mqttStatus.connected = false;
      broadcast({ type: 'MQTT_STATUS', data: mqttStatus });
    });

    mqttClient.on('close', () => {
      mqttStatus.connected = false;
      broadcast({ type: 'MQTT_STATUS', data: mqttStatus });
    });
  } catch (err) {
    console.error('[MQTT Setup Error]:', err.message);
  }
}

// REST APIs
app.get('/api/status', (req, res) => {
  res.json({
    latest: latestDecoded,
    simulatorRunning: isSimulatorRunning,
    scenario: simulator.scenario,
    mqttStatus,
    activeAlerts: alertEngine.getActiveAlerts()
  });
});

app.get('/api/history', (req, res) => {
  res.json({
    count: historyRingBuffer.length,
    history: historyRingBuffer,
    alertHistory: alertEngine.getAlertHistory()
  });
});

app.post('/api/simulator/toggle', (req, res) => {
  const { enable } = req.body;
  if (enable === true) {
    startSimulator();
  } else if (enable === false) {
    stopSimulator();
  } else {
    // Toggle
    if (isSimulatorRunning) stopSimulator();
    else startSimulator();
  }
  broadcast({
    type: 'SIMULATOR_STATE',
    simulatorRunning: isSimulatorRunning,
    scenario: simulator.scenario
  });
  res.json({ success: true, simulatorRunning: isSimulatorRunning, scenario: simulator.scenario });
});

app.post('/api/simulator/scenario', (req, res) => {
  const { scenario } = req.body;
  simulator.setScenario(scenario);
  broadcast({
    type: 'SIMULATOR_STATE',
    simulatorRunning: isSimulatorRunning,
    scenario: simulator.scenario
  });
  res.json({ success: true, scenario: simulator.scenario });
});

app.post('/api/simulator/throttle', (req, res) => {
  const { value } = req.body;
  simulator.setManualThrottle(value);
  res.json({ success: true, throttle: simulator.manualThrottle });
});

/**
 * Raw Payload Injector: Allows testing ANY raw Teltonika JSON packet directly
 */
app.post('/api/telemetry/inject', (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const result = ingestPayload(payload, 'MANUAL_INJECTION');
  if (result) {
    res.json({ success: true, message: 'Payload decoded & broadcast successfully', decoded: result });
  } else {
    res.status(500).json({ error: 'Failed to decode payload' });
  }
});

app.post('/api/mqtt/config', (req, res) => {
  const { brokerUrl, topic } = req.body;
  setupMqttClient(brokerUrl, topic);
  res.json({ success: true, mqttStatus });
});

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  // Send immediate welcome packet with current state & history
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    data: latestDecoded,
    history: historyRingBuffer,
    activeAlerts: alertEngine.getActiveAlerts(),
    simulatorRunning: isSimulatorRunning,
    scenario: simulator.scenario,
    mqttStatus
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'SET_SCENARIO') {
        simulator.setScenario(msg.scenario);
        broadcast({ type: 'SIMULATOR_STATE', simulatorRunning: isSimulatorRunning, scenario: simulator.scenario });
      } else if (msg.type === 'TOGGLE_SIMULATOR') {
        if (isSimulatorRunning) stopSimulator();
        else startSimulator();
        broadcast({ type: 'SIMULATOR_STATE', simulatorRunning: isSimulatorRunning, scenario: simulator.scenario });
      } else if (msg.type === 'SET_THROTTLE') {
        simulator.setManualThrottle(msg.value);
      }
    } catch (e) {
      console.warn('[WS Message Error]:', e.message);
    }
  });
});

// Start initial simulation step & boot server
startSimulator();

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`   TELTONIKA FMC650 J1939 TELEMATICS PLATFORM RUNNING   `);
  console.log(`   Dashboard:  http://localhost:${PORT}                 `);
  console.log(`   WebSocket:  ws://localhost:${PORT}                   `);
  console.log(`   API Ingest: http://localhost:${PORT}/api/telemetry/inject `);
  console.log(`=======================================================`);
});
