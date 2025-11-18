import React, { useRef, useState } from "react";
import "./App.css";
import { useAppLogic } from "./utils/func";
import Design from "./components/Design";
import Form from "./components/Form";

function App() {
  const {
    name,
    inputValue,
    setInputValue,
    fontSizeInput,
    setFontSizeInput,
    gap,
    teamGap,
    selectedTeam,
    teamSliderValue,
    nameSliderValue,
    teams,
    teamColors,
    villaBorderColor,
    hammersStrokeColor,
    watfordStrokeColor,
    handleSubmit,
    handleNameSliderChange,
    handleTeamSliderChange,
    handleGapChange,
    handleTeamGapChange,
    handleDropdownChange,
    saveAsPng,
    getCelticTextStyle,
  } = useAppLogic();

  const designRef = useRef(null);
  const [showOutline, setShowOutline] = useState(false);

  return (
    <div className="full-width-container">
      <header className="app-header">Sock Print File Maker</header>
      <div className="inner-container">
        <Design
          designRef={designRef}
          selectedTeam={selectedTeam}
          teamColors={teamColors}
          villaBorderColor={villaBorderColor}
          hammersStrokeColor={hammersStrokeColor}
          watfordStrokeColor={watfordStrokeColor}
          getCelticTextStyle={getCelticTextStyle}
          name={name}
          gap={gap}
          nameSliderValue={nameSliderValue}
          teamGap={teamGap}
          teamSliderValue={teamSliderValue}
          showOutline={showOutline}
        />
        <div className="form-sliders-column">
          <Form
            inputValue={inputValue}
            setInputValue={setInputValue}
            fontSizeInput={fontSizeInput}
            setFontSizeInput={setFontSizeInput}
            nameSliderValue={nameSliderValue}
            handleNameSliderChange={handleNameSliderChange}
            gap={gap}
            handleGapChange={handleGapChange}
            teamSliderValue={teamSliderValue}
            handleTeamSliderChange={handleTeamSliderChange}
            teamGap={teamGap}
            handleTeamGapChange={handleTeamGapChange}
            selectedTeam={selectedTeam}
            handleDropdownChange={handleDropdownChange}
            teams={teams}
            handleSubmit={handleSubmit}
            setShowOutline={setShowOutline}
          />
        </div>
        <button
          className="form-button"
          onClick={() => saveAsPng(designRef, name, selectedTeam)}
        >
          Save as PNG
        </button>
      </div>
    </div>
  );
}

export default App;
