// Wall-clock budgets for the build-time tests. They hold on a quiet dev machine, but on a shared
// 2-vCPU CI runner with every test file running at once they drift by tens of percent, so CI gets
// 2x headroom: still enough to catch a real regression (shore.js once took 924 ms against ~150).
export const budget = (ms) => ms * (process.env.CI ? 2 : 1)
