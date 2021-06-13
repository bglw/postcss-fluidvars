const postcss = require('postcss');

module.exports = (opts = {}) => {
    return {
        postcssPlugin: 'postcss-fluidvars',
        Once(root, { result }) {
            const options = {
                prefix: opts.namespace ? `${opts.namespace}-` : '',
                ...opts
            }

            const designRuleMin = `--${options.prefix}design-min`;
            const designRuleMax = `--${options.prefix}design-max`;
            let hasDesignMinRule = false;
            let hasDesignMaxRule = false;

            const r = {
                open: `var\\(`,
                prefix: `--${options.prefix}`,
                negative: `[-n]?`,
                integer: `\\d+`,
                fractional: `(?:p\\d+)?`,
                breakpoint: `(?:at\\d+)?`,
                separator: `-`,
                unit: `[a-z]*`,
                close: `\\)`,
            };
            r.number = [r.negative, r.integer, r.fractional].join('');
            r.capture = (s) => {
              if (Array.isArray(s)) s = s.join('');
              return `(${s})`;
            };
            
            const testRegexString = [r.open, r.prefix, r.number, r.breakpoint, r.separator, r.number, r.unit, r.breakpoint, r.close].join('');
            const testRegex = new RegExp(testRegexString, 'i');
            
            const matchRegexString = [
                r.open,
                r.capture([
                  r.prefix,
                  r.capture(r.number),
                  r.capture(r.breakpoint),
                  r.separator,
                  r.capture(r.number),
                  r.capture(r.unit),
                  r.capture(r.breakpoint),
                ]),
                r.close,
            ].join('');
            const matchRegex = new RegExp(matchRegexString, 'gi');

            const variables = {};
            const injectionPoints = [];
            root.walkDecls((decl) => {
                const isDesignMin = decl.prop === designRuleMin;
                const isDesignMax = decl.prop === designRuleMax;
                hasDesignMinRule = hasDesignMinRule || isDesignMin;
                hasDesignMaxRule = hasDesignMaxRule || isDesignMax;

                if (isDesignMin || isDesignMax) {
                    if (injectionPoints.indexOf(decl.parent) === -1) {
                        injectionPoints.push(decl.parent);
                    }
                }

                if (isDesignMin || isDesignMax) {
                    if (/^\d+[a-z]+$/i.test(decl.value)) {
                        const betterValue = decl.value.replace(/[a-z]+$/i, '')
                        decl.warn(result, 
                            `Design variables musn't include a unit. Use "${betterValue}" instead of "${decl.value}"`);
                    }
                }

                if (!testRegex.test(decl.value)) {
                    return;
                }
                
                let matches = [];
                while (matches = matchRegex.exec(decl.value)) {
                    let [,variable, from, fromBp, to, unit, toBp] = matches;
                    if (variables[variable]) continue;
                    
                    const fromNumStr = parseNumStr(from);
                    const toNumStr = parseNumStr(to);
                    const fromBpStr = parseBpStr(fromBp);
                    const toBpStr = parseBpStr(toBp);
                    variables[variable] = {
                        from_str: fromNumStr,
                        to_str: toNumStr,
                        from: parseVal(fromNumStr),
                        from_breakpoint: parseVal(fromBpStr),
                        to: parseVal(toNumStr),
                        to_breakpoint: parseVal(toBpStr),
                        unit: unit.replace('pc', '%')
                    };
                }
            });

            const hasVariables = Object.keys(variables).length;
            if (hasVariables) {
                addFluidVariables(injectionPoints, variables, options);
                if (!hasDesignMinRule) {
                    result.warn(`No design min rule found in CSS. Expected "${designRuleMin}" to be defined somewhere.`);
                }
                if (!hasDesignMaxRule) {
                    result.warn(`No design max rule found in CSS. Expected "${designRuleMax}" to be defined somewhere.`);
                }
                if (!injectionPoints.length) {
                    result.warn(`No valid design variables found, nowhere to add variables. Expected "${designRuleMax}" and "${designRuleMin}" to be defined somewhere.`);
                }
                if (injectionPoints.length >= 10) {
                    result.warn(`More than 10 elements with design variables found. Try consolidate these, as all variables are added to every block.`);
                }
            }
        }
    }
}

const addFluidVariables = (injectionPoints, variables, options) => {
    const sortedVariables = Object.entries(variables).sort(varSort);

    sortedVariables.forEach(([prop, vals]) => {
        const vwCalc = buildVwCalc(vals, options);
        const unit = vals.unit || `px`;
        const from = vals.from;
        const to = vals.to;
        let diff = to-from;
        if (diff % 1 !== 0) { // isFloat
            const minPrecision = Math.min(precision(vals.from_str), precision(vals.to_str))
            diff = diff.toFixed(minPrecision);
        }

        const value = `clamp(${from}${unit}, calc(${from}${unit} + ${diff} * ${vwCalc}), ${to}${unit})`;
        injectionPoints.forEach(block => block.append(postcss.decl({prop, value})));
    });
}

const buildVwCalc = (vals, options) => {
    const designVar = `--${options.prefix}design`;

    if (!vals.to_breakpoint && !vals.from_breakpoint)
        return `(100vw - var(${designVar}-min) * 1px) / (var(${designVar}-max) - var(${designVar}-min))`;

    if (vals.to_breakpoint && !vals.from_breakpoint)
        return `(100vw - var(${designVar}-min) * 1px) / (${vals.to_breakpoint} - var(${designVar}-min))`;

    if (!vals.to_breakpoint && vals.from_breakpoint)
        return `(100vw - ${vals.from_breakpoint}px) / (var(${designVar}-max) - ${vals.from_breakpoint})`;

    return `(100vw - ${vals.from_breakpoint}px) / ${vals.to_breakpoint - vals.from_breakpoint}`;
}

const precision = (str) => {
    return str.split('.')[1]?.length;
}

const parseNumStr = (str) => {
    return str
        .replace(/^n/, '-')
        .replace(/(\d)p(\d)/, '$1.$2');
}

const parseBpStr = str => str ? str.replace(/^at/, '') : "0";

const parseVal = (val) => {
    if (/-?\d+(?:\.\d+)/.test(val)) return parseFloat(val);
    return parseInt(val, 10);
}

/**
 * Sort custom properties numerically before outputting.
 * Useful for debugging the final CSS, also looks nice.
 */
const varSort = ([,a], [,b]) => {
    if (a.from_breakpoint !== b.from_breakpoint) return a.from_breakpoint - b.from_breakpoint;
    if (a.to_breakpoint !== b.to_breakpoint) return a.to_breakpoint - b.to_breakpoint;
    if (a.from !== b.from) return a.from - b.from;
    if (a.to !== b.to) return a.to - b.to;
    if (a.unit > b.unit) return 1;
    if (b.unit > a.unit) return -1;
    return 0;
}