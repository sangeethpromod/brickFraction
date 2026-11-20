// File: Backend/internal/modules/kyc/model.go
// Package kyc verifies investors: an Aadhaar number plus the email linked to it, confirmed by an emailed OTP.
// DEMO ONLY: nothing here calls UIDAI. It proves control of an inbox, not identity.
// 

package kyc

import "errors"

//KYC States. "none" means no row exists yet.
const (
	StatusNone    = "none"
	StatusPending = "pending"
	StatusVerified = "verified"
)

// StatusResponse is what both endpoints return on success.
type StatusResponse struct {
	Status string `json: "status"`
} 

//Domain Errors. The message are safe to show to the user.

var (
	ErrInvalidAadhaar  = errors.New("aadhaar must be 12 digits")
	ErrInvalidEmail    = errors.New("enter a valid email address")
	ErrAlreadyVerified = errors.New("you are already verified")
	ErrAadhaarInUse    = errors.New("this aadhaar is already verified on another account")
	ErrNotFound        = errors.New("start verification first")
	ErrOTPInvalid      = errors.New("that code is not correct")
	ErrOTPExpired      = errors.New("that code has expired, request a new one")
	ErrTooManyAttempts = errors.New("too many wrong codes, request a new one")
)