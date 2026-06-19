import '@testing-library/jest-dom'

// jsdom has no IntersectionObserver — stub it so components that use it
// (e.g. exposure tracking) don't throw during tests.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error — partial stub, sufficient for tests
global.IntersectionObserver = MockIntersectionObserver
