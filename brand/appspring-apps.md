# Apps built on AppSpring

How the tools Forspring builds on AppSpring look to the people who use them: a customer's booking desk, their
case handling, their CRM. Which surfaces wear AppSpring's look and which wear the customer's, how each kind of
screen behaves, and how a customer's theme works (hub tick y1f). The rest of the brand applies throughout:
the roles, the ladders, the geometry, nothing under 11 px, [voice.md](voice.md) and
[docs/usage.md](../docs/usage.md).

Sources: hub D-103 item 4 (the two looks), hub D-117 (the three theme levels), this repo's D-23 to D-26, D-30,
D-33 and D-34, and AppSpring's own `docs/design/kernel/pages.md` (questions 7 to 9) and its public
`canonify-springml` skill. Where this file and a decision disagree, the decision wins; fix this file.

**Who does what.** A screen in AppSpring is a SpringML view: a file of Spring UI elements (`Page`,
`RecordPage`, `Query`, `Table`, `Board`, `Form`, `Action` and the rest) that says what is on the screen and
never how it looks. AppSpring's renderer owns every pixel. So the rules below are for two readers: the people
and agents who write views (which element to pick), and AppSpring's renderer (what each element draws like).
The renderer's work is lead-canonify's (appspring ticks n3z, zcr, nf7, 23q, vk2); this file is what it
implements against.

## 1. Two surfaces, two looks

| Surface | Look | Who sees it |
|---|---|---|
| AppSpring's bar, console and platform pages (settings, members, keys, "Connect an agent", the approval queue, countersign) | The family look with AppSpring's violet and the violet doll | Forspring's people, the customer's admins, agents |
| The customer's app: its views, hosted apps, public forms, the e-sign portal, end-user emails and PDFs | The customer's theme (section 4) | The customer's staff, and their own customers |

- **One region, one look.** A page may hold both, the bar above and the customer's view below, but each
  region wears exactly one. The bar never takes the customer's accent; the customer's view never shows
  AppSpring's violet or the doll. The theme's CSS goes on the element that holds the customer's view, never
  on the one with `data-product` (README, "A customer's theme").
- **The customer's logo is their mark** on their surfaces. The doll stays in AppSpring's bar.
- **Hosted apps, forms and the e-sign portal have no Forspring bar.** A customer's own end users sign in on
  the customer's surface (hub D-103 item 5); staff and agents sign in through the Forspring account.
- **Both looks share everything but values:** the same geometry, type, status colours and components. A
  theme changes colours and the logo, never how a screen is built.

## 2. Screens

An author picks the element by the screen's job (the `canonify-springml` skill's "Which component" table);
the renderer draws it like the package's pattern for that job. Markup from `@forspring/ui/html` or the
React wrappers in `@forspring/ui/react`, or the same classes on shadcn's `data-slot` parts (D-33).

| Spring UI element | Renders like | Rules |
|---|---|---|
| `Page`, `RecordPage` | `shell()` frame, or `bar()` above the app's own frame; `crumbs()` before a record's h1 | 2.2 |
| `Query` with `Toolbar`, `Search`, `Filters`, `Preset` | `table({ controls })`, `pagination()`, `pageOf()` (D-25) | 2.1 |
| `Table`, `Column`, `BulkAction` | `table()`; numbers right-aligned in tabular figures | 2.1 |
| `List`, `Item`, `Check` | `list()`, with `pagination()` under it when paged | 2.1 |
| `Board`, `Item` | lanes of cards on `card()`'s surface; flags as `tag()` with their word | 2.3 |
| `Meta`, `Facts`, `Fact` | the meta line under the h1; a description list | 2.2 |
| `Flag` (a named condition) | `tag()` in the condition's status tone, always with its word | 2.1, 2.3 |
| `Badge` | `tag()`, neutral | |
| `Callout` | `notice()`, `info` or `warning` | |
| `Stat`, `Chart` | the figure step and [charts.md](charts.md) | |
| `Action` | `button()`: primary once, ghost the rest, danger for a destructive verb | 2.2, 2.6 |
| `Form`, `Field`, `Step`, `Lines`, `Submit` | `field()`, `errorSummary()`, `button()`, `toast()` on success (D-30) | 2.4 |
| an action that requires approval | `approval()` with `diff()` and `explain()` (D-24) | 2.5 |
| a destructive, irreversible action | `confirmDestructive()` in `dialog()` (D-23) | 2.6 |
| `Empty`, a loading read, a failed read | `state()` empty, loading or failed, with `ref` (D-30) | 2.7 |
| `History` of an agent's change | the change, with `explain()` under it | 3 |

### 2.1 Lists and tables at scale

- **A table compares; a list works through.** `Table` when a person compares values across columns (bookings
  by arrival, guests and amount). `List` when they work a queue in order, one job per row (today's check-ins).
- **Past about one screen of rows, or when a person looks for one row,** the view has a `Toolbar` with
  `Search` and `Filters` over its `Query`. The default `<type>.list` pages already do.
- **Filter chips carry live counts** from the Query's batch, so no count disagrees with the rows: "Needs
  attention 3", "This week 41", "All 412". The current chip is filled with ink, a change of fill, not of hue.
- **The order is stated in words** in the footer, beside the range: "1–25 of 412, earliest arrival first"
  (the view's `subtitle` when the order is the point of the queue, else "sorted by Arrival, ascending"). The
  sorted header has its arrow and `aria-sort`. The server sorts; the browser never sorts one page of many.
- **Paging is Previous and Next** with the range, no numbered page links. Search, filter, sort and page live
  in the URL, so a filtered view can be linked, reloaded and gone back to.
- **Row verbs stay quiet.** At rest a row shows only the verb that fixes its flag (the condition's `fix`); the
  rest are in the row's ⋯ menu. A destructive verb is danger text there, never filled, never beside the
  primary.
- **A bulk run reports per row:** "8 done · 2 refused" above the table, then one line per refused row in the
  model's own refusal words, refused rows still selected. A `notice()` in `warning` when any row was refused.

### 2.2 Record pages

- **The header names the record and its state.** The h1 is the record's title ("Case 2026-114: water damage,
  kitchen"), the state beside it as a word ("Awaiting assessor"), then the `Meta` line, at most six facts.
  `crumbs()` names the list it came from. Never the record's id as its name.
- **One section per subject,** each titled: details, the related records, documents, history. More than
  three become tabs. A section the reader may not read is left out, not shown empty.
- **Related lists are child tables,** each with its own empty state and its own "Add" verb, filled with the
  record ("Add visit" on the case).
- **Actions are grouped, with one primary.** The primary is the next step in the record's process ("Book
  assessor visit"); the other verbs are ghost buttons, and verbs of one model group share a menu. A
  destructive verb comes last, in the menu, in danger text. A verb the reader may not run is not drawn; where
  they would look for it, the reason is said in words ("Only the claims team can close a case."), never a
  disabled button (D-30).

### 2.3 Boards

- **Columns are the states of one process,** in the state machine's order, by `Board by=`. A board is for
  watching work move; to compare values, use a table.
- **Every column names its state and counts its cards,** and sums a money field when the view asks: "Proposal
  · 6 · 412.000 kr". Closed and lost states fold into one last column that counts each and opens on demand.
- **Cards stay small:** the title, its code, one lead (a time or a person), at most two facts and one value.
  The record page holds the rest. A card opens its record.
- **Never colour alone for state.** The column says the state in words; a flagged card has its rail and a
  pill with words ("Overdue · 3 days"). A card's colour never says which column it belongs to.
- **Dragging is one way to move a card, never the only one.** The same transition is an `Action` on the card
  and in the record's header, for the keyboard and for touch. A move that needs input opens the action's
  dialog; an irreversible one asks first (2.6).

Example, a CRM pipeline as one of the tools a customer may have: Lead, Qualified, Proposal, Won, with Lost
folded at the end; each card the company's name, the contact, the next meeting and the deal's value.

### 2.4 Forms

A `Form` is the screen whose job is one action's input (a booking, a new case); an `Action` elsewhere opens
the same inputs in a generated dialog. The model owns each input's label, help and whether it is required;
the renderer draws them by docs/usage.md section 3.

- **Every label is visible,** from the model's label. A placeholder is at most an example of the format.
- **Required or optional is said in words,** "(påkrævet)" / "(required)" or "(valgfri)" / "(optional)",
  whichever is rarer in the form, never an asterisk alone (`field()`'s `required`, `optional`,
  `requiredWord`). An input the model makes required only sometimes says so when it becomes required.
- **Help goes under the field,** always shown. A tooltip is only for background.
- **Validate on submit.** The action's handler decides, every time. A failed submit keeps the values (never
  a secret), shows each error beside its field and an `errorSummary()` at the top that takes focus, and the
  page's title starts "Fejl: " / "Error: ".
- **A warning is said before Submit,** in the guard's own words, and never blocks it ("Over 40 hours this
  week is overtime."). A refusal is said apart, as an error.
- **One primary submit:** the forward one ("Confirm booking"); "Save draft" is ghost.
- **After a successful submit** the person lands where the result is (the new booking's record page) and a
  `toast()` says what happened, in the action's `success` words ("Booking confirmed."). It is the
  server-rendered POST, 303 and toast, in a React shell: never a form that resets with no word that it saved.

### 2.5 Approvals

An action whose model requires approval, always or when a condition holds ("refunds over 10.000 kr", "any
call by an agent"), is parked, not run. The record shows the waiting request, and the approval queue lists
them all; both draw `approval()` with the package's words (D-24).

- **Who asks, and for whom:** "Asked by: Line (Claims) via Spring".
- **Why:** the reason, and the rule or skill it follows ("Follows: refunds over 10.000 kr need a manager").
- **What changes:** `diff()` of the record before and after, only the fields that differ, or the lines
  added and removed.
- **What it does and what it costs:** the effects, a warning one marked ("Pays 14.200 kr to the
  policyholder's account"), and when the request lapses.
- **Approve, Edit first, Reject.** Approve is primary, in the action's words ("Approve refund"); "Edit first"
  opens the same input to change before it runs; Reject is ghost, since it loses nothing.
- **The outcome replaces the actions** on every copy, on the page and in Slack: "Approved by Mette Kjær · 4
  Nov 2026, 10:41". The facts stay as the record of what was decided. Who may decide, and that nobody
  decided first, is the server's check.

### 2.6 Destructive actions

- **An irreversible destructive action goes through `confirmDestructive()`** (D-23): it says what is lost,
  with counts ("This removes Nordhavn ApS, its 14 bookings and 3 invoices."), "It can't be undone.", and puts
  Keep first and in focus. "Are you sure?" with OK is never enough.
- **Type the name when much is lost** or the thing is easy to mistake for another: "Type Nordhavn ApS to
  confirm". The server checks the name again before it deletes anything.
- **Cheap and reversible needs no confirm.** Run it, and offer Undo in the toast ("Booking cancelled." with
  "Fortryd" / "Undo").
- **Danger only where something is lost:** delete, remove, revoke. Reject, and Cancel in a dialog, lose
  nothing and are ghost.

### 2.7 Empty, loading and error states

- **Empty says why and offers the one action that fills it:** "No visits yet. Book the first assessor
  visit." Empty by a search or a filter says so and offers to clear it ("No bookings match “Østerbro”",
  "Clear search"). An unset choice says what to choose ("Choose a property").
- **Loading shows nothing for quick work,** and a skeleton only when it lasts past about a second. No
  spinners.
- **A failed read is `state()` failed, never empty:** what failed, "Try again" as a link, and the `ref` when
  it is a platform error ("Reference: 4bf92f35", hub D-88). The rest of the page draws as usual.
- **A column or fact the reader may not read is left out with a note,** never guessed and never an error.
  A whole request refused is the package's refused page, in its words.
- **Every error has three parts:** what happened, what it means, what to do, and blames nobody
  (docs/usage.md section 4).

## 3. Agents in the app

Agents use the same actions as people, over the CLI and MCP, under the same rules. On screen, what an agent
did or wants to do uses the same patterns, with the same words as Spring's cards in Slack (D-24).

- **What an agent wants to do that a person must allow is an approval** (2.5), with the agent named ("via
  Spring") and its trail in "Why Spring did this".
- **What an agent did on its own shows where it happened:** the record's history names the agent and the
  person or rule it acted for, and `explain()` sits under the change, closed until asked.
- **Never a silent change to a record a person owns.** An agent's change to such a record is either approved
  first, or shown on the record as above and told to the owner. A model that lets an agent change people's
  records parks the agent's calls (approval when the caller is an agent) unless the change is small and
  undoable.
- **An agent's draft of a view, a model change or a theme waits for a person** (section 4.4). AppSpring parks
  an agent's catalog and view declarations until approved.

## 4. The customer's theme

### 4.1 Three levels (hub D-117)

| Level | What the customer sets | Status |
|---|---|---|
| **Default** | Nothing: Forspring's family look, as AppSpring's own screens wear it | Available; writes no CSS |
| **Brand** | An accent, a surface tint and a logo, each light and optionally dark | Available |
| **Guideline** | Brand, plus a font from an approved list of two or three, and one of two presets each for radius and density | Later, after the Brand level and its CRM path; refused today |

### 4.2 What Brand changes, and what never changes

- **The accent:** primary buttons, links, the focus ring and the mark colour. Its label colour on a filled
  button is picked for contrast.
- **The tint:** the soft surface (table heads, hover rows, quiet sections) in the customer's hue, and the
  page a step lighter in light and darker in dark.
- **The logo:** where the customer's brand is shown (the app's header, the portal, an email's top), with its
  `alt`.
- **Never changes:** geometry (radii, spacing, control heights), type (Archivo, Archivo Condensed, Space Mono,
  the ladders), status and signal colours, chart slots, cards, borders and text colours, and Forspring's
  chrome. Light or dark is the reader's choice, not the customer's.

### 4.3 Guideline, later and narrow

The schema already names the level, so a drafted file is shaped right, and `validateTheme()` refuses it
with `theme.guideline.unavailable` (fix: `brand`). The approved fonts list is empty and the radius and
density values in `src/theme.ts` are a draft, not approved. A font joins the list only with its metric
tables (appspring nf7), since AppSpring lays out text by measured widths (section 5).

### 4.4 A theme is a checked file

- **It lives in the app's bundle,** shaped by `@forspring/ui/schema/customer-theme.schema.json` (the README,
  "A customer's theme", has the format).
- **`validateTheme()` checks it at compile** (appspring zcr) and refuses it with stable codes, each naming the
  path and, for a colour, a `fix`: the nearest colour of the same hue that passes.
  - `theme.schema`, `theme.color.format`, `theme.level.mismatch`: the file's shape.
  - `theme.accent.contrast`, `theme.accent.label_contrast`: the accent under 4.5:1 on a surface, or its label
    on it.
  - `theme.accent.status_clash`: the accent too close to a status or signal colour.
  - `theme.tint.text_contrast`, `theme.tint.mark_contrast`: text or a signal mark unreadable on the tint.
  - `theme.logo.alt_missing`, `theme.logo.unsafe_url`: a logo with no words, or from somewhere unsafe.
  - `theme.guideline.unavailable`: the Guideline level.
  - Warnings, never refusals: a derived dark value (pin it in the file), and an accent close to AppSpring's
    own violet (the customer's views could read as AppSpring's chrome).
- **Agents may draft it** from the customer's website or brand guide: the brand colour, a light tint of it,
  the logo and its alt. The agent runs `validateTheme()`, takes the `fix` values or says why not, and leaves
  the file for a person.
- **A person approves it by promoting it in AppSpring.** Nothing an agent drafts reaches the customer's
  screens before that.
- **The renderer applies it** with `customerTheme()` (appspring n3z): role custom properties under the
  selector of the customer's region, after `tokens.css`. Forspring's chrome never changes.

## 5. What the kernel guarantees

- **Markup carries meaning only.** No element takes a colour, size, class, style, variant or breakpoint; the
  compiler refuses them (`unknown_prop`). Attention comes only from named conditions in the model, so
  "overdue" looks the same on every screen.
- **The renderer draws on `@forspring/ui`'s roles and tokens:** `tokens.css`, `fonts.css`, the component
  layer, and `shadcn.css` for shadcn parts, checked with `ui-audit --rich-app` (D-33).
- **No colour literal in the shell or the kernel** (appspring vk2). Every colour is a role; a customer's
  colours enter only through `customerTheme()`'s CSS.
- **The text font is Archivo,** with Archivo Condensed and Space Mono, self-hosted from the package
  (appspring question 7). The layout chooses each component's form from measured text widths, which is why
  a font is a Guideline matter with its own metrics, not a Brand value.
- **The design audit runs on the console and a SpringML fixture set** (appspring question 9): contrast, type,
  radii, spacing, colours, touch targets, third-party requests, at 1280 and 380 px, light and dark. The
  fixture set should include a Brand-level theme, so a themed view is audited too.
- **Emails and PDFs** (`renderHtml`) take the same roles and the customer's theme, written inline.

## 6. Before an AppSpring screen ships

- [ ] It is on the right surface (section 1), never both looks in one region, and the view says what things
      are, never how they look.
- [ ] A long list has search, filter chips with counts, the order in words and Previous and Next.
- [ ] A record page names the record and its state, has one primary action, and explains a missing verb in
      words rather than disabling it.
- [ ] A board's columns name their state and count their cards; every drag has the same verb as an action.
- [ ] Every form label is visible, required or optional is said in words, a failed submit has the error
      summary, and a saved one lands on the result with a toast.
- [ ] An action that needs approval shows who, why, what changes and what it costs, and the outcome on
      every copy.
- [ ] An irreversible destructive action says what is lost with counts and asks for the name when much is
      lost; a reversible one offers Undo.
- [ ] Every block has its empty, loading and failed state, with the `ref` on a platform error.
- [ ] Nothing an agent did to a person's record is silent.
- [ ] The theme file passes `validateTheme()` and a person promoted it; `ui-audit` exits 0 on the view, light
      and dark, at 1280 and 380 px.
