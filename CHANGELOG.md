# Changelog

All notable changes to `@aisa-one/mcp` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-09-16

First release.

### Added

- `aisa-mcp`, a stdio bridge to the AIsa MCP server for clients that spawn a
  local command rather than connecting to a URL. Clients that speak remote MCP
  should point at `https://mcp.aisa.one/mcp` directly and skip this entirely.
- Category and provider shorthand: `aisa-mcp seo` resolves to
  `https://mcp.aisa.one/seo/mcp`, `aisa-mcp apollo` to that provider's endpoint.
  A full URL is taken as given; anything that is neither a URL nor a slug is
  refused rather than turned into a 404.
- `AISA_API_KEY` is read from the environment and sent as a bearer header, in
  the form `mcp-remote` parses — it splits on the first colon, so the value
  carries no space after it. Without a key the OAuth browser flow runs instead.
- `--transport http-only` by default, because the server is Streamable HTTP and
  the SSE fallback only costs a failed attempt on every start. Passing
  `--transport` yourself overrides it.
- Everything after the endpoint is forwarded to `mcp-remote` unchanged.

### Notes

The bridging is [`mcp-remote`](https://github.com/geelen/mcp-remote)'s, declared
as a dependency. Dynamic client registration, the browser handoff, token refresh
and caching are the parts that are genuinely hard, and reimplementing them to
avoid a dependency would trade a year of that package's bug fixes for a fresh
set of our own.

[Unreleased]: https://github.com/AIsa-public/AIsa-mcp-server/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AIsa-public/AIsa-mcp-server/releases/tag/v0.1.0
