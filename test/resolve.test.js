/*
 * What this guards is the argument list handed to mcp-remote, because every
 * mistake in it fails somewhere the caller cannot see: a wrong endpoint is a
 * 404 inside a spawned process, a header with a space after the colon is an
 * auth scheme called "Bearer" with an empty token, and a missing transport
 * flag is a failed SSE attempt on every single start.
 *
 * Nothing here touches the network. The two flaky tests that blocked five
 * releases of @aisa-one/connect were the ones that did.
 */
import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";

import { ORIGIN, buildArgs, endpointFrom } from "../lib/resolve.js";

const run = promisify(execFile);
const BIN = fileURLToPath(new URL("../bin/aisa-mcp.js", import.meta.url));

describe("endpointFrom", () => {
  it("defaults to the root, which is the endpoint a directory should list", () => {
    assert.equal(endpointFrom(undefined), `${ORIGIN}/mcp`);
    assert.equal(endpointFrom(""), `${ORIGIN}/mcp`);
  });

  it("expands a slug into the endpoint that lists that slice directly", () => {
    assert.equal(endpointFrom("seo"), `${ORIGIN}/seo/mcp`);
    assert.equal(endpointFrom("gtm"), `${ORIGIN}/gtm/mcp`);
    assert.equal(endpointFrom("twitter-api"), `${ORIGIN}/twitter-api/mcp`);
  });

  it("passes a URL through, so an endpoint we have not thought of still works", () => {
    const pinned = `${ORIGIN}/mcp?modules=seo,social`;
    assert.equal(endpointFrom(pinned), pinned);
    assert.equal(endpointFrom("http://localhost:8000/mcp"), "http://localhost:8000/mcp");
  });

  it("refuses anything else rather than building a URL that 404s", () => {
    for (const bad of ["SEO", "seo/mcp", "-seo", "se o", "seo?x=1", "../etc"]) {
      assert.equal(endpointFrom(bad), null, bad);
    }
  });
});

describe("buildArgs", () => {
  it("asks for http-only, because the server is Streamable HTTP", () => {
    const { args } = buildArgs([], {});
    assert.deepEqual(args, [`${ORIGIN}/mcp`, "--transport", "http-only"]);
  });

  it("sends the key with no space after the colon", () => {
    // mcp-remote splits the header on the first colon. A space there makes the
    // scheme " Bearer" and the token empty, and the server answers 401 with no
    // hint as to why.
    const { args } = buildArgs([], { AISA_API_KEY: "sk-test" });
    const i = args.indexOf("--header");
    assert.notEqual(i, -1);
    assert.equal(args[i + 1], "Authorization:Bearer sk-test");
  });

  it("leaves the key alone when it is absent or blank", () => {
    for (const env of [{}, { AISA_API_KEY: "" }, { AISA_API_KEY: "   " }]) {
      assert.equal(buildArgs([], env).args.includes("--header"), false);
    }
  });

  it("does not override what the caller already said", () => {
    const own = buildArgs(["--transport", "sse-only"], {});
    assert.equal(own.args.filter((a) => a === "--transport").length, 1);
    assert.equal(own.args.at(-1), "sse-only");

    const header = buildArgs(["--header", "X-Trace:1"], { AISA_API_KEY: "sk-test" });
    assert.equal(header.args.filter((a) => a === "--header").length, 1);
    assert.equal(header.args.includes("Authorization:Bearer sk-test"), false);
  });

  it("treats a leading flag as mcp-remote's, not as an endpoint", () => {
    const { endpoint, args } = buildArgs(["--debug"], {});
    assert.equal(endpoint, `${ORIGIN}/mcp`);
    assert.equal(args.at(-1), "--debug");
  });

  it("forwards trailing arguments untouched", () => {
    const { args } = buildArgs(["seo", "--debug", "--allow-http"], {});
    assert.equal(args[0], `${ORIGIN}/seo/mcp`);
    assert.deepEqual(args.slice(-2), ["--debug", "--allow-http"]);
  });

  it("reports a bad slug instead of guessing", () => {
    assert.equal(buildArgs(["NOT_A_SLUG"], {}).error, "NOT_A_SLUG");
  });
});

describe("the command itself", () => {
  it("prints help without spawning anything", async () => {
    const { stdout } = await run(process.execPath, [BIN, "--help"]);
    assert.match(stdout, /stdio bridge to the AIsa MCP server/);
    assert.match(stdout, new RegExp(`${ORIGIN}/servers`));
  });

  it("exits 2 on a bad slug, and says what a slug looks like", async () => {
    await assert.rejects(
      run(process.execPath, [BIN, "NOT_A_SLUG"]),
      (err) => {
        assert.equal(err.code, 2);
        assert.match(err.stderr, /neither a URL nor a slug/);
        return true;
      },
    );
  });
});
