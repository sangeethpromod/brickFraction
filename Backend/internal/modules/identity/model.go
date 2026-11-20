// Package identity manages which roles a user holds.
// Authentication (who you are) is done by Better Auth; this module decides what you may do.
package identity

import (
	"errors"
	"slices"
)

// Role names. They must match the rows seeded in migrations/00002_roles.sql.
const (
	RoleInvestor        = "investor"
	RoleIssuer          = "issuer"
	RolePropertyManager = "property_manager"
	RoleTenant          = "tenant"
	RolePlatformAdmin   = "platform_admin"
)

var allRoles = []string{RoleInvestor, RoleIssuer, RolePropertyManager, RoleTenant, RolePlatformAdmin}

// IsValidRole reports whether name is one of the known roles.
func IsValidRole(name string) bool { return slices.Contains(allRoles, name) }

// UserRoles is what GET /me returns.
type UserRoles struct {
	UserID string   `json:"user_id"`
	Roles  []string `json:"roles"`
}

// Domain errors. The controller maps them to HTTP statuses.
var (
	ErrInvalidRole = errors.New("invalid role")
	ErrInvalidUser = errors.New("invalid user id")
)
