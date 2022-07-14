'use strict';

const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

// optionally register automatic instrumentations

registerInstrumentations({
    instrumentations: [],
});

const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'the service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    })
)

const provider = new NodeTracerProvider({ resource })
const exporter = new ZipkinExporter();
const processor = new SimpleSpanProcessor(exporter);

provider.addSpanProcessor(processor);
provider.register();