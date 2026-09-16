/*
 * Turning what the caller typed into the arguments mcp-remote expects.
 *
 * Split out of the bin so it can be tested without spawning anything: the
 * interesting behaviour is all here, and the bin is the shell around it.
 */

export const ORIGIN = "https://mcp.aisa.one";

/**
 * `seo` -> the category endpoint, a URL -> itself, nothing -> the root.
 *
 * Returns null for anything else. Slugs are what the catalogue uses —
 * lowercase letters, digits and hyphens — and a value outside that is a typo
 * or a flag that arrived out of order. Building a URL from it anyway would
 * produce a 404 the caller cannot read back to a cause.
 */
export function endpointFrom(arg) {
  if (!arg) return `${ORIGIN}/mcp`;
  if (/^https?:\/\//i.test(arg)) return arg;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(arg)) return null;
  return `${ORIGIN}/${arg}/mcp`;
}

/**
 * The full argument list for mcp-remote.
 *
 * Three things are added that a caller would otherwise have to get right by
 * hand, and each is skipped when the caller has already spoken:
 *
 *   - the endpoint, from the first positional argument;
 *   - the key, when AISA_API_KEY is set and no --header was passed. The header
 *     value carries no space after the colon: mcp-remote splits on the first
 *     one, so a space becomes part of the scheme;
 *   - `--transport http-only`, because the server is Streamable HTTP and the
 *     SSE fallback only adds a failed attempt to every start.
 *
 * Everything else is forwarded untouched, so any mcp-remote flag still works.
 */
export function buildArgs(argv, env = {}) {
  const rest = [...argv];
  // A leading flag means no endpoint was named: the root is meant, and the
  // flag belongs to mcp-remote.
  const named = rest[0] && !rest[0].startsWith("-") ? rest.shift() : undefined;

  const endpoint = endpointFrom(named);
  if (endpoint === null) return { error: named };

  const args = [endpoint];
  const key = (env.AISA_API_KEY || "").trim();
  if (key && !rest.includes("--header")) {
    args.push("--header", `Authorization:Bearer ${key}`);
  }
  if (!rest.includes("--transport")) args.push("--transport", "http-only");
  args.push(...rest);
  return { endpoint, args };
}
