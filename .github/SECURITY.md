# Security Policy & Boundary Governance

## Supported Versions

Only the current `main` branch of `DeltaX-Public/deltax-connectome-entity` receives security updates.

| Branch | Supported          |
| ------ | ------------------ |
| main   | :white_check_mark: |
| < tag  | :x:                |

---

## Architecture & Boundary Declaration

This repository is a **public research entity and reproducibility harness**. 

1. **Public Scope:** Contains public connectome datasets, embodied gridworld environments, source-available adapters, verification tests, and reproducibility artifacts.
2. **Private Scope:** The sovereign, proprietary DeltaX Python runtime (`deltax-python-runtime`) and associated Canonical specifications are **strictly private and local**. They are never committed, mirrored, published, or referenced via private filesystem paths in this repository.
3. **Zero Secrets in Git:** No API keys, credentials, tokens, cookies, or private cryptographic keys belong in this repository or in commit histories. Automated secret scanning and push protection are active across the entire organization.

---

## Reporting a Vulnerability

We prioritize responsible disclosure and take security vulnerabilities seriously.

### How to Report

Please **do NOT** file a public issue or discuss potential vulnerabilities in public pull requests.

Instead, submit reports using GitHub's **Private Vulnerability Reporting**:
1. Navigate to the [Security tab](https://github.com/DeltaX-Public/deltax-connectome-entity/security) on GitHub.
2. Click **Report a vulnerability** under "Vulnerability reporting".
3. Provide:
   - A clear description of the vulnerability.
   - Exact steps to reproduce or proof-of-concept.
   - Assessment of impact on causal integrity, repository boundaries, or execution safety.

### Response & Triage Timeline

- **Initial Acknowledgement:** Within 48 hours.
- **Triage & Impact Assessment:** Within 5 business days.
- **Remediation & Patch Release:** Bounded by severity, with coordinated disclosure upon fix publication.

---

## Safe Harbor

Activities conducted in good faith under this policy, focused on identifying and responsibly reporting security vulnerabilities or boundary leaks without disrupting systems or degrading data integrity, will be treated with full safe-harbor protection.
