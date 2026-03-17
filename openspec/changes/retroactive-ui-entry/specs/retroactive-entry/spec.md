# Retroactive Entry - Specification

## Capability

Enable users to create records with past dates through the UI, with automatic integration into the historical tracking system.

## Requirements

### REQ-001: Past Date Selection
**Priority**: High
**Status**: Proposed

Users SHALL be able to select any past date in form date pickers for:
- Rental ledger start dates
- Payment entry dates
- Rider onboarding dates

### REQ-002: Confirmation Dialog
**Priority**: High
**Status**: Proposed

When a user selects a past date, the system SHALL display a confirmation dialog that:
- Clearly states the selected date is in the past
- Explains the entry will be marked as historical
- Shows the confidence score (70%) for manual entries
- Provides Cancel and Confirm options

### REQ-003: Historical Tracking Integration
**Priority**: High
**Status**: Proposed

Records created with past dates SHALL automatically receive:
- `is_historical_import = TRUE`
- `data_source = 'MANUAL_ENTRY'`
- `confidence_score = 0.70`
- `effective_start_date = [selected past date]`

### REQ-004: Retroactive Event Creation
**Priority**: Medium
**Status**: Proposed

A retroactive_event record SHALL be created for each UI-based historical entry to maintain the entity timeline.

### REQ-005: No Regression
**Priority**: High
**Status**: Proposed

Normal (current/future date) entry flows SHALL remain unchanged in behavior and appearance.

## Non-Functional Requirements

### NFR-001: Accessibility
The confirmation dialog SHALL be accessible via keyboard and screen readers.

### NFR-002: Performance
Past date detection SHALL add no more than 10ms to form submission time.

### NFR-003: Usability
The confirmation dialog SHALL use clear, non-technical language.

## Constraints

- Past dates are limited to dates after 2024-01-01 (platform inception)
- Only users with 'admin' or 'manager' roles can create historical entries (future consideration)
- Maximum 100 retroactive entries per day per user (future consideration)

## Out of Scope

- Editing existing records to change dates
- Bulk retroactive entry
- CSV import (handled by historical-data-management)
