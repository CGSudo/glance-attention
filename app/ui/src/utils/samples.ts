export type SampleType = 'hero' | 'product' | 'mobile' | 'ad' | 'tall';

export interface SampleMeta {
  id: SampleType;
  name: string;
  subtitle: string;
  thumbnail: string;
  isTall?: boolean;
}

export const HERO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="hBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>
    <linearGradient id="hCta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
    <linearGradient id="hChart" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.0"/>
    </linearGradient>
    <radialGradient id="hGlow" cx="20%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0d9488" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="800" height="500" fill="url(#hBg)"/>
  <rect width="800" height="500" fill="url(#hGlow)"/>

  <!-- Top Navbar -->
  <rect width="800" height="54" fill="#0d1322" fill-opacity="0.9"/>
  <line x1="0" y1="54" x2="800" y2="54" stroke="#1e293b" stroke-width="1"/>
  
  <rect x="36" y="17" width="20" height="20" rx="5" fill="#14b8a6"/>
  <polygon points="46,20 52,31 40,31" fill="#ffffff"/>
  <text x="64" y="32" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700">ApexFlow</text>
  
  <text x="175" y="32" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Features</text>
  <text x="245" y="32" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Solutions</text>
  <text x="320" y="32" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Pricing</text>
  <text x="380" y="32" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Docs</text>

  <text x="670" y="32" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12" font-weight="500">Sign in</text>
  <rect x="720" y="15" width="44" height="24" rx="4" fill="#1e293b"/>
  <text x="742" y="31" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" font-weight="600">v2.4</text>

  <!-- Announcement Pill -->
  <rect x="36" y="78" width="224" height="24" rx="12" fill="#134e4a" fill-opacity="0.4" stroke="#14b8a6" stroke-width="1"/>
  <circle cx="48" cy="90" r="4" fill="#2dd4bf"/>
  <text x="58" y="94" fill="#2dd4bf" font-family="system-ui, sans-serif" font-size="11" font-weight="600">NEW: FlowEngine 2.0 is live</text>
  <text x="242" y="94" fill="#2dd4bf" font-family="system-ui, sans-serif" font-size="11">→</text>

  <!-- Main Hero Headline -->
  <text x="36" y="142" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">Turn complex telemetry</text>
  <text x="36" y="180" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">into decisive action.</text>

  <!-- Subheadline -->
  <text x="36" y="214" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" font-weight="400">Continuous visual observability for distributed engineering teams.</text>
  <text x="36" y="234" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" font-weight="400">Detect regressions, optimize bottlenecks, deploy with confidence.</text>

  <!-- CTA Buttons -->
  <g id="cta-button" cursor="pointer">
    <rect x="36" y="258" width="184" height="44" rx="8" fill="url(#hCta)"/>
    <text x="128" y="285" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="700" text-anchor="middle">Start 14-day free trial →</text>
  </g>
  <g id="demo-button" cursor="pointer">
    <rect x="232" y="258" width="128" height="44" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <polygon points="252,274 252,286 262,280" fill="#cbd5e1"/>
    <text x="298" y="285" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">Live demo</text>
  </g>

  <!-- Social proof / Trust badges -->
  <text x="36" y="328" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">✓ No credit card required   ✓ SOC2 Type II   ✓ 99.99% SLA</text>

  <!-- Metric badges row -->
  <g transform="translate(36, 352)">
    <rect width="105" height="48" rx="6" fill="#0f172a" stroke="#1e293b"/>
    <text x="12" y="20" fill="#64748b" font-family="system-ui, sans-serif" font-size="10">Active nodes</text>
    <text x="12" y="40" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700">12,840</text>
  </g>
  <g transform="translate(151, 352)">
    <rect width="105" height="48" rx="6" fill="#0f172a" stroke="#1e293b"/>
    <text x="12" y="20" fill="#64748b" font-family="system-ui, sans-serif" font-size="10">Avg latency</text>
    <text x="12" y="40" fill="#2dd4bf" font-family="system-ui, sans-serif" font-size="15" font-weight="700">1.8 ms</text>
  </g>
  <g transform="translate(266, 352)">
    <rect width="105" height="48" rx="6" fill="#0f172a" stroke="#1e293b"/>
    <text x="12" y="20" fill="#64748b" font-family="system-ui, sans-serif" font-size="10">Pipeline health</text>
    <text x="12" y="40" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="15" font-weight="700">100%</text>
  </g>

  <!-- Right Side Mockup Card -->
  <g transform="translate(406, 78)">
    <rect width="358" height="388" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
    <rect width="358" height="32" rx="12" fill="#1e293b"/>
    <circle cx="20" cy="16" r="4" fill="#ef4444"/>
    <circle cx="34" cy="16" r="4" fill="#f59e0b"/>
    <circle cx="48" cy="16" r="4" fill="#10b981"/>
    <text x="179" y="20" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" font-weight="500">ApexFlow Analytics Console</text>
    
    <rect x="18" y="46" width="152" height="58" rx="8" fill="#182234" stroke="#253349"/>
    <text x="28" y="64" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10">Query Throughput</text>
    <text x="28" y="88" fill="#ffffff" font-family="system-ui, sans-serif" font-size="17" font-weight="700">842k<tspan font-size="11" fill="#2dd4bf" font-weight="600"> /sec</tspan></text>
    
    <rect x="188" y="46" width="152" height="58" rx="8" fill="#182234" stroke="#253349"/>
    <text x="198" y="64" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10">System Load</text>
    <text x="198" y="88" fill="#ffffff" font-family="system-ui, sans-serif" font-size="17" font-weight="700">14.2%<tspan font-size="11" fill="#38bdf8" font-weight="600"> optimal</tspan></text>

    <rect x="18" y="116" width="322" height="154" rx="8" fill="#131c2e" stroke="#253349"/>
    <text x="28" y="136" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="11" font-weight="600">Real-time Latency Distribution</text>
    <text x="278" y="136" fill="#14b8a6" font-family="system-ui, sans-serif" font-size="10">● LIVE 30s</text>
    
    <path d="M 30 250 L 70 230 L 120 238 L 170 205 L 220 215 L 270 175 L 320 185 L 320 260 L 30 260 Z" fill="url(#hChart)"/>
    <path d="M 30 250 L 70 230 L 120 238 L 170 205 L 220 215 L 270 175 L 320 185" fill="none" stroke="#14b8a6" stroke-width="2.5"/>
    <circle cx="270" cy="175" r="4" fill="#14b8a6" stroke="#ffffff" stroke-width="1.5"/>

    <rect x="18" y="282" width="322" height="38" rx="6" fill="#182234"/>
    <circle cx="34" cy="301" r="6" fill="#10b981"/>
    <text x="48" y="305" fill="#f1f5f9" font-family="system-ui, sans-serif" font-size="11" font-weight="500">cluster-us-east-1a</text>
    <text x="290" y="305" fill="#10b981" font-family="system-ui, sans-serif" font-size="11" font-weight="600">Healthy</text>

    <rect x="18" y="328" width="322" height="38" rx="6" fill="#182234"/>
    <circle cx="34" cy="347" r="6" fill="#3b82f6"/>
    <text x="48" y="351" fill="#f1f5f9" font-family="system-ui, sans-serif" font-size="11" font-weight="500">analytics-stream-sync</text>
    <text x="290" y="351" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="600">99.8%</text>
  </g>
</svg>`;

export const PRODUCT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="pCta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <radialGradient id="pHeadsetGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <radialGradient id="pSpotlight" cx="40%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#e2e8f0" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="800" height="500" fill="#f8fafc"/>
  <rect width="800" height="500" fill="url(#pSpotlight)"/>

  <!-- Top Navbar -->
  <rect width="800" height="52" fill="#ffffff"/>
  <line x1="0" y1="52" x2="800" y2="52" stroke="#e2e8f0" stroke-width="1"/>
  <text x="36" y="32" fill="#0f172a" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="-0.5">AERO<tspan fill="#0d9488">BEATS</tspan></text>
  <rect x="180" y="14" width="280" height="26" rx="13" fill="#f1f5f9"/>
  <text x="200" y="31" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Search studio monitors, headphones...</text>
  <text x="680" y="32" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">Support</text>
  <g transform="translate(740, 16)">
    <rect width="24" height="20" rx="4" fill="#0f172a"/>
    <text x="12" y="14" fill="#ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle">2</text>
  </g>

  <!-- Breadcrumb -->
  <text x="36" y="78" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Home  /  Audio  /  Wireless  /  <tspan fill="#0f172a" font-weight="600">WavePro ANC</tspan></text>

  <!-- Left Column: Realistic Headphone Product Illustration -->
  <g id="product-photo" transform="translate(36, 96)">
    <rect width="360" height="370" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <circle cx="180" cy="180" r="130" fill="#f1f5f9"/>
    
    <ellipse cx="180" cy="300" rx="110" ry="14" fill="#0f172a" fill-opacity="0.08"/>
    <ellipse cx="180" cy="300" rx="70" ry="8" fill="#0f172a" fill-opacity="0.12"/>

    <path d="M 100 210 C 100 80, 260 80, 260 210" fill="none" stroke="#1e293b" stroke-width="18" stroke-linecap="round"/>
    <path d="M 120 180 C 120 98, 240 98, 240 180" fill="none" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
    <rect x="94" y="195" width="12" height="30" rx="3" fill="#94a3b8"/>
    <rect x="254" y="195" width="12" height="30" rx="3" fill="#94a3b8"/>

    <g transform="translate(75, 190)">
      <ellipse cx="25" cy="45" rx="32" ry="46" fill="url(#pHeadsetGrad)" stroke="#475569" stroke-width="2"/>
      <ellipse cx="25" cy="45" rx="24" ry="36" fill="#090d16"/>
      <circle cx="25" cy="45" r="12" fill="#14b8a6" fill-opacity="0.2"/>
      <circle cx="25" cy="45" r="4" fill="#2dd4bf"/>
    </g>

    <g transform="translate(235, 190)">
      <ellipse cx="25" cy="45" rx="32" ry="46" fill="url(#pHeadsetGrad)" stroke="#475569" stroke-width="2"/>
      <ellipse cx="25" cy="45" rx="24" ry="36" fill="#090d16"/>
      <circle cx="25" cy="45" r="12" fill="#14b8a6" fill-opacity="0.2"/>
      <circle cx="25" cy="45" r="4" fill="#2dd4bf"/>
    </g>

    <rect x="20" y="20" width="115" height="24" rx="6" fill="#0d9488" fill-opacity="0.1" stroke="#0d9488" stroke-width="1"/>
    <text x="77" y="36" fill="#0f766e" font-family="system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle">✨ BESTSELLER 2026</text>
  </g>

  <!-- Right Column: Product Detail & Buying Action -->
  <g transform="translate(430, 96)">
    <text x="0" y="16" fill="#0d9488" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1">STUDIO REFERENCE AUDIO</text>

    <text x="0" y="46" fill="#0f172a" font-family="system-ui, sans-serif" font-size="24" font-weight="800" letter-spacing="-0.5">WavePro ANC Wireless</text>
    <text x="0" y="72" fill="#0f172a" font-family="system-ui, sans-serif" font-size="24" font-weight="800" letter-spacing="-0.5">Over-Ear Studio Headphones</text>

    <g transform="translate(0, 88)">
      <text x="0" y="14" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="14">★★★★★</text>
      <text x="65" y="13" fill="#0f172a" font-family="system-ui, sans-serif" font-size="12" font-weight="700">4.9</text>
      <text x="88" y="13" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">(2,418 reviews)  ·  98% recommended</text>
    </g>

    <g transform="translate(0, 126)">
      <text x="0" y="24" fill="#0f172a" font-family="system-ui, sans-serif" font-size="30" font-weight="800">$249.00</text>
      <text x="135" y="20" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16" text-decoration="line-through">$329.00</text>
      <rect x="210" y="5" width="70" height="22" rx="4" fill="#fee2e2"/>
      <text x="245" y="19" fill="#dc2626" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">SAVE 24%</text>
    </g>

    <g transform="translate(0, 180)">
      <text x="0" y="10" fill="#475569" font-family="system-ui, sans-serif" font-size="11" font-weight="600">COLOR: <tspan fill="#0f172a">Matte Obsidian</tspan></text>
      <circle cx="12" cy="30" r="10" fill="#0f172a" stroke="#0d9488" stroke-width="2.5"/>
      <circle cx="42" cy="30" r="10" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
      <circle cx="72" cy="30" r="10" fill="#1e3a5f" stroke="#cbd5e1" stroke-width="1.5"/>
    </g>

    <g transform="translate(0, 238)">
      <text x="0" y="12" fill="#334155" font-family="system-ui, sans-serif" font-size="12">✓  Hybrid Active Noise Cancellation (40 dB depth)</text>
      <text x="0" y="32" fill="#334155" font-family="system-ui, sans-serif" font-size="12">✓  50-hour ultra-long playback on full charge</text>
      <text x="0" y="52" fill="#334155" font-family="system-ui, sans-serif" font-size="12">✓  Lossless 24-bit / 96kHz LDAC &amp; Spatial Audio</text>
    </g>

    <g id="add-to-cart" transform="translate(0, 316)" cursor="pointer">
      <rect width="210" height="48" rx="10" fill="url(#pCta)"/>
      <text x="105" y="29" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="700" text-anchor="middle">🛒 Add to Cart</text>
    </g>
    <g transform="translate(220, 316)" cursor="pointer">
      <rect width="115" height="48" rx="10" fill="#0f172a"/>
      <text x="57" y="29" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="700" text-anchor="middle">Buy Now</text>
    </g>

    <text x="0" y="388" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">📦 Free express delivery   🛡️ 2-year warranty   ↩️ 30-day trial</text>
  </g>
</svg>`;

export const MOBILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="mRing1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
    <linearGradient id="mRing2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#2dd4bf"/>
    </linearGradient>
    <linearGradient id="mBtn" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>

  <rect width="800" height="500" fill="#090d16"/>

  <!-- Centered Smartphone Mockup Frame -->
  <g transform="translate(260, 15)">
    <rect width="280" height="470" rx="36" fill="#000000" stroke="#334155" stroke-width="4"/>
    <rect x="6" y="6" width="268" height="458" rx="30" fill="#09090b"/>

    <rect x="95" y="14" width="90" height="20" rx="10" fill="#000000"/>
    <circle cx="168" cy="24" r="4" fill="#1e293b"/>

    <text x="28" y="28" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="600">9:41</text>
    <g transform="translate(225, 20)">
      <rect x="0" y="2" width="16" height="8" rx="2" fill="none" stroke="#ffffff" stroke-width="1"/>
      <rect x="2" y="4" width="11" height="4" rx="1" fill="#10b981"/>
    </g>

    <g transform="translate(18, 50)">
      <text x="0" y="16" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10" font-weight="500">TODAY, NOV 12</text>
      <text x="0" y="38" fill="#ffffff" font-family="system-ui, sans-serif" font-size="20" font-weight="800">Activity</text>
      <g transform="translate(198, 8)">
        <circle cx="18" cy="18" r="18" fill="#14b8a6"/>
        <circle cx="18" cy="14" r="7" fill="#ffffff"/>
        <path d="M 8 30 C 8 22, 28 22, 28 30" fill="#ffffff"/>
      </g>
    </g>

    <g transform="translate(18, 108)">
      <rect width="244" height="136" rx="16" fill="#18181b" stroke="#27272a"/>
      
      <g transform="translate(70, 68)">
        <circle cx="0" cy="0" r="48" fill="none" stroke="#3f1d24" stroke-width="8"/>
        <circle cx="0" cy="0" r="48" fill="none" stroke="url(#mRing1)" stroke-width="8" stroke-dasharray="301" stroke-dashoffset="65" stroke-linecap="round" transform="rotate(-90)"/>
        <circle cx="0" cy="0" r="35" fill="none" stroke="#134e4a" stroke-width="8"/>
        <circle cx="0" cy="0" r="35" fill="none" stroke="url(#mRing2)" stroke-width="8" stroke-dasharray="220" stroke-dashoffset="40" stroke-linecap="round" transform="rotate(-90)"/>
      </g>

      <g transform="translate(138, 28)">
        <text x="0" y="14" fill="#fb7185" font-family="system-ui, sans-serif" font-size="10" font-weight="700">MOVE</text>
        <text x="0" y="32" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800">540 <tspan font-size="10" fill="#71717a">/ 600 kcal</tspan></text>
        
        <text x="0" y="56" fill="#2dd4bf" font-family="system-ui, sans-serif" font-size="10" font-weight="700">EXERCISE</text>
        <text x="0" y="74" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800">38 <tspan font-size="10" fill="#71717a">/ 30 min</tspan></text>
      </g>
    </g>

    <g transform="translate(18, 256)">
      <rect width="244" height="68" rx="14" fill="#18181b" stroke="#27272a"/>
      <text x="16" y="24" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="11" font-weight="600">STEPS TODAY</text>
      <text x="16" y="52" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="800">8,420</text>
      <text x="100" y="50" fill="#2dd4bf" font-family="system-ui, sans-serif" font-size="12" font-weight="600">↑ 14% vs avg</text>
      <g transform="translate(196, 26)">
        <circle cx="16" cy="14" r="14" fill="#27272a"/>
        <text x="16" y="18" fill="#14b8a6" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">👟</text>
      </g>
    </g>

    <g id="track-workout-btn" transform="translate(18, 336)" cursor="pointer">
      <rect width="244" height="48" rx="14" fill="url(#mBtn)"/>
      <text x="122" y="29" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="700" text-anchor="middle">▶ Start Workout</text>
    </g>

    <g transform="translate(6, 405)">
      <line x1="0" y1="0" x2="268" y2="0" stroke="#27272a" stroke-width="1"/>
      <text x="36" y="22" fill="#14b8a6" font-family="system-ui, sans-serif" font-size="10" font-weight="700">● Today</text>
      <text x="96" y="22" fill="#71717a" font-family="system-ui, sans-serif" font-size="10">Trends</text>
      <text x="156" y="22" fill="#71717a" font-family="system-ui, sans-serif" font-size="10">Sharing</text>
      <text x="216" y="22" fill="#71717a" font-family="system-ui, sans-serif" font-size="10">Profile</text>
    </g>
  </g>
</svg>`;

export const AD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="adBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="50%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
    <linearGradient id="adCta" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="bottleAmber" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#92400e"/>
      <stop offset="50%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b2314"/>
      <stop offset="100%" stop-color="#1f1108"/>
    </linearGradient>
    <radialGradient id="faceShade" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="80%" stop-color="#fdba74"/>
      <stop offset="100%" stop-color="#f97316"/>
    </radialGradient>
  </defs>

  <rect width="800" height="500" fill="url(#adBg)"/>

  <!-- Left: Illustrated Portrait of Person Gazing Rightward at the Product -->
  <g id="person-portrait" transform="translate(60, 40)">
    <circle cx="160" cy="210" r="160" fill="#ffffff" fill-opacity="0.6"/>

    <!-- Hair (Back) -->
    <path d="M 90 200 C 60 280, 70 380, 100 420 C 130 430, 240 430, 260 380 C 270 300, 260 210, 240 180 Z" fill="url(#hairGrad)"/>

    <!-- Neck & Shoulders -->
    <path d="M 130 260 L 130 350 L 70 420 L 270 420 L 210 350 L 210 260 Z" fill="#fdba74"/>
    <path d="M 140 350 Q 170 370 200 350" fill="none" stroke="#ea580c" stroke-width="2" stroke-opacity="0.3"/>

    <!-- Head / Face (profile 3/4 turn looking right) -->
    <ellipse cx="172" cy="195" rx="55" ry="68" fill="url(#faceShade)"/>

    <!-- Hair (Front framing face) -->
    <path d="M 120 180 C 115 130, 150 110, 190 115 C 230 120, 245 150, 235 190 C 230 170, 215 140, 185 140 C 150 140, 130 160, 120 180 Z" fill="url(#hairGrad)"/>
    <path d="M 115 160 C 105 200, 110 250, 125 280 C 130 250, 125 200, 125 180 Z" fill="url(#hairGrad)"/>

    <!-- Facial Features: Looking to the Right (Gaze Direction Cueing) -->
    <path d="M 165 170 Q 185 166 205 172" fill="none" stroke="#451a03" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="186" cy="182" rx="9" ry="6" fill="#ffffff"/>
    <circle cx="190" cy="182" r="4.5" fill="#451a03"/>
    <circle cx="192" cy="180" r="1.5" fill="#ffffff"/>
    <path d="M 176 180 Q 186 174 196 181" fill="none" stroke="#451a03" stroke-width="2"/>

    <path d="M 202 182 Q 212 202 205 208 L 198 208" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>

    <path d="M 180 226 Q 194 235 208 227" fill="none" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>
    <path d="M 183 227 Q 194 230 205 228" fill="#ffffff"/>

    <ellipse cx="168" cy="210" rx="14" ry="9" fill="#f43f5e" fill-opacity="0.25"/>
  </g>

  <!-- Right: Product Bottle & Compelling Offer Copy -->
  <g transform="translate(410, 48)">
    <text x="0" y="18" fill="#78350f" font-family="system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="2">🌿 AURA BOTANICALS</text>

    <text x="0" y="56" fill="#451a03" font-family="system-ui, sans-serif" font-size="30" font-weight="900" letter-spacing="-0.5">Wake up to radiant,</text>
    <text x="0" y="92" fill="#451a03" font-family="system-ui, sans-serif" font-size="30" font-weight="900" letter-spacing="-0.5">youthful skin.</text>

    <text x="0" y="126" fill="#78350f" font-family="system-ui, sans-serif" font-size="13" font-weight="600">Pure Organic Rosehip &amp; Vitamin C Glow Serum</text>
    <text x="0" y="146" fill="#78350f" font-family="system-ui, sans-serif" font-size="12" fill-opacity="0.8">Visibly brightens and smooths fine lines in 7 days.</text>

    <!-- Product Dropper Bottle Illustration -->
    <g id="product-serum" transform="translate(240, 130)">
      <rect x="25" y="60" width="60" height="110" rx="14" fill="url(#bottleAmber)" stroke="#78350f" stroke-width="2"/>
      <rect x="29" y="85" width="52" height="65" rx="4" fill="#fef3c7"/>
      <text x="55" y="103" fill="#78350f" font-family="system-ui, sans-serif" font-size="8" font-weight="800" text-anchor="middle">AURA</text>
      <text x="55" y="115" fill="#b45309" font-family="system-ui, sans-serif" font-size="6" font-weight="700" text-anchor="middle">RADIANCE</text>
      <line x1="37" y1="122" x2="73" y2="122" stroke="#d97706" stroke-width="1"/>
      <text x="55" y="132" fill="#78350f" font-family="system-ui, sans-serif" font-size="6" text-anchor="middle">30ml · 1.0 fl oz</text>

      <rect x="43" y="42" width="24" height="18" fill="#e2e8f0" stroke="#94a3b8"/>
      <path d="M 45 42 C 45 22, 65 22, 65 42 Z" fill="#1e293b"/>
      <rect x="52" y="170" width="6" height="16" rx="2" fill="#e2e8f0" fill-opacity="0.7"/>
      <circle cx="55" cy="192" r="5" fill="#f59e0b"/>
    </g>

    <g transform="translate(0, 180)">
      <text x="0" y="14" fill="#b45309" font-family="system-ui, sans-serif" font-size="14">★★★★★</text>
      <text x="70" y="13" fill="#451a03" font-family="system-ui, sans-serif" font-size="12" font-weight="700">4.96 out of 5</text>
      <text x="0" y="34" fill="#78350f" font-family="system-ui, sans-serif" font-size="11">Based on 14,200+ verified customer reviews</text>
    </g>

    <g transform="translate(0, 235)">
      <text x="0" y="14" fill="#451a03" font-family="system-ui, sans-serif" font-size="12" font-weight="600">✓  100% Certified Organic &amp; Cruelty-Free</text>
      <text x="0" y="34" fill="#451a03" font-family="system-ui, sans-serif" font-size="12" font-weight="600">✓  Deep hydration without greasy residue</text>
      <text x="0" y="54" fill="#451a03" font-family="system-ui, sans-serif" font-size="12" font-weight="600">✓  30-Day &quot;Love It or Keep It&quot; Guarantee</text>
    </g>

    <g id="shop-cta" transform="translate(0, 315)" cursor="pointer">
      <rect width="220" height="48" rx="24" fill="url(#adCta)" stroke="#92400e" stroke-width="1.5"/>
      <text x="110" y="29" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="800" text-anchor="middle">CLAIM 30% OFF →</text>
    </g>

    <text x="0" y="388" fill="#92400e" font-family="system-ui, sans-serif" font-size="11" font-weight="700">⚡ Flash Sale: Code GLOW30 applied at checkout · Free delivery</text>
  </g>
</svg>`;

export const SAMPLE_SVGS: Record<string, string> = {
  hero: HERO_SVG,
  product: PRODUCT_SVG,
  mobile: MOBILE_SVG,
  ad: AD_SVG,
};

const toDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const SAMPLES: SampleMeta[] = [
  {
    id: 'hero',
    name: 'Landing page',
    subtitle: 'SaaS hero with CTA and dashboard mockup',
    thumbnail: toDataUri(HERO_SVG),
  },
  {
    id: 'product',
    name: 'Product page',
    subtitle: 'E-commerce headphones with ratings & cart CTA',
    thumbnail: toDataUri(PRODUCT_SVG),
  },
  {
    id: 'mobile',
    name: 'Mobile app',
    subtitle: 'Fitness app with activity rings and workout CTA',
    thumbnail: toDataUri(MOBILE_SVG),
  },
  {
    id: 'ad',
    name: 'Social ad',
    subtitle: 'Skincare ad with person gazing at product and CTA',
    thumbnail: toDataUri(AD_SVG),
  },
];

/**
 * Creates an image File from sample SVG.
 * Rasterizes onto an offscreen canvas to produce a real compressed WebP (or PNG fallback) File.
 */
export function createSampleImageBlob(type: SampleType): Promise<File> {
  const svg = SAMPLE_SVGS[type] || SAMPLE_SVGS.hero;
  return new Promise((resolve) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(new File([blob], `${type}.svg`, { type: 'image/svg+xml' }));
        return;
      }
      ctx.drawImage(img, 0, 0, 800, 500);

      // Export as compressed WebP (under 120 KB)
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(new File([webpBlob], `${type}.webp`, { type: 'image/webp' }));
          } else {
            canvas.toBlob(
              (pngBlob) => {
                if (pngBlob) {
                  resolve(new File([pngBlob], `${type}.png`, { type: 'image/png' }));
                } else {
                  resolve(new File([blob], `${type}.svg`, { type: 'image/svg+xml' }));
                }
              },
              'image/png'
            );
          }
        },
        'image/webp',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(new File([blob], `${type}.svg`, { type: 'image/svg+xml' }));
    };

    img.src = url;
  });
}
