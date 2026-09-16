#!/usr/bin/env node
/*
 * A stdio front door to the AIsa MCP server, which is remote.
 *
 * AIsa speaks Streamable HTTP at https://mcp.aisa.one/mcp, and any client that
 * speaks remote MCP should use that URL directly — it is one line of config and
 * there is no process to run. This exists for the clients that only spawn a
 * local command and talk over stdin/stdout, Claude Desktop among them.
 *
 * The bridging is `mcp-remote`'s, not ours. Reimplementing it would mean
 * reimplementing the parts that are genuinely hard — dynamic client
 * registration, the browser handoff, token refresh and caching — which that
 * package has been fixing in the open for a year. What this adds is the three
 * things a caller would otherwise have to get right by hand:
 *
 *   1. the endpoint, including the category shorthand: `aisa-mcp seo` is
 *      https://mcp.aisa.one/seo/mcp, which lists that category's tools in
 *      tools/list instead of only the five meta tools;
 *   2. the key, picked up from AISA_API_KEY when it is set, in the exact header
 *      form mcp-remote parses — it splits on the first colon, so no space;
 *   3. `--transport http-only`, because the server is Streamable HTTP and the
 *      SSE fallback only adds a failed attempt on every start.
 *
 * Everything after the endpoint is passed through untouched, so any mcp-remote
 * flag still works.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const ORIGIN = "https://mcp.aisa.one";
const require = createRequire(import.meta.url);

const HELP = `aisa-mcp — stdio bridge to the AIsa MCP server

  aisa-mcp                 the root endpoint: five tools, reaches everything
  aisa-mcp <category>      gtm · seo · finance · social · search · sales · mail
  aisa-mcp <provider>      one provider, e.g. twitter-api, similarweb, apollo
  aisa-mcp <url>           any endpoint, if you know exactly what you want

Authorization is OAuth by default: a browser opens on first run and you click
Allow once. Set AISA_API_KEY to skip the browser, which is the way in over SSH
or in CI. Any further arguments are passed to mcp-remote unchanged.

The catalogue of endpoints is live at ${ORIGIN}/servers, and
${ORIGIN}/llms.txt describes the whole thing for an agent to read.`;

/** `seo` -> the category endpoint; a URL stays as it is; nothing -> the root. */
function endpointFrom(arg) {
  if (!arg) return `${ORIGIN}/mcp`;
  if (/^https?:\/\//i.test(arg)) return arg;
  // Slugs are what the catalogue uses: lowercase, digits, hyphens. Anything
  // else is a typo or a flag that arrived out of order, and guessing a URL
  // from it would produce a 404 the caller cannot read.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(arg)) {
    process.stderr.write(
      `aisa-mcp: "${arg}" is neither a URL nor a slug. Slugs are lowercase ` +
        `letters, digits and hyphens — see ${ORIGIN}/servers.\n`,
    );
    process.exit(2);
  }
  return `${ORIGIN}/${arg}/mcp`;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  // A leading flag means no endpoint was named, so the root is meant and the
  // flag belongs to mcp-remote.
  const named = argv[0] && !argv[0].startsWith("-") ? argv.shift() : undefined;
  const endpoint = endpointFrom(named);

  const args = [endpoint];
  const key = process.env.AISA_API_KEY;
  if (key) args.push("--header", `Authorization:Bearer ${key}`);
  if (!argv.includes("--transport")) args.push("--transport", "http-only");
  args.push(...argv);

  let proxy;
  try {
    // Resolved rather than spawned by name: `npx aisa-mcp` puts our bin on the
    // path, not mcp-remote's, and Claude Desktop launches this from launchd
    // where the path is shorter still.
    proxy = require.resolve("mcp-remote/dist/proxy.js");
  } catch {
    process.stderr.write(
      "aisa-mcp: mcp-remote is missing. It is a dependency, so this usually " +
        "means an interrupted install — try again, or run " +
        `npx -y mcp-remote ${endpoint} --transport http-only\n`,
    );
    process.exit(1);
  }

  // stdio is inherited whole: the client is talking MCP over this process's
  // stdin and stdout, and anything written between them corrupts the stream.
  const child = spawn(process.execPath, [proxy, ...args], { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  child.on("error", (err) => {
    process.stderr.write(`aisa-mcp: could not start mcp-remote — ${err.message}\n`);
    process.exit(1);
  });
}

main();
