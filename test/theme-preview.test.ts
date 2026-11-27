// The theme preview page (ui D-62): its example passes, and the page runs the package's own checks from
// ../theme.js in the browser, with no other origin.
import { expect, test } from "vitest";
import { EXAMPLE_THEME, themePreviewPage } from "../demo/theme-preview.ts";
import * as theme from "../src/theme.ts";

test("the example theme passes, so the page's example shows a working theme", () => {
  const v = theme.validateTheme(EXAMPLE_THEME, { product: "appspring" });
  expect(v.errors).toEqual([]);
  expect(theme.customerTheme(EXAMPLE_THEME, { product: "appspring", selector: "html[data-customer-theme]" }).css).toContain("--primary:");
});

test("the page imports validateTheme and customerTheme from the package's dist and loads nothing from another origin", () => {
  const page = themePreviewPage();
  expect(page).toContain('import { validateTheme, customerTheme } from "../theme.js"');
  expect(typeof theme.validateTheme).toBe("function");
  expect(typeof theme.customerTheme).toBe("function");
  expect(page).not.toMatch(/<(script|link|iframe)[^>]+(src|href)="https?:/);
});

// D-65: only the frame wears the theme; the page keeps the family's look, and one set of controls drives the frame.
test("the page puts the theme on the frame only, and hides the frame's own switchers", () => {
  const page = themePreviewPage();
  expect(page).not.toContain("wear(document)");
  expect(page).toContain(".demo-controls { display: none; }");
  expect(page).toContain('selector: "#tp-swatches"');
  expect(page).toContain("There is no theme to check yet.");
  expect(page).not.toMatch(/validateTheme\(\)<\/code>|customerTheme\(\)<\/code>/);
});
