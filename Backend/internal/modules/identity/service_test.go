package identity

import (
	"context"
	"errors"
	"slices"
	"testing"
)

type assignCall struct{ userID, role, grantedBy string }

// fakeRepo is an in-memory Repository.
type fakeRepo struct {
	roles     map[string][]string
	assigned  []assignCall
	rolesErr  error
	assignErr error
}

func newFakeRepo(initial map[string][]string) *fakeRepo {
	if initial == nil {
		initial = map[string][]string{}
	}
	return &fakeRepo{roles: initial}
}

func (f *fakeRepo) RolesForUser(_ context.Context, userID string) ([]string, error) {
	if f.rolesErr != nil {
		return nil, f.rolesErr
	}
	out := slices.Clone(f.roles[userID])
	slices.Sort(out)
	if out == nil {
		out = []string{}
	}
	return out, nil
}

func (f *fakeRepo) AssignRole(_ context.Context, userID, role, grantedBy string) error {
	if f.assignErr != nil {
		return f.assignErr
	}
	f.assigned = append(f.assigned, assignCall{userID, role, grantedBy})
	if !slices.Contains(f.roles[userID], role) {
		f.roles[userID] = append(f.roles[userID], role)
	}
	return nil
}

func TestServiceMe(t *testing.T) {
	boom := errors.New("boom")

	tests := []struct {
		name         string
		repo         *fakeRepo
		wantRoles    []string
		wantAssigned []assignCall
		wantErr      error
	}{
		{
			name:      "new user becomes an investor, granted by the system",
			repo:      newFakeRepo(nil),
			wantRoles: []string{},
		},
		{
			name:      "user with a role is left alone",
			repo:      newFakeRepo(map[string][]string{"u1": {RolePlatformAdmin}}),
			wantRoles: []string{RolePlatformAdmin},
		},
		{
			name:      "several roles come back sorted",
			repo:      newFakeRepo(map[string][]string{"u1": {RoleIssuer, RoleInvestor}}),
			wantRoles: []string{RoleInvestor, RoleIssuer},
		},
		{
			name:    "read error is returned",
			repo:    &fakeRepo{roles: map[string][]string{}, rolesErr: boom},
			wantErr: boom,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := NewService(tc.repo)

			got, err := svc.Me(context.Background(), "u1")

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("Me() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Me() unexpected error: %v", err)
			}
			if got.UserID != "u1" || !slices.Equal(got.Roles, tc.wantRoles) {
				t.Errorf("Me() = %+v, want user u1 with roles %v", got, tc.wantRoles)
			}
			if !slices.Equal(tc.repo.assigned, tc.wantAssigned) {
				t.Errorf("assign calls = %v, want %v", tc.repo.assigned, tc.wantAssigned)
			}
		})
	}
}

func TestServiceGrantRole(t *testing.T) {
	boom := errors.New("boom")

	tests := []struct {
		name         string
		repo         *fakeRepo
		target, role string
		wantRoles    []string
		wantAssigned []assignCall
		wantErr      error
	}{
		{
			name:         "admin grants issuer",
			repo:         newFakeRepo(map[string][]string{"u2": {RoleInvestor}}),
			target:       "u2",
			role:         RoleIssuer,
			wantRoles:    []string{RoleInvestor, RoleIssuer},
			wantAssigned: []assignCall{{"u2", RoleIssuer, "admin1"}},
		},
		{
			name:         "granting twice is harmless",
			repo:         newFakeRepo(map[string][]string{"u2": {RoleIssuer}}),
			target:       "u2",
			role:         RoleIssuer,
			wantRoles:    []string{RoleIssuer},
			wantAssigned: []assignCall{{"u2", RoleIssuer, "admin1"}},
		},
		{
			name:    "unknown role is rejected before touching storage",
			repo:    newFakeRepo(nil),
			target:  "u2",
			role:    "emperor",
			wantErr: ErrInvalidRole,
		},
		{
			name:    "blank user id is rejected",
			repo:    newFakeRepo(nil),
			target:  "   ",
			role:    RoleIssuer,
			wantErr: ErrInvalidUser,
		},
		{
			name:    "storage error is returned",
			repo:    &fakeRepo{roles: map[string][]string{}, assignErr: boom},
			target:  "u2",
			role:    RoleIssuer,
			wantErr: boom,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := NewService(tc.repo)

			got, err := svc.GrantRole(context.Background(), "admin1", tc.target, tc.role)

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("GrantRole() error = %v, want %v", err, tc.wantErr)
				}
				if len(tc.repo.assigned) != 0 {
					t.Errorf("storage was called despite the error: %v", tc.repo.assigned)
				}
				return
			}
			if err != nil {
				t.Fatalf("GrantRole() unexpected error: %v", err)
			}
			if !slices.Equal(got, tc.wantRoles) {
				t.Errorf("roles = %v, want %v", got, tc.wantRoles)
			}
			if !slices.Equal(tc.repo.assigned, tc.wantAssigned) {
				t.Errorf("assign calls = %v, want %v", tc.repo.assigned, tc.wantAssigned)
			}
		})
	}
}
