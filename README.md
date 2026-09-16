# AIsa MCP

Every AIsa data API as MCP tools, behind one endpoint:

```
https://mcp.aisa.one/mcp
```

580+ tools across 26 servers — SEO and AI visibility, finance, social, web
search, sales and agent mail — reached through five meta tools, so the
catalogue never has to land in a context window. Streamable HTTP. OAuth, with
nothing to paste.

This repository holds `@aisa-one/mcp`, a small stdio bridge for clients that
cannot speak remote MCP yet. **Most clients do not need it** — give them the URL
above and stop reading at [Connecting](#connecting).

---

## Five tools, not hundreds

A client that lists 580 tools has spent its context before the first question.
The root lists five:

| Tool | What it does | Cost |
| --- | --- | --- |
| `search` | Describe the task in plain words. Returns candidate operations with `operation_id`, `input_schema`, price, and sometimes a plan. | Free |
| `list_categories` | The categories a search can be narrowed to. | Free |
| `get_details` | One operation's full contract: arguments, response shape, whether it is read-only, price for your account, known pitfalls. | Free |
| `use` | Run one operation. `max_price_usd` refuses anything above your cap before it charges. | Per call |
| `batch_use` | Up to 20 operations at once, under the same cap. | Per call |

Searching and reading schemas costs nothing, so an agent can survey the whole
catalogue before spending anything.

## Connecting

One URL, transport `streamable-http`:

```bash
# Claude Code
claude mcp add --transport http -s user aisa https://mcp.aisa.one/mcp

# Codex
codex mcp add aisa --url https://mcp.aisa.one/mcp
```

Cursor, VS Code, Windsurf and the rest take the same URL as a `url` entry in
their MCP settings:

```json
{
  "mcpServers": {
    "aisa": {
      "type": "streamable_http",
      "url": "https://mcp.aisa.one/mcp"
    }
  }
}
```

Authorization is OAuth and needs no account to exist first. An unauthenticated
call answers 401 with a `WWW-Authenticate` header naming
`https://mcp.aisa.one/.well-known/oauth-protected-resource/mcp` (RFC 9728), and
the authorization server it points to accepts an unregistered client (RFC 7591)
— so the client registers itself, opens a browser, and you click Allow once.

That 401 is the discovery mechanism, not a failure.

Already have a key from [console.aisa.one](https://console.aisa.one)? Send it as
`Authorization: Bearer $AISA_API_KEY` and no browser opens. That is the way in
over SSH or in CI.

## Clients that only speak stdio

Claude Desktop and a few others spawn a local command and talk over stdin and
stdout. This package is that command:

```json
{
  "mcpServers": {
    "aisa": {
      "command": "npx",
      "args": ["-y", "@aisa-one/mcp"]
    }
  }
}
```

It bridges stdio to the remote endpoint, runs the OAuth browser flow on first
use and caches the token. The bridging itself is
[`mcp-remote`](https://github.com/geelen/mcp-remote)'s; this package supplies
the endpoint, the header form and the transport flag so you do not have to.

```bash
npx -y @aisa-one/mcp            # the root: five tools, reaches everything
npx -y @aisa-one/mcp seo        # one category, its tools listed directly
npx -y @aisa-one/mcp apollo     # one provider and nothing else
npx -y @aisa-one/mcp --help
```

`AISA_API_KEY` is picked up from the environment when it is set. Any further
arguments are passed to `mcp-remote` unchanged.

## Pinning a category

Every path below is the same root pinned to a different slice, so each still
carries the five meta tools, the price cap and `search` over everything. Pinning
changes what `tools/list` returns, never what is reachable.

| Endpoint | Listed | Reachable | Providers |
| --- | --- | --- | --- |
| `https://mcp.aisa.one/mcp` | 5 meta tools | everything | 26 |
| `https://mcp.aisa.one/gtm/mcp` | 43 | 163 | Apollo, Similarweb, X, Instagram, Reddit, Pinterest, YouTube, creator discovery |
| `https://mcp.aisa.one/seo/mcp` | 60 | 316 | DataForSEO, Semrush, Ahrefs |
| `https://mcp.aisa.one/sales/mcp` | 79 | 79 | Apollo, Similarweb, creator discovery |
| `https://mcp.aisa.one/social/mcp` | 56 | 56 | X, Instagram, Reddit, Pinterest, YouTube |
| `https://mcp.aisa.one/finance/mcp` | 48 | 48 | market data, crypto, prediction markets |
| `https://mcp.aisa.one/search/mcp` | 30 | 30 | Tavily, Exa, Perplexity, Firecrawl, Oxylabs |
| `https://mcp.aisa.one/<provider>/mcp` | one provider | — | 26 of them |

Counts move as the catalogue does. The live ones, and every provider endpoint,
are at [`mcp.aisa.one/servers`](https://mcp.aisa.one/servers), generated per
request by the running service.

## What it costs

`search`, `get_details` and `list_categories` are free. `use` and `batch_use`
are billed per call at the same prices as the AIsa REST API, with no seat and no
monthly minimum for the MCP itself. Every call takes `max_price_usd`, and one
that would cost more is refused before any charge.

A 402 says which of two things is missing — balance, or the Hive GTM Growth
subscription — and where to get it. Prices are at
[aisa.one/pricing](https://aisa.one/pricing).

## Reading more

- [`mcp.aisa.one/llms.txt`](https://mcp.aisa.one/llms.txt) — the whole server
  described for an agent, rendered live from its own catalogue
- [`mcp.aisa.one/servers`](https://mcp.aisa.one/servers) — the live inventory:
  entry points, modules, per-provider endpoints, tool counts
- [`mcp.aisa.one/.well-known/mcp/server-card.json`](https://mcp.aisa.one/.well-known/mcp/server-card.json)
  — the root's server card
- [aisa.one/mcp](https://aisa.one/mcp) — the same material for a person
- Published in the official MCP Registry under the `one.aisa` namespace: the
  root as `one.aisa/mcp`, plus one entry per category and per provider

## License

MIT
