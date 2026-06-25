import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Modules under test read these at import time (see src/lib/supabase.ts),
// so they must exist before any test file is imported.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

// With `globals: false`, @testing-library/react's auto-cleanup never
// registers (it only self-attaches when it finds a global afterEach), so
// each test's rendered DOM would otherwise leak into the next test.
afterEach(() => cleanup());

// jsdom doesn't implement ResizeObserver, but base-ui's floating-element
// positioning (Popover/Select/DropdownMenu) relies on it being present.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver ||= ResizeObserverStub;

// jsdom doesn't implement scrollIntoView either; cmdk calls it when
// moving keyboard/mouse selection within the option list.
Element.prototype.scrollIntoView ||= () => {};
