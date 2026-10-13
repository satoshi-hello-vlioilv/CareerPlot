/**
 * ブラウザごとの画面状態（見せ方とバックアップ記録）の保存
 *
 * - 評価データ本体（AppData）とは分けて localStorage に置く。データの書き出し・取り込みには含めない
 * - 保存するのは「見せ方」だけ。絞り込み条件はデータに依存し、気づかないまま残ると
 *   人数や分布を読み違えるため保存しない（起動時は常に全員が対象）
 * - localStorage が使えない環境（プライベートウィンドウ等）でも動作は止めない
 */
class UiStateStore {
    static KEY = 'careerplot.ui.v1';

    /** 次回起動時に復元する displayOptions の項目 */
    static VIEW_KEYS = [
        'currentView', 'chartType', 'sortOrder', 'matrixAxisMode',
        'showPhoto', 'showGrade', 'showGradeChange', 'showYearlyEval', 'showYearlyEvalChange',
        'showPosition', 'showDepartmentBadge', 'showTeam', 'showAge', 'showTenure',
        'showRecruitType', 'showContractType', 'showFlagIcon', 'showFullName',
        'starChartType', 'showStarChartCategory', 'showStarChartClassification'
    ];

    constructor() {
        this.state = this.read();
        this.saveTimer = null;
    }

    read() {
        try {
            const parsed = JSON.parse(localStorage.getItem(UiStateStore.KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    write() {
        try {
            localStorage.setItem(UiStateStore.KEY, JSON.stringify(this.state));
        } catch (e) {
            // 保存できなくても画面操作は続けられるため、ここでは何もしない
        }
    }

    /** 保存済みの見せ方を displayOptions に重ねる（型が一致する項目だけ） */
    restoreViewOptions(displayOptions) {
        const saved = this.state.view || {};
        UiStateStore.VIEW_KEYS.forEach(key => {
            if (key in saved && typeof saved[key] === typeof displayOptions[key]) {
                displayOptions[key] = saved[key];
            }
        });
    }

    /** 見せ方の変更を保存する（連続操作をまとめるため少し遅らせる） */
    saveViewOptions(displayOptions) {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.state.view = Object.fromEntries(UiStateStore.VIEW_KEYS.map(key => [key, displayOptions[key]]));
            this.write();
        }, 300);
    }

    get lastBackupAt() {
        return this.state.lastBackupAt || null;
    }

    set lastBackupAt(isoString) {
        this.state.lastBackupAt = isoString;
        this.write();
    }
}
