import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { colleges, type College } from '../../lib/colleges';
import { actToSat, satToAct } from '../../lib/scoring';
import { tracker } from '../../lib/analytics';

/* ──────────────────────── TYPES ──────────────────────── */

interface HeatmapTile {
  college: College;
  overallFit: number;
  gpaFit: number;
  satFit: number;
  tier: 'safety' | 'match' | 'reach';
  isSaved: boolean;
}

interface RadarNode {
  tile: HeatmapTile;
  x: number;
  y: number;
  baseRadius: number;
  ring: number;
}

/* ──────────────────────── SCORING ──────────────────────── */

function computeMatch(gpa: number, sat: number, college: College): { overallFit: number; gpaFit: number; satFit: number; tier: 'safety' | 'match' | 'reach' } {
  const gpaDiff = gpa - college.avgGPA;
  const gpaFit = Math.max(-1, Math.min(1, gpaDiff / 0.4));
  const [sat25, sat75] = college.satRange;
  const satMid = (sat25 + sat75) / 2;
  const satSpread = (sat75 - sat25) / 2;
  const satDiff = sat - satMid;
  const satFit = Math.max(-1, Math.min(1, satDiff / Math.max(satSpread, 40)));
  const composite = gpaFit * 0.4 + satFit * 0.6;
  const selectivityPenalty = college.acceptanceRate < 10 ? -0.2 : college.acceptanceRate < 20 ? -0.1 : 0;
  const adjusted = composite + selectivityPenalty;
  const tier = adjusted >= 0.25 ? 'safety' : adjusted >= -0.25 ? 'match' : 'reach';
  const overallFit = Math.round(Math.max(0, Math.min(100, 50 + composite * 40 + (100 - college.acceptanceRate) * 0.1)));
  return { overallFit, gpaFit, satFit, tier };
}

/* ──────────────────────── COLOR HELPERS ──────────────────────── */

function getTempColor(fit: number): string {
  const stops = [
    { at: 0, r: 59, g: 130, b: 246 },
    { at: 25, r: 99, g: 102, b: 241 },
    { at: 50, r: 245, g: 158, b: 11 },
    { at: 75, r: 249, g: 115, b: 22 },
    { at: 100, r: 239, g: 68, b: 68 },
  ];
  const clamped = Math.max(0, Math.min(100, fit));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = lo.at === hi.at ? 0 : (clamped - lo.at) / (hi.at - lo.at);
  return `rgb(${Math.round(lo.r + (hi.r - lo.r) * t)},${Math.round(lo.g + (hi.g - lo.g) * t)},${Math.round(lo.b + (hi.b - lo.b) * t)})`;
}

function getTempRGB(fit: number): [number, number, number] {
  const stops = [
    { at: 0, r: 80, g: 160, b: 255 },
    { at: 25, r: 130, g: 120, b: 255 },
    { at: 50, r: 255, g: 200, b: 40 },
    { at: 75, r: 255, g: 140, b: 40 },
    { at: 100, r: 255, g: 80, b: 60 },
  ];
  const clamped = Math.max(0, Math.min(100, fit));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = lo.at === hi.at ? 0 : (clamped - lo.at) / (hi.at - lo.at);
  return [Math.round(lo.r + (hi.r - lo.r) * t), Math.round(lo.g + (hi.g - lo.g) * t), Math.round(lo.b + (hi.b - lo.b) * t)];
}

function getTempLabel(fit: number): string {
  if (fit >= 75) return 'Hot';
  if (fit >= 50) return 'Warm';
  if (fit >= 30) return 'Cool';
  return 'Cold';
}

/* ──────────────────────── ADVICE ──────────────────────── */

function generateAdvice(tile: HeatmapTile, gpa: number, sat: number): string[] {
  const tips: string[] = [];
  const college = tile.college;
  const [sat25, sat75] = college.satRange;
  const satMid = Math.round((sat25 + sat75) / 2);
  if (tile.tier === 'reach') {
    if (tile.gpaFit < -0.3) tips.push(`Raise your GPA to ${Math.min(4.0, college.avgGPA + 0.05).toFixed(2)}+ to match ${college.name}'s average of ${college.avgGPA.toFixed(2)}.`);
    if (tile.satFit < -0.3) tips.push(`Aim for a ${Math.min(1600, satMid + 20)}+ SAT to be competitive (their median is ~${satMid}).`);
    if (college.acceptanceRate < 10) tips.push('Ultra-selective — strong essays, extracurriculars, and recommendations are critical.');
    tips.push('Consider applying Early Decision/Action to improve your odds.');
  } else if (tile.tier === 'match') {
    tips.push('You\'re competitive here. Focus on standout essays and demonstrated interest.');
    if (tile.satFit < 0) tips.push(`Boosting your SAT to ${Math.min(1600, sat + 40)}+ would shift this toward a safety school.`);
    if (tile.gpaFit < 0) tips.push('Strengthening your GPA this semester would improve your position.');
  } else {
    tips.push('Strong academic fit — focus your application on showing genuine interest and fit.');
    tips.push('Consider whether this school\'s culture and programs align with your goals.');
  }
  return tips;
}

/* ──────────────────────── SORT OPTIONS ──────────────────────── */

type SortKey = 'fit-desc' | 'fit-asc' | 'name' | 'acceptance';
const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'fit-desc', label: 'Hottest First' },
  { key: 'fit-asc', label: 'Coldest First' },
  { key: 'name', label: 'A → Z' },
  { key: 'acceptance', label: 'Most Selective' },
];

/* ──────────────────────── RADAR LAYOUT ──────────────────────── */

function layoutRadarNodes(tiles: HeatmapTile[]): RadarNode[] {
  const groups: Record<string, HeatmapTile[]> = { safety: [], match: [], reach: [] };
  tiles.forEach(t => groups[t.tier].push(t));

  const config = [
    { tier: 'safety', baseR: 110, bandWidth: 40, ring: 0 },
    { tier: 'match', baseR: 210, bandWidth: 40, ring: 1 },
    { tier: 'reach', baseR: 300, bandWidth: 40, ring: 2 },
  ];

  const nodes: RadarNode[] = [];

  for (const { tier, baseR, bandWidth, ring } of config) {
    const group = [...groups[tier]].sort((a, b) => b.overallFit - a.overallFit);
    const count = group.length;
    if (!count) continue;

    const rows = count > 30 ? 3 : count > 15 ? 2 : 1;

    group.forEach((tile, i) => {
      const row = i % rows;
      const indexInRow = Math.floor(i / rows);
      const countInRow = Math.ceil(count / rows);
      const angle = (indexInRow / countInRow) * Math.PI * 2 - Math.PI / 2;
      const rowOffset = rows === 1 ? 0 : ((row / (rows - 1)) - 0.5) * bandWidth;
      const jitterR = Math.sin(i * 127.1 + 311.7) * 6;
      const jitterA = Math.cos(i * 269.5 + 183.3) * 0.02;
      const r = baseR + rowOffset + jitterR;

      nodes.push({
        tile,
        x: Math.cos(angle + jitterA) * r,
        y: Math.sin(angle + jitterA) * r,
        baseRadius: 5 + (tile.overallFit / 100) * 4,
        ring,
      });
    });
  }

  return nodes;
}

/* ──────────────────────── RADAR VIEW COMPONENT ──────────────────────── */

function RadarView({
  tiles,
  onSelect,
}: {
  tiles: HeatmapTile[];
  onSelect: (t: HeatmapTile) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTile, setHoveredTile] = useState<HeatmapTile | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const nodes = useMemo(() => layoutRadarNodes(tiles), [tiles]);

  const cameraRef = useRef({
    panX: 0,
    panY: 0,
    zoom: 1,
    targetZoom: 1,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
  });

  const screenNodesRef = useRef<{ sx: number; sy: number; radius: number; node: RadarNode }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const startTime = performance.now();

    function resize() {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    function toScreen(wx: number, wy: number): [number, number] {
      const rect = container!.getBoundingClientRect();
      const cam = cameraRef.current;
      const baseScale = Math.min(rect.width, rect.height) / 750;
      const scale = baseScale * cam.zoom;
      return [
        rect.width / 2 + (wx + cam.panX) * scale,
        rect.height / 2 + (wy + cam.panY) * scale,
      ];
    }

    function screenRadius(r: number): number {
      const rect = container!.getBoundingClientRect();
      const baseScale = Math.min(rect.width, rect.height) / 750;
      return r * baseScale * cameraRef.current.zoom;
    }

    function render(timestamp: number) {
      if (!canvas || !ctx || !container) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cam = cameraRef.current;
      const elapsed = (timestamp - startTime) / 1000;

      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      const entrance = Math.min(1, elapsed / 1.0);
      const eased = 1 - Math.pow(1 - entrance, 3);

      // Background — light theme
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      const [ccx, ccy] = toScreen(0, 0);

      // Subtle radial grid
      const gridRadii = [60, 120, 180, 240, 300, 360];
      for (const gr of gridRadii) {
        const sr = screenRadius(gr);
        if (sr < 3) continue;
        ctx.beginPath();
        ctx.arc(ccx, ccy, sr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148,163,184,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cross axes
      ctx.strokeStyle = 'rgba(148,163,184,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ccy);
      ctx.lineTo(w, ccy);
      ctx.moveTo(ccx, 0);
      ctx.lineTo(ccx, h);
      ctx.stroke();

      // Diagonal axes
      const diagLen = Math.max(w, h);
      ctx.beginPath();
      ctx.moveTo(ccx - diagLen, ccy - diagLen);
      ctx.lineTo(ccx + diagLen, ccy + diagLen);
      ctx.moveTo(ccx + diagLen, ccy - diagLen);
      ctx.lineTo(ccx - diagLen, ccy + diagLen);
      ctx.stroke();

      // Zone bands — filled circles outer to inner
      const zones = [
        { r: 345, fill: 'rgba(244,63,94,0.05)', stroke: 'rgba(244,63,94,0.2)', label: 'Reach', labelColor: '#e11d48' },
        { r: 255, fill: 'rgba(245,158,11,0.06)', stroke: 'rgba(245,158,11,0.2)', label: 'Match', labelColor: '#d97706' },
        { r: 155, fill: 'rgba(16,185,129,0.07)', stroke: 'rgba(16,185,129,0.2)', label: 'Safety', labelColor: '#059669' },
      ];

      for (const z of zones) {
        const sr = screenRadius(z.r);
        ctx.beginPath();
        ctx.arc(ccx, ccy, sr, 0, Math.PI * 2);
        ctx.fillStyle = z.fill;
        ctx.fill();
      }

      for (const z of zones) {
        const sr = screenRadius(z.r);
        ctx.beginPath();
        ctx.arc(ccx, ccy, sr, 0, Math.PI * 2);
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = z.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        if (cam.zoom > 0.3) {
          const fontSize = Math.max(9, Math.min(12, 11 * cam.zoom));
          ctx.font = `600 ${fontSize}px "DM Sans", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = z.labelColor;
          ctx.fillText(z.label, ccx, ccy - sr + fontSize + 4);
          ctx.globalAlpha = 1;
        }
      }

      // Scanning sweep line (radar animation)
      const sweepAngle = elapsed * 0.4;
      const sweepLen = screenRadius(360);
      const sweepGrad = ctx.createLinearGradient(
        ccx, ccy,
        ccx + Math.cos(sweepAngle) * sweepLen,
        ccy + Math.sin(sweepAngle) * sweepLen
      );
      sweepGrad.addColorStop(0, 'rgba(99,102,241,0.08)');
      sweepGrad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.beginPath();
      ctx.moveTo(ccx, ccy);
      ctx.lineTo(
        ccx + Math.cos(sweepAngle) * sweepLen,
        ccy + Math.sin(sweepAngle) * sweepLen
      );
      ctx.strokeStyle = sweepGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sweep cone (subtle fill behind sweep line)
      ctx.beginPath();
      ctx.moveTo(ccx, ccy);
      ctx.arc(ccx, ccy, sweepLen, sweepAngle - 0.3, sweepAngle, false);
      ctx.closePath();
      const coneGrad = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, sweepLen);
      coneGrad.addColorStop(0, 'rgba(99,102,241,0.04)');
      coneGrad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = coneGrad;
      ctx.fill();

      // Connection lines for saved schools
      for (const node of nodes) {
        if (!node.tile.isSaved) continue;
        const [sx, sy] = toScreen(node.x * eased, node.y * eased);
        const grad = ctx.createLinearGradient(ccx, ccy, sx, sy);
        grad.addColorStop(0, 'rgba(99,102,241,0.08)');
        grad.addColorStop(1, 'rgba(99,102,241,0.2)');
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Draw nodes
      const screenNodes: typeof screenNodesRef.current = [];

      for (const node of nodes) {
        const nx = node.x * eased;
        const ny = node.y * eased;
        const [sx, sy] = toScreen(nx, ny);

        if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;

        const [r, g, b] = getTempRGB(node.tile.overallFit);
        const radius = screenRadius(node.baseRadius) * eased;
        const fitNorm = node.tile.overallFit / 100;

        const breathe = 1 + 0.03 * Math.sin(elapsed * 1.2 + node.ring * 2 + node.tile.overallFit * 0.05);
        const finalRadius = Math.max(2, radius * breathe);

        screenNodes.push({ sx, sy, radius: finalRadius, node });

        // Glow
        const glowR = finalRadius * (1.8 + fitNorm * 0.8);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        glow.addColorStop(0, `rgba(${r},${g},${b},${0.12 + fitNorm * 0.08})`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(sx, sy, finalRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();

        // Tiny specular
        if (finalRadius > 3) {
          ctx.beginPath();
          ctx.arc(sx - finalRadius * 0.2, sy - finalRadius * 0.25, finalRadius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fill();
        }

        // Saved school ring
        if (node.tile.isSaved) {
          ctx.beginPath();
          ctx.arc(sx, sy, finalRadius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99,102,241,${0.45 + 0.2 * Math.sin(elapsed * 2)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Labels when zoomed
        if (cam.zoom > 1.2 && finalRadius > 4) {
          const labelAlpha = Math.min(0.75, (cam.zoom - 1.2) * 1.5);
          ctx.font = `500 ${Math.max(8, Math.min(11, 9 * cam.zoom))}px "DM Sans", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(30,41,59,${labelAlpha})`;
          ctx.fillText(node.tile.college.name, sx, sy + finalRadius + 11);
        }
      }

      screenNodesRef.current = screenNodes;

      // Center "YOU" marker
      // Pulse rings
      for (let ring = 0; ring < 3; ring++) {
        const phase = ((elapsed * 0.4 + ring * 0.33) % 1);
        const ringR = phase * 25 * Math.max(1, cam.zoom * 0.7);
        ctx.globalAlpha = (1 - phase) * 0.12;
        ctx.beginPath();
        ctx.arc(ccx, ccy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const youR = Math.max(4, 5 * cam.zoom);
      const youGrad = ctx.createRadialGradient(ccx - 1, ccy - 1, 0, ccx, ccy, youR);
      youGrad.addColorStop(0, '#c4b5fd');
      youGrad.addColorStop(0.5, '#818cf8');
      youGrad.addColorStop(1, '#6366f1');
      ctx.fillStyle = youGrad;
      ctx.beginPath();
      ctx.arc(ccx, ccy, youR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(ccx - youR * 0.2, ccy - youR * 0.3, youR * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold ${Math.max(9, Math.min(11, 10 * cam.zoom))}px "DM Sans", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(99,102,241,0.7)';
      ctx.fillText('YOU', ccx, ccy + youR + 13);

      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);

    // Mouse handlers
    function handleMouseDown(e: MouseEvent) {
      const cam = cameraRef.current;
      cam.isDragging = true;
      cam.lastX = e.clientX;
      cam.lastY = e.clientY;
      cam.dragDistance = 0;
    }

    function handleMouseMove(e: MouseEvent) {
      const cam = cameraRef.current;
      if (!cam.isDragging) {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let closest: typeof screenNodesRef.current[0] | null = null;
        let closestDist = Infinity;

        for (const p of screenNodesRef.current) {
          const dx = p.sx - mx;
          const dy = p.sy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitR = Math.max(14, p.radius + 4);
          if (dist < hitR && dist < closestDist) {
            closest = p;
            closestDist = dist;
          }
        }

        if (closest) {
          setHoveredTile(closest.node.tile);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          canvas!.style.cursor = 'pointer';
        } else {
          setHoveredTile(null);
          canvas!.style.cursor = 'grab';
        }
        return;
      }

      canvas!.style.cursor = 'grabbing';
      const dx = e.clientX - cam.lastX;
      const dy = e.clientY - cam.lastY;
      cam.dragDistance += Math.abs(dx) + Math.abs(dy);
      const rect = container!.getBoundingClientRect();
      const baseScale = Math.min(rect.width, rect.height) / 750;
      const scale = baseScale * cam.zoom;
      cam.panX += dx / scale;
      cam.panY += dy / scale;
      cam.lastX = e.clientX;
      cam.lastY = e.clientY;
    }

    function handleMouseUp(e: MouseEvent) {
      const cam = cameraRef.current;
      const wasDrag = cam.dragDistance > 5;
      cam.isDragging = false;

      if (!wasDrag && container) {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let closest: typeof screenNodesRef.current[0] | null = null;
        let closestDist = Infinity;
        for (const p of screenNodesRef.current) {
          const dx = p.sx - mx;
          const dy = p.sy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closest = p;
            closestDist = dist;
          }
        }
        const maxHitDist = Math.max(16, Math.min(30, 20 * cam.zoom));
        if (closest && closestDist <= maxHitDist) {
          onSelect(closest.node.tile);
        }
      }

      canvas!.style.cursor = 'grab';
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const cam = cameraRef.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const zoomFactor = 1 - delta * 0.0015;
      cam.targetZoom = Math.max(0.4, Math.min(4, cam.targetZoom * zoomFactor));
    }

    // Touch
    let touchDist = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        const cam = cameraRef.current;
        cam.isDragging = true;
        cam.lastX = e.touches[0].clientX;
        cam.lastY = e.touches[0].clientY;
        cam.dragDistance = 0;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      const cam = cameraRef.current;
      if (e.touches.length === 1 && cam.isDragging) {
        const dx = e.touches[0].clientX - cam.lastX;
        const dy = e.touches[0].clientY - cam.lastY;
        cam.dragDistance += Math.abs(dx) + Math.abs(dy);
        const rect = container!.getBoundingClientRect();
        const baseScale = Math.min(rect.width, rect.height) / 750;
        const scale = baseScale * cam.zoom;
        cam.panX += dx / scale;
        cam.panY += dy / scale;
        cam.lastX = e.touches[0].clientX;
        cam.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        if (touchDist > 0) {
          cam.targetZoom = Math.max(0.4, Math.min(4, cam.targetZoom * (newDist / touchDist)));
        }
        touchDist = newDist;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const cam = cameraRef.current;
      const wasDrag = cam.dragDistance > 10;
      cam.isDragging = false;

      if (!wasDrag && container && e.changedTouches.length > 0) {
        const rect = container.getBoundingClientRect();
        const mx = e.changedTouches[0].clientX - rect.left;
        const my = e.changedTouches[0].clientY - rect.top;
        let closest: typeof screenNodesRef.current[0] | null = null;
        let closestDist = Infinity;
        for (const p of screenNodesRef.current) {
          const dx = p.sx - mx;
          const dy = p.sy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closest = p;
            closestDist = dist;
          }
        }
        const maxHitDist = Math.max(20, Math.min(35, 24 * cam.zoom));
        if (closest && closestDist <= maxHitDist) {
          onSelect(closest.node.tile);
        }
      }
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', () => { cameraRef.current.isDragging = false; setHoveredTile(null); });
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [nodes, onSelect]);

  return (
    <div ref={containerRef} className="relative rounded-2xl overflow-hidden select-none border border-slate-100" style={{ height: 'clamp(400px, 60vh, 650px)' }}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ cursor: 'grab' }} />

      {/* Hover tooltip */}
      {hoveredTile && (
        <div
          className="absolute pointer-events-none z-10 transition-opacity duration-150"
          style={{
            left: Math.min(tooltipPos.x + 16, (containerRef.current?.offsetWidth || 300) - 240),
            top: Math.max(8, tooltipPos.y - 40),
          }}
        >
          <div className="bg-white rounded-xl px-3.5 py-2.5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: getTempColor(hoveredTile.overallFit) }}
              >
                {hoveredTile.overallFit}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{hoveredTile.college.name}</p>
                <p className="text-[10px] text-slate-400">
                  {hoveredTile.college.acceptanceRate}% accept &middot; {hoveredTile.college.satRange[0]}-{hoveredTile.college.satRange[1]} SAT
                  &middot; <span style={{ color: getTempColor(hoveredTile.overallFit) }}>{getTempLabel(hoveredTile.overallFit)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-white rounded-lg px-2.5 py-2 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Safety (inner)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-500">Match (middle)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-500">Reach (outer)</span>
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
        <button
          onClick={() => { cameraRef.current.targetZoom = Math.min(4, cameraRef.current.targetZoom * 1.4); }}
          className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center text-lg font-medium shadow-sm"
        >
          +
        </button>
        <button
          onClick={() => { cameraRef.current.targetZoom = Math.max(0.4, cameraRef.current.targetZoom / 1.4); }}
          className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center text-lg font-medium shadow-sm"
        >
          −
        </button>
        <button
          onClick={() => { cameraRef.current.targetZoom = 1; cameraRef.current.panX = 0; cameraRef.current.panY = 0; }}
          className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
          title="Reset view"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 pointer-events-none text-right">
        <p>Drag to pan &middot; Scroll to zoom</p>
        <p>Click a dot to explore</p>
      </div>

      {/* School count */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-white rounded-lg px-2.5 py-1 border border-slate-100 shadow-sm">
          <span className="text-[10px] text-slate-500 font-medium tabular-nums">
            {tiles.length} schools
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── TRENDS DATA ──────────────────────── */

const ADMISSIONS_DATA = [
  // Sources: CDC NVSS births (→ +18yr = college year), WICHE projections, Common App end-of-season reports, IIE Open Doors
  { year: 2022, label: "'22–'23", birthCohort: 4112, hsGrads: 3740, commonAppVolume: 8569, intlStudents: 1057, appsPerStudent: 6.41, actual: true },
  { year: 2023, label: "'23–'24", birthCohort: 4138, hsGrads: 3790, commonAppVolume: 9472, intlStudents: 1127, appsPerStudent: 6.64, actual: true },
  { year: 2024, label: "'24–'25", birthCohort: 4266, hsGrads: 3870, commonAppVolume: 10194, intlStudents: 1178, appsPerStudent: 6.80, actual: true },
  { year: 2025, label: "'25–'26", birthCohort: 4316, hsGrads: 3900, commonAppVolume: 10700, intlStudents: 1170, appsPerStudent: 6.90, actual: false },
  { year: 2026, label: "'26–'27", birthCohort: 4248, hsGrads: 3830, commonAppVolume: 10900, intlStudents: 1160, appsPerStudent: 7.00, actual: false },
  { year: 2027, label: "'27–'28", birthCohort: 4131, hsGrads: 3720, commonAppVolume: 10800, intlStudents: 1150, appsPerStudent: 7.05, actual: false },
  { year: 2028, label: "'28–'29", birthCohort: 3999, hsGrads: 3600, commonAppVolume: 10500, intlStudents: 1140, appsPerStudent: 7.10, actual: false },
  { year: 2029, label: "'29–'30", birthCohort: 3954, hsGrads: 3560, commonAppVolume: 10200, intlStudents: 1130, appsPerStudent: 7.10, actual: false },
  { year: 2030, label: "'30–'31", birthCohort: 3953, hsGrads: 3540, commonAppVolume: 10000, intlStudents: 1120, appsPerStudent: 7.15, actual: false },
  { year: 2031, label: "'31–'32", birthCohort: 3933, hsGrads: 3510, commonAppVolume: 9800, intlStudents: 1110, appsPerStudent: 7.15, actual: false },
];

type TrendMetric = 'pool' | 'apps' | 'intl';

const TREND_CONFIGS: Record<TrendMetric, { label: string; description: string; barKey: string; maxKey: string; color: string; colorDark: string; format: (v: number) => string }> = {
  pool: {
    label: 'Applicant Pool Size',
    description: 'HS graduates + international students entering the applicant pool each year',
    barKey: 'pool',
    maxKey: 'pool',
    color: '#f97316',
    colorDark: '#ea580c',
    format: (v: number) => `${(v / 1000).toFixed(1)}M`,
  },
  apps: {
    label: 'Application Volume',
    description: 'Total Common App applications submitted per cycle (thousands)',
    barKey: 'commonAppVolume',
    maxKey: 'commonAppVolume',
    color: '#10b981',
    colorDark: '#059669',
    format: (v: number) => `${(v / 1000).toFixed(1)}M`,
  },
  intl: {
    label: 'Domestic vs International',
    description: 'Domestic HS grads (orange) overlaid with international enrollment (green)',
    barKey: 'split',
    maxKey: 'split',
    color: '#f97316',
    colorDark: '#ea580c',
    format: (v: number) => `${(v / 1000).toFixed(1)}M`,
  },
};

function TrendsView() {
  const [metric, setMetric] = useState<TrendMetric>('pool');
  const config = TREND_CONFIGS[metric];

  const enriched = useMemo(() => {
    return ADMISSIONS_DATA.map(d => ({
      ...d,
      pool: d.hsGrads + d.intlStudents,
    }));
  }, []);

  const peakYear = enriched.reduce((best, d) => (d.pool > best.pool ? d : best), enriched[0]);
  const currentYear = enriched.find(d => d.year === 2025)!;
  const lastYear = enriched[enriched.length - 1];
  const poolDrop = (((lastYear.pool - peakYear.pool) / peakYear.pool) * 100).toFixed(1);

  const getBarValue = (d: typeof enriched[0]): number => {
    if (metric === 'pool') return d.pool;
    if (metric === 'apps') return d.commonAppVolume;
    return d.hsGrads + d.intlStudents;
  };

  const maxVal = Math.max(...enriched.map(getBarValue));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-primary">Admissions Forecast</h2>
              <p className="text-xs text-slate-400 mt-0.5">10-year outlook based on CDC birth data, WICHE projections &amp; Common App trends</p>
            </div>
          </div>

          {/* Metric toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(Object.keys(TREND_CONFIGS) as TrendMetric[]).map(key => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  metric === key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {key === 'pool' ? 'Pool Size' : key === 'apps' ? 'App Volume' : 'Dom. vs Intl.'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 mb-1">{config.description}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 px-5 py-3">
        <div className="text-center p-2.5 rounded-xl bg-orange-50/60">
          <div className="text-lg font-bold text-orange-600 tabular-nums">{currentYear.hsGrads.toLocaleString()}K</div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">2025 HS Grads</div>
          <div className="text-[10px] text-orange-500 font-semibold mt-0.5">Peak Year</div>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-emerald-50/60">
          <div className="text-lg font-bold text-emerald-600 tabular-nums">{currentYear.intlStudents.toLocaleString()}K</div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Intl. Students</div>
          <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">Record High</div>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-rose-50/60">
          <div className="text-lg font-bold text-rose-600 tabular-nums">{poolDrop}%</div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Pool Drop by '31</div>
          <div className="text-[10px] text-rose-500 font-semibold mt-0.5">Demographic Cliff</div>
        </div>
      </div>

      {/* Histogram */}
      <div className="px-5 pb-2">
        <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: '220px' }}>
          {enriched.map((d, i) => {
            const barVal = getBarValue(d);
            const pct = (barVal / maxVal) * 100;
            const isCurrentYear = d.year === 2025;
            const isPeak = d.pool === peakYear.pool && metric === 'pool';

            if (metric === 'intl') {
              const totalVal = d.hsGrads + d.intlStudents;
              const totalPct = (totalVal / maxVal) * 100;
              const domesticPct = (d.hsGrads / totalVal) * totalPct;
              const intlPct = (d.intlStudents / totalVal) * totalPct;

              return (
                <div key={d.year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                      <div className="font-semibold">{d.label}</div>
                      <div className="text-orange-300">Domestic: {d.hsGrads.toLocaleString()}K</div>
                      <div className="text-emerald-300">International: {d.intlStudents.toLocaleString()}K</div>
                      {!d.actual && <div className="text-white/40 mt-0.5">Projected</div>}
                    </div>
                  </div>
                  <div className="w-full flex flex-col items-stretch" style={{ height: `${totalPct}%` }}>
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{ height: `${intlPct / totalPct * 100}%`, backgroundColor: '#10b981', opacity: d.actual ? 1 : 0.5 }}
                    />
                    <div
                      className="w-full rounded-b-md transition-all duration-500"
                      style={{ height: `${domesticPct / totalPct * 100}%`, backgroundColor: '#f97316', opacity: d.actual ? 1 : 0.5 }}
                    />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] tabular-nums shrink-0 ${isCurrentYear ? 'font-bold text-primary' : 'text-slate-400'}`}>{d.label}</span>
                </div>
              );
            }

            return (
              <div key={d.year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="bg-slate-800 text-white rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                    <div className="font-semibold">{d.label}</div>
                    <div>{config.format(barVal)}</div>
                    {metric === 'pool' && <div className="text-white/50">HS: {d.hsGrads}K + Intl: {d.intlStudents}K</div>}
                    {metric === 'apps' && <div className="text-white/50">{d.appsPerStudent} apps/student</div>}
                    {!d.actual && <div className="text-white/40 mt-0.5">Projected</div>}
                  </div>
                </div>
                {isPeak && (
                  <div className="text-[8px] text-orange-500 font-bold uppercase tracking-wider mb-0.5">Peak</div>
                )}
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${isCurrentYear ? 'ring-2 ring-primary/20 ring-offset-1' : ''}`}
                  style={{
                    height: `${pct}%`,
                    backgroundColor: metric === 'apps' ? config.color : config.color,
                    opacity: d.actual ? 1 : 0.5,
                    background: d.actual
                      ? `linear-gradient(to top, ${config.colorDark}, ${config.color})`
                      : `repeating-linear-gradient(135deg, ${config.color}22 0px, ${config.color}22 4px, ${config.color}44 4px, ${config.color}44 8px)`,
                  }}
                />
                <span className={`text-[9px] sm:text-[10px] tabular-nums shrink-0 ${isCurrentYear ? 'font-bold text-primary' : 'text-slate-400'}`}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & insights */}
      <div className="px-5 pb-5 pt-2">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-3">
          {metric === 'intl' ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-3 h-3 rounded-sm bg-orange-500" />
                <span className="text-slate-500">Domestic HS Graduates</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-500">International Students</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-3 h-3 rounded-sm" style={{ background: `linear-gradient(to top, ${config.colorDark}, ${config.color})` }} />
              <span className="text-slate-500">Actual</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${metric === 'intl' ? '#f97316' : config.color}22 0px, ${metric === 'intl' ? '#f97316' : config.color}22 4px, ${metric === 'intl' ? '#f97316' : config.color}44 4px, ${metric === 'intl' ? '#f97316' : config.color}44 8px)` }} />
            <span className="text-slate-500">Projected</span>
          </div>
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-800">The Demographic Cliff</p>
              <p className="text-[10px] text-amber-700/70 leading-relaxed mt-0.5">
                2007 birth peak (4.3M) hits college in 2025. After that, each class shrinks — 363K fewer students by 2030. Source: CDC NVSS, WICHE.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-800">What This Means For You</p>
              <p className="text-[10px] text-emerald-700/70 leading-relaxed mt-0.5">
                Less competition at most schools post-2026. But top-25 schools stay ultra-competitive — apps/student rose 47% since 2014 (Common App).
              </p>
            </div>
          </div>
        </div>

        {/* Source attribution */}
        <p className="text-[9px] text-slate-300 mt-3">
          Sources: CDC National Vital Statistics System &middot; WICHE Knocking at the College Door (11th Ed.) &middot; Common App End-of-Season Reports &middot; IIE Open Doors
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function CollegeHeatmapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [gpa, setGpa] = useState(3.5);
  const [sat, setSat] = useState(1200);
  const [act, setAct] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'galaxy' | 'list' | 'trends'>('galaxy');
  const sliderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedTile, setSelectedTile] = useState<HeatmapTile | null>(null);
  const [savedSchools, setSavedSchools] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('fit-desc');
  const [filterTier, setFilterTier] = useState<'' | 'safety' | 'match' | 'reach'>('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<'Private' | 'Public' | ''>('');
  const [listSizeFilter, setListSizeFilter] = useState<'Small' | 'Medium' | 'Large' | ''>('');
  const [listStrengthFilter, setListStrengthFilter] = useState('');
  const [listStateFilter, setListStateFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    let localApps: any[] = [];
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      if (stored) localApps = JSON.parse(stored);
    } catch {}
    if (localApps.length > 0) {
      setSavedSchools(new Set(localApps.map((a: any) => a.name.toLowerCase())));
    }
    fetch('/api/applications').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.applications?.length) {
        setSavedSchools(new Set(data.applications.map((a: any) => a.name.toLowerCase())));
      }
    }).catch(() => {});

    if (status === 'authenticated' && !profileLoaded) {
      fetch('/api/college-match')
        .then(r => r.json())
        .then(data => {
          if (data.studentStats) {
            setGpa(data.studentStats.gpa || 3.5);
            setSat(data.studentStats.totalSAT || 1200);
            if (data.studentStats.actScore) setAct(data.studentStats.actScore);
          }
          setProfileLoaded(true);
        })
        .catch(() => setProfileLoaded(true));
    }
  }, [status, profileLoaded]);

  const bestSAT = useMemo(() => {
    const actEquiv = act > 0 ? actToSat(act) : 0;
    return Math.max(sat, actEquiv);
  }, [sat, act]);

  const tiles = useMemo<HeatmapTile[]>(() => {
    return colleges.map(college => {
      const match = computeMatch(gpa, bestSAT, college);
      return { college, ...match, isSaved: savedSchools.has(college.name.toLowerCase()) };
    });
  }, [gpa, bestSAT, savedSchools]);

  const visibleTiles = useMemo(() => {
    let result = [...tiles];
    if (filterTier) result = result.filter(t => t.tier === filterTier);
    if (showSavedOnly) result = result.filter(t => t.isSaved);
    switch (sortKey) {
      case 'fit-desc': result.sort((a, b) => b.overallFit - a.overallFit); break;
      case 'fit-asc': result.sort((a, b) => a.overallFit - b.overallFit); break;
      case 'name': result.sort((a, b) => a.college.name.localeCompare(b.college.name)); break;
      case 'acceptance': result.sort((a, b) => a.college.acceptanceRate - b.college.acceptanceRate); break;
    }
    return result;
  }, [tiles, filterTier, showSavedOnly, sortKey]);

  const tierCounts = useMemo(() => {
    const counts = { safety: 0, match: 0, reach: 0 };
    tiles.forEach(t => counts[t.tier]++);
    return counts;
  }, [tiles]);

  const discoveries = useMemo(() => {
    return tiles
      .filter(t => !t.isSaved && t.tier === 'safety')
      .sort((a, b) => b.overallFit - a.overallFit)
      .slice(0, 6);
  }, [tiles]);

  const allStrengths = useMemo(() => {
    const set = new Set<string>();
    tiles.forEach(t => t.college.strengths.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [tiles]);

  const allStates = useMemo(() => {
    const set = new Set<string>();
    tiles.forEach(t => set.add(t.college.state));
    return Array.from(set).sort();
  }, [tiles]);

  const listTiles = useMemo(() => {
    let result = [...visibleTiles];
    if (listTypeFilter) result = result.filter(t => t.college.type === listTypeFilter);
    if (listSizeFilter) result = result.filter(t => t.college.size === listSizeFilter);
    if (listStrengthFilter) result = result.filter(t => t.college.strengths.includes(listStrengthFilter));
    if (listStateFilter) result = result.filter(t => t.college.state === listStateFilter);
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      result = result.filter(t =>
        t.college.name.toLowerCase().includes(q) ||
        t.college.location.toLowerCase().includes(q) ||
        t.college.strengths.some(s => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [visibleTiles, listTypeFilter, listSizeFilter, listStrengthFilter, listStateFilter, listSearch]);

  const addToTracker = useCallback((college: College) => {
    try {
      const stored = localStorage.getItem('admitsonly_applications');
      const apps = stored ? JSON.parse(stored) : [];
      if (apps.some((a: any) => a.name.toLowerCase() === college.name.toLowerCase())) return;
      apps.push({
        id: `app_${Date.now()}`,
        name: college.name,
        deadline: '',
        type: 'Regular Decision',
        status: 'researching',
        tasks: [
          { id: `t1_${Date.now()}`, label: 'Research program requirements', done: false },
          { id: `t2_${Date.now()}`, label: 'Write main essay', done: false },
          { id: `t3_${Date.now()}`, label: 'Complete supplemental essays', done: false },
          { id: `t4_${Date.now()}`, label: 'Request recommendation letters', done: false },
          { id: `t5_${Date.now()}`, label: 'Submit application', done: false },
        ],
      });
      localStorage.setItem('admitsonly_applications', JSON.stringify(apps));
      setSavedSchools(prev => { const next = new Set(Array.from(prev)); next.add(college.name.toLowerCase()); return next; });
      tracker.feature('college-heatmap', 'add_to_tracker', { college: college.name, acceptanceRate: college.acceptanceRate });
      fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applications: apps }),
      }).catch(() => {});
    } catch {}
  }, []);

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <Head><title>Admissions Map | AdmitsOnly</title></Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading heatmap...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Admissions Map | AdmitsOnly</title></Head>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-primary">Admissions Heatmap</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {tiles.length} colleges &middot; {tierCounts.safety} hot &middot; {tierCounts.match} warm &middot; {tierCounts.reach} cold
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setViewMode('galaxy'); tracker.feature('college-heatmap', 'view_toggle', { mode: 'radar' }); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'galaxy'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="8" cy="8" r="3" opacity="0.7" />
                <circle cx="8" cy="8" r="5.5" opacity="0.4" />
                <circle cx="8" cy="8" r="7.5" opacity="0.25" />
                <line x1="8" y1="0.5" x2="8" y2="15.5" opacity="0.15" />
                <line x1="0.5" y1="8" x2="15.5" y2="8" opacity="0.15" />
              </svg>
              Radar
            </button>
            <button
              onClick={() => { setViewMode('grid'); tracker.feature('college-heatmap', 'view_toggle', { mode: 'grid' }); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
            <button
              onClick={() => { setViewMode('list'); tracker.feature('college-heatmap', 'view_toggle', { mode: 'list' }); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => { setViewMode('trends'); tracker.feature('college-heatmap', 'view_toggle', { mode: 'trends' }); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'trends'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Trends
            </button>
          </div>
        </div>

        {/* TRENDS VIEW */}
        {viewMode === 'trends' && <TrendsView />}

        {/* What-If Simulator (hidden in trends and list views) */}
        {viewMode !== 'trends' && viewMode !== 'list' && <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h2 className="text-sm font-bold text-primary">What-If Simulator</h2>
            <span className="text-xs text-slate-400 ml-1">Adjust your stats to see real-time changes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">GPA (UW)</label>
                <span className="text-sm font-bold text-primary tabular-nums">{gpa.toFixed(2)}</span>
              </div>
              <input
                type="range" min="2.0" max="4.0" step="0.01" value={gpa}
                onChange={e => {
                  const v = parseFloat(e.target.value); setGpa(v);
                  if (sliderDebounceRef.current) clearTimeout(sliderDebounceRef.current);
                  sliderDebounceRef.current = setTimeout(() => tracker.feature('college-heatmap', 'gpa_slider', { gpa: v }), 800);
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                style={{ background: `linear-gradient(to right, #6366f1 ${((gpa - 2) / 2) * 100}%, #e2e8f0 ${((gpa - 2) / 2) * 100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>2.0</span><span>3.0</span><span>4.0</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">SAT</label>
                <span className="text-sm font-bold text-primary tabular-nums">{sat}</span>
              </div>
              <input
                type="range" min="800" max="1600" step="10" value={sat}
                onChange={e => {
                  const v = parseInt(e.target.value); setSat(v);
                  if (sliderDebounceRef.current) clearTimeout(sliderDebounceRef.current);
                  sliderDebounceRef.current = setTimeout(() => tracker.feature('college-heatmap', 'sat_slider', { sat: v }), 800);
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                style={{ background: `linear-gradient(to right, #6366f1 ${((sat - 800) / 800) * 100}%, #e2e8f0 ${((sat - 800) / 800) * 100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>800</span><span>1200</span><span>1600</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">ACT</label>
                <span className="text-sm font-bold text-primary tabular-nums">{act || '—'}</span>
              </div>
              <input
                type="range" min="0" max="36" step="1" value={act}
                onChange={e => {
                  const v = parseInt(e.target.value); setAct(v);
                  if (sliderDebounceRef.current) clearTimeout(sliderDebounceRef.current);
                  sliderDebounceRef.current = setTimeout(() => tracker.feature('college-heatmap', 'act_slider', { act: v }), 800);
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                style={{ background: `linear-gradient(to right, #6366f1 ${(act / 36) * 100}%, #e2e8f0 ${(act / 36) * 100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Off</span><span>18</span><span>36</span></div>
              {act > 0 && <p className="text-[10px] text-slate-400 mt-1">SAT equivalent: {actToSat(act)}</p>}
            </div>
          </div>
        </div>}

        {/* Filters */}
        {viewMode !== 'trends' && viewMode !== 'list' && <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTempColor(0) }} />
              <span className="text-[10px] text-slate-400">Cold</span>
            </div>
            <div className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(99,102,241), rgb(245,158,11), rgb(249,115,22), rgb(239,68,68))' }} />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getTempColor(100) }} />
              <span className="text-[10px] text-slate-400">Hot</span>
            </div>
          </div>

          {(['', 'safety', 'match', 'reach'] as const).map(tier => (
            <button
              key={tier || 'all'}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTier === tier ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tier === '' ? `All (${tiles.length})` : tier === 'safety' ? `Hot (${tierCounts.safety})` : tier === 'match' ? `Warm (${tierCounts.match})` : `Cold (${tierCounts.reach})`}
            </button>
          ))}

          {savedSchools.size > 0 && (
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showSavedOnly ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              My List ({savedSchools.size})
            </button>
          )}

          {viewMode === 'grid' && (
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          )}
        </div>}

        {/* RADAR VIEW */}
        {viewMode === 'galaxy' && (
          <RadarView tiles={visibleTiles} onSelect={setSelectedTile} />
        )}

        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {visibleTiles.map(tile => {
              const color = getTempColor(tile.overallFit);
              return (
                <button
                  key={tile.college.id}
                  onClick={() => setSelectedTile(tile)}
                  className="relative group text-left rounded-xl border border-white/20 overflow-hidden transition-all duration-300 hover:scale-105 hover:z-10 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <div className="p-3 min-h-[90px] flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight truncate drop-shadow-sm">{tile.college.name}</p>
                      <p className="text-[9px] text-white/70 mt-0.5 truncate">{tile.college.location}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <div className="text-lg font-bold text-white drop-shadow-sm tabular-nums">{tile.overallFit}</div>
                        <div className="text-[9px] text-white/60 font-medium uppercase tracking-wide">{getTempLabel(tile.overallFit)}</div>
                      </div>
                      {tile.isSaved && (
                        <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              );
            })}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {/* Tier summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {(['reach', 'match', 'safety'] as const).map(tier => {
                const cfg = { reach: { label: 'Reach', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-500/20', desc: 'Ambitious — your stats are below their typical admits' }, match: { label: 'Match', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500/20', desc: 'Competitive — your stats align with their typical admits' }, safety: { label: 'Safety', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500/20', desc: 'Strong fit — your stats exceed their typical admits' } }[tier];
                const count = tierCounts[tier];
                const isActive = filterTier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => setFilterTier(isActive ? '' : tier)}
                    className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all text-left ${
                      isActive ? `${cfg.border} ${cfg.bg} ring-2 ${cfg.ring}` : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className={`text-2xl sm:text-3xl font-bold font-display ${cfg.color}`}>{count}</div>
                    <div className={`text-sm font-semibold mt-1 ${isActive ? cfg.color : 'text-slate-600'}`}>{cfg.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Filters bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search schools, locations, programs..."
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <select value={listTypeFilter} onChange={e => setListTypeFilter(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20">
                  <option value="">All Types</option>
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
                <select value={listSizeFilter} onChange={e => setListSizeFilter(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20">
                  <option value="">All Sizes</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
                <select value={listStrengthFilter} onChange={e => setListStrengthFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 max-w-[160px]">
                  <option value="">All Programs</option>
                  {allStrengths.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={listStateFilter} onChange={e => setListStateFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/20">
                  <option value="">All States</option>
                  {allStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(listSearch || listTypeFilter || listSizeFilter || listStrengthFilter || listStateFilter || filterTier) && (
                  <button onClick={() => { setListSearch(''); setListTypeFilter(''); setListSizeFilter(''); setListStrengthFilter(''); setListStateFilter(''); setFilterTier(''); }} className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">Clear all</button>
                )}
              </div>
            </div>

            {/* Results */}
            {listTiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No schools match your current filters.</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">{listTiles.length} schools found</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">GPA: <span className="font-semibold text-primary">{gpa.toFixed(2)}</span></span>
                    <span className="text-xs text-slate-400">SAT: <span className="font-semibold text-primary">{sat}</span></span>
                    {act > 0 && <span className="text-xs text-slate-400">ACT: <span className="font-semibold text-primary">{act}</span></span>}
                  </div>
                </div>
                {listTiles.map(tile => {
                  const tierCfg = { reach: { label: 'Reach', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' }, match: { label: 'Match', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }, safety: { label: 'Safety', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' } }[tile.tier];
                  const isExpanded = expandedId === tile.college.id;
                  return (
                    <div key={tile.college.id} className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 dash-card-hover transition-all overflow-hidden">
                      <div className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tile.college.id)}>
                        <div className={`shrink-0 w-16 sm:w-20 py-1.5 rounded-xl text-center ${tierCfg.bg} ${tierCfg.border} border`}>
                          <div className={`text-xs font-bold ${tierCfg.color}`}>{tierCfg.label}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-primary truncate">{tile.college.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{tile.college.location} &middot; {tile.college.type} &middot; {tile.college.size}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                          <div className="text-center"><div className="text-xs text-slate-400">Accept</div><div className="text-sm font-bold text-primary">{tile.college.acceptanceRate}%</div></div>
                          <div className="text-center"><div className="text-xs text-slate-400">Avg GPA</div><div className="text-sm font-bold text-primary">{tile.college.avgGPA.toFixed(2)}</div></div>
                          <div className="text-center"><div className="text-xs text-slate-400">SAT Range</div><div className="text-sm font-bold text-primary">{tile.college.satRange[0]}-{tile.college.satRange[1]}</div></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {tile.isSaved ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Added</span>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); addToTracker(tile.college); }} className="text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-all">+ Track</button>
                          )}
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 sm:px-5 py-4 bg-slate-50/50">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Fit</h4>
                              <div className="space-y-2">
                                <ListFitBar label="GPA" value={tile.gpaFit} studentVal={gpa.toFixed(2)} schoolVal={tile.college.avgGPA.toFixed(2)} />
                                <ListFitBar label="SAT" value={tile.satFit} studentVal={String(sat)} schoolVal={`${tile.college.satRange[0]}-${tile.college.satRange[1]}`} />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Known For</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {tile.college.strengths.map(s => (
                                  <span key={s} className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">{s}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recommendation</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {tile.tier === 'reach' && 'Focus your application on standout essays and strong extracurriculars. Consider applying Early Decision for a competitive edge.'}
                                {tile.tier === 'match' && 'You\'re well-positioned for this school. Ensure your essays showcase unique qualities and genuine interest in their specific programs.'}
                                {tile.tier === 'safety' && 'Your academics are strong for this school. Still craft a compelling application — demonstrate why this school is a great fit for you.'}
                              </p>
                              {!tile.isSaved && (
                                <button onClick={() => addToTracker(tile.college)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                  Add to Application Tracker
                                </button>
                              )}
                            </div>
                            {/* Mobile stats */}
                            <div className="sm:hidden">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stats</h4>
                              <div className="flex gap-4 text-sm">
                                <div><span className="text-slate-400">Accept: </span><span className="font-bold text-primary">{tile.college.acceptanceRate}%</span></div>
                                <div><span className="text-slate-400">GPA: </span><span className="font-bold text-primary">{tile.college.avgGPA.toFixed(2)}</span></div>
                                <div><span className="text-slate-400">SAT: </span><span className="font-bold text-primary">{tile.college.satRange[0]}-{tile.college.satRange[1]}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {visibleTiles.length === 0 && viewMode !== 'list' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-sm text-slate-500">No schools match your current filters.</p>
            <button onClick={() => { setFilterTier(''); setShowSavedOnly(false); }} className="text-xs text-accent font-semibold mt-2 hover:underline">Clear filters</button>
          </div>
        )}

        {/* Discovery */}
        {discoveries.length > 0 && !showSavedOnly && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-primary">Discover Hot Schools</h2>
                <p className="text-xs text-slate-400">High-match schools not on your list yet</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoveries.map(tile => (
                <div key={tile.college.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group" onClick={() => setSelectedTile(tile)}>
                  <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: getTempColor(tile.overallFit) }}>{tile.overallFit}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{tile.college.name}</p>
                    <p className="text-xs text-slate-400">{tile.college.acceptanceRate}% accept &middot; {tile.college.satRange[0]}-{tile.college.satRange[1]} SAT</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); addToTracker(tile.college); }} className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">+ Add</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTile(null)} />
          <div className="relative bg-white rounded-2xl shadow-sm border border-slate-100 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-up">
            <div className="p-5 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: getTempColor(selectedTile.overallFit) }}>{selectedTile.overallFit}</div>
                  <div>
                    <h2 className="text-lg font-bold font-display text-primary">{selectedTile.college.name}</h2>
                    <p className="text-xs text-slate-400">{selectedTile.college.location} &middot; {selectedTile.college.type} &middot; {selectedTile.college.size}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTile(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-4 mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Admissions Temperature</span>
                  <span className="font-bold" style={{ color: getTempColor(selectedTile.overallFit) }}>{getTempLabel(selectedTile.overallFit)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(99,102,241), rgb(245,158,11), rgb(249,115,22), rgb(239,68,68))' }}>
                  <div className="relative h-full">
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all" style={{ left: `calc(${selectedTile.overallFit}% - 8px)`, borderColor: getTempColor(selectedTile.overallFit) }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.acceptanceRate}%</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Accept Rate</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.avgGPA.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avg GPA</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{selectedTile.college.satRange[0]}-{selectedTile.college.satRange[1]}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">SAT Range</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50">
                <div className="text-lg font-bold text-primary">{Math.round(satToAct((selectedTile.college.satRange[0] + selectedTile.college.satRange[1]) / 2))}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">ACT Equiv</div>
              </div>
            </div>

            <div className="px-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Fit Breakdown</h3>
              <FitBar label="GPA" value={selectedTile.gpaFit} yours={gpa.toFixed(2)} theirs={selectedTile.college.avgGPA.toFixed(2)} />
              <FitBar label={act > 0 ? 'Best Test' : 'SAT'} value={selectedTile.satFit} yours={String(bestSAT)} theirs={`${selectedTile.college.satRange[0]}-${selectedTile.college.satRange[1]}`} />
            </div>

            <div className="px-5 mt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Known For</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedTile.college.strengths.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-accent/5 border border-accent/10 text-accent font-medium">{s}</span>
                ))}
              </div>
            </div>

            <div className="px-5 mt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {selectedTile.tier === 'reach' ? 'How to Improve Your Chances' : selectedTile.tier === 'match' ? 'Strategy Tips' : 'Why This Is a Great Fit'}
              </h3>
              <div className="space-y-2">
                {generateAdvice(selectedTile, gpa, bestSAT).map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      selectedTile.tier === 'reach' ? 'bg-blue-50 text-blue-600' : selectedTile.tier === 'match' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedTile.tier === 'reach' && (
              <SimilarHotSchools currentCollege={selectedTile.college} tiles={tiles} onSelect={setSelectedTile} onAdd={addToTracker} />
            )}

            <div className="p-5 mt-2 border-t border-slate-100 flex items-center gap-3">
              {selectedTile.isSaved ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  On Your List
                </span>
              ) : (
                <button onClick={() => addToTracker(selectedTile.college)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add to Tracker
                </button>
              )}
              <button onClick={() => { setSelectedTile(null); setViewMode('list'); }} className="text-xs font-semibold text-accent hover:underline ml-auto">
                View in List &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ──────────────────────── FIT BAR ──────────────────────── */

function FitBar({ label, value, yours, theirs }: { label: string; value: number; yours: string; theirs: string }) {
  const pct = Math.round((value + 1) * 50);
  const barColor = value >= 0.2 ? 'bg-emerald-500' : value >= -0.2 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-400">You: <span className="font-semibold text-primary">{yours}</span> &middot; Them: {theirs}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
        <div className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${barColor}`} style={{ left: pct < 50 ? `${pct}%` : '50%', width: `${Math.abs(pct - 50)}%` }} />
      </div>
    </div>
  );
}

/* ──────────────────────── SIMILAR HOT SCHOOLS ──────────────────────── */

function SimilarHotSchools({ currentCollege, tiles, onSelect, onAdd }: { currentCollege: College; tiles: HeatmapTile[]; onSelect: (t: HeatmapTile) => void; onAdd: (c: College) => void }) {
  const similar = useMemo(() => {
    const currentStrengths = new Set(currentCollege.strengths.map(s => s.toLowerCase().replace(/\s*\(.*\)/, '')));
    return tiles
      .filter(t => t.college.id !== currentCollege.id && (t.tier === 'safety' || t.tier === 'match'))
      .map(t => ({ ...t, overlap: t.college.strengths.filter(s => currentStrengths.has(s.toLowerCase().replace(/\s*\(.*\)/, ''))).length }))
      .filter(t => t.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.overallFit - a.overallFit)
      .slice(0, 4);
  }, [currentCollege, tiles]);

  if (similar.length === 0) return null;

  return (
    <div className="px-5 mt-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Similar Schools in the Hot Zone</h3>
      <p className="text-xs text-slate-400 mb-3">Strong matches with similar programs to {currentCollege.name}</p>
      <div className="space-y-2">
        {similar.map(s => (
          <div key={s.college.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-accent/20 hover:bg-accent/5 transition-all cursor-pointer" onClick={() => onSelect(s)}>
            <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: getTempColor(s.overallFit) }}>{s.overallFit}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{s.college.name}</p>
              <p className="text-[10px] text-slate-400">{s.overlap} shared program{s.overlap > 1 ? 's' : ''} &middot; {s.college.acceptanceRate}% accept</p>
            </div>
            {!s.isSaved && (
              <button onClick={e => { e.stopPropagation(); onAdd(s.college); }} className="shrink-0 text-[10px] font-semibold text-accent hover:underline">+ Add</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── LIST FIT BAR ──────────────────────── */

function ListFitBar({ label, value, studentVal, schoolVal }: { label: string; value: number; studentVal: string; schoolVal: string }) {
  const pct = Math.round((value + 1) * 50);
  const barColor = value >= 0.2 ? 'bg-emerald-500' : value >= -0.2 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-400">You: <span className="font-semibold text-primary">{studentVal}</span> &middot; School: {schoolVal}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
        <div className={`absolute top-0 bottom-0 rounded-full transition-all ${barColor}`} style={{ left: pct < 50 ? `${pct}%` : '50%', width: `${Math.abs(pct - 50)}%` }} />
      </div>
    </div>
  );
}
