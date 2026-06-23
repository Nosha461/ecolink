const STORAGE_KEY = "EcoLinkCartDealMeta";

function readCartDealMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCartDealMeta(meta) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

function findMetaByField(meta, field, value) {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value);
  const entry = Object.entries(meta).find(([, item]) => String(item?.[field] || "") === normalizedValue);
  return entry ? { key: entry[0], item: entry[1] } : null;
}

export function saveCartDealMeta({
  wasteId,
  orderId,
  requestId,
  status = "approved",
  originalAmount,
  supplierAmount,
  commissionAmount,
  currency,
}) {
  if (!wasteId && !orderId && !requestId) {
    return;
  }

  const meta = readCartDealMeta();
  const existingByWaste = wasteId ? { key: String(wasteId), item: meta[String(wasteId)] || {} } : null;
  const existingByOrder = findMetaByField(meta, "orderId", orderId);
  const existingByRequest = findMetaByField(meta, "requestId", requestId);
  const target = existingByWaste || existingByOrder || existingByRequest;
  const metaKey = target?.key || String(wasteId || orderId || requestId);

  meta[metaKey] = {
    ...(target?.item || {}),
    wasteId: String(wasteId || target?.item?.wasteId || metaKey),
    orderId: orderId || target?.item?.orderId || "",
    requestId: requestId || target?.item?.requestId || "",
    status,
    originalAmount: Number(originalAmount || target?.item?.originalAmount || 0),
    supplierAmount: Number(supplierAmount || target?.item?.supplierAmount || 0),
    commissionAmount: Number(commissionAmount || target?.item?.commissionAmount || 0),
    currency: currency || target?.item?.currency || "EGP",
    savedAt: new Date().toISOString(),
  };
  writeCartDealMeta(meta);
}

export function markCartDealMetaPaid({
  wasteId,
  orderId,
  requestId,
  originalAmount,
  supplierAmount,
  commissionAmount,
  currency,
}) {
  const meta = readCartDealMeta();
  const normalizedOrderId = String(orderId || "");
  const normalizedWasteId = String(wasteId || "");
  const normalizedRequestId = String(requestId || "");
  const targetKey =
    normalizedWasteId ||
    findMetaByField(meta, "orderId", normalizedOrderId)?.key ||
    findMetaByField(meta, "requestId", normalizedRequestId)?.key;

  if (!targetKey && !(normalizedWasteId || normalizedOrderId || normalizedRequestId)) {
    return;
  }

  const metaKey = targetKey || normalizedWasteId || normalizedOrderId || normalizedRequestId;
  meta[metaKey] = {
    ...(meta[metaKey] || {}),
    orderId: normalizedOrderId || meta[targetKey]?.orderId || "",
    requestId: normalizedRequestId || meta[targetKey]?.requestId || "",
    wasteId: normalizedWasteId || meta[targetKey]?.wasteId || metaKey,
    status: "completed",
    paymentStatus: "paid",
    originalAmount: Number(originalAmount || meta[targetKey]?.originalAmount || meta[metaKey]?.originalAmount || 0),
    supplierAmount: Number(supplierAmount || meta[targetKey]?.supplierAmount || meta[metaKey]?.supplierAmount || 0),
    commissionAmount: Number(commissionAmount || meta[targetKey]?.commissionAmount || meta[metaKey]?.commissionAmount || 0),
    currency: currency || meta[targetKey]?.currency || meta[metaKey]?.currency || "EGP",
    paidAt: new Date().toISOString(),
  };
  writeCartDealMeta(meta);
}

export function getCartDealMeta(wasteId) {
  if (!wasteId) {
    return null;
  }

  return readCartDealMeta()[String(wasteId)] || null;
}

export function getCartDealMetaByOrderId(orderId) {
  if (!orderId) {
    return null;
  }

  return findMetaByField(readCartDealMeta(), "orderId", orderId)?.item || null;
}

export function getCartDealMetaByRequestId(requestId) {
  if (!requestId) {
    return null;
  }

  return findMetaByField(readCartDealMeta(), "requestId", requestId)?.item || null;
}

export function clearCartDealMeta(wasteId) {
  if (!wasteId) {
    return;
  }

  const meta = readCartDealMeta();
  delete meta[String(wasteId)];
  writeCartDealMeta(meta);
}
