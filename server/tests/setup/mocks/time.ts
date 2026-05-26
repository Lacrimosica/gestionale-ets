let fakeTime: number | null = null;
const originalDateNow = Date.now;

export function mockTime(timestamp: number | Date) {
  fakeTime = typeof timestamp === 'number' ? timestamp : timestamp.getTime();

  Date.now = () => fakeTime!;

  return () => {
    Date.now = originalDateNow;
    fakeTime = null;
  };
}

export function advanceTime(ms: number) {
  if (fakeTime === null) {
    throw new Error('Time not mocked. Call mockTime() first.');
  }
  fakeTime += ms;
}

export function getCurrentMockedTime() {
  return fakeTime;
}

export function resetTime() {
  if (fakeTime !== null) {
    Date.now = originalDateNow;
    fakeTime = null;
  }
}
