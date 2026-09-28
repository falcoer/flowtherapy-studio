import { useEffect, useRef, useState, type PointerEvent } from "react";
import { GraphicEngine } from "./engine.js";
import { clamp, snapAnchor, type Project, type Guide } from "./model.js";
export type Selection = { type: "anchor" | "renderer"; id: string } | null;
type Props = {
  project: Project;
  selection: Selection;
  select: (s: Selection) => void;
  mode: "select" | "anchor";
  magnet: boolean;
  guidesVisible: boolean;
  playing: boolean;
  time: number;
  change: (p: Project, history?: boolean) => void;
  finishDrag: (before: Project) => void;
  addAnchor: (x: number, y: number) => void;
  drop: (preset: string, renderer: string, x: number, y: number) => void;
  onError: (message: string) => void;
  onTime: (time: number) => void;
};
export function Stage(props: Props) {
  const { project: p, selection, mode, magnet, guidesVisible } = props;
  const canvas = useRef<HTMLCanvasElement>(null),
    svg = useRef<SVGSVGElement>(null);
  const engine = useRef<GraphicEngine | null>(null),
    latest = useRef(props);
  latest.current = props;
  const prepared = useRef<Project | null>(null),
    [ready, setReady] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]),
    [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    type: "anchor" | "renderer";
    id: string;
    before: Project;
    start: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    try {
      engine.current = new GraphicEngine(canvas.current!);
      setReady(true);
    } catch (e) {
      latest.current.onError(String(e));
    }
    const element = canvas.current!;
    const lost = (e: Event) => {
      e.preventDefault();
      latest.current.onError(
        "Contexte WebGL perdu. Rechargez la page pour reprendre la sauvegarde locale.",
      );
    };
    element.addEventListener("webglcontextlost", lost);
    return () => {
      element.removeEventListener("webglcontextlost", lost);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (engine.current)
      void engine.current
        .prepare(p)
        .then(() => {
          if (active) prepared.current = p;
        })
        .catch((e) => {
          if (active) {
            prepared.current = null;
            props.onError(String(e));
          }
        });
    return () => {
      active = false;
    };
  }, [p, ready]);
  useEffect(() => {
    if (!ready) return;
    let raf = 0,
      start = performance.now(),
      initial = latest.current.time,
      lastReport = 0,
      lastDraw = "";
    const draw = (now: number) => {
      const current = latest.current,
        doc = prepared.current;
      const time = current.playing
        ? (initial + (now - start) / 1000) % current.project.duration
        : current.time;
      if (doc && engine.current) {
        try {
          const scale = Math.min(
            1,
            1400 / doc.surface.width,
            1400 / doc.surface.height,
          );
          const signature = `${time}:${doc === current.project}`;
          if (
            current.playing ||
            signature !== lastDraw ||
            doc !== lastProject
          ) {
            engine.current.render(
              doc,
              time,
              Math.round(doc.surface.width * scale),
              Math.round(doc.surface.height * scale),
            );
            lastDraw = signature;
            lastProject = doc;
          }
          if (current.playing && now - lastReport > 100) {
            current.onTime(time);
            lastReport = now;
          }
        } catch (e) {
          current.onError(String(e));
          return;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    let lastProject: Project | null = null;
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ready, props.playing]);
  function point(clientX: number, clientY: number) {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: clamp((clientX - r.left) / r.width, 0, 1),
      y: clamp((clientY - r.top) / r.height, 0, 1),
    };
  }
  function snap(pt: { x: number; y: number }, exclude?: string) {
    const r = svg.current!.getBoundingClientRect();
    return magnet
      ? snapAnchor(
          pt,
          p.anchors.filter((a) => a.id !== exclude),
          { x: 9 / r.width, y: 9 / r.height },
        )
      : { ...pt, guides: [] };
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const target = e.target as SVGElement,
      pt = point(e.clientX, e.clientY);
    const anchorId = target
      .closest("[data-anchor]")
      ?.getAttribute("data-anchor");
    if (mode === "anchor" && !anchorId) {
      const s = snap(pt);
      props.addAnchor(s.x, s.y);
      setGhost(null);
      return;
    }
    const rendererId = target
      .closest("[data-renderer]")
      ?.getAttribute("data-renderer");
    const id = anchorId ?? rendererId;
    if (!id) {
      props.select(null);
      return;
    }
    const type = anchorId ? "anchor" : "renderer";
    props.select({ type, id });
    drag.current = { type, id, before: p, start: pt, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const pt = point(e.clientX, e.clientY),
      d = drag.current;
    if (!d) {
      if (mode === "anchor") {
        const s = snap(pt);
        setGuides(s.guides);
        setGhost(s);
      }
      return;
    }
    d.moved = true;
    if (d.type === "anchor") {
      const original = d.before.anchors.find((a) => a.id === d.id)!;
      const s = snap(
        { x: original.x + pt.x - d.start.x, y: original.y + pt.y - d.start.y },
        d.id,
      );
      setGuides(s.guides);
      props.change(
        {
          ...p,
          anchors: p.anchors.map((a) =>
            a.id === d.id ? { ...a, x: s.x, y: s.y } : a,
          ),
        },
        false,
      );
    } else {
      const original = d.before.renderers.find((r) => r.id === d.id)!;
      props.change(
        {
          ...p,
          renderers: p.renderers.map((r) =>
            r.id === d.id
              ? {
                  ...r,
                  offsetX: clamp(
                    original.offsetX + (pt.x - d.start.x) * p.surface.width,
                    -12000,
                    12000,
                  ),
                  offsetY: clamp(
                    original.offsetY + (pt.y - d.start.y) * p.surface.height,
                    -12000,
                    12000,
                  ),
                }
              : r,
          ),
        },
        false,
      );
    }
  }
  function finish() {
    if (drag.current?.moved) props.finishDrag(drag.current.before);
    drag.current = null;
    setGuides([]);
  }
  const selectedRenderer =
    selection?.type === "renderer"
      ? p.renderers.find((r) => r.id === selection.id)
      : undefined;
  return (
    <div
      className="gx-stage"
      style={{ aspectRatio: `${p.surface.width}/${p.surface.height}` }}
    >
      <canvas ref={canvas} aria-label="Composition WebGL" />
      <svg
        ref={svg}
        className={mode === "anchor" ? "gx-anchor-mode" : ""}
        viewBox={`0 0 ${p.surface.width} ${p.surface.height}`}
        aria-label="Surface de composition"
        role="application"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onPointerLeave={() => {
          if (!drag.current) {
            setGuides([]);
            setGhost(null);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          const pt = point(e.clientX, e.clientY);
          setGhost(pt);
        }}
        onDragLeave={() => setGhost(null)}
        onDrop={(e) => {
          e.preventDefault();
          const pt = point(e.clientX, e.clientY);
          props.drop(
            e.dataTransfer.getData("ft-preset"),
            e.dataTransfer.getData("ft-renderer"),
            pt.x,
            pt.y,
          );
          setGhost(null);
        }}
      >
        {[...p.renderers]
          .sort((a, b) => a.z - b.z)
          .map((r) => {
            const a = p.anchors.find((a) => a.id === r.anchorId)!;
            const x = a.x * p.surface.width + r.offsetX,
              y = a.y * p.surface.height + r.offsetY;
            return (
              <rect
                key={r.id}
                data-renderer={r.id}
                x={x - r.width / 2}
                y={y - r.height / 2}
                width={r.width}
                height={r.height}
                transform={`rotate(${r.rotation} ${x} ${y})`}
                fill="transparent"
                stroke={selectedRenderer?.id === r.id ? "#bca7ff" : "none"}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                className="gx-renderer-hit"
              />
            );
          })}
        {guidesVisible && (
          <>
            {guides.map((g, i) =>
              g.kind === "midpoint" ? (
                <g key={i} className="gx-snap">
                  <line
                    x1={g.from!.x * p.surface.width}
                    y1={g.from!.y * p.surface.height}
                    x2={g.to!.x * p.surface.width}
                    y2={g.to!.y * p.surface.height}
                  />
                  <circle
                    cx={g.x * p.surface.width}
                    cy={g.y * p.surface.height}
                    r={p.surface.width * 0.013}
                  />
                  <text
                    x={g.x * p.surface.width + 25}
                    y={g.y * p.surface.height - 25}
                    fontSize={p.surface.width * 0.026}
                  >
                    ½ · ½
                  </text>
                </g>
              ) : (
                <line
                  key={i}
                  className="gx-snap"
                  x1={g.kind === "x" ? g.x * p.surface.width : 0}
                  y1={g.kind === "y" ? g.y * p.surface.height : 0}
                  x2={g.kind === "x" ? g.x * p.surface.width : p.surface.width}
                  y2={
                    g.kind === "y" ? g.y * p.surface.height : p.surface.height
                  }
                />
              ),
            )}
            {p.anchors.map((a, i) => (
              <g
                key={a.id}
                data-anchor={a.id}
                className={`gx-anchor ${selection?.id === a.id || selectedRenderer?.anchorId === a.id ? "is-selected" : ""}`}
                transform={`translate(${a.x * p.surface.width} ${a.y * p.surface.height})`}
              >
                <circle
                  r={p.surface.width * 0.019}
                  fill="transparent"
                  stroke="none"
                />
                <circle r={p.surface.width * 0.009} />
                <path
                  d={`M ${-p.surface.width * 0.014} 0 H ${p.surface.width * 0.014} M 0 ${-p.surface.width * 0.014} V ${p.surface.width * 0.014}`}
                />
                <text
                  x={p.surface.width * 0.019}
                  y={-p.surface.width * 0.018}
                  fontSize={p.surface.width * 0.023}
                >
                  {String(i + 1).padStart(2, "0")}
                </text>
              </g>
            ))}
            {ghost && (
              <circle
                className="gx-ghost"
                cx={ghost.x * p.surface.width}
                cy={ghost.y * p.surface.height}
                r={p.surface.width * 0.016}
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
}
