// Finds the Google Drive for Desktop mount, and where run state lives inside it.
//
//   node batch/drive.mjs          -> prints the "My Drive" path
//   node batch/drive.mjs --state  -> prints the state file path
//
// Run state is kept in Drive rather than in this checkout so it follows the
// business, not the machine: moving the daily run to another Mac picks up
// exactly where the last one stopped, instead of starting blind and
// reprinting orders that were already made.
//
// Which Drive: SOCK_DRIVE_ROOT if set; otherwise the only GoogleDrive-* mount;
// otherwise the account named in batch/local.json (written by setup-mac.sh,
// not committed — this repo is public).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function driveRoot() {
  if (process.env.SOCK_DRIVE_ROOT) {
    // An override is still checked: a wrong path must fail, not read as "no history".
    if (!existsSync(process.env.SOCK_DRIVE_ROOT)) {
      throw new Error(`SOCK_DRIVE_ROOT does not exist: ${process.env.SOCK_DRIVE_ROOT}`);
    }
    return process.env.SOCK_DRIVE_ROOT;
  }

  const base = join(homedir(), "Library", "CloudStorage");
  let mounts = [];
  try {
    mounts = readdirSync(base).filter((n) => n.startsWith("GoogleDrive-"));
  } catch {
    // No CloudStorage at all: Drive for Desktop was never installed.
  }

  let chosen = mounts.length === 1 ? mounts[0] : null;
  if (mounts.length > 1) {
    try {
      const { driveAccount } = JSON.parse(readFileSync(join(here, "local.json"), "utf8"));
      chosen = mounts.find((m) => m === `GoogleDrive-${driveAccount}`) || null;
    } catch {
      // fall through to the error below
    }
  }

  const root = chosen && join(base, chosen, "My Drive");
  if (!root || !existsSync(root)) {
    const found = mounts.length ? mounts.join(", ") : "none";
    throw new Error(
      `Google Drive is not mounted (found: ${found}). Is Drive for Desktop running` +
      (mounts.length > 1 ? `, and is driveAccount set in batch/local.json?` : "?")
    );
  }
  return root;
}

export const stateFile = () => join(driveRoot(), "Sock print automation", "state.json");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(process.argv.includes("--state") ? stateFile() : driveRoot());
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
