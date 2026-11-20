package middleware

import "net/http"

// CORS lets the browser app at allowedOrigin call this API, and answers preflight requests.
// Requests from any other origin get no CORS headers, so the browser blocks them.
func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Add("Vary", "Origin") // responses differ by Origin, so caches must not mix them

			if r.Header.Get("Origin") == allowedOrigin {
				h.Set("Access-Control-Allow-Origin", allowedOrigin)
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				h.Set("Access-Control-Max-Age", "600")
			}

			if r.Method == http.MethodOptions { // preflight: nothing more to do
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
