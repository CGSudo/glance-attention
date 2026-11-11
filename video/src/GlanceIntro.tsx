import { AbsoluteFill, Interactive, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/ArchivoBlack";
import { Hand, Icon, Painting } from "./Artwork";
import { between, captions, color, lightShape, mix, palette as p, pop } from "./timeline";

const { fontFamily } = loadFont();

export const GlanceIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const grey = between(t, 11.9, 14.4) * (1 - between(t, 27.7, 29.1));
  const fold = between(t, 20.25, 21.65);
  const unfold = between(t, 27.6, 29.1);
  const warning = fold * (1 - unfold);
  const pullback = between(t, 41.8, 44.2);
  const camera = mix(mix(0.83, 0.94, between(t, 0, 6)), 0.99, between(t, 11.8, 15.8));
  const scale = mix(camera, 0.71, pullback);
  const cx = mix(1235, 1260, pullback);
  const cy = mix(518, 605, pullback);
  const boil = Math.floor(frame / 3);
  const jitterX = Math.sin(boil * 1.7) * 0.44;
  const jitterY = Math.cos(boil * 2.1) * 0.36;
  const light = between(t, 14.2, 16.7);
  const caption = captions.find((c) => t >= c.from && t < c.to) ?? captions[captions.length - 1];
  const entrance = caption.from === 0 ? 1 : Math.max(0, pop(t, caption.from));
  const leaving = 1 - between(t, caption.to - 0.28, caption.to);
  const captionScale = entrance * leaving;
  const captionIndex = captions.indexOf(caption);
  const final = between(t, 42.15, 42.7);
  const feature = captionIndex === 9;
  const snap = between(t, 20.35, 20.58) * (1 - between(t, 27.8, 28.6));
  const background = color(p.cream, p.hazard, snap);
  // Four slow tears, no flashing; the jolt comes from shape and type impacts.
  const tear = Math.sin(between(t, 20.25, 21.55) * Math.PI) * 18;
  return (
    <AbsoluteFill style={{ backgroundColor: p.cream, fontFamily }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-label="Glance: a painter’s squint becomes a demonstration of visual attention.">
        <defs>
          <filter id="paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="19" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="world" x="-25%" y="-25%" width="150%" height="150%">
            <feColorMatrix type="saturate" values={String(1 - grey)} />
            <feGaussianBlur stdDeviation={grey * 13 * (1 - fold)} />
          </filter>
          <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={mix(24, 0, fold)} />
          </filter>
          <radialGradient id="heat-face">
            <stop offset="0" stopColor={p.teal} stopOpacity="0.13" />
            <stop offset="0.32" stopColor={p.teal} stopOpacity="0.62" />
            <stop offset="0.61" stopColor={p.teal} stopOpacity="0.43" />
            <stop offset="1" stopColor={p.teal} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heat-small">
            <stop offset="0" stopColor={p.teal} stopOpacity="0.6" />
            <stop offset="0.6" stopColor={p.teal} stopOpacity="0.28" />
            <stop offset="1" stopColor={p.teal} stopOpacity="0" />
          </radialGradient>
          <pattern id="halftone" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r={3.3 * warning} fill={p.ink} />
          </pattern>
          <pattern id="scanlines" width="8" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 0H8" stroke={p.ink} strokeWidth="1" />
          </pattern>
          <clipPath id="painting"><path d="M0 0H1000V650H0Z" /></clipPath>
        </defs>
        <rect width="1920" height="1080" fill={background} />
        <path d="M105 119H1815M105 966H1815" stroke={p.ink} strokeWidth="2" opacity="0.22" />
        <text x="112" y="86" fontSize="25" fontWeight="800" letterSpacing="5" fill={p.ink}>GLANCE</text>
        <text x="1808" y="86" textAnchor="end" fontSize="21" fontWeight="700" letterSpacing="3" fill={p.ink}>A STUDY IN SEEING</text>
        <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(-500 -325)`}>
          <g transform={`translate(${795 * fold * (1 - unfold)} ${210 * fold * (1 - unfold)}) scale(${Math.max(0, 1 - fold * (1 - unfold))})`}>
            <g transform={`translate(500 325) scale(${1 - pullback}) translate(-500 -325)`}>
              <path d="M360 650L287 1000M640 650L714 1000M500-85V-18" fill="none" stroke={p.ink} strokeWidth="20" strokeLinecap="round" />
              <path d="M333 785H668M470 650L495 967" stroke={p.ochre} strokeWidth="16" />
              <path d="M-46 677H1046L1020 709H-20Z" fill={p.ochre} stroke={p.ink} strokeWidth="5" />
              <path d="M1118 784H1262L1288 819H1094Z" fill={p.terra} stroke={p.ink} strokeWidth="5" />
              <path d="M1115 819L1111 1010M1251 819L1267 1010" stroke={p.ink} strokeWidth="10" />
              <path d="M1164 783L1154 721H1211L1205 783Z" fill={p.cream} stroke={p.ink} strokeWidth="4" />
              <path d="M1165 729L1151 661M1179 722L1194 652M1190 727L1220 681" stroke={p.ink} strokeWidth="7" />
              <path d="M1146 666L1141 641M1195 653L1199 627M1221 681L1235 658" stroke={p.terra} strokeWidth="10" />
            </g>
            <g transform={`translate(500 325) scale(${1 + pullback * 0.02}) translate(-500 -325)`}>
              <path d="M-15-15H1015V665H-15Z" fill={p.ochre} stroke={p.ink} strokeWidth="7" />
              <g clipPath="url(#painting)" filter="url(#world)" transform={`translate(${jitterX} ${jitterY})`}>
                <Painting t={t} />
              </g>
            </g>
          </g>
          <polygon points={lightShape(fold, unfold)} fill={color("#FFFDE5", p.hazard, fold)} stroke={p.ink} strokeWidth={9 * fold * (1 - unfold)} filter="url(#bloom)" transform={`translate(500 325) scale(${light * (1 - unfold)}) translate(-500 -325)`} />
          <g transform={`translate(500 358) scale(${warning})`}>
            <path d="M-12-152H15L7-25H-5Z" fill={p.ink} />
            <circle cy="16" r="15" fill={p.ink} />
          </g>
          <g transform={`translate(500 325) scale(${warning}) translate(-500 -325)`}>
            <path d="M127 152L82 118M854 158L905 127M460 20L452-20M153 632L112 663M857 638L901 666" fill="none" stroke={p.ink} strokeWidth="9" strokeLinecap="round" />
            <path d="M189 585H812" stroke={p.ink} strokeWidth="4" />
          </g>
          <g transform={`translate(500 325) scale(${pullback}) translate(-500 -325)`}>
            <path d="M-120-112Q-120-140-92-140H1092Q1120-140 1120-112V730H-120Z" fill="none" stroke={p.ink} strokeWidth="22" />
            <path d="M-110-115H1110V-23H-110Z" fill={p.cream} />
            <circle cx="-72" cy="-74" r="9" fill={p.terra} />
            <circle cx="-38" cy="-74" r="9" fill={p.ochre} />
            <circle cx="-4" cy="-74" r="9" fill={p.teal} />
            <text x="41" y="-60" fontSize="35" fontWeight="800" fill={p.ink}>Glance</text>
            <path d="M790-98H1048Q1062-98 1062-84V-59Q1062-45 1048-45H790Z" fill={p.teal} />
            <text x="811" y="-61" fontSize="24" fontWeight="700" fill={p.cream}>Heatmap</text>
            <rect x="964" y="-85" width="72" height="28" rx="14" fill={p.cream} />
            <circle cx={mix(979, 1021, between(t, 43.6, 43.9))} cy="-71" r="11" fill={p.teal} />
            <path d="M-109 667H1110V720H-109Z" fill={p.cream} />
            <text x="-70" y="703" fill={p.ink} fontSize="26" fontWeight="700">Analyze</text>
            <path d="M-120 730L-227 780Q-225 800-185 800H1185Q1225 800 1227 780L1120 730Z" fill={p.ochre} stroke={p.ink} strokeWidth="9" />
            <path d="M350 732L334 765H665L650 732Z" fill={p.cream} stroke={p.ink} strokeWidth="4" />
          </g>
        </g>
        <Hand t={t} />
        <g transform={`translate(${1720 - Math.floor(t * 2) % 3} 180) scale(${warning})`}>
          <path d="M-200 0H70V600H-200Z" fill="url(#halftone)" />
        </g>
        <g transform={`translate(960 540) scale(${tear / 18}) translate(-960 -540)`}>
          <path d={`M720 335H1790V348H720ZM860 670H1740V681H860Z`} fill={p.ink} transform={`translate(${tear} 0)`} />
          <path d="M740 165H1800V840H740Z" fill="url(#scanlines)" opacity="0.18" />
        </g>
        <g transform={`translate(112 205) scale(1 ${1 - final})`}>
          <text fill={p.ink} fontSize="24" fontWeight="800" letterSpacing="3">{caption.tag}</text>
        </g>
        <g transform={`translate(112 ${feature ? 484 : 370}) scale(${mix(0.91, 1, Math.min(1, entrance))} ${captionScale})`}>
          {caption.lines.map((line, i) => (
            <Interactive.Text name={`Caption line ${i + 1}`} key={i} x="0" y={i * (feature ? 65 : 102)} fill={p.ink} style={{ fontSize: feature ? 46 : captionIndex === 3 ? 83 : 88, fontWeight: 900, letterSpacing: "-3px" }}>
              {line}
            </Interactive.Text>
          ))}
        </g>
        <g transform={`translate(171 759) scale(${Math.max(0, pop(t, caption.from + 0.2)) * (captionIndex >= 4 && captionIndex <= 7 ? leaving : 0)})`} color={p.teal}>
          <rect x="-58" y="-58" width="116" height="116" rx="58" fill={p.teal} />
          <g color={p.cream} transform="scale(.78)"><Icon kind={captionIndex - 4} /></g>
        </g>
        <g transform={`translate(112 266) scale(${final})`}>
          <image href={staticFile("logo.svg")} x="-6" y="-83" width="108" height="108" />
          <text x="118" y="0" fill={p.ink} fontSize="100" fontWeight="900" letterSpacing="-5">Glance.</text>
        </g>
        <g transform={`translate(112 701) scale(1 ${between(t, 45.9, 46.25)})`}>
          <path d="M0-24H550V37H0Z" fill={p.teal} />
          <text x="19" y="16" fill={p.cream} fontSize="28" fontWeight="700" letterSpacing="-0.4">github.com/CGSudo/glance-attention</text>
        </g>
        <rect width="1920" height="1080" fill="url(#halftone)" opacity={0.065 * warning} />
        <g transform={`translate(${Math.floor(t / 2) % 3 - 1} ${Math.floor(t / 3) % 3 - 1})`}>
          <rect x="-4" y="-4" width="1928" height="1088" filter="url(#paper)" opacity={mix(0.035, 0.15, warning)} style={{ mixBlendMode: "multiply" }} />
        </g>
        <path d="M112 990H1808" stroke={p.ink} strokeWidth="3" opacity="0.14" />
        <path d={`M112 990H${112 + 1696 * Math.min(1, t / 47.9667)}`} stroke={t > 28 ? p.teal : p.ink} strokeWidth="5" />
        <text x="112" y="1033" fill={p.ink} fontSize="19" fontWeight="700" letterSpacing="2">CGSudo</text>
        <text x="1808" y="1033" textAnchor="end" fill={p.ink} fontSize="19" fontWeight="700" letterSpacing="2">{Math.min(6, captionIndex < 4 ? captionIndex + 1 : captionIndex < 8 ? 5 : 6).toString().padStart(2, "0")} / 06</text>
      </svg>
    </AbsoluteFill>
  );
};
