FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

ENV GOPROXY=https://proxy.golang.org,direct

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-w -s" -o /ressist-bot ./cmd/bot

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget && adduser -D -g '' appuser
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
USER appuser
WORKDIR /home/appuser

COPY --from=builder /ressist-bot /usr/local/bin/ressist-bot

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8081/livez || exit 1
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/ressist-bot"]
