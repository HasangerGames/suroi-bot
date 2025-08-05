# Suroi Bot

The official bot used in the Suroi Discord server. Written with [Bun](https://bun.sh/) and [discord.js](https://discord.js.org/).

## Setup
Start by installing [Bun](https://bun.sh/) and [Git](https://git-scm.com/).
Then, clone the repo using this command:
```bash
git clone https://github.com/HasangerGames/suroi-bot.git
```

Enter the newly created `suroi-bot` directory:
```bash
cd suroi-bot
```

Create a `config.json` file, using `config.schema.json` as a guide.

Install dependencies:

```bash
bun install
```

Finally, run this command to start the bot:

```bash
bun start
```

Or, to start a dev server (restarting the bot whenever a file changes):
```bash
bun dev
```
