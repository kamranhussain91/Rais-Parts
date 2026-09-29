---
name: Project import handoff
description: Recovering a full imported project after moving a conversation into a durable Replit project.
---

The handoff can preserve the original project files under the conversation-workspace file bundle while the new project initially contains only generated artifact scaffolds. Restore the source tree from that bundle before registering or presenting missing artifacts.

**Why:** Project transition metadata may register only the artifacts present during the initial project bootstrap, even when the uploaded project contains additional runnable artifacts.

**How to apply:** When an imported artifact is missing after transition, compare the active tree with `.local/conversation-workspace/files`, restore the missing artifact and root manifests without replacing platform-managed Git/tooling, install from the preserved lockfile, then register/present and start the artifact.