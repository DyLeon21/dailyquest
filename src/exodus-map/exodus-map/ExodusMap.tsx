import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import './ExodusMap.css';
import { resolveAnimation } from './config';
import { MapEngine } from './engine/MapEngine';
import { STATIONS } from './stations';
import type { ExodusMapHandle, ExodusMapProps, StationId, StationInfo, StationStatus } from './types';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const CheckIcon = () => (
  <svg className="exodus-marker__check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5.5 12.8l4.2 4.2L18.5 7.4" pathLength={1} />
  </svg>
);

/**
 * Interaktive 3D-Abenteuerkarte "Der Auszug aus Ägypten".
 *
 * - Fester isometrischer Blickwinkel, die Kamera gleitet per Wischen/Scrollen entlang der Karte.
 * - Sechs Marker (HTML-Buttons, barrierefrei): Nummer oder grünes Häkchen.
 * - Fortschritt kommt von außen über `completed`; Klicks melden `onStationSelect`.
 */
export const ExodusMap = forwardRef<ExodusMapHandle, ExodusMapProps>(function ExodusMap(props, ref) {
  const {
    completed,
    current,
    selected,
    initialStation,
    onStationSelect,
    animation,
    quality = 'auto',
    showLabels = true,
    paused = false,
    className,
    style,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const slotRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [internalSelected, setInternalSelected] = useState<StationId | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const doneSet = useMemo(() => new Set(completed ?? []), [completed]);
  const nextOpen = useMemo(() => STATIONS.find((s) => !doneSet.has(s.id))?.id ?? null, [doneSet]);
  const currentId: StationId | null = current === undefined ? nextOpen : current;
  const selectedId = selected !== undefined ? selected : internalSelected;

  const animKey = JSON.stringify(animation ?? {}) + String(reducedMotion);
  const latest = useRef({ animation, reducedMotion, currentId, initial: initialStation ?? currentId ?? 1 });
  latest.current = { animation, reducedMotion, currentId, initial: initialStation ?? currentId ?? 1 };

  // Engine erzeugen (einmal je Qualitätsstufe). Zwei rAFs: erst malen, dann den kurzen Aufbau starten.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    let cancelled = false;
    let engine: MapEngine | null = null;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          const l = latest.current;
          engine = new MapEngine({
            container,
            canvas,
            quality,
            animation: resolveAnimation(l.animation, l.reducedMotion),
            initialStation: l.initial,
          });
          engine.setMarkerElements(slotRefs.current);
          engine.setCurrent(l.currentId);
          engineRef.current = engine;
          setReady(true);
        } catch (err) {
          console.error('[ExodusMap] 3D-Karte konnte nicht gestartet werden:', err);
          setFailed(true);
        }
      }),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      engine?.dispose();
      engineRef.current = null;
      setReady(false);
    };
  }, [quality]);

  useEffect(() => {
    engineRef.current?.anim.replace(resolveAnimation(latest.current.animation, latest.current.reducedMotion));
  }, [animKey, ready]);

  useEffect(() => {
    engineRef.current?.setCurrent(currentId);
  }, [currentId, ready]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused, ready]);

  // Von außen gesetzte Auswahl → Kamera fährt hin
  useEffect(() => {
    if (selected != null) engineRef.current?.focusStation(selected);
  }, [selected, ready]);

  useImperativeHandle(
    ref,
    () => ({
      focusStation: (id, opts) => engineRef.current?.focusStation(id, opts?.instant),
      setAnimation: (p) => engineRef.current?.setAnimation(p),
      getAnimation: () => engineRef.current?.getAnimation() ?? resolveAnimation(),
      getStats: () => {
        const i = engineRef.current?.info();
        return i
          ? {
              drawCalls: i.drawCalls,
              triangles: i.triangles,
              geometries: i.geometries,
              pixelRatio: i.dpr,
              cameraZ: i.cameraZ,
              shadows: i.shadows,
            }
          : null;
      },
      setCameraZ: (z) => engineRef.current?.setCameraZ(z),
    }),
    [],
  );

  const select = useCallback(
    (info: StationInfo) => {
      setInternalSelected(info.id);
      engineRef.current?.focusStation(info.id);
      onStationSelect?.(info);
    },
    [onStationSelect],
  );

  const statusOf = (id: StationId): StationStatus => (doneSet.has(id) ? 'done' : id === currentId ? 'current' : 'open');

  const label = (s: StationInfo, st: StationStatus) =>
    `Station ${s.id}: ${s.title}, ${s.reference}. ${st === 'done' ? 'Abgeschlossen' : st === 'current' ? 'Als Nächstes dran' : 'Noch offen'}`;

  const markers = (
    <ol className="exodus-markers" aria-label="Stationen der Karte">
      {STATIONS.map((s, i) => {
        const st = statusOf(s.id);
        const isSel = selectedId === s.id;
        return (
          <li
            key={s.id}
            className="exodus-marker"
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
          >
            <button
              type="button"
              className="exodus-marker__btn"
              data-status={st}
              data-selected={isSel}
              aria-label={label(s, st)}
              aria-current={st === 'current' ? 'step' : undefined}
              onClick={() => select(s)}
              onFocus={(e) => {
                const slot = e.currentTarget.parentElement;
                if (slot?.dataset.offscreen === 'true') engineRef.current?.focusStation(s.id);
              }}
            >
              <span className="exodus-marker__pin">
                <span className="exodus-marker__num">{s.id}</span>
                <CheckIcon />
              </span>
            </button>
            {showLabels && (
              <span className="exodus-marker__label" data-visible={isSel} aria-hidden="true">
                {s.short}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );

  if (failed) {
    return (
      <div className={`exodus-map exodus-map--fallback ${className ?? ''}`} style={style}>
        <p className="exodus-fallback__msg">Die 3D-Karte lässt sich auf diesem Gerät nicht anzeigen. Du kannst die Stationen trotzdem direkt öffnen:</p>
        <ol className="exodus-fallback__list">
          {STATIONS.map((s) => {
            const st = statusOf(s.id);
            return (
              <li key={s.id}>
                <button type="button" className="exodus-marker__btn exodus-marker__btn--static" data-status={st} aria-label={label(s, st)} onClick={() => select(s)}>
                  <span className="exodus-marker__pin">
                    <span className="exodus-marker__num">{s.id}</span>
                    <CheckIcon />
                  </span>
                </button>
                <span className="exodus-fallback__title">
                  {s.title}
                  <small>{s.reference}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`exodus-map ${className ?? ''}`}
      style={style}
      data-ready={ready}
      data-pulse={resolveAnimation(animation, reducedMotion).markers.enabled}
    >
      <canvas ref={canvasRef} className="exodus-map__canvas" aria-hidden="true" />
      {markers}
      <div className="exodus-map__loading" aria-live="polite" data-hidden={ready}>
        <span>Karte wird aufgebaut</span>
      </div>
    </div>
  );
});
