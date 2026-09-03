# Security Specification for Boutique CRM

## 1. Data Invariants
- **Lead Invariants:**
  - `nomeBoutique` must be a non-empty string under 100 characters.
  - `stato` must be one of the pre-defined states: `'Lead Freddo'`, `'In Contatto'`, `'Titolare Agganciato'`, `'Call Fissata'`, or `'Non Interessato'`.
  - Optional fields (`titolare`, `telefono`, `email`, `ultimaNota`) must respect their respective size constraints to prevent resource poisoning.
- **Subresource Connection Invariants:**
  - A `Note` cannot be added to a lead that does not exist.
  - A `Task` cannot be added to a lead that does not exist.
  - Every note text and task title must adhere to string length limitations.

## 2. The "Dirty Dozen" Payloads (Deny Scenarios)
1. **Invalid Lead State:** Adding a lead with state `'Super Hot'` (non-existent).
2. **Missing Required Fields:** Adding a lead without a `nomeBoutique`.
3. **Payload Bloating (Lead Name):** Creating a lead with a 10MB name to cause Denial of Wallet.
4. **Payload Bloating (Email):** Creating a lead with a massive email field.
5. **Orphan Note:** Creating a note under a non-existent lead ID.
6. **Task Scadenza Validation:** Creating a task with an excessively long expiration date string.
7. **Type Poisoning (Completato):** Updating a task with `completato: "YES"` (string instead of boolean).
8. **Immutable Field Tampering:** Attempting to rewrite the `createdAt` timestamp of an existing lead.
9. **Spamming Note Size:** Creating a note with a text body exceeding 5,000 characters.
10. **State Skipping Guard:** Attempting an update that injects random unapproved keys.
11. **Malicious ID Poisoning:** Writing to a document ID with non-alphanumeric characters.
12. **Status Tampering via Ghost Fields:** Injecting fields like `isAdmin: true` into a lead payload.

## 3. Test Runner Definition
We will verify that our rules reject these malicious payloads.
