'use strict';

const api = require('@opentelemetry/api');
const assert = require('assert');
const { AsyncHooksContextManager } = require('@opentelemetry/context-async-hooks');

const contextManager = new AsyncHooksContextManager();
contextManager.enable();

api.context.setGlobalContextManager(contextManager);

// root context usage

const root = api.ROOT_CONTEXT;
const keyA = api.createContextKey('the key a');

assert.equal(root.getValue(keyA), undefined, 'no value set');

// context is immutable

const keyB = api.createContextKey('the key b');

const contextA = root.setValue(keyA, 'the a value');
const contextB = contextA.setValue(keyB, 'the b value');

assert.equal(root.getValue(keyA), undefined, 'root context is not mutated');
assert.equal(root.getValue(keyB), undefined, 'root context is not mutated');

assert.equal(contextA.getValue(keyA), 'the a value', 'context a contains b');
assert.equal(contextA.getValue(keyB), undefined, 'context a does not contain b');

assert.equal(contextB.getValue(keyA), 'the a value', 'context b contains a');
assert.equal(contextB.getValue(keyB), 'the b value', 'context b contains b');

const contextC = contextB.deleteValue(keyB);

assert.equal(contextB.getValue(keyB), 'the b value', 'context b is not mutated');
assert.equal(contextC.getValue(keyB), undefined, 'context c does not contain b');

// active context

const contextD = api.context.active();

assert.equal(contextD, root, 'context d is root context');

const value = api.context.with(contextD, function withContextD() {
    const active = api.context.active();

    assert.equal(active, contextD, 'active context is context d');

    const keyD = api.createContextKey('the key d');
    const contextE = active.setValue(keyD, 'the d value');

    const value = api.context.with(contextE, function withContextE() {
        const active = api.context.active();

        assert.equal(active, contextE, 'context e is active context');

        return 'some inner';
    });

    assert.equal(value, 'some inner', '.with() return value is synchronously returned');
    assert.equal(api.context.active(), contextD, 'context d is active context');

    return 'outer value';
});

assert.equal(value, 'outer value', '.with() return value is synchronously returned');
assert.equal(api.context.active(), root, 'root is active context');