// Design.jsx
import React from "react";

const Design = ({ designRef, selectedTeam, teamColors, villaBorderColor, getCelticTextStyle, name, gap, nameSliderValue, teamGap, teamSliderValue }) => (
  <div ref={designRef} className="design">
    <div className="column column-1">
      <h2 className="do-not" style={{ color: '#FFFFFF' }}>DO NOT</h2>
      <div
        className={`red-box ${
          selectedTeam === "LEEDS" ? "multi-colored-rectangle" : ""
        }`}
        style={{
          backgroundColor:
            selectedTeam !== "LEEDS" && selectedTeam !== "CELTIC"
              ? teamColors[selectedTeam]
              : undefined,
          backgroundImage:
            selectedTeam === "CELTIC"
              ? "repeating-linear-gradient(90deg, #018749, #018749 70px, #FFFFFF 70px, #FFFFFF 140px)"
              : undefined,
          border:
            selectedTeam === "VILLA"
              ? `3px solid ${villaBorderColor}`
              : undefined,
        }}
      ></div>
      <h2 className="disturb" style={{ color: '#FFFFFF' }}>DISTURB</h2>
    </div>
    <div className="column column-2">
      <h2
        className="name"
        style={{
          paddingBottom: `${gap}px`,
          fontSize: `${nameSliderValue}px`,
          color: '#FFFFFF', // Set name color to white
        }}
      >
        {name}
      </h2>
      <h2 className="watching" style={{ color: '#FFFFFF' }}>WATCHING</h2>
      <h2
        className={`team ${
          selectedTeam === "LEEDS" ? "multi-colored-text" : ""
        }`}
        style={{
          paddingTop: `${teamGap}px`,
          fontSize: `${teamSliderValue}px`,
          color:
            selectedTeam === "CELTIC"
              ? undefined
              : teamColors[selectedTeam],
          textShadow:
            selectedTeam === "VILLA"
              ? `-3px -3px 0 ${villaBorderColor}, 3px -3px 0 ${villaBorderColor}, -3px 3px 0 ${villaBorderColor}, 3px 3px 0 ${villaBorderColor}`
              : undefined,
        }}
      >
        {selectedTeam === "CELTIC"
          ? selectedTeam.split("").map((char, index) => (
              <span
                key={index}
                style={getCelticTextStyle(selectedTeam)[index]}
              >
                {char}
              </span>
            ))
          : selectedTeam}
      </h2>
    </div>
  </div>
);

export default Design;
