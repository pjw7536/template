// /app/api/your-endpoint/route.js
import { NextResponse } from "next/server"
import { runQuery } from "@/lib/db"
import { DEFAULT_TABLE } from "@/features/line-dashboard/components/data-table/utils/constants"

/* ============================================================================
 * 상수 / 정규식
 *  - SAFE_IDENTIFIER : 테이블/컬럼명(식별자) 안전성 체크
 *  - DATE_ONLY_REGEX : YYYY-MM-DD 형식만 허용(시간 미포함)
 *  - DATE_COLUMN_CANDIDATES : 시간 기준으로 쓸 후보 컬럼 목록(우선순위)
 *  - LINE_SDWT_TABLE_NAME : line_id → user_sdwt_prod 매핑 테이블
 *  - DB 타임존 : UTC+9(KST) 기준으로 컷오프 적용 (SQL에서 처리)
 * ========================================================================== */
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DATE_COLUMN_CANDIDATES = ["created_at", "updated_at", "timestamp", "ts", "date"]
const LINE_SDWT_TABLE_NAME = "line_sdwt"

/* ============================================================================
 * 유틸리티
 * ========================================================================== */

/** 테이블/컬럼명 등 식별자 안전성 보장(문자/숫자/_ 만 허용) */
function sanitizeIdentifier(value, fallback = null) {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return SAFE_IDENTIFIER.test(trimmed) ? trimmed : fallback
}

/** YYYY-MM-DD 형식만 허용. 형식만 검증(타임존/파싱은 DB에서 처리) */
function normalizeDateOnly(value) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return DATE_ONLY_REGEX.test(trimmed) ? trimmed : null
}

/** 컬럼 배열에서 대소문자 무시 일치로 대상 컬럼명을 찾아 원래 케이스 그대로 반환 */
function findColumn(columnNames, target) {
  const targetLower = String(target || "").toLowerCase()
  for (const name of columnNames) {
    if (typeof name !== "string") continue
    if (name.toLowerCase() === targetLower) return name
  }
  return null
}

/** 기준 타임스탬프 컬럼을 하나만 선택(우선순위대로) */
function pickBaseTimestampColumn(columnNames) {
  for (const c of DATE_COLUMN_CANDIDATES) {
    const found = findColumn(columnNames, c)
    if (found) return found
  }
  return null
}

/* ============================================================================
 * 라인 필터 생성
 *  - 우선 user_sdwt_prod 매핑(IN (…) )을 시도
 *  - 없으면 line_id = ? 로 대체
 *  - 아무 매칭도 안 되면 earlyEmpty 로 즉시 빈 결과 반환
 * ========================================================================== */
async function buildLineFilters(columnNames, normalizedLineId) {
  const filters = []
  const params = []

  if (!normalizedLineId) {
    return { filters, params, earlyEmpty: false }
  }

  const userSdwtProdColumn = findColumn(columnNames, "user_sdwt_prod")
  const lineIdColumn = findColumn(columnNames, "line_id")

  if (userSdwtProdColumn) {
    const mappingRows = await runQuery(
      `
        SELECT DISTINCT user_sdwt_prod
        FROM \`${LINE_SDWT_TABLE_NAME}\`
        WHERE line_id = ?
          AND user_sdwt_prod IS NOT NULL
          AND user_sdwt_prod <> ''
      `,
      [normalizedLineId]
    )
    const userSdwtProds = Array.from(
      new Set(
        mappingRows
          .map((r) => (typeof r?.user_sdwt_prod === "string" ? r.user_sdwt_prod.trim() : ""))
          .filter((v) => v.length > 0)
      )
    )

    if (userSdwtProds.length === 0) {
      // 라인에 매핑된 sdwt가 전혀 없으면 결과는 빈 집합
      return { filters, params, earlyEmpty: true }
    }

    filters.push(`\`${userSdwtProdColumn}\` IN (${userSdwtProds.map(() => "?").join(", ")})`)
    params.push(...userSdwtProds)
    return { filters, params, earlyEmpty: false }
  }

  if (lineIdColumn) {
    filters.push(`\`${lineIdColumn}\` = ?`)
    params.push(normalizedLineId)
    return { filters, params, earlyEmpty: false }
  }

  // lineId가 왔지만 해당 테이블에선 걸 수 있는 컬럼이 없는 경우 → 필터 미적용(전체)
  return { filters, params, earlyEmpty: false }
}

/* ============================================================================
 * GET 핸들러
 *  - 테이블명 검증
 *  - 컬럼 조회 → 기준 타임스탬프 컬럼 확정(필수)
 *  - 라인 필터 + KST 기준 "최근 36시간" + (선택) from/to(같은 컬럼)에 적용
 *  - 안전한 파라미터 바인딩
 * ========================================================================== */
export async function GET(request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // 쿼리 파라미터
  const tableParam = searchParams.get("table")
  const fromParam = searchParams.get("from") // YYYY-MM-DD
  const toParam = searchParams.get("to")     // YYYY-MM-DD
  const lineIdParam = searchParams.get("lineId")

  // 테이블명 식별자 검증(+DEFAULT_TABLE 폴백)
  const tableName = sanitizeIdentifier(tableParam, DEFAULT_TABLE)
  if (!tableName) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
  }

  // YYYY-MM-DD 형식만 수용(그 외는 무시)
  let normalizedFrom = normalizeDateOnly(fromParam)
  let normalizedTo = normalizeDateOnly(toParam)

  // from > to 이면 스왑
  if (normalizedFrom && normalizedTo) {
    // 문자열 비교 대신 안전하게 Date로 비교하되, UTC 파싱(자정~23:59는 DB에서 처리)
    const fromMs = Date.parse(`${normalizedFrom}T00:00:00Z`)
    const toMs = Date.parse(`${normalizedTo}T23:59:59Z`)
    if (Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs > toMs) {
      ;[normalizedFrom, normalizedTo] = [normalizedTo, normalizedFrom]
    }
  }

  // lineId 단순 정리(문자열/공백 제거)
  const normalizedLineId =
    typeof lineIdParam === "string" && lineIdParam.trim().length > 0 ? lineIdParam.trim() : null

  try {
    // 테이블 컬럼 조회(식별자 조작 방지용)
    const columnRows = await runQuery(`SHOW COLUMNS FROM \`${tableName}\``)
    const columnNames = columnRows.map((c) => c?.Field).filter((v) => typeof v === "string")

    if (columnNames.length === 0) {
      return NextResponse.json({ error: `Table "${tableName}" has no columns` }, { status: 400 })
    }

    // ✅ 기준 타임스탬프 컬럼(필수) : 모든 시간 필터는 이 컬럼에만 적용
    const baseTsCol = pickBaseTimestampColumn(columnNames)
    if (!baseTsCol) {
      // 요구사항상 "최근 36시간" 필터가 핵심 → 기준 컬럼 없으면 명시적으로 에러
      return NextResponse.json(
        {
          error:
            `No timestamp-like column found in "${tableName}". ` +
            `Expected one of: ${DATE_COLUMN_CANDIDATES.join(", ")}.`,
        },
        { status: 400 }
      )
    }

    // 1) 라인 필터 구성
    const { filters: lineFilters, params: lineParams, earlyEmpty } = await buildLineFilters(
      columnNames,
      normalizedLineId
    )
    if (earlyEmpty) {
      // 매핑 자체가 없는 경우 즉시 빈 결과 반환
      return NextResponse.json({
        table: tableName,
        cutoff: `${baseTsCol} >= CONVERT_TZ(UTC_TIMESTAMP(),'UTC','+09:00') - INTERVAL 36 HOUR`,
        from: null,
        to: null,
        rowCount: 0,
        columns: columnNames,
        rows: [],
      })
    }

    const whereParts = [...lineFilters]
    const params = [...lineParams]

    // 2) ✅ KST(UTC+9) 기준 최근 36시간 컷 (SQL에서 타임존 변환)
    //    - 타임존 테이블이 없어도 동작하도록 '+09:00' 사용
    //    - 서버에 tz 테이블이 로드되어 있다면 'Asia/Seoul'로 교체 가능
    whereParts.push(
      `\`${baseTsCol}\` >= (CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', '+09:00') - INTERVAL 36 HOUR)`
    )

    // 3) (선택) from/to도 같은 컬럼에만 추가 (충돌 방지)
    if (normalizedFrom) {
      // KST 기준 문자열로 비교 (DB가 문자열→DATETIME 자동 캐스팅)
      params.push(`${normalizedFrom} 00:00:00`)
      whereParts.push(`\`${baseTsCol}\` >= ?`)
    }
    if (normalizedTo) {
      params.push(`${normalizedTo} 23:59:59`)
      whereParts.push(`\`${baseTsCol}\` <= ?`)
    }

    // WHERE / ORDER BY
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""
    const orderClause = `ORDER BY \`${baseTsCol}\` DESC, \`id\` DESC`

    // 실행
    const rows = await runQuery(
      `
        SELECT *
        FROM \`${tableName}\`
        ${whereClause}
        ${orderClause}
      `,
      params
    )

    return NextResponse.json({
      table: tableName,
      cutoff: `${baseTsCol} >= CONVERT_TZ(UTC_TIMESTAMP(),'UTC','+09:00') - INTERVAL 36 HOUR`,
      from: normalizedFrom || null,
      to: normalizedTo || null,
      rowCount: rows.length,
      columns: columnNames,
      rows,
    })
  } catch (error) {
    // 존재하지 않는 테이블
    if (error && typeof error === "object" && error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ error: `Table "${tableName}" was not found` }, { status: 404 })
    }
    console.error("Failed to load table data", error)
    return NextResponse.json({ error: "Failed to load table data" }, { status: 500 })
  }
}
