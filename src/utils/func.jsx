// func.jsx
import domtoimage from "dom-to-image-more";
import { useState } from "react";

export const useAppLogic = () => {
  const [name, setName] = useState("NAME'S");
  const [inputValue, setInputValue] = useState("");
  const [letterCount, setLetterCount] = useState(0);
  const [fontSize, setFontSize] = useState(24);
  const [fontSizeInput, setFontSizeInput] = useState("");
  const [gap, setGap] = useState(10);
  const [teamGap, setTeamGap] = useState(10);
  const [selectedTeam, setSelectedTeam] = useState("LEEDS");
  const [teamFontSize, setTeamFontSize] = useState(24);
  const [nameSliderValue, setNameSliderValue] = useState(fontSize);
  const [teamSliderValue, setTeamSliderValue] = useState(teamFontSize);

  const teams = [
    "ARSENAL",
    "BORO",
    "BRENTFORD",
    "BURNLEY",
    "CELTIC",
    "CHELSEA",
    "CITY",
    "COVENTRY",
    "EVERTON",
    "LEEDS",
    "LEICESTER",
    "LIVERPOOL",
    "LUTON",
    "MILLWALL",
    "PALACE",
    "PLYMOUTH",
    "RANGERS",
    "RHINOS",
    "SOUTHAMPTON",
    "SUNDERLAND",
    "UNITED",
    "VILLA",
    "WEDNESDAY",
    "WEST BROM",
    "WOLVES",
  ];

  const teamColors = {
    ARSENAL: "#EF0107",
    BORO: "#DE1B22",
    BRENTFORD: "#D20000",
    BURNLEY: "#6C1D45",
    CELTIC: "#DA291C",
    CHELSEA: "#034694",
    CITY: "#6CABDD",
    COVENTRY: "#059DD9",
    EVERTON: "#003399",
    LEEDS: "#DA291C",
    LEICESTER: "#003090",
    LIVERPOOL: "#c8102E",
    LUTON: "#F78F1E",
    MILLWALL: "#00194A",
    PALACE: "#1B458F",
    PLYMOUTH: "#1A401D",
    RANGERS: "#1B458F",
    RHINOS: "#DA291C",
    SOUTHAMPTON: "#d71920",
    SUNDERLAND: "#FD1220",
    UNITED: "#DA291C",
    VILLA: "#670e36",
    WEDNESDAY: "#0033A0",
    "WEST BROM": "#122F67",
    WOLVES: "#FDB913",
  };

  const villaBorderColor = "#95bfe5";

  const getDefaultFontSize = (length) => {
    switch (length) {
      case 4:
        return 460;
      case 5:
        return 390;
      case 6:
        return 360;
      case 7:
        return 300;
      case 8:
        return 240;
      case 9:
        return 230;
      case 10:
        return 220;
      case 11:
        return 190;
      case 12:
        return 170;
      case 13:
        return 160;
      default:
        return 24;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setName(inputValue);
    setLetterCount(inputValue.length);
    setInputValue("");

    const newFontSize = fontSizeInput
      ? parseInt(fontSizeInput, 10)
      : getDefaultFontSize(inputValue.length);
    if (!isNaN(newFontSize)) {
      setFontSize(newFontSize);
      setNameSliderValue(newFontSize);
      document.documentElement.style.setProperty(
        "--name-font-size",
        `${newFontSize}px`
      );
    }

    const newTeamFontSize = getDefaultFontSize(selectedTeam.length);
    if (!isNaN(newTeamFontSize)) {
      setTeamFontSize(newTeamFontSize);
      setTeamSliderValue(newTeamFontSize);
      document.documentElement.style.setProperty(
        "--team-font-size",
        `${newTeamFontSize}px`
      );
    }
  };

  const handleNameSliderChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    if (
      !isNaN(newSize) &&
      newSize >= fontSize - 50 &&
      newSize <= fontSize + 50
    ) {
      setNameSliderValue(newSize);
      document.documentElement.style.setProperty(
        "--name-font-size",
        `${newSize}px`
      );
    }
  };

  const handleTeamSliderChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    if (
      !isNaN(newSize) &&
      newSize >= teamFontSize - 50 &&
      newSize <= teamFontSize + 50
    ) {
      setTeamSliderValue(newSize);
      document.documentElement.style.setProperty(
        "--team-font-size",
        `${newSize}px`
      );
    }
  };

  const handleGapChange = (e) => {
    const newGap = parseInt(e.target.value, 10);
    if (!isNaN(newGap)) {
      setGap(newGap);
    }
  };

  const handleTeamGapChange = (e) => {
    const newGap = parseInt(e.target.value, 10);
    if (!isNaN(newGap)) {
      setTeamGap(newGap);
    }
  };

  const handleDropdownChange = (e) => {
    setSelectedTeam(e.target.value);
    const newTeamFontSize = getDefaultFontSize(e.target.value.length);
    if (!isNaN(newTeamFontSize)) {
      setTeamFontSize(newTeamFontSize);
      setTeamSliderValue(newTeamFontSize);
      document.documentElement.style.setProperty(
        "--team-font-size",
        `${newTeamFontSize}px`
      );
    }
  };

  const saveAsPng = (designRef, name, selectedTeam) => {
    if (designRef.current) {
      const fileName = `${name}-${selectedTeam.replace(" ", "_")}-sock-print-file.png`;

      domtoimage
        .toPng(designRef.current, { scale: 1 })
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error("Error capturing image:", error);
        });
    }
  };

  const getCelticTextStyle = (text) => {
    const colors = ["#018749", "#FFFFFF"];
    return text.split("").map((char, index) => ({
      color: colors[index % colors.length],
    }));
  };

  return {
    name,
    setName,
    inputValue,
    setInputValue,
    fontSizeInput,
    setFontSizeInput,
    gap,
    setGap,
    teamGap,
    setTeamGap,
    selectedTeam,
    setSelectedTeam,
    teamFontSize,
    setTeamFontSize,
    nameSliderValue,
    setNameSliderValue,
    teamSliderValue,
    setTeamSliderValue,
    teams,
    teamColors,
    villaBorderColor,
    getDefaultFontSize,
    handleSubmit,
    handleNameSliderChange,
    handleTeamSliderChange,
    handleGapChange,
    handleTeamGapChange,
    handleDropdownChange,
    saveAsPng,
    getCelticTextStyle,
  };
};
