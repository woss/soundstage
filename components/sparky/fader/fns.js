import { cache, id, Observer, Target, observe, set, overload, todB } from '../../../../fn/fn.js';
import Sparky, { functions } from '../../../../sparky/sparky.js';
import { isAudioParam, getValueAtTime, automate, transforms, parseValue } from '../../../soundstage.js';

let faderId = 0;

const fadeDuration = 0.003;

const transformOutput = overload(id, {
    lcr: function(unit, value) {
        return value === 0 ?
            '0' :
            value.toFixed(2) ;
    },

    dB: function(unit, value) {
        const db = todB(value) ;
        return isFinite(db) ?
            db < -1 ? db.toPrecision(3) :
                db.toFixed(2) :
            // Allow Infinity to pass through as it is already gracefully
            // rendered by Sparky
            db ;
    },

    Hz: function(unit, value) {
        return value < 1 ? value.toFixed(2) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    },

    default: function(unit, value) {
        return value < 1 ? (value * 1000).toPrecision(3) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    }
});

const transformUnit = overload(id, {
    lcr: function(unit, value) {
        return value < 0 ? 'left' :
            value > 0 ? 'right' :
            'center' ;
    },

    dB: id,

    Hz: function(unit, value) {
        return value > 1000 ? 'k' + unit :
            unit ;
    },

    default: function(unit, value) {
        return value < 1 ? 'm' + unit :
            value > 1000 ? 'k' + unit :
            unit ;
    }
});

const toTickScope = function(value) {
    return {

    }
};

const toFaderScope = function(module, name, get, set, unit, min, max, transform, ticks, prefix) {
    const scope = Observer({
        id:          'fader-' + (faderId++),
        name:        name,
        label:       name || '',
        value:       get(),
        inputValue:  0,
        outputValue: '',
        min:         min,
        max:         max,
        step:        'any',
        prefix:      prefix,
        unit:        unit || '',
        transform:   transform || ''
    });

    // Make ticks immutable - stops Sparky unnecesarily observing changes
    scope.ticks = (ticks || []).map((value) => {
        return Object.freeze({
            faderId:     scope.id,
            value:       value,
            inputValue:  transforms[scope.transform || 'linear'].ix(value, scope.min, scope.max),
            outputValue: transformOutput(scope.unit, value).replace('.0','')
        });
    });

    // A flag to tell us what is currently in control of changes
    let changing = undefined;

    // Value may be controlled via the param
    observe(name, () => {
        changing = changing || 'param';
        scope.value = get();
        changing = changing === 'param' ? undefined : changing ;
    }, module);

    // inputValue and outputValue are dependent on value
    observe('value', (value) => {
        changing = changing || 'value';
        scope.outputValue = transformOutput(unit, value);
        scope.unit        = transformUnit(unit, value);
        if (changing !== 'inputValue') {
            scope.inputValue = transforms[scope.transform || 'linear'].ix(value, scope.min, scope.max);
        }
        changing = changing === 'value' ? undefined : changing ;
    }, scope);

    // Value may be controlled be the input
    observe('inputValue', (inputValue) => {
        changing = changing || 'inputValue';
        const value = transforms[scope.transform || 'linear'].tx(inputValue, scope.min, scope.max) ;
        if (changing !== 'param') { set(value); }
        if (changing !== 'value') { scope.value = value; }
        changing = changing === 'inputValue' ? undefined : changing ;
    }, scope);

    return scope;
};

functions.fader = function(node, scopes, params) {
    const name = params[0];

    const min = typeof params[2] === 'number' ?
        params[2] :
        parseValue(params[2]) ;

    const max = typeof params[3] === 'number' ?
        params[3] :
        parseValue(params[3]) ;

    return scopes.map((scope) => {
        // Make sure we're dealing with the param and not it's
        // observer proxy, else the param's method's don't work
        const module  = Target(scope);
        const context = module.context;
        const param   = module[name];
        const isParam = isAudioParam(param);

        const get = isParam ?
            (value) => {
                console.log(name, module[name].value, getValueAtTime(module[name], value, module.context.currentTime))
                return getValueAtTime(module[name], value, module.context.currentTime)
            } :
            (value) => module[name] ;

        const set = isParam ?
            // param, time, curve, value, duration
            (value) => {
                automate(param, context.currentTime, 'step', value);
                automate(param, context.currentTime + fadeDuration, 'linear', value);
            } :
            (value) => scope[name] = value ;

        return toFaderScope(module, name, get, set, params[1], min, max, params[4], params[5], params[6]);
    });
};

functions.change = function(node, input) {
    let scope;
    node.addEventListener('input', (e) => {
        if (!scope) { return; }
        if (e.target.type !== 'radio') { return; }
        scope.inputValue = parseFloat(e.target.value);
        if (e.target.type === 'radio') { e.target.checked = false; }
    });
    return input.tap((object) => scope = object)
}
