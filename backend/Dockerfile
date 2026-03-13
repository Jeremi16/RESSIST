FROM golang:1.25-alpine AS builder

WORKDIR /app

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
