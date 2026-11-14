# Charts

How every Forspring product draws a chart: the dashboard tile, the report in an email, the figure on a
landing page. The colours are `chart-1` to `chart-8` in `tokens/chart.json` (ui D-3); this file is how
to use them (hub tick sbb, ui D-27). The rest of the brand still applies: the ladders for every label,
the roles for every surface, nothing under 11 px.

## 1. Pick the chart by the question

| The question | Draw | Not |
|---|---|---|
| How did it change over time? | A line, time on the x axis, left to right | Bars for a long series, an area stacked past three series |
| Which is bigger? | Bars, sorted by value unless the categories have their own order (months, steps) | A line between unrelated categories |
| What is the one number? | A stat tile: the figure (`text.chrome.figure`), its label, its change and period | A gauge or a dial |
| What exactly are the values? | A table, numbers right-aligned in tabular figures | A chart with a label on every point |
| What is the share of a whole? | Bars, or a single stacked bar | A pie or a donut beyond two or three parts |

- **Never 3D,** never a shadow or a gradient on a mark, never a dual y axis. Two measures on two scales
  are two charts, one above the other, sharing the x axis.
- **A pie only for two or three parts** that sum to a whole that matters. Past three, people cannot
  compare the slices; use bars.
- **Sparklines** sit in a table row or a stat tile, with no axis, and always beside the number they
  summarise.

## 2. Colour

- **Series take the slots in order:** the first series is `chart-1`, the second `chart-2`, and so on to
  `chart-8`. A series keeps its slot when a filter hides another, so a colour means the same thing
  across a page and across a product's views.
- **A ninth series folds into Other,** drawn in `muted-foreground`, last in the legend and the stack.
  The slots are never cycled: a repeated colour would claim two things are one.
- **One series, one colour.** A chart with a single series may use the product's accent (`primary`)
  instead of `chart-1`. With two or more series the accent is never a series colour: it would read as
  the action or the key word (brand/README.md section 4).
- **Status colours are never a series.** `success`, `warning`, `danger` and the `signal-*` marks mean
  state, not identity. A chart of errors by service colours its services by slot; a threshold or a
  breach is a line or band in `muted-foreground` with its word ("Grænse", "Limit") on it.
- **Emphasis by contrast, not by a new colour:** to point at one series, keep its slot and draw the
  others in `border` or `muted-foreground`.
- **Dark mode uses the dark slots.** `tokens.chart.dark` (or `--chart-n`, which follows the theme on
  its own) on `background` or `card`; never the light values on a dark surface.
- **A tinted surface for an identity** (a calendar block, a timeline bar, a lane) is the slot's tint,
  `--chart-n-tint` (`bg-chart-n-tint`): the slot at 20 % on the card, per theme (ui D-37). Never mix
  your own share. Text on a tint is `foreground`; an edge, if it has one, is the slot itself, which is
  3:1 on the card. The block also carries its name in words, so the tint is never the only cue.
- **Gridlines and axes** are `border`; tick labels `muted-foreground` on `text.chrome.meta`.

## 3. Labels and axes

- **Direct labels over legends.** Name a line at its end, a bar at its base or tip. A legend is for a
  chart too dense to label, and then it sits above the chart in series order.
- **Bars start at zero.** A bar's length is its value; a cut axis lies about it. A line may start
  elsewhere when the change is the point, and its axis says where.
- **Every chart says its unit and its source:** "kr. pr. måned", "requests per minute", in the title or
  on the axis; the source and the period in a meta line under the chart ("Kilde: Stripe, 1. til 31.
  oktober").
- **A title that says what the chart shows,** in plain words, sentence case: "Signups rose in
  October", not "Signups chart".
- **Numbers in the reader's locale** (Danish: 1.234,5), with the same unit and precision across a
  chart. Round to what the decision needs.
- **No label under 11 px,** on any chart, at any width. When labels collide on a phone, show fewer
  ticks, never smaller ones.

## 4. Accessible by default

- **A text summary or a table beside every chart.** The summary says the one thing the chart shows
  ("Revenue grew 12% from September to October"); the table, open or folded in a `details`, has
  every value. A screen reader gets the same facts as a sighted reader.
- **Never colour alone.** Each series is also told apart by a direct label, a line style (solid,
  dashed, dotted) or a marker shape, so the chart works in greyscale and for colour-blind readers.
- **Every mark at least 3:1 against its surface** (WCAG 1.4.11). The eight slots pass on `background`
  and `card` in both themes, and `test/chart.test.ts` holds them there with the colour-blind
  separation between neighbours; never lower a threshold to let a colour in. A mark on `muted` or a
  tinted surface must be measured again.
- **Hover is extra, never the only way in.** A tooltip may repeat a point's value; the value is also in
  the table. Nothing a person needs lives only in a tooltip (ui D-26).
- **Motion:** a chart may draw itself once on arrival (`motion.duration.slow`, `motion.ease.out`) on a
  marketing page; in product chrome it appears at once. Under reduced motion it is the end frame.

## 5. In code

```ts
import { chart, roles } from "@forspring/ui";
const series = chart[mode]; // series[0] is chart-1; a ninth folds into Other
const other = roles[mode]["muted-foreground"];
```

In CSS, `var(--chart-1)` to `var(--chart-8)` follow the theme. Charts on a SiteSpring page or in an
email follow the same rules; an email chart is an image with its summary as text beside it.
