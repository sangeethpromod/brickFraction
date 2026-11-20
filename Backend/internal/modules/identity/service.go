package identity

import (
	"context"
	"fmt"
	"strings"
)

// Service holds the identity business rules.
type Service struct{ repo Repository }

// NewService builds a Service on top of a Repository.
func NewService(repo Repository) *Service { return &Service{repo: repo} }

// RolesFor returns the roles a user holds, without changing anything.
// It also satisfies middleware.RoleChecker.
func (s *Service) RolesFor(ctx context.Context, userID string) ([]string, error) {
	roles, err := s.repo.RolesForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load roles: %w", err)
	}
	return roles, nil
}

// Me returns the caller's roles. A user who has not finished onboarding has none, and that is fine.
func (s *Service) Me(ctx context.Context, userID string) (UserRoles, error) {
	roles, err := s.RolesFor(ctx, userID)
	if err != nil {
		return UserRoles{}, err
	}
	return UserRoles{UserID: userID, Roles: roles}, nil
}

// GrantRole gives targetUserID the role and returns their roles afterwards.
// actorID is the admin doing it. Who may call this is enforced by the route, not here.
func (s *Service) GrantRole(ctx context.Context, actorID, targetUserID, role string) ([]string, error) {
	if strings.TrimSpace(targetUserID) == "" {
		return nil, ErrInvalidUser
	}
	if !IsValidRole(role) {
		return nil, ErrInvalidRole
	}
	if err := s.repo.AssignRole(ctx, targetUserID, role, actorID); err != nil {
		return nil, fmt.Errorf("grant role: %w", err)
	}
	return s.RolesFor(ctx, targetUserID)
}
