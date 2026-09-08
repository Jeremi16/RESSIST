package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	metricsOnce sync.Once

	httpRequestsTotal *prometheus.CounterVec
	httpRequestLatMS  *prometheus.HistogramVec
)

func initMetrics() {
	metricsOnce.Do(func() {
		httpRequestsTotal = prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "ressist_http_requests_total",
				Help: "Total number of HTTP requests.",
			},
			[]string{"method", "path", "status"},
		)
		httpRequestLatMS = prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "ressist_http_request_latency_ms",
				Help:    "HTTP request latency in milliseconds.",
				Buckets: []float64{5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
			},
			[]string{"method", "path", "status"},
		)

		prometheus.MustRegister(httpRequestsTotal, httpRequestLatMS)
	})
}

func HTTPMetrics() gin.HandlerFunc {
	initMetrics()

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		statusCode := c.Writer.Status()
		status := strconv.Itoa(statusCode)

		httpRequestsTotal.WithLabelValues(c.Request.Method, path, status).Inc()
		httpRequestLatMS.WithLabelValues(c.Request.Method, path, status).Observe(float64(time.Since(start).Milliseconds()))
	}
}

func PrometheusHandler() gin.HandlerFunc {
	handler := promhttp.Handler()
	return gin.WrapH(handler)
}
