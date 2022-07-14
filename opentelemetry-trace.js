'use strict';

require('./setup-basic');

const assert = require('assert');
const timers = require('timers/promises');
const { trace, context, SpanStatusCode, SpanKind } = require('@opentelemetry/api');
const { SemanticAttributes } = require('@opentelemetry/semantic-conventions');

const tracer = trace.getTracer('the-lib', '1.0.0');

function abortOnTimeout(timeout = 0) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
}

function basicSpanUsage() {
    const span = tracer.startSpan('the basic span');
    span.end();
    return span;
}

async function asyncSpanUsage(timeout) {
    const controller = abortOnTimeout(timeout);
    const span = tracer.startSpan('async span usage');

    try {
        await timers.setTimeout(200, null, { signal: controller.signal });
        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
    } finally {
        span.end();
    }

    return span;
}

async function asyncSpanWithAttributes(timeout) {
    const controller = abortOnTimeout(timeout);
    const span = tracer.startSpan('the async span with attrs', {
        attributes: {
            'attribute a': 'value a',
            'attribute b': 'value b',
        },
    })

    try {
        await timers.setTimeout(200, null, { signal: controller.signal });
        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error);
    } finally {
        span.end();
    }

    return span;
}

async function asyncSpanWithSemanticAttributes(timeout) {
    const controller = abortOnTimeout(timeout);
    const span = tracer.startSpan('the span with semantic attributes', {
        attributes: {
            [SemanticAttributes.CODE_FUNCTION]: asyncSpanWithSemanticAttributes.name,
        },
        kind: SpanKind.INTERNAL,
    });

    try {
        await timers.setTimeout(200, null, { signal: controller.signal })
        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error);
    } finally {
        span.end();
    }

    return span;
}

function asyncChildSpanWithinActiveContext() {
    const subSpan = tracer.startSpan('the subspan within a parent context');
    subSpan.end();
    return subSpan;
}

async function asyncSpanWithActiveContext(timeout) {
    const controller = abortOnTimeout(timeout);
    const span = tracer.startSpan('the span with active context');
    const subContext = trace.setSpan(context.active(), span);

    let subSpan;

    try {
        subSpan = context.with(subContext, asyncChildSpanWithinActiveContext);

        await timers.setTimeout(200, null, { signal: controller.signal });

        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error);
    }

    return [span, subSpan];
}

function asyncSpanChildAlreadyStarted(subSpan) {
    subSpan.end();
    return subSpan;
}

async function asyncSpanWithStartedActiveContext(timeout) {
    const controller = abortOnTimeout(timeout);
    const span = tracer.startSpan('the span with active context');
    const subContext = trace.setSpan(context.active(), span);

    let subSpan;

    try {
        subSpan = tracer.startActiveSpan('the subspan already started', {}, subContext, asyncSpanChildAlreadyStarted);
        await timers.setTimeout(200, null, { signal: controller.signal });
        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error);
    }
    
    return [span, subSpan];
}

async function run() {
    await timers.setTimeout(200); // do something while SDK initializes

    const span = basicSpanUsage();
    assert.ok(span, 'span is created');

    const okSpan = await asyncSpanUsage(300);
    assert.ok(okSpan, 'span is created');
    assert.equal(okSpan.status.code, 1, 'span is successful');

    const failedSpan = await asyncSpanUsage(100);
    assert.ok(failedSpan, 'span is created');
    assert.equal(failedSpan.status.code, 2, 'span is failed');

    const okSpanWithAttributes = await asyncSpanWithAttributes(300);
    assert.ok(okSpanWithAttributes, 'span is created');
    assert.equal(okSpanWithAttributes.status.code, 1, 'span is successful');
    assert.deepEqual(okSpanWithAttributes.attributes, { 'attribute a': 'value a', 'attribute b': 'value b' });

    const failedSpanWithAttributes = await asyncSpanWithAttributes(100);
    assert.ok(failedSpanWithAttributes, 'span is created');
    assert.equal(failedSpanWithAttributes.status.code, 2, 'span is failed');
    assert.deepEqual(failedSpanWithAttributes.attributes, { 'attribute a': 'value a', 'attribute b': 'value b' });

    const okSpanWithSemanticAttributes = await asyncSpanWithSemanticAttributes(300);
    assert.ok(okSpanWithSemanticAttributes, 'span is created');
    assert.equal(okSpanWithSemanticAttributes.kind, 0, 'span kind is set');
    assert.equal(okSpanWithSemanticAttributes.status.code, 1, 'span is successful');
    assert.deepEqual(okSpanWithSemanticAttributes.attributes, { 'code.function': 'asyncSpanWithSemanticAttributes' });

    const failedSpanWithSemanticAttributes = await asyncSpanWithSemanticAttributes(100);
    assert.ok(failedSpanWithSemanticAttributes, 'span is created');
    assert.equal(failedSpanWithSemanticAttributes.kind, 0, 'span kind is set');
    assert.equal(failedSpanWithSemanticAttributes.status.code, 2, 'span is failed');
    assert.deepEqual(failedSpanWithSemanticAttributes.attributes, { 'code.function': 'asyncSpanWithSemanticAttributes' });

    const [okSpanWithActiveContext, okSubSpanWithActiveContext] = await asyncSpanWithActiveContext(300);
    assert.ok(okSpanWithActiveContext, 'span is created');
    assert.equal(okSpanWithActiveContext.status.code, 1, 'span is successful');
    assert.ok(okSubSpanWithActiveContext, 'subspan is created');
    assert.equal(okSubSpanWithActiveContext.parentSpanId, okSpanWithActiveContext.spanContext().spanId, 'subspan has the correct parent');

    const [failedSpanWithActiveContext, failedSubSpanWithActiveContext] = await asyncSpanWithActiveContext(100);
    assert.ok(failedSpanWithActiveContext, 'span is created');
    assert.equal(failedSpanWithActiveContext.status.code, 2, 'span is failed');
    assert.ok(failedSubSpanWithActiveContext, 'subspan is created');
    assert.equal(failedSubSpanWithActiveContext.parentSpanId, failedSpanWithActiveContext.spanContext().spanId, 'subspan has the correct parent');

    const [okSpanWithStartedActiveContext, okSubSpanWithStartedActiveContext] = await asyncSpanWithStartedActiveContext(300);
    assert.ok(okSpanWithStartedActiveContext, 'span is created');
    assert.equal(okSpanWithStartedActiveContext.status.code, 1, 'span is successful');
    assert.ok(okSubSpanWithStartedActiveContext, 'subspan is created');
    assert.equal(okSubSpanWithStartedActiveContext.parentSpanId, okSpanWithStartedActiveContext.spanContext().spanId, 'subspan has the correct parent');

    const [failedSpanWithStartedActiveContext, failedSubSpanWithStartedActiveContext] = await asyncSpanWithStartedActiveContext(100);
    assert.ok(failedSpanWithStartedActiveContext, 'span is created');
    assert.equal(failedSpanWithStartedActiveContext.status.code, 2, 'span is failed');
    assert.ok(failedSubSpanWithStartedActiveContext, 'subspan is created');
    assert.equal(failedSubSpanWithStartedActiveContext.parentSpanId, failedSpanWithStartedActiveContext.spanContext().spanId, 'subspan has the correct parent');
}

run();