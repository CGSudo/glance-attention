import { between, mix, palette as p, pop } from "./timeline";

export const Painting = ({ t }: { t: number }) => {
  const pullback = between(t, 41.8, 44.2);
  const heat = between(t, 28.75, 29.65);
  const toggle = 1 - between(t, 42.9, 43.16) + between(t, 43.6, 43.9);
  const gaze = between(t, 31.75, 33.2);
  const note = between(t, 35, 35.8);
  const window = between(t, 38.3, 39.2);
  return (
    <>
      <path d="M0 0H1000V650H0Z" fill="#DCCFB2" />
      <path d="M0 425L1000 365V650H0Z" fill={p.ochre} />
      <path d="M545 0V393M0 425L1000 365" fill="none" stroke={p.ink} strokeWidth="4" />
      <path d="M80 95L187 79V440L80 448Z" fill={p.terra} stroke={p.ink} strokeWidth="5" />
      <path d="M98 117L164 106V428L98 431Z" fill="none" stroke={p.ink} strokeWidth="3" />
      <circle cx="149" cy="280" r="7" fill={p.ochre} stroke={p.ink} strokeWidth="3" />
      <path d="M674 60H935V359H674Z" fill="#FFFCDF" stroke={p.ink} strokeWidth="7" />
      <path d="M805 62V357M675 209H935" stroke="#DCCFB2" strokeWidth="9" />
      <path d="M671 365H945L957 380H659Z" fill={p.cream} stroke={p.ink} strokeWidth="4" />
      <path d="M939 382L1000 650H703L800 381Z" fill={p.cream} />
      <path d="M712 398L1000 498M725 435L1000 554" stroke="#DCCFB2" strokeWidth="3" />
      <path d="M189 650L190 453Q199 382 268 365L369 367Q452 397 457 489L464 650Z" fill={p.teal} stroke={p.ink} strokeWidth="6" />
      <path d="M231 484L204 645M388 478L431 650" fill="none" stroke={p.ink} strokeWidth="5" />
      <path d="M278 341L270 390Q305 422 351 387L334 326Z" fill={p.terra} stroke={p.ink} strokeWidth="4" />
      <path d="M225 258Q192 169 234 118Q276 68 345 100Q400 111 399 186L374 315L251 327Z" fill={p.ink} />
      <path d="M247 166Q270 134 308 147Q338 183 381 182L380 228L401 251L376 266Q379 327 332 351Q284 365 255 314L239 265Q207 257 214 227Q224 208 241 227Z" fill="#BB7D51" stroke={p.ink} strokeWidth="5" />
      <path d="M275 185Q309 177 330 191M349 188L373 194" fill="none" stroke={p.ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M280 217Q299 202 322 217Q303 230 280 217ZM347 216Q360 207 376 218Q361 228 347 216Z" fill={p.cream} stroke={p.ink} strokeWidth="3" />
      <ellipse cx="311" cy="219" rx="6" ry="8" fill={p.ink} />
      <ellipse cx="370" cy="220" rx="5" ry="7" fill={p.ink} />
      <path d="M342 226L334 261L349 263M320 291Q341 302 358 285" fill="none" stroke={p.ink} strokeWidth="4" strokeLinecap="round" />
      <circle cx="252" cy="259" r="10" fill="none" stroke={p.ochre} strokeWidth="5" />
      <path d="M248 150Q288 158 325 123M213 170Q232 144 245 136" fill="none" stroke={p.cream} strokeWidth="4" />
      <path d="M485 443L891 423L979 536L530 568Z" fill={p.terra} stroke={p.ink} strokeWidth="6" />
      <path d="M530 568L543 650M932 547L939 650" stroke={p.ink} strokeWidth="15" />
      <path d="M560 453L676 440L699 502L578 517Z" fill={p.cream} stroke={p.ink} strokeWidth="3" />
      <g transform="translate(586 473) rotate(-7)">
        <path d="M0 1L3-11L8 1L12-13M17-9L26-9M20-13V0M31 0L38-12L44-1M29-4L42-4M48-12L49 1L59 0M62-12L64 0L73-1" fill="none" stroke={p.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 11Q24 7 49 10M9 18L63 16" stroke={p.terra} strokeWidth="2.5" fill="none" />
      </g>
      <path d="M775 422L772 371L816 368L825 419Z" fill={p.cream} stroke={p.ink} strokeWidth="3" />
      <path d="M817 378Q851 370 843 396Q836 405 823 400" fill="none" stroke={p.ink} strokeWidth="4" />
      <path d="M780 374L804 371M783 380L807 377M788 391L811 388" stroke={p.ochre} strokeWidth="5" />
      <g opacity={heat * toggle}>
        <ellipse cx="310" cy="247" rx="138" ry="158" fill="url(#heat-face)" />
        <ellipse cx="630" cy="479" rx={105 * note} ry={70 * note} fill="url(#heat-small)" />
        <ellipse cx="805" cy="205" rx={100 * window} ry={130 * window} fill="url(#heat-small)" />
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx="310" cy="247" rx={78 + i * 29} ry={94 + i * 29} fill="none" stroke={p.teal} strokeWidth="2.5" opacity={0.7 - i * 0.15} />
        ))}
      </g>
      <g stroke={p.teal} fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M349 228Q435 252 488 352T630 478" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - gaze} />
        <path d="M629 479Q796 481 805 205" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - window} strokeWidth="3" strokeOpacity="0.7" />
        <path d="M599 468L630 478L618 449" transform={`translate(630 478) scale(${gaze}) translate(-630 -478)`} />
      </g>
      {[
        { x: 298, y: 251, at: 29, n: 1 },
        { x: 487, y: 352, at: 32.3, n: 2 },
        { x: 631, y: 478, at: 35.25, n: 3 },
        { x: 805, y: 205, at: 38.65, n: 4 },
      ].map(({ x, y, at, n }) => {
        const s = Math.max(0, pop(t, at)) * (1 - pullback);
        return (
          <g key={n} transform={`translate(${x} ${y}) scale(${s})`}>
            <circle r="28" fill={p.teal} stroke={p.cream} strokeWidth="4" />
            <text y="10" textAnchor="middle" fill={p.cream} fontSize="29" fontWeight="800">{n}</text>
          </g>
        );
      })}
    </>
  );
};

export const Hand = ({ t }: { t: number }) => {
  const rise = between(t, 6, 7.5);
  const exit = between(t, 11.85, 13.3);
  const pinch = between(t, 8.45, 10.5);
  const yy = mix(1200, 640, rise) + exit * 820;
  const stretch = 1 + Math.sin(rise * Math.PI) * 0.18;
  return (
    <g transform={`translate(${mix(1540, 1320, rise)} ${yy}) rotate(${mix(18, -7, rise) + exit * 18}) scale(${1.25 / stretch} ${1.25 * stretch})`}>
      <path d="M-109 460L-112 226Q-206 194-206 131L-199 50Q-194 18-170 29L-141 115L-120 73L-130-4Q-132-31-107-33Q-84-34-76-10L-52 54L-48-38Q-45-66-21-59Q-2-53-2-29L7 49L22-16Q29-45 49-32Q67-20 59 7L42 93Q93 91 105 140Q124 219 74 267L62 460Z" fill={p.ochre} stroke={p.ink} strokeWidth="7" strokeLinejoin="round" />
      <path d={`M-174 114Q-190 5-141-68Q-100-126-25-125Q33-125 64-85Q83-56 59-40Q43-32 22-51Q-8-85-57-62Q-92-47-93 15L-79 ${mix(53, -6, pinch)}`} fill="none" stroke={p.ink} strokeWidth="63" strokeLinecap="round" />
      <path d={`M-174 114Q-190 5-141-68Q-100-126-25-125Q33-125 64-85Q83-56 59-40Q43-32 22-51Q-8-85-57-62Q-92-47-93 15L-79 ${mix(53, -6, pinch)}`} fill="none" stroke={p.ochre} strokeWidth="50" strokeLinecap="round" />
      <path d={`M-147 161Q-100 140-61 ${mix(83, 10, pinch)}Q-44 ${mix(66, -8, pinch)}-21 ${mix(84, 6, pinch)}Q-3 ${mix(104, 29, pinch)}-35 ${mix(129, 56, pinch)}L-91 209`} fill={p.ochre} stroke={p.ink} strokeWidth="6" strokeLinecap="round" />
      <path d="M-39 173Q-14 144 10 173M10 176Q31 153 52 180M-96 253Q-42 275 15 245" fill="none" stroke={p.ink} strokeWidth="5" strokeLinecap="round" />
      <g transform={`translate(-57 -29) scale(1 ${mix(1, 0.13, pinch)})`}>
        <path d="M-65 0Q-8-42 49 0Q-8 42-65 0Z" fill={p.cream} stroke={p.ink} strokeWidth="5" />
        <circle cx="-2" r="22" fill={p.teal} stroke={p.ink} strokeWidth="4" />
        <circle cx="0" r="9" fill={p.ink} />
        <circle cx="7" cy="-7" r="4" fill={p.cream} />
      </g>
      <path d="M-119 375L65 375L68 460H-120Z" fill={p.teal} stroke={p.ink} strokeWidth="6" />
      <path d="M-105 394L53 394" stroke={p.cream} strokeWidth="4" />
    </g>
  );
};

export const Icon = ({ kind }: { kind: number }) => (
  <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 0 && <><path d="M-20 14Q-34-7-19-29Q0-47 24-29Q38-6 19 22Q1 38-20 14Z" /><path d="M-14-9H-9M12-9H17M-8 13Q2 21 12 11" /></>}
    {kind === 1 && <><path d="M-39 0Q-3-38 33 0Q-3 38-39 0Z" /><circle cx="4" r="10" /><path d="M43 0H69M58-9L69 0L58 9" /></>}
    {kind === 2 && <><path d="M-28-35H14L31-18V36H-28Z" /><path d="M14-35V-18H31M-14-2H18M-14 12H18M-14 25H7" /></>}
    {kind === 3 && <><circle r="20" /><path d="M0-44V-34M0 34V44M-44 0H-34M34 0H44M-31-31L-24-24M24 24L31 31M-31 31L-24 24M24-24L31-31" /></>}
  </g>
);
