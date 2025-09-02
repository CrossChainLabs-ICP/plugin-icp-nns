# ICP NNS Plugin for ElizaOS

**@crosschainlabs/plugin-icp-nns** is an ElizaOS provider that fetches **Network Nervous System (NNS)** proposals from the Internet Computer (ICP) Governance canister. It supports **topic** and **status** filters and returns a normalized list of proposals ready for downstream AI agents.

> Designed to plug into the [**AI-Driven Governance & Security for ICP**](https://github.com/CrossChainLabs-ICP/ai-neuron) workflow, but usable in any Eliza-based project.

---

## What it does

- 📥 **Fetch proposals** from the ICP Governance canister (`list_proposals` + `get_proposal_info`).
- 🔎 **Filter by topic / status** via a simple command syntax.
- 🧭 **Normalize output** into a concise `Proposal[]` structure for agents.

---

## Capabilities

- **Chat-style commands** (via Eliza messages):
  - `!proposals` — latest 10 proposals
  - `!proposals <limit>` — specify result count
  - `!proposals <limit> topic <id>` — filter by topic ID
  - `!proposals <limit> status <id>` — filter by status ID
  - `!proposals <limit> topic <id> status <id>` — combine filters

## Development

```bash
# Start development with hot-reloading
npm run dev

# Build the plugin
npm run build

# Test the plugin
npm run test
```
