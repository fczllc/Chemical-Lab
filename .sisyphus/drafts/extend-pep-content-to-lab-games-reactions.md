# Draft: Extend PEP Content to Lab, Games, and Reactions

## Requirements (confirmed)
- User request: "前面增加了四本教材，当前一共8部教材，检查一下后面增加的教材内容，内容有没有在实验室模块、游戏模块的完整测试挑战、反应配对中？如没有，增加同原有的四本教材处理方式一样，增加进去。"
- Interpret "后面增加的教材" as the four newly added PEP volumes from the just-completed textbook migration.
- Need inspect whether new PEP textbook content is represented in:
  - 实验室模块 (lab module)
  - 游戏模块的完整测试挑战 (games module full-test challenge)
  - 反应配对 (reaction pairing)
- If missing, plan to add it the same way existing four textbook volumes are handled.

## Technical Decisions
- This session is Prometheus planning mode: create a work plan only, not implementation.
- First step is repository exploration, not asking user questions, because inclusion/exclusion is discoverable from data and module code.

## Research Findings
- Pending: coverage mapping agent `bg_0089bd8d`.
- Pending: test/validator mapping agent `bg_ab620969`.

## Open Questions
- Need confirm after exploration whether "完整测试挑战" maps to an existing named game/challenge concept and which data file drives it.
- Need determine exact old-four handling pattern to mirror.

## Scope Boundaries
- INCLUDE: planning verification and data/module/test changes needed to include the four new PEP volumes in lab, full-test challenge, and reaction pairing.
- INCLUDE: validator/test strategy to prove parity with existing four volumes.
- EXCLUDE: implementing source/data changes in this planning session.
- EXCLUDE: unrelated UI redesign, styling, or broad data cleanup.
