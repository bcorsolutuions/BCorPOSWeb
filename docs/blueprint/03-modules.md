# 03 — Module List

Each module below lists its primary responsibility and key sub-features.
Modules map 1:1 to Application-layer feature folders (see
[07 — API Structure](07-api-structure.md)) and to top-level route groups in
the frontend (see [08 — Frontend Structure](08-frontend-structure.md)).

## 1. POS Billing
- Touch/keyboard-optimized sale screen, barcode scan, quantity/weight entry
- Hold/recall bills, split/merge bills, multi-payment (cash/card/wallet/credit)
- Discounts (line & bill level), promotions engine, loyalty point redemption
- Returns/exchanges against original invoice, partial refunds
- Offline mode with local queue and sync
- Shift open/close (cash drawer), X/Z reports, cash reconciliation
- Receipt printing (thermal, 58/80mm), e-receipt (email/WhatsApp/QR)

## 2. Restaurant Management
- Table layout designer, table status (free/occupied/reserved/dirty)
- Order types: dine-in, takeaway, delivery, drive-thru
- Kitchen Order Ticket (KOT) routing by kitchen section, Kitchen Display Screen
- Modifiers/combo/meal-builder, recipe/BOM costing
- Split bill by seat/item, bill transfer between tables
- Delivery aggregator integration hooks (Talabat, Careem, Deliveroo, etc.)
- Reservation & waitlist

## 3. Supermarket / Retail Management
- Barcode/scale integration, PLU codes for weighted items
- Shelf/aisle location, planogram reference
- Promotions (BOGO, tiered discount, bundle), loyalty campaigns
- Rapid multi-item scan checkout, self-checkout ready API
- Price label/shelf-tag printing

## 4. Purchase Management
- Purchase requisition → RFQ → Purchase Order → GRN (Goods Receipt Note) workflow
- Supplier price lists & contracts, landed cost allocation
- Purchase returns, debit notes
- Approval workflow with configurable limits

## 5. Inventory Management
- Multi-warehouse/multi-branch stock, stock transfer between branches
- Batch/lot & expiry tracking, serial/IMEI tracking
- Stock adjustment/count (cycle count, physical count) with variance reporting
- Reorder level, automatic PO suggestion, ABC analysis
- Unit of measure conversion (pack/box/piece), recipe/BOM consumption

## 6. Sales Management
- Sales orders, quotations, invoicing (B2B and POS unified ledger)
- Price lists per customer group/branch, tiered/wholesale pricing
- Credit sales, aging, credit limit enforcement
- Sales targets, commission calculation

## 7. Customer Management / CRM
- Customer profile, groups, credit terms, loyalty tiers/points
- Purchase history, communication log (SMS/Email/WhatsApp sent)
- Customer feedback/complaints, birthday/anniversary campaigns
- Segmentation for marketing campaigns

## 8. Employee Management
- Employee profile, role assignment, branch assignment
- Attendance/shift scheduling, biometric device integration hook
- Sales-based commission/incentive, cashier performance
- Access PIN for POS, permission overrides per employee

## 9. Reports & Analytics
- Sales, purchase, inventory, financial, tax reports (drill-down, export)
- Branch comparison, product/category performance, hourly heatmaps
- Scheduled report delivery (email/WhatsApp), custom report builder
- Real-time dashboard tiles

## 10. License Management
- Tenant/company license issuance, edition & feature entitlements
- License key generation/activation/deactivation, hardware-lock for on-prem
- Expiry, grace period, renewal, usage limits (branches/users/transactions)
- Reseller/partner license portfolio view

## 11. System Administration
- Company/branch setup, fiscal year, tax configuration
- User & role management, permission matrix editor
- System-wide settings, number series/document numbering, printers/devices
- Data import/export, backup scheduling (on-prem), audit log viewer

## 12. Accounting / ERP Integration
- Chart of accounts mapping, auto journal entry from POS/purchase transactions
- VAT/Tax computation & filing-ready reports
- GL export (CSV/XML), bank reconciliation hooks
- Multi-currency support

## 13. Tally Integration
- Tally XML export/import (vouchers, ledgers, stock items)
- Two-way sync scheduler, mapping configuration (ledger ↔ POS account)
- Sync status/error log and manual re-push

## 14. Payment Gateway Integration
- Card/QR/wallet payment adapters (e.g., Stripe, PayTabs, Telr, mada, local gateways)
- Split/partial payment across methods, payment reconciliation
- Refund-to-source processing, webhook-based settlement confirmation

## 15. SMS / Email / WhatsApp Integration
- Transactional messages (invoice, OTP, low-stock alert, license expiry)
- Marketing campaigns/broadcast, template management (bilingual templates)
- Delivery status tracking, provider abstraction (Twilio, Meta WhatsApp
  Business API, local SMS gateways)

## 16. Dashboard
- Role-aware landing dashboard (owner/manager/cashier see different tiles)
- Sales KPIs, live branch status, top products, alerts (low stock, license expiry, pending approvals)
- Cross-company/cross-branch consolidated view for group owners

## 17. AI Features
- Demand forecasting & smart reorder suggestions
- Anomaly detection (unusual voids/discounts/refunds, shrinkage signals)
- Natural-language report query ("show me yesterday's best-selling item per branch")
- Dynamic pricing/promotion suggestions, customer churn prediction
- AI-assisted product categorization from name/image on data import
