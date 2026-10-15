/**
 * FMC650 Live Fleet Tracking Map
 * Leaflet.js with Dark CartoDB / OSM tiles, rotating truck icon & live breadcrumb trail
 */

class FleetTrackerMap {
  constructor() {
    this.map = null;
    this.truckMarker = null;
    this.trailPolyline = null;
    this.trailPoints = [];
    this.autoFollow = true;
    this.maxTrailPoints = 300;

    this.defaultCenter = [10.823078, 78.685815]; // Tiruchirappalli, Tamil Nadu

    this.initMap();
  }

  initMap() {
    const mapContainer = document.getElementById('leafletMap');
    if (!mapContainer || typeof L === 'undefined') {
      console.warn('Leaflet or map container not found');
      return;
    }

    // Initialize Leaflet map
    this.map = L.map('leafletMap', {
      center: this.defaultCenter,
      zoom: 14,
      zoomControl: false
    });

    // Add zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Clean high-resolution OpenStreetMap tile layer
    const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" style="color: #64748b;">OpenStreetMap</a>',
      maxZoom: 19
    });

    osmTileLayer.addTo(this.map);

    // Trail polyline with futuristic cyan glow
    this.trailPolyline = L.polyline([], {
      color: '#00f2fe',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: null
    }).addTo(this.map);

    // Custom SVG Rotating Truck Marker
    const truckIcon = L.divIcon({
      className: 'truck-custom-icon-wrapper',
      html: `
        <div class="truck-leaflet-marker" id="truckMarkerElem">
          <div class="truck-marker-beacon"></div>
          <div class="truck-marker-circle">
            <svg viewBox="0 0 24 24">
              <!-- Heavy Commercial Truck Cab SVG -->
              <path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5m-11 0A1.5 1.5 0 0 1 5.5 17 1.5 1.5 0 0 1 7 15.5 1.5 1.5 0 0 1 8.5 17 1.5 1.5 0 0 1 7 18.5M19.5 9.5l2.5 3V17h-2a3 3 0 0 0-6 0h-4a3 3 0 0 0-6 0H2V5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v4.5h4.5M6 13h5V6H4v7h2m13.5-2h-3.5V6.5h3.5l1.5 2V11Z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.truckMarker = L.marker(this.defaultCenter, { icon: truckIcon }).addTo(this.map);

    // Initial popup
    this.truckMarker.bindPopup(`
      <div style="font-family: Outfit, sans-serif; font-size: 13px; color: #1e293b;">
        <strong style="color: #0284c7;">Teltonika FMC650 Fleet Unit</strong><br/>
        <b>IMEI:</b> 867530901234567<br/>
        <b>Location:</b> Tiruchirappalli, Tamil Nadu<br/>
        <b>CAN Bus:</b> J1939 Active (250 kbps)
      </div>
    `);

    // Invalidate size on resize
    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });
  }

  updatePosition(kpis) {
    if (!this.map || !kpis) return;

    const lat = Number(kpis.lat);
    const lng = Number(kpis.lng);
    const heading = Number(kpis.heading || 0);

    if (isNaN(lat) || isNaN(lng)) return;

    const newPos = [lat, lng];

    // Update truck marker location
    if (this.truckMarker) {
      this.truckMarker.setLatLng(newPos);

      // Rotate truck icon towards vehicle heading
      const markerEl = document.getElementById('truckMarkerElem');
      if (markerEl) {
        markerEl.style.transform = `rotate(${heading}deg)`;
      }

      // Dynamic popup content
      this.truckMarker.setPopupContent(`
        <div style="font-family: Outfit, sans-serif; font-size: 13px; color: #0f172a; min-width: 170px;">
          <div style="font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
            FMC650 Live Telematics
          </div>
          <div><b>Speed:</b> ${kpis.speed} km/h (Gear: ${kpis.gear})</div>
          <div><b>RPM:</b> ${kpis.rpm}</div>
          <div><b>Fuel Rate:</b> ${kpis.fuelRate} L/h</div>
          <div><b>Coolant:</b> ${kpis.coolantTemp}°C | <b>Oil:</b> ${kpis.oilPressure} kPa</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</div>
        </div>
      `);
    }

    // Append to breadcrumb trail
    this.trailPoints.push(newPos);
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.shift();
    }
    if (this.trailPolyline) {
      this.trailPolyline.setLatLngs(this.trailPoints);
    }

    // Auto-follow truck
    if (this.autoFollow) {
      this.map.panTo(newPos, { animate: true, duration: 0.8 });
    }

    // Update Map HUD overlay
    const hudLat = document.getElementById('mapHudLat');
    const hudLng = document.getElementById('mapHudLng');
    const hudHeading = document.getElementById('mapHudHeading');
    const hudAlt = document.getElementById('mapHudAlt');

    if (hudLat) hudLat.innerText = lat.toFixed(6);
    if (hudLng) hudLng.innerText = lng.toFixed(6);
    if (hudHeading) hudHeading.innerText = `${Math.round(heading)}°`;
    if (hudAlt) hudAlt.innerText = `${kpis.altitude || 85} m`;
  }

  loadInitialTrail(history) {
    if (!history || !Array.isArray(history) || !this.map) return;
    this.trailPoints = [];
    history.forEach((pt) => {
      if (pt.lat && pt.lng) {
        this.trailPoints.push([pt.lat, pt.lng]);
      }
    });
    if (this.trailPolyline) {
      this.trailPolyline.setLatLngs(this.trailPoints);
    }
  }

  toggleAutoFollow(enable) {
    this.autoFollow = enable;
  }
}

window.FleetTrackerMap = FleetTrackerMap;
