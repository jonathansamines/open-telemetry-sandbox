# open-telemetry-sandbox
A sandbox to play around open telemetry features

## Testing context propagation features

Run the instrumented code:

```bash
> node opentelemetry-api-context.js
ok
```

## Testing basic tracer features

Run the instrumented code:

```bash
> node -r ./setup-basic.js opentelemetry-trace.js
ok
```

## Testing advanced tracer features

```bash
> node -r ./setup-tracing.js opentelemetry-tracing.js

ok
```

## Testing with jeager exporter

Start the jeager server:

```bash
> docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Run the instrumented code:

```bash
> node -r ./setup-exporter-jeager.js opentelemetry-tracing.js
ok
```

## Testing with zipking exporter

Start a zipkin server:

```bash
> docker run --rm -d -p 9411:9411 --name zipkin openzipkin/zipkin
```

Run the instrumented code:

```bash
> node -r ./setup-exporter-zipkin.js opentelemetry-tracing.js
```