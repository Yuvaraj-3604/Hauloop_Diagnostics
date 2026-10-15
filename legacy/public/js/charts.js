/**
 * FMC650 Real-time Telemetry Trend Sparklines
 * Chart.js multi-series streaming sparkline for Engine Load, RPM, Speed, and Fuel Rate
 */

class TelemetryCharts {
  constructor() {
    this.chart = null;
    this.maxPoints = 35;
    this.initChart();
  }

  initChart() {
    const ctx = document.getElementById('telemetryTrendChart');
    if (!ctx || typeof Chart === 'undefined') {
      console.warn('Chart.js or canvas not found');
      return;
    }

    const labels = [];
    const rpmData = [];
    const speedData = [];
    const fuelRateData = [];
    const loadData = [];

    for (let i = 0; i < 20; i++) {
      labels.push('');
      rpmData.push(1450);
      speedData.push(65);
      fuelRateData.push(20);
      loadData.push(45);
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Engine RPM',
            data: rpmData,
            borderColor: '#00f2fe',
            backgroundColor: 'rgba(0, 242, 254, 0.08)',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'yRPM',
            fill: true
          },
          {
            label: 'Speed (km/h)',
            data: speedData,
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'ySpeed'
          },
          {
            label: 'Fuel Rate (L/h)',
            data: fuelRateData,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            borderDash: [4, 4],
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'yFuel'
          },
          {
            label: 'Engine Load %',
            data: loadData,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'yLoad'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300, easing: 'linear' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 11, weight: 600 },
              boxWidth: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(0, 242, 254, 0.4)',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 11 },
            padding: 10
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          yRPM: {
            type: 'linear',
            position: 'left',
            min: 500,
            max: 3000,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#00f2fe',
              font: { family: 'JetBrains Mono', size: 10 },
              stepSize: 500
            }
          },
          ySpeed: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 120,
            grid: { display: false },
            ticks: {
              color: '#3b82f6',
              font: { family: 'JetBrains Mono', size: 10 }
            }
          },
          yFuel: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 60,
            display: false
          },
          yLoad: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            display: false
          }
        }
      }
    });
  }

  pushDataPoint(kpis) {
    if (!this.chart || !kpis) return;

    const timeLabel = new Date().toLocaleTimeString();
    const chartData = this.chart.data;

    chartData.labels.push(timeLabel);
    chartData.datasets[0].data.push(kpis.rpm || 0);
    chartData.datasets[1].data.push(kpis.speed || 0);
    chartData.datasets[2].data.push(kpis.fuelRate || 0);
    chartData.datasets[3].data.push(kpis.engineLoad || 0);

    if (chartData.labels.length > this.maxPoints) {
      chartData.labels.shift();
      chartData.datasets.forEach((ds) => ds.data.shift());
    }

    this.chart.update('none'); // Update without full redraw glitch
  }

  loadInitialHistory(history) {
    if (!this.chart || !history || !Array.isArray(history)) return;
    const chartData = this.chart.data;
    chartData.labels = [];
    chartData.datasets[0].data = [];
    chartData.datasets[1].data = [];
    chartData.datasets[2].data = [];
    chartData.datasets[3].data = [];

    const recent = history.slice(-this.maxPoints);
    recent.forEach((pt) => {
      const d = pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString() : '';
      chartData.labels.push(d);
      chartData.datasets[0].data.push(pt.rpm || 0);
      chartData.datasets[1].data.push(pt.speed || 0);
      chartData.datasets[2].data.push(pt.fuelRate || 0);
      chartData.datasets[3].data.push(pt.engineLoad || 0);
    });

    this.chart.update();
  }
}

window.TelemetryCharts = TelemetryCharts;
