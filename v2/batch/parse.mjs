// Turns Shopify sock line items into render jobs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SKU_TEAMS = JSON.parse(readFileSync(join(here, "sku-teams.json"), "utf8"));

// Placeholder values Etsy/Shopify put in when nothing was entered.
const NOT_PERSONALISED = [
  "not requested on this item.",
  "not requested on this item",
  "name",
  "",
];

// The word at the end of a SKU that says whose socks these are. "NAME" means
// the customer typed one; everything else is the word that gets printed.
// Longest first so GRANDAD wins over DAD and DADDY over DAD.
const ROLES = [
  "GRANDMA", "GRANDAD", "GRANDPA", "AUNTIE", "BROTHER", "SISTER",
  "DADDY", "MUMMY", "NANNY", "UNCLE", "PAPA",
  "NAME", "NANA", "MUM", "DAD", "NAN", "SON",
];

// Spurs and Liverpool have SKUs that carry nothing usable -- S-SPU-G-04-L,
// Liverpool-Socks-dnd-6-3 -- but their variant TITLE always spells it out:
// "Daddys / 6-11", "4-7 / Grandad", "Name (Personalise) / 6-11". Note the two
// products put size and role in opposite orders, so each part is classified on
// its own rather than by position.
const TITLE_ROLES = {
  NAME: "NAME", NAMES: "NAME", PERSONALISE: "NAME", PERSONALISED: "NAME",
  DAD: "DAD", DADS: "DAD", DADDY: "DADDY", DADDYS: "DADDY",
  MUM: "MUM", MUMS: "MUM", MUMMY: "MUMMY", MUMMYS: "MUMMY",
  GRANDAD: "GRANDAD", GRANDADS: "GRANDAD", GRANDPA: "GRANDPA",
  GRANDMA: "GRANDMA", GRANDMAS: "GRANDMA", NAN: "NAN", NANNY: "NANNY",
};

/** Reads role and shoe size out of a Shopify variant title. */
export function parseVariantTitle(title) {
  let role = null;
  let size = null;
  for (const raw of String(title || "").split(/[\/|,]/)) {
    const part = raw.trim().toUpperCase();
    if (!part) continue;
    if (/^\d+-\d+$/.test(part)) { size = part; continue; }
    // "Name (Personalise)" -> try the whole thing, then without the bracket.
    const bare = part.replace(/\(.*?\)/g, "").replace(/[^A-Z]/g, "").trim();
    const hit = TITLE_ROLES[part] || TITLE_ROLES[bare];
    if (hit) role = hit;
  }
  return { role, size };
}

/**
 * Last resort for a SKU with no role word in it: match the longest known team
 * token that the SKU starts with. Only reached when the grammar below fails,
 * so it cannot hijack a SKU that already parses.
 */
function teamByPrefix(sku) {
  const up = String(sku || "").toUpperCase();
  let best = null;
  for (const token of Object.keys(SKU_TEAMS)) {
    if (token.startsWith("_")) continue;
    if (!up.startsWith(token)) continue;
    // must end on a boundary so PALACE cannot match PALACEXYZ
    const next = up.charAt(token.length);
    if (next && /[A-Z0-9]/.test(next)) continue;
    if (!best || token.length > best.length) best = token;
  }
  return best;
}

/**
 * SKUs are not consistent. Real examples, all of which must parse:
 *
 *   EVERTONSOCKSNAME-6-11        SUNDERLAND-SOCKSNAME-6-11
 *   IPSWICH-SOCKS-NAME-6-11      PALACE-MUG-SOCKSNAME-6-11
 *   LIVERPOOL-NAME-A-6-11        LIVERPOOL-DADDY-A-6-11
 *   WESTHAM-DAD-6-11             VILLA-GRANDAD-6-11
 *   MANUNITED-NAME-A-4-7         SHEFFWEDSOCKSDAD-6-11
 *
 * Read it right to left: an optional shoe-size range, an optional one-letter
 * design revision, the role word, an optional "SOCKS", then the team token.
 */
export function splitSku(sku) {
  let core = String(sku || "").toUpperCase().trim();
  if (!core) return null;

  // Shoe size: 6-11 is the adult sock, 4-7 the kids' one.
  let size = null;
  const sizeMatch = /-(\d+-\d+)$/.exec(core);
  if (sizeMatch) {
    size = sizeMatch[1];
    core = core.slice(0, sizeMatch.index);
  }

  // Single-letter design revision, e.g. the "-A" in LIVERPOOL-NAME-A-6-11.
  core = core.replace(/-[A-Z]$/, "");
  // Kids ranges tack KIDS on after the role: CITY-NAME-KIDS-12-3. The size we
  // already took off the end says it is a kids sock, so the word adds nothing.
  core = core.replace(/-KIDS$/, "");

  for (const role of ROLES) {
    if (!core.endsWith(role)) continue;
    let rest = core.slice(0, -role.length);
    // Only a real boundary counts, so a team token that happens to end in a
    // role word cannot be mistaken for one.
    if (!rest.endsWith("-") && !rest.endsWith("SOCKS")) continue;

    rest = rest.replace(/-$/, "").replace(/-?SOCKS$/, "").replace(/-$/, "");
    if (!rest) continue;
    return { teamToken: rest, kind: role, size };
  }

  // No role word anywhere. The team may still be recoverable from the start of
  // the SKU; the role and size then have to come from the variant title.
  const prefix = teamByPrefix(sku);
  if (prefix) return { teamToken: prefix, kind: null, size };

  return null;
}

export function normaliseName(raw) {
  let value = String(raw || "");
  // Customers sometimes type the team on a second line; the name is the first.
  value = value.split(/[\r\n]+/)[0];
  value = value.replace(/[‘’ʼ]/g, "'").trim();
  if (NOT_PERSONALISED.includes(value.toLowerCase())) return null;

  value = value.toUpperCase();

  // The design reads "<NAME>'S WATCHING <TEAM>" -- that "'S" is a contraction
  // of "is", not a possessive. A name already ending in S cannot take it, so
  // the word gets spelled out instead: "JAMES IS WATCHING CELTIC".
  // Strip whatever ending the customer typed first so the rule is idempotent
  // and "James", "James's" and "James is" all land in the same place.
  const base = value
    .replace(/\s+IS$/, "")
    .replace(/'S$/, "")
    .replace(/'$/, "")
    .trim();
  if (!base) return null;

  return /S$/.test(base) ? `${base} IS` : `${base}'S`;
}

function personalisationOf(order, item) {
  const attrs = item.customAttributes || [];
  const hit = attrs.find((a) => /personalization|personalisation/i.test(a.key));
  if (hit && String(hit.value).trim()) return hit.value;

  // Older Etsy imports only carry it inside the title.
  const inTitle = /\/\/\s*Personalisation:?\s*(.*)$/is.exec(item.title || "") ||
                  /\/\/\s*Personalization:?\s*(.*)$/is.exec(item.title || "");
  if (inTitle) return inTitle[1];

  // eBay imports put it in the order note, on a "Text:" line.
  const inNote = /^\s*Text:\s*(.+)$/im.exec(order.note || "");
  if (inNote) return inNote[1];

  return null;
}

/** @returns {{ok: true, job} | {ok: false, reason}} */
// Some eBay imports leave LineItem.sku null and put the real SKU in a custom
// attribute instead (seen on real eBay imports). Without this those orders
// look like "not a sock SKU: null" and are skipped in silence.
export function skuOf(item) {
  if (item?.sku) return item.sku;
  const attr = (item?.customAttributes || [])
    .find((a) => String(a?.key || "").trim().toUpperCase() === "SKU");
  return attr?.value || item?.sku || null;
}

export function toJob(order, item) {
  const sku = skuOf(item);
  const parts = splitSku(sku);
  if (!parts) return { ok: false, reason: `not a sock SKU: ${sku}` };

  // Whatever the SKU could not tell us, the variant title usually can.
  const fromTitle = parseVariantTitle(item.variantTitle);
  const kind = parts.kind || fromTitle.role;
  // If the SKU grammar failed, a trailing "-6-6" is a variant counter rather
  // than a shoe size (Liverpool-Socks-dnd-6-6 is the 6-9 Name variant), so the
  // SKU's size is only trustworthy when the SKU also gave us the role.
  const size = (parts.kind ? parts.size : null) || fromTitle.size;

  if (!kind) {
    return {
      ok: false,
      reason: `SKU "${sku}" has no role in it and the variant title ` +
        `${item.variantTitle ? `("${item.variantTitle}") did not give one` : "is missing"}`,
    };
  }

  const teamID = SKU_TEAMS[parts.teamToken];
  if (teamID === undefined) {
    return { ok: false, reason: `unmapped team token "${parts.teamToken}" (add it to batch/sku-teams.json)` };
  }
  if (teamID === null) {
    return { ok: false, reason: `team "${parts.teamToken}" is not supported by the renderer yet` };
  }

  let name;
  let nameSource;
  if (kind === "NAME") {
    const raw = personalisationOf(order, item);
    name = normaliseName(raw);
    nameSource = raw;
    if (!name) return { ok: false, reason: "no personalisation text on a NAME variant — needs chasing" };
  } else {
    // DAD / MUM / GRANDAD variants carry the word in the SKU or the variant
    // title, not in a personalisation box.
    name = normaliseName(kind);
    nameSource = `(from variant ${kind})`;
  }

  return {
    ok: true,
    job: {
      order: order.name,
      customer: order.customer,
      sku,
      teamID,
      name,
      size,
      // Anything other than the standard adult 6-11 prints its size in a box so
      // the press operator can tell them apart on a mixed sheet. That covers
      // 4-7, the kids ranges, and Liverpool's 6-9, which would otherwise be
      // indistinguishable from a 6-11.
      showMark: Boolean(size) && size !== "6-11",
      markText: size || "",
      quantity: item.quantity || 1,
      rawPersonalisation: nameSource,
      // True when the printed name is not exactly what the customer typed, so
      // a run can be eyeballed for the cases the rules had to decide.
      nameEdited: kind === "NAME" &&
        String(nameSource || "").split(/[\r\n]+/)[0].replace(/[‘’ʼ]/g, "'").trim().toUpperCase() !== name,
    },
  };
}
