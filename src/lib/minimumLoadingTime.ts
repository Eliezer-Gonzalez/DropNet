export const MINIMUM_LOADING_DURATION_MS = 500;

export async function finishMinimumLoadingTime(startedAt: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const waitForMinimumDuration = () => {
      const remaining = MINIMUM_LOADING_DURATION_MS - (performance.now() - startedAt);
      if (remaining <= 0) resolve();
      else window.setTimeout(waitForMinimumDuration, remaining);
    };
    waitForMinimumDuration();
  });
}
