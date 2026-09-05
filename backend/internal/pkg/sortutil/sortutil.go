package sortutil

import "strings"

const (
	DeadlineAsc  = "deadline_asc"
	DeadlineDesc = "deadline_desc"
	Newest       = "newest"
	Oldest       = "oldest"
)

func Parse(sortQuery string) string {
	switch strings.TrimSpace(strings.ToLower(sortQuery)) {
	case DeadlineDesc:
		return DeadlineDesc
	case Newest:
		return Newest
	case Oldest:
		return Oldest
	default:
		return DeadlineAsc
	}
}

func OrderClause(sortBy string) string {
	switch sortBy {
	case DeadlineDesc:
		return "deadline desc"
	case Newest:
		return "created_at desc"
	case Oldest:
		return "created_at asc"
	default:
		return "deadline asc"
	}
}
