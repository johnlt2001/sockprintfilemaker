// The artwork.
//
// This is a single SVG built from the positioned items the layout produced.
// Keeping it as one SVG (rather than a stack of HTML elements) is what makes
// the PNG export dependable: it can be serialised and rasterised directly,
// with no screenshotting of the DOM involved.

import { forwardRef } from "react";

const TEXT_BANDS = "sock-text-bands";
const BAR_BANDS = "sock-bar-bands";
const BAR_STRIPES = "sock-bar-stripes";

/** Three hard-edged colour bands, no blending between them. */
function bandStops(colors, first, second) {
  const [a, b, c] = colors;
  return [
    { offset: "0%", color: a },
    { offset: first, color: a },
    { offset: first, color: b },
    { offset: second, color: b },
    { offset: second, color: c },
    { offset: "100%", color: c },
  ].map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />);
}

function TextItem({ item, family }) {
  const props = {
    x: item.x,
    y: item.y,
    fontFamily: `"${family}"`,
    fontSize: item.size,
    fill: item.bands ? `url(#${TEXT_BANDS})` : item.fill,
  };

  if (item.stroke && item.strokeWidth > 0) {
    props.stroke = item.stroke;
    props.strokeWidth = item.strokeWidth;
    props.strokeLinejoin = "round";
    // Draw the outline behind the fill so it never eats into the letterforms.
    props.paintOrder = "stroke";
  }

  if (item.stripes) {
    return (
      <text {...props}>
        {Array.from(item.text).map((char, i) => (
          <tspan key={i} fill={item.stripes[i % item.stripes.length]}>
            {char}
          </tspan>
        ))}
      </text>
    );
  }

  return <text {...props}>{item.text}</text>;
}

function BarItem({ item }) {
  const fill = item.bands
    ? `url(#${BAR_BANDS})`
    : item.stripes
    ? `url(#${BAR_STRIPES})`
    : item.fill;

  const bw = item.borderWidth;
  return (
    <g>
      <rect x={item.x} y={item.y} width={item.w} height={item.h} fill={fill} />
      {item.border && (
        <rect
          x={item.x + bw / 2}
          y={item.y + bw / 2}
          width={item.w - bw}
          height={item.h - bw}
          fill="none"
          stroke={item.border}
          strokeWidth={bw}
        />
      )}
    </g>
  );
}

function RectItem({ item }) {
  return (
    <rect
      x={item.x}
      y={item.y}
      width={item.w}
      height={item.h}
      fill={item.fill}
      stroke={item.border}
      strokeWidth={item.borderWidth}
    />
  );
}

const Design = forwardRef(function Design({ layout, family, className }, ref) {
  if (!layout) return null;
  const { width, height, items, team } = layout;
  const bar = items.find((i) => i.kind === "bar");
  const stripeW = bar && bar.stripes ? (bar.w * bar.stripePct) / 100 : 0;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
    >
      <defs>
        {team.textBands && (
          <linearGradient id={TEXT_BANDS} x1="0" y1="0" x2="0" y2="1">
            {bandStops(team.textBands, "40%", "60%")}
          </linearGradient>
        )}
        {team.barBands && (
          <linearGradient id={BAR_BANDS} x1="0" y1="0" x2="1" y2="0">
            {bandStops(team.barBands, "33%", "66%")}
          </linearGradient>
        )}
        {bar && bar.stripes && (
          <pattern
            id={BAR_STRIPES}
            patternUnits="userSpaceOnUse"
            x={bar.x}
            y={bar.y}
            width={stripeW * 2}
            height={bar.h}
          >
            <rect width={stripeW} height={bar.h} fill={bar.stripes[0]} />
            <rect
              x={stripeW}
              width={stripeW}
              height={bar.h}
              fill={bar.stripes[1]}
            />
          </pattern>
        )}
      </defs>

      {items.map((item, i) => {
        if (item.kind === "bar") return <BarItem key={i} item={item} />;
        if (item.kind === "rect") return <RectItem key={i} item={item} />;
        return <TextItem key={i} item={item} family={family} />;
      })}
    </svg>
  );
});

export default Design;
