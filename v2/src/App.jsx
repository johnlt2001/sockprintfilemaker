import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import Controls from "./Controls";
import Design from "./Design";
import { DEFAULT_FONT } from "./fonts";
import { DEFAULT_TEAM } from "./teams";
import { buildLayout } from "./layout";
import { ensureFontReady } from "./measure";
import { exportPng, exportSvg, safeFileName } from "./exportPng";

const INITIAL = {
  name: "",
  teamID: DEFAULT_TEAM,
  fontID: DEFAULT_FONT,
  nameScale: 1,
  teamScale: 1,
  nameGap: 0,
  teamGap: 0,
  barHeight: 96,
  showMark: false,
  checkerboard: false,
};

export default function App() {
  const [state, setState] = useState(INITIAL);
  const [fontReady, setFontReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const svgRef = useRef(null);
  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  // Nothing is measured until the chosen face has actually loaded — measuring
  // early would quietly return the fallback font's metrics.
  useEffect(() => {
    let alive = true;
    setFontReady(false);
    ensureFontReady(state.fontID).then(() => {
      if (alive) setFontReady(true);
    });
    return () => {
      alive = false;
    };
  }, [state.fontID]);

  const layout = useMemo(() => {
    if (!fontReady) return null;
    return buildLayout({
      name: state.name,
      teamID: state.teamID,
      family: state.fontID,
      nameScale: state.nameScale,
      teamScale: state.teamScale,
      nameGap: state.nameGap,
      teamGap: state.teamGap,
      barHeight: state.barHeight,
      showMark: state.showMark,
    });
  }, [
    fontReady,
    state.name,
    state.teamID,
    state.fontID,
    state.nameScale,
    state.teamScale,
    state.nameGap,
    state.teamGap,
    state.barHeight,
    state.showMark,
  ]);

  const displayName = state.name.trim().toUpperCase() || "NAME'S";

  const run = async (job) => {
    setBusy(true);
    setError(null);
    try {
      await job();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handlePng = () =>
    run(() =>
      exportPng(svgRef.current, {
        fileName: safeFileName(displayName, state.teamID, "png"),
        familyID: state.fontID,
        scale: 2,
      })
    );

  const handleSvg = () =>
    run(() =>
      exportSvg(svgRef.current, {
        fileName: safeFileName(displayName, state.teamID, "svg"),
        familyID: state.fontID,
      })
    );

  // Reported back so it is obvious the sizing responded to the text.
  const sizes = useMemo(() => {
    if (!layout) return null;
    const texts = layout.items.filter((i) => i.kind === "text");
    const name = texts[texts.length - 3];
    const team = texts[texts.length - 1];
    return {
      name: Math.round(name?.size || 0),
      team: Math.round(team?.size || 0),
    };
  }, [layout]);

  return (
    <div className="app">
      <header className="header">
        <h1>Sock Print File Maker</h1>
        <p>Type a name, pick a team. Everything sizes itself.</p>
      </header>

      <main className="main">
        <section
          className={`stage${state.checkerboard ? " stage-checkered" : ""}`}
        >
          {layout ? (
            <Design
              ref={svgRef}
              layout={layout}
              family={state.fontID}
              className="artwork"
            />
          ) : (
            <p className="loading">Loading typeface…</p>
          )}
        </section>

        <aside className="panel">
          <Controls
            state={state}
            set={set}
            onReset={() => setState(INITIAL)}
            onExportPng={handlePng}
            onExportSvg={handleSvg}
            busy={busy}
          />
          {sizes && (
            <p className="readout">
              Auto-fitted — name {sizes.name}px, team {sizes.team}px
            </p>
          )}
          {error && <p className="error">{error}</p>}
        </aside>
      </main>
    </div>
  );
}
