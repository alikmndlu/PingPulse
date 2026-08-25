package domain

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrInvalidInput      = errors.New("invalid input")
	ErrInvalidHost       = errors.New("invalid host")
	ErrDuplicateTarget   = errors.New("a target with this host already exists")
	ErrDuplicateGroup    = errors.New("a group with this name already exists")
	ErrMonitoringStopped = errors.New("monitoring is not running")
	ErrSecretRedacted    = errors.New("secret value must not be logged")
)

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	if e.Field == "" {
		return e.Message
	}
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func (e *ValidationError) Unwrap() error {
	return ErrInvalidInput
}

func NewValidationError(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

type PingError struct {
	Host    string
	Cause   string
	Timeout string
}

func (e *PingError) Error() string {
	if e.Timeout != "" {
		return fmt.Sprintf("Unable to ping %s: timeout after %s", e.Host, e.Timeout)
	}
	if e.Cause != "" {
		return fmt.Sprintf("Unable to ping %s: %s", e.Host, e.Cause)
	}
	return fmt.Sprintf("Unable to ping %s", e.Host)
}
