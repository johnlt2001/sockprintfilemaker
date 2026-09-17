// Export.
//
// The artwork is already an SVG, so exporting is a straight rasterisation:
// serialise the SVG, draw it into a canvas, encode a PNG. Nothing tries to
// screenshot the page, which is what previously made exports inconsistent.
//
// The one thing that needs care is the font. An <img> renders SVG in a
// sandbox that cannot fetch external resources, so a plain @font-face URL
// silently falls back to a system font in the exported file. Embedding the
// face as a data URI inside the SVG avoids that, and keeps the canvas
// untainted so it can still be read back as a PNG.

import { fontByID } from "./fonts";

const SVG_NS = "http://www.w3.org/2000/svg";

async function fontAsDataURI(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load the font file (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return `data:font/woff2;base64,${btoa(binary)}`;
}

/** A detached copy of the artwork that carries its own font with it. */
async function cloneWithEmbeddedFont(svgElement, familyID) {
  if (!svgElement) throw new Error("There is nothing to export yet.");

  const font = fontByID(familyID);
  const dataURI = await fontAsDataURI(font.url);

  const clone = svgElement.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);

  const style = document.createElementNS(SVG_NS, "style");
  style.textContent =
    `@font-face{font-family:"${font.id}";` +
    `src:url(${dataURI}) format("woff2");font-weight:400;font-style:normal;}`;
  clone.insertBefore(style, clone.firstChild);

  const { width, height } = svgElement.viewBox.baseVal;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  return { clone, width, height };
}

function serialise(clone) {
  const markup = new XMLSerializer().serializeToString(clone);
  return new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportPng(svgElement, { fileName, familyID, scale = 2 }) {
  const { clone, width, height } = await cloneWithEmbeddedFont(
    svgElement,
    familyID
  );
  const svgUrl = URL.createObjectURL(serialise(clone));

  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error("The artwork could not be rendered for export."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    // Deliberately no background fill: the PNG stays transparent so only the
    // artwork prints.
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const png = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!png) throw new Error("The PNG could not be encoded.");

    triggerDownload(png, fileName);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Vector output, for sending straight to a printer or a cutter. */
export async function exportSvg(svgElement, { fileName, familyID }) {
  const { clone } = await cloneWithEmbeddedFont(svgElement, familyID);
  triggerDownload(serialise(clone), fileName);
}

export function safeFileName(name, team, extension) {
  const clean = (value) =>
    String(value || "")
      .trim()
      .replace(/[^\w'-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase() || "UNTITLED";
  return `${clean(name)}_${clean(team)}.${extension}`;
}
