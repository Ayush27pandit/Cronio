package job

import (
	"fmt"

	"github.com/google/uuid"
)

// TenantID is a distinct type for the Tenant seam.
// Explicit param per grilling decision — callers must supply it.
type TenantID uuid.UUID

// NewTenantID parses and validates a tenant UUID.
func NewTenantID(s string) (TenantID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return TenantID{}, fmt.Errorf("invalid tenant_id %q: %w", s, err)
	}
	return TenantID(id), nil
}

func (t TenantID) UUID() uuid.UUID { return uuid.UUID(t) }
func (t TenantID) String() string  { return uuid.UUID(t).String() }
func (t TenantID) IsZero() bool    { return uuid.UUID(t) == uuid.Nil }
