/**
 * 社員検索（ヘッダーの検索欄）
 *
 * 絞り込みではなく「探す」機能: 該当する社員を強調し、それ以外を薄くする。
 * 表示中のビューの要素のうち、data-employee-id（1名）または data-employee-ids（複数名・空白区切り）を
 * 持つものが対象。ビューが描画し直されるたびに apply() で強調を付け直す。
 *
 * 操作: / で検索欄へ、Enter で次の該当者へ移動（Shift+Enter で前へ）、Esc で解除
 */
class EmployeeSearch {
    /** 移動先として強調枠を付ける要素（セル全体ではなく、社員を代表する要素） */
    static ANCHOR_SELECTOR = '.employee-card, th[data-employee-id], td[data-employee-id]:not(.star-chart-cell):not(.salary-td-cell), [data-employee-ids]';

    constructor(appController) {
        this.app = appController;
        this.box = document.getElementById('appSearch');
        this.input = document.getElementById('employeeSearchInput');
        this.result = document.getElementById('employeeSearchResult');
        this.container = document.getElementById('chartContainer');
        this.anchors = [];
        this.current = -1;
        this.state = { ids: null, visibleIds: new Set(), viewHasEmployees: false };
    }

    init() {
        if (!this.input) return;
        // 日本語入力の変換中は検索しない（確定時に検索する）
        this.input.addEventListener('input', e => {
            this.pinned = null;
            if (!e.isComposing) this.run();
        });
        this.input.addEventListener('compositionend', () => this.run());
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                this.move(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
                this.clear();
                this.input.blur();
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key !== '/' || e.ctrlKey || e.altKey || e.metaKey || EmployeeSearch.isTyping(e.target)) return;
            if (document.querySelector('.modal-overlay.active')) return;
            e.preventDefault();
            this.input.focus();
            this.input.select();
        });
    }

    static isTyping(target) {
        return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    }

    /** 全角・半角、大文字・小文字、空白の違いを無視して比較する */
    static normalize(text) {
        return String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    }

    get query() {
        return EmployeeSearch.normalize(this.input?.value);
    }

    /** 該当する社員 ID（未入力なら null） */
    findIds() {
        const q = this.query;
        if (!q) return null;
        // 一覧などから特定の社員を指定した場合は、同じ文字を含む別の社員を含めない
        if (this.pinned && this.input.value === this.pinned.name) return new Set([String(this.pinned.id)]);
        const ids = new Set();
        this.app.appData.getEmployees().forEach(emp => {
            const keys = [emp.name, `${emp.lastName || ''}${emp.firstName || ''}`, emp.employeeNumber];
            if (keys.some(k => EmployeeSearch.normalize(k).includes(q))) ids.add(String(emp.id));
        });
        return ids;
    }

    run() {
        this.current = -1;
        this.apply();
        if (this.anchors.length) this.move(1);
    }

    /** 指定した社員を部署別配置で強調する（サマリーの確認リストなどから使う） */
    showEmployee(employeeId) {
        const emp = this.app.appData.getEmployees().find(e => String(e.id) === String(employeeId));
        if (!emp) return;
        this.input.value = emp.name;
        this.pinned = emp;
        if (this.app.displayOptions.currentView === 'summary') this.app.changeView('department');
        this.run();
    }

    clear() {
        this.input.value = '';
        this.pinned = null;
        this.run();
    }

    /** 表示中のビューに強調を付ける（描画のたびに呼ばれる） */
    apply() {
        const ids = this.findIds();
        const elements = this.container.querySelectorAll('[data-employee-id], [data-employee-ids]');
        const visibleIds = new Set();
        elements.forEach(el => {
            const own = EmployeeSearch.idsOf(el);
            own.forEach(id => visibleIds.add(id));
            el.classList.toggle('is-search-hit', !!ids && own.some(id => ids.has(id)));
            el.classList.remove('is-search-current');
        });
        this.container.classList.toggle('is-searching', !!ids);
        this.box.classList.toggle('has-query', !!ids);

        // 移動先: 社員ごと（集計セルはセルごと）に、画面上で最初に現れる要素
        const seen = new Set();
        this.anchors = !ids ? [] : Array.from(this.container.querySelectorAll(EmployeeSearch.ANCHOR_SELECTOR))
            .filter(el => el.classList.contains('is-search-hit'))
            .filter(el => {
                const key = el.dataset.employeeIds ? el : el.dataset.employeeId;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        if (this.current >= this.anchors.length) this.current = -1;
        this.state = { ids, visibleIds, viewHasEmployees: elements.length > 0 };
        this.renderResult();
    }

    static idsOf(el) {
        if (el.dataset.employeeId) return [el.dataset.employeeId];
        return (el.dataset.employeeIds || '').split(' ').filter(Boolean);
    }

    move(step) {
        if (!this.anchors.length) return;
        this.anchors[this.current]?.classList.remove('is-search-current');
        this.current = (this.current + step + this.anchors.length) % this.anchors.length;
        const target = this.anchors[this.current];
        target.classList.add('is-search-current');
        target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        this.renderResult();
    }

    renderResult() {
        const { ids, visibleIds, viewHasEmployees } = this.state;
        const el = this.result;
        el.classList.remove('is-none');
        el.title = '';
        if (!ids) {
            el.textContent = '';
            return;
        }
        if (ids.size === 0) {
            el.textContent = '該当なし';
            el.classList.add('is-none');
            return;
        }
        const shown = this.anchors.length;
        if (!viewHasEmployees) {
            el.textContent = `${ids.size}名`;
            el.title = `${ids.size}名が該当します。部署別配置などの社員を表示するビューで強調表示されます`;
            return;
        }
        if (shown === 0) {
            el.textContent = '画面外';
            el.classList.add('is-none');
            el.title = `${ids.size}名が該当しますが、絞り込み条件または表示社員の選択により、この画面には表示されていません`;
            return;
        }
        el.textContent = this.current >= 0 ? `${this.current + 1}/${shown}` : `${shown}件`;
        const hidden = [...ids].filter(id => !visibleIds.has(id)).length;
        el.title = `Enter で次へ・Shift+Enter で前へ${hidden ? `\nほか${hidden}名は絞り込み条件などにより非表示` : ''}`;
    }
}
