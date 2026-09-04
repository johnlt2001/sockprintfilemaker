// Design.jsx
import PropTypes from "prop-types";

const Design = ({
  designRef,
  selectedTeam,
  teamColors,
  villaBorderColor,
  getStripedTextStyle,
  name,
  gap,
  nameSliderValue,
  teamGap,
  teamSliderValue,
  showOutline,
  hammersStrokeColor,
  watfordStrokeColor,
  swansBlack,
}) => {
  return (
    <div ref={designRef} className="design">
      <div className="column column-1">
        {showOutline && (
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: "36px",
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: "bold",
              border: "4px solid red",
              padding: "10px",
              display: "inline-block",
              margin: "0 auto 20px",
            }}
          >
            4-7
          </h2>
        )}
        <h2 className="do-not" style={{ color: "#FFFFFF" }}>
          DO NOT
        </h2>
        <div
          className={`red-box ${
            selectedTeam === "LEEDS" || selectedTeam === "RHINOS"
              ? "multi-colored-rectangle"
              : ""
          }`}
          style={{
            backgroundColor:
              selectedTeam === "SWANS"
                ? swansBlack
                : selectedTeam !== "LEEDS" &&
                  selectedTeam !== "RHINOS" &&
                  selectedTeam !== "CELTIC" &&
                  selectedTeam !== "NEWCASTLE" &&
                  selectedTeam !== "WEDNESDAY"
                ? teamColors[selectedTeam]
                : undefined,
            backgroundImage:
              selectedTeam === "CELTIC"
                ? "repeating-linear-gradient(90deg, #018749, #018749 70px, #FFFFFF 70px, #FFFFFF 140px)"
                : selectedTeam === "NEWCASTLE"
                ? "repeating-linear-gradient(90deg, #000000, #000000 10%, #FFFFFF 10%, #FFFFFF 20%)"
                : selectedTeam === "WEDNESDAY"
                ? "repeating-linear-gradient(90deg, #0033A0, #0033A0 12.5%, #FFFFFF 12.5%, #FFFFFF 25%)"
                : undefined,
            border:
              selectedTeam === "VILLA"
                ? `3px solid ${villaBorderColor}`
                : selectedTeam === "HAMMERS"
                ? `3px solid ${hammersStrokeColor}`
                : selectedTeam === "WATFORD"
                ? `3px solid ${watfordStrokeColor}`
                : selectedTeam === "SWANS" || selectedTeam === "NEWCASTLE"
                ? "3px solid #FFFFFF"
                : undefined,
            boxSizing: "border-box",
          }}
        ></div>
        <h2 className="disturb" style={{ color: "#FFFFFF" }}>
          DISTURB
        </h2>
      </div>
      <div className="column column-2">
        <h2
          className="name"
          style={{
            paddingBottom: `${gap}px`,
            fontSize: `${nameSliderValue}px`,
            color: "#FFFFFF", // Set name color to white
          }}
        >
          {name}
        </h2>
        <h2 className="watching" style={{ color: "#FFFFFF" }}>
          WATCHING
        </h2>
        <h2
          className={`team ${
            selectedTeam === "LEEDS" || selectedTeam === "RHINOS"
              ? "multi-colored-text"
              : ""
          }`}
          style={{
            paddingTop: `${teamGap}px`,
            fontSize: `${teamSliderValue}px`,
            color:
              selectedTeam === "CELTIC" || selectedTeam === "NEWCASTLE"
                ? undefined
                : teamColors[selectedTeam],
            textShadow:
              selectedTeam === "VILLA"
                ? `-3px -3px 0 ${villaBorderColor}, 3px -3px 0 ${villaBorderColor}, -3px 3px 0 ${villaBorderColor}, 3px 3px 0 ${villaBorderColor}`
                : selectedTeam === "HAMMERS"
                ? `-3px -3px 0 ${hammersStrokeColor}, 3px -3px 0 ${hammersStrokeColor}, -3px 3px 0 ${hammersStrokeColor}, 3px 3px 0 ${hammersStrokeColor}`
                : selectedTeam === "WATFORD"
                ? `-3px -3px 0 ${watfordStrokeColor}, 3px -3px 0 ${watfordStrokeColor}, -3px 3px 0 ${watfordStrokeColor}, 3px 3px 0 ${watfordStrokeColor}`
                : selectedTeam === "NEWCASTLE"
                ? "-3px -3px 0 #FFFFFF, 3px -3px 0 #FFFFFF, -3px 3px 0 #FFFFFF, 3px 3px 0 #FFFFFF"
                : undefined,
          }}
        >
          {selectedTeam === "CELTIC" || selectedTeam === "NEWCASTLE" ? (
            selectedTeam.split("").map((char, index) => (
              <span key={index} style={getStripedTextStyle(selectedTeam)[index]}>
                {char}
              </span>
            ))
          ) : selectedTeam === "HAMMERS" || selectedTeam === "SWANS" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: `${teamSliderValue * 0.4}px`,
                  marginBottom: "-50px",
                  marginTop: "5px",
                }}
              >
                THE
              </div>
              <div>{selectedTeam}</div>
            </div>
          ) : (
            selectedTeam
          )}
        </h2>
      </div>
    </div>
  );
};

Design.propTypes = {
  designRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  selectedTeam: PropTypes.string.isRequired,
  teamColors: PropTypes.objectOf(PropTypes.string).isRequired,
  villaBorderColor: PropTypes.string.isRequired,
  getStripedTextStyle: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  gap: PropTypes.number.isRequired,
  nameSliderValue: PropTypes.number.isRequired,
  teamGap: PropTypes.number.isRequired,
  teamSliderValue: PropTypes.number.isRequired,
  showOutline: PropTypes.bool.isRequired,
  hammersStrokeColor: PropTypes.string.isRequired,
  watfordStrokeColor: PropTypes.string.isRequired,
  swansBlack: PropTypes.string.isRequired,
};

export default Design;
