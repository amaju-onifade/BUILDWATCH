# BuildWatch Tier 3 Walkthrough — Trust & Retention

With the completion of Tier 3, BuildWatch has matured from a tracking tool into a formal, high-integrity accountability platform. Below is a walkthrough of the new features that establish project health and formal compliance.

---

## 1. Project Health Analytics 📊

The **Project Detail Page** now includes a specialized health indicator that compares financial progress against construction timeline progress.

- **Metric**: `Approved Phases / Total Phases` vs. `Spent to Date / Total Budget`.
- **UI Insight**: A status card at the top of the dashboard displays whether a project is **"On Track"**, **"At Risk"**, or **"Over Budget"**.
- **Action**: Owners can now see at a glance if the construction speed matches the rate of spending, preventing "fund-dumping" before tangible results are achieved on site.

---

## 2. Formal PDF Dossier Generation 📄

For the first time, Project Owners can generate a formal, portable record of their construction progress that is external to the app.

- **Access**: A new **"Download Project Dossier"** button is located in the dashboard sidebar.
- **Content**: The PDF includes:
    - Verified Project Identity and Location.
    - Full Milestone History (Approval timestamps and signatures).
    - Photo Submission Logs with Geolocation verification.
    - **Legal Non-Repudiation**: A mandatory digital signature disclaimer and audit verification log.
- **Use Case**: This dossier can be used for insurance claims, property valuation, or legal proof in the event of contractor disputes.

---

## 3. Cryptographic Non-Repudiation 🔐

Under the hood, every critical action (Milestone Approval, Unlock, or Budget Update) is now "sealed" with a cryptographic signature.

- **Mechanism**: Data points (Actor ID, Resource ID, Timestamp) are hashed using **HMAC-SHA256** and stored in the `AuditEvents` table.
- **Integrity**: If a record is manually modified in the database by an unauthorized entity, the signature will immediately fail verification, alerting the system to data tampering.
- **Verification**: While technical, this system provides the homeowner with the same level of security as a "digital notary."

---

## 4. Inspector Network Interest Capture 🕵️‍♂️

Preparing for post-MVP expansion, the main dashboard now allows owners to express interest in professional vetting.

- **Location**: The bottom of the primary Owner Dashboard.
- **Functionality**: A **"Request Certified Inspector"** CTA opens a registration portal for independent professionals to join the vetting pipeline.
- **Purpose**: This starts to build the side of the marketplace that will eventually allow for independent site inspections for diaspora owners who want more than just photo verification.

---

### How to Test Tier 3 Features Now:

1.  **View Health**: Open any project on your `localhost:3000/projects/[id]` to see the new health card.
2.  **Generate Report**: Click the **Download Dossier** button on that same page.
3.  **Register Interest**: Scroll to the bottom of the main dashboard to find the Inspector Network stub.

---
© 2026 BuildWatch PWA · Tier 3 Completion Dossier
