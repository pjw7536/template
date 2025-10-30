import { searchableValue } from "./utils"

/**
 * 필터 입력값을 검색 가능한 토큰으로 정규화
 * - 공백만 있는 경우 빈 문자열 반환
 */
function normalizeFilterValue(filterValue) {
  if (filterValue === null || filterValue === undefined) return ""
  const normalized = String(filterValue).trim().toLowerCase()
  return normalized
}

/**
 * 테이블 전역 검색 함수 생성기
 * - columns: 검색 대상 컬럼 키 목록
 * - row: tanstack-table row (row.original에 원본 데이터 존재)
 */
export const createGlobalFilterFn = (columns) => {
  const searchableKeys = Array.from(new Set(columns)).filter(Boolean)

  return (row, _columnId, filterValue) => {
    const keyword = normalizeFilterValue(filterValue)
    if (!keyword) return true

    // 한 행의 컬럼 값 가운데 keyword를 포함하는 항목이 있으면 통과
    return searchableKeys.some((key) => {
      const columnValue = row.original?.[key]
      if (columnValue === undefined || columnValue === null) return false
      return searchableValue(columnValue).includes(keyword)
    })
  }
}
