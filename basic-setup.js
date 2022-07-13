'use strict';

const opentelemetry = require('@opentelemetry/sdk-node');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const sdk = new opentelemetry.NodeSDK({
  serviceName: 'the service name',
  traceExporter: new opentelemetry.tracing.ConsoleSpanExporter(),
});

sdk.start();