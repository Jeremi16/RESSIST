package apikey

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type createRequest struct {
	Name           string `json:"name" binding:"required"`
	ExpiresInDays  *int   `json:"expires_in_days"`
}

type keyResponse struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Prefix     string  `json:"prefix"`
	Scopes     string  `json:"scopes"`
	ExpiresAt  *string `json:"expires_at"`
	LastUsedAt *string `json:"last_used_at"`
	RevokedAt  *string `json:"revoked_at"`
	CreatedAt  string  `json:"created_at"`
}

type createResponse struct {
	keyResponse
	ApiKey string `json:"api_key"` // raw key, only once
}

func toKeyResponse(k interface{ GetID() string }) keyResponse {
	_ = k
	return keyResponse{}
}

func formatTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}

func (h *Handler) List(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	keys, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list api keys"})
		return
	}
	resp := make([]keyResponse, 0, len(keys))
	for _, k := range keys {
		resp = append(resp, keyResponse{
			ID:         k.ID,
			Name:       k.Name,
			Prefix:     k.Prefix,
			Scopes:     k.Scopes,
			ExpiresAt:  formatTime(k.ExpiresAt),
			LastUsedAt: formatTime(k.LastUsedAt),
			RevokedAt:  formatTime(k.RevokedAt),
			CreatedAt:  k.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, gin.H{"keys": resp})
}

func (h *Handler) Create(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	record, raw, err := h.svc.Create(c.Request.Context(), userID, req.Name, req.ExpiresInDays)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidName):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid name (1-64 chars)"})
		case errors.Is(err, ErrInvalidExpiry):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expires_in_days (1-3650)"})
		case errors.Is(err, ErrTooManyKeys):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create api key"})
		}
		return
	}
	c.JSON(http.StatusCreated, createResponse{
		keyResponse: keyResponse{
			ID:         record.ID,
			Name:       record.Name,
			Prefix:     record.Prefix,
			Scopes:     record.Scopes,
			ExpiresAt:  formatTime(record.ExpiresAt),
			LastUsedAt: formatTime(record.LastUsedAt),
			RevokedAt:  formatTime(record.RevokedAt),
			CreatedAt:  record.CreatedAt.UTC().Format(time.RFC3339),
		},
		ApiKey: raw,
	})
}

func (h *Handler) Delete(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	keyID := strings.TrimSpace(c.Param("id"))
	if keyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}
	if err := h.svc.Revoke(c.Request.Context(), userID, keyID); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "api key not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke api key"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
