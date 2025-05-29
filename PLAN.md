# elevator CLI – Technical Product Requirements Document (PRD)

---

## 1. Purpose & Vision

elevator is a lightweight command‑line interface (CLI) that continuously accepts arbitrary natural‑language prompts and returns a richer, more technical articulation of the same idea using Google’s **Gemini 2.5 Flash Preview (05‑20)** model. The tool is intended for power users and developers who want an almost real‑time "prompt amplifier" running in their terminal.

---

## 2. Key Goals (MVP)

1. **Interactive loop** – stays running until the user explicitly exits (Ctrl‑C/`exit`).
2. **Stateless processing** – each prompt is elevated independently (no chat history).
3. **Fast round‑trip** – leverage the _Flash_ tier for latency‑sensitive use‑cases.
4. **Single binary / script install** – friction‑less setup via `npm i -g prompt‑elevator`.
5. **Configurable model & temperature** via CLI flags/env vars.
6. **Secure credential handling** – API key is only read from env var `GEMINI_API_KEY`.

---

## 3. User Experience

```text
$ prompt-elevator
> write me a twitter bio about carpentry
⏳ …thinking…
Here’s a sharper version (260 chars):
…
> exit
bye 👋
```

---

## 4. Architectural Options (Brainstorm)

| Option | Stack                     | Notable libs                                      | Pros                                                                                            | Cons                                                                                             |
| ------ | ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **A**  | **Node 18+ / TypeScript** | `@google/genai`, `readline`, `chalk`, `commander` | _First‑class Google SDK_, rich typings, wide community, trivial install on macOS/Linux/Windows. | Requires Node runtime; slight cold‑start overhead.                                               |
| **B**  | **Go 1.22**               | `google.golang.org/genai`, `spf13/cobra`          | Single static binary, instant startup, easy cross‑compile, concurrency primitives.              | Users must install Go binary (or download pre‑built); SDK still stabilising; generics verbosity. |
| **C**  | **Deno 1.44**             | `@google/genai` (ES module)                       | No build step, secure sandbox, bundling into single executable via `deno compile`.              | Smaller ecosystem; many devs unfamiliar; CI & autocompletions less mature.                       |

### Evaluation

_Latency_: Node (A) and Go (B) both deliver sub‑second round‑trips; Go may shave \~80‑100 ms per call.
_Distribution_: Go’s static binary is compelling, but most target users already have Node; publishing to npm yields frictionless global install.
_SDK maturity_: The official Google **Gen AI JS SDK** is now the reference client for the Developer API and receives the earliest feature drops citeturn4view0, whereas the Go SDK only recently hit 1.x and still flags breaking changes citeturn6view0.

**Decision → Option A (Node + TypeScript)** gives the best blend of maturity, reach, and rapid iteration.

---

## 5. Technical Design

### 5.1 High‑Level Flow

```
stdin → readline → PromptHandler → Gemini API → Formatter → stdout
```

### 5.2 Modules / Files

| Path                   | Responsibility                              |
| ---------------------- | ------------------------------------------- |
| `src/cli.ts`           | entry point; parses flags; starts REPL loop |
| `src/promptHandler.ts` | builds request payload, invokes Gemini SDK  |
| `src/formatter.ts`     | cleans & colourises model output            |
| `src/config.ts`        | loads env vars, applies defaults            |
| `types/*.d.ts`         | any custom typings                          |

### 5.3 Gemini Call

```ts
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL_ID ?? "gemini-2.5-flash-preview-05-20",
  contents: prompt,
  generationConfig: {
    temperature,
    maxOutputTokens: 1024,
  },
});
console.log(response.text);
```

*(based on Quickstart sample)* citeturn3view0

### 5.4 CLI Flags

| Flag         | Env fallback         | Default                          | Description                     |
| ------------ | -------------------- | -------------------------------- | ------------------------------- |
| `--model,-m` | `GEMINI_MODEL_ID`    | `gemini-2.5-flash-preview-05-20` | Model to target                 |
| `--temp,-t`  | `GEMINI_TEMPERATURE` | `0.7`                            | Creativity vs. determinism      |
| `--stream`   | `GEMINI_STREAM`      | `false`                          | Stream chunks for lower latency |
| `--raw`      | –                    | `false`                          | Disable colour / formatting     |

### 5.5 Concurrency & Streaming

- Use `generateContentStream()` for chunked output when `--stream` is set citeturn4view0.
- Back‑pressure handled by async iterator; render progressively.

### 5.6 Error Handling

- Network / rate‑limit: exponential back‑off (max 3 retries)
- Safety blocks: surface `blocked_reason` to stderr.
- Missing API key: abort with actionable message.

### 5.7 Security

- Keys only via **env vars** (never in args or config file).
- Optional `.env` file support via `dotenv` (ignored by git).

### 5.8 Packaging & Distribution

- `npm publish --access public` → provides `prompt-elevator` executable via `bin` field.
- GitHub Releases with pre‑built binaries via `pkg` (optional future enhancement).

### 5.9 Testing & CI

- Unit tests: `vitest` covering formatter & handler.
- E2E: run CLI in child process with stubbed SDK.
- GitHub Actions: lint → typecheck → test → build.
