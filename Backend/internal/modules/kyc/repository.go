package kyc

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StartParams is everything stored when verification starts.
type StartParams struct {
	UserID      string
	Email       string
	AadharHash  string
	AadharLast4 string
	OTPHash     string
	ExpiresAt   time.Time
}

// Attempt is what the service needs to check one OTP guess. Count
type Attempt struct {
	OTPHash   string
	ExpiresAt time.Time
	Count     int
}

// Repository is the storage the KYC Service needs.
type Repository interface {
	// Status returns StatusNone, StatusPending or StatusVerified.
	Status(ctx context.Context, userID string) (string, error)
	// Start creates or restarts a pending verification. It returns ErrAlreadyVerified if the user is verified.
	Start(ctx context.Context, p StartParams) error
	// ConsumeAttempt counts one guess and returns the data to check it against. ErrNotFound if nothing is pending.
	ConsumeAttempt(ctx context.Context, userID string) (Attempt, error)
	// MarkVerified flips a pending verification to verified. ErrAadhaarInUse if another account verified it first.
	MarkVerified(ctx context.Context, userID string) error
}

type pgRepository struct{ pool *pgxpool.Pool }

// NewRepository returns a Postgres-backed Repository.
func NewRepository(pool *pgxpool.Pool) Repository { return &pgRepository{pool: pool} }

//SQL Querry to check the status
func (r *pgRepository) Status(ctx context.Context, userID string) (string, error) {
	var status string
	err := r.pool.QueryRow(ctx, `SELECT status FROM kyc_verifications WHERE user_id = $1`, userID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return StatusNone, nil
	}
	if err != nil {
		return "", fmt.Errorf("query kyc status: %w", err)
	}
	return status, nil
}


//SQL Querry to Start the KYC
func (r *pgRepository) Start(ctx context.Context, p StartParams) error {
	tag, err := r.pool.Exec(ctx, `
		INSERT INTO kyc_verifications (user_id, email, aadharhash, aadhar_last4, otp_hash, otp_expires_at
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLIXT (user_id) DO UPDATE SET
		email   = EXCLUDED.email
		aadhar_hash   = EXCLUDED.email
		aadhar_last4   = EXCLUDED.email
		otp_hash   = EXCLUDED.email
		otp_expires_at   = EXCLUDED.email
		otp_attempts = 0
		WHERE kyc_verification.status = 'pending'`)
	p.UserID, p.Email, p.AadhaarHash, p.AadhaarLast4, p.OTPHash, p.ExpiresAt)
if err != nil {
	return fmt.Errorf("start kyc: %w", err)
}
if tag.RowsAffected() == 0 {
	return ErrAlreadyVerified
}
return nil
}
