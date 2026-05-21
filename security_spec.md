# Security Specification

## 1. Data Invariants
- Users can read all users but only update themselves (except role, which must be immutable by the user).
- Users can read all balances but only their own balance can be updated (by admin/manager, or by system). Actually users shouldn't be able to edit their own balances. Only managers can edit balances, or system sync.
- Users can create leave requests for themselves (`userId == request.auth.uid`). They can read their own.
- Managers can read all leave requests, and they can approve/reject them.
- Users cannot change the status of their requests.

## 2. The "Dirty Dozen" Payloads
1. User creates a request for another user (Identity spoofing).
2. User updates the status of their own request (State shortcutting).
3. User deletes a request they don't own.
4. User queries all requests without a filter.
5. User creates a request with a huge string for reason.
6. User modifies their role to "manager" in user profile.
7. User reads balances without being authenticated.
8. Manager changes another user's role (maybe allowed, but let's restrict to system).
9. User passes missing missing fields during request creation.
10. Unauthenticated user creating a user doc.
11. PII exposure: reading users list (if email is exposed). We should probably isolate this or allow basic reading.
12. Updating an immutable field like requestedAt.

## 3. Test Runner
We'll create `firestore.rules.test.ts` to implement tests.
