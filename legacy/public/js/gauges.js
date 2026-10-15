/**
 * FMC650 Automotive Digital Cockpit Gauges
 * Ultra-smooth Canvas & SVG renders for Tachometer, Speedometer, and Engine Dials
 */

class CockpitGauges {
  constructor() {
    this.currentRPM = 0;
    this.targetRPM = 0;
    this.currentSpeed = 0;
    this.targetSpeed = 0;

    this.tachCanvas = document.getElementById('tachometerCanvas');
    this.speedCanvas = document.getElementById('speedometerCanvas');

    this.tachCtx = this.tachCanvas ? this.tachCanvas.getContext('2d') : null;
    this.speedCtx = this.speedCanvas ? this.speedCanvas.getContext('2d') : null;

    this.initCanvasResolution();
    this.startAnimationLoop();
  }

  initCanvasResolution() {
    const scale = window.devicePixelRatio || 1;
    [this.tachCanvas, this.speedCanvas].forEach((c) => {
      if (!c) return;
      const rect = c.getBoundingClientRect();
      c.width = rect.width * scale;
      c.height = rect.height * scale;
    });
  }

  updateValues(kpis) {
    if (!kpis) return;

    this.targetRPM = kpis.rpm || 0;
    this.targetSpeed = kpis.speed || 0;

    // Digital readouts
    const rpmValEl = document.getElementById('tachRpmVal');
    if (rpmValEl) rpmValEl.innerText = Math.round(this.targetRPM);

    const speedValEl = document.getElementById('speedKmVal');
    if (speedValEl) speedValEl.innerText = Math.round(this.targetSpeed);

    const gearBadgeEl = document.getElementById('cockpitGearBadge');
    if (gearBadgeEl) gearBadgeEl.innerText = kpis.gear || 'N';

    // Update Secondary Mini Gauges
    this.drawMiniArc('coolantCanvas', kpis.coolantTemp || 0, 40, 120, '°C', [
      { max: 75, color: '#38bdf8' },
      { max: 100, color: '#10b981' },
      { max: 106, color: '#f59e0b' },
      { max: 120, color: '#ef4444' }
    ]);

    this.drawMiniArc('oilPressCanvas', kpis.oilPressure || 0, 0, 800, 'kPa', [
      { max: 150, color: '#ef4444' },
      { max: 250, color: '#f59e0b' },
      { max: 600, color: '#10b981' },
      { max: 800, color: '#38bdf8' }
    ]);

    this.drawMiniArc('airTankCanvas', Math.min(kpis.airTank1 || 830, kpis.airTank2 || 825), 0, 1000, 'kPa', [
      { max: 550, color: '#ef4444' },
      { max: 680, color: '#f59e0b' },
      { max: 1000, color: '#10b981' }
    ]);

    this.drawMiniArc('extVoltCanvas', kpis.extVoltage || 24.2, 18, 32, 'V', [
      { max: 22, color: '#f59e0b' },
      { max: 29, color: '#10b981' },
      { max: 32, color: '#ef4444' }
    ]);

    // Update Fluid Bars
    const fuelFill = document.getElementById('fuelBarFill');
    const fuelText = document.getElementById('fuelBarText');
    const estFuelPct = Math.min(100, Math.max(0, Math.round(76 - ((kpis.totalFuel || 0) % 50))));
    if (fuelFill && fuelText) {
      fuelFill.style.width = `${estFuelPct}%`;
      fuelText.innerText = `${estFuelPct}%`;
    }

    const defFill = document.getElementById('defBarFill');
    const defText = document.getElementById('defBarText');
    if (defFill && defText) {
      const defPct = Math.round(kpis.defLevel || 74);
      defFill.style.width = `${defPct}%`;
      defText.innerText = `${defPct}%`;
      if (defPct < 15) {
        defFill.classList.add('warning');
      } else {
        defFill.classList.remove('warning');
      }
    }
  }

  startAnimationLoop() {
    const loop = () => {
      // Smooth lerp easing for gauge needles
      this.currentRPM += (this.targetRPM - this.currentRPM) * 0.15;
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * 0.15;

      this.drawTachometer(this.currentRPM);
      this.drawSpeedometer(this.currentSpeed);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  drawTachometer(rpm) {
    if (!this.tachCtx) return;
    const ctx = this.tachCtx;
    const w = this.tachCanvas.width;
    const h = this.tachCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.82;
    const radius = Math.min(w * 0.44, h * 0.72);

    const startAngle = Math.PI * 0.82;
    const endAngle = Math.PI * 2.18;
    const totalAngle = endAngle - startAngle;

    // 1. Outer background arc track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. RPM Zones:
    // Green Sweet Spot: 1000 - 1700 RPM
    // Yellow Warning: 1700 - 2200 RPM
    // Redline: 2200 - 3500 RPM
    const maxRpm = 3500;
    const getAngle = (val) => startAngle + (Math.min(maxRpm, Math.max(0, val)) / maxRpm) * totalAngle;

    // Sweet Spot Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, getAngle(1000), getAngle(1700));
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.stroke();

    // Caution Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, getAngle(1700), getAngle(2200));
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.stroke();

    // Redline Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, getAngle(2200), endAngle);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.stroke();

    // Active RPM Gradient Sweep
    const currentAngle = getAngle(rpm);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, currentAngle);
    ctx.lineWidth = 12;
    const strokeGrad = ctx.createLinearGradient(0, cy, w, cy);
    strokeGrad.addColorStop(0, '#00f2fe');
    strokeGrad.addColorStop(0.5, '#3b82f6');
    strokeGrad.addColorStop(0.8, rpm > 2200 ? '#ef4444' : '#10b981');
    ctx.strokeStyle = strokeGrad;
    ctx.stroke();

    // Tick marks
    for (let r = 0; r <= maxRpm; r += 500) {
      const a = getAngle(r);
      const isMajor = r % 1000 === 0;
      const tickInner = radius - (isMajor ? 24 : 16);
      const tickOuter = radius - 8;

      const x1 = cx + Math.cos(a) * tickInner;
      const y1 = cy + Math.sin(a) * tickInner;
      const x2 = cx + Math.cos(a) * tickOuter;
      const y2 = cy + Math.sin(a) * tickOuter;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.strokeStyle = r >= 2200 ? '#ef4444' : 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      // Number labels
      if (isMajor) {
        const textRadius = radius - 38;
        const tx = cx + Math.cos(a) * textRadius;
        const ty = cy + Math.sin(a) * textRadius;
        ctx.fillStyle = r >= 2200 ? '#ef4444' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r / 100, tx, ty);
      }
    }

    // Needle
    const needleAngle = getAngle(rpm);
    const needleLen = radius - 15;
    const nx = cx + Math.cos(needleAngle) * needleLen;
    const ny = cy + Math.sin(needleAngle) * needleLen;

    ctx.save();
    ctx.shadowColor = rpm > 2200 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 242, 254, 0.8)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 4;
    ctx.strokeStyle = rpm > 2200 ? '#ef4444' : '#00f2fe';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center pivot cap
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00f2fe';
    ctx.stroke();
    ctx.restore();
  }

  drawSpeedometer(speed) {
    if (!this.speedCtx) return;
    const ctx = this.speedCtx;
    const w = this.speedCanvas.width;
    const h = this.speedCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.82;
    const radius = Math.min(w * 0.44, h * 0.72);

    const startAngle = Math.PI * 0.82;
    const endAngle = Math.PI * 2.18;
    const totalAngle = endAngle - startAngle;
    const maxSpeed = 140;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Active speed sweep
    const getAngle = (val) => startAngle + (Math.min(maxSpeed, Math.max(0, val)) / maxSpeed) * totalAngle;
    const currentAngle = getAngle(speed);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, currentAngle);
    ctx.lineWidth = 12;
    const speedGrad = ctx.createLinearGradient(0, cy, w, cy);
    speedGrad.addColorStop(0, '#00f2fe');
    speedGrad.addColorStop(0.7, '#3b82f6');
    speedGrad.addColorStop(1, speed > 80 ? '#ef4444' : '#10b981'); // 80 km/h Indian speed limit warning
    ctx.strokeStyle = speedGrad;
    ctx.stroke();

    // Speed Ticks
    for (let s = 0; s <= maxSpeed; s += 20) {
      const a = getAngle(s);
      const isMajor = s % 40 === 0;
      const tickInner = radius - (isMajor ? 24 : 16);
      const tickOuter = radius - 8;

      const x1 = cx + Math.cos(a) * tickInner;
      const y1 = cy + Math.sin(a) * tickInner;
      const x2 = cx + Math.cos(a) * tickOuter;
      const y2 = cy + Math.sin(a) * tickOuter;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.strokeStyle = s > 80 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      // Number labels
      if (isMajor) {
        const textRadius = radius - 38;
        const tx = cx + Math.cos(a) * textRadius;
        const ty = cy + Math.sin(a) * textRadius;
        ctx.fillStyle = s > 80 ? '#ef4444' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s, tx, ty);
      }
    }

    // Needle
    const needleAngle = getAngle(speed);
    const needleLen = radius - 15;
    const nx = cx + Math.cos(needleAngle) * needleLen;
    const ny = cy + Math.sin(needleAngle) * needleLen;

    ctx.save();
    ctx.shadowColor = speed > 80 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 4;
    ctx.strokeStyle = speed > 80 ? '#ef4444' : '#38bdf8';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center pivot cap
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();
    ctx.restore();
  }

  drawMiniArc(canvasId, value, min, max, unit, colorThresholds) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = window.devicePixelRatio || 1;

    if (canvas.width !== canvas.clientWidth * scale) {
      canvas.width = canvas.clientWidth * scale;
      canvas.height = canvas.clientHeight * scale;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.78;
    const radius = Math.min(w * 0.38, h * 0.6);

    const startAngle = Math.PI * 0.85;
    const endAngle = Math.PI * 2.15;
    const totalAngle = endAngle - startAngle;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value Arc
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const currentAngle = startAngle + pct * totalAngle;

    let arcColor = '#00f2fe';
    for (const t of colorThresholds) {
      if (value <= t.max) {
        arcColor = t.color;
        break;
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, currentAngle);
    ctx.lineWidth = 8;
    ctx.strokeStyle = arcColor;
    ctx.stroke();

    // Update text element if present
    const textEl = document.getElementById(canvasId.replace('Canvas', 'Val'));
    if (textEl) {
      textEl.innerText = `${typeof value === 'number' ? value.toFixed(unit === '°C' || unit === 'V' ? 1 : 0) : value} ${unit}`;
      textEl.style.color = arcColor;
    }
  }
}

window.CockpitGauges = CockpitGauges;
