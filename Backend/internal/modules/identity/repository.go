package identity

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository is the storage the identity service needs.
type Repository interface {
	// RolesForUser returns the user's role names, sorted. It never returns nil.
	RolesForUser(ctx context.Context, userID string) ([]string, error)
	// AssignRole grants a role. Granting a role the user already has is not an error.
	// grantedBy is the admin's user id, or "" when the system grants it.
	AssignRole(ctx context.Context, userID, role, grantedBy string) error
}

type pgRepository struct{ pool *pgxpool.Pool }

// NewRepository returns a Postgres-backed Repository.
func NewRepository(pool *pgxpool.Pool) Repository { return &pgRepository{pool: pool} }

func (r *pgRepository) RolesForUser(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT r.name
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name`, userID)
	if err != nil {
		return nil, fmt.Errorf("query user roles: %w", err)
	}
	roles, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("read user roles: %w", err)
	}
	if roles == nil {
		roles = []string{} // so JSON shows [] and not null
	}
	return roles, nil
}

func (r *pgRepository) AssignRole(ctx context.Context, userID, role, grantedBy string) error {
	// The explicit ::text casts tell Postgres the parameter types inside INSERT ... SELECT.
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id, granted_by)
		SELECT $1::text, id, NULLIF($3::text, '')
		FROM roles
		WHERE name = $2
		ON CONFLICT (user_id, role_id) DO NOTHING`, userID, role, grantedBy)
	if err != nil {
		return fmt.Errorf("assign role %q: %w", role, err)
	}
	return nil
}
