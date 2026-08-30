import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Eye,
  IndianRupee,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

import Modal from "../components/Modal";
import { traderService } from "../redux/services/trader.service";
import TraderButton from "../components/ui/TraderButton";
import TraderCard from "../components/ui/TraderCard";
import TraderInput from "../components/ui/TraderInput";
import TraderPageHeader from "../components/ui/TraderPageHeader";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";
import TraderTextarea from "../components/ui/TraderTextarea";
import {
  formatCurrency,
  formatOptionalCurrency,
  formatWeight,
  getFirstValue,
  normalizeProcurement,
  safeNumber,
  unwrapProcurementList,
  valueOrNotAvailable,
} from "../utils/procurementPrint";

const procurementStatuses = ["All", "CONFIRMED", "PARTIALLY_PAID", "PAID"];
const paymentModes = ["All", "NEFT", "RTGS", "IMPS", "UPI", "CHEQUE", "CASH", "OTHER"];
const recordPaymentModes = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE", "CASH", "OTHER"];
const notAvailable = "Not available";

function unwrapReceiptList(response) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.receipts)) return data.receipts;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.receipts)) return response.receipts;

  return [];
}

function unwrapHarvestList(response) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.harvests)) return data.harvests;
  if (Array.isArray(data?.harvest_requests)) return data.harvest_requests;
  if (Array.isArray(data?.harvestRequests)) return data.harvestRequests;

  return [];
}

function unwrapObject(response) {
  return (
    response?.data?.data ||
    response?.data?.profile ||
    response?.data?.trader ||
    response?.data ||
    response?.profile ||
    response?.trader ||
    response ||
    null
  );
}

function normalizeHarvestCompletionStatus(value) {
  const status = String(value || "").trim().toUpperCase();

  if (status.includes("COMPLETE")) {
    return "COMPLETED";
  }

  return status;
}

function sameId(left, right) {
  if (left === null || left === undefined || left === "") return false;
  if (right === null || right === undefined || right === "") return false;

  return String(left) === String(right);
}

function getLoggedTraderId(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  return (
    profile.trader_id ||
    profile.traderId ||
    profile.id ||
    profile.data?.trader_id ||
    profile.data?.traderId ||
    profile.data?.id ||
    profile.user_id ||
    profile.userId ||
    null
  );
}

function getLocalDateTimeValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createIdempotencyKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function canRecordPayment(procurement) {
  if (!procurement) return false;

  return (
    ["CONFIRMED", "PARTIALLY_PAID"].includes(procurement.status) &&
    safeNumber(procurement.outstandingBalance) > 0
  );
}

function extractPaymentResult(response) {
  const data = response?.data || response || {};
  const payload = data?.data || data;

  return {
    payment:
      payload?.payment ||
      payload?.payment_details ||
      payload?.paymentDetails ||
      payload?.payment_record ||
      payload?.paymentRecord ||
      payload?.procurement_payment ||
      payload?.procurementPayment ||
      null,
    receipt:
      payload?.receipt ||
      payload?.payment_receipt ||
      payload?.paymentReceipt ||
      payload?.receipt_details ||
      payload?.receiptDetails ||
      null,
    idempotentReplay: Boolean(payload?.idempotent_replay),
  };
}

function unwrapReceiptPayload(response) {
  const data = response?.data || response || {};
  return data?.data || data;
}

function unwrapReceiptDetails(response) {
  const payload = unwrapReceiptPayload(response);

  return (
    payload?.receipt ||
    payload?.payment_receipt ||
    payload?.paymentReceipt ||
    payload?.receipt_details ||
    payload?.receiptDetails ||
    payload
  );
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstObject(...items) {
  return (
    items.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        Object.keys(item).length > 0
    ) || {}
  );
}

function firstObjectFrom(value) {
  if (Array.isArray(value)) {
    return firstObject(...value);
  }

  return objectOrEmpty(value);
}

function valueOrReceiptFallback(value) {
  if (value === undefined || value === null || value === "") {
    return notAvailable;
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return notAvailable;
  }

  if (typeof value === "object") {
    return notAvailable;
  }

  return String(value);
}

function formatDateTime(value) {
  if (!value) return notAvailable;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return notAvailable;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeReceiptDetails(response) {
  const payload = objectOrEmpty(unwrapReceiptPayload(response));
  const receipt = objectOrEmpty(unwrapReceiptDetails(response));
  const snapshot = objectOrEmpty(
    receipt.snapshot ||
      receipt.receipt_snapshot ||
      receipt.receiptSnapshot ||
      receipt.settlement_snapshot ||
      receipt.settlementSnapshot
  );
  const payloadPayment = firstObjectFrom(
    payload.payment ||
      payload.payment_details ||
      payload.paymentDetails ||
      payload.payment_record ||
      payload.paymentRecord ||
      payload.procurement_payment ||
      payload.procurementPayment ||
      payload.payments ||
      payload.payment_records ||
      payload.paymentRecords ||
      payload.procurement_payments ||
      payload.procurementPayments
  );
  const payment = firstObjectFrom(
    receipt.payment ||
      receipt.payment_details ||
      receipt.paymentDetails ||
      receipt.payment_record ||
      receipt.paymentRecord ||
      receipt.procurement_payment ||
      receipt.procurementPayment ||
      receipt.payments ||
      receipt.payment_records ||
      receipt.paymentRecords ||
      receipt.procurement_payments ||
      receipt.procurementPayments
  );
  const procurement = objectOrEmpty(
    receipt.procurement ||
      receipt.procurement_details ||
      receipt.procurementDetails ||
      payload.procurement ||
      payload.procurement_details ||
      payload.procurementDetails ||
      snapshot.procurement
  );
  const trader = objectOrEmpty(
    receipt.trader ||
      receipt.trader_details ||
      receipt.traderDetails ||
      snapshot.trader ||
      snapshot.trader_details ||
      snapshot.traderDetails
  );
  const producer = objectOrEmpty(
    receipt.producer ||
      receipt.farmer ||
      receipt.producer_details ||
      receipt.producerDetails ||
      receipt.farmer_details ||
      receipt.farmerDetails ||
      snapshot.producer ||
      snapshot.farmer ||
      snapshot.producer_details ||
      snapshot.producerDetails ||
      snapshot.farmer_details ||
      snapshot.farmerDetails
  );
  const harvest = objectOrEmpty(
    receipt.harvest ||
      receipt.harvest_request ||
      receipt.harvestRequest ||
      procurement.harvest ||
      procurement.harvest_request ||
      procurement.harvestRequest ||
      snapshot.harvest ||
      snapshot.harvest_request ||
      snapshot.harvestRequest
  );
  const paymentSnapshot = firstObjectFrom(
    snapshot.payment ||
      snapshot.payment_details ||
      snapshot.paymentDetails ||
      snapshot.payment_record ||
      snapshot.paymentRecord ||
      snapshot.procurement_payment ||
      snapshot.procurementPayment ||
      snapshot.payments ||
      snapshot.payment_records ||
      snapshot.paymentRecords ||
      snapshot.procurement_payments ||
      snapshot.procurementPayments
  );
  const procurementSnapshot = objectOrEmpty(
    snapshot.procurement ||
      snapshot.procurement_details ||
      snapshot.procurementDetails
  );
  const traderSnapshot = objectOrEmpty(
    snapshot.trader || snapshot.trader_details || snapshot.traderDetails
  );
  const producerSnapshot = objectOrEmpty(
    snapshot.producer ||
      snapshot.farmer ||
      snapshot.producer_details ||
      snapshot.producerDetails ||
      snapshot.farmer_details ||
      snapshot.farmerDetails
  );
  const settlement = objectOrEmpty(
    receipt.settlement ||
      receipt.settlement_details ||
      receipt.settlementDetails ||
      snapshot.settlement ||
      snapshot.settlement_details ||
      snapshot.settlementDetails
  );

  const normalizedPayment = firstObject(payloadPayment, payment, paymentSnapshot);
  const normalizedProcurement = firstObject(procurement, procurementSnapshot);
  const normalizedTrader = firstObject(trader, traderSnapshot);
  const normalizedProducer = firstObject(producer, producerSnapshot);

  const receiptNo = valueOrReceiptFallback(
    getFirstValue(receipt, ["receipt_no", "receiptNo"]) ||
      getFirstValue(snapshot, ["receipt_no", "receiptNo"])
  );
  const procurementNo = valueOrReceiptFallback(
    getFirstValue(receipt, ["procurement_no", "procurementNo"]) ||
      getFirstValue(normalizedProcurement, [
        "procurement_no",
        "procurementNo",
        "procurement_number",
      ]) ||
      getFirstValue(snapshot, ["procurement_no", "procurementNo"])
  );
  const harvestReference = valueOrReceiptFallback(
    getFirstValue(receipt, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
      "request_code",
      "requestCode",
    ]) ||
      getFirstValue(harvest, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
        "booking_code",
        "bookingCode",
      ]) ||
      getFirstValue(normalizedProcurement, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
      ]) ||
      getFirstValue(snapshot, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
      ])
  );
  const currentPayment =
    getFirstValue(receipt, [
      "amount",
      "payment_amount",
      "paymentAmount",
      "paid_amount",
      "paidAmount",
      "current_payment",
      "currentPayment",
    ]) ||
    getFirstValue(normalizedPayment, [
      "amount",
      "payment_amount",
      "paymentAmount",
      "paid_amount",
      "paidAmount",
      "current_payment",
      "currentPayment",
    ]) ||
    getFirstValue(settlement, [
      "current_payment",
      "currentPayment",
      "current_payment_amount",
      "currentPaymentAmount",
      "payment_amount",
      "paymentAmount",
    ]) ||
    getFirstValue(snapshot, [
      "current_payment",
      "currentPayment",
      "current_payment_amount",
      "currentPaymentAmount",
      "payment_amount",
      "paymentAmount",
    ]);
  const procurementValue =
    getFirstValue(normalizedProcurement, [
      "total_value",
      "totalValue",
      "procurement_value",
      "procurementValue",
      "procurement_amount",
      "procurementAmount",
    ]) ||
    getFirstValue(settlement, [
      "procurement_value",
      "procurementValue",
      "procurement_amount",
      "procurementAmount",
      "total_value",
      "totalValue",
    ]) ||
    getFirstValue(snapshot, [
      "procurement_value",
      "procurementValue",
      "procurement_amount",
      "procurementAmount",
      "total_value",
      "totalValue",
    ]);

  return {
    raw: receipt,
    snapshot,
    payment: normalizedPayment,
    procurement: normalizedProcurement,
    trader: normalizedTrader,
    producer: normalizedProducer,
    harvest,
    settlement,
    id: getFirstValue(receipt, ["id", "receipt_id", "receiptId"]),
    receiptNo,
    paymentNo: valueOrReceiptFallback(
      getFirstValue(receipt, ["payment_no", "paymentNo"]) ||
        getFirstValue(normalizedPayment, ["payment_no", "paymentNo"])
    ),
    procurementId:
      getFirstValue(receipt, ["procurement_id", "procurementId"]) ||
      getFirstValue(normalizedPayment, ["procurement_id", "procurementId"]) ||
      getFirstValue(normalizedProcurement, ["id", "procurement_id", "procurementId"]),
    procurementNo,
    harvestId:
      getFirstValue(receipt, ["harvest_id", "harvestId"]) ||
      getFirstValue(normalizedProcurement, ["harvest_id", "harvestId"]) ||
      getFirstValue(harvest, ["id", "harvest_id", "harvestId"]),
    harvestReference,
    traderName: valueOrReceiptFallback(
      getFirstValue(normalizedTrader, ["trader_name", "traderName", "name"]) ||
        getFirstValue(snapshot, ["trader_name", "traderName"]) ||
        getFirstValue(receipt, ["trader_name", "traderName"])
    ),
    traderCode: valueOrReceiptFallback(
      getFirstValue(normalizedTrader, ["trader_code", "traderCode", "code"]) ||
        getFirstValue(snapshot, ["trader_code", "traderCode"]) ||
        getFirstValue(receipt, ["trader_code", "traderCode"])
    ),
    traderGstin: valueOrReceiptFallback(
      getFirstValue(normalizedTrader, ["trader_gstin", "traderGstin", "gstin"]) ||
        getFirstValue(snapshot, ["trader_gstin", "traderGstin", "gstin"]) ||
        getFirstValue(receipt, ["trader_gstin", "traderGstin", "gstin"])
    ),
    authorizedSignatory: valueOrReceiptFallback(
      getFirstValue(normalizedTrader, [
        "authorized_signatory",
        "authorizedSignatory",
      ]) ||
        getFirstValue(snapshot, ["authorized_signatory", "authorizedSignatory"]) ||
        getFirstValue(receipt, ["authorized_signatory", "authorizedSignatory"])
    ),
    farmerName: valueOrReceiptFallback(
      getFirstValue(normalizedProducer, [
        "producer_name",
        "producerName",
        "farmer_name",
        "farmerName",
        "name",
      ]) ||
        getFirstValue(snapshot, [
          "producer_name",
          "producerName",
          "farmer_name",
          "farmerName",
        ]) ||
        getFirstValue(receipt, ["producer_name", "producerName", "farmer_name", "farmerName"])
    ),
    farmerMobile: valueOrReceiptFallback(
      getFirstValue(normalizedProducer, [
        "mobile",
        "phone",
        "farmer_mobile",
        "farmerMobile",
      ]) ||
        getFirstValue(snapshot, ["mobile", "phone", "farmer_mobile", "farmerMobile"]) ||
        getFirstValue(receipt, ["mobile", "phone", "farmer_mobile", "farmerMobile"])
    ),
    farmName: valueOrReceiptFallback(
      getFirstValue(normalizedProducer, ["farm_name", "farmName"]) ||
        getFirstValue(harvest, ["farm_name", "farmName"]) ||
        getFirstValue(snapshot, ["farm_name", "farmName"]) ||
        getFirstValue(receipt, ["farm_name", "farmName"])
    ),
    procurementValue,
    paidBefore:
      getFirstValue(settlement, ["paid_before", "paidBefore", "paid_before_amount", "paidBeforeAmount"]) ||
      getFirstValue(snapshot, ["paid_before", "paidBefore", "paid_before_amount", "paidBeforeAmount"]),
    currentPayment,
    paidAfter:
      getFirstValue(settlement, ["paid_after", "paidAfter", "paid_after_amount", "paidAfterAmount"]) ||
      getFirstValue(snapshot, ["paid_after", "paidAfter", "paid_after_amount", "paidAfterAmount"]),
    outstandingBalance:
      getFirstValue(receipt, ["outstanding_balance", "outstandingBalance"]) ||
      getFirstValue(settlement, ["outstanding_balance", "outstandingBalance"]) ||
      getFirstValue(snapshot, ["outstanding_balance", "outstandingBalance"]),
    amount: currentPayment,
    paymentMode: valueOrReceiptFallback(
      getFirstValue(normalizedPayment, ["payment_mode", "paymentMode", "mode"]) ||
        getFirstValue(snapshot, ["payment_mode", "paymentMode", "mode"]) ||
        getFirstValue(receipt, ["payment_mode", "paymentMode", "mode"])
    ),
    bankReference: valueOrReceiptFallback(
      getFirstValue(normalizedPayment, [
        "bank_reference",
        "bankReference",
        "transaction_reference",
        "transactionReference",
        "reference",
      ]) ||
        getFirstValue(snapshot, [
          "bank_reference",
          "bankReference",
          "transaction_reference",
          "transactionReference",
          "reference",
        ]) ||
        getFirstValue(receipt, [
          "bank_reference",
          "bankReference",
          "transaction_reference",
          "transactionReference",
          "reference",
        ])
    ),
    bankName: valueOrReceiptFallback(
      getFirstValue(normalizedPayment, ["bank_name", "bankName"]) ||
        getFirstValue(snapshot, ["bank_name", "bankName"]) ||
        getFirstValue(receipt, ["bank_name", "bankName"])
    ),
    accountHolderName: valueOrReceiptFallback(
      getFirstValue(normalizedPayment, ["account_holder_name", "accountHolderName"]) ||
        getFirstValue(snapshot, ["account_holder_name", "accountHolderName"]) ||
        getFirstValue(receipt, ["account_holder_name", "accountHolderName"])
    ),
    paidAt:
      getFirstValue(normalizedPayment, ["paid_at", "paidAt", "payment_date", "paymentDate"]) ||
      getFirstValue(normalizedPayment, ["created_at", "createdAt"]) ||
      getFirstValue(snapshot, ["paid_at", "paidAt", "payment_date", "paymentDate"]) ||
      getFirstValue(snapshot, ["created_at", "createdAt"]) ||
      getFirstValue(receipt, ["paid_at", "paidAt", "payment_date", "paymentDate"]) ||
      getFirstValue(receipt, ["created_at", "createdAt"]),
    remarks: valueOrReceiptFallback(
      getFirstValue(normalizedPayment, ["remarks"]) ||
        getFirstValue(snapshot, ["remarks"]) ||
        getFirstValue(receipt, ["remarks"])
    ),
    verificationToken: valueOrReceiptFallback(
      getFirstValue(receipt, [
        "verification_token",
        "verificationToken",
        "verify_token",
        "verifyToken",
      ]) ||
        getFirstValue(snapshot, [
          "verification_token",
          "verificationToken",
          "verify_token",
          "verifyToken",
        ])
    ),
  };
}

function hasReceiptValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (value === notAvailable) return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;

  return true;
}

function mergeReceiptDetailsFallback(receipt, fallback = {}) {
  if (!fallback || typeof fallback !== "object") {
    return receipt;
  }

  return Object.entries(fallback).reduce(
    (merged, [key, value]) => {
      if (!hasReceiptValue(merged[key]) && hasReceiptValue(value)) {
        merged[key] = value;
      }

      return merged;
    },
    { ...receipt }
  );
}

function unwrapPrintableHtml(response) {
  if (typeof response === "string") return response;
  if (typeof response?.data === "string") return response.data;
  if (typeof response?.html === "string") return response.html;

  return "";
}

function normalizeCompletedHarvest(item = {}) {
  const id = getFirstValue(item, ["id", "harvest_id", "harvestId", "booking_id"]);
  const referenceCode =
    getFirstValue(item, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
      "request_code",
      "requestCode",
      "booking_code",
      "bookingCode",
    ]) || notAvailable;
  const farmerName =
    getFirstValue(item, [
      "farmer_name",
      "farmerName",
      "producer_name",
      "producerName",
      "source_name",
      "sourceName",
    ]) || notAvailable;
  const farmName =
    getFirstValue(item, [
      "farm_name",
      "farmName",
      "farm_title",
      "farmTitle",
      "pond_name",
      "pondName",
    ]) || notAvailable;
  const species = getFirstValue(item, ["species"]) || notAvailable;
  const actualHarvestWeightKg = getFirstValue(item, [
    "actual_harvest_weight_kg",
    "actualHarvestWeightKg",
    "actual_weight_kg",
    "actualWeightKg",
  ]);
  const harvestStatus = normalizeHarvestCompletionStatus(
    getFirstValue(item, ["harvest_status", "harvestStatus"])
  );
  const assignedTraderId = getFirstValue(item, [
    "trader_id",
    "traderId",
    "assigned_trader_id",
    "assignedTraderId",
  ]);

  return {
    raw: item,
    id,
    referenceCode,
    farmerName,
    farmName,
    species,
    actualHarvestWeightKg,
    harvestStatus,
    assignedTraderId,
    optionLabel: `${referenceCode} - ${
      farmerName !== notAvailable ? farmerName : farmName
    }`,
  };
}

function normalizeReceiptListItem(item = {}) {
  const snapshot = objectOrEmpty(
    item.snapshot ||
      item.receipt_snapshot ||
      item.receiptSnapshot ||
      item.settlement_snapshot ||
      item.settlementSnapshot
  );
  const payment = firstObject(
    firstObjectFrom(
      item.payment ||
        item.payment_details ||
        item.paymentDetails ||
        item.payment_record ||
        item.paymentRecord ||
        item.procurement_payment ||
        item.procurementPayment
    ),
    objectOrEmpty(snapshot.payment)
  );
  const procurement = firstObject(
    objectOrEmpty(
      item.procurement || item.procurement_details || item.procurementDetails
    ),
    objectOrEmpty(snapshot.procurement)
  );
  const harvest = objectOrEmpty(
    item.harvest ||
      item.harvest_request ||
      item.harvestRequest ||
      procurement.harvest ||
      procurement.harvest_request ||
      procurement.harvestRequest ||
      snapshot.harvest ||
      snapshot.harvest_request ||
      snapshot.harvestRequest
  );
  const producer = objectOrEmpty(
    item.producer ||
      item.farmer ||
      item.producer_details ||
      item.producerDetails ||
      item.farmer_details ||
      item.farmerDetails ||
      snapshot.producer ||
      snapshot.farmer
  );

  const receiptNo = valueOrNotAvailable(
    getFirstValue(item, ["receipt_no", "receiptNo"])
  );
  const paymentNo = valueOrNotAvailable(
    getFirstValue(item, ["payment_no", "paymentNo"]) ||
      getFirstValue(payment, ["payment_no", "paymentNo", "id"]) ||
      getFirstValue(snapshot, ["payment_no", "paymentNo"])
  );
  const procurementNo = valueOrNotAvailable(
    getFirstValue(item, ["procurement_no", "procurementNo"]) ||
      getFirstValue(procurement, [
        "procurement_no",
        "procurementNo",
        "procurement_number",
      ]) ||
      getFirstValue(snapshot, ["procurement_no", "procurementNo"])
  );
  const procurementId =
    getFirstValue(item, ["procurement_id", "procurementId"]) ||
    getFirstValue(payment, ["procurement_id", "procurementId"]) ||
    getFirstValue(procurement, ["id", "procurement_id", "procurementId"]);
  const harvestReference = valueOrNotAvailable(
    getFirstValue(item, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
      "request_code",
      "requestCode",
    ]) ||
      getFirstValue(harvest, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
        "booking_code",
        "bookingCode",
      ]) ||
      getFirstValue(procurement, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
      ]) ||
      getFirstValue(snapshot, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
      ])
  );
  const producerName = valueOrNotAvailable(
    getFirstValue(item, ["producer_name", "producerName", "farmer_name", "farmerName"]) ||
      getFirstValue(producer, [
        "producer_name",
        "producerName",
        "farmer_name",
        "farmerName",
        "name",
      ]) ||
      getFirstValue(snapshot, [
        "producer_name",
        "producerName",
        "farmer_name",
        "farmerName",
      ])
  );
  const amount = getFirstValue(item, [
    "amount",
    "payment_amount",
    "paymentAmount",
    "paid_amount",
    "paidAmount",
    "current_payment",
    "currentPayment",
  ]) ||
    getFirstValue(payment, [
      "amount",
      "payment_amount",
      "paymentAmount",
      "paid_amount",
      "paidAmount",
      "current_payment",
      "currentPayment",
    ]) ||
    getFirstValue(snapshot, [
      "current_payment",
      "currentPayment",
      "current_payment_amount",
      "currentPaymentAmount",
      "payment_amount",
      "paymentAmount",
    ]);
  const paymentMode = valueOrNotAvailable(
    getFirstValue(item, ["payment_mode", "paymentMode", "mode"]) ||
      getFirstValue(payment, ["payment_mode", "paymentMode", "mode"]) ||
      getFirstValue(snapshot, ["payment_mode", "paymentMode", "mode"])
  );
  const paidAt =
    getFirstValue(item, ["paid_at", "paidAt", "payment_date", "paymentDate", "created_at", "createdAt"]) ||
    getFirstValue(payment, ["paid_at", "paidAt", "payment_date", "paymentDate", "created_at", "createdAt"]) ||
    getFirstValue(snapshot, ["paid_at", "paidAt", "payment_date", "paymentDate", "created_at", "createdAt"]);
  const outstandingBalance =
    getFirstValue(item, ["outstanding_balance", "outstandingBalance"]) ||
    getFirstValue(snapshot, ["outstanding_balance", "outstandingBalance"]);

  return {
    raw: item,
    id: getFirstValue(item, ["id", "receipt_id", "receiptId"]),
    receiptNo,
    paymentNo,
    procurementId,
    procurementNo,
    harvestReference,
    producer: producerName,
    amount,
    paymentMode,
    paidAt,
    outstandingBalance,
    searchText: [
      receiptNo,
      paymentNo,
      procurementNo,
      harvestReference,
      producerName,
      paymentMode,
      item.id,
    ]
      .filter((value) => value && value !== notAvailable)
      .join(" ")
      .toLowerCase(),
  };
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    ""
  );
}

export default function Payments() {
  const [activeTab, setActiveTab] = useState("procurements");
  const [procurementSearch, setProcurementSearch] = useState("");
  const [procurementStatus, setProcurementStatus] = useState("All");
  const [receiptSearch, setReceiptSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState("All");
  const [procurements, setProcurements] = useState([]);
  const [procurementsLoading, setProcurementsLoading] = useState(true);
  const [procurementsError, setProcurementsError] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState("");
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [selectedReceiptProcurement, setSelectedReceiptProcurement] = useState(null);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [selectedProcurementDetails, setSelectedProcurementDetails] = useState(null);
  const [createProcurementOpen, setCreateProcurementOpen] = useState(false);
  const [completedHarvests, setCompletedHarvests] = useState([]);
  const [completedHarvestsLoading, setCompletedHarvestsLoading] = useState(false);
  const [completedHarvestsError, setCompletedHarvestsError] = useState("");
  const [selectedHarvestId, setSelectedHarvestId] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [traderGstin, setTraderGstin] = useState("");
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");
  const [createProcurementLoading, setCreateProcurementLoading] = useState(false);
  const [createProcurementError, setCreateProcurementError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdProcurement, setCreatedProcurement] = useState(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [receiptDetailsOpen, setReceiptDetailsOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState("");
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [receiptDetailsLoading, setReceiptDetailsLoading] = useState(false);
  const [receiptDetailsError, setReceiptDetailsError] = useState("");
  const [receiptPrintLoading, setReceiptPrintLoading] = useState(false);
  const [receiptPrintError, setReceiptPrintError] = useState("");
  const [loggedTrader, setLoggedTrader] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [recordPaymentMode, setRecordPaymentMode] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [paidAt, setPaidAt] = useState(getLocalDateTimeValue());
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState("");

  const loadLoggedTrader = useCallback(async () => {
    try {
      const response = await traderService.getProfile();
      const profile = unwrapObject(response);

      setLoggedTrader(profile);
      return profile;
    } catch {
      setLoggedTrader(null);
      return null;
    }
  }, []);

  const loadProcurements = useCallback(async () => {
    try {
      setProcurementsLoading(true);
      setProcurementsError("");

      const response = await traderService.getPaymentProcurements();
      const list = unwrapProcurementList(response).map(normalizeProcurement);

      setProcurements(list);
      return list;
    } catch (error) {
      setProcurements([]);
      setProcurementsError(getErrorMessage(error));
      return [];
    } finally {
      setProcurementsLoading(false);
    }
  }, []);

  const loadReceipts = useCallback(async () => {
    try {
      setReceiptsLoading(true);
      setReceiptsError("");

      const response = await traderService.getPaymentReceipts();
      const list = unwrapReceiptList(response).map(normalizeReceiptListItem);

      setReceipts(list);
      setReceiptsLoaded(true);
      return list;
    } catch (error) {
      setReceipts([]);
      setReceiptsError(getErrorMessage(error));
      setReceiptsLoaded(true);
      return [];
    } finally {
      setReceiptsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProcurements();
      loadReceipts();
      loadLoggedTrader();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadLoggedTrader, loadProcurements, loadReceipts]);

  useEffect(() => {
    if (activeTab !== "receipts" || receiptsLoaded) return;

    const timer = window.setTimeout(() => {
      loadReceipts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, loadReceipts, receiptsLoaded]);

  const resetCreateProcurementForm = useCallback(() => {
    setSelectedHarvestId("");
    setRatePerKg("");
    setAdjustmentAmount("");
    setTaxAmount("");
    setPaymentTerms("");
    setTraderGstin("");
    setAuthorizedSignatory("");
    setCreateProcurementError("");
  }, []);

  const loadCompletedHarvests = useCallback(async () => {
    try {
      setCompletedHarvestsLoading(true);
      setCompletedHarvestsError("");

      let traderId = getLoggedTraderId(loggedTrader);

      if (!traderId) {
        const profile = await loadLoggedTrader();
        traderId = getLoggedTraderId(profile);
      }

      if (!traderId) {
        setCompletedHarvests([]);
        setCompletedHarvestsError("Logged-in trader profile is unavailable. Please try again.");
        return;
      }

      const response = await traderService.getHarvestRequests();
      const list = unwrapHarvestList(response)
        .map(normalizeCompletedHarvest)
        .filter(
          (item) =>
            item.id &&
            item.harvestStatus === "COMPLETED" &&
            sameId(item.assignedTraderId, traderId)
        );

      setCompletedHarvests(list);
    } catch (error) {
      setCompletedHarvests([]);
      setCompletedHarvestsError(getErrorMessage(error));
    } finally {
      setCompletedHarvestsLoading(false);
    }
  }, [loadLoggedTrader, loggedTrader]);

  const openCreateProcurementModal = useCallback(() => {
    resetCreateProcurementForm();
    setCreatedProcurement(null);
    setCreateProcurementOpen(true);
    loadCompletedHarvests();
  }, [loadCompletedHarvests, resetCreateProcurementForm]);

  const closeCreateProcurementModal = useCallback(() => {
    if (createProcurementLoading) return;

    setCreateProcurementOpen(false);
    resetCreateProcurementForm();
  }, [createProcurementLoading, resetCreateProcurementForm]);

  const resetPaymentForm = useCallback(() => {
    setPaymentAmount("");
    setRecordPaymentMode("");
    setBankReference("");
    setBankName("");
    setAccountHolderName("");
    setPaidAt(getLocalDateTimeValue());
    setPaymentRemarks("");
    setPaymentError("");
    setPaymentResult(null);
  }, []);

  const openRecordPaymentModal = useCallback((procurement) => {
    if (!canRecordPayment(procurement)) return;

    resetPaymentForm();
    setSelectedProcurement(procurement);
    setPaymentIdempotencyKey(createIdempotencyKey());
    setRecordPaymentOpen(true);
  }, [resetPaymentForm]);

  const closeRecordPaymentModal = useCallback(() => {
    if (paymentSubmitting) return;

    setRecordPaymentOpen(false);
    setSelectedProcurement(null);
    setPaymentIdempotencyKey("");
    resetPaymentForm();
  }, [paymentSubmitting, resetPaymentForm]);

  const openProcurementDetails = useCallback((procurement) => {
    setSelectedProcurementDetails(procurement || null);
  }, []);

  const closeProcurementDetails = useCallback(() => {
    setSelectedProcurementDetails(null);
  }, []);

  const openReceipt = useCallback(async (receiptId, detailFallback) => {
    setSelectedReceiptId(receiptId || "");
    setReceiptDetailsOpen(true);
    setReceiptDetails(null);
    setReceiptPrintError("");

    if (!receiptId) {
      setReceiptDetailsLoading(false);
      setReceiptDetailsError("Unable to load receipt details.");
      return;
    }

    try {
      setReceiptDetailsLoading(true);
      setReceiptDetailsError("");

      const response = await traderService.getPaymentReceipt(receiptId);
      const fallback = detailFallback || {};

      setReceiptDetails(
        mergeReceiptDetailsFallback(normalizeReceiptDetails(response), fallback)
      );
    } catch (error) {
      setReceiptDetailsError(getErrorMessage(error) || "Unable to load payment receipt.");
    } finally {
      setReceiptDetailsLoading(false);
    }
  }, []);

  const receiptsByProcurement = useMemo(() => {
    return receipts.reduce((lookup, receipt) => {
      if (!receipt.procurementId) return lookup;

      const key = String(receipt.procurementId);
      const current = lookup.get(key) || [];

      lookup.set(key, [...current, receipt]);
      return lookup;
    }, new Map());
  }, [receipts]);

  const openProcurementReceipts = useCallback(
    (procurement) => {
      if (!procurement?.id || receiptsLoading || receiptsError) return;

      const procurementReceipts =
        receiptsByProcurement.get(String(procurement.id)) || [];

      if (procurementReceipts.length === 1) {
        openReceipt(procurementReceipts[0].id);
        return;
      }

      if (procurementReceipts.length > 1) {
        setSelectedReceiptProcurement(procurement);
      }
    },
    [openReceipt, receiptsByProcurement, receiptsError, receiptsLoading]
  );

  const closeProcurementReceiptsModal = useCallback(() => {
    setSelectedReceiptProcurement(null);
  }, []);

  const closeReceiptDetailsModal = useCallback(() => {
    if (receiptPrintLoading) return;

    setReceiptDetailsOpen(false);
    setSelectedReceiptId("");
    setReceiptDetails(null);
    setReceiptDetailsError("");
    setReceiptDetailsLoading(false);
    setReceiptPrintError("");
  }, [receiptPrintLoading]);

  const handlePrintReceipt = useCallback(async (receiptId) => {
    setReceiptPrintError("");

    if (!receiptId) {
      setReceiptPrintError("Unable to prepare receipt for printing.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setReceiptPrintError("Unable to open the print window. Please allow pop-ups and try again.");
      return;
    }

    try {
      setReceiptPrintLoading(true);
      printWindow.document.write(
        "<!doctype html><title>Preparing Receipt</title><body style=\"font-family: system-ui, sans-serif; padding: 24px;\">Preparing receipt...</body>"
      );
      printWindow.document.close();

      const response = await traderService.getPaymentReceiptPrint(receiptId);
      const html = unwrapPrintableHtml(response);

      if (!html) {
        throw new Error("Printable receipt HTML is unavailable");
      }

      const objectUrl = URL.createObjectURL(
        new Blob([html], { type: "text/html;charset=utf-8" })
      );

      printWindow.location.href = objectUrl;
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch {
      if (!printWindow.closed) {
        printWindow.close();
      }

      setReceiptPrintError("Unable to prepare receipt for printing.");
    } finally {
      setReceiptPrintLoading(false);
    }
  }, []);

  const selectedHarvest = useMemo(
    () =>
      completedHarvests.find(
        (item) => String(item.id) === String(selectedHarvestId)
      ) || null,
    [completedHarvests, selectedHarvestId]
  );

  const estimatedGrossAmount = useMemo(() => {
    if (!selectedHarvest?.actualHarvestWeightKg || !ratePerKg) {
      return null;
    }

    const weight = Number(selectedHarvest.actualHarvestWeightKg);
    const rate = Number(ratePerKg);

    if (!Number.isFinite(weight) || !Number.isFinite(rate) || weight <= 0 || rate <= 0) {
      return null;
    }

    return weight * rate;
  }, [ratePerKg, selectedHarvest]);

  const handleCreateProcurement = useCallback(
    async (event) => {
      event.preventDefault();

      if (!selectedHarvestId) {
        setCreateProcurementError("Select a completed harvest.");
        return;
      }

      const rate = Number(ratePerKg);

      if (!Number.isFinite(rate) || rate <= 0) {
        setCreateProcurementError("Enter a rate per kg greater than 0.");
        return;
      }

      const adjustment = adjustmentAmount === "" ? 0 : Number(adjustmentAmount);
      const tax = taxAmount === "" ? 0 : Number(taxAmount);

      if (!Number.isFinite(adjustment)) {
        setCreateProcurementError("Enter a valid adjustment amount.");
        return;
      }

      if (!Number.isFinite(tax)) {
        setCreateProcurementError("Enter a valid tax amount.");
        return;
      }

      try {
        setCreateProcurementLoading(true);
        setCreateProcurementError("");
        setSuccessMessage("");

        const response = await traderService.createPaymentProcurement({
          harvest_id: selectedHarvestId,
          rate_per_kg: rate,
          adjustment_amount: adjustment,
          tax_amount: tax,
          payment_terms: paymentTerms.trim(),
          trader_gstin: traderGstin.trim(),
          authorized_signatory: authorizedSignatory.trim(),
        });

        const list = await loadProcurements();
        const createdRaw =
          response?.data?.data?.procurement ||
          response?.data?.procurement ||
          response?.data?.data ||
          response?.data ||
          response?.procurement ||
          null;
        const normalizedCreated =
          createdRaw && typeof createdRaw === "object"
            ? normalizeProcurement(createdRaw)
            : null;
        const createdFromList = normalizedCreated?.id
          ? list.find((item) => sameId(item.id, normalizedCreated.id))
          : null;

        setSuccessMessage("Procurement created successfully.");
        setCreatedProcurement(createdFromList || normalizedCreated);
        setCreateProcurementOpen(false);
        resetCreateProcurementForm();
      } catch (error) {
        setCreateProcurementError(getErrorMessage(error));
      } finally {
        setCreateProcurementLoading(false);
      }
    },
    [
      adjustmentAmount,
      authorizedSignatory,
      loadProcurements,
      paymentTerms,
      ratePerKg,
      resetCreateProcurementForm,
      selectedHarvestId,
      taxAmount,
      traderGstin,
    ]
  );

  const handleRecordPayment = useCallback(
    async (event) => {
      event.preventDefault();

      if (!selectedProcurement?.id) {
        setPaymentError("Procurement reference is missing. Please refresh and try again.");
        return;
      }

      if (!canRecordPayment(selectedProcurement)) {
        setPaymentError("This procurement is not eligible for another payment.");
        return;
      }

      const amount = Number(paymentAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setPaymentError("Enter a payment amount greater than 0.");
        return;
      }

      if (amount > safeNumber(selectedProcurement.outstandingBalance)) {
        setPaymentError("Payment amount cannot exceed the outstanding balance.");
        return;
      }

      if (!recordPaymentModes.includes(recordPaymentMode)) {
        setPaymentError("Select a valid payment mode.");
        return;
      }

      if (!paidAt) {
        setPaymentError("Select the paid date and time.");
        return;
      }

      const paidAtDate = new Date(paidAt);

      if (Number.isNaN(paidAtDate.getTime())) {
        setPaymentError("Select a valid paid date and time.");
        return;
      }

      const idempotencyKey = paymentIdempotencyKey || createIdempotencyKey();

      if (!paymentIdempotencyKey) {
        setPaymentIdempotencyKey(idempotencyKey);
      }

      try {
        setPaymentSubmitting(true);
        setPaymentError("");
        setSuccessMessage("");

        const response = await traderService.recordProcurementPayment(
          selectedProcurement.id,
          {
            amount,
            payment_mode: recordPaymentMode,
            bank_reference: bankReference.trim(),
            bank_name: bankName.trim(),
            account_holder_name: accountHolderName.trim(),
            paid_at: paidAtDate.toISOString(),
            remarks: paymentRemarks.trim(),
          },
          idempotencyKey
        );

        const result = extractPaymentResult(response);
        const newReceiptId =
          getFirstValue(result.receipt || {}, [
            "id",
            "receipt_id",
            "receiptId",
          ]) ||
          getFirstValue(result.payment || {}, [
            "receipt_id",
            "receiptId",
            "payment_receipt_id",
            "paymentReceiptId",
          ]);
        const paymentResponseFallback = {
          id: newReceiptId,
          receiptNo: getFirstValue(result.receipt || {}, [
            "receipt_no",
            "receiptNo",
          ]),
          paymentNo: getFirstValue(result.payment || {}, [
            "payment_no",
            "paymentNo",
          ]),
          procurementId: selectedProcurement.id,
          procurementNo: selectedProcurement.procurementNo,
          harvestReference: selectedProcurement.harvest,
          farmerName: selectedProcurement.producer,
          procurementValue: selectedProcurement.totalValue,
          paidBefore: getFirstValue(result.receipt || {}, [
            "paid_before",
            "paidBefore",
            "paid_before_amount",
            "paidBeforeAmount",
          ]),
          currentPayment:
            getFirstValue(result.payment || {}, [
              "amount",
              "payment_amount",
              "paymentAmount",
              "paid_amount",
              "paidAmount",
              "current_payment",
              "currentPayment",
            ]) ||
            getFirstValue(result.receipt || {}, [
              "amount",
              "payment_amount",
              "paymentAmount",
              "paid_amount",
              "paidAmount",
              "current_payment",
              "currentPayment",
            ]),
          paidAfter: getFirstValue(result.receipt || {}, [
            "paid_after",
            "paidAfter",
            "paid_after_amount",
            "paidAfterAmount",
          ]),
          outstandingBalance: getFirstValue(result.receipt || {}, [
            "outstanding_balance",
            "outstandingBalance",
          ]),
          paymentMode:
            getFirstValue(result.payment || {}, ["mode", "payment_mode", "paymentMode"]) ||
            getFirstValue(result.receipt || {}, ["mode", "payment_mode", "paymentMode"]),
          bankReference:
            getFirstValue(result.payment || {}, [
              "bank_reference",
              "bankReference",
              "transaction_reference",
              "transactionReference",
              "reference",
            ]) ||
            getFirstValue(result.receipt || {}, [
              "bank_reference",
              "bankReference",
              "transaction_reference",
              "transactionReference",
              "reference",
            ]),
          bankName:
            getFirstValue(result.payment || {}, ["bank_name", "bankName"]) ||
            getFirstValue(result.receipt || {}, ["bank_name", "bankName"]),
          accountHolderName:
            getFirstValue(result.payment || {}, [
              "account_holder_name",
              "accountHolderName",
            ]) ||
            getFirstValue(result.receipt || {}, [
              "account_holder_name",
              "accountHolderName",
            ]),
          paidAt:
            getFirstValue(result.payment || {}, [
              "paid_at",
              "paidAt",
              "created_at",
              "createdAt",
            ]) ||
            getFirstValue(result.receipt || {}, [
              "paid_at",
              "paidAt",
              "created_at",
              "createdAt",
            ]),
          remarks:
            getFirstValue(result.payment || {}, ["remarks"]) ||
            getFirstValue(result.receipt || {}, ["remarks"]),
        };
        const submittedReceiptFallback = mergeReceiptDetailsFallback(
          paymentResponseFallback,
          {
            currentPayment: amount,
            paymentMode: recordPaymentMode,
            bankReference: bankReference.trim(),
            bankName: bankName.trim(),
            accountHolderName: accountHolderName.trim(),
            paidAt: paidAtDate.toISOString(),
            remarks: paymentRemarks.trim(),
          }
        );

        setPaymentResult(result);
        await loadProcurements();
        await loadReceipts();
        setPaymentAmount("");
        setRecordPaymentMode("");
        setBankReference("");
        setBankName("");
        setAccountHolderName("");
        setPaidAt(getLocalDateTimeValue());
        setPaymentRemarks("");
        setPaymentIdempotencyKey("");
        setRecordPaymentOpen(false);
        setSelectedProcurement(null);
        setCreatedProcurement(null);
        setSuccessMessage("Payment recorded successfully.");

        if (newReceiptId) {
          openReceipt(newReceiptId, submittedReceiptFallback);
        }
      } catch (error) {
        setPaymentError(getErrorMessage(error) || "Unable to record payment.");
      } finally {
        setPaymentSubmitting(false);
      }
    },
    [
      accountHolderName,
      bankName,
      bankReference,
      loadProcurements,
      loadReceipts,
      openReceipt,
      paidAt,
      paymentAmount,
      paymentIdempotencyKey,
      paymentRemarks,
      recordPaymentMode,
      selectedProcurement,
    ]
  );

  const filteredProcurements = useMemo(() => {
    const searchText = procurementSearch.trim().toLowerCase();

    return procurements.filter((item) => {
      const searchMatch = !searchText || item.searchText.includes(searchText);
      const statusMatch =
        procurementStatus === "All" || item.status === procurementStatus;

      return searchMatch && statusMatch;
    });
  }, [procurements, procurementSearch, procurementStatus]);

  const filteredReceipts = useMemo(() => {
    const searchText = receiptSearch.trim().toLowerCase();

    return receipts.filter((item) => {
      const searchMatch = !searchText || item.searchText.includes(searchText);
      const paymentModeMatch =
        paymentMode === "All" || item.paymentMode === paymentMode;

      return searchMatch && paymentModeMatch;
    });
  }, [paymentMode, receiptSearch, receipts]);

  const summary = useMemo(
    () =>
      procurements.reduce(
        (totals, item) => ({
          totalValue: totals.totalValue + safeNumber(item.totalValue),
          totalPaid: totals.totalPaid + safeNumber(item.totalPaid),
          outstandingBalance:
            totals.outstandingBalance + safeNumber(item.outstandingBalance),
        }),
        { totalValue: 0, totalPaid: 0, outstandingBalance: 0 }
      ),
    [procurements]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Total Procurement",
        value: formatCurrency(summary.totalValue),
        icon: ClipboardList,
        iconClass: "bg-blue-50 text-blue-700",
      },
      {
        label: "Total Paid",
        value: formatCurrency(summary.totalPaid),
        icon: Wallet,
        iconClass: "bg-emerald-50 text-emerald-700",
      },
      {
        label: "Outstanding Balance",
        value: formatCurrency(summary.outstandingBalance),
        icon: IndianRupee,
        iconClass: "bg-amber-50 text-amber-700",
      },
    ],
    [summary]
  );

  return (
    <div className="min-w-0 space-y-6">
      <TraderPageHeader
        title="Payments"
        subtitle="Manage procurement settlements and payment receipts."
      />

      <TraderCard className="p-2">
        <div className="grid grid-cols-2 gap-2 sm:inline-grid sm:min-w-[360px]">
          <TabButton
            active={activeTab === "procurements"}
            onClick={() => setActiveTab("procurements")}
          >
            Procurements
          </TabButton>
          <TabButton
            active={activeTab === "receipts"}
            onClick={() => setActiveTab("receipts")}
          >
            Receipts
          </TabButton>
        </div>
      </TraderCard>

      {activeTab === "procurements" ? (
        <ProcurementsTab
          summaryCards={summaryCards}
          search={procurementSearch}
          setSearch={setProcurementSearch}
          status={procurementStatus}
          setStatus={setProcurementStatus}
          procurements={filteredProcurements}
          loading={procurementsLoading}
          error={procurementsError}
          successMessage={successMessage}
          createdProcurement={createdProcurement}
          receiptsByProcurement={receiptsByProcurement}
          receiptsLoading={receiptsLoading}
          receiptsError={receiptsError}
          onRefresh={loadProcurements}
          onCreateProcurement={openCreateProcurementModal}
          onViewProcurement={openProcurementDetails}
          onRecordPayment={openRecordPaymentModal}
          onViewProcurementReceipts={openProcurementReceipts}
        />
      ) : (
        <ReceiptsTab
          search={receiptSearch}
          setSearch={setReceiptSearch}
          paymentMode={paymentMode}
          setPaymentMode={setPaymentMode}
          receipts={filteredReceipts}
          loading={receiptsLoading}
          error={receiptsError}
          printLoading={receiptPrintLoading}
          printError={receiptPrintError}
          onRefresh={loadReceipts}
          onView={openReceipt}
          onPrint={handlePrintReceipt}
        />
      )}

      <CreateProcurementModal
        open={createProcurementOpen}
        onClose={closeCreateProcurementModal}
        completedHarvests={completedHarvests}
        harvestsLoading={completedHarvestsLoading}
        harvestsError={completedHarvestsError}
        selectedHarvestId={selectedHarvestId}
        setSelectedHarvestId={setSelectedHarvestId}
        selectedHarvest={selectedHarvest}
        ratePerKg={ratePerKg}
        setRatePerKg={setRatePerKg}
        adjustmentAmount={adjustmentAmount}
        setAdjustmentAmount={setAdjustmentAmount}
        taxAmount={taxAmount}
        setTaxAmount={setTaxAmount}
        paymentTerms={paymentTerms}
        setPaymentTerms={setPaymentTerms}
        traderGstin={traderGstin}
        setTraderGstin={setTraderGstin}
        authorizedSignatory={authorizedSignatory}
        setAuthorizedSignatory={setAuthorizedSignatory}
        estimatedGrossAmount={estimatedGrossAmount}
        error={createProcurementError}
        submitting={createProcurementLoading}
        onSubmit={handleCreateProcurement}
      />
      <RecordPaymentModal
        open={recordPaymentOpen}
        procurement={selectedProcurement}
        onClose={closeRecordPaymentModal}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMode={recordPaymentMode}
        setPaymentMode={setRecordPaymentMode}
        bankReference={bankReference}
        setBankReference={setBankReference}
        bankName={bankName}
        setBankName={setBankName}
        accountHolderName={accountHolderName}
        setAccountHolderName={setAccountHolderName}
        paidAt={paidAt}
        setPaidAt={setPaidAt}
        remarks={paymentRemarks}
        setRemarks={setPaymentRemarks}
        submitting={paymentSubmitting}
        error={paymentError}
        result={paymentResult}
        onSubmit={handleRecordPayment}
        onDone={closeRecordPaymentModal}
        onViewReceipt={(receiptId) => {
          closeRecordPaymentModal();
          openReceipt(receiptId);
        }}
      />
      <ProcurementDetailsModal
        open={Boolean(selectedProcurementDetails)}
        procurement={selectedProcurementDetails}
        onClose={closeProcurementDetails}
      />
      <ProcurementReceiptsModal
        open={Boolean(selectedReceiptProcurement)}
        procurement={selectedReceiptProcurement}
        receipts={
          selectedReceiptProcurement?.id
            ? receiptsByProcurement.get(String(selectedReceiptProcurement.id)) || []
            : []
        }
        printLoading={receiptPrintLoading}
        printError={receiptPrintError}
        onClose={closeProcurementReceiptsModal}
        onView={(receiptId) => {
          closeProcurementReceiptsModal();
          openReceipt(receiptId);
        }}
        onPrint={handlePrintReceipt}
      />
      <ReceiptDetailsModal
        open={receiptDetailsOpen}
        onClose={closeReceiptDetailsModal}
        receiptId={selectedReceiptId}
        receipt={receiptDetails}
        loading={receiptDetailsLoading}
        error={receiptDetailsError}
        onRetry={() => openReceipt(selectedReceiptId)}
        printLoading={receiptPrintLoading}
        printError={receiptPrintError}
        onPrint={() => handlePrintReceipt(selectedReceiptId)}
      />
    </div>
  );
}

function ProcurementsTab({
  summaryCards,
  search,
  setSearch,
  status,
  setStatus,
  procurements,
  loading,
  error,
  successMessage,
  createdProcurement,
  receiptsByProcurement,
  receiptsLoading,
  receiptsError,
  onRefresh,
  onCreateProcurement,
  onViewProcurement,
  onRecordPayment,
  onViewProcurementReceipts,
}) {
  const hasProcurements = procurements.length > 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </section>

      <TraderCard>
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">Procurements</h2>
              <p className="mt-1 text-sm text-slate-500">
                Settlement-ready procurement records will be listed here.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-auto lg:grid-cols-[minmax(220px,260px)_170px_auto_auto]">
              <div className="relative min-w-0">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <TraderInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search procurement"
                  className="pl-10"
                />
              </div>

              <TraderSelect
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {procurementStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </TraderSelect>

              <TraderButton
                type="button"
                variant="secondary"
                onClick={onRefresh}
                disabled={loading}
                className="w-full whitespace-nowrap lg:w-auto"
              >
                <RefreshCw
                  size={17}
                  aria-hidden="true"
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </TraderButton>

              <TraderButton
                type="button"
                onClick={onCreateProcurement}
                className="w-full whitespace-nowrap lg:w-auto"
              >
                <Plus size={17} aria-hidden="true" />
                Create Procurement
              </TraderButton>
            </div>
          </div>

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{successMessage}</span>
                {createdProcurement?.id ? (
                  <div className="flex flex-wrap gap-2">
                    <TraderButton
                      type="button"
                      variant="secondary"
                      onClick={() => onViewProcurement(createdProcurement)}
                      className="h-9 px-3 text-xs"
                    >
                      <Eye size={15} aria-hidden="true" />
                      View Procurement
                    </TraderButton>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {receiptsError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              Payment receipt status is unavailable. Receipt actions are disabled until receipts load.
            </div>
          ) : null}
        </div>

        <div className="hidden p-4 sm:block sm:p-5">
          <div className="rounded-2xl border border-slate-200">
            <div className="w-full">
              <table className="w-full table-fixed divide-y divide-slate-200 text-left">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <TableHead>Procurement</TableHead>
                    <TableHead>Producer / Farmer</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <ProcurementTableLoading />
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-14">
                        <ErrorState message={error} onRetry={onRefresh} />
                      </td>
                    </tr>
                  ) : hasProcurements ? (
                    procurements.map((item, index) => (
                      <ProcurementTableRow
                        key={item.id || `${item.procurementNo}-${index}`}
                        procurement={item}
                        receipts={receiptsByProcurement.get(String(item.id)) || []}
                        receiptsLoading={receiptsLoading}
                        receiptsError={receiptsError}
                        onView={onViewProcurement}
                        onRecordPayment={onRecordPayment}
                        onViewReceipts={onViewProcurementReceipts}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-14">
                        <EmptyState
                          icon={ClipboardList}
                          title="No procurements available."
                          message="Completed harvest procurements will appear here."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 sm:hidden">
          {loading ? (
            <ProcurementCardLoading />
          ) : error ? (
            <ErrorState message={error} onRetry={onRefresh} />
          ) : hasProcurements ? (
            <div className="space-y-3">
              {procurements.map((item, index) => (
                <ProcurementMobileCard
                  key={item.id || `${item.procurementNo}-${index}`}
                  procurement={item}
                  receipts={receiptsByProcurement.get(String(item.id)) || []}
                  receiptsLoading={receiptsLoading}
                  receiptsError={receiptsError}
                  onView={onViewProcurement}
                  onRecordPayment={onRecordPayment}
                  onViewReceipts={onViewProcurementReceipts}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No procurements available."
              message="Completed harvest procurements will appear here."
            />
          )}
        </div>
      </TraderCard>
    </div>
  );
}

function ReceiptsTab({
  search,
  setSearch,
  paymentMode,
  setPaymentMode,
  receipts,
  loading,
  error,
  printLoading,
  printError,
  onRefresh,
  onView,
  onPrint,
}) {
  const hasReceipts = receipts.length > 0;

  return (
    <TraderCard>
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950">Receipts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Payment receipt records will be available after settlement.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px] lg:w-auto lg:grid-cols-[280px_190px_auto]">
            <div className="relative min-w-0">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <TraderInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search receipt"
                className="pl-10"
              />
            </div>

            <TraderSelect
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
            >
              {paymentModes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
                ))}
            </TraderSelect>

            <TraderButton
              type="button"
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              className="w-full whitespace-nowrap lg:w-auto"
            >
              <RefreshCw
                size={17}
                aria-hidden="true"
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </TraderButton>
          </div>
        </div>

        {printError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {printError}
          </div>
        ) : null}
      </div>

      <div className="hidden p-4 sm:block sm:p-5">
        <div className="rounded-2xl border border-slate-200">
          <div className="w-full">
            <table className="w-full table-fixed divide-y divide-slate-200 text-left">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Procurement No</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <ReceiptTableLoading />
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-14">
                      <ErrorState
                        title="Unable to load payment receipts."
                        message={error}
                        onRetry={onRefresh}
                      />
                    </td>
                  </tr>
                ) : hasReceipts ? (
                  receipts.map((item, index) => (
                    <ReceiptTableRow
                      key={item.id || `${item.receiptNo}-${index}`}
                      receipt={item}
                      printLoading={printLoading}
                      onView={onView}
                      onPrint={onPrint}
                    />
                  ))
                ) : (
                  <tr>
                  <td colSpan="8" className="px-5 py-14">
                    <EmptyState
                      icon={Receipt}
                      title="No payment receipts available."
                      message="Receipts generated from recorded procurement payments will appear here."
                    />
                  </td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-4 sm:hidden">
        {loading ? (
          <ReceiptCardLoading />
        ) : error ? (
          <ErrorState
            title="Unable to load payment receipts."
            message={error}
            onRetry={onRefresh}
          />
        ) : hasReceipts ? (
          <div className="space-y-3">
            {receipts.map((item, index) => (
              <ReceiptMobileCard
                key={item.id || `${item.receiptNo}-${index}`}
                receipt={item}
                printLoading={printLoading}
                onView={onView}
                onPrint={onPrint}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No payment receipts available."
            message="Receipts generated from recorded procurement payments will appear here."
          />
        )}
      </div>
    </TraderCard>
  );
}

function CreateProcurementModal({
  open,
  onClose,
  completedHarvests,
  harvestsLoading,
  harvestsError,
  selectedHarvestId,
  setSelectedHarvestId,
  selectedHarvest,
  ratePerKg,
  setRatePerKg,
  adjustmentAmount,
  setAdjustmentAmount,
  taxAmount,
  setTaxAmount,
  paymentTerms,
  setPaymentTerms,
  traderGstin,
  setTraderGstin,
  authorizedSignatory,
  setAuthorizedSignatory,
  estimatedGrossAmount,
  error,
  submitting,
  onSubmit,
}) {
  const hasCompletedHarvests = completedHarvests.length > 0;
  const canSubmit = hasCompletedHarvests && selectedHarvestId && !submitting;

  return (
    <Modal open={open} title="Create Procurement" onClose={onClose} className="max-w-3xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Actual Harvest Weight
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {selectedHarvest?.actualHarvestWeightKg
              ? formatWeight(selectedHarvest.actualHarvestWeightKg)
              : "Not available"}
          </p>
        </div>

        {harvestsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="h-4 w-56 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-11 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : null}

        {!harvestsLoading && harvestsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {harvestsError || "Unable to load completed harvests."}
          </div>
        ) : null}

        {!harvestsLoading && !harvestsError && !hasCompletedHarvests ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-sm font-black text-slate-900">
              No completed harvests available.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Complete a booked harvest in Source Procurement before creating a procurement.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Harvest *">
            <TraderSelect
              value={selectedHarvestId}
              onChange={(event) => setSelectedHarvestId(event.target.value)}
              disabled={harvestsLoading || !hasCompletedHarvests || submitting}
              required
            >
              <option value="">
                {hasCompletedHarvests ? "Select completed harvest" : "No completed harvests available"}
              </option>
              {completedHarvests.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.optionLabel}
                </option>
              ))}
            </TraderSelect>
          </Field>
          <Field label="Rate Per Kg *">
            <TraderInput
              type="number"
              min="0"
              step="0.01"
              value={ratePerKg}
              onChange={(event) => setRatePerKg(event.target.value)}
              placeholder="0.00"
              required
              disabled={submitting}
            />
          </Field>
          <Field label="Adjustment Amount">
            <TraderInput
              type="number"
              step="0.01"
              value={adjustmentAmount}
              onChange={(event) => setAdjustmentAmount(event.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </Field>
          <Field label="Tax Amount">
            <TraderInput
              type="number"
              min="0"
              step="0.01"
              value={taxAmount}
              onChange={(event) => setTaxAmount(event.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </Field>
          <Field label="Payment Terms" wide>
            <TraderTextarea
              rows={3}
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
              placeholder="Enter settlement terms"
              disabled={submitting}
            />
          </Field>
          <Field label="Trader GSTIN">
            <TraderInput
              value={traderGstin}
              onChange={(event) => setTraderGstin(event.target.value)}
              placeholder="GSTIN"
              disabled={submitting}
            />
          </Field>
          <Field label="Authorized Signatory">
            <TraderInput
              value={authorizedSignatory}
              onChange={(event) => setAuthorizedSignatory(event.target.value)}
              placeholder="Name"
              disabled={submitting}
            />
          </Field>
        </div>

        {estimatedGrossAmount !== null ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Estimated Gross Amount
            </p>
            <p className="mt-1 text-sm font-black text-blue-950">
              {formatCurrency(estimatedGrossAmount)}
            </p>
            <p className="mt-1 text-xs font-semibold text-blue-700">
              Final settlement will use the confirmed system calculation.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <ModalActions>
          <TraderButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </TraderButton>
          <TraderButton type="submit" disabled={!canSubmit}>
            {submitting ? "Creating..." : "Create Procurement"}
          </TraderButton>
        </ModalActions>
      </form>
    </Modal>
  );
}

function RecordPaymentModal({
  open,
  onClose,
  procurement,
  paymentAmount,
  setPaymentAmount,
  paymentMode,
  setPaymentMode,
  bankReference,
  setBankReference,
  bankName,
  setBankName,
  accountHolderName,
  setAccountHolderName,
  paidAt,
  setPaidAt,
  remarks,
  setRemarks,
  submitting,
  error,
  result,
  onSubmit,
  onDone,
  onViewReceipt,
}) {
  const payment = result?.payment || {};
  const receipt = result?.receipt || {};
  const receiptId = getFirstValue(receipt, ["id", "receipt_id", "receiptId"]);
  const successOutstanding =
    getFirstValue(receipt, ["outstanding_balance", "outstandingBalance"]) ||
    getFirstValue(payment, ["outstanding_balance", "outstandingBalance"]);
  const canSubmit =
    canRecordPayment(procurement) &&
    !submitting;

  return (
    <Modal open={open} title="Record Payment" onClose={onClose} className="max-w-3xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryDetail
            label="Procurement No"
            value={procurement?.procurementNo || "Not selected"}
          />
          <SummaryDetail
            label="Total Value"
            value={formatCurrency(procurement?.totalValue)}
          />
          <SummaryDetail
            label="Total Paid"
            value={formatCurrency(procurement?.totalPaid)}
          />
          <SummaryDetail
            label="Outstanding Balance"
            value={formatCurrency(procurement?.outstandingBalance)}
          />
        </div>

        {result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                <CheckCircle size={21} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-emerald-950">
                  Payment Recorded Successfully
                </p>
                {result.idempotentReplay ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    This response was returned from a previous matching request.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryDetail
                label="Payment No"
                value={valueOrNotAvailable(
                  getFirstValue(payment, ["payment_no", "paymentNo", "id"])
                )}
              />
              <SummaryDetail
                label="Amount"
                value={formatCurrency(getFirstValue(payment, ["amount"]))}
              />
              <SummaryDetail
                label="Receipt No"
                value={valueOrNotAvailable(
                  getFirstValue(receipt, ["receipt_no", "receiptNo", "id"])
                )}
              />
              <SummaryDetail
                label="Outstanding Balance"
                value={
                  successOutstanding
                    ? formatCurrency(successOutstanding)
                    : "Not available"
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payment Amount *">
              <TraderInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Payment Mode *">
              <TraderSelect
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                disabled={submitting}
              >
                <option value="" disabled>
                  Select mode
                </option>
                {recordPaymentModes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </TraderSelect>
            </Field>
            <Field label="Bank Reference">
              <TraderInput
                placeholder="Reference number"
                value={bankReference}
                onChange={(event) => setBankReference(event.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Bank Name">
              <TraderInput
                placeholder="Bank name"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Account Holder Name">
              <TraderInput
                placeholder="Account holder"
                value={accountHolderName}
                onChange={(event) => setAccountHolderName(event.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Paid At *">
              <TraderInput
                type="datetime-local"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Remarks" wide>
              <TraderTextarea
                rows={3}
                placeholder="Add payment notes"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                disabled={submitting}
              />
            </Field>
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <ModalActions>
          {result ? (
            <>
              <TraderButton
                type="button"
                variant="secondary"
                onClick={() => onViewReceipt(receiptId)}
                disabled={!receiptId}
              >
                View Receipt
              </TraderButton>
              <TraderButton type="button" onClick={onDone}>
                Done
              </TraderButton>
            </>
          ) : (
            <>
              <TraderButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </TraderButton>
              <TraderButton type="submit" disabled={!canSubmit}>
                {submitting ? "Recording..." : "Record Payment"}
              </TraderButton>
            </>
          )}
        </ModalActions>
      </form>
    </Modal>
  );
}

function ProcurementDetailsModal({
  open,
  procurement,
  onClose,
}) {
  const raw = procurement?.raw || {};

  return (
    <Modal
      open={open}
      title="Procurement Details"
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="space-y-5">
        <DetailSection title="Procurement">
          <SummaryDetail label="Procurement No" value={procurement?.procurementNo || notAvailable} />
          <SummaryDetail label="Status" value={procurement?.status || notAvailable} />
          <SummaryDetail label="Harvest Reference" value={procurement?.harvest || notAvailable} />
          <SummaryDetail label="Producer / Farmer" value={procurement?.producer || notAvailable} />
        </DetailSection>

        <DetailSection title="Weights And Values">
          <SummaryDetail label="Actual Weight" value={formatWeight(procurement?.actualWeight || notAvailable)} />
          <SummaryDetail
            label="Rate Per Kg"
            value={formatOptionalCurrency(getFirstValue(raw, ["rate_per_kg", "ratePerKg"]))}
          />
          <SummaryDetail
            label="Gross Value"
            value={formatOptionalCurrency(getFirstValue(raw, ["gross_amount", "grossAmount"]))}
          />
          <SummaryDetail
            label="Adjustment"
            value={formatOptionalCurrency(getFirstValue(raw, ["adjustment_amount", "adjustmentAmount"]))}
          />
          <SummaryDetail
            label="Tax"
            value={formatOptionalCurrency(getFirstValue(raw, ["tax_amount", "taxAmount"]))}
          />
          <SummaryDetail label="Total Value" value={formatCurrency(procurement?.totalValue)} />
        </DetailSection>

        <DetailSection title="Settlement">
          <SummaryDetail label="Total Paid" value={formatCurrency(procurement?.totalPaid)} />
          <SummaryDetail label="Outstanding Balance" value={formatCurrency(procurement?.outstandingBalance)} />
          <SummaryDetail
            label="Payments Count"
            value={Array.isArray(procurement?.payments) ? String(procurement.payments.length) : notAvailable}
          />
          <SummaryDetail
            label="Procurement Date"
            value={formatDateTime(getFirstValue(raw, ["procurement_date", "procurementDate"]))}
          />
        </DetailSection>

        <DetailSection title="Terms And Authorization">
          <SummaryDetail
            label="Payment Terms"
            value={valueOrNotAvailable(getFirstValue(raw, ["payment_terms", "paymentTerms"]))}
          />
          <SummaryDetail
            label="Trader GSTIN"
            value={valueOrNotAvailable(getFirstValue(raw, ["trader_gstin", "traderGstin"]))}
          />
          <SummaryDetail
            label="Authorized Signatory"
            value={valueOrNotAvailable(getFirstValue(raw, ["authorized_signatory", "authorizedSignatory"]))}
          />
        </DetailSection>

        <ModalActions>
          <TraderButton type="button" variant="secondary" onClick={onClose}>
            Close
          </TraderButton>
        </ModalActions>
      </div>
    </Modal>
  );
}

function ReceiptDetailsModal({
  open,
  onClose,
  receiptId,
  receipt,
  loading,
  error,
  onRetry,
  printLoading,
  printError,
  onPrint,
}) {
  const receiptNo = receipt?.receiptNo || notAvailable;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div className="flex max-h-[90dvh] w-full max-w-[1050px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
              Payment Receipt
            </p>
            {receiptNo !== notAvailable ? (
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                {receiptNo}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={printLoading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <ReceiptDetailsLoading />
          ) : error ? (
            <ErrorState
              title="Unable to load receipt details."
              message={error || "Unable to load receipt details."}
              onRetry={onRetry}
            />
          ) : (
            <div className="space-y-5">
              <ReceiptSection title="Receipt Information" gridClassName="sm:grid-cols-3">
                <SummaryDetail label="Receipt No" value={receiptNo} />
                <SummaryDetail label="Payment No" value={receipt?.paymentNo || notAvailable} />
                <SummaryDetail label="Procurement No" value={receipt?.procurementNo || notAvailable} />
              </ReceiptSection>

              <ReceiptSection title="Trader Details" gridClassName="sm:grid-cols-2">
                <SummaryDetail label="Trader Name" value={receipt?.traderName || notAvailable} />
                <SummaryDetail label="Trader Code" value={receipt?.traderCode || notAvailable} />
                <SummaryDetail label="Trader GSTIN" value={receipt?.traderGstin || notAvailable} />
                <SummaryDetail label="Authorized Signatory" value={receipt?.authorizedSignatory || notAvailable} />
              </ReceiptSection>

              <ReceiptSection title="Producer / Farmer" gridClassName="sm:grid-cols-2">
                <SummaryDetail label="Producer / Farmer Name" value={receipt?.farmerName || notAvailable} />
                <SummaryDetail label="Mobile" value={receipt?.farmerMobile || notAvailable} />
                <SummaryDetail label="Farm Name" value={receipt?.farmName || notAvailable} />
                <SummaryDetail label="Harvest Reference" value={receipt?.harvestReference || notAvailable} />
              </ReceiptSection>

              <ReceiptSection title="Procurement / Settlement" gridClassName="sm:grid-cols-2 lg:grid-cols-5">
                <SummaryDetail
                  label="Procurement Value"
                  value={formatOptionalCurrency(receipt?.procurementValue)}
                />
                <SummaryDetail
                  label="Paid Before"
                  value={formatOptionalCurrency(receipt?.paidBefore)}
                />
                <SummaryDetail
                  label="Current Payment"
                  className="border-emerald-200 bg-emerald-50"
                  value={formatOptionalCurrency(receipt?.currentPayment)}
                />
                <SummaryDetail
                  label="Paid After"
                  value={formatOptionalCurrency(receipt?.paidAfter)}
                />
                <SummaryDetail
                  label="Outstanding Balance"
                  className="border-amber-200 bg-amber-50"
                  value={formatOptionalCurrency(receipt?.outstandingBalance)}
                />
              </ReceiptSection>

              <ReceiptSection title="Payment Information" gridClassName="sm:grid-cols-2 lg:grid-cols-3">
                <SummaryDetail label="Payment Mode" value={receipt?.paymentMode || notAvailable} />
                <SummaryDetail label="Bank Reference" value={receipt?.bankReference || notAvailable} />
                <SummaryDetail label="Bank Name" value={receipt?.bankName || notAvailable} />
                <SummaryDetail label="Account Holder Name" value={receipt?.accountHolderName || notAvailable} />
                <SummaryDetail label="Paid At" value={formatDateTime(receipt?.paidAt)} />
                <SummaryDetail label="Remarks" value={receipt?.remarks || notAvailable} />
              </ReceiptSection>
            </div>
          )}
        </div>

        {printError ? (
          <div className="mx-5 mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-6">
            {printError}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:justify-end sm:p-6">
          <TraderButton
            type="button"
            onClick={onPrint}
            disabled={loading || Boolean(error) || !receiptId || printLoading}
            className="w-full sm:w-auto"
          >
            <Printer size={17} aria-hidden="true" />
            {printLoading ? "Preparing..." : "Print / Save Payment Receipt PDF"}
          </TraderButton>
        </div>
      </div>
    </div>
  );
}
function SummaryCard({ label, value, icon: Icon, iconClass }) {
  return (
    <TraderCard className="p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          ].join(" ")}
        >
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </TraderCard>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-10 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15",
        active
          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/10"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TableHead({ children, className = "" }) {
  return (
    <th className={["whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", className].join(" ")}>
      {children}
    </th>
  );
}

function TableCell({ children, className = "" }) {
  return (
    <td className={["truncate whitespace-nowrap overflow-hidden px-3 py-3 text-sm text-slate-700", className].join(" ")}>
      {children}
    </td>
  );
}

function ProcurementTableRow({
  procurement,
  receipts,
  receiptsLoading,
  receiptsError,
  onView,
  onRecordPayment,
  onViewReceipts,
}) {
  const recordPaymentAllowed = canRecordPayment(procurement);
  const hasReceipts = receipts.length > 0;
  const receiptTitle = receiptsLoading
    ? "Checking payment receipts"
    : receiptsError
      ? "Unable to load payment receipts"
      : hasReceipts
        ? "View Payment Receipts"
        : "No payment receipt yet";

  return (
    <tr className="hover:bg-slate-50">
      <TableCell>
        <p className="max-w-[120px] truncate text-sm font-semibold text-slate-950">{procurement.procurementNo}</p>
        {procurement.harvest !== notAvailable ? (
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            Harvest Reference: {procurement.harvest}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <span className="block max-w-[120px] truncate text-sm">{procurement.producer}</span>
      </TableCell>
      <TableCell className="text-right text-sm font-bold text-slate-900">
        {formatCurrency(procurement.totalValue)}
      </TableCell>
      <TableCell className="text-right text-sm">
        {formatCurrency(procurement.totalPaid)}
      </TableCell>
      <TableCell className="text-right text-sm font-bold text-slate-900">
        {formatCurrency(procurement.outstandingBalance)}
      </TableCell>
      <TableCell className="text-center">
        <PaymentStatusBadge status={procurement.status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-nowrap items-center justify-end gap-2">
          <button
            type="button"
            title="View Procurement"
            aria-label="View procurement details"
            onClick={() => onView(procurement)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
          >
            <Eye size={14} aria-hidden="true" />
          </button>
          {recordPaymentAllowed ? (
            <button
              type="button"
              title="Record Payment"
              aria-label="Record payment"
              onClick={() => onRecordPayment(procurement)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
            >
              <CreditCard size={14} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            title={receiptTitle}
            aria-label={receiptTitle}
            onClick={() => onViewReceipts(procurement)}
            disabled={!hasReceipts || receiptsLoading || Boolean(receiptsError)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10"
          >
            <Receipt size={14} aria-hidden="true" />
          </button>
        </div>
      </TableCell>
    </tr>
  );
}

function ProcurementMobileCard({
  procurement,
  receipts,
  receiptsLoading,
  receiptsError,
  onView,
  onRecordPayment,
  onViewReceipts,
}) {
  const recordPaymentAllowed = canRecordPayment(procurement);
  const hasReceipts = receipts.length > 0;
  const receiptTitle = receiptsLoading
    ? "Checking payment receipts"
    : receiptsError
      ? "Unable to load payment receipts"
      : hasReceipts
        ? "View Payment Receipts"
        : "No payment receipt yet";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {procurement.procurementNo}
          </p>
          {procurement.harvest !== notAvailable ? (
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              Harvest Reference: {procurement.harvest}
            </p>
          ) : null}
          {procurement.producer !== notAvailable ? (
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              Farmer: {procurement.producer}
            </p>
          ) : null}
        </div>
        <PaymentStatusBadge status={procurement.status} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <SummaryDetail label="Total" value={formatCurrency(procurement.totalValue)} />
        <SummaryDetail label="Paid" value={formatCurrency(procurement.totalPaid)} />
        <SummaryDetail
          label="Outstanding"
          value={formatCurrency(procurement.outstandingBalance)}
        />
      </div>

      <div
        className={[
          "mt-4 flex flex-nowrap items-center gap-2",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => onView(procurement)}
          title="View Procurement"
          aria-label="View procurement details"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Eye size={16} aria-hidden="true" />
        </button>
        {recordPaymentAllowed ? (
          <button
            type="button"
            onClick={() => onRecordPayment(procurement)}
            title="Record Payment"
            aria-label="Record payment"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <CreditCard size={16} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          title={receiptTitle}
          aria-label={receiptTitle}
          onClick={() => onViewReceipts(procurement)}
          disabled={!hasReceipts || receiptsLoading || Boolean(receiptsError)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Receipt size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ReceiptTableRow({ receipt, printLoading, onView, onPrint }) {
  const hasReceiptId = Boolean(receipt.id);

  return (
    <tr className="hover:bg-slate-50">
      <TableCell className="font-black text-slate-950">
        {receipt.receiptNo}
      </TableCell>
      <TableCell>{receipt.procurementNo}</TableCell>
      <TableCell>{receipt.producer}</TableCell>
      <TableCell className="font-bold text-slate-900">
        {formatOptionalCurrency(receipt.amount)}
      </TableCell>
      <TableCell>{receipt.paymentMode}</TableCell>
      <TableCell>{formatDateTime(receipt.paidAt)}</TableCell>
      <TableCell className="font-bold text-slate-900">
        {formatOptionalCurrency(receipt.outstandingBalance)}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            title="View Payment Receipt"
            aria-label="View Payment Receipt"
            onClick={() => onView(receipt.id)}
            disabled={!hasReceiptId}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Eye size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Print Payment Receipt"
            aria-label="Print Payment Receipt"
            onClick={() => onPrint(receipt.id)}
            disabled={!hasReceiptId || printLoading}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Printer size={17} aria-hidden="true" />
          </button>
        </div>
      </TableCell>
    </tr>
  );
}

function ReceiptMobileCard({ receipt, printLoading, onView, onPrint }) {
  const hasReceiptId = Boolean(receipt.id);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {receipt.receiptNo}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            Procurement: {receipt.procurementNo}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
          {receipt.paymentMode}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <SummaryDetail label="Producer" value={receipt.producer} />
        <SummaryDetail label="Amount" value={formatOptionalCurrency(receipt.amount)} />
        <SummaryDetail label="Paid Date" value={formatDateTime(receipt.paidAt)} />
        <SummaryDetail
          label="Outstanding"
          value={formatOptionalCurrency(receipt.outstandingBalance)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="View Payment Receipt"
          aria-label="View Payment Receipt"
          onClick={() => onView(receipt.id)}
          disabled={!hasReceiptId}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Eye size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Print Payment Receipt"
          aria-label="Print Payment Receipt"
          onClick={() => onPrint(receipt.id)}
          disabled={!hasReceiptId || printLoading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Printer size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ProcurementTableLoading() {
  return Array.from({ length: 4 }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: 7 }).map((__, cellIndex) => (
        <td key={cellIndex} className="px-5 py-5">
          <div className="h-4 w-full max-w-28 animate-pulse rounded-full bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}

function ProcurementCardLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
        >
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 grid gap-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceiptTableLoading() {
  return Array.from({ length: 4 }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: 8 }).map((__, cellIndex) => (
        <td key={cellIndex} className="px-5 py-5">
          <div className="h-4 w-full max-w-28 animate-pulse rounded-full bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}

function ReceiptCardLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
        >
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 grid gap-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceiptDetailsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <section
          key={index}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="h-16 animate-pulse rounded-xl bg-white" />
            <div className="h-16 animate-pulse rounded-xl bg-white" />
          </div>
        </section>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p>
    </div>
  );
}

function ErrorState({ title = "Unable to load procurements.", message, onRetry }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-black text-red-900">
        {title}
      </p>
      {message ? (
        <p className="mt-1 text-sm leading-6 text-red-700">{message}</p>
      ) : null}
      <TraderButton type="button" variant="secondary" onClick={onRetry} className="mt-4">
        <RefreshCw size={17} aria-hidden="true" />
        Retry
      </TraderButton>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={["block min-w-0", wide ? "sm:col-span-2" : ""].join(" ")}>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ProcurementReceiptsModal({
  open,
  procurement,
  receipts,
  printLoading,
  printError,
  onClose,
  onView,
  onPrint,
}) {
  return (
    <Modal
      open={open}
      title="Payment Receipts"
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="space-y-5">
        <DetailSection title="Procurement">
          <SummaryDetail
            label="Procurement No"
            value={procurement?.procurementNo || notAvailable}
          />
          <SummaryDetail
            label="Producer / Farmer"
            value={procurement?.producer || notAvailable}
          />
          <SummaryDetail
            label="Total Value"
            value={formatCurrency(procurement?.totalValue)}
          />
          <SummaryDetail
            label="Outstanding Balance"
            value={formatCurrency(procurement?.outstandingBalance)}
          />
        </DetailSection>

        <div className="rounded-2xl border border-slate-200">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr>
                <TableHead>Receipt No</TableHead>
                <TableHead>Current Payment</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Paid At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {receipts.map((receipt) => (
                <tr key={receipt.id || receipt.receiptNo}>
                  <TableCell className="font-black text-slate-950">
                    {receipt.receiptNo}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">
                    {formatOptionalCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell>{receipt.paymentMode}</TableCell>
                  <TableCell>{formatDateTime(receipt.paidAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <button
                        type="button"
                        title="View Payment Receipt"
                        aria-label="View Payment Receipt"
                        onClick={() => onView(receipt.id)}
                        disabled={!receipt.id}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <Eye size={17} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Print Payment Receipt"
                        aria-label="Print Payment Receipt"
                        onClick={() => onPrint(receipt.id)}
                        disabled={!receipt.id || printLoading}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <Printer size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {printError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {printError}
          </div>
        ) : null}

        <ModalActions>
          <TraderButton type="button" variant="secondary" onClick={onClose}>
            Close
          </TraderButton>
        </ModalActions>
      </div>
    </Modal>
  );
}

function ReceiptSection({ title, children, gridClassName = "sm:grid-cols-2" }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className={["mt-3 grid grid-cols-1 gap-3", gridClassName].join(" ")}>
        {children}
      </div>
    </section>
  );
}

function ModalActions({ children }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

function SummaryDetail({ label, value, className = "" }) {
  return (
    <div className={["min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3", className].join(" ")}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const label = String(status || "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const tone = {
    CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
    PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <TraderStatusBadge
      status={status}
      className={["whitespace-nowrap px-2 py-1 text-xs", tone[status] || ""].join(" ")}
    >
      {label || status}
    </TraderStatusBadge>
  );
}

