# Decisions

- 2026-05-10: Added a centralized mixedProseFormulaHTML contract in src/modules/chemNotation.js instead of expanding ad-hoc prose parsing in lab.js.
- 2026-05-10: Kept formulaHTML() and equationHTML() unchanged; mixed prose rendering only composes safe KaTeX fragments with escaped prose.
- 2026-05-10: Preserved structured chemistry surfaces in lab.js for reactants/products/equations and used mixed prose only for human-readable description, steps, safety, visual, unlock, and visible title text.
- Added a --diagnose-reaction-prose dry-run mode that emits a synthetic reaction field failure so the validator message format can be captured without mutating committed data.

