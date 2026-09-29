---
name: Bank account defaults
description: Durable rule for resolving cash and bank transaction accounts in the Honda POS JSON database.
---

Transaction account defaults must be selected from `isDefaultCash` and `isDefaultBank` flags on `BankAccount`. Legacy database records may be normalized once from semantic account metadata, but transaction handlers must not use legacy IDs as fallback defaults.

**Why:** A missing or renamed account previously allowed sales, purchases, expenses, and workshop movements to be saved without their corresponding ledger movement, silently losing money.

**How to apply:** Validate the resolved account before mutating inventory, customer balances, ledger entries, or saved transaction records. Return a clear 400 response when a paid movement has no valid explicit or flagged default account.