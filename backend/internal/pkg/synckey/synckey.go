package synckey

import (
	"strings"

	"github.com/jeremi16/resisst-api/internal/pkg/text"
)

func Build(provider, externalID, course, title string) string {
	if strings.TrimSpace(externalID) != "" {
		return provider + ":" + strings.TrimSpace(externalID)
	}
	return provider + ":" + text.Normalize(course) + ":" + text.Normalize(title)
}
