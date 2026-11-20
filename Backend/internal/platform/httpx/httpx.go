// Package httpx holds small helpers for reading and writing JSON.
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// maxBodyBytes caps request bodies so a client cannot make us read gigabytes.
const maxBodyBytes = 1 << 20 // 1 MB

// ErrorBody is the one error format every endpoint uses.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail has a stable machine-readable code and a human-readable message.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON writes v as a JSON response with the given status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	// The status line is already sent, so an encoding error cannot be reported to the client.
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes an error in the standard format.
func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, ErrorBody{Error: ErrorDetail{Code: code, Message: message}})
}

// DecodeJSON reads exactly one JSON value from the request body into dst.
// It rejects unknown fields, oversized bodies and trailing data.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return errors.New("body must contain a single JSON value")
	}
	return nil
}
