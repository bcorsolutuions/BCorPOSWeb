# 05 — Key Workflows (Text Diagrams)

## 1. POS Sale Transaction

```
Cashier login (PIN/JWT) 
   -> Select order type (dine-in/takeaway/retail sale)
   -> Add items (scan barcode / search / table order from KDS)
   -> [Restaurant] send to Kitchen (KOT created, pushed via SignalR to KDS)
   -> Apply discount/promotion (auto-applied rules + manual w/ permission check)
   -> Select payment method(s) (cash/card/wallet/credit/split)
   -> Payment capture
        -> if card/wallet: call Payment Gateway module -> await webhook/callback
        -> if offline: queue transaction locally, mark PendingSync
   -> Generate invoice (sequential number per branch/series)
   -> Post to Inventory (decrement stock, consume recipe/BOM if applicable)
   -> Post to Accounting (auto journal entry: Sales, Tax, COGS)
   -> Update Customer (loyalty points, purchase history) if linked
   -> Print/send receipt (thermal / email / WhatsApp / QR e-receipt)
   -> [If was offline] Sync worker replays queued sale with idempotency key
        -> Server validates stock/price against latest master data
        -> Conflict (e.g., oversold) -> flagged for Branch Manager review,
           sale still stands (never retroactively rejected)
```

## 2. Purchase-to-Stock

```
Purchase Officer creates Purchase Requisition
   -> [optional] RFQ sent to multiple suppliers
   -> Purchase Order created against chosen supplier + price list
   -> Approval (if PO value > approver's limit -> routed to Branch Manager/Owner)
   -> PO sent to supplier (print/email)
   -> Goods Receipt Note (GRN) created on delivery
        -> Match GRN quantities against PO (full/partial/over-receipt flag)
        -> Batch/expiry/serial capture at receipt
   -> Landed cost allocation (freight/duty apportioned to items)
   -> Stock updated (Inventory module), average/FIFO cost recalculated
   -> Supplier invoice matched (3-way match: PO / GRN / Invoice)
   -> Journal entry posted (Accounting): Inventory Dr, Accounts Payable Cr
   -> Payment to supplier recorded -> AP reduced
```

## 3. Sales Return / Refund

```
Cashier/Supervisor opens original invoice (scan receipt QR or search)
   -> Select items/quantities to return
   -> Reason code captured
   -> Approval required if beyond cashier's authority
   -> Refund method chosen (cash / original payment method / store credit)
   -> Inventory: stock reinstated (if resellable) or moved to Damaged/QC bin
   -> Accounting: reversing journal entry posted
   -> Customer loyalty points adjusted if applicable
   -> Credit/Debit note generated and linked to original invoice
```

## 4. Stock Transfer Between Branches

```
Branch A (source) creates Stock Transfer Request/Order
   -> Approval if required by policy
   -> Pick & pack, stock reduced from Branch A (status: In Transit)
   -> Transfer document printed/sent
   -> Branch B (destination) receives -> confirms received quantities
        -> Discrepancy (short/over) flagged for review
   -> Stock increased at Branch B on confirmation
   -> Both branches' ledgers updated; inter-branch journal entry if
      companies differ (inter-company transfer pricing)
```

## 5. Tenant Onboarding (SaaS Signup)

```
Prospect signs up (self-serve or via reseller)
   -> Tenant record created, default Company + Branch scaffolded
   -> Edition/plan selected -> License Management issues trial/paid license
   -> Owner account created, invited via email
   -> Setup wizard: business type selection (Restaurant/Retail/Pharmacy/...)
        -> pre-configures relevant modules, default chart of accounts,
           default tax rules per country, default number series
   -> Sample/starter data offered (product catalog template per industry)
   -> Owner invites additional users, assigns roles
   -> First POS device activated (device registration + branch binding)
   -> Trial countdown / usage metering begins (tracked by License module)
```

## 6. License Activation (On-Premise)

```
Reseller/customer installs on-prem package (Docker Compose)
   -> App requests license activation: hardware fingerprint + license key
        entered
   -> If internet available: online activation call to License Server
        -> License Server validates key, issues signed license token
             (edition, feature flags, expiry, max branches/users)
        -> Token cached locally, periodic re-validation (phone-home)
   -> If offline: manual activation via offline request/response file
        exchanged with reseller/BCor licensing team
   -> App enforces entitlements: modules not in the license are hidden,
        limits (branch/user count) enforced at creation time, expired
        license -> app enters read-only "grace mode" then locked mode
```

## 7. Kitchen Order Ticket (KDS) Flow

```
Waiter/Cashier sends order -> KOT created per kitchen section
        (grouped by prep station: grill, cold, bar, dessert)
   -> Pushed via SignalR to relevant Kitchen Display Screen(s)
   -> Kitchen marks item: Acknowledged -> Preparing -> Ready
   -> "Ready" status pushed back to waiter app / expo screen
   -> Waiter marks Served -> table status updated
   -> Bill remains open until all items served & payment settled
        -> Table freed on payment completion -> housekeeping status "Dirty"
           until reset to "Free"
```

## 8. Multi-Level Approval Pattern (generic)

```
Action requiring approval (void, large discount, PO over limit, negative
stock override, refund over limit)
   -> Requestor triggers action -> system checks requestor's own limit
        -> within limit: auto-approved, logged
        -> beyond limit: Approval Request created (status: Pending)
             -> routed to first role with sufficient limit in the branch's
                approval chain
             -> Approver notified (in-app + optional push/SMS)
             -> Approve (PIN or session) -> action executes, both requestor
                and approver IDs stored on the resulting record
             -> Reject -> requestor notified, action reverted/cancelled
```
