/**
 * チャート表示クラス - 人事評定視覚化アプリケーション
 * AppUIChartsをラッピングし、評価チャート、部署別・班別レイアウト、分布図などの描画を担当
 */
class UICharts {
    constructor(appUI) {
        this.appUI = appUI;
        this.appController = appUI.appController;
        this.appData = this.appController?.appData;
        this.tooltipTimeout = null;
        this.matrixTooltipTimeout = null;
    }

    /**
     * 空のチャートメッセージを表示
     * @param {HTMLElement} container チャートコンテナ要素
     * @param {string} messageHtml 表示するHTMLメッセージ (省略時はデフォルトメッセージ)
     */
    renderEmptyChart(container, messageHtml) {
        this.appController.appUICharts.renderEmptyChart(container, messageHtml);
    }

    /**
     * 評価カードを生成（グレード・年度評価用）
     * @param {string} text 表示テキスト
     * @param {string} type カードタイプ
     * @param {object} details 追加詳細情報
     * @returns {HTMLElement} 生成されたカード要素
     */
    createEvaluationCard(text, type, details = {}) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return document.createElement('div');
        }
        return this.appController.appUICharts.createEvaluationCard(text, type, details);
    }

    /**
     * 評価チャートを描画
     * @param {Array} selectedEmployeeIds 表示する社員ID配列
     * @param {string} axisType 軸タイプ ('grade', 'age', 'tenure', 'year')
     * @param {Set} yearFilter 年度フィルター
     */
    renderEvaluationChart(selectedEmployeeIds, axisType, yearFilter) {
        this.appController.appUICharts.renderEvaluationChart(selectedEmployeeIds, axisType, yearFilter);
    }

    /**
     * セルインタラクション設定
     * @param {HTMLElement} cell セル要素
     * @param {Object} evaluation 評価データ
     */
    setupCellInteractions(cell, evaluation) {
        this.appController.appUICharts.setupCellInteractions(cell, evaluation);
    }

    /**
     * 部署別チャートを描画
     * @param {Array} filteredEmployees フィルタリングされた社員データ配列
     * @param {string} axisType 軸タイプ
     * @param {Set} yearFilter 年度フィルター
     */
    renderDepartmentChart(filteredEmployees, axisType, yearFilter) {
        this.appController.appUICharts.renderDepartmentChart(filteredEmployees, axisType, yearFilter);
    }

    /**
     * 社員カードを生成
     * @param {HTMLElement} container コンテナ要素
     * @param {Object} employee 社員データ
     * @param {Object} displayOptions 表示オプション
     */
    createEmployeeCard(container, employee, displayOptions) {
        this.appController.appUICharts.createEmployeeCard(container, employee, displayOptions);
    }

    /**
     * チーム表示チャートを描画
     * @param {Array} employees 社員データ配列
     * @param {string} chartType チャートタイプ
     * @param {Set} yearFilter 年度フィルター
     */
    renderTeamChart(employees, chartType, yearFilter) {
        this.appController.appUICharts.renderTeamChart(employees, chartType, yearFilter);
    }

    /**
     * キャリアパスチャートを描画
     * @param {Array} employees 社員データ配列
     * @param {Set} yearFilter 年度フィルター
     */
    renderCareerPathChart(employees, yearFilter) {
        this.appController.appUICharts.renderCareerPathChart(employees, yearFilter);
    }

    /**
     * 社員ツールチップを表示
     * @param {Event} event イベントオブジェクト
     * @param {Object} employee 社員データ
     */
    showEmployeeTooltip(event, employee) {
        this.appController.appUICharts.showEmployeeTooltip(event, employee);
    }

    /**
     * 社員ツールチップを非表示
     */
    hideEmployeeTooltip() {
        this.appController.appUICharts.hideEmployeeTooltip();
    }

    /**
     * 評価ツールチップを表示
     * @param {Event} event イベントオブジェクト
     * @param {Object} evaluation 評価データ
     */
    showEvaluationTooltip(event, evaluation) {
        this.appController.appUICharts.showEvaluationTooltip(event, evaluation);
    }

    /**
     * 評価ツールチップを非表示
     */
    hideEvaluationTooltip() {
        this.appController.appUICharts.hideEvaluationTooltip();
    }

    /**
     * ツールチップ位置を設定
     * @param {HTMLElement} targetElement ターゲット要素
     * @param {HTMLElement} tooltipElement ツールチップ要素
     * @param {Event} event イベントオブジェクト
     */
    positionTooltip(targetElement, tooltipElement, event) {
        this.appController.appUICharts.positionTooltip(targetElement, tooltipElement, event);
    }

    /**
     * グレード分布チャートを描画
     * @param {Array} filteredEmployees フィルタリングされた社員データ配列
     * @param {Set} yearFilter 年度フィルター
     */
    renderGradeDistributionChart(filteredEmployees, yearFilter) {
        this.appController.appUICharts.renderGradeDistributionChart(filteredEmployees, yearFilter);
    }

    /**
     * 年齢分布チャートを描画
     * @param {Array} filteredEmployees フィルタリングされた社員データ配列
     * @param {Set} yearFilter 年度フィルター
     */
    renderAgeDistributionChart(filteredEmployees, yearFilter) {
        this.appController.appUICharts.renderAgeDistributionChart(filteredEmployees, yearFilter);
    }

    /**
     * マトリクス分布チャートを描画
     * @param {Array} filteredEmployees フィルタリングされた社員データ配列
     * @param {Set} yearFilter 年度フィルター
     */
    renderMatrixDistributionChart(filteredEmployees, yearFilter) {
        this.appController.appUICharts.renderMatrixDistributionChart(filteredEmployees, yearFilter);
    }

    /**
     * 昇給比較チャートを描画
     */
    renderSalaryComparisonChart(employeeIds, chartType, yearFilter) {
        this.appController.appUICharts.renderSalaryComparisonChart(employeeIds, chartType, yearFilter);
    }

    //renderStarChart のブリッジメソッド
    renderStarChart(filteredEmployees, yearFilter, displayOptions) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return;
        }
        this.appController.appUICharts.renderStarChart(filteredEmployees, yearFilter, displayOptions);
    }

    // 追加メソッド
    createFlagBadge(flag) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return null;
        }
        return this.appController.appUICharts.createFlagBadge(flag);
    }

    createAgeBadge(age, details = {}) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return null;
        }
        return this.appController.appUICharts.createAgeBadge(age, details);
    }

    createTenureBadge(tenure, details = {}) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return null;
        }
        return this.appController.appUICharts.createTenureBadge(tenure, details);
    }

    createRecruitTypeBadge(employee, details = {}) {
        if (!this.appController?.appUICharts) {
            console.warn("AppUICharts not initialized yet");
            return null;
        }
        return this.appController.appUICharts.createRecruitTypeBadge(employee, details);
    }
}