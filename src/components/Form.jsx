// Form.jsx
import React from "react";
import './Form.css'; // Import the CSS file for styling

const Form = ({
  inputValue,
  setInputValue,
  fontSizeInput,
  setFontSizeInput,
  nameSliderValue,
  handleNameSliderChange,
  gap,
  handleGapChange,
  teamSliderValue,
  handleTeamSliderChange,
  teamGap,
  handleTeamGapChange,
  selectedTeam,
  handleDropdownChange,
  teams,
  handleSubmit,
}) => (
  <form onSubmit={handleSubmit} className="styled-form">
    <div className="form-group">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter name"
        className="form-input"
      />
    </div>
    <div className="form-group">
      <input
        type="text"
        value={fontSizeInput}
        onChange={(e) => setFontSizeInput(e.target.value)}
        placeholder="Enter font size (e.g., 24)"
        className="form-input"
      />
    </div>
    <div className="form-group">
      <label htmlFor="nameFontSizeSlider">
        Name Font Size: {nameSliderValue}px
      </label>
      <input
        id="nameFontSizeSlider"
        type="range"
        min={nameSliderValue - 20}
        max={nameSliderValue + 20}
        step="1"
        value={nameSliderValue}
        onChange={handleNameSliderChange}
        className="form-slider"
      />
    </div>
    <div className="form-group">
      <label htmlFor="gapSlider">Name Gap: {gap}px</label>
      <input
        id="gapSlider"
        type="range"
        min="-20"
        max="50"
        step="1"
        value={gap}
        onChange={handleGapChange}
        className="form-slider"
      />
    </div>
    <div className="form-group">
      <label htmlFor="teamFontSizeSlider">
        Team Font Size: {teamSliderValue}px
      </label>
      <input
        id="teamFontSizeSlider"
        type="range"
        min={teamSliderValue - 20}
        max={teamSliderValue + 50}
        step="1"
        value={teamSliderValue}
        onChange={handleTeamSliderChange}
        className="form-slider"
      />
    </div>
    <div className="form-group">
      <label htmlFor="teamGapSlider">Team Gap: {teamGap}px</label>
      <input
        id="teamGapSlider"
        type="range"
        min="-20"
        max="50"
        step="1"
        value={teamGap}
        onChange={handleTeamGapChange}
        className="form-slider"
      />
    </div>
    <div className="form-group">
      <label htmlFor="teamDropdown">Select Team:</label>
      <select
        id="teamDropdown"
        onChange={handleDropdownChange}
        value={selectedTeam}
        className="form-select"
      >
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
    <button type="submit" className="form-button">Submit</button>
  </form>
);

export default Form;
