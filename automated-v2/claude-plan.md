# Automated Sock Template V2 (Stable Architecture)

The original project struggled because the custom "Deutschlander" font had erratic, non-standard invisible bounding boxes that made programmatic, mathematically flush alignment practically impossible without hacky negative margins that broke dynamically.

This V2 project completely resolves this by locking down the exact pure Flexbox geometry using a strictly declared `line-height: 0.68` constraint against the original `Deutschlander` font. This perfectly slices away the invisible defect padding symmetrically, allowing flawless automation logic.

## 1. The Design Matrix
- **Font**: Use the original `Deutschlander` font from the previous project! Copy the `.woff` and `.woff2` files from `../src/fonts/` into this new project. 
  **CRITICAL LAYOUT RULE**: Deutschlander has erratic, massive invisible padding natively. To use standard Flexbox spacing, you **MUST** apply `line-height: 0.68` to all `.column-2 h2` text elements. This mathematically crops the invisible bounding box natively, locking the box exactly to the ink of the letters so pure Flexbox gap spacing behaves flawlessly!
- **Left Column**: Stack "DO NOT" (massive font) and "DISTURB" (slightly smaller) as a flex column. Below "DISTURB", place the generic solid rectangle that matches the currently selected team color.
- **Right Column**: A pure flex column containing `NAME`, `WATCHING`, and `TEAM`.

## 2. The Core Automation Algorithm (Crucial)
You must implement a dynamic text-scaling React hook to force the right column into a perfectly flush, geometry-locked block.
1. Anchor the layout to the "WATCHING" text. Assign "WATCHING" a static, hardcoded font size (e.g., `250px`).
2. Attach a `ref` to the "WATCHING" DOM element. In a `useEffect`, use `getBoundingClientRect().width` to measure its *actual rendered pixel width* on the screen.
3. Use this precise pixel width as the `TargetWidth`.
4. Dynamically calculate and apply the font sizes for the dynamic `NAME` and `TEAM` strings so that their rendered widths exactly match the `TargetWidth`.
5. **Spacing**: Because `Bebas Neue` has standard letter-boxing, **DO NOT use negative margins.** Set the right column to a standard CSS flex column (`display: flex; flex-direction: column; align-items: center; justify-content: center;`) and simply use `row-gap` or explicit margins to space them. Expose these gaps to the user via UI sliders so they can tighten the block visually.

## 3. The Data Layer
Implement the form controls and batch generation logic from the original project. Use `dom-to-image-more` to export the `designRef` node to PNG.

**Teams Array:**
```javascript
  const teams = [
    "ARSENAL", "BLACKPOOL", "BOURNEMOUTH", "BORO", "BRENTFORD", "BRIGHTON", "BURNLEY",
    "CELTIC", "CHELSEA", "CITY", "COVENTRY", "EVERTON", "FOREST", "HAMMERS", "IPSWICH",
    "LEEDS", "LEICESTER", "LIVERPOOL", "LUTON", "MILLWALL", "OXFORD", "PALACE",
    "PLYMOUTH", "RANGERS", "RHINOS", "SOUTHAMPTON", "SPURS", "SUNDERLAND", "UNITED",
    "VILLA", "WATFORD", "WEDNESDAY", "WEST BROM", "WOLVES",
  ];
```

**Colors Mapping:**
```javascript
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
```

*Note: Special teams like CELTIC, LEEDS, and RHINOS should use multi-colored linear gradients for their text instead of solid colors (replicate the logic: e.g. `#fbea02` -> `white` -> `#0280bc` for Leeds).*

*Crucial Design Exception for HAMMERS:*
If the selected team is `HAMMERS`, the team text block must be split into two stacked elements:
1. The word "THE" rendered above. Its font size should be dynamically scaled to exactly `0.4x` the calculated `teamFontSize`.
2. The word "HAMMERS" rendered below, using the standard `teamFontSize`.

Build out the full Vite app following this specification.
