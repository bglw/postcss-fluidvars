# PostCSS Fluid Variables
Automatically generate fluid [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*), using [CSS Clamp](https://caniuse.com/?search=clamp()).

Inspired many years ago by [Fluid Typography](https://css-tricks.com/snippets/css/fluid-typography/) and re-inspired by [Simplified Fluid Typography](https://css-tricks.com/simplified-fluid-typography/). This combines the two, giving you the precise scaling control of the former method, with the more concise format of latter. All wrapped up in an easy to type variable, expanded for you in postcss.

## Basic Usage
We want our font size to be 40px at or below a screen width of 800px. Between 800 and 1600px we want it to seamlessly scale up to 60px, where it tops out and scales no further.
```css
:root {
    --design-min: 800;
    --design-max: 1600;
}

h1 {
    font-size: var(--40-60);
}
```
👆 Generates 👇
```css
:root {
    --design-min: 800;
    --design-max: 1600;
    --40-60: clamp(40px, calc(40px + 20 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 60px);
}
h1 {
    font-size: var(--40-60);
}
```
Note no extra media queries, no changing the source declaration, just a CSS variable defined alongside the design specs.

Rather than being configured in Javascript, this plugin relies on the existence of the `--design-min` and `--design-max` CSS variables supplied in your stylesheet. This allows you to get fancier with nesting, and keeps the stylesheet self-defined.

Due to how they're used in the CSS calc, these variables **must not** have a unit attached. If you forget and put `800px` instead of `800`, a postcss warning will be logged (...and it won't work).

CSS Variables are only defined once, so `var(--10-100)` in the above example can be used across the stylesheet with no extra code penalty.

## More Usage

### Units
By default `px` is assumed, allowing you to drop the unit. Other units can be specified.
```css
h1 {
    // 4px -> 6px
    line-height: var(--4-6);
    // 4em -> 6em
    font-size: var(--4-6em);
}
```

### Negative values
Negative values are available, either with another hyphen or an `n` for readability.
```css
p {
    // -20px -> -40px;
    margin-top: var(--n20-n40);  // Equivalent
    margin-top: var(---20--40);  // Equivalent
}
div {
    // 10rem -> -10rem
    left: var(--10-n10rem);
}
```

### Decimals
Decimals are available using `p`, but the syntax hampers things making them sufficiently ugly that I'd avoid them where possible.
```css
h1 {
    // 4.5rem -> 6.3rem
    font-size: var(--4p5-6p3rem);
}
```

### Shorthands
Since they're pure CSS custom properties, this is perfectly fine.
```css
div {
    margin: var(--10-20) 100px var(--20-40);
}
```

### Nested overrides
CSS variables will be added wherever a design min or max variable is declared. This means you can override design specs for certain pages/areas.
```css
:root {
    --design-min: 800;
    --design-max: 1600;
}

.layout {
    --design-min: 1200;
}

h1 {
    font-size: var(--40-60);
}
```
👆 Generates 👇
```css
:root {
    --design-min: 800;
    --design-max: 1600;
    --40-60: clamp(40px, calc(40px + 20 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 60px);
}

.layout {
    --design-min: 1200;
    --40-60: clamp(40px, calc(40px + 20 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 60px);
}

h1 {
    font-size: var(--40-60);
}
```
Do note that _all_ variables will be injected at _every_ spot where you're changing the design specs. Use this sparingly and make use of the cascade — if you're defining the same design min/max in more than one place, define it on a specific classname and use it in both places. For example:
```css
:root {
    --design-min: 800;
    --design-max: 1600;
}

.christmas {
    --design-min: 768;
    --design-max: 1200;
}
```
```html
<section class="christmas"> <!-- 1200px design herein --> </section>
<section> <!-- 1600px design herein --> </section>
<section class="christmas"> <!-- 1200px design herein --> </section>
```

## Configuration
Classic use:
```js
const fluidvars = require('postcss-fluidvars');
postcss([
    fluidvars(options)
]);
```
Or use your bundler loader of choice.

### Namespace
To avoid clashing with any existing variables, you can provide a namespace.
```js
const fluidvars = require('postcss-fluidvars');
postcss([
    fluidvars({
        namespace: 'bees'
    })
]);
```

```css
:root {
    --bees-design-min: 800;
    --bees-design-max: 1600;
}

h1 {
    font-size: var(--bees-40-60);
}
```