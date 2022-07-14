'use strict';

const assert = require('assert');
const { trace, context } = require('@opentelemetry/api');
const { SemanticAttributes } = require('@opentelemetry/semantic-conventions');

const now = Date.now();
const tracer = trace.getTracer('the-lib', '1.0.0');

function runSimpleSpan() {
    const span = tracer.startSpan('some span');
    span.end();
    return span;
}

function runMultipleSiblingSpans() {
    const spanA = tracer.startSpan('span a');
    const spanB = tracer.startSpan('span b');

    spanA.end();
    spanB.end();

    return [spanA, spanB];
}

function runActiveSpan() {
    return tracer.startActiveSpan('active span', (span) => {
        span.end();
        return trace.getSpan(context.active());
    });
}

function runActiveNestedSpans() {
    return tracer.startActiveSpan('parent span', (parent) => {
        const child = runActiveSpan();

        parent.end();

        return [trace.getSpan(context.active()), child];
    });
}

function runManualActiveSpan() {
    const child = tracer.startSpan('child span');
    const ctx = trace.setSpan(context.active(), child);

    return context.with(ctx, () => {
        child.end();
        return trace.getSpan(context.active());
    });
}

function runManualActiveNestedSpans() {
    const parent = tracer.startSpan('parent span');
    const ctx = trace.setSpan(context.active(), parent);

    return context.with(ctx, () => {
        const child = runManualActiveSpan();
        return [trace.getSpan(context.active()), child];
    });
}

function runActiveSpanWithAttributes() {
    const attributes = { 'attribute a': 'value a' };
    return tracer.startActiveSpan('span', { attributes }, (span) => {
        span.setAttribute('attribute b', 'value b');
        return span;
    });
}

function runActiveSpanWithSemanticAttributes() {
    const attributes = { [SemanticAttributes.CODE_FUNCTION]: runActiveSpanWithSemanticAttributes.name };

    return tracer.startActiveSpan('span', { attributes }, (span) => {
        span.setAttribute(SemanticAttributes.CODE_FILEPATH, __filename);
        return span;
    });
}

function runActiveSpanWithEvents() {
    return tracer.startActiveSpan('span', (span) => {
        span.addEvent('the event name', {
            'some.attribute': 'some value',
        }, now);

        return span;
    });
}

function runActiveSpanWithLinks() {
    const spanA = tracer.startSpan('span a');
    const links = [{ context: spanA.spanContext() }];

    return tracer.startActiveSpan('span b', { links }, (spanB) => {
        return spanB;
    });
}

async function run() {
    const simpleSpan = runSimpleSpan();
    assert.ok(simpleSpan, 'span was created');

    const [spanA, spanB] = runMultipleSiblingSpans();
    assert.ok(spanA, 'span a was created');
    assert.ok(spanB, 'span b was created');

    const activeSpan = runActiveSpan();
    assert.ok(activeSpan, 'active span was created');

    const [parentSpan, childSpan] = runActiveNestedSpans();

    assert.ok(parentSpan, 'parent span was created');
    assert.ok(childSpan, 'child span was created');
    assert.equal(childSpan.parentSpanId, parentSpan.spanContext().spanId, 'parent is set on child');

    const [manualParentSpan, manualChildSpan] = runManualActiveNestedSpans();

    assert.ok(manualParentSpan, 'parent span was created');
    assert.ok(manualChildSpan, 'child span was created');
    assert.equal(manualChildSpan.parentSpanId, manualParentSpan.spanContext().spanId, 'parent is set on child');

    const spanWithAttributes = runActiveSpanWithAttributes();
    assert.ok(spanWithAttributes, 'span was created');
    assert.deepEqual(spanWithAttributes.attributes, { 'attribute a': 'value a', 'attribute b': 'value b' });

    const spanWithSemanticAttributes = runActiveSpanWithSemanticAttributes();
    assert.ok(spanWithSemanticAttributes, 'span was created');
    assert.deepEqual(spanWithSemanticAttributes.attributes, { [SemanticAttributes.CODE_FUNCTION]: 'runActiveSpanWithSemanticAttributes', [SemanticAttributes.CODE_FILEPATH]: __filename });

    const spanWithEvents = runActiveSpanWithEvents();
    assert.ok(spanWithEvents, 'span was created');
    assert.ok(Array.isArray(spanWithEvents.events), 'events present');
    assert.equal(spanWithEvents.events.length, 1, 'events created');
    assert.equal(spanWithEvents.events[0].name, 'the event name');

    const spanWithLinks = runActiveSpanWithLinks();
    assert.ok(spanWithLinks, 'span was created');
    assert.ok(Array.isArray(spanWithLinks.links), 'links are present');
    assert.equal(spanWithLinks.links.length, 1, 'links are ok');

    console.log('ok');
}

run();