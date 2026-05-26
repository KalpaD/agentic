# Gantt Chart — Personal Finance Manager Delivery

Assumes a single engineer, 1 story point = 1 working day, weekends excluded.
Start date: 2026-06-01. Estimated completion: 2026-11-12 (~24 weeks).

Parallel tracks within each phase are shown as concurrent bars.

```mermaid
gantt
    title PFM Full Delivery — Gantt Chart
    dateFormat  YYYY-MM-DD
    excludes    weekends

    section Backend Foundation
    BE-001 Backend Foundation (5pt)          :be001, 2026-06-01, 5d
    BE-002 Database Layer (5pt)              :be002, after be001, 5d
    BE-003 OpenAPI Specification (5pt)       :be003, after be002, 5d
    BE-004 Cognito JWT Auth Middleware (5pt) :be004, after be001, 5d

    section Backend — Accounts
    BE-005 List Accounts (2pt)               :be005, after be004, 2d
    BE-006 Create Account (3pt)              :be006, after be005, 3d
    BE-007 Delete Account (2pt)              :be007, after be006, 2d

    section Backend — Categories
    BE-008 List Categories (2pt)             :be008, after be004, 2d
    BE-009 Create Category (3pt)             :be009, after be008, 3d
    BE-010 Delete Category (2pt)             :be010, after be009, 2d

    section Backend — Transactions
    BE-011 List Transactions (5pt)           :be011, after be007, 5d
    BE-012 Create Transaction (3pt)          :be012, after be011, 3d
    BE-013 Update Transaction (3pt)          :be013, after be012, 3d
    BE-014 Delete Transaction (2pt)          :be014, after be013, 2d

    section Frontend Foundation
    FE-001 Frontend Foundation (5pt)         :fe001, after be014, 5d

    section Frontend — Auth
    FE-002 Register Page (3pt)               :fe002, after fe001, 3d
    FE-003 Email Verification Page (2pt)     :fe003, after fe002, 2d
    FE-004 Login Page (3pt)                  :fe004, after fe003, 3d
    FE-005 Sign Out + Protected Routes (2pt) :fe005, after fe004, 2d
    FE-006 orval API Codegen (3pt)           :fe006, after fe001, 3d

    section Frontend — Accounts
    FE-007 Account List (3pt)                :fe007, after fe005, 3d
    FE-008 Create Account (2pt)              :fe008, after fe007, 2d
    FE-009 Delete Account (2pt)              :fe009, after fe008, 2d

    section Frontend — Transactions
    FE-010 View Transaction List (3pt)       :fe010, after fe009, 3d
    FE-011 Filter Transactions (3pt)         :fe011, after fe010, 3d
    FE-012 Paginate Transactions (2pt)       :fe012, after fe011, 2d
    FE-013 Add Transaction (3pt)             :fe013, after fe012, 3d
    FE-014 Edit Transaction (3pt)            :fe014, after fe013, 3d
    FE-015 Delete Transaction (2pt)          :fe015, after fe014, 2d

    section Frontend — Categories
    FE-016 Category List + Create (3pt)      :fe016, after fe015, 3d
    FE-017 Delete Category (2pt)             :fe017, after fe016, 2d

    section Integration & E2E
    INT-001 Docker Compose Full Stack (5pt)  :int001, after fe017, 5d
    INT-002 Playwright E2E Tests (5pt)       :int002, after int001, 5d

    section Infrastructure — Foundation
    INF-001 Terraform Project Setup (2pt)    :inf001, after int002, 2d
    INF-002 Networking VPC + Subnets (3pt)   :inf002, after inf001, 3d
    INF-004 ECR Repository (1pt)             :inf004, after inf001, 1d

    section Infrastructure — Supporting Services
    INF-003 Security Groups (2pt)            :inf003, after inf002, 2d
    INF-005 Cognito User Pool (3pt)          :inf005, after inf001, 3d
    INF-006 Secrets Manager (2pt)            :inf006, after inf002, 2d

    section Infrastructure — Data + Compute
    INF-007 RDS PostgreSQL (3pt)             :inf007, after inf003, 3d
    INF-008 ECS Cluster + Task Def (5pt)     :inf008, after inf007, 5d
    INF-009 ALB + ACM Certificate (5pt)      :inf009, after inf003, 5d
    INF-010 ECS Service + Autoscaling (3pt)  :inf010, after inf008, 3d

    section Infrastructure — CDN + CI/CD
    INF-011 S3 Bucket for SPA (2pt)          :inf011, after inf002, 2d
    INF-012 CloudFront Distribution (3pt)    :inf012, after inf011, 3d
    INF-013 GitHub Actions CI/CD (8pt)       :inf013, after inf010, 8d
```

## Summary

| Phase | Stories | Points | Approx Duration |
|-------|---------|--------|-----------------|
| Backend | 14 | 47 | ~10 weeks |
| Frontend | 17 | 46 | ~9.5 weeks |
| Integration | 2 | 10 | ~2 weeks |
| Infrastructure | 13 | 42 | ~8.5 weeks (with parallel tracks) |
| **Total** | **46** | **145** | **~24 weeks** |

> Parallel tracks within Backend (Accounts + Categories) and Infrastructure (Networking, Cognito, Secrets, S3 in parallel) compress the calendar timeline. With two engineers the total delivery could be reduced to approximately 16–18 weeks.
