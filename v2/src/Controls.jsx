import { FONTS } from "./fonts";
import { TEAMS } from "./teams";

function Slider({ label, value, onChange, min, max, step, format }) {
  return (
    <label className="control">
      <span className="control-label">
        {label}
        <em>{format ? format(value) : value}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

const percent = (v) => `${Math.round(v * 100)}%`;
const px = (v) => `${Math.round(v)}px`;

export default function Controls({ state, set, onReset, onExportPng, onExportSvg, busy }) {
  const font = FONTS.find((f) => f.id === state.fontID);

  return (
    <div className="controls">
      <label className="control">
        <span className="control-label">Name</span>
        <input
          type="text"
          className="text-input"
          value={state.name}
          placeholder="JOHN'S"
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>

      <label className="control">
        <span className="control-label">Team</span>
        <select
          className="select-input"
          value={state.teamID}
          onChange={(e) => set({ teamID: e.target.value })}
        >
          {TEAMS.map((team) => (
            <option key={team.id} value={team.id}>
              {team.id}
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span className="control-label">Typeface</span>
        <select
          className="select-input"
          value={state.fontID}
          onChange={(e) => set({ fontID: e.target.value })}
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {font && <span className="hint">{font.note}</span>}
      </label>

      <hr />

      <p className="section-note">
        Sizes are worked out automatically from the real width of the text.
        These only nudge them.
      </p>

      <Slider
        label="Name size"
        value={state.nameScale}
        onChange={(nameScale) => set({ nameScale })}
        min={0.5}
        max={1.5}
        step={0.01}
        format={percent}
      />
      <Slider
        label="Team size"
        value={state.teamScale}
        onChange={(teamScale) => set({ teamScale })}
        min={0.5}
        max={1.5}
        step={0.01}
        format={percent}
      />
      <Slider
        label="Name gap"
        value={state.nameGap}
        onChange={(nameGap) => set({ nameGap })}
        min={-120}
        max={200}
        step={1}
        format={px}
      />
      <Slider
        label="Team gap"
        value={state.teamGap}
        onChange={(teamGap) => set({ teamGap })}
        min={-120}
        max={200}
        step={1}
        format={px}
      />
      <Slider
        label="Bar height"
        value={state.barHeight}
        onChange={(barHeight) => set({ barHeight })}
        min={30}
        max={240}
        step={1}
        format={px}
      />

      <hr />

      <label className="checkbox">
        <input
          type="checkbox"
          checked={state.showMark}
          onChange={(e) => set({ showMark: e.target.checked })}
        />
        <span>Show 4-7 mark</span>
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={state.checkerboard}
          onChange={(e) => set({ checkerboard: e.target.checked })}
        />
        <span>Show transparency</span>
      </label>

      <hr />

      <div className="buttons">
        <button className="primary" onClick={onExportPng} disabled={busy}>
          {busy ? "Saving…" : "Save PNG"}
        </button>
        <button onClick={onExportSvg} disabled={busy}>
          Save SVG
        </button>
        <button className="ghost" onClick={onReset} disabled={busy}>
          Reset
        </button>
      </div>
    </div>
  );
}
