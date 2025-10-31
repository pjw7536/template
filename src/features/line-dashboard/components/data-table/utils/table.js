const TEXT_ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const JUSTIFY_ALIGN_CLASS = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
}

export function resolveHeaderAlignment(meta) {
  return meta?.alignment?.header ?? meta?.alignment?.cell ?? "left"
}

export function resolveCellAlignment(meta) {
  return meta?.alignment?.cell ?? meta?.alignment?.header ?? "left"
}

export function getTextAlignClass(alignment = "left") {
  return TEXT_ALIGN_CLASS[alignment] ?? TEXT_ALIGN_CLASS.left
}

export function getJustifyClass(alignment = "left") {
  return JUSTIFY_ALIGN_CLASS[alignment] ?? JUSTIFY_ALIGN_CLASS.left
}

export function isNullishDisplay(value) {
  if (value == null) return true
  if (typeof value === "string" && value.trim().toLowerCase() === "null") return true
  return false
}
