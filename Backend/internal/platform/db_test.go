package platform

import (
	"context"
	"os"
	"testing"
)

func TestPing(t *testing.T) {
	u := os.Getenv("DATABASE_URL")
	if u == "" {
		t.Skip("DATABASE_URL not set")
	}
	p, err := NewPool(context.Background(), u)
	if err != nil {
		t.Fatalf("connect failed: %T", err)
	}
	defer p.Close()
	var one int
	if err := p.QueryRow(context.Background(), "select 1").Scan(&one); err != nil || one != 1 {
		t.Fatal("query failed")
	}
}
