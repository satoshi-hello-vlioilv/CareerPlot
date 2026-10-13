/**
 * 画面骨格（シェル）の UI 制御
 *
 * - 左レール: 絞り込み条件と表示社員を、項目クリックで開くパネルとして扱う
 * - 絞り込みパネル: 状態の正は AppController.filters。非表示の <select multiple> は
 *   既存の change 処理（filters の更新と再描画）への橋渡しとしてだけ使う
 * - 絞り込みサマリー: 適用中の条件をチップで常時表示し、その場で解除できる
 * - ビュー文脈: そのビューで意味を持たない設定は表示しない
 * - 表示項目: カード上の実際の見た目を見本として添え、メニューのボタンには表示中の項目の見本を並べる
 * - ヘッダー: 版数と更新履歴、バックアップ状態、社員検索、キーボード操作（Alt+数字でビュー切替）
 */
class AppShell {
    /** ビューごとに意味を持つ設定（data-ctx の値） */
    static VIEW_CONTEXT = {
        summary: [],
        chart: ['axis', 'sort', 'cards'],
        department: ['axis', 'sort', 'cards'],
        team: ['axis', 'sort', 'cards'],
        'salary-comparison': ['axis', 'sort', 'cards'],
        'star-chart': ['star'],
        matrix: [],
        'career-path': ['sort']
    };

    /** 社員属性で人数を数えられる絞り込み（section id → 社員のプロパティ） */
    static COUNT_KEYS = {
        departmentFilter: 'departmentId',
        teamFilter: 'teamId',
        positionFilter: 'position',
        contractTypeFilter: 'contractType'
    };

    /** パネル個別の表示方法 */
    static PANEL_OPTIONS = {
        yearFilter: { layout: 'grid', presets: [3, 5, 10], label: text => text.replace('年', '') }
    };

    /** 検索欄を出す選択肢数の下限 */
    static SEARCH_THRESHOLD = 10;

    /** 範囲スライダーによる絞り込み（チップ表示と解除に使用） */
    static RANGE_FILTERS = [
        { key: 'ageRange', slider: 'age', label: '年齢', unit: '歳' },
        { key: 'tenureRange', slider: 'tenure', label: '勤続', unit: '年' }
    ];

    /** 表示項目トグルに添えるカードの見本 */
    static CARD_SAMPLES = {
        showGrade: { grade: 'G7' },
        showGradeChange: { icon: 'fa-arrow-up' },
        showYearlyEval: { className: 'evaluation-card yearly-evaluation', text: 'B3', attrs: { 'data-eval-type': 'B' } },
        showYearlyEvalChange: { icon: 'fa-arrow-up' },
        showPosition: { className: 'evaluation-card position', text: '班長' },
        showDepartmentBadge: { className: 'evaluation-card department', text: '部署' },
        showTeam: { className: 'evaluation-card team', text: '班' },
        showAge: { className: 'evaluation-card age-badge', text: '45歳' },
        showTenure: { className: 'evaluation-card tenure-badge', text: '12年' },
        showRecruitType: { className: 'evaluation-card recruit-type-badge mid-career', text: '中途' },
        showContractType: { className: 'evaluation-card contract-type full-time', text: '正社員' },
        showPhoto: { className: 'option-sample-avatar', text: '写' },
        showFlagIcon: { icon: 'fa-flag' }
    };

    constructor(appController) {
        this.app = appController;
        this.rail = document.getElementById('sidebar');
        this.summary = document.getElementById('filterSummary');
        this.openSection = null;
        this.searchText = '';
    }

    init() {
        this.rail.addEventListener('click', e => this.handleRailClick(e));
        document.addEventListener('mousedown', e => {
            if (this.openSection && !this.openSection.contains(e.target)) this.closePanel();
            this.popovers.forEach(p => { if (p.isOpen() && !p.contains(e.target)) p.close(); });
        });
        document.addEventListener('keydown', e => this.handleKeydown(e));
        this.summary.addEventListener('click', e => this.handleSummaryClick(e));
        this.addCardSamples();
        this.popovers = [this.initDisplayMenu(), this.initVersion()];
        this.initViewShortcuts();
        this.initBackup();
        this.search = new EmployeeSearch(this.app);
        this.search.init();
        this.applyViewContext(this.app.displayOptions.currentView);
        this.refresh();
    }

    /** Esc は開いている層を 1 つだけ閉じる。Alt+数字でビューを切り替える */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            const open = this.popovers.find(p => p.isOpen());
            if (open) open.close();
            else if (this.openSection) this.closePanel();
            return;
        }
        if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            const tab = document.querySelectorAll('.tabs-navigation .tab-btn')[Number(e.key) - 1];
            if (tab) {
                e.preventDefault();
                tab.click();
            }
        }
    }

    initViewShortcuts() {
        document.querySelectorAll('.tabs-navigation .tab-btn').forEach((tab, i) => {
            tab.title = `${tab.textContent.trim()}（Alt+${i + 1}）`;
            tab.setAttribute('aria-keyshortcuts', `Alt+${i + 1}`);
        });
    }

    /**
     * ボタンで開閉するポップオーバーの共通部品（外側クリック・Esc で閉じる処理は init で一括）
     * @returns {{contains: Function, isOpen: Function, close: Function}}
     */
    createPopover(button, panel, onOpen = null) {
        const setOpen = open => {
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
            if (open) onOpen?.();
        };
        button.addEventListener('click', () => setOpen(panel.hidden));
        return {
            contains: target => button.contains(target) || panel.contains(target),
            isOpen: () => !panel.hidden,
            close: () => setOpen(false)
        };
    }

    // ---------------------------------------------------------------
    // レールとパネルの開閉
    // ---------------------------------------------------------------

    handleRailClick(e) {
        const item = e.target.closest('.rail-item');
        if (item) {
            const section = item.closest('.filter-section');
            if (section === this.openSection) this.closePanel();
            else this.openPanel(section.id);
            return;
        }
        // 表示社員パネルは社員リスト側が自身の操作を処理する
        const section = e.target.closest('.rail-panel')?.closest('.filter-section');
        if (section && !section.classList.contains('rail-employees')) this.handlePanelClick(e, section);
    }

    openPanel(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section || section.hidden) return;
        this.closePanel();
        this.openSection = section;
        this.searchText = '';
        section.classList.add('open');
        if (!section.classList.contains('rail-employees')) this.renderFilterPanel(section);
        this.fitPanel(section);
        section.querySelector('.rail-panel input[type="text"]')?.focus();
    }

    closePanel() {
        if (!this.openSection) return;
        this.openSection.classList.remove('open');
        this.openSection.querySelector('.rail-panel').style.top = '';
        this.openSection = null;
    }

    /** パネルが画面下端からはみ出す場合は上へずらす */
    fitPanel(section) {
        const panel = section.querySelector('.rail-panel');
        panel.style.top = '';
        const overflow = panel.getBoundingClientRect().bottom - (window.innerHeight - 8);
        if (overflow > 0) panel.style.top = `${-overflow}px`;
    }

    // ---------------------------------------------------------------
    // 絞り込みパネル
    // ---------------------------------------------------------------

    /** 選択肢一覧（hidden select の option から取得）と、現在の選択状態（filters から取得） */
    getFilterModel(section) {
        const select = section.querySelector('.filter-listbox');
        const info = this.app.getFilterInfoFromSectionId(section.id);
        const options = Array.from(select.options).map(o => ({ value: o.value, text: o.textContent }));
        const selected = new Set(Array.from(info?.filterSet || [], String));
        return { select, options, selected, total: info?.totalCount ?? options.length };
    }

    countByOption(sectionId) {
        const key = AppShell.COUNT_KEYS[sectionId];
        if (!key) return null;
        const counts = new Map();
        this.app.appData.getEmployees().forEach(emp => {
            const value = String(emp[key] ?? '');
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        return counts;
    }

    renderFilterPanel(section) {
        const panel = section.querySelector('.rail-panel');
        const { options, selected } = this.getFilterModel(section);
        const config = AppShell.PANEL_OPTIONS[section.id] || {};
        const counts = this.countByOption(section.id);
        const isGrid = config.layout === 'grid';
        const selectedCount = options.filter(o => selected.has(o.value)).length;
        const isAll = selectedCount === options.length;
        const keyword = this.searchText.trim().toLowerCase();

        // 人数の比率バー: 数字を読まなくても分布の偏りが分かるように行の背景に敷く
        const maxCount = counts ? Math.max(1, ...options.map(o => counts.get(o.value) || 0)) : 0;
        const rows = options.map(o => {
            const hidden = keyword && !o.text.toLowerCase().includes(keyword);
            const n = counts ? counts.get(o.value) || 0 : 0;
            const count = counts ? `<span class="fp-count">${n}</span>` : '';
            const bar = counts ? ` style="--w:${Math.round(n / maxCount * 100)}%"` : '';
            const only = isGrid ? '' : '<button type="button" class="fp-only" title="この項目だけを選択">これだけ</button>';
            const text = config.label ? config.label(o.text) : o.text;
            return `<label class="fp-option${selected.has(o.value) ? ' is-on' : ''}${counts ? ' has-bar' : ''}"${hidden ? ' hidden' : ''}${bar} data-value="${this.escape(o.value)}">
                        <input type="checkbox"${selected.has(o.value) ? ' checked' : ''}><span class="fp-text">${this.escape(text)}</span>${count}${only}
                    </label>`;
        }).join('');

        const presets = (config.presets || []).map(n => `<button type="button" class="fp-preset" data-latest="${n}">直近${n}年</button>`).join('');
        const search = options.length > AppShell.SEARCH_THRESHOLD && !isGrid
            ? `<input type="text" class="fp-search" placeholder="${section.dataset.title}を検索…" value="${this.escape(this.searchText)}">`
            : '';
        const sum = isAll ? 'すべて' : `${selectedCount}/${options.length}`;

        panel.querySelector('.fp-body')?.remove();
        const body = document.createElement('div');
        body.className = 'fp-body';
        body.innerHTML = `
            <div class="fp-head">
                <b>${section.dataset.title}で絞り込む</b>
                <span class="fp-sum${isAll ? '' : ' is-partial'}">${sum}</span>
                <button type="button" class="fp-toggle-all">${isAll ? 'すべて解除' : 'すべて選択'}</button>
            </div>
            ${presets ? `<div class="fp-presets">${presets}</div>` : ''}
            ${search}
            <div class="fp-list${isGrid ? ' is-grid' : ''}">${rows}</div>`;
        panel.prepend(body);

        body.querySelector('.fp-search')?.addEventListener('input', e => {
            this.searchText = e.target.value;
            const kw = this.searchText.trim().toLowerCase();
            body.querySelectorAll('.fp-option').forEach(row => {
                row.hidden = kw && !row.querySelector('.fp-text').textContent.toLowerCase().includes(kw);
            });
        });
    }

    handlePanelClick(e, section) {
        const { options, selected } = this.getFilterModel(section);
        const allValues = options.map(o => o.value);
        let next = null;

        if (e.target.closest('.fp-toggle-all')) {
            next = new Set(selected.size === allValues.length ? [] : allValues);
        } else if (e.target.closest('.fp-preset')) {
            const n = Number(e.target.closest('.fp-preset').dataset.latest);
            next = new Set([...allValues].sort((a, b) => Number(b) - Number(a)).slice(0, n));
        } else if (e.target.closest('.fp-only')) {
            e.preventDefault();
            next = new Set([e.target.closest('.fp-option').dataset.value]);
        } else if (e.target.closest('.fp-option')) {
            e.preventDefault();
            const value = e.target.closest('.fp-option').dataset.value;
            next = new Set(selected);
            next.has(value) ? next.delete(value) : next.add(value);
        }
        if (next) this.applyFilter(section, next);
    }

    /** 選択を hidden select に反映し、既存の change 処理で filters 更新と再描画を行う */
    applyFilter(section, values) {
        const select = section.querySelector('.filter-listbox');
        Array.from(select.options).forEach(o => { o.selected = values.has(o.value); });
        select.dispatchEvent(new Event('change'));
        if (section === this.openSection) {
            this.renderFilterPanel(section);
            this.fitPanel(section);
        }
    }

    resetFilter(sectionId) {
        const section = document.getElementById(sectionId);
        const { options } = this.getFilterModel(section);
        this.applyFilter(section, new Set(options.map(o => o.value)));
    }

    // ---------------------------------------------------------------
    // 絞り込みサマリー（適用中の条件）
    // ---------------------------------------------------------------

    /** フィルター変更・再描画のたびに呼ばれる */
    refresh() {
        this.renderFilterSummary();
        this.updateEmployeeBadge();
    }

    /** ビューの描画が終わるたびに呼ばれる */
    afterRender() {
        this.search?.apply();
    }

    getActiveConditions() {
        const conditions = [];
        this.rail.querySelectorAll('.filter-section:not(.rail-employees)').forEach(section => {
            const { options, selected } = this.getFilterModel(section);
            const count = options.filter(o => selected.has(o.value)).length;
            if (count === options.length || options.length === 0) return;
            conditions.push({
                type: 'list', id: section.id, label: section.dataset.title,
                value: count === 0 ? '未選択' : `${count}/${options.length}`,
                isEmpty: count === 0
            });
        });
        AppShell.RANGE_FILTERS.forEach(range => {
            const current = this.app.displayOptions[range.key];
            const bounds = this.app.appUI.core.getRangeSliderBounds(range.slider);
            if (current.min > bounds.min || current.max < bounds.max) {
                conditions.push({ type: 'range', id: range.key, label: range.label, value: `${current.min}–${current.max}${range.unit}` });
            }
        });
        return conditions;
    }

    renderFilterSummary() {
        const conditions = this.getActiveConditions();
        const total = this.app.appData.getEmployees().length;
        const matched = this.app.getFilteredEmployees().length;
        const chips = conditions.map(c => `
            <span class="filter-chip${c.isEmpty ? ' is-empty' : ''}" data-type="${c.type}" data-id="${c.id}">
                <button type="button" class="filter-chip-body" title="${c.label}の条件を開く">${c.label} <b>${c.value}</b></button>
                <button type="button" class="filter-chip-clear" title="${c.label}の条件を解除" aria-label="${c.label}の条件を解除"><i class="fas fa-times"></i></button>
            </span>`).join('');

        this.summary.innerHTML = `
            <span class="filter-summary-label"><i class="fas fa-filter"></i> 絞り込み</span>
            ${chips || '<span class="filter-summary-none">なし（全員が対象）</span>'}
            <span class="filter-summary-spacer"></span>
            <span class="filter-summary-count">対象 <b>${matched}</b> / ${total}名</span>
            ${conditions.length ? '<button type="button" class="filter-summary-clear">条件をすべて解除</button>' : ''}`;
    }

    handleSummaryClick(e) {
        if (e.target.closest('.filter-summary-clear')) {
            this.getActiveConditions().forEach(c => this.clearCondition(c.type, c.id));
            return;
        }
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        if (e.target.closest('.filter-chip-clear')) {
            this.clearCondition(chip.dataset.type, chip.dataset.id);
        } else if (chip.dataset.type === 'list') {
            this.openPanel(chip.dataset.id);
        }
    }

    clearCondition(type, id) {
        if (type === 'list') {
            this.resetFilter(id);
            return;
        }
        const range = AppShell.RANGE_FILTERS.find(r => r.key === id);
        const bounds = this.app.appUI.core.getRangeSliderBounds(range.slider);
        this.app.appUI.core.setRangeSliderValues(range.slider, bounds.min, bounds.max);
        if (range.slider === 'age') this.app.updateAgeRange({ ...bounds });
        else this.app.updateTenureRange({ ...bounds });
    }

    updateEmployeeBadge() {
        const visibleIds = new Set(this.app.getFilteredEmployees().map(e => e.id));
        const count = this.app.selectedEmployeeIds.filter(id => visibleIds.has(id)).length;
        const badge = document.getElementById('employeeRailCount');
        if (badge) badge.textContent = count;
    }

    // ---------------------------------------------------------------
    // ビュー文脈
    // ---------------------------------------------------------------

    applyViewContext(view) {
        const active = AppShell.VIEW_CONTEXT[view] || [];
        document.querySelectorAll('[data-ctx]').forEach(el => {
            el.classList.toggle('is-off-context', !active.includes(el.dataset.ctx));
        });
    }

    /** 表示社員（評価チャート・昇給分析でのみ使用）のレール項目を出し入れする */
    setEmployeeRailVisible(visible) {
        const section = document.getElementById('employeeRail');
        if (!section) return;
        if (!visible && section === this.openSection) this.closePanel();
        section.hidden = !visible;
    }

    // ---------------------------------------------------------------
    // 表示項目の見本
    // ---------------------------------------------------------------

    addCardSamples() {
        Object.entries(AppShell.CARD_SAMPLES).forEach(([id, spec]) => {
            const label = document.querySelector(`label[for="${id}"]`);
            const sample = this.createSample(spec);
            if (label && sample) {
                sample.classList.add('option-sample');
                sample.setAttribute('aria-hidden', 'true');
                label.prepend(sample);
            }
        });
    }

    createSample(spec) {
        if (spec.grade) {
            // グレード色と文字色の決定は実際のカードと同じ処理を使う
            return this.app.appUICharts.createEvaluationCard(spec.grade, 'grade')?.querySelector('.grade-evaluation') || null;
        }
        const el = document.createElement(spec.icon ? 'i' : 'span');
        if (spec.icon) {
            el.className = `fas ${spec.icon}`;
            return el;
        }
        el.className = spec.className;
        el.textContent = spec.text;
        Object.entries(spec.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    // ---------------------------------------------------------------
    // 表示項目メニュー
    // ---------------------------------------------------------------

    initDisplayMenu() {
        const button = document.getElementById('displayMenuBtn');
        const panel = document.getElementById('displayMenuPanel');
        panel.addEventListener('change', () => this.updateDisplayMenuSamples());
        this.updateDisplayMenuSamples();
        return this.createPopover(button, panel);
    }

    /** ボタンに、いまカードに出している項目の見本を並べる（開かなくても状態が分かる） */
    updateDisplayMenuSamples() {
        const host = document.getElementById('displayMenuSamples');
        const names = [];
        host.replaceChildren();
        document.querySelectorAll('#displayMenuPanel .checkbox-item:not(.option-sub)').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (!checkbox?.checked || item.style.display === 'none') return;
            const label = item.querySelector('label');
            const sample = label?.querySelector('.option-sample');
            names.push(Array.from(label.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim());
            if (sample) host.appendChild(sample.cloneNode(true));
        });
        document.getElementById('displayMenuBtn').title = `カードに表示する項目を選ぶ\n表示中: ${names.join('・') || 'なし'}`;
    }

    // ---------------------------------------------------------------
    // 版数と更新履歴
    // ---------------------------------------------------------------

    initVersion() {
        const button = document.getElementById('appVersionBtn');
        button.textContent = `v${APP_VERSION}`;
        const panel = document.createElement('div');
        panel.className = 'app-popover version-popover';
        panel.hidden = true;
        panel.innerHTML = `<h4>更新履歴</h4>` + APP_CHANGELOG.map(entry => `
            <section>
                <b>v${this.escape(entry.version)}</b>${entry.date ? `<span>${this.escape(entry.date)}</span>` : ''}
                <ul>${entry.items.map(item => `<li>${this.escape(item)}</li>`).join('')}</ul>
            </section>`).join('');
        // ヘッダーの重なり順に閉じ込められないよう body に置き、開くときにボタンの下へ配置する
        document.body.appendChild(panel);
        return this.createPopover(button, panel, () => {
            const rect = button.getBoundingClientRect();
            panel.style.left = `${rect.left}px`;
            panel.style.top = `${rect.bottom + 8}px`;
        });
    }

    // ---------------------------------------------------------------
    // バックアップ（データはこのブラウザにのみ保存されるため、書き出しを促す）
    // ---------------------------------------------------------------

    initBackup() {
        this.backupButton = document.getElementById('backupBtn');
        this.backupButton.addEventListener('click', async () => {
            if (await this.app.appData.exportData('all')) {
                this.app.appUI.showNotification('success', 'バックアップ（全データの ZIP）を保存しました');
            }
        });
        document.addEventListener('careerplot:backup', e => {
            this.app.uiState.lastBackupAt = e.detail.at;
            this.updateBackupStatus();
        });
        document.addEventListener('careerplot:datachange', () => this.updateBackupStatus());
        this.updateBackupStatus();
    }

    updateBackupStatus() {
        const last = this.app.uiState.lastBackupAt;
        const updated = this.app.appData.data.metadata?.lastUpdated;
        const hasData = this.app.appData.getEmployees().length > 0;
        const pending = hasData && (!last || (updated && updated > last));
        const format = iso => new Date(iso).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const state = !last
            ? 'バックアップ未実施（データはこのブラウザにのみ保存されています）'
            : `最終バックアップ: ${format(last)}${pending ? '（その後に変更あり）' : '（最新）'}`;
        this.backupButton.classList.toggle('has-alert', pending);
        this.backupButton.title = `バックアップ — 全データを ZIP で書き出す\n${state}`;
    }

    escape(value) {
        return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
}
