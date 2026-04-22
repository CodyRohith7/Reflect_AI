/* ============================================================
   ReflectAI v5.0 — Core Logic & Simulation Engine
   ============================================================ */

// Initialize Icons
lucide.createIcons();

// --- Navigation & View Management ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        // Update Nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        // Update View
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
        document.getElementById(targetId).classList.add('active-view');
        
        // Lazy load charts/maps if needed
        if(targetId === 'predictive') initAnalytics();
        if(targetId === 'network') initNetworkMap();
    });
});

// --- Simulation State ---
let isScanning = false;
let scanInterval;
let scanTime = 0;
let distScanned = 0;
let assetsCount = 0;
let critCount = 0;

const weatherModes = ['Clear Day', 'Night Vision (NIR)', 'Rain/Wet (Polarized)', 'Fog (Enhancement)'];
let currentMode = 0;

function toggleWeather() {
    currentMode = (currentMode + 1) % weatherModes.length;
    alert(`Sensors adapted to: ${weatherModes[currentMode]}`);
}

function toggleScan() {
    isScanning = !isScanning;
    const btn = document.getElementById('btn-scan');
    
    if (isScanning) {
        btn.innerHTML = '<i data-lucide="square"></i> <span>Stop Scan</span>';
        btn.style.background = 'var(--danger)';
        btn.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
        lucide.createIcons();
        scanInterval = setInterval(simulationTick, 100); // 10 ticks per sec
    } else {
        btn.innerHTML = '<i data-lucide="play"></i> <span>Start Scan</span>';
        btn.style.background = 'var(--primary)';
        btn.style.boxShadow = '0 4px 15px var(--primary-glow)';
        lucide.createIcons();
        clearInterval(scanInterval);
    }
}

// --- Video Feed Simulation ---
const camCtx = document.getElementById('camera-feed').getContext('2d');
const depthCtx = document.getElementById('depth-feed').getContext('2d');

function drawFeeds() {
    const cw = camCtx.canvas.width;
    const ch = camCtx.canvas.height;
    
    // Draw Primary Feed (Simulated Highway)
    camCtx.fillStyle = '#111827';
    camCtx.fillRect(0, 0, cw, ch);
    
    // Road Horizon
    camCtx.fillStyle = '#030712';
    camCtx.fillRect(0, 0, cw, ch/2);
    
    // Lane Lines (Moving)
    camCtx.strokeStyle = '#f8fafc';
    camCtx.lineWidth = 4;
    camCtx.setLineDash([30, 30]);
    camCtx.lineDashOffset = -(scanTime * 15);
    
    camCtx.beginPath();
    camCtx.moveTo(cw/2, ch/2);
    camCtx.lineTo(cw/2 - 200, ch);
    camCtx.stroke();
    
    camCtx.beginPath();
    camCtx.moveTo(cw/2, ch/2);
    camCtx.lineTo(cw/2 + 200, ch);
    camCtx.stroke();
    camCtx.setLineDash([]);
    
    // Depth Feed (Simulated Point Cloud/Depth Map)
    const dw = depthCtx.canvas.width;
    const dh = depthCtx.canvas.height;
    
    // Create matrix-like depth visualization
    const imgData = depthCtx.createImageData(dw, dh);
    for (let i = 0; i < imgData.data.length; i += 4) {
        // Higher intensity near bottom (closer)
        const y = Math.floor((i / 4) / dw);
        const depth = (y / dh) * 255; 
        const noise = Math.random() * 50;
        
        imgData.data[i] = 14;     // R
        imgData.data[i+1] = Math.min(255, depth + noise); // G (Cyan/Blue tint)
        imgData.data[i+2] = Math.min(255, depth + noise + 50); // B
        imgData.data[i+3] = 255;  // Alpha
    }
    depthCtx.putImageData(imgData, 0, 0);

    // AI Bounding Boxes overlay on Primary
    if (Math.random() > 0.95) { // Occasional detection
        detectAsset(cw, ch);
    }
}

let currentDetections = [];
function detectAsset(cw, ch) {
    const types = [
        {name: 'Speed Sign (80)', minRL: 150, type: 'sign'},
        {name: 'Center Line', minRL: 100, type: 'mark'},
        {name: 'Edge Line', minRL: 80, type: 'mark'},
        {name: 'Road Stud', minRL: 120, type: 'stud'}
    ];
    
    const asset = types[Math.floor(Math.random() * types.length)];
    
    // Simulate RL calculation based on physics
    const baseRL = asset.minRL + 50;
    const degradation = Math.random() * 100;
    const measuredRL = Math.max(10, Math.floor(baseRL - degradation));
    
    let status = 'ok';
    let color = 'var(--success)';
    if (measuredRL < asset.minRL) { status = 'crit'; color = 'var(--danger)'; critCount++; }
    else if (measuredRL < asset.minRL + 30) { status = 'warn'; color = 'var(--warning)'; }
    
    currentDetections.push({
        ...asset, rl: measuredRL, status, color,
        x: Math.random() * (cw - 100) + 50,
        y: Math.random() * (ch/2) + ch/4,
        life: 20 // frames
    });
    
    logDetection(asset.name, measuredRL, status);
    assetsCount++;
}

function drawDetections() {
    currentDetections = currentDetections.filter(d => d.life > 0);
    
    currentDetections.forEach(d => {
        camCtx.strokeStyle = d.color;
        camCtx.lineWidth = 2;
        camCtx.strokeRect(d.x - 20, d.y - 20, 40, 40);
        
        camCtx.fillStyle = d.color;
        camCtx.font = '12px "JetBrains Mono"';
        camCtx.fillText(`${d.name} [RL:${d.rl}]`, d.x - 20, d.y - 25);
        
        d.life--;
        // move bounding box to simulate driving past
        d.y += 5;
        d.x += (d.x > camCtx.canvas.width/2 ? 5 : -5); 
    });
}

function logDetection(name, rl, status) {
    const log = document.getElementById('detection-log');
    const item = document.createElement('div');
    item.className = `log-item ${status}`;
    item.innerHTML = `
        <div>
            <span class="log-asset">${name}</span>
            <span class="text-secondary" style="font-size:0.7rem">GPS: 28.61°N, 77.20°E</span>
        </div>
        <div style="text-align:right">
            <span class="log-rl">${rl}</span> <span class="text-secondary" style="font-size:0.6rem">mcd/m²/lx</span><br>
            <span class="badge" style="border:none; padding:0; background:none;">${status.toUpperCase()}</span>
        </div>
    `;
    log.prepend(item);
    if(log.children.length > 20) log.removeChild(log.lastChild);
}

// --- Main Simulation Loop ---
function simulationTick() {
    scanTime++;
    
    // Update UI Metrics
    distScanned += 0.022; // approx 80km/h
    document.getElementById('m-dist').innerText = distScanned.toFixed(2) + ' km';
    document.getElementById('m-assets').innerText = assetsCount;
    document.getElementById('m-crit').innerText = critCount;
    
    const health = 100 - (critCount / Math.max(1, assetsCount)) * 100;
    const hEl = document.getElementById('m-health');
    hEl.innerText = health.toFixed(1) + '%';
    hEl.className = `m-val ${health > 90 ? 'text-green' : health > 75 ? 'text-orange' : 'text-red'}`;
    
    // Telemetry updates
    document.getElementById('t-speed').innerText = (78 + Math.random()*5).toFixed(1) + ' km/h';
    document.getElementById('t-gyro').innerText = `${(Math.random()*2-1).toFixed(1)}° / ${(Math.random()*1-0.5).toFixed(1)}°`;
    
    // Format Time
    const d = new Date(scanTime * 100);
    document.getElementById('hud-time').innerText = d.toISOString().substr(11, 8);
    
    // Render
    drawFeeds();
    drawDetections();
}

// Initialize blank feeds
drawFeeds();

// --- Analytics View Initialization ---
let chartsDrawn = false;
function initAnalytics() {
    if(chartsDrawn) return;
    chartsDrawn = true;
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    
    // 1. Predictive Line Chart
    new Chart(document.getElementById('predictive-chart'), {
        type: 'line',
        data: {
            labels: ['Now', 'Day 15', 'Day 30', 'Day 45', 'Day 60', 'Day 75', 'Day 90'],
            datasets: [{
                label: 'Avg Reflectivity (Signs)',
                data: [180, 175, 168, 155, 148, 140, 132],
                borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4
            },{
                label: 'IRC Minimum Threshold',
                data: [150, 150, 150, 150, 150, 150, 150],
                borderColor: '#ef4444', borderDash: [5,5], pointRadius: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    
    // 2. Doughnut
    new Chart(document.getElementById('doughnut-chart'), {
        type: 'doughnut',
        data: {
            labels: ['Signs', 'Markings', 'Studs'],
            datasets: [{
                data: [45, 120, 30],
                backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
    });
    
    // 3. Radar
    new Chart(document.getElementById('radar-chart'), {
        type: 'radar',
        data: {
            labels: ['UV Exposure', 'Traffic Volume', 'Pollution/Dust', 'Rainfall', 'Temp Variations'],
            datasets: [{
                label: 'Degradation Impact',
                data: [85, 90, 60, 45, 30],
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                borderColor: '#0ea5e9',
                pointBackgroundColor: '#0ea5e9'
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
    
    // Populate Risk Table
    const tbody = document.getElementById('risk-table');
    const risks = [
        {id: 'SGN-1042', t: 'Speed Limit', eta: '5 Days', act: 'Generate W.O.'},
        {id: 'MRK-881', t: 'Edge Line', eta: '12 Days', act: 'Schedule Paint'},
        {id: 'SGN-291', t: 'Directional', eta: '14 Days', act: 'Clean Surface'}
    ];
    risks.forEach(r => {
        tbody.innerHTML += `<tr><td><span class="highlight">${r.id}</span></td><td>${r.t}</td><td class="text-orange">${r.eta}</td><td><button class="badge" style="cursor:pointer">${r.act}</button></td></tr>`;
    });
}

// --- Network Map ---
let mapDrawn = false;
function initNetworkMap() {
    if(mapDrawn) return;
    mapDrawn = true;
    
    const ctx = document.getElementById('network-map').getContext('2d');
    const w = ctx.canvas.width; const h = ctx.canvas.height;
    
    // Draw abstract map
    ctx.fillStyle = '#030712';
    ctx.fillRect(0,0,w,h);
    
    // Draw connections
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.2)';
    ctx.lineWidth = 2;
    for(let i=0; i<50; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*w, Math.random()*h);
        ctx.bezierCurveTo(Math.random()*w, Math.random()*h, Math.random()*w, Math.random()*h, Math.random()*w, Math.random()*h);
        ctx.stroke();
    }
    
    // Nodes
    for(let i=0; i<100; i++) {
        const x = Math.random()*w; const y = Math.random()*h;
        ctx.beginPath();
        ctx.arc(x, y, Math.random()*4+2, 0, Math.PI*2);
        
        const rand = Math.random();
        if(rand > 0.9) { ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; }
        else if(rand > 0.7) { ctx.fillStyle = '#f59e0b'; ctx.shadowColor = '#f59e0b'; }
        else { ctx.fillStyle = '#10b981'; ctx.shadowColor = '#10b981'; }
        
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
