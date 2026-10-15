/**
 * FMC650 Commercial Vehicle & J1939 CAN Telematics Simulator
 * Simulates real-time truck dynamics on Tamil Nadu NH-45 / NH-83 Trichy corridor
 */

class VehicleSimulator {
  constructor() {
    this.imei = '867530901234567';
    this.scenario = 'HIGHWAY'; // HIGHWAY, UPHILL, OVERHEAT, LOW_OIL, HARSH_BRAKE, IDLE
    this.tickCount = 0;

    // Route Waypoints: NH-45 / NH-83 around Tiruchirappalli (Trichy), Tamil Nadu
    this.waypoints = [
      { lat: 10.823078, lng: 78.685815 },
      { lat: 10.831520, lng: 78.694210 },
      { lat: 10.842340, lng: 78.706150 },
      { lat: 10.858010, lng: 78.721020 },
      { lat: 10.875230, lng: 78.735440 },
      { lat: 10.892010, lng: 78.749020 },
      { lat: 10.908050, lng: 78.761040 },
      { lat: 10.901500, lng: 78.775200 },
      { lat: 10.884100, lng: 78.762100 },
      { lat: 10.865300, lng: 78.744300 },
      { lat: 10.846200, lng: 78.722400 },
      { lat: 10.830100, lng: 78.701100 }
    ];

    this.currentWpIndex = 0;
    this.wpProgress = 0.0;

    // Vehicle physical baseline state
    this.lat = this.waypoints[0].lat;
    this.lng = this.waypoints[0].lng;
    this.altitude = 85.0;
    this.angle = 48.0;

    this.gear = 7;
    this.speed = 68.0;
    this.rpm = 1450;
    this.pedal = 42.0;
    this.torque = 58.0;
    this.coolantTemp = 89.0;
    this.oilPressure = 420.0; // kPa
    this.fuelRate = 21.5; // L/h
    this.totalFuel = 42150.0; // Liters lifetime
    this.engineHours = 1245.5; // Hours lifetime
    this.defLevel = 74.0; // %
    this.airTank1 = 830.0; // kPa
    this.airTank2 = 825.0; // kPa
    this.dpfDeltaP = 7.5; // kPa
    this.axleWeight = 14600; // kg
    this.extVoltage = 24.6; // 24V commercial alternator charging
    this.gForce = 0.04;
    this.manualThrottle = null; // Optional manual override from UI
  }

  setScenario(name) {
    if (['HIGHWAY', 'UPHILL', 'OVERHEAT', 'LOW_OIL', 'HARSH_BRAKE', 'IDLE'].includes(name)) {
      this.scenario = name;
      console.log(`[Simulator] Switched to scenario: ${name}`);
    }
  }

  setManualThrottle(val) {
    this.manualThrottle = val === null ? null : Math.max(0, Math.min(100, Number(val)));
  }

  /**
   * Advance simulation by one step (called typically every 1000ms)
   */
  step() {
    this.tickCount++;

    // Calculate heading and move vehicle along GPS waypoint corridor
    const currentWp = this.waypoints[this.currentWpIndex];
    const nextWp = this.waypoints[(this.currentWpIndex + 1) % this.waypoints.length];

    // Compute bearing in degrees
    const y = Math.sin((nextWp.lng - currentWp.lng) * Math.PI / 180) * Math.cos(nextWp.lat * Math.PI / 180);
    const x = Math.cos(currentWp.lat * Math.PI / 180) * Math.sin(nextWp.lat * Math.PI / 180) -
              Math.sin(currentWp.lat * Math.PI / 180) * Math.cos(nextWp.lat * Math.PI / 180) * Math.cos((nextWp.lng - currentWp.lng) * Math.PI / 180);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    this.angle = Math.round((bearing + 360) % 360);

    // Apply scenario dynamic physics
    switch (this.scenario) {
      case 'IDLE':
        this.speed = Math.max(0, this.speed - 5);
        this.gear = 0;
        this.rpm = 650 + Math.floor(Math.sin(this.tickCount * 0.5) * 20);
        this.pedal = 0;
        this.torque = 15;
        this.fuelRate = 2.4;
        this.coolantTemp = Math.max(78, this.coolantTemp - 0.2);
        this.oilPressure = 280;
        this.gForce = 0.01;
        break;

      case 'UPHILL':
        // Heavy haul uphill pulling 90% load
        this.pedal = this.manualThrottle !== null ? this.manualThrottle : 85 + Math.sin(this.tickCount * 0.3) * 5;
        this.gear = 5;
        this.speed = 46 + Math.sin(this.tickCount * 0.2) * 3;
        this.rpm = 1750 + Math.sin(this.tickCount * 0.4) * 80;
        this.torque = 92;
        this.fuelRate = 44.5 + Math.random() * 2;
        this.coolantTemp = Math.min(99.5, this.coolantTemp + 0.3);
        this.oilPressure = 450;
        this.dpfDeltaP = 14.2;
        this.gForce = 0.12;
        break;

      case 'OVERHEAT':
        // Thermostat stuck / coolant radiator choked
        this.gear = 6;
        this.speed = 55;
        this.rpm = 1680 + Math.sin(this.tickCount * 0.4) * 50;
        this.pedal = 60;
        this.torque = 70;
        this.fuelRate = 28;
        // Escalates rapidly to trigger critical overheat alert (>108°C)
        this.coolantTemp = Math.min(112.5, this.coolantTemp + 0.8);
        this.oilPressure = Math.max(160, 380 - (this.coolantTemp - 90) * 8);
        this.gForce = 0.05;
        break;

      case 'LOW_OIL':
        // Oil leak / pressure sensor fault
        this.gear = 6;
        this.speed = 58;
        this.rpm = 1520;
        this.pedal = 50;
        this.torque = 55;
        this.fuelRate = 22;
        this.coolantTemp = 93;
        // Drops rapidly below 150 kPa to trigger critical lube starvation alert
        this.oilPressure = Math.max(90, this.oilPressure - 18);
        this.gForce = 0.04;
        break;

      case 'HARSH_BRAKE':
        // Emergency deceleration
        this.pedal = 0;
        this.speed = Math.max(8, this.speed - 16);
        this.rpm = Math.max(800, 1100 - (68 - this.speed) * 15);
        this.gear = this.speed > 30 ? 4 : 2;
        this.torque = -30;
        this.fuelRate = 3.5;
        this.airTank1 = Math.max(520, this.airTank1 - 40); // Air brake consumption
        this.airTank2 = Math.max(510, this.airTank2 - 40);
        this.gForce = -0.58; // Harsh braking G-force
        // Recover after a few ticks
        if (this.speed <= 10) {
          this.scenario = 'HIGHWAY';
        }
        break;

      case 'HIGHWAY':
      default:
        // Realistic cruising along Tamil Nadu NH-45 highway
        const targetPedal = this.manualThrottle !== null ? this.manualThrottle : 45 + Math.sin(this.tickCount * 0.15) * 8;
        this.pedal = targetPedal;

        // Realistic gear & RPM mapping
        const targetSpeed = 65 + (this.pedal / 100) * 25 + Math.sin(this.tickCount * 0.1) * 3;
        this.speed += (targetSpeed - this.speed) * 0.15;

        if (this.speed < 20) this.gear = 2;
        else if (this.speed < 35) this.gear = 4;
        else if (this.speed < 52) this.gear = 6;
        else if (this.speed < 70) this.gear = 7;
        else this.gear = 8;

        // RPM peaks and drops across gears
        const gearRatio = [0, 14.5, 9.8, 6.5, 4.3, 3.1, 2.2, 1.5, 1.0][this.gear] || 1.0;
        this.rpm = Math.round(Math.min(2350, Math.max(750, 700 + (this.speed * gearRatio * 11) + (this.pedal * 4))));

        this.torque = Math.round(25 + (this.pedal * 0.8));
        this.fuelRate = Number((2.8 + (this.rpm / 2000) * (this.pedal / 50) * 18.5).toFixed(2));
        this.coolantTemp = Number((88.0 + Math.sin(this.tickCount * 0.05) * 2.5).toFixed(1));
        this.oilPressure = Number((380.0 + (this.rpm / 1000) * 45).toFixed(0));
        this.gForce = Number((Math.sin(this.tickCount * 0.2) * 0.08).toFixed(2));

        // Air compressors maintain 820-850 kPa
        if (this.airTank1 < 840) this.airTank1 += 4;
        if (this.airTank2 < 835) this.airTank2 += 4;
        break;
    }

    // Cumulative stats
    if (this.speed > 0) {
      // Speed in km/h -> km per sec -> advance waypoint progress
      const kmPerSec = this.speed / 3600.0;
      this.wpProgress += kmPerSec * 0.8; // scaling factor for smooth visible map progress
      if (this.wpProgress >= 1.0) {
        this.wpProgress = 0.0;
        this.currentWpIndex = (this.currentWpIndex + 1) % this.waypoints.length;
      }

      // Linear interpolation between waypoints
      const fromWp = this.waypoints[this.currentWpIndex];
      const toWp = this.waypoints[(this.currentWpIndex + 1) % this.waypoints.length];
      this.lat = fromWp.lat + (toWp.lat - fromWp.lat) * this.wpProgress;
      this.lng = fromWp.lng + (toWp.lng - fromWp.lng) * this.wpProgress;
    }

    // Accumulate total fuel & engine hours
    this.totalFuel += (this.fuelRate / 3600.0);
    this.engineHours += (1 / 3600.0);
    this.defLevel = Math.max(5.0, this.defLevel - 0.005); // slow DEF consumption

    // Package as raw FMC650 AVL representation using reverse math to match physical values
    const rawRPM = Math.round(this.rpm / 0.125);
    const rawSpeed = Math.round(this.speed * 256);
    const rawPedal = Math.round(this.pedal / 0.4);
    const rawTorque = Math.round(this.torque + 125);
    const rawTotalFuel = Math.round(this.totalFuel / 0.5);
    const rawHours = Math.round(this.engineHours / 0.05);
    const rawFuelRate = Math.round(this.fuelRate / 0.05);
    const rawCoolant = Math.round(this.coolantTemp + 40);
    const rawOil = Math.round(this.oilPressure / 4);
    const rawDEF = Math.round(this.defLevel / 0.4);
    const rawAir1 = Math.round(this.airTank1 / 8);
    const rawAir2 = Math.round(this.airTank2 / 8);
    const rawGear = Math.round(this.gear + 125);
    const rawDeltaP = Math.round(this.dpfDeltaP / 0.1);
    const rawAxle = Math.round(this.axleWeight / 0.5);

    return {
      imei: this.imei,
      timestamp: new Date().toISOString(),
      lat: Number(this.lat.toFixed(6)),
      lng: Number(this.lng.toFixed(6)),
      alt: Math.round(this.altitude),
      angle: this.angle,
      avl: {
        '145': rawRPM,
        '146': rawSpeed,
        '147': rawPedal,
        '148': rawTorque,
        '149': rawTotalFuel,
        '150': rawHours,
        '151': rawFuelRate,
        '152': rawCoolant,
        '153': rawOil,
        '154': rawDEF,
        '380': rawAir1,
        '381': rawAir2,
        '382': rawGear,
        '383': rawDeltaP,
        '384': rawAxle,
        '239': 1, // Ignition ON
        '66': Math.round(this.extVoltage * 1000),
        '67': 4120,
        '24': Math.round(this.speed),
        '254': Math.round(Math.abs(this.gForce) * 100)
      }
    };
  }
}

module.exports = VehicleSimulator;
