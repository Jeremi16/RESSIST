package timeutil

import (
	"strconv"
	"strings"
	"time"
)

func FormatRemaining(deadline time.Time) string {
	now := time.Now()
	if !deadline.After(now) {
		return "deadline lewat"
	}
	diff := deadline.Sub(now)
	days := int(diff.Hours()) / 24
	hours := int(diff.Hours()) % 24
	minutes := int(diff.Minutes()) % 60
	if days > 0 {
		if hours > 0 {
			return strings.TrimSpace(strconv.Itoa(days)+" hari"+" "+strconv.Itoa(hours)+" jam")
		}
		return strconv.Itoa(days) + " hari"
	}
	if hours > 0 {
		if minutes > 0 {
			return strings.TrimSpace(strconv.Itoa(hours)+" jam"+" "+strconv.Itoa(minutes)+" menit")
		}
		return strconv.Itoa(hours) + " jam"
	}
	if minutes > 0 {
		return strconv.Itoa(minutes) + " menit"
	}
	return "kurang dari 1 menit"
}
