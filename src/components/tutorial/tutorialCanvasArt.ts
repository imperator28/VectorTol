import type { CanvasData } from '../../types/canvas';

export const DEMO_CANVAS_SIZE = {
  width: 960,
  height: 560,
} as const;

const TUTORIAL_CANVAS_SVG = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="960" y2="560" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8FAFD"/>
      <stop offset="1" stop-color="#EEF3FA"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#B3BECC"/>
      <stop offset="1" stop-color="#728197"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#E4EAF2"/>
      <stop offset="1" stop-color="#B7C2D1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#7EB6FF"/>
      <stop offset="1" stop-color="#2F73E0"/>
    </linearGradient>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto-start-reverse">
      <path d="M1 1L11 6L1 11V1Z" fill="#2F73E0"/>
    </marker>
  </defs>

  <rect width="960" height="560" rx="28" fill="url(#bg)"/>

  <g stroke="#DCE5F0" stroke-width="1">
    <path d="M92 84H868"/>
    <path d="M92 144H868"/>
    <path d="M92 204H868"/>
    <path d="M92 264H868"/>
    <path d="M92 324H868"/>
    <path d="M92 384H868"/>
    <path d="M92 444H868"/>
    <path d="M160 64V496"/>
    <path d="M280 64V496"/>
    <path d="M400 64V496"/>
    <path d="M520 64V496"/>
    <path d="M640 64V496"/>
    <path d="M760 64V496"/>
  </g>

  <rect x="122" y="150" width="716" height="80" rx="18" fill="#8C98A9"/>
  <rect x="170" y="234" width="154" height="132" rx="22" fill="#D8A459"/>
  <rect x="122" y="370" width="716" height="96" rx="22" fill="url(#metal)"/>
  <rect x="458" y="130" width="44" height="282" rx="18" fill="url(#bolt)" stroke="#6E7D92" stroke-width="8"/>
  <circle cx="480" cy="180" r="12" fill="#6E7D92"/>
  <circle cx="480" cy="356" r="12" fill="#6E7D92"/>

  <path d="M120 128H840" stroke="#2F73E0" stroke-width="3" stroke-dasharray="10 8" opacity="0.38"/>
  <path d="M480 108V484" stroke="#2F73E0" stroke-width="3" stroke-dasharray="10 8" opacity="0.38"/>

  <g fill="#566679" font-family="Arial, sans-serif" font-size="20" font-weight="700">
    <text x="128" y="136">Cover Plate</text>
    <text x="128" y="292">Spacer</text>
    <text x="128" y="498">Base Plate</text>
  </g>

  <path d="M524 178C584 170 630 154 662 126" stroke="#697A90" stroke-width="3" stroke-linecap="round"/>
  <text x="676" y="124" fill="#566679" font-family="Arial, sans-serif" font-size="20" font-weight="700">Fastener</text>

  <rect x="600" y="240" width="244" height="100" rx="20" fill="#FFFFFF" stroke="#C9D6E6" stroke-width="2"/>
  <text x="624" y="276" fill="#2554A6" font-family="Arial, sans-serif" font-size="24" font-weight="700">Draw vectors here</text>
  <text x="624" y="306" fill="#4D6280" font-family="Arial, sans-serif" font-size="17">Trace the stack-up from top to bottom</text>
  <path d="M602 288C568 286 544 286 520 288" stroke="url(#accent)" stroke-width="5" stroke-linecap="round" marker-end="url(#arrow)"/>

  <path d="M144 116C176 90 222 78 280 78H682C736 78 780 90 812 116" stroke="#BAC6D4" stroke-width="8" stroke-linecap="round"/>
  <path d="M142 486H820" stroke="#46505F" stroke-width="10" stroke-linecap="round" opacity="0.18"/>

  <text x="610" y="92" fill="#6E7D92" font-family="Arial, sans-serif" font-size="16">Tutorial demo cross-section</text>
</svg>`;

export const DEMO_CANVAS_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(TUTORIAL_CANVAS_SVG)}`;

export const DEMO_CANVAS_DATA: CanvasData = {
  vectors: [],
  image: DEMO_CANVAS_IMAGE,
  imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
};
