FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

ENV GOPROXY=https://proxy.golang.org,direct

WORKDIR /app

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /resisst-api ./cmd/api

FROM alpine:3.21
RUN adduser -D -g '' appuser
USER appuser
WORKDIR /home/appuser

COPY --from=builder /resisst-api /usr/local/bin/resisst-api

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/resisst-api"]
