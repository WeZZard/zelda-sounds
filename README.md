# Zelda Sounds

Zelda BotW and TotK sound effects for Claude Code lifecycle events, with a GUI configurator.

## Install

```bash
/plugin marketplace add WeZZard/skills
/plugin install zelda-sounds@wezzard-skills
```

Run `/zelda-sounds:configure-zelda-sounds` to assign sounds to hook events.

## Development

Canonical source lives under `canonical/`. The installable Claude plugin at repo root is **generated**:

```bash
npm ci
node build.mjs
claude plugin validate .
```

CI enforces that committed root output matches a fresh build.

## License

MIT — see [LICENSE](LICENSE).
