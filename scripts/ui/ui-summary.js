/**
 * サマリー（ダッシュボード）ビュー
 *
 * 絞り込み条件と評価年度に連動して、対象者の全体像（人数・年齢・勤続・グレード分布・
 * 昇格/降格・評価の変化・部署別）と、確認が必要な社員（フラグ・グレード滞留・評価の連続低下）を示す。
 * 基準年度は選択中の評価年度のうち最新の年。前年比較はその前年の評価と比べる。
 *
 * 変化の判定はカードの表示と同じ規則を使う
 *   グレード: 番号の大小 / 年度評価: 同じ区分（A/B/C）内の番号の大小（区分が変わった場合は「区分変更」）
 */
class SummaryView {
    /** グレード滞留として知らせる年数（同じグレードの連続年数） */
    static STAGNANT_YEARS = 5;
    /** 推移グラフに出す年数の上限 */
    static TREND_YEARS = 10;
    /** 確認リストに出す人数の上限（超えた分は件数で示す） */
    static LIST_LIMIT = 8;

    static FLAG_LABELS = {
        promotion: '昇格対象', consideration: '検討中', pending: '確定待ち',
        check: 'チェック', medical: '傷病中', retirement: '退職者'
    };

    constructor(appController) {
        this.app = appController;
        this.data = appController.appData;
    }

    // ---------------------------------------------------------------
    // 集計
    // ---------------------------------------------------------------

    static gradeNumber(grade) {
        const n = parseInt(String(grade || '').replace(/\D/g, ''), 10);
        return isNaN(n) ? null : n;
    }

    /** 年度評価の前年比（同じ区分内のみ比較） */
    static yearlyDirection(current, previous) {
        if (!current || !previous) return null;
        if (current[0] !== previous[0]) return 'band';
        const c = parseInt(current.slice(1), 10), p = parseInt(previous.slice(1), 10);
        if (isNaN(c) || isNaN(p)) return null;
        return c > p ? 'up' : c < p ? 'down' : 'same';
    }

    static average(values) {
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    static median(values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /** 社員ごとの、指定年度の評価と前年比 */
    buildRows(employees, year) {
        return employees.map(emp => {
            const evals = this.data.getEmployeeEvaluations(emp.id);
            const byYear = new Map(evals.map(e => [e.year, e]));
            const cur = byYear.get(year);
            if (!cur) return null;
            const prev = byYear.get(year - 1);
            const prev2 = byYear.get(year - 2);
            const grade = SummaryView.gradeNumber(cur.grade);
            const prevGrade = prev ? SummaryView.gradeNumber(prev.grade) : null;
            return {
                emp, cur, grade,
                gradeDir: prevGrade === null || grade === null ? null : grade > prevGrade ? 'up' : grade < prevGrade ? 'down' : 'same',
                evalDir: SummaryView.yearlyDirection(cur.yearlyEvaluation, prev?.yearlyEvaluation),
                prevEvalDir: SummaryView.yearlyDirection(prev?.yearlyEvaluation, prev2?.yearlyEvaluation),
                stay: this.data.getConsecutiveYearsSameGrade(emp.id, year),
                isNew: this.data.isNewGraduate(emp),
                age: cur.age, tenure: cur.tenure,
                departmentId: cur.departmentId || emp.departmentId
            };
        }).filter(Boolean);
    }

    summarize(rows) {
        const ages = rows.map(r => r.age).filter(Number.isFinite);
        const tenures = rows.map(r => r.tenure).filter(Number.isFinite);
        const grades = rows.map(r => r.grade).filter(Number.isFinite);
        const compared = rows.filter(r => r.gradeDir);
        return {
            count: rows.length,
            newCount: rows.filter(r => r.isNew).length,
            avgAge: SummaryView.average(ages), medianAge: SummaryView.median(ages),
            avgTenure: SummaryView.average(tenures), medianTenure: SummaryView.median(tenures),
            avgGrade: SummaryView.average(grades),
            promoted: compared.filter(r => r.gradeDir === 'up').length,
            demoted: compared.filter(r => r.gradeDir === 'down').length,
            compared: compared.length
        };
    }

    compute(employees, yearFilter) {
        const years = [...yearFilter].sort((a, b) => a - b);
        const year = years[years.length - 1];
        const rows = this.buildRows(employees, year);
        const prevRows = this.buildRows(employees, year - 1);
        const gradeOptions = this.data.getGradeOptions().map(SummaryView.gradeNumber).filter(Number.isFinite).sort((a, b) => b - a);

        const grades = gradeOptions.map(g => {
            const inGrade = rows.filter(r => r.grade === g);
            return { grade: g, count: inGrade.length, newCount: inGrade.filter(r => r.isNew).length };
        });

        const bands = [10, 20, 30, 40, 50, 60].map(min => {
            const inBand = rows.filter(r => r.age >= (min === 10 ? 0 : min) && r.age < (min === 60 ? 200 : min + 10));
            return { label: `${min}代`, count: inBand.length, newCount: inBand.filter(r => r.isNew).length };
        });

        const countBy = (list, key) => ['up', 'same', 'down', 'band'].reduce((acc, k) => ({ ...acc, [k]: list.filter(r => r[key] === k).length }), {});

        const departments = this.data.getDepartments().map(d => {
            const inDept = rows.filter(r => r.departmentId === d.id);
            return { id: d.id, name: d.name, count: inDept.length, avgGrade: SummaryView.average(inDept.map(r => r.grade).filter(Number.isFinite)), promoted: inDept.filter(r => r.gradeDir === 'up').length };
        }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

        const trend = years.slice(-SummaryView.TREND_YEARS).map(y => ({ year: y, ...this.summarize(this.buildRows(employees, y)) }));

        const flagged = rows.filter(r => r.cur.flag && SummaryView.FLAG_LABELS[r.cur.flag]);
        return {
            year, rows,
            kpi: this.summarize(rows), prevKpi: prevRows.length ? this.summarize(prevRows) : null,
            grades, bands, departments, trend,
            gradeChange: countBy(rows, 'gradeDir'), evalChange: countBy(rows, 'evalDir'),
            attention: {
                flagged: flagged.sort((a, b) => a.cur.flag.localeCompare(b.cur.flag)),
                stagnant: rows.filter(r => r.stay >= SummaryView.STAGNANT_YEARS).sort((a, b) => b.stay - a.stay),
                evalDown: rows.filter(r => r.evalDir === 'down' && r.prevEvalDir === 'down')
            }
        };
    }

    // ---------------------------------------------------------------
    // 描画
    // ---------------------------------------------------------------

    /**
     * 配置: 指標 → 1 段目（分布 | 変化と年齢 | 確認が必要な社員）→ 2 段目（部署別 | 年度推移）
     * 段ごとにカードの高さをそろえ、左上から「全体 → 内訳 → 次の行動」の順に読めるようにする
     */
    render(container, employees, yearFilter) {
        const model = this.compute(employees, yearFilter);
        if (!model.rows.length) {
            container.innerHTML = `<div class="empty-chart"><i class="fas fa-filter"></i><h3>${model.year}年度の評価がある社員がいません</h3><p>評価年度または絞り込み条件を確認してください。</p></div>`;
            return;
        }
        container.innerHTML = `<div class="summary-view">
            ${this.kpiTiles(model)}
            <div class="sm-grid sm-row-main">${this.gradeBars(model)}<div class="sm-stack">${this.changes(model)}${this.ageBars(model)}</div>${this.attentionLists(model)}</div>
            <div class="sm-grid sm-row-sub">${this.departmentTable(model)}${this.trendChart(model)}</div>
        </div>`;
        container.querySelector('.summary-view').addEventListener('click', e => this.handleClick(e));
        this.drawTrends(container);
    }

    handleClick(e) {
        const person = e.target.closest('.sm-person');
        if (person) this.app.shell.search.showEmployee(person.dataset.employeeId);
    }

    // --- 書式 ---
    static fmt(value, digits = 1) {
        return value === null || value === undefined ? '-' : Number(value).toFixed(digits).replace(/\.0$/, '');
    }

    static delta(current, previous, unit = '', digits = 1) {
        if (previous === null || previous === undefined || current === null) return '';
        const d = current - previous;
        const text = Math.abs(d) < 0.05 ? '±0' : `${d > 0 ? '+' : '−'}${SummaryView.fmt(Math.abs(d), digits)}`;
        return `<span class="sm-delta">前年 ${text}${unit}</span>`;
    }

    // --- 部品 ---
    kpiTiles(m) {
        const k = m.kpi, p = m.prevKpi;
        const rate = k.compared ? Math.round(k.promoted / k.compared * 100) : null;
        const tiles = [
            { icon: 'fa-users', label: '対象人数', value: k.count, unit: '名', sub: `新卒 ${k.newCount} ・ 中途 ${k.count - k.newCount}`, delta: SummaryView.delta(k.count, p?.count, '名', 0) },
            { icon: 'fa-user-clock', label: '平均年齢', value: SummaryView.fmt(k.avgAge), unit: '歳', sub: `中央値 ${SummaryView.fmt(k.medianAge)}歳`, delta: SummaryView.delta(k.avgAge, p?.avgAge, '歳') },
            { icon: 'fa-business-time', label: '平均勤続', value: SummaryView.fmt(k.avgTenure), unit: '年', sub: `中央値 ${SummaryView.fmt(k.medianTenure)}年`, delta: SummaryView.delta(k.avgTenure, p?.avgTenure, '年') },
            { icon: 'fa-layer-group', label: '平均グレード', value: `G${SummaryView.fmt(k.avgGrade)}`, unit: '', sub: `${m.year}年度評価`, delta: SummaryView.delta(k.avgGrade, p?.avgGrade) },
            { icon: 'fa-arrow-trend-up', label: `${m.year}年度の昇格`, value: k.promoted, unit: '名', sub: rate === null ? '前年の評価なし' : `昇格率 ${rate}% ・ 降格 ${k.demoted}名`, delta: '' }
        ];
        return `<div class="sm-kpis">${tiles.map(t => `
            <div class="sm-kpi">
                <span class="sm-kpi-icon"><i class="fas ${t.icon}"></i></span>
                <div class="sm-kpi-body">
                    <span class="sm-kpi-label">${t.label}</span>
                    <span class="sm-kpi-value">${t.value}<small>${t.unit}</small></span>
                    <span class="sm-kpi-sub">${t.sub}${t.delta ? ' ・ ' + t.delta : ''}</span>
                </div>
            </div>`).join('')}</div>`;
    }

    /** グレード色のチップ（文字色は背景とのコントラストで決める。カードのグレード表示と同じ規則） */
    gradeChip(grade) {
        const hex = getComputedStyle(document.documentElement).getPropertyValue(`--grade-${grade}`).trim();
        const ink = hex ? this.app.appUI.core.getContrastColor(hex) : '#fff';
        return `<span class="sm-grade-chip" style="--chip:var(--grade-${grade});color:${ink}">G${grade}</span>`;
    }

    card(title, icon, body, note = '', cls = '') {
        return `<section class="sm-card ${cls}"><header class="sm-card-head"><i class="fas ${icon}"></i><h3>${title}</h3>${note ? `<span class="sm-card-note">${note}</span>` : ''}</header><div class="sm-card-body">${body}</div></section>`;
    }

    /** グレード分布: 上位グレードを上に。色はグレード色、新卒の内訳を濃淡で示す */
    gradeBars(m) {
        const max = Math.max(1, ...m.grades.map(g => g.count));
        const rows = m.grades.map(g => `
            <div class="sm-bar-row">
                ${this.gradeChip(g.grade)}
                <span class="sm-bar-track"><span class="sm-bar" style="width:${g.count / max * 100}%;background:var(--grade-${g.grade})"></span></span>
                <span class="sm-bar-num">${g.count || ''}</span>
            </div>`).join('');
        return this.card('グレード分布', 'fa-layer-group', `<div class="sm-bars">${rows}</div>`, `${m.year}年度`);
    }

    /** 年齢構成: 10 歳刻み。新卒（濃）/ 中途（淡）の積み上げ */
    ageBars(m) {
        const max = Math.max(1, ...m.bands.map(b => b.count));
        const cols = m.bands.map(b => `
            <div class="sm-col">
                <span class="sm-col-num">${b.count || ''}</span>
                <span class="sm-col-track"><span class="sm-col-mid" style="height:${(b.count - b.newCount) / max * 100}%"></span><span class="sm-col-new" style="height:${b.newCount / max * 100}%"></span></span>
                <span class="sm-col-label">${b.label}</span>
            </div>`).join('');
        return this.card('年齢構成', 'fa-user-clock', `<div class="sm-cols">${cols}</div>${this.legend([['sm-sw-new', '新卒'], ['sm-sw-mid', '中途']])}`);
    }

    legend(items) {
        return `<div class="sm-legend">${items.map(([cls, text]) => `<span><i class="${cls}"></i>${text}</span>`).join('')}</div>`;
    }

    /** 前年比の内訳（上昇・維持・下降）を 1 本の帯で示す */
    changeStrip(title, counts, labels) {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (!total) return `<div class="sm-change"><b>${title}</b><span class="sm-muted">前年の評価なし</span></div>`;
        const parts = ['up', 'same', 'down', 'band'].filter(k => counts[k]).map(k => `<span class="sm-seg sm-seg-${k}" style="flex:${counts[k]}" title="${labels[k]} ${counts[k]}名"></span>`).join('');
        const nums = ['up', 'same', 'down', 'band'].filter(k => counts[k] || k !== 'band').map(k => `<span class="sm-change-num sm-num-${k}"><i></i>${labels[k]} <b>${counts[k]}</b></span>`).join('');
        return `<div class="sm-change"><b>${title}</b><div class="sm-strip">${parts}</div><div class="sm-change-nums">${nums}</div></div>`;
    }

    changes(m) {
        const body = this.changeStrip('グレード', m.gradeChange, { up: '昇格', same: '据え置き', down: '降格', band: '' })
            + this.changeStrip('年度評価', m.evalChange, { up: '上昇', same: '維持', down: '下降', band: '区分変更' });
        return this.card('前年からの変化', 'fa-right-left', body, `${m.year - 1} → ${m.year}年度`);
    }

    departmentTable(m) {
        const max = Math.max(1, ...m.departments.map(d => d.count));
        const rows = m.departments.map(d => `
            <tr><th>${this.app.shell.escape(d.name)}</th>
                <td class="sm-td-bar"><span class="sm-bar-track"><span class="sm-bar sm-bar-plain" style="width:${d.count / max * 100}%"></span></span><b>${d.count}</b></td>
                <td>G${SummaryView.fmt(d.avgGrade)}</td><td>${d.promoted || '-'}</td></tr>`).join('');
        return this.card('部署別', 'fa-building', `<table class="sm-table"><thead><tr><th>部署</th><th>人数</th><th>平均G</th><th>昇格</th></tr></thead><tbody>${rows}</tbody></table>`);
    }

    /** 年度推移: 人数（棒）と平均グレード（折れ線）。SVG は描画後に実際の幅で作る（drawTrends） */
    trendChart(m) {
        const t = m.trend;
        if (t.length < 2) return this.card('年度推移', 'fa-chart-line', '<p class="sm-muted">評価年度を2年以上選ぶと推移を表示します</p>');
        this.trendData = t;
        return this.card('年度推移', 'fa-chart-line', '<div class="sm-trend-host"></div>' + this.legend([['sm-sw-count', '人数'], ['sm-sw-grade', '平均グレード']]), `${t[0].year}〜${t[t.length - 1].year}年度`, 'sm-card-trend');
    }

    drawTrends(container) {
        container.querySelectorAll('.sm-trend-host').forEach(host => {
            const t = this.trendData;
            const W = Math.max(240, host.clientWidth), H = host.clientHeight || 150;
            const P = { l: 34, r: 34, t: 14, b: 22 };
            const maxCount = Math.max(1, ...t.map(d => d.count));
            const gVals = t.map(d => d.avgGrade).filter(Number.isFinite);
            // 平均グレードの縦軸は ±1 の余白を取り、小さな変化を誇張しない
            const gMin = Math.max(0, Math.floor(Math.min(...gVals)) - 1), gMax = Math.ceil(Math.max(...gVals)) + 1;
            const x = i => P.l + (W - P.l - P.r) * (i + 0.5) / t.length;
            const yC = v => H - P.b - (H - P.t - P.b) * (v / maxCount);
            const yG = v => H - P.b - (H - P.t - P.b) * ((v - gMin) / (gMax - gMin));
            const bw = Math.min(28, (W - P.l - P.r) / t.length * 0.55);
            const bars = t.map((d, i) => `<rect x="${x(i) - bw / 2}" y="${yC(d.count)}" width="${bw}" height="${H - P.b - yC(d.count)}" rx="2" class="sm-trend-bar"><title>${d.year}年度 ${d.count}名</title></rect>`).join('');
            const line = t.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${yG(d.avgGrade)}`).join('');
            const dots = t.map((d, i) => `<circle cx="${x(i)}" cy="${yG(d.avgGrade)}" r="3.5" class="sm-trend-dot"><title>${d.year}年度 平均G${SummaryView.fmt(d.avgGrade)}</title></circle>`).join('');
            const labels = t.map((d, i) => `<text x="${x(i)}" y="${H - 6}" class="sm-axis" text-anchor="middle">${d.year}</text>`).join('');
            host.innerHTML = `<svg width="${W}" height="${H}" class="sm-trend">
                <line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" class="sm-trend-base"/>
                <text x="${P.l - 6}" y="${P.t + 4}" class="sm-axis" text-anchor="end">${maxCount}</text><text x="${P.l - 6}" y="${H - P.b}" class="sm-axis" text-anchor="end">0</text>
                <text x="${W - P.r + 6}" y="${P.t + 4}" class="sm-axis">G${gMax}</text><text x="${W - P.r + 6}" y="${H - P.b}" class="sm-axis">G${gMin}</text>
                ${bars}<path d="${line}" class="sm-trend-line"/>${dots}${labels}</svg>`;
        });
    }

    /** 確認が必要な社員（クリックで部署別配置に移り、その社員を強調） */
    attentionLists(m) {
        const person = (r, note) => `<button type="button" class="sm-person" data-employee-id="${r.emp.id}" title="部署別配置でこの社員を表示"><span class="sm-person-name">${this.app.shell.escape(r.emp.name)}</span><span class="sm-person-note">${note}</span></button>`;
        const list = (items, render) => {
            if (!items.length) return '<p class="sm-muted">該当なし</p>';
            const shown = items.slice(0, SummaryView.LIST_LIMIT).map(render).join('');
            const rest = items.length - SummaryView.LIST_LIMIT;
            return `<div class="sm-people">${shown}</div>${rest > 0 ? `<p class="sm-more">ほか ${rest}名</p>` : ''}`;
        };
        const a = m.attention;
        const groups = [
            { title: 'フラグ付き', icon: 'fa-flag', items: a.flagged, render: r => person(r, SummaryView.FLAG_LABELS[r.cur.flag]) },
            { title: `グレード滞留 ${SummaryView.STAGNANT_YEARS}年以上`, icon: 'fa-hourglass-half', items: a.stagnant, render: r => person(r, `G${r.grade} ${r.stay}年`) },
            { title: '年度評価 2年連続低下', icon: 'fa-arrow-trend-down', items: a.evalDown, render: r => person(r, r.cur.yearlyEvaluation) }
        ];
        const body = groups.map(g => `<div class="sm-att"><h4><i class="fas ${g.icon}"></i>${g.title}<b>${g.items.length}</b></h4>${list(g.items, g.render)}</div>`).join('');
        return this.card('確認が必要な社員', 'fa-clipboard-check', body, '名前をクリックで部署別配置へ', 'sm-card-attention');
    }
}
