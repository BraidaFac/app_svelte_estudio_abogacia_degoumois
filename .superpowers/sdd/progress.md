# SDD Progress Ledger — Upgrade Branch

Branch: Upgrade
Merge base: 64f61d0916a46cf542d530a3a2324616900ce8e1
Started: 2026-08-26

## Plan 1: Bug Fixes & Quick Wins
- Task 1: Setup Vitest — DONE (5849bf6, review clean)
- Task 2: Fix search store bug — DONE (0dc045a, review clean)
- Task 3: Fix href typo + remove console.logs — DONE (6cdf8a2, review clean)
- Task 4: Move Google Fonts to app.html — DONE (e7fb0da, review clean)
- Task 5: Remove dotenv + create .env.example — DONE (d954654+3067823, review clean)
- Task 6: Add error page — DONE (c1c5861, review clean)
- Task 7: Add Prisma indexes — DONE (cdf7a6a, schema only — migrate skip prod DB)

## Plan 2: Code Quality
- Task 1: Extract createErrorResponse — DONE (d8e5549, review clean)
- Task 2: Extract form utils — DONE (f8a284b, review clean)
- Task 3: Unify DB queries — DONE (e64d737, review clean)
- Task 4: Replace manual validation with Zod — DONE (2b51237, review clean)
- Task 5: Clean any types + remove {#key} — DONE (b680a3d, review clean)

## Plan 3: Skeleton v3 + Svelte 5 Runes
- Task 1: Upgrade Skeleton dependencies — DONE
- Task 2: Migrate layout + modal system — DONE
- Task 3: Migrate BurgerBar + CasesContainer — DONE
- Task 4: Migrate modals — DONE
- Task 5: Migrate route pages — DONE
- Task 6: Verification — DONE (build ✓, 0 type errors, 14/14 tests)

## Plan 4: UX + Security
- Task 1: Case counts on home cards — PENDING
- Task 2: Empty state + mobile responsive — PENDING
- Task 3: Pagination in historial — PENDING
- Task 4: Fix hardcoded colors in ModalDetalles — PENDING
- Task 5: Rate limiting on login/signup — PENDING

## Minor findings to review at end
(accumulated during execution)
