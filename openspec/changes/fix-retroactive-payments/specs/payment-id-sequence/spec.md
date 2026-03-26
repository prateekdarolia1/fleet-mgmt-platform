# Spec: Payment ID Sequence

## ADDED Requirements

### Requirement: Generate sequential payment IDs
The system SHALL generate sequential payment IDs in the format `P###` (e.g., P001, P002, P003) when creating payment entries.

#### Scenario: First payment in system
- **WHEN** system creates the first payment entry
- **THEN** payment_id is set to "P001"

#### Scenario: Sequential payments
- **WHEN** system creates multiple payments in a batch
- **THEN** payment_ids are sequential (P001, P002, P003, etc.)
- **AND** no gaps exist in the sequence

#### Scenario: Continuing from existing payments
- **WHEN** existing max payment_id is "P050"
- **AND** system creates new payments
- **THEN** new payment_ids start from "P051"

### Requirement: Prevent payment ID collisions
The system SHALL prevent duplicate payment_id values when multiple ledgers are created concurrently.

#### Scenario: Concurrent ledger creation
- **WHEN** two users create ledgers simultaneously
- **THEN** each ledger gets unique sequential payment_ids
- **AND** no UNIQUE constraint violations occur

#### Scenario: Retry on collision
- **WHEN** payment insert fails due to UNIQUE constraint on payment_id
- **THEN** system recalculates the next payment_id
- **AND** system retries the insert (up to 3 times)
- **AND** system throws error if all retries fail

### Requirement: Calculate next ID from database MAX
The system SHALL calculate the next payment ID by querying the maximum existing payment_id value, parsing the numeric portion, and incrementing by 1.

#### Scenario: Calculate from P001
- **WHEN** max payment_id in database is "P001"
- **THEN** next payment_id is "P002"

#### Scenario: Calculate from P099
- **WHEN** max payment_id in database is "P099"
- **THEN** next payment_id is "P100"

#### Scenario: Empty database
- **WHEN** no payments exist in database
- **THEN** next payment_id is "P001"

### Requirement: Pad numeric portion with leading zeros
The system SHALL pad the numeric portion of payment_id with leading zeros to ensure consistent 3-digit format.

#### Scenario: Single digit padding
- **WHEN** numeric portion is 5
- **THEN** payment_id is "P005"

#### Scenario: Two digit padding
- **WHEN** numeric portion is 42
- **THEN** payment_id is "P042"

#### Scenario: Three digit (no padding needed)
- **WHEN** numeric portion is 123
- **THEN** payment_id is "P123"

#### Scenario: Four digit (extends format)
- **WHEN** numeric portion is 1234
- **THEN** payment_id is "P1234" (format extends naturally)

### Requirement: Generate IDs for batch inserts atomically
When inserting multiple payments in a batch, the system SHALL generate all payment_ids before insertion and ensure the entire batch succeeds atomically.

#### Scenario: Batch of 10 payments
- **WHEN** system needs to insert 10 retroactive payments
- **THEN** system calculates next starting ID (e.g., P051)
- **AND** system generates IDs P051 through P060
- **AND** system inserts all 10 payments in single operation
- **AND** if any insert fails, entire batch is rolled back

#### Scenario: Batch failure retry
- **WHEN** batch insert fails due to ID collision
- **THEN** system recalculates starting ID
- **AND** system regenerates all IDs for the batch
- **AND** system retries batch insert

### Requirement: Security deposit uses transaction_id
The security deposit payment SHALL use the transaction_id provided by the user as its payment_id, not the sequential system-generated ID.

#### Scenario: Security deposit with custom ID
- **WHEN** user provides transaction_id = "TXN4567"
- **AND** system creates security deposit payment
- **THEN** security deposit payment_id = "TXN4567"
- **AND** first rental payment uses sequential ID (e.g., P001)

#### Scenario: No transaction_id provided
- **WHEN** user does not provide transaction_id
- **THEN** security deposit uses sequential ID (e.g., P001)
- **AND** rental payments continue from P002

### Requirement: Handle ID parsing errors gracefully
If the payment_id format is unexpected or non-numeric, the system SHALL handle the error gracefully and fall back to a safe default.

#### Scenario: Malformed existing ID
- **WHEN** max payment_id cannot be parsed (e.g., "INVALID")
- **THEN** system logs warning
- **AND** system defaults to "P001" for new payments
- **AND** system does not crash or prevent ledger creation

#### Scenario: Mixed format IDs
- **WHEN** database contains mix of "P###" and custom transaction IDs
- **THEN** system searches only for "P###" format when calculating MAX
- **AND** ignores non-conforming IDs in calculation
