const postcss = require('postcss');
const plugin = require('./index');

function run(input, output, opts, expectedWarnings) {
    return postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then((result) => {
        expect(normalize(result.css)).toEqual(normalize(output));
        if (expectedWarnings) {
            expect(result.warnings()).toHaveLength(expectedWarnings);
        } else {
            expect(result.warnings()).toHaveLength(0);
        }
    });
}

function normalize(str) {
    return str.replace(/\n/gm, ' ').replace(/\s+/gm, ' ');
}

test('Core functionality', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    return run(input, output);
});

test('Namespace', () => {
    const input = `
    :root {
        --pineapple-design-max: 1300;
        --pineapple-design-min: 1200;
    }
    h1 {
        font-size: var(--pineapple-10-100);
    }
    `;
    
    const output = `
    :root {
        --pineapple-design-max: 1300;
        --pineapple-design-min: 1200;
        --pineapple-10-100: clamp(10px, calc(10px + 90 * (100vw - var(--pineapple-design-min) * 1px) / (var(--pineapple-design-max) - var(--pineapple-design-min))), 100px);
    }
    h1 {
        font-size: var(--pineapple-10-100);
    }
    `;
    
    return run(input, output, {namespace: 'pineapple'});
});


test('Shorthand rules', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    div {
        margin: var(--10-20) 100px var(--20-40);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --10-20: clamp(10px, calc(10px + 10 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 20px);
        --20-40: clamp(20px, calc(20px + 20 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 40px);
    }
    div {
        margin: var(--10-20) 100px var(--20-40);
    }
    `;
    
    return run(input, output);
});

test('Specified units', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 800;
    }
    p {
        padding: var(--5-10rem);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 800;
        --5-10rem: clamp(5rem, calc(5rem + 5 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 10rem);
    }
    p {
        padding: var(--5-10rem);
    }
    `;
    
    return run(input, output);
});

test('Negative Numbers', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    h1 {
        margin-top: var(---10--100);
        margin-bottom: var(--n10-n100);
        margin-right: var(--n10-20);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        ---10--100: clamp(-10px, calc(-10px + -90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), -100px);
        --n10-n100: clamp(-10px, calc(-10px + -90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), -100px);
        --n10-20: clamp(-10px, calc(-10px + 30 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 20px);
    }
    h1 {
        margin-top: var(---10--100);
        margin-bottom: var(--n10-n100);
        margin-right: var(--n10-20);
    }
    `;
    
    return run(input, output);
});

test('Fractionals', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    h1 {
        font-size: var(--1p5-2p2rem);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --1p5-2p2rem: clamp(1.5rem, calc(1.5rem + 0.7 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 2.2rem);
    }
    h1 {
        font-size: var(--1p5-2p2rem);
    }
    `;
    
    return run(input, output);
});


test('Should keep min precision', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    h1 {
        font-size: var(--1p55555-20p222rem);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --1p55555-20p222rem: clamp(1.55555rem, calc(1.55555rem + 18.666 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 20.222rem);
    }
    h1 {
        font-size: var(--1p55555-20p222rem);
    }
    `;
    
    return run(input, output);
});

test('Should define each variable once', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 800;
    }
    p {
        padding: var(--5-10rem);
    }
    div a {
        padding: var(--5-10rem);
        font-size: var(--5-10);
    }
    div a::after {
        margin: var(--5-10) var(--10-20) var(--10-15);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 800;
        --5-10: clamp(5px, calc(5px + 5 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 10px);
        --5-10rem: clamp(5rem, calc(5rem + 5 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 10rem);
        --10-15: clamp(10px, calc(10px + 5 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 15px);
        --10-20: clamp(10px, calc(10px + 10 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 20px);
    }
    p {
        padding: var(--5-10rem);
    }
    div a {
        padding: var(--5-10rem);
        font-size: var(--5-10);
    }
    div a::after {
        margin: var(--5-10) var(--10-20) var(--10-15);
    }
    `;
    
    return run(input, output);
});

test('Inject nested rules', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    p {
        width: var(--100-1000);
    }
    h1 {
        --design-min: 100;
        font-size: var(--10-100);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
        --100-1000: clamp(100px, calc(100px + 900 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 1000px);
    }
    p {
        width: var(--100-1000);
    }
    h1 {
        --design-min: 100;
        font-size: var(--10-100);
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
        --100-1000: clamp(100px, calc(100px + 900 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 1000px);
    }
    `;
    
    return run(input, output);
});

test('Warn when bad design variable found', () => {
    const input = `
    :root {
        --design-max: 1300px;
        --design-min: 1200;
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300px;
        --design-min: 1200;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    return run(input, output, {}, 1);
});


test('Warn when too many design variables', () => {
    const input = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    div {
        --design-min: 1000;
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    const output = `
    :root {
        --design-max: 1300;
        --design-min: 1200;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    div {
        --design-min: 1000;
        --10-100: clamp(10px, calc(10px + 90 * (100vw - var(--design-min) * 1px) / (var(--design-max) - var(--design-min))), 100px);
    }
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    return run(input, output, {}, 1);
});

test('Warn when no design variables found', () => {
    const input = `
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    const output = `
    h1 {
        font-size: var(--10-100);
    }
    `;
    
    return run(input, output, {}, 3);
});

test('Do nothing if nothing needs to be done', () => {
    const input = `
    :root {
        --color: #407AFC;
    }
    a {
        color: var(--color);
    }
    p {
        --color: #034AD8;
        color: var(--color);
    }
    `;
    
    const output = `
    :root {
        --color: #407AFC;
    }
    a {
        color: var(--color);
    }
    p {
        --color: #034AD8;
        color: var(--color);
    }
    `;
    
    return run(input, output);
});