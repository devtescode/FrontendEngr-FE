const topHeaderPins = Array.from({ length: 12 }, (_, i) => 296 + i * 10.5);
const bottomHeaderPins = Array.from({ length: 14 }, (_, i) => 220 + i * 12.5);
const espPins = Array.from({ length: 6 }, (_, i) => 118 + i * 10.5);
const sensorPins = [140, 150, 160, 170];
const chipPins = Array.from({ length: 6 }, (_, i) => 334 + i * 7.5);

export function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 560"
      role="img"
      aria-label="Arduino, ESP32, sensor and jumper wire hardware composition"
      className={`h-auto w-full drop-shadow-2xl ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hv-ambient" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.26" />
          <stop offset="52%" stopColor="#1d4ed8" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="hv-board"
          x1="148"
          y1="264"
          x2="438"
          y2="454"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="28%" stopColor="#3b82f6" />
          <stop offset="72%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient
          id="hv-sensor"
          x1="62"
          y1="140"
          x2="222"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
        <linearGradient
          id="hv-esp"
          x1="356"
          y1="78"
          x2="490"
          y2="206"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#334155" />
          <stop offset="60%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient
          id="hv-sheen"
          x1="0"
          y1="264"
          x2="0"
          y2="392"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hv-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="hv-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="hv-usb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="55%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="hv-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f5c451" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="hv-wire-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="48%" stopColor="#f5c451" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="hv-wire-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="hv-wire-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <radialGradient id="hv-transducer" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="72%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>
        <radialGradient id="hv-transducer-inner" cx="40%" cy="35%" r="72%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="52%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <filter id="hv-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="hv-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" result="hv-blur" />
          <feMerge>
            <feMergeNode in="hv-blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="280" cy="286" r="266" fill="url(#hv-ambient)" />

      <g opacity="0.55" fill="none" stroke="#60a5fa" strokeWidth="1">
        <circle cx="280" cy="290" r="222" strokeOpacity="0.12" strokeDasharray="2 12" />
        <circle cx="280" cy="290" r="188" strokeOpacity="0.09" />
        <path d="M 42 300 h 24 v 28 h 16" strokeOpacity="0.16" />
        <path d="M 502 244 h 20 v -24" strokeOpacity="0.16" />
        <path d="M 76 84 h 24 v 20 h 12" strokeOpacity="0.14" />
        <path d="M 496 472 h -24 v -18 h -14" strokeOpacity="0.14" />
      </g>
      <g fill="#60a5fa" opacity="0.32">
        <circle cx="82" cy="328" r="2" />
        <circle cx="522" cy="220" r="2" />
        <circle cx="112" cy="104" r="2" />
        <circle cx="458" cy="454" r="2" />
      </g>

      <ellipse
        cx="292"
        cy="364"
        rx="198"
        ry="128"
        fill="#2563eb"
        opacity="0.16"
        filter="url(#hv-soft)"
      />
      <ellipse
        cx="140"
        cy="184"
        rx="94"
        ry="72"
        fill="#3b82f6"
        opacity="0.10"
        filter="url(#hv-soft)"
      />
      <ellipse
        cx="424"
        cy="148"
        rx="86"
        ry="76"
        fill="#0ea5e9"
        opacity="0.08"
        filter="url(#hv-soft)"
      />
      <ellipse
        cx="292"
        cy="486"
        rx="196"
        ry="28"
        fill="#020617"
        opacity="0.6"
        filter="url(#hv-soft)"
      />

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g>
          <path
            d="M 172 240 C 132 276, 92 324, 88 388 C 84 448, 122 496, 188 502 C 240 506, 280 486, 304 452"
            stroke="#020617"
            strokeWidth="8.5"
            opacity="0.45"
          />
          <path
            d="M 172 240 C 132 276, 92 324, 88 388 C 84 448, 122 496, 188 502 C 240 506, 280 486, 304 452"
            stroke="url(#hv-wire-emerald)"
            strokeWidth="5.5"
          />
          <path
            d="M 172 240 C 132 276, 92 324, 88 388 C 84 448, 122 496, 188 502 C 240 506, 280 486, 304 452"
            stroke="#d1fae5"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </g>
        <g>
          <path
            d="M 188 238 C 216 246, 246 254, 280 276"
            stroke="#020617"
            strokeWidth="8.5"
            opacity="0.45"
          />
          <path
            d="M 188 238 C 216 246, 246 254, 280 276"
            stroke="url(#hv-wire-gold)"
            strokeWidth="5.5"
          />
          <path
            d="M 188 238 C 216 246, 246 254, 280 276"
            stroke="#fef3c7"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </g>
        <g>
          <path
            d="M 400 208 C 446 234, 478 286, 472 348 C 466 408, 436 436, 402 436"
            stroke="#020617"
            strokeWidth="8.5"
            opacity="0.45"
          />
          <path
            d="M 400 208 C 446 234, 478 286, 472 348 C 466 408, 436 436, 402 436"
            stroke="url(#hv-wire-blue)"
            strokeWidth="5.5"
          />
          <path
            d="M 400 208 C 446 234, 478 286, 472 348 C 466 408, 436 436, 402 436"
            stroke="#dbeafe"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </g>
        <g>
          <path
            d="M 488 154 C 524 180, 536 240, 512 292 C 496 326, 472 320, 452 300 C 442 290, 434 282, 424 274"
            stroke="#020617"
            strokeWidth="8.5"
            opacity="0.45"
          />
          <path
            d="M 488 154 C 524 180, 536 240, 512 292 C 496 326, 472 320, 452 300 C 442 290, 434 282, 424 274"
            stroke="url(#hv-wire-gold)"
            strokeWidth="5.5"
          />
          <path
            d="M 488 154 C 524 180, 536 240, 512 292 C 496 326, 472 320, 452 300 C 442 290, 434 282, 424 274"
            stroke="#fef3c7"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </g>
        <g>
          <path
            d="M 360 198 C 332 220, 312 244, 292 272"
            stroke="#020617"
            strokeWidth="8.5"
            opacity="0.45"
          />
          <path
            d="M 360 198 C 332 220, 312 244, 292 272"
            stroke="url(#hv-wire-emerald)"
            strokeWidth="5.5"
          />
          <path
            d="M 360 198 C 332 220, 312 244, 292 272"
            stroke="#d1fae5"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </g>
      </g>

      <g transform="rotate(-12 142 182)">
        <rect
          x="58"
          y="136"
          width="168"
          height="96"
          rx="12"
          fill="#020617"
          opacity="0.45"
          filter="url(#hv-soft)"
        />
        <rect
          x="62"
          y="140"
          width="160"
          height="90"
          rx="10"
          fill="url(#hv-sensor)"
          stroke="#1e40af"
          strokeWidth="1.5"
        />
        <rect
          x="68"
          y="146"
          width="148"
          height="78"
          rx="7"
          fill="none"
          stroke="#93c5fd"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        <g>
          <circle
            cx="110"
            cy="185"
            r="30"
            fill="url(#hv-transducer)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <circle
            cx="110"
            cy="185"
            r="26"
            fill="none"
            stroke="#f8fafc"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="1 6"
          />
          <circle
            cx="110"
            cy="185"
            r="23"
            fill="url(#hv-transducer-inner)"
            stroke="#64748b"
            strokeWidth="1"
          />
          <circle
            cx="110"
            cy="185"
            r="16"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <circle
            cx="110"
            cy="185"
            r="9"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <circle cx="110" cy="185" r="3" fill="#cbd5e1" opacity="0.6" />
          <path
            d="M 88 170 A 27 27 0 0 1 126 162"
            fill="none"
            stroke="#f8fafc"
            strokeOpacity="0.5"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>

        <g>
          <circle
            cx="174"
            cy="185"
            r="30"
            fill="url(#hv-transducer)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <circle
            cx="174"
            cy="185"
            r="26"
            fill="none"
            stroke="#f8fafc"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="1 6"
          />
          <circle
            cx="174"
            cy="185"
            r="23"
            fill="url(#hv-transducer-inner)"
            stroke="#64748b"
            strokeWidth="1"
          />
          <circle
            cx="174"
            cy="185"
            r="16"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <circle
            cx="174"
            cy="185"
            r="9"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <circle cx="174" cy="185" r="3" fill="#cbd5e1" opacity="0.6" />
          <path
            d="M 152 170 A 27 27 0 0 1 190 162"
            fill="none"
            stroke="#f8fafc"
            strokeOpacity="0.5"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>

        <rect
          x="138"
          y="209"
          width="16"
          height="8"
          rx="2"
          fill="url(#hv-metal)"
          stroke="#64748b"
          strokeWidth="0.6"
        />
        <circle cx="72" cy="151" r="2.5" fill="#0f172a" stroke="#93c5fd" strokeOpacity="0.5" />
        <circle cx="212" cy="151" r="2.5" fill="#0f172a" stroke="#93c5fd" strokeOpacity="0.5" />
        <circle cx="72" cy="219" r="2.5" fill="#0f172a" stroke="#93c5fd" strokeOpacity="0.5" />
        <circle cx="212" cy="219" r="2.5" fill="#0f172a" stroke="#93c5fd" strokeOpacity="0.5" />

        <rect
          x="132"
          y="226"
          width="52"
          height="10"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="1"
        />
        {sensorPins.map((x) => (
          <g key={x}>
            <rect x={x} y="228" width="4" height="6" rx="1" fill="url(#hv-gold)" />
            <line
              x1={x + 2}
              y1="234"
              x2={x + 2}
              y2="245"
              stroke="#f5c451"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      <g transform="rotate(10 424 144)">
        <rect
          x="352"
          y="72"
          width="144"
          height="136"
          rx="14"
          fill="#020617"
          opacity="0.45"
          filter="url(#hv-soft)"
        />
        <rect
          x="356"
          y="78"
          width="134"
          height="128"
          rx="12"
          fill="url(#hv-esp)"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <rect
          x="362"
          y="84"
          width="122"
          height="116"
          rx="8"
          fill="none"
          stroke="#64748b"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        <path
          d="M 372 96 h 16 v -8 h 12 v 8 h 12 v -8 h 12 v 8 h 12 v -8 h 12 v 8 h 12"
          fill="none"
          stroke="url(#hv-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="368"
          y="108"
          width="96"
          height="54"
          rx="6"
          fill="url(#hv-shield)"
          stroke="#64748b"
          strokeWidth="1"
        />
        <rect
          x="374"
          y="114"
          width="84"
          height="42"
          rx="4"
          fill="none"
          stroke="#94a3b8"
          strokeOpacity="0.6"
          strokeWidth="1"
        />
        <text
          x="416"
          y="142"
          textAnchor="middle"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="18"
          fontWeight="700"
          letterSpacing="1.5"
          fill="#0f172a"
        >
          ESP32
        </text>
        <circle cx="374" cy="114" r="1.8" fill="#64748b" />
        <circle cx="458" cy="114" r="1.8" fill="#64748b" />
        <circle cx="374" cy="156" r="1.8" fill="#64748b" />
        <circle cx="458" cy="156" r="1.8" fill="#64748b" />

        <rect
          x="358.5"
          y="110"
          width="7"
          height="72"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <rect
          x="476.5"
          y="110"
          width="7"
          height="72"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="0.8"
        />
        {espPins.map((y) => (
          <g key={y}>
            <circle cx="362" cy={y} r="2" fill="url(#hv-gold)" />
            <circle cx="480" cy={y} r="2" fill="url(#hv-gold)" />
          </g>
        ))}

        <rect
          x="394"
          y="190"
          width="40"
          height="13"
          rx="2.5"
          fill="url(#hv-usb)"
          stroke="#475569"
          strokeWidth="0.8"
        />
        <rect x="400" y="193" width="28" height="6" rx="1.5" fill="#0b1220" />
        <circle cx="380" cy="182" r="5.5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <circle cx="380" cy="182" r="2.5" fill="#475569" />
        <circle cx="470" cy="176" r="3" fill="#34d399" filter="url(#hv-glow)" />
      </g>

      <g transform="rotate(-8 293 360)">
        <rect
          x="144"
          y="268"
          width="302"
          height="202"
          rx="20"
          fill="#020617"
          opacity="0.5"
          filter="url(#hv-soft)"
        />
        <rect
          x="148"
          y="264"
          width="290"
          height="190"
          rx="16"
          fill="url(#hv-board)"
          stroke="#1d4ed8"
          strokeWidth="1.5"
        />
        <rect x="148" y="264" width="290" height="190" rx="16" fill="url(#hv-sheen)" />
        <rect
          x="154"
          y="270"
          width="278"
          height="178"
          rx="11"
          fill="none"
          stroke="#93c5fd"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />

        <g fill="none" stroke="#93c5fd" strokeOpacity="0.3" strokeWidth="1.4">
          <path d="M 358 340 H 388 V 382 H 410" />
          <path d="M 358 354 H 378 V 402 H 408" />
          <path d="M 296 340 H 272 V 318 H 252" />
          <path d="M 296 366 H 278 V 396 H 238" />
        </g>
        <g fill="#bfdbfe" opacity="0.5">
          <circle cx="410" cy="382" r="2.2" />
          <circle cx="408" cy="402" r="2.2" />
          <circle cx="252" cy="318" r="2.2" />
          <circle cx="238" cy="396" r="2.2" />
        </g>

        <circle cx="188" cy="306" r="7" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
        <circle cx="188" cy="306" r="3" fill="#475569" />

        <rect
          x="170"
          y="330"
          width="36"
          height="22"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <g fill="url(#hv-gold)">
          <circle cx="178" cy="337" r="1.8" />
          <circle cx="188" cy="337" r="1.8" />
          <circle cx="198" cy="337" r="1.8" />
          <circle cx="178" cy="345" r="1.8" />
          <circle cx="188" cy="345" r="1.8" />
          <circle cx="198" cy="345" r="1.8" />
        </g>

        <circle cx="190" cy="374" r="6" fill="url(#hv-metal)" stroke="#64748b" strokeWidth="0.8" />
        <circle cx="208" cy="374" r="6" fill="url(#hv-metal)" stroke="#64748b" strokeWidth="0.8" />
        <path
          d="M 186 371 A 5 5 0 0 1 194 370"
          fill="none"
          stroke="#f8fafc"
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />
        <path
          d="M 204 371 A 5 5 0 0 1 212 370"
          fill="none"
          stroke="#f8fafc"
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />

        <rect
          x="230"
          y="376"
          width="28"
          height="16"
          rx="3"
          fill="url(#hv-metal)"
          stroke="#64748b"
          strokeWidth="0.9"
        />
        <rect
          x="246"
          y="306"
          width="32"
          height="22"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <rect x="256" y="302" width="12" height="5" rx="1" fill="url(#hv-gold)" />
        <rect
          x="232"
          y="344"
          width="20"
          height="14"
          rx="2"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <g fill="url(#hv-gold)">
          <rect x="227" y="347" width="5" height="2.5" rx="0.5" />
          <rect x="227" y="352" width="5" height="2.5" rx="0.5" />
          <rect x="252" y="347" width="5" height="2.5" rx="0.5" />
          <rect x="252" y="352" width="5" height="2.5" rx="0.5" />
        </g>

        <rect
          x="296"
          y="328"
          width="62"
          height="52"
          rx="4"
          fill="#0b1220"
          stroke="#1e293b"
          strokeWidth="1.2"
        />
        <circle cx="306" cy="338" r="3" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        <rect x="302" y="332" width="50" height="2" rx="1" fill="#334155" />
        {chipPins.map((y) => (
          <g key={y}>
            <rect x="289" y={y} width="7" height="3" rx="0.6" fill="url(#hv-gold)" />
            <rect x="358" y={y} width="7" height="3" rx="0.6" fill="url(#hv-gold)" />
          </g>
        ))}

        <rect
          x="178"
          y="279"
          width="54"
          height="32"
          rx="5"
          fill="url(#hv-usb)"
          stroke="#475569"
          strokeWidth="1"
        />
        <rect x="186" y="285" width="38" height="12" rx="2" fill="#0b1220" />
        <rect x="190" y="288" width="8" height="6" rx="1" fill="#334155" />
        <rect x="202" y="288" width="8" height="6" rx="1" fill="#334155" />
        <rect
          x="244"
          y="280"
          width="38"
          height="30"
          rx="5"
          fill="#0b1220"
          stroke="#334155"
          strokeWidth="1"
        />
        <circle cx="263" cy="295" r="8.5" fill="#020617" stroke="#475569" strokeWidth="1.2" />
        <circle cx="263" cy="295" r="3" fill="#64748b" opacity="0.5" />

        <rect
          x="290"
          y="269"
          width="128"
          height="11"
          rx="3"
          fill="#0b1220"
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        <rect
          x="214"
          y="431"
          width="186"
          height="11"
          rx="3"
          fill="#0b1220"
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        {topHeaderPins.map((x) => (
          <circle key={x} cx={x} cy="274.5" r="2.2" fill="url(#hv-gold)" />
        ))}
        {bottomHeaderPins.map((x) => (
          <circle key={x} cx={x} cy="436.5" r="2.2" fill="url(#hv-gold)" />
        ))}

        <text
          x="352"
          y="322"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="16"
          fontWeight="700"
          letterSpacing="0.5"
          fill="#dbeafe"
          opacity="0.95"
        >
          ARDUINO
        </text>
        <circle cx="404" cy="412" r="3" fill="#34d399" filter="url(#hv-glow)" />
        <circle cx="416" cy="412" r="3" fill="#f5c451" filter="url(#hv-glow)" />

        <g fill="#0b1220" stroke="#93c5fd" strokeOpacity="0.6" strokeWidth="1">
          <circle cx="162" cy="278" r="4" />
          <circle cx="424" cy="278" r="4" />
          <circle cx="162" cy="440" r="4" />
          <circle cx="424" cy="440" r="4" />
        </g>
      </g>
    </svg>
  );
}
