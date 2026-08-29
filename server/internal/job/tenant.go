package job

import (
	"fmt"

	"github.com/google/uuid"
)

// TenantID is a distinct type for the tenant seam.
// Use it as an explicit param so the compiler catches swapped ids.
// Example: jobID is uuid.UUID, tenantID is job.TenantID — swapping them does not compile.
type TenantID uuid.UUID

// NewTenantID parses s as a UUID and returns a TenantID.
// Returns an error if s is not a valid UUID, so handlers can return 400.
func NewTenantID(s string) (TenantID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return TenantID{}, fmt.Errorf("invalid tenant_id %q: %w", s, err)
	}
	return TenantID(id), nil
}

// UUID returns the underlying uuid.UUID for DB calls.
func (t TenantID) UUID() uuid.UUID { return uuid.UUID(t) }

// String returns the canonical string form, for example "550e8400-e29b-41d4-a716-446655440000".
func (t TenantID) String() string { return uuid.UUID(t).String() }

// IsZero reports whether the tenant is the zero UUID. Create rejects zero tenants.
func (t TenantID) IsZero() bool { return uuid.UUID(t) == uuid.Nil }
