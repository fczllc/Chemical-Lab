# Decisions: lottie-loading-animation

## 2026-05-20 Task: plan-intake
- Use ordinary Lottie JSON + `lottie-web`, not dotLottie `.lottie` or `@dotlottie/*`.
- Replace only the visual global startup loader; preserve business progress indicators.
- Loader text must be exactly `打滚加载中...` with three ASCII periods.
