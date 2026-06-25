/**
 * 折舊計算工具函數
 */

/**
 * 計算定率遞減法的累積折舊
 * @param {number} totalCost - 資產總成本
 * @param {number} rate - 年折舊率（百分比）
 * @param {number} elapsedMonths - 已過月數
 * @param {number} residual - 殘值
 * @returns {number} 累積折舊額
 */
function calcDecliningAccumulated(totalCost, rate, elapsedMonths, residual = 0) {
  const fullYears = Math.floor(elapsedMonths / 12);
  let accumulated = 0;
  let bookValue = totalCost;

  for (let i = 0; i < fullYears; i++) {
    let yearDep = Math.round(bookValue * (rate / 100));
    if (bookValue - yearDep < residual) {
      yearDep = bookValue - residual;
    }
    accumulated += yearDep;
    bookValue -= yearDep;
  }

  // 定率遞減法按年計算折舊，不滿一年的部分不計提
  // 與前端 calcDecliningAccumulated() 邏輯一致

  return accumulated;
}

/**
 * 計算從 dep_start 到 recordDate 的已過月數
 * @param {string|Date} depStart - 折舊開始日期
 * @param {string|Date} recordDate - 記錄日期
 * @returns {number} 已過月數
 */
function calcElapsedMonths(depStart, recordDate) {
  if (!depStart || !recordDate) return 0;

  const startDate = new Date(depStart);
  const recordDt = new Date(recordDate);

  return (recordDt.getFullYear() - startDate.getFullYear()) * 12
    + (recordDt.getMonth() - startDate.getMonth());
}

module.exports = {
  calcDecliningAccumulated,
  calcElapsedMonths
};
