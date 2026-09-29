---
name: Workshop parts billing
description: Durable accounting rule for workshop bills that include inventory parts.
---

Workshop service records are the single bill for labor plus inventory parts. Parts are priced from the live product record, reduce stock when posted, and contribute both revenue and part margin; the full bill credits the selected payment account.

**Why:** Treating workshop parts as display-only would make inventory, banking, profit, and customer history disagree after a service is posted.

**How to apply:** Any future service create or edit must validate and reverse/reapply part quantities, recalculate revenue and profit, and update the corresponding account ledger entry in the same API mutation.