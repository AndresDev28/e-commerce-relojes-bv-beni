# GitHub Actions Security

## Purpose
Weekly automated security scanning for dependencies and source code.

## Requirements

### Requirement: Security Schedule
The security workflow MUST run weekly on Mondays at 06:00 UTC and on manual dispatch.

#### Scenario: Weekly scan
- GIVEN it is Monday 06:00 UTC
- WHEN the cron triggers
- THEN the security workflow MUST run

### Requirement: npm Audit
The security workflow MUST run npm audit --audit-level=high.

#### Scenario: Clean audit
- GIVEN no high-severity vulnerabilities
- WHEN npm audit runs
- THEN it MUST pass

#### Scenario: Vulnerable audit
- GIVEN a high-severity vulnerability exists
- WHEN npm audit runs
- THEN the workflow MUST fail

### Requirement: CodeQL
The security workflow MUST run CodeQL analysis for javascript.

#### Scenario: CodeQL scan
- GIVEN source code is present
- WHEN CodeQL analyzes
- THEN it MUST upload results to GitHub security tab

### Requirement: Trivy Scan
The security workflow MUST run Trivy filesystem scan for HIGH,CRITICAL severity.

#### Scenario: Trivy scan
- GIVEN the repository is checked out
- WHEN Trivy scans the filesystem
- THEN it MUST report only HIGH and CRITICAL findings
