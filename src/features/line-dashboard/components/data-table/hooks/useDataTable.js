"use client"

import * as React from "react"

import { DEFAULT_TABLE, getDefaultFromValue, getDefaultToValue } from "../utils/constants"
import { composeEqpChamber, normalizeTablePayload } from "../../../utils"
import { useCellIndicators } from "./useCellIndicators"

/* ============================================================================
 * 작은 유틸: 객체에서 키 지우기 (불변성 유지)
 *  - deleteKeys(record, ["a","b"]) → a,b 키만 제거된 "새 객체" 반환
 *  - removeKey(record, "a") → 단일 키 제거
 *  - 원본 객체는 건드리지 않습니다(불변성 유지로 리액트 상태 업데이트 안전)
 * ========================================================================== */
function deleteKeys(record, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return record
  let next = null
  for (const key of keys) {
    if (key in record) {
      if (next === null) next = { ...record }
      delete next[key]
    }
  }
  return next ?? record
}
function removeKey(record, key) {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

/* ============================================================================
 * useDataTableState
 * - 테이블 데이터/필터/정렬/편집 상태와, 서버 fetch/update를 관리하는 커스텀 훅
 * - 초보자 포인트:
 *   1) "요청 식별자(rowsRequestRef)"로 오래된 응답이 최신 상태를 덮지 않게 보호
 *   2) 날짜 유효성(from/to) 가드 + UX 친화적 기본값 적용
 *   3) 업데이트 중인 셀(skeleton/indicator)/오류 맵을 키(`rowId:field`)로 관리
 * ========================================================================== */
export function useDataTableState({ lineId }) {
  /* ── 1) 화면 상태: 테이블 선택/컬럼/행/날짜/검색/정렬/편집 등 ─────────────── */
  const [selectedTable, setSelectedTable] = React.useState(DEFAULT_TABLE)

  // 서버가 내려주는 원시 컬럼 키 배열(가공 후 세팅)
  const [columns, setColumns] = React.useState([])

  // 실제 테이블 행 데이터
  const [rows, setRows] = React.useState([])

  // 날짜 입력 값(사용자 폼 값): 문자열(YYYY-MM-DD)
  const [fromDate, setFromDate] = React.useState(() => getDefaultFromValue())
  const [toDate, setToDate] = React.useState(() => getDefaultToValue())

  // 실제로 서버에 적용된 날짜 범위(서버 응답으로 동기화)
  const [appliedFrom, setAppliedFrom] = React.useState(() => getDefaultFromValue())
  const [appliedTo, setAppliedTo] = React.useState(() => getDefaultToValue())

  // 전역 검색(퀵필터와 별도)
  const [filter, setFilter] = React.useState("")

  // 정렬 상태(TanStack Table v8 표준 형태)
  const [sorting, setSorting] = React.useState([])

  // 셀 편집: comment
  const [commentDrafts, setCommentDrafts] = React.useState({})   // { [rowId]: "draft text" }
  const [commentEditing, setCommentEditing] = React.useState({}) // { [rowId]: true }

  // 셀 편집: needtosend
  const [needToSendDrafts, setNeedToSendDrafts] = React.useState({}) // { [rowId]: 0|1 }

  // 업데이트 진행중/에러 상태: 키 형식은 `${rowId}:${field}`
  const [updatingCells, setUpdatingCells] = React.useState({})  // { ["1:comment"]: true, ... }
  const [updateErrors, setUpdateErrors] = React.useState({})    // { ["1:comment"]: "에러메시지", ... }

  // 로딩/에러/카운트
  const [isLoadingRows, setIsLoadingRows] = React.useState(false)
  const [rowsError, setRowsError] = React.useState(null)
  const [lastFetchedCount, setLastFetchedCount] = React.useState(0)

  // 가장 최근 fetch 요청 id(오래된 응답 무효화용)
  const rowsRequestRef = React.useRef(0)

  // 셀 하이라이트/토스트 등 시각 피드백 훅
  const { cellIndicators, begin, finalize } = useCellIndicators()

  /* ────────────────────────────────────────────────────────────────────────
   * fetchRows: 서버에서 테이블 데이터 가져오기
   *  - 날짜(from/to) 뒤바뀜 자동 교정
   *  - /api/tables?table=...&from=...&to=...&lineId=...
   *  - normalizeTablePayload로 응답을 안전하게 정규화
   *  - 오래된 응답 방어(rowsRequestRef 활용)
   * ──────────────────────────────────────────────────────────────────────── */
  const fetchRows = React.useCallback(async () => {
    const requestId = ++rowsRequestRef.current // 이 fetch의 고유 id
    setIsLoadingRows(true)
    setRowsError(null)

    try {
      // 1) 날짜 유효성 정리(입력값이 비어있으면 null)
      let effectiveFrom = fromDate && fromDate.length > 0 ? fromDate : null
      let effectiveTo = toDate && toDate.length > 0 ? toDate : null

      // 2) from > to 인 경우 자동 스왑(UX 방어)
      if (effectiveFrom && effectiveTo) {
        const fromTime = new Date(`${effectiveFrom}T00:00:00Z`).getTime()
        const toTime = new Date(`${effectiveTo}T23:59:59Z`).getTime()
        if (Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime > toTime) {
          ;[effectiveFrom, effectiveTo] = [effectiveTo, effectiveFrom]
        }
      }

      // 3) 쿼리스트링 구성
      const params = new URLSearchParams({ table: selectedTable })
      if (effectiveFrom) params.set("from", effectiveFrom)
      if (effectiveTo) params.set("to", effectiveTo)
      if (lineId) params.set("lineId", lineId)

      // 4) 요청(캐시 미사용)
      const response = await fetch(`/api/tables?${params.toString()}`, { cache: "no-store" })

      // 5) JSON 파싱 시도(실패해도 빈 객체)
      let payload = {}
      try {
        payload = await response.json()
      } catch {
        payload = {}
      }

      // 6) HTTP 에러 처리(서버가 보내준 error 메시지 우선)
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Request failed with status ${response.status}`
        throw new Error(message)
      }

      // 7) 오래된 응답 무시(요청 id가 최신이 아니면 리턴)
      if (rowsRequestRef.current !== requestId) return

      // 8) 페이로드 정규화(누락 필드 기본값 채우기)
      const defaults = { table: DEFAULT_TABLE, from: getDefaultFromValue(), to: getDefaultToValue() }
      const {
        columns: fetchedColumns,
        rows: fetchedRows,
        rowCount,
        from: appliedFromValue,
        to: appliedToValue,
        table,
      } = normalizeTablePayload(payload, defaults)

      // 9) 원본 id 컬럼 숨기기(id는 내부적으로만 사용)
      const baseColumns = fetchedColumns.filter((column) => column && column.toLowerCase() !== "id")

      // 10) EQP_CB(설비+챔버 합성표시) 생성
      const composedRows = fetchedRows.map((row) => {
        // 들어오는 키 케이스가 들쭉날쭉할 수 있어 모두 대응
        const eqpId = row?.eqp_id ?? row?.EQP_ID ?? row?.EqpId
        const chamber = row?.chamber_ids ?? row?.CHAMBER_IDS ?? row?.ChamberIds
        return { ...row, EQP_CB: composeEqpChamber(eqpId, chamber) }
      })

      // 11) 원본 eqp/chamber 컬럼 제거(EQP_CB에 집약했으므로)
      const columnsWithoutOriginals = baseColumns.filter((column) => {
        const normalized = column.toLowerCase()
        return normalized !== "eqp_id" && normalized !== "chamber_ids"
      })

      // 12) EQP_CB가 없다면 선두에 삽입(가독성↑)
      const nextColumns = columnsWithoutOriginals.includes("EQP_CB")
        ? columnsWithoutOriginals
        : ["EQP_CB", ...columnsWithoutOriginals]

      // 13) 상태 업데이트(하위 편집 상태 초기화 포함)
      setColumns(nextColumns)
      setRows(composedRows)
      setLastFetchedCount(rowCount)
      setAppliedFrom(appliedFromValue ?? null)
      setAppliedTo(appliedToValue ?? null)
      setCommentDrafts({})
      setCommentEditing({})
      setNeedToSendDrafts({})

      // 서버가 table을 교정해 내려준 경우 동기화(방어적)
      if (table && table !== selectedTable) {
        setSelectedTable(table)
      }
    } catch (error) {
      // 요청 id가 최신이 아닐 때는 무시
      if (rowsRequestRef.current !== requestId) return

      // 사용자에게 보여줄 에러 메시지
      const message = error instanceof Error ? error.message : "Failed to load table rows"

      // 안전한 초기화
      setRowsError(message)
      setColumns([])
      setRows([])
      setLastFetchedCount(0)
    } finally {
      // 내 요청이 최신일 때만 로딩 종료
      if (rowsRequestRef.current === requestId) setIsLoadingRows(false)
    }
  }, [fromDate, toDate, selectedTable, lineId])

  // 최초/의존성 변경 시 데이터 로드
  React.useEffect(() => {
    fetchRows()
  }, [fetchRows])

  /* ────────────────────────────────────────────────────────────────────────
   * 에러 메시지 1건 제거(셀 포커스 시 이전 에러를 치울 때 유용)
   * ──────────────────────────────────────────────────────────────────────── */
  const clearUpdateError = React.useCallback((key) => {
    setUpdateErrors((prev) => removeKey(prev, key))
  }, [])

  /* ────────────────────────────────────────────────────────────────────────
   * handleUpdate: 단일 레코드 부분 업데이트(PATCH)
   *  - updates = { comment: "...", needtosend: 1 } 식으로 필드 묶음 전달
   *  - updatingCells/indicators로 진행상태 UI 피드백
   *  - 성공 시 로컬 rows 반영 + 드래프트/편집 상태 정리
   * ──────────────────────────────────────────────────────────────────────── */
  const handleUpdate = React.useCallback(
    async (recordId, updates) => {
      const fields = Object.keys(updates)
      if (!recordId || fields.length === 0) return false

      // 셀 키들: ["{id}:comment", "{id}:needtosend", ...]
      const cellKeys = fields.map((field) => `${recordId}:${field}`)

      // 1) "업데이트 중" 표시 on
      setUpdatingCells((prev) => {
        const next = { ...prev }
        for (const key of cellKeys) next[key] = true
        return next
      })

      // 2) 기존 에러 메시지 클리어
      setUpdateErrors((prev) => {
        const next = { ...prev }
        for (const key of cellKeys) {
          if (key in next) delete next[key]
        }
        return next
      })

      // 3) 셀 인디케이터 시작(시각 효과)
      begin(cellKeys)

      let updateSucceeded = false

      try {
        // 4) 서버 PATCH 호출
        const response = await fetch("/api/tables/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: selectedTable, id: recordId, updates }),
        })

        // 5) 응답 파싱(에러 메시지 추출 대비)
        let payload = {}
        try {
          payload = await response.json()
        } catch {
          payload = {}
        }

        // 6) HTTP 에러 처리
        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `Failed to update (status ${response.status})`
          throw new Error(message)
        }

        // 7) 로컬 rows 반영(낙관적 업데이트 확정)
        setRows((previousRows) =>
          previousRows.map((row) => {
            const rowId = String(row?.id ?? "")
            return rowId === recordId ? { ...row, ...updates } : row
          })
        )

        // 8) 관련 드래프트/편집 상태 정리
        if ("comment" in updates) {
          setCommentDrafts((prev) => removeKey(prev, recordId))
          setCommentEditing((prev) => removeKey(prev, recordId))
        }
        if ("needtosend" in updates) {
          setNeedToSendDrafts((prev) => removeKey(prev, recordId))
        }

        updateSucceeded = true
        return true
      } catch (error) {
        // 9) 에러 메시지 매핑(셀별로 동일 메시지)
        const message = error instanceof Error ? error.message : "Failed to update"
        setUpdateErrors((prev) => {
          const next = { ...prev }
          for (const key of cellKeys) next[key] = message
          return next
        })
        return false
      } finally {
        // 10) 진행중 off + 인디케이터 종료(성공/실패 상태)
        setUpdatingCells((prev) => deleteKeys(prev, cellKeys))
        finalize(cellKeys, updateSucceeded ? "success" : "error")
      }
    },
    [selectedTable, begin, finalize]
  )

  /* ────────────────────────────────────────────────────────────────────────
   * comment 편집 상태/드래프트 값 컨트롤러 (셀 컴포넌트가 호출)
   * ──────────────────────────────────────────────────────────────────────── */
  const setCommentEditingState = React.useCallback((recordId, editing) => {
    if (!recordId) return
    setCommentEditing((prev) => (editing ? { ...prev, [recordId]: true } : removeKey(prev, recordId)))
  }, [])

  const setCommentDraftValue = React.useCallback((recordId, value) => {
    if (!recordId) return
    setCommentDrafts((prev) => ({ ...prev, [recordId]: value }))
  }, [])

  const removeCommentDraftValue = React.useCallback((recordId) => {
    if (!recordId) return
    setCommentDrafts((prev) => removeKey(prev, recordId))
  }, [])

  /* ────────────────────────────────────────────────────────────────────────
   * needtosend 드래프트 값 컨트롤러
   * ──────────────────────────────────────────────────────────────────────── */
  const setNeedToSendDraftValue = React.useCallback((recordId, value) => {
    if (!recordId) return
    setNeedToSendDrafts((prev) => ({ ...prev, [recordId]: value }))
  }, [])

  const removeNeedToSendDraftValue = React.useCallback((recordId) => {
    if (!recordId) return
    setNeedToSendDrafts((prev) => removeKey(prev, recordId))
  }, [])

  /* ────────────────────────────────────────────────────────────────────────
   * TanStack Table의 meta로 내려줄 컨트롤/상태 모음
   * - 셀 컴포넌트(CommentCell/NeedToSendCell)가 이 객체의 함수를 직접 호출
   * ──────────────────────────────────────────────────────────────────────── */
  const tableMeta = {
    commentDrafts,
    commentEditing,
    needToSendDrafts,
    updatingCells,
    updateErrors,
    cellIndicators,
    clearUpdateError,
    setCommentDraftValue,
    removeCommentDraftValue,
    setCommentEditingState,
    setNeedToSendDraftValue,
    removeNeedToSendDraftValue,
    handleUpdate,
  }

  /* ────────────────────────────────────────────────────────────────────────
   * 훅 바깥에서 쓸 값들 반환
   *  - isLoadingRows / rowsError / lastFetchedCount: 로드 상태와 피드백
   *  - fetchRows: 새로고침(리로드) 버튼 등에 연결 가능
   * ──────────────────────────────────────────────────────────────────────── */
  return {
    selectedTable,
    columns,
    rows,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    appliedFrom,
    appliedTo,
    filter,
    setFilter,
    sorting,
    setSorting,
    isLoadingRows,
    rowsError,
    lastFetchedCount,
    fetchRows,
    tableMeta,
  }
}
