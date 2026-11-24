import { useEffect, useState } from "react";
import { FONTS } from "./fonts";
import { TEAMS, teamByID } from "./teams";

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

function ColorField({ label, value, onChange }) {
  // The hex box keeps its own draft so half-typed values are allowed.
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <label className="control">
      <span className="control-label">
        {label}
        <em>{value.toUpperCase()}</em>
      </span>
      <div className="color-row">
        <input
          type="color"
          className="color-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="text-input"
          value={draft}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toUpperCase());
          }}
        />
      </div>
    </label>
  );
}

const percent = (v) => `${Math.round(v * 100)}%`;
const px = (v) => `${Math.round(v)}px`;

export default function Controls({ state, set, onReset, onExportPng, busy }) {
  const font = FONTS.find((f) => f.id === state.fontID);

  // Opening the custom options starts from the selected team, so you only
  // change what you need to.
  const openCustom = () => {
    const team = teamByID(state.teamID);
    const solid = (c) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : null);
    set({
      custom: true,
      customName: state.customName || team.id,
      customTextColor: solid(team.textFill) || solid(team.color) || "#FFFFFF",
      customBarColor:
        solid(team.barFill) || solid(team.color) || "#DA291C",
    });
  };

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

      {!state.custom && (
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
      )}

      {state.custom ? (
        <div className="custom-panel">
          <label className="control">
            <span className="control-label">Team name</span>
            <input
              type="text"
              className="text-input"
              value={state.customName}
              placeholder="TEAM"
              onChange={(e) => set({ customName: e.target.value })}
            />
          </label>

          <ColorField
            label="Team name colour"
            value={state.customTextColor}
            onChange={(customTextColor) => set({ customTextColor })}
          />
          <ColorField
            label="Rectangle colour"
            value={state.customBarColor}
            onChange={(customBarColor) => set({ customBarColor })}
          />

          <button
            className="ghost wide"
            onClick={() => set({ custom: false })}
          >
            Back to team list
          </button>
        </div>
      ) : (
        <button className="big-button" onClick={openCustom}>
          + Custom team name &amp; colours
        </button>
      )}

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
        <button className="ghost" onClick={onReset} disabled={busy}>
          Reset
        </button>
      </div>
    </div>
  );
}
