import "isomorphic-unfetch";

import createFs, { IPromisesAPI } from "memfs/lib/promises";
import { httpResolve } from "../src/index";
import { memfsPlugin } from "rollup-plugin-memfs";

import { rollup } from "rollup";
import { Volume } from "memfs";
import ts from "typescript";
// import assert from "assert";

const cache = new Map();
test("build with skypack", async () => {
  const vol = Volume.fromJSON({
    "/index.js": `
    import {h} from "https://esm.sh/preact";
    console.log(h);
    `,
  });

  const memfs = createFs(vol) as IPromisesAPI;
  const rolled = await rollup({
    input: "/index.js",
    plugins: [
      httpResolve({
        cache,
      }),
      memfsPlugin(memfs),
    ],
  });
  const out = await rolled.generate({ format: "es" });
  const code = out.output[0].code;
  expect(code).toMatchSnapshot();
});

test("build nested with skypack", async () => {
  const vol = Volume.fromJSON({
    "/index.js": `
    import {h} from "https://cdn.skypack.dev/preact@10.4.6";
    import { useEffect } from "https://cdn.skypack.dev/preact@10.4.6/hooks";
    function App() {
      useEffect(() => {
        console.log("effect");
      }, []);
      return h("div");
    }

    console.log(App);
    `,
  });

  const memfs = createFs(vol) as IPromisesAPI;

  const rolled = await rollup({
    input: "/index.js",
    plugins: [
      httpResolve({
        cache,
      }),
      memfsPlugin(memfs),
    ],
  });
  const out = await rolled.generate({ format: "es" });
  const code = out.output[0].code;
  expect(code).toMatchSnapshot();
});

test("with transform", async () => {
  const vol = Volume.fromJSON({
    "/index.js": `
    import * as svelteInternal from "https://cdn.skypack.dev/svelte/internal";
    console.log(svelteInternal);
    `,
  });

  const memfs = createFs(vol) as IPromisesAPI;
  const rolled = await rollup({
    input: "/index.js",
    plugins: [
      httpResolve({
        cache,
        transform: (code) =>
          ts.transpileModule(code, {
            compilerOptions: {
              module: ts.ModuleKind.ESNext,
              target: ts.ScriptTarget.ES5,
            },
          }).outputText,
      }),
      memfsPlugin(memfs),
    ],
  });
  const out = await rolled.generate({ format: "iife" });
  const code = out.output[0].code;
  expect(code).not.toContain("class{");
});
