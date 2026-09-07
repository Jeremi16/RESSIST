FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

ENV GOPROXY=https://proxy.golang.org,direct

WORKDIR /app

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-w -s" -o /resisst-api ./cmd/api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget && adduser -D -g '' appuser
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
USER appuser
WORKDIR /home/appuser

COPY --from=builder /resisst-api /usr/local/bin/resisst-api

HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=10s CMD sh -c 'wget -qO- http://127.0.0.1:${PORT:-8080}/livez || exit 1'
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/resisst-api"]
