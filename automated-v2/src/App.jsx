import { useState, useRef, useEffect, useCallback } from 'react';
import domtoimage from 'dom-to-image-more';
import './App.css';

const teams = [
  "ARSENAL", "BLACKPOOL", "BOURNEMOUTH", "BORO", "BRENTFORD", "BRIGHTON", "BURNLEY",
  "CELTIC", "CHELSEA", "CITY", "COVENTRY", "EVERTON", "FOREST", "HAMMERS", "IPSWICH",
  "LEEDS", "LEICESTER", "LIVERPOOL", "LUTON", "MILLWALL", "OXFORD", "PALACE",
  "PLYMOUTH", "RANGERS", "RHINOS", "SOUTHAMPTON", "SPURS", "SUNDERLAND", "UNITED",
  "VILLA", "WATFORD", "WEDNESDAY", "WEST BROM", "WOLVES",
];

const teamColors = {
  ARSENAL: "#EF0107", BLACKPOOL: "#F68712", BOURNEMOUTH: "#DA291C", BORO: "#DE1B22",
  BRENTFORD: "#D20000", BRIGHTON: "#0057B8", BURNLEY: "#6C1D45", CELTIC: "#DA291C",
  CHELSEA: "#034694", CITY: "#6CABDD", COVENTRY: "#059DD9", EVERTON: "#003399",
  FOREST: "#DD0000", HAMMERS: "#7A263A", IPSWICH: "#034289", LEEDS: "#DA291C",
  LEICESTER: "#003090", LIVERPOOL: "#c8102E", LUTON: "#F78F1E", MILLWALL: "#00194A",
  OXFORD: "#FCDC03", PALACE: "#1B458F", PLYMOUTH: "#1A401D", RANGERS: "#1B458F",
  RHINOS: "#DA291C", SOUTHAMPTON: "#d71920", SPURS: "#132257", SUNDERLAND: "#FD1220",
  UNITED: "#DA291C", VILLA: "#670e36", WATFORD: "#F8ED20", WEDNESDAY: "#0033A0",
  "WEST BROM": "#122F67", WOLVES: "#FDB913",
};

const multiColorTeams = ["LEEDS", "RHINOS"];
const specialBorderTeams = ["VILLA", "HAMMERS", "WATFORD"];

function getTeamTextClass(team) {
  if (team === "CELTIC") return "celtic-text";
  if (team === "WEDNESDAY") return "wednesday-text";
  if (multiColorTeams.includes(team)) return "multi-colored-text";
  return "";
}

function getTeamTextStyle(team) {
  const cls = getTeamTextClass(team);
  if (cls) return {};
  return { color: teamColors[team] || "#fff" };
}

function getRectStyle(team) {
  if (multiColorTeams.includes(team)) return {};
  const color = teamColors[team] || "#fff";
  const style = { backgroundColor: color };
  if (specialBorderTeams.includes(team)) {
    style.borderColor = color;
  }
  return style;
}

function getRectClass(team) {
  let cls = "color-rectangle";
  if (multiColorTeams.includes(team)) cls += " multi-colored-rectangle";
  if (specialBorderTeams.includes(team)) cls += " special-border-rect";
  return cls;
}

function useFlushText() {
  const watchingRef = useRef(null);
  const nameRef = useRef(null);
  const teamRef = useRef(null);
  const [nameFontSize, setNameFontSize] = useState(250);
  const [teamFontSize, setTeamFontSize] = useState(250);

  const measure = useCallback(() => {
    if (!watchingRef.current) return;
    const wWidth = watchingRef.current.getBoundingClientRect().width;
    if (wWidth === 0) return;

    if (nameRef.current) {
      const nameWidth = nameRef.current.getBoundingClientRect().width;
      if (nameWidth > 0) {
        const currentSize = parseFloat(window.getComputedStyle(nameRef.current).fontSize);
        const newSize = (wWidth / nameWidth) * currentSize;
        setNameFontSize(Math.min(newSize, 800));
      }
    }

    if (teamRef.current) {
      const teamWidth = teamRef.current.getBoundingClientRect().width;
      if (teamWidth > 0) {
        const currentSize = parseFloat(window.getComputedStyle(teamRef.current).fontSize);
        const newSize = (wWidth / teamWidth) * currentSize;
        setTeamFontSize(Math.min(newSize, 800));
      }
    }
  }, []);

  return { watchingRef, nameRef, teamRef, nameFontSize, teamFontSize, measure };
}

function App() {
  const [name, setName] = useState("JOHN");
  const [selectedTeam, setSelectedTeam] = useState("UNITED");
  const [nameGap, setNameGap] = useState(0);
  const [teamGap, setTeamGap] = useState(0);
  const [isBatching, setIsBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const designRef = useRef(null);

  const { watchingRef, nameRef, teamRef, nameFontSize, teamFontSize, measure } = useFlushText();

  // Re-measure on input changes — two-pass for convergence
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(() => measure());
    });
    return () => cancelAnimationFrame(id);
  }, [name, selectedTeam, measure]);

  const isHammers = selectedTeam === "HAMMERS";

  const saveAsPng = async (fileName) => {
    if (!designRef.current) return;
    const dataUrl = await domtoimage.toPng(designRef.current, {
      width: 1800,
      height: designRef.current.offsetHeight,
      style: { transform: 'none' },
      quality: 1,
    });
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const handleExport = () => saveAsPng(`${name}_${selectedTeam}.png`);

  const handleBatchExport = async () => {
    setIsBatching(true);
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      setBatchProgress(`Exporting ${i + 1}/${teams.length}: ${name}_${team}`);
      setSelectedTeam(team);
      await new Promise((r) => setTimeout(r, 300));
      await saveAsPng(`${name}_${team}.png`);
    }
    setBatchProgress("");
    setIsBatching(false);
  };

  const teamTextClass = getTeamTextClass(selectedTeam);
  const teamTextStyle = getTeamTextStyle(selectedTeam);
  const teamColor = teamColors[selectedTeam] || "#fff";

  return (
    <div className="app">
      {/* Controls */}
      <div className="controls">
        <h2>SOCK TEMPLATE V2</h2>

        <label>
          NAME
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
          />
        </label>

        <label>
          TEAM
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label>
          NAME GAP ({nameGap}px)
          <input
            type="range" min={-40} max={60} value={nameGap}
            onChange={(e) => setNameGap(Number(e.target.value))}
          />
        </label>

        <label>
          TEAM GAP ({teamGap}px)
          <input
            type="range" min={-40} max={60} value={teamGap}
            onChange={(e) => setTeamGap(Number(e.target.value))}
          />
        </label>

        <div style={{ borderTop: "1px solid #333", paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontFamily: "system-ui", color: "#666", marginBottom: 8 }}>
            Preview: <span style={{ color: teamColor }}>{selectedTeam}</span>
            <div style={{
              width: "100%", height: 20, marginTop: 6, borderRadius: 4,
              background: multiColorTeams.includes(selectedTeam)
                ? "linear-gradient(to right, #fbea02 33%, white 33%, white 66%, #0280bc 66%)"
                : teamColor
            }} />
          </div>
        </div>

        <button onClick={handleExport} disabled={isBatching}>EXPORT PNG</button>
        <button className="batch-btn" onClick={handleBatchExport} disabled={isBatching}>
          BATCH EXPORT ALL TEAMS
        </button>
        {batchProgress && <div className="batch-progress">{batchProgress}</div>}
      </div>

      {/* Preview */}
      <div className="preview-area">
        <div style={{ transform: "scale(0.55)", transformOrigin: "center center" }}>
          <div className="design-wrapper" ref={designRef}>
            {/* Left Column */}
            <div className="left-col">
              <div className="do-not-text">DO NOT</div>
              <div className={getRectClass(selectedTeam)} style={getRectStyle(selectedTeam)} />
              <div className="disturb-text">DISTURB</div>
            </div>

            {/* Right Column */}
            <div className="right-col">
              <div className="right-text-block">
                <div
                  ref={nameRef}
                  className="name-text"
                  style={{
                    fontSize: nameFontSize,
                    color: "#fff",
                    marginBottom: nameGap,
                  }}
                >
                  {name || "NAME"}
                </div>

                <div ref={watchingRef} className="watching-text">
                  WATCHING
                </div>

                <div className="team-text" style={{ marginTop: teamGap }}>
                  {isHammers ? (
                    <>
                      <div
                        className={`team-the ${teamTextClass}`}
                        style={{ fontSize: teamFontSize * 0.4, ...teamTextStyle }}
                      >
                        THE
                      </div>
                      <div
                        ref={teamRef}
                        className={`team-main-text ${teamTextClass}`}
                        style={{ fontSize: teamFontSize, ...teamTextStyle }}
                      >
                        HAMMERS
                      </div>
                    </>
                  ) : (
                    <div
                      ref={teamRef}
                      className={`team-main-text ${teamTextClass}`}
                      style={{ fontSize: teamFontSize, ...teamTextStyle }}
                    >
                      {selectedTeam}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
