---
name: Thermal receipt printing
description: Durable scope and consistency rules for thermal invoices in the Rais Honda POS application.
---

All thermal receipts generated from POS sales, Sales History sales, Sales History workshop bills, and the Workshop screen must use one shared receipt design and one isolated print path sized to the rendered receipt.

**Why:** The user needs receipts to look consistent across origins and to avoid clipped text or excess thermal-paper feed. Browsers can suspend animation frames in tiny off-screen iframes, leaving print clicks waiting forever.

**How to apply:** Keep future changes within thermal receipt presentation and printing. Preserve the existing A4 invoice layouts and do not change transaction totals, inventory, banking, ledgers, or API behavior. Default to 80 mm paper with a saved 58 mm option; size each printed page from receipt height plus an 8 mm tear-off margin. Use a laid-out, paper-width iframe with bounded timer/font readiness checks; reserve any popup fallback synchronously from the print click and show errors visibly.