# Usage: when to use which, and how forms and errors behave

The README shows how to call each helper; this file says when to call it, when not, and how a screen
built from them behaves when a person fills in a form or something goes wrong. It is the guidance the
brand review asked for (hub tick tdg: "Nothing says when to use which, or how forms and errors
behave"). The rules come from hub `docs/ui-standard.md` (§1 surfaces, §3 rules), this repo's decisions
(D-n) and [brand/voice.md](../brand/voice.md). Where this file and a decision disagree, the decision
wins; fix this file.

`test/usage.test.ts` fails when a helper a product calls is not named here, so a new helper comes
with its guidance.

## 1. How to choose

Start with the smallest thing that does the job (ui-standard §3). First plain HTML and CSS through
this package's helpers: a page the Worker draws, links, `details`, `dialog`, `popover` and forms that
POST and answer 303. Every helper here works with no script. Second, a few lines of script under the
page's CSP nonce, and only as progressive enhancement: `dialogScript()`, `toastScript()` and
`connectScript()` are that kind, and the page still works without them. Third, htmx 4 for a partial
update (a row that refreshes, a filter that redraws one table), within about 20 KB of script. React
only in a rich app where the work is the UI (AppSpring, DataSpring's boards), and there through
`@forspring/ui/react`, whose wrappers draw the helpers' own markup, so every rule below holds there too.
A thin console page (sign-in, settings, keys, members, approvals, status) is never a React app.

## 2. Per helper

### Page frame

- **`shell()`** is every server-rendered page: the bar, the menu, `main`, the skip link and the
  favicons. Give a console with more than one section a `menu` (a sidebar, folded on a phone; D-13,
  hub D-95), never rows of links above the h1. `narrow: true` is for one card alone: sign-in, a
  refusal, a confirm page.
- **`bar()`** is the bar alone, for a rich app that draws its own frame. Don't build a bar of your own
  or reword its menus: the org switcher, the product switcher and "Log ud af Forspring" are the same in
  every product (D-17). It uses `orgPath()` to keep the person's place when they switch org and
  `initials()` for the avatar; call them yourself only for your own links or avatars.
- **`crumbs()`** names a detail page's parents, quiet, just before its h1. The page itself is the h1,
  never the last crumb. A top-level page has no crumbs.
- **`ROLES`** and **`ROLE_NAMES`** are the account's four roles and their words ("ejer",
  "administrator", "medlem", "læser"). Write a role with `ROLE_NAMES`, never your own word for it.
- **`PRODUCT_NAMES`** is how each product's name is written ("SiteSpring", never "Sitespring" or
  "site spring"). Use it wherever you name a product in copy.
- **The standard pages:** `chooseOrgPage()` when a person with several orgs arrives with none in the
  URL, `noOrgPage()` when they are in none that has the product, `refusedPage()` for any refusal, and
  `accountUnavailablePage()` when the account does not answer. Spread the result into `shell()` and
  answer with its `status`. Never draw your own version of these screens (hub D-99).

### Actions

- **`button()`** has three variants. **Primary** (the default) once per view, for the action the view
  exists for. **Danger** only where something is lost (delete, revoke, remove), never for "Afvis" or
  "Annuller", which lose nothing (D-24). **Ghost** for the rest: cancel, secondary actions, actions in
  a list row. `small: true` in rows, toolbars and tables. Give `href` for navigation (it draws a link
  that looks like a button) and leave it out for a form's submit.
- Easy to get wrong: a button's label is a verb that says what happens ("Gem ændringer", "Send
  invitation"), never "OK", "Submit" or "Klik her" (voice §6). An icon-only button needs `ariaLabel`.
  Don't pass `disabled`: it stays only so the account's markup keeps working (D-5); section 3 has
  what to do instead.
- **`dialogTrigger()`** opens a `dialog()` with script and is a link to the same confirm as a page
  without it. Use it only to open a dialog; a plain action is a `button()`.
- **`switchButton()`** turns one thing on or off at once, a POST the server answers by redrawing the
  page ("SiteSpring for Mette"). Not inside a larger form whose changes wait for a Save; there, use a
  checkbox in a `fieldset`.

### Inputs

- **`field()`** is every labelled input, select and textarea: the label, the control, the `hint` and
  the `error`, wired for a screen reader, and "påkrævet" or "valgfri" in the label from `required` or
  `optional` (pass the page's `lang`). Never write a bare `<input>` in a form. Section 3 has the rules.
- **`errorSummary()`** is the summary at the top of a form that failed: a heading and one link per
  error to its field, taking focus. Only on the page that answers a failed submit; section 3.
- **`tooltip()`** is a short explanation for the curious, beside a label or a value (`field()`'s
  `help`). It never holds the only copy of something a person needs to act: what a field needs is its
  `hint`, always shown; what a button does is its label; what went wrong is a notice (D-26). If you
  find yourself writing an instruction into a tooltip, it belongs in the hint.
- **`orDivider()`** separates two ways in ("eller") on the account's sign-in page.
- **`googleButton()`** is Google's sign-in button, for the account's sign-in page only. Products never
  draw a sign-in screen; they send the person to the account (hub D-89).

### Feedback

| Helper | Says | Stays | Use for |
|---|---|---|---|
| `notice()` | Something about this page | While it is true | A trial running out, "2 tjek er nede", a platform error with its `ref` |
| `toast()` | What the last request did | Until dismissed (success, info: 8 s with script) | "Ændringerne er gemt." after a POST and its 303 |
| `refusedPage()` | Why the whole request was refused | It is the page | Not signed in, not a member, role too low, product off |
| `state()` | What a block holds: nothing, loading, or failed | In place of the data | An empty list, a read that failed |

- **`notice()`** tones are `info`, `success`, `warning` and `error`. Warnings and errors are alerts,
  read out at once, so use them for what needs attention, not for decoration. A notice is never the
  report of a save; that is a toast, and a form's errors are `errorSummary()`, the error notice made
  for them. A platform error passes its `ref` (section 4).
- **`errorRef()`** is the ref line alone ("Fejlkode: 4bf92f35", and to quote it to support), for an
  error drawn without `notice()`, `state()` or `refusedPage()`, which take `ref` and draw it themselves.
- **`toast()`** reports the result of the request the page is answering, drawn at the start of `main`.
  Its tones are `success`, `warning`, `danger` and `info` (not notice's `error`): a form's errors are
  never a toast. Several at once go in **`toastRegion()`**. Add **`toastScript()`** (or serve
  **`TOAST_SCRIPT`** as a file under a strict CSP) for instant dismiss and the 8 second hide; without it
  Dismiss is a link and still works. A warning or danger toast never hides itself.
- **`state()`** with `kind: "empty"` says there is nothing and offers the action that fills it; by a
  filter, it says so and offers to clear it. `"loading"` is a skeleton (section 5). `"failed"` says the
  read failed and never claims there is nothing.
- **`signal()`** is a monitored thing's state: a check, a site, a job, up, late, down or not judged
  (D-13, hub D-95). Not for an outcome or a category, and never `--danger` or the accent for "down".
  `notice({ signal })` is the page-level summary ("2 tjek er nede").
- **`tag()`** is a short label on a row: a category, "Ny", "Denne enhed", or a status word with a
  status tone ("Aktiv", "Spærret"). Not for a monitored state (that is `signal()`) and not clickable.
  `"primary"` only for "new" or "current", never for a status.
- Status text, plain words in a sentence or a meta line, is the default; reach for a tag or a signal
  only when the eye must find it in a list. Every tone and signal carries its word; colour alone says
  nothing (brand §9).
- **`REFUSALS`**, **`REFUSAL_REASONS`** and **`isRefusal()`** are the refusal words with no markup, for
  an API, a CLI or an MCP server: answer with `REFUSALS[reason].status` (or `exit`) and its words, and
  check a reason from another service with `isRefusal()` before you trust it.

### Data

- **`table()`** for rows a person compares across columns: numbers (`num: true`, right-aligned),
  dates, states. Past about one screen of rows, or when a person looks for one row, give it `controls`
  (search, filter chips, the stated order, paging; D-25). Sorting is the server's, never the browser's
  on one page of many.
- **`pagination()`** and **`pageOf()`**: `pageOf()` is the arithmetic both your query and your links
  use; `pagination()` draws "1–25 af 248" with Previous and Next, under a table or under a `list()`.
  No numbered page links: a person looking for one row searches.
- **`list()`** for a few things, each with a name, a meta line and one action at the end: your orgs,
  your devices, the products. Not for comparing values across rows; that is a table.
- **`card()`** for one self-contained thing: a form, a summary, a narrow page's content. A grid of cards
  only for a handful of things that each lead somewhere (a product picker); for many things of one
  kind, a list or a table. Cards have no shadow (brand §6).
- **Charts** are not in the package yet; draw them by [brand/charts.md](../brand/charts.md): the
  chart by the question, slots in order, a table or summary beside every chart.

### Agent patterns

- **`approval()`** when an agent wants to do something a person must allow: who asks, for whom, why,
  what changes, what it does, when it lapses, and the decision as POST forms (D-24). Not a plain form
  with "Godkend": a person deciding for an agent needs the facts, and every copy must show the
  `outcome` once someone has decided. Reject is ghost; it loses nothing.
- **`diff()`** shows exactly what changes, field before and after or lines added and removed, as the
  server computed it. Pass only what differs.
- **`explain()`** is "Hvorfor Spring gjorde det", folded: under anything an agent did on its own, and
  inside an approval.
- **`connectPanel()`** is the one "Connect an agent" panel (D-19, hub D-102). Don't build your own or
  show a key in the default tabs; keys live in its folded section. **`connectScript()`** (or
  **`CONNECT_SCRIPT`** as a file) adds the copy buttons. **`CONNECT_CLIENTS`** lists the tabs, in order,
  for `open`. **`connectServerName()`** and **`cursorInstallUrl()`** are what the panel uses; call them
  only when you must print the same name or deeplink elsewhere (a CLI's help, say).

### Overlays

- **`dialog()`** for a short question or a small form that belongs to the page behind it and must be
  answered before going on. Not for a task with its own steps, a long form or anything a person may
  want to link to: that is a page. Every dialog has a page fallback (`page`), since opening one needs
  script.
- **`confirmDestructive()`** before anything that cannot be undone: it says what is lost with counts,
  can ask for the thing's name, and puts the safe action first and in focus (D-23). A plain confirm
  ("Er du sikker?" with OK) is never enough. Ask for the name when much is lost or the thing is easy
  to mistake for another; for something cheap that can be undone, skip the confirm and offer "Fortryd"
  in the toast instead. The server checks the name and the CSRF token again.
- **`dialogScript()`** (or **`DIALOG_SCRIPT`** as a file) once per page with a dialog: it turns the
  trigger's click into `showModal()`. Without it the trigger's link leads to the confirm page.
- A tooltip is an overlay too (above, under Inputs); a menu is the bar's or the shell's, never a
  dialog.

### Icons

- **`icon()`** draws one of **`ICON_NAMES`** (Lucide's, vendored). Beside words it is decoration and
  takes no label; standing alone (a toolbar button) it needs words, through the button's `ariaLabel`
  or `icon(name, { label })`. An icon never carries meaning the words beside it lack, and a new icon is
  Lucide's own drawing added to `src/icons/`, not one drawn here.

### Brand

- **`mark()`** is the doll inline. The bar draws it already, so a product rarely needs it; when it
  does (a sign-in card, an email), it is never recoloured or redrawn: its colour is `--mark`.
- **`fontFaces()`** builds the `@font-face` rules when you serve the package's `fonts/` from your own
  path and inline your CSS; with a bundler, import `fonts.css` instead.
- **`faviconFor()`** and **`faviconLinks()`** write a product's favicon and manifest links when you
  don't use `shell()` (a React app's `index.html`). **`DEFAULT_BRAND_BASE`** is where `shell()` expects
  the brand files, under the package's version.

## 3. Forms

A form is server-rendered, posts, and the server decides. The browser's checks are a courtesy.

- **Every field has a visible label,** from `field()`. A placeholder is an example of the format at
  most ("fx 12345678"), never the label: it disappears when a person types and is too faint to read.
  The one exception is the table's search box, where the placeholder says what the hidden label says
  (D-25).
- **Help text goes under the field,** as `hint`, always shown: the format, the limit, what happens
  with the value. A `tooltip()` beside the label is only for background (section 2).
- **Required or optional is said in words,** in the label, by `field()`: `required: true` writes
  "Navn (påkrævet)" / "Name (required)" and sets the attribute; `optional: true` writes "Besked
  (valgfri)" / "Message (optional)". Pass the page's `lang`. Mark whichever is rarer in the form, and
  only that: where most fields are required, mark the optional ones and give the required ones
  `required: true, requiredWord: false`, so the browser and a screen reader still know. Never an
  asterisk alone. When every field is required, say it once above the form ("Alle felter skal
  udfyldes") and mark nothing (`requiredWord: false`).
- **Validate on submit,** not on every keystroke and not on leaving a field: a person half-way
  through an address is not wrong yet. The browser's own checks (`required`, `type="email"`,
  `pattern`) may stop a submit; the server checks everything again, every time.
- **When a submit fails,** answer the same page with a 4xx status (422 is usual) and the form drawn
  again:
  - each field's error beside it, through `field({ error })`, which sets `aria-invalid` and reads
    the error with the field;
  - a summary at the top of the form, `errorSummary({ lang, errors })`, with one error per field as
    `{ field: <the field's id>, message }` ("Mail: skriv en hel mailadresse"). It links each to its
    field, and has `tabindex="-1"` and `autofocus`, so focus moves to it and a screen reader reads it
    first (in React, `ErrorSummary` focuses it when it mounts);
  - the page's title starting "Fejl: " / "Error: ", so the tab and a screen reader say it too.
- **Keep what the person typed.** Pass every `value` back, and `selected` on a select's option. Never
  send back a password, a key or a card number; ask for those again and say so in the error.
- **On success, POST then 303** to the page that shows the result, which draws a `toast()` ("Ændringerne
  er gemt."), from a flash parameter or a one-time cookie. Never answer a POST with a page directly: a
  reload would post again.
- **One primary action,** after the fields, first in the row; a ghost "Annuller" after it, as a link
  back. A form with two primary buttons has two jobs; split it. (In a destructive confirm the safe
  action comes first instead, D-23.)
- **No disabled buttons.** A disabled button cannot be focused, says nothing about why, and would need
  script to enable again (D-23). `button()` still takes `disabled`, for the account's old markup (D-5);
  don't pass it. Keep the button live and let the submit explain what is missing, as the destructive
  confirm does; or, when the person may not do it at all, leave the button out and say why in words
  ("Kun administratorer kan invitere folk.").
- **Words from the catalogs:** labels, hints and errors come from the product's typed catalog in Danish
  and English; an error says what to do, without blame ("Skriv en hel mailadresse, fx navn@firma.dk.",
  not "Ugyldig mail" or "Du har skrevet forkert").

## 4. Errors and refusals

Every error has three parts, as the refusals do: a **title** (what happened, in a few words), **what it
means** (a sentence or two), and **what to do** (the fix, with the one action that does it). "Du er ikke
logget ind" / "Siden kræver, at du er logget ind med din Forspring-konto." / "Log ind, så kommer du
tilbage hertil." (voice §6).

| What went wrong | Draw | Status |
|---|---|---|
| The whole request is refused (sign-in, org, role, product off, suspended) | `refusedPage()` with its reason | The reason's |
| The account does not answer | `accountUnavailablePage()` | 503 |
| A field or the form is wrong | `field({ error })` and `errorSummary()` (section 3) | 4xx |
| Something on this page needs attention while it lasts | `notice()` | 200 |
| The last action failed elsewhere (a send, a sync) | `toast({ tone: "danger" })` after the 303 | 200 |
| One block's data could not be read | `state({ kind: "failed" })`, the rest of the page as usual | 200 |
| The product's own server failed | a page with `notice({ tone: "error", ref })` | 500 |

- **Never blame the person.** Say what is needed, not what they did wrong. A refusal names who can fix
  it (the admins, the owners) and how.
- **A platform error shows its `ref`.** Hub D-88: an error classified `platform` or `upstream` carries
  the short `ref`, the first characters of the request's `traceparent`. Pass it as `ref` to
  `notice()`, `state({ kind: "failed" })` or `refusedPage()` (`accountUnavailablePage()` too: the
  account not answering is upstream); they draw "Fejlkode: 4bf92f35" / "Reference: 4bf92f35" in
  monospace, selected whole by one click, and ask the person to quote it if they write to us. Elsewhere,
  `errorRef()`. Your own text still says what to do ("Noget gik galt hos os. Prøv igen om lidt."). A
  refusal needs none; its reason (the page's kicker) is the stable code.
- **Never an error with no way forward.** Every one ends in an action: try again (a link to the same
  page), fix the field, sign in, ask the named person, or the exact command for an agent
  (`refusedPage({ command })`).
- **Use the package's words** for refusals and the standard pages; don't reword them (D-17). A product
  adds only what is specific: the org, the people, the command.
- **Don't guess.** When the account or a backend does not answer, say that it did not answer ("Intet er
  gået tabt; prøv igen om et minut"), never that there is nothing or that the person lacks access.

## 5. States

- **Empty:** `state({ kind: "empty" })` in place of the list, with the action that fills it
  ("Opret kunde"). Empty by a search or filter says so and offers to clear it ("Ingen kunder matcher
  “Østerbro”", "Ryd søgningen"); a table with `controls` takes it as `empty`.
- **Loading:** a server-rendered page has no loading state; the server waits and draws the page. In
  htmx or React, show nothing for quick work (under about a second) and `state({ kind: "loading" })`,
  the skeleton, only when it lasts. No spinners: the package has none, and a skeleton keeps the page
  from jumping.
- **Failed:** `state({ kind: "failed" })` with "Prøv igen" as a link to the page, and `ref` when it
  is a platform error. Never an empty state for a read that failed.
- **Long lists:** a table with `controls` (search, filters, the stated order, `pagination()`) once the
  rows pass about one screen; the server slices with `pageOf()`.
- **Offline or unavailable:** the account not answering is `accountUnavailablePage()` (503). A product's
  own dependency down is a `notice({ signal: "down" })` or a failed `state()` where its data would be,
  saying what still works.

## 6. Language

- **One language per page,** set by `shell({ lang })` and passed to every helper that takes `lang`.
  Customer screens are Danish first with English available (hub D-7); the user menu's `languages`
  links to this page in the other language. Internal and operator screens may be English only.
- **Strings come from typed catalogs,** one record per language, as the package's own (`Record<Lang,
  …>`), so a missing translation fails the typecheck. No string literal in a template.
- **The package's words are the package's:** the bar, the standard pages, the refusals, the confirm,
  the table's controls, the toast's and the approval's labels. A product never rewords them.
- **Product names stay as written** (`PRODUCT_NAMES`), in Danish too, joined with a hyphen in a
  compound: "Din Forspring-konto".
- **Danish forms of address (hub D-118):** product screens say **du** to the person ("Du er ikke logget
  ind") and "hos jer" where they mean the company; marketing and sales say **I/jer** to the company.
  Never "De".
- **Numbers and dates** in the page's language and Copenhagen's time: 1.248 and "4. nov. 2026, 10.41" in
  Danish, 1,248 and "4 Nov 2026, 10:41" in English (`Intl`, as the helpers do).
- **Chrome copy:** plain words, no em dashes, no exclamation marks, no emoji (voice §6).

## 7. Before a screen ships

- [ ] It uses the smallest surface that works (section 1), and works with script off.
- [ ] One primary button per view; danger only where something is lost; no `disabled` buttons.
- [ ] Every field has a visible label, its help as `hint`, required or optional said in words by
      `field()`, whichever is rarer.
- [ ] A failed submit keeps the values, shows each error beside its field and a linked summary that
      takes focus; a successful one is POST, 303 and a toast.
- [ ] Every error says what happened, what it means and what to do, blames nobody, and shows the `ref`
      when it is a platform error.
- [ ] Refusals and the account being down use the standard pages with their status.
- [ ] Every list has its empty state with an action; long ones have table controls and paging.
- [ ] Anything that cannot be undone goes through `confirmDestructive()`; anything an agent asks to do
      goes through `approval()`.
- [ ] Nothing a person needs lives only in a tooltip; every icon, tag and signal has its word.
- [ ] One language on the page, every string from the catalog, product names as written, "du" to the
      person.
- [ ] `ui-audit` exits 0 at 1280 and 380 px, light and dark, with axe finding nothing (brand §9).
