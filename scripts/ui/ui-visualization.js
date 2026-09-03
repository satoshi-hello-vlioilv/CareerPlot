/**
 * UI操作と表示 チャート関連 - 人事評定視覚化アプリケーション
 * チャート描画、ツールチップ、データ可視化に関連する機能を提供
 */
class AppUICharts {
    constructor(appUI) {
        this.appUI = appUI;
        this.appController = appUI.appController;
        this.tooltipTimeout = null; // Timeout for tooltip display
        this.matrixTooltipTimeout = null; // Timeout for matrix tooltip display
    }

    // --- チャート描画 ---
    renderEmptyChart(container, messageHtml = null) {
        if (!container) return;
        const defaultMessage = `
            <div class="empty-chart">
                <i class="fas fa-info-circle"></i>
                <h3>表示データがありません</h3>
                <p>左側のリストからチャートに表示する社員を選択するか、フィルター条件を確認してください。</p>
                <button id="focusEmployeeListBtn" class="btn btn-primary">
                    <i class="fas fa-users"></i> 社員リストを確認
                </button>
            </div>
        `;
        container.innerHTML = messageHtml || defaultMessage;

        // Add event listener only if the default message button exists
        const focusBtn = container.querySelector('#focusEmployeeListBtn');
        focusBtn?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const listContainer = document.getElementById('employeeSelectListContainer');
            // Expand sidebar if collapsed
            if (sidebar?.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                const icon = document.getElementById('sidebarCollapseBtn')?.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-left';
                // Optional: wait for animation before scrolling
                // setTimeout(() => listContainer?.scrollIntoView(...), 350);
            }
            // Scroll to list and pulse
            if (listContainer) {
                listContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                listContainer.classList.add('pulse-animation');
                setTimeout(() => listContainer.classList.remove('pulse-animation'), 1500);
            }
        });
    }

    // 評価カード
    createEvaluationCard(text, type, details = {}) {
        if (!text && type !== 'yearly' && type !== 'department-badge' && type !== 'team-badge' && type !== 'contract-type-badge') return null;

        let card;

        // Get display options for showing/hiding change indicators
        const displayOptions = this.appController.getDisplayOptions();

        switch (type) {
            case 'grade':

                // グレード本体と変化情報を分離
                const gradeContainer = document.createElement('div');
                gradeContainer.className = 'grade-container';
                gradeContainer.title = `グレード: ${text}`;

                // フラグバッジ
                if (details.evaluation && details.evaluation.flag && displayOptions.showFlagIcon) {
                    const flagBadge = this.createFlagBadge(details.evaluation.flag);
                    if (flagBadge) {
                        gradeContainer.appendChild(flagBadge);
                        gradeContainer.title += ` (${flagBadge.title})`;
                    }
                }

                // グレードバッジ
                const gradeBadge = document.createElement('div');
                gradeBadge.className = 'evaluation-card grade-evaluation';
                gradeBadge.textContent = text;
                
                const gradeValue = text;
                const gradeNum = parseInt(String(gradeValue).replace('G', ''));

                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    const styleVar = `--grade-${gradeNum}`;
                    gradeBadge.style.backgroundColor = `var(${styleVar})`;

                    // 一時的にDOMに追加してスタイルを計算
                    document.body.appendChild(gradeBadge);
                    const backgroundColorHex = this.appUI.getComputedBgHex(gradeBadge);
                    document.body.removeChild(gradeBadge);

                    this.appUI.applyContrastColor(gradeBadge, backgroundColorHex);
                    gradeBadge.style.borderColor = 'rgba(0,0,0,0.1)';
                } else {
                    // 無効なグレードの場合のフォールバック
                    gradeBadge.style.backgroundColor = 'transparent';
                    gradeBadge.style.color = 'var(--text-muted)';
                    gradeBadge.style.border = '1px dashed var(--base-medium-gray)';
                    gradeBadge.textContent = '?';
                    gradeContainer.title = `無効なグレード: ${text}`;
                    console.warn(`Invalid grade value encountered: ${text}`);
                    return gradeBadge; // 無効な場合は早期リターン
                }

                gradeContainer.appendChild(gradeBadge);



                if (details.evaluation && details.employeeId && details.year && displayOptions.showGradeChange) {
                    // 既存のグレード変化表示コード
                    const evaluations = this.appController.appData.getEmployeeEvaluations(details.employeeId);
                    const prevEval = evaluations.find(e => e.year === details.year - 1);
                    
                    if (prevEval && prevEval.grade) {
                        // 現在のグレードと前年のグレードを数値化して比較
                        const currentGradeNum = parseInt(String(text).replace('G', ''));
                        const prevGradeNum = parseInt(String(prevEval.grade).replace('G', ''));
                        
                        if (!isNaN(currentGradeNum) && !isNaN(prevGradeNum)) {
                            const changeEl = document.createElement('div');
                            changeEl.className = 'grade-change';
                            
                            if (currentGradeNum > prevGradeNum) {
                                // 上昇
                                changeEl.innerHTML = `<i class="fas fa-arrow-up text-info"></i>`;
                                changeEl.title = `前年から上昇 (${prevEval.year}年: ${prevEval.grade})`;
                            } else if (currentGradeNum < prevGradeNum) {
                                // 下降
                                changeEl.innerHTML = `<i class="fas fa-arrow-down text-danger"></i>`;
                                changeEl.title = `前年から下降 (${prevEval.year}年: ${prevEval.grade})`;
                            } else {
                                // 変化なし（維持）、連続年数を計算
                                const consecutiveYears = this.appController.appData.getConsecutiveYearsSameGrade(details.employeeId, details.year);
                                if (consecutiveYears > 1) {
                                    changeEl.innerHTML = `<i class="fas fa-equals text-muted"></i> <span class="consecutive-years">${consecutiveYears}年</span>`;
                                    changeEl.title = `${consecutiveYears}年間同一グレードを維持`;
                                } else {
                                    changeEl.innerHTML = `<i class="fas fa-equals text-muted"></i>`;
                                    changeEl.title = `前年と変化なし`;
                                }
                            }
                            
                            gradeContainer.appendChild(changeEl);
                        }
                    }
                }

                return gradeContainer;

            case 'yearly':
                // === 年度評価表示の分離改修 ===
                if (!details.evaluation || !details.employeeId || !details.year) return null;

                const yearlyContainer = document.createElement('div');
                yearlyContainer.className = 'yearly-container';
                yearlyContainer.title = `年度評価: ${text}`;

                // 年度評価バッジ
                const yearlyText = document.createElement('div');
                yearlyText.className = 'evaluation-card yearly-evaluation';
                yearlyText.textContent = text;
                
                // 評価タイプ（A/B/C）に基づいたデータ属性を追加
                const evalType = text.charAt(0).toUpperCase();
                yearlyText.setAttribute('data-eval-type', evalType);
                yearlyContainer.appendChild(yearlyText);

                // 前年比較情報
                if (displayOptions.showYearlyEvalChange) {
                    // 既存の評価変化表示コード
                    const evaluations = this.appController.appData.getEmployeeEvaluations(details.employeeId);
                    const prevEval = evaluations.find(e => e.year === details.year - 1);
                    
                    if (prevEval && prevEval.yearlyEvaluation) {
                        const currentPrefix = String(text).charAt(0).toUpperCase();
                        const currentValueStr = String(text).substring(1);
                        const prevPrefix = String(prevEval.yearlyEvaluation).charAt(0).toUpperCase();
                        const prevValueStr = String(prevEval.yearlyEvaluation).substring(1);
                        
                        // 同じ評価タイプ（A/B/C）内での変化のみ比較
                        if (currentPrefix === prevPrefix) {
                            const currentValue = parseInt(currentValueStr);
                            const prevValue = parseInt(prevValueStr);
                            
                            if (!isNaN(currentValue) && !isNaN(prevValue)) {
                                const changeEl = document.createElement('div');
                                changeEl.className = 'yearly-change';
                                
                                if (currentValue > prevValue) {
                                    // 上昇
                                    changeEl.innerHTML = `<i class="fas fa-arrow-up text-info"></i>`;
                                    changeEl.title = `前年から上昇 (${prevEval.year}年: ${prevEval.yearlyEvaluation})`;
                                } else if (currentValue < prevValue) {
                                    // 下降
                                    changeEl.innerHTML = `<i class="fas fa-arrow-down text-danger"></i>`;
                                    changeEl.title = `前年から下降 (${prevEval.year}年: ${prevEval.yearlyEvaluation})`;
                                } else {
                                    // 変化なし（維持）、連続年数を計算
                                    const consecutiveYears = this.appController.appData.getConsecutiveYearsSameEvaluation(details.employeeId, details.year);
                                    if (consecutiveYears > 1) {
                                        changeEl.innerHTML = `<i class="fas fa-equals text-muted"></i> <span class="consecutive-years">${consecutiveYears}年</span>`;
                                        changeEl.title = `${consecutiveYears}年間同一評価を維持`;
                                    } else {
                                        changeEl.innerHTML = `<i class="fas fa-equals text-muted"></i>`;
                                        changeEl.title = `前年と変化なし`;
                                    }
                                }
                                
                                yearlyContainer.appendChild(changeEl);
                            }
                        }
                    }
                }
                    
                return yearlyContainer;

            case 'position':
                card = document.createElement('div');
                card.className = 'evaluation-card position';
                card.textContent = text;
                card.title = `役職: ${text}`;
                return card;

            case 'department-badge':
                if (!details.employeeDeptId) return null;
                const dept = this.appController.appData.getDepartments().find(d => d.id === details.employeeDeptId);
                if (!dept) return null;
                
                card = document.createElement('div');
                card.className = 'evaluation-card department';
                card.textContent = dept.name;
                card.title = `部署: ${dept.name}`;
                return card;

            case 'team-badge':
                if (!details.employeeTeamId) return null;
                const team = this.appController.appData.getTeams().find(t => t.id === details.employeeTeamId);
                if (!team) return null;
                
                card = document.createElement('div');
                card.className = 'evaluation-card team';
                card.textContent = team.name;
                card.title = `所属班: ${team.name}`;
                return card;
            case 'contract-type-badge':
                if (!details.employeeContractType) return null;
                const contractTypes = this.appController.appData.getContractTypes();
                const contractType = contractTypes.find(ct => ct.id === details.employeeContractType);
                if (!contractType) return null;
                
                card = document.createElement('div');
                card.className = 'evaluation-card contract-type';
                card.textContent = contractType.name;
                card.title = `契約形態: ${contractType.name}`;
                
                // 契約形態に応じたスタイリング
                switch (details.employeeContractType) {
                    case 'full-time':
                        card.classList.add('full-time');
                        break;
                    case 'probation':
                        card.classList.add('probation');
                        break;
                    case 'contract':
                        card.classList.add('contract');
                        break;
                    case 'dispatch':
                        card.classList.add('dispatch');
                        break;
                    case 'seconded':
                        card.classList.add('seconded');
                        break;
                    case 'retired':
                        card.classList.add('retired');
                        break;
                }
                return card;

            default:
                return null;
        }

        return card;
    }


    // 新卒/中途分けて統計情報を表示するキャリアパス分析チャート
    renderCareerPathChart(filteredEmployees, yearFilter = null) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>キャリアパス分析対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>`);
            return;
        }

        // 表示オプションを取得
        const displayOptions = this.appController.getDisplayOptions();
        const sortOrder = displayOptions.sortOrder;
        const { min: minAge, max: maxAge } = displayOptions.ageRange;
        
        // 年度フィルター情報
        const yearFilterActive = yearFilter && yearFilter.size > 0;
        let yearFilterText = '';
        if (yearFilterActive) {
            const yearArray = Array.from(yearFilter).sort((a, b) => b - a);
            yearFilterText = yearArray.length === 1 
                ? `(${yearArray[0]}年)` 
                : `(${Math.min(...yearArray)}年～${Math.max(...yearArray)}年)`;
        }
        
        // グレードオプションを取得
        const gradeOptions = this.appController.appData.getGradeOptions();
        
        // グレードを昇順に並べ替え
        const sortedGradeOptions = [...gradeOptions].sort((a, b) => {
            const numA = parseInt(a.replace('G', ''));
            const numB = parseInt(b.replace('G', ''));
            return numA - numB;
        });
        
        // 表示順の適用
        if (sortOrder === 'desc') {
            sortedGradeOptions.reverse();
        }
        
        // 役職リストを取得
        const positions = this.appController.appData.getPositions();
        
        // 各グレードと役職ごとの最年少到達者を格納するオブジェクト
        const youngestByGrade = {};
        const youngestByPosition = {};
        
        // 統計情報を格納するオブジェクト (全体/新卒/中途)
        const gradeStats = {};
        const gradeStatsNew = {}; // 新卒社員の統計
        const gradeStatsMid = {}; // 中途社員の統計
        
        const positionStats = {};
        const positionStatsNew = {}; // 新卒社員の統計
        const positionStatsMid = {}; // 中途社員の統計
        
        // 初期化
        sortedGradeOptions.forEach(grade => {
            youngestByGrade[grade] = { age: Infinity, employee: null, evaluation: null };
            
            // 全体の統計
            gradeStats[grade] = {
                ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
            };
            
            // 新卒の統計
            gradeStatsNew[grade] = {
                ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
            };
            
            // 中途の統計
            gradeStatsMid[grade] = {
                ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
            };
        });
        
        positions.forEach(position => {
            if (position.name) { // 役職なしは除外
                youngestByPosition[position.name] = { age: Infinity, employee: null, evaluation: null };
                
                // 全体の統計
                positionStats[position.name] = {
                    ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
                };
                
                // 新卒の統計
                positionStatsNew[position.name] = {
                    ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
                };
                
                // 中途の統計
                positionStatsMid[position.name] = {
                    ageSum: 0, count: 0, ages: [], minAge: Infinity, maxAge: 0
                };
            }
        });
        
        // 各社員を処理して最年少・統計情報を特定
        filteredEmployees.forEach(employee => {
            // 評価データを取得
            let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
            
            // 年度フィルターが適用されている場合、該当年度の評価のみ使用
            if (yearFilterActive) {
                employeeEvals = employeeEvals.filter(evaluation => yearFilter.has(evaluation.year));
            }
            
            if (employeeEvals.length === 0) return; // 評価がない場合はスキップ
            
            // 新卒/中途の判定 (入社年齢で判定)
            let isNewGraduate = false;
            try {
                const birthDate = new Date(employee.birthdate);
                const joinDate = new Date(employee.joinDate);
                
                if (!isNaN(birthDate.getTime()) && !isNaN(joinDate.getTime())) {
                    // 入社時の年齢を計算
                    let joinAge = joinDate.getFullYear() - birthDate.getFullYear();
                    
                    // 誕生日がまだ来ていない場合は1引く
                    const birthMonth = birthDate.getMonth();
                    const birthDay = birthDate.getDate();
                    const joinMonth = joinDate.getMonth();
                    const joinDay = joinDate.getDate();
                    
                    if (joinMonth < birthMonth || (joinMonth === birthMonth && joinDay < birthDay)) {
                        joinAge--;
                    }
                    
                    // 19歳以下で入社の場合を新卒とみなす
                    isNewGraduate = joinAge <= 19;
                }
            } catch (e) {
                console.warn("Error calculating recruitment type:", e);
            }
            
            // 各グレードと役職についての初回到達時情報を追跡
            const gradeFirstReached = {};
            const positionFirstReached = {};
            
            employeeEvals.forEach(eval2 => {
                const grade = eval2.grade;
                const position = eval2.position;
                const age = eval2.age;
                
                // 最年少グレード到達者チェック
                if (grade && gradeFirstReached[grade] === undefined && gradeStats[grade]) {
                    gradeFirstReached[grade] = { age, evaluation: eval2 };
                    
                    // 全体の統計情報を更新
                    gradeStats[grade].ageSum += age;
                    gradeStats[grade].count++;
                    gradeStats[grade].ages.push(age);
                    gradeStats[grade].minAge = Math.min(gradeStats[grade].minAge, age);
                    gradeStats[grade].maxAge = Math.max(gradeStats[grade].maxAge, age);
                    
                    // 新卒/中途別の統計情報を更新
                    if (isNewGraduate) {
                        gradeStatsNew[grade].ageSum += age;
                        gradeStatsNew[grade].count++;
                        gradeStatsNew[grade].ages.push(age);
                        gradeStatsNew[grade].minAge = Math.min(gradeStatsNew[grade].minAge, age);
                        gradeStatsNew[grade].maxAge = Math.max(gradeStatsNew[grade].maxAge, age);
                    } else {
                        gradeStatsMid[grade].ageSum += age;
                        gradeStatsMid[grade].count++;
                        gradeStatsMid[grade].ages.push(age);
                        gradeStatsMid[grade].minAge = Math.min(gradeStatsMid[grade].minAge, age);
                        gradeStatsMid[grade].maxAge = Math.max(gradeStatsMid[grade].maxAge, age);
                    }
                    
                    // 現在の最年少記録と比較
                    if (age < youngestByGrade[grade].age) {
                        youngestByGrade[grade] = { 
                            age, 
                            employee, 
                            evaluation: eval2,
                            isNewGraduate // 新卒/中途情報も保存
                        };
                    }
                }
                
                // 最年少役職就任者チェックと統計情報更新
                if (position && positionFirstReached[position] === undefined && positionStats[position]) {
                    positionFirstReached[position] = { age, evaluation: eval2 };
                    
                    // 全体の役職統計情報を更新
                    positionStats[position].ageSum += age;
                    positionStats[position].count++;
                    positionStats[position].ages.push(age);
                    positionStats[position].minAge = Math.min(positionStats[position].minAge, age);
                    positionStats[position].maxAge = Math.max(positionStats[position].maxAge, age);
                    
                    // 新卒/中途別の役職統計情報を更新
                    if (isNewGraduate) {
                        positionStatsNew[position].ageSum += age;
                        positionStatsNew[position].count++;
                        positionStatsNew[position].ages.push(age);
                        positionStatsNew[position].minAge = Math.min(positionStatsNew[position].minAge, age);
                        positionStatsNew[position].maxAge = Math.max(positionStatsNew[position].maxAge, age);
                    } else {
                        positionStatsMid[position].ageSum += age;
                        positionStatsMid[position].count++;
                        positionStatsMid[position].ages.push(age);
                        positionStatsMid[position].minAge = Math.min(positionStatsMid[position].minAge, age);
                        positionStatsMid[position].maxAge = Math.max(positionStatsMid[position].maxAge, age);
                    }
                    
                    // 最年少記録と比較
                    if (age < youngestByPosition[position].age) {
                        youngestByPosition[position] = { 
                            age, 
                            employee, 
                            evaluation: eval2,
                            isNewGraduate // 新卒/中途情報も保存
                        };
                    }
                }
            });
        });
        
        // 統計情報を計算（全体、新卒、中途のそれぞれ）
        const calculateStats = (statsObj) => {
            Object.keys(statsObj).forEach(key => {
                const stats = statsObj[key];
                
                // 平均年齢の計算
                stats.avgAge = stats.count > 0 ? Math.round((stats.ageSum / stats.count) * 10) / 10 : null;
                
                // 標準偏差を計算
                if (stats.count > 1) {
                    const mean = stats.ageSum / stats.count;
                    const sumSquareDiff = stats.ages.reduce((sum, age) => sum + Math.pow(age - mean, 2), 0);
                    stats.stdDev = Math.sqrt(sumSquareDiff / stats.count);
                } else {
                    stats.stdDev = null;
                }
                
                // MIN-MAXの表示文字列
                if (stats.count > 0) {
                    stats.minMaxRange = `${stats.minAge}-${stats.maxAge}`;
                } else {
                    stats.minMaxRange = '-';
                }
            });
        };
        
        // 各統計情報の計算実行
        calculateStats(gradeStats);
        calculateStats(gradeStatsNew);
        calculateStats(gradeStatsMid);
        calculateStats(positionStats);
        calculateStats(positionStatsNew);
        calculateStats(positionStatsMid);
        
        // 偏差値の計算 (必要に応じて)
        Object.keys(gradeStats).forEach(grade => {
            if (gradeStats[grade].stdDev > 0 && youngestByGrade[grade].age !== Infinity) {
                const zScore = (youngestByGrade[grade].age - gradeStats[grade].avgAge) / gradeStats[grade].stdDev;
                gradeStats[grade].deviationValue = Math.round((50 - (zScore * 10)) * 10) / 10;
            } else {
                gradeStats[grade].deviationValue = null;
            }
        });
        
        Object.keys(positionStats).forEach(position => {
            if (positionStats[position].stdDev > 0 && youngestByPosition[position].age !== Infinity) {
                const zScore = (youngestByPosition[position].age - positionStats[position].avgAge) / positionStats[position].stdDev;
                positionStats[position].deviationValue = Math.round((50 - (zScore * 10)) * 10) / 10;
            } else {
                positionStats[position].deviationValue = null;
            }
        });
        
        // チャート生成
        let html = `
            <div class="career-path-container">
                <h2>キャリアパス分析チャート ${yearFilterText}</h2>
                <p class="distribution-info">各グレード/役職の最年少到達者と新卒/中途別統計情報（フィルター適用後の社員: ${filteredEmployees.length}名）</p>
                
                <div class="career-path-chart-container">
                    <h3 class="section-title">グレード到達分析</h3>
                    <table class="career-path-chart">
                        <thead>
                            <tr>
                                <th rowspan="2">グレード</th>
                                <th colspan="5">最年少到達者</th>
                                <th colspan="6">統計情報</th>
                            </tr>
                            <tr>
                                <th>年齢</th>
                                <th>氏名</th>
                                <th>評価年度</th>
                                <th>採用</th>
                                <th>備考</th>
                                <th>全体<br>平均年齢</th>
                                <th>全体<br>年齢範囲</th>
                                <th>新卒<br>平均年齢</th>
                                <th>新卒<br>年齢範囲</th>
                                <th>中途<br>平均年齢</th>
                                <th>中途<br>年齢範囲</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // グレード情報の行を追加
        sortedGradeOptions.forEach(grade => {
            const record = youngestByGrade[grade];
            const stats = gradeStats[grade];
            const statsNew = gradeStatsNew[grade];
            const statsMid = gradeStatsMid[grade];
            
            if (record.employee || stats.count > 0) {
                const gradeNum = grade.replace('G', '');
                
                html += `<tr class="grade-record">`;
                
                // グレード表示
                html += `<td class="grade-cell"><strong class="grade-label" style="background-color: var(--grade-${gradeNum});">${grade}</strong>`;
                
                // 対象人数を表示（統計情報あり）- 横に表示
                if (stats.count > 0) {
                    html += `<span class="count-badge">(${stats.count}名)</span>`;
                }
                
                html += `</td>`;
                
                // 最年少到達者情報
                if (record.employee) {
                    html += `
                        <td class="age-cell">${record.age}歳</td>
                        <td class="text-center">${record.employee.name}</td>
                        <td class="text-center">${record.evaluation.year}年</td>
                        <td class="text-center">${record.isNewGraduate ? '新卒' : '中途'}</td>
                        <td class="text-center">
                            ${record.evaluation.position ? `役職: ${record.evaluation.position}` : ''}
                            ${record.evaluation.notes ? `<br>${record.evaluation.notes}` : ''}
                        </td>
                    `;
                } else {
                    html += `<td colspan="5" class="text-center">記録なし</td>`;
                }
                
                // 統計情報の表示 (全体/新卒/中途)
                html += `<td class="stat-cell">${stats.avgAge !== null ? stats.avgAge + '歳' : '-'}</td>`;
                html += `<td class="stat-cell">${stats.minMaxRange !== '-' ? stats.minMaxRange : '-'}</td>`;
                
                // 新卒統計
                html += `<td class="stat-cell ${statsNew.count > 0 ? '' : 'empty-stat'}">${statsNew.avgAge !== null ? statsNew.avgAge + '歳' : '-'}</td>`;
                html += `<td class="stat-cell ${statsNew.count > 0 ? '' : 'empty-stat'}">${statsNew.minMaxRange !== '-' ? statsNew.minMaxRange : '-'}</td>`;
                
                // 中途統計
                html += `<td class="stat-cell ${statsMid.count > 0 ? '' : 'empty-stat'}">${statsMid.avgAge !== null ? statsMid.avgAge + '歳' : '-'}</td>`;
                html += `<td class="stat-cell ${statsMid.count > 0 ? '' : 'empty-stat'}">${statsMid.minMaxRange !== '-' ? statsMid.minMaxRange : '-'}</td>`;
                
                html += `</tr>`;
            }
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                
                <div class="career-path-chart-container">
                    <h3 class="section-title">役職就任分析</h3>
                    <table class="career-path-chart">
                        <thead>
                            <tr>
                                <th rowspan="2">役職</th>
                                <th colspan="5">最年少就任者</th>
                                <th colspan="6">統計情報</th>
                            </tr>
                            <tr>
                                <th>年齢</th>
                                <th>氏名</th>
                                <th>評価年度</th>
                                <th>採用</th>
                                <th>備考</th>
                                <th>全体<br>平均年齢</th>
                                <th>全体<br>年齢範囲</th>
                                <th>新卒<br>平均年齢</th>
                                <th>新卒<br>年齢範囲</th>
                                <th>中途<br>平均年齢</th>
                                <th>中途<br>年齢範囲</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // 役職情報の行を追加
        const sortedPositions = positions
            .filter(p => p.name && (youngestByPosition[p.name].employee || positionStats[p.name].count > 0)) // 空の役職と記録のない役職を除外
            .sort((a, b) => a.id - b.id); 
        
        sortedPositions.forEach(position => {
            const record = youngestByPosition[position.name];
            const stats = positionStats[position.name];
            const statsNew = positionStatsNew[position.name];
            const statsMid = positionStatsMid[position.name];
            
            html += `<tr class="position-record">`;
            
            // 役職表示
            html += `<td class="position-cell"><span class="position-indicator">${position.name}</span>`;
            
            // 対象人数を表示（統計情報あり）- 横に表示
            if (stats.count > 0) {
                html += `<span class="count-badge">(${stats.count}名)</span>`;
            }
            
            html += `</td>`;
            
            // 最年少就任者情報
            if (record.employee) {
                html += `
                    <td class="age-cell">${record.age}歳</td>
                    <td class="text-center">${record.employee.name}</td>
                    <td class="text-center">${record.evaluation.year}年</td>
                    <td class="text-center">${record.isNewGraduate ? '新卒' : '中途'}</td>
                    <td class="text-center">
                        グレード: ${record.evaluation.grade}
                        ${record.evaluation.notes ? `<br>${record.evaluation.notes}` : ''}
                    </td>
                `;
            } else {
                html += `<td colspan="5" class="text-center">記録なし</td>`;
            }
            
            // 統計情報の表示 (全体/新卒/中途)
            html += `<td class="stat-cell">${stats.avgAge !== null ? stats.avgAge + '歳' : '-'}</td>`;
            html += `<td class="stat-cell">${stats.minMaxRange !== '-' ? stats.minMaxRange : '-'}</td>`;
            
            // 新卒統計
            html += `<td class="stat-cell ${statsNew.count > 0 ? '' : 'empty-stat'}">${statsNew.avgAge !== null ? statsNew.avgAge + '歳' : '-'}</td>`;
            html += `<td class="stat-cell ${statsNew.count > 0 ? '' : 'empty-stat'}">${statsNew.minMaxRange !== '-' ? statsNew.minMaxRange : '-'}</td>`;
            
            // 中途統計
            html += `<td class="stat-cell ${statsMid.count > 0 ? '' : 'empty-stat'}">${statsMid.avgAge !== null ? statsMid.avgAge + '歳' : '-'}</td>`;
            html += `<td class="stat-cell ${statsMid.count > 0 ? '' : 'empty-stat'}">${statsMid.minMaxRange !== '-' ? statsMid.minMaxRange : '-'}</td>`;
            
            html += `</tr>`;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                
                <div class="career-path-info">
                    <h3>キャリアパス分析について</h3>
                    <p>このチャートは、各グレードと役職の昇格/就任に関する分析情報を表示します。新卒/中途別の傾向も確認できます。</p>
                    <ul>
                        <li><strong>平均年齢</strong>: 各グレード/役職に到達した社員の平均年齢</li>
                        <li><strong>年齢範囲</strong>: 最年少者と最年長者の年齢範囲</li>
                        <li><strong>新卒/中途別統計</strong>: 入社形態ごとの平均年齢と年齢範囲</li>
                    </ul>
                    <p class="text-sm">※ 入社時年齢が22歳以下の社員を「新卒」、23歳以上の社員を「中途」と判定しています。</p>
                    <p class="text-sm">※ フィルター条件によって表示される社員が制限されます。正確な分析のためには、全社員データでの比較が推奨されます。</p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // スタイルをグレードラベルに適用
        document.querySelectorAll('.grade-label').forEach(label => {
            // コントラスト調整
            const bgHex = this.appUI.getComputedBgHex(label);
            this.appUI.applyContrastColor(label, bgHex);
        });
    }

    renderEvaluationChart(selectedEmployeeIds, axisType, yearFilter = null) {
        // Get chart container
        const container = document.getElementById('chartContainer');
        if (!container) return;
        
        // Check for selection immediately
        if (!selectedEmployeeIds || selectedEmployeeIds.length === 0) {
            this.renderEmptyChart(container); 
            return;
        }
        
        // Clear previous content
        container.innerHTML = '';
        
        // Set container style for proper table rendering
        container.style.overflowX = 'auto';
        container.style.position = 'relative';
        
        // Fetch selected employees and their evaluations
        const selectedEmployees = selectedEmployeeIds
            .map(id => {
                const employee = this.appController.appData.getEmployee(id);
                let employeeEvals = this.appController.appData.getEmployeeEvaluations(id);
                
                // 年度フィルターが適用されている場合、表示する評価を絞り込む
                if (yearFilter && yearFilter.size > 0) {
                    employeeEvals = employeeEvals.filter(evaluation => yearFilter.has(evaluation.year));
                }
                
                return employee ? { ...employee, evaluations: employeeEvals } : null;
            })
            .filter(Boolean); // Remove nulls

        // If after filtering, no valid employees remain
        if (selectedEmployees.length === 0) {
            this.renderEmptyChart(container); 
            return;
        }
        
        const displayOptions = this.appController.getDisplayOptions(); // Get current display options

        // グレード軸用のデータ準備
        let axisValues = [];
        const isGradeAxis = axisType === 'grade';
        
        // Determine axis range based on axisType
        if (isGradeAxis) {
            // グレード軸の場合はグレードオプションをそのまま使用
            const gradeOptions = this.appController.appData.getGradeOptions();
            
            // グレードをG1,G2,...などの順に並べ替え
            const sortedGrades = [...gradeOptions].sort((a, b) => {
                const numA = parseInt(a.replace('G', ''));
                const numB = parseInt(b.replace('G', ''));
                return numA - numB;
            });
            
            // 表示順に応じて並び替え
            axisValues = displayOptions.sortOrder === 'desc' 
                ? [...sortedGrades].reverse() // 降順なら逆順に
                : sortedGrades;               // 昇順ならそのまま
        } else {
            // 通常の数値軸（年齢、年度、勤続年数）用の処理（既存コード）
            let minAxis, maxAxis;
            const currentYear = new Date().getFullYear();

            // Calculate axis range based on selected type
            try {
                if (axisType === 'age') {
                    minAxis = displayOptions.ageRange.min;
                    maxAxis = displayOptions.ageRange.max;
                    if (minAxis >= maxAxis) throw new Error("Min age cannot be greater than or equal to max age.");
                } else if (axisType === 'year') {
                    // 年度フィルター適用時の処理
                    if (yearFilter && yearFilter.size > 0) {
                        const yearArray = Array.from(yearFilter);
                        minAxis = Math.min(...yearArray);
                        maxAxis = Math.max(...yearArray);
                    } else {
                        const allEvalYears = this.appController.appData.getEvaluations().map(e => e.year);
                        if (allEvalYears.length > 0) {
                            minAxis = Math.min(...allEvalYears);
                            maxAxis = Math.max(...allEvalYears, currentYear);
                        } else {
                            minAxis = currentYear - 10;
                            maxAxis = currentYear;
                        }
                    }
                    if (minAxis >= maxAxis) maxAxis = minAxis + 1;
                } else if (axisType === 'tenure') {
                    let selectedTenures = [];
                    selectedEmployees.forEach(emp => {
                        if (yearFilter && yearFilter.size > 0) {
                            const filteredEvals = emp.evaluations.filter(e => yearFilter.has(e.year));
                            selectedTenures = selectedTenures.concat(filteredEvals.map(e => e.tenure));
                        } else {
                            selectedTenures = selectedTenures.concat(emp.evaluations.map(e => e.tenure));
                        }
                    });
                    
                    minAxis = 0;
                    maxAxis = selectedTenures.length > 0 ? Math.max(...selectedTenures) : 20;
                    if (maxAxis <= minAxis) maxAxis = minAxis + 5;
                } else {
                    throw new Error(`Unsupported axis type: ${axisType}`);
                }
                
                // 数値軸の場合は範囲を作成
                for (let i = minAxis; i <= maxAxis; i++) axisValues.push(i);
                
                // Apply sort order to axis values
                if (displayOptions.sortOrder === 'desc') axisValues.reverse();
                
            } catch (error) {
                console.error("Error determining axis range:", error);
                this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-exclamation-triangle"></i><h3>チャート描画エラー</h3><p>軸範囲の計算中にエラーが発生しました。</p></div>`);
                return;
            }
        }

        // Create a wrapper table for the chart with fixed layout
        const tableElement = document.createElement('table');
        tableElement.className = 'evaluation-chart-table';
        tableElement.style.borderCollapse = 'collapse';
        tableElement.style.tableLayout = 'fixed';
        tableElement.style.width = '100%';
        tableElement.style.minWidth = `${selectedEmployees.length * 150 + 70}px`;

        // Create table headers
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = 'var(--main-primary)';
        headerRow.style.color = 'var(--text-on-primary)';
        headerRow.style.position = 'sticky';
        headerRow.style.top = '0';
        headerRow.style.zIndex = '10';

        // Create axis header cell
        const axisHeader = document.createElement('th');
        axisHeader.textContent = isGradeAxis ? 'グレード' : 
                                axisType === 'age' ? '年齢' : 
                                axisType === 'year' ? '年度' : '勤続';
        axisHeader.style.minWidth = '60px';
        axisHeader.style.width = '60px';
        axisHeader.style.textAlign = 'center';
        axisHeader.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
        axisHeader.style.fontWeight = 'bold';
        axisHeader.style.borderRight = '1px solid var(--main-primary-dark)';
        axisHeader.style.position = 'sticky';
        axisHeader.style.left = '0';
        axisHeader.style.zIndex = '11';
        headerRow.appendChild(axisHeader);

        // Create header cells for each employee
        selectedEmployees.forEach(employee => {
            const th = document.createElement('th');
            th.title = employee.name;
            th.style.minWidth = '130px';
            th.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
            th.style.textAlign = 'center';
            th.style.fontWeight = 'bold';
            th.style.borderRight = '1px solid var(--main-primary-dark)';
            th.style.whiteSpace = 'nowrap';
            th.style.overflow = 'hidden';
            th.style.textOverflow = 'ellipsis';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = employee.name;
            nameSpan.style.marginRight = '5px';
            nameSpan.style.verticalAlign = 'middle';
            th.appendChild(nameSpan);

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-action btn-icon-header';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = '社員情報編集';
            editBtn.style.cssText = 'display: inline-flex; vertical-align: middle; color: var(--text-on-primary); background: none; border: none; margin-left: 4px; padding: 2px; cursor: pointer; font-size: 0.8em; opacity: 0.7;';
            editBtn.addEventListener('mouseover', () => editBtn.style.opacity = '1');
            editBtn.addEventListener('mouseout', () => editBtn.style.opacity = '0.7');
            editBtn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.appController.appUIForms.showEmployeeModal(employee.id);
            });
            th.appendChild(editBtn);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        tableElement.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        
        // Create rows for each axis value
        axisValues.forEach((axisValue, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Set row background for even rows
            if (rowIndex % 2 === 1) {
                tr.style.backgroundColor = 'rgba(248, 249, 250, 0.5)';
            }
            tr.style.borderBottom = '1px solid var(--border-color)';
            
            // Create axis cell
            const axisCell = document.createElement('td');
            axisCell.textContent = axisValue;
            
            // グレード軸の場合はセルにスタイルを適用
            if (isGradeAxis) {
                const gradeNum = parseInt(String(axisValue).replace('G', ''));
                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    axisCell.style.backgroundColor = `var(--grade-${gradeNum})`;
                    
                    // テキスト色のコントラスト調整
                    const bgHex = this.appUI.getComputedBgHex(axisCell);
                    this.appUI.applyContrastColor(axisCell, bgHex);
                } else {
                    axisCell.style.backgroundColor = 'var(--base-light-gray)';
                }
            } else {
                axisCell.style.backgroundColor = 'var(--base-light-gray)';
            }
            
            axisCell.style.fontWeight = 'bold';
            axisCell.style.textAlign = 'center';
            axisCell.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
            axisCell.style.borderRight = '1px solid var(--border-color)';
            axisCell.style.position = 'sticky';
            axisCell.style.left = '0';
            axisCell.style.zIndex = '5';
            axisCell.style.minWidth = '60px';
            axisCell.style.width = '60px';
            tr.appendChild(axisCell);
            
            // Create cells for each employee
            selectedEmployees.forEach(employee => {
                const cell = document.createElement('td');
                cell.style.minWidth = '130px';
                cell.style.minHeight = '35px';
                cell.style.padding = 'var(--spacing-xs)';
                cell.style.borderRight = '1px solid var(--border-color)';
                cell.style.borderBottom = '1px solid var(--border-color)';
                cell.style.position = 'relative';
                cell.style.textAlign = 'center';
                cell.style.verticalAlign = 'middle';
                
                // Add data attributes for later use
                cell.setAttribute('data-employee-id', employee.id);
                cell.setAttribute('data-axis-value', axisValue);
                
                // Find matching evaluation for this cell
                let evaluation;
                
                if (isGradeAxis) {
                    // グレード軸の場合、該当するグレードの最新評価を表示
                    evaluation = employee.evaluations
                        .filter(e => e.grade === axisValue)
                        .sort((a, b) => b.year - a.year)[0]; // 年度降順でソート
                } else {
                    // 通常の軸の場合（既存コード）
                    evaluation = employee.evaluations.find(e =>
                        axisType === 'age' ? e.age === axisValue :
                        axisType === 'year' ? e.year === axisValue :
                        axisType === 'tenure' ? e.tenure === axisValue : false);
                }

                if (evaluation) {
                    const cellContainer = document.createElement('div');
                    cellContainer.style.display = 'flex';
                    cellContainer.style.flexWrap = 'wrap';
                    cellContainer.style.gap = 'var(--spacing-xs)';
                    cellContainer.style.justifyContent = 'center';
                    cellContainer.style.alignItems = 'center';
                    
                    const cardDetails = {
                        evaluation: evaluation,
                        employeeId: employee.id,
                        year: evaluation.year,
                        employeeDeptId: evaluation.departmentId,
                        employeeTeamId: employee.teamId,
                        employeeContractType: employee.contractType // 追加
                    };

                    // Create evaluation cards according to display options
                    if (displayOptions.showGrade) {
                        const gradeCard = this.createEvaluationCard(evaluation.grade, 'grade', cardDetails);
                        if (gradeCard) cellContainer.appendChild(gradeCard);
                    }
                    
                    if (displayOptions.showYearlyEval) {
                        const yearlyCard = this.createEvaluationCard(evaluation.yearlyEvaluation, 'yearly', cardDetails);
                        if (yearlyCard) cellContainer.appendChild(yearlyCard);
                    }
                    
                    if (displayOptions.showPosition && evaluation.position) {
                        const positionElem = this.createEvaluationCard(evaluation.position, 'position', cardDetails);
                        if (positionElem) cellContainer.appendChild(positionElem);
                    }
                    
                    if (displayOptions.showDepartmentBadge) {
                        const deptBadge = this.createEvaluationCard(null, 'department-badge', cardDetails);
                        if (deptBadge) cellContainer.appendChild(deptBadge);
                    }
                    
                    if (displayOptions.showTeam && employee.teamId) {
                        const teamBadge = this.createEvaluationCard(null, 'team-badge', cardDetails);
                        if (teamBadge) cellContainer.appendChild(teamBadge);
                    }
                    
                    // 年齢バッジ表示
                    if (displayOptions.showAge) {
                        const ageBadge = this.createAgeBadge(evaluation.age, cardDetails);
                        if (ageBadge) cellContainer.appendChild(ageBadge);
                    }
                    
                    // 勤続年数バッジ表示
                    if (displayOptions.showTenure) {
                        const tenureBadge = this.createTenureBadge(evaluation.tenure, cardDetails);
                        if (tenureBadge) cellContainer.appendChild(tenureBadge);
                    }

                    // 新卒/中途バッジ表示
                    if (displayOptions.showRecruitType) {
                        const employee = this.appController.appData.getEmployee(evaluation.employeeId);
                        if (employee) {
                            const recruitTypeBadge = this.createRecruitTypeBadge(employee, cardDetails);
                            if (recruitTypeBadge) cellContainer.appendChild(recruitTypeBadge);
                        }
                    }
                
                    // 契約形態バッジ表示
                    if (displayOptions.showContractType) {
                        const contractTypeBadge = this.createContractTypeBadge(employee, cardDetails);
                        if (contractTypeBadge) cellContainer.appendChild(contractTypeBadge);
                    }

                    cell.appendChild(cellContainer);
                    
                    // Setup interactions
                    cell.addEventListener('mouseenter', (e) => this.showEvaluationTooltip(e, evaluation));
                    cell.addEventListener('mouseleave', () => this.hideEvaluationTooltip());
                    cell.addEventListener('dblclick', () => {
                        this.hideEvaluationTooltip();
                        this.appController.appUI.appUIForms.showEvaluationModal(evaluation.id);
                    });
                } else {
                    // Empty cell - add "+" button for adding evaluation
                    cell.addEventListener('dblclick', () => {
                        // グレード軸の場合は、そのグレードの評価を追加
                        if (isGradeAxis) {
                            const latestEval = this.appController.appData.getLatestEmployeeEvaluation(employee.id);
                            if (latestEval) {
                                // 直近の評価情報をベースに、グレードだけ変更した評価追加モーダルを表示
                                this.appController.appUIForms.showEvaluationModal(null, employee.id, new Date().getFullYear());
                                // 注：グレードの自動設定は評価モーダル側で実装する必要がある
                            } else {
                                // 評価がない場合は新規評価として追加
                                this.appController.appUIForms.showEvaluationModal(null, employee.id, new Date().getFullYear());
                            }
                        } else {
                            // 通常軸の場合（既存コード）
                            let targetYear = null;
                            const birthYear = new Date(employee.birthdate).getFullYear();
                            const joinYear = new Date(employee.joinDate).getFullYear();

                            if (!isNaN(birthYear) && !isNaN(joinYear)) {
                                if (axisType === 'age') targetYear = birthYear + axisValue;
                                else if (axisType === 'year') targetYear = axisValue;
                                else if (axisType === 'tenure') targetYear = joinYear + axisValue;
                            }

                            const latestPossibleYear = new Date().getFullYear() + 1;
                            if (targetYear !== null && targetYear >= joinYear && targetYear <= latestPossibleYear) {
                                this.appController.appUIForms.showEvaluationModal(null, employee.id, targetYear);
                            } else {
                                this.appUI.showNotification('warning', '追加不可', '評価対象外の軸値、または未来の年です');
                            }
                        }
                    });
                    
                    // Add visual indicator for adding
                    const addBtn = document.createElement('div');
                    addBtn.className = 'empty-cell-add';
                    addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';
                    addBtn.title = `${isGradeAxis ? axisValue + 'の' : ''}評価追加`;
                    addBtn.style.position = 'absolute';
                    addBtn.style.top = '50%';
                    addBtn.style.left = '50%';
                    addBtn.style.transform = 'translate(-50%, -50%)';
                    addBtn.style.cursor = 'pointer';
                    addBtn.style.color = 'var(--base-medium-gray)';
                    addBtn.style.fontSize = '1.2em';
                    addBtn.style.opacity = '0';
                    addBtn.style.transition = 'opacity var(--transition-fast)';
                    
                    cell.appendChild(addBtn);
                    
                    // Show add button on hover
                    cell.addEventListener('mouseenter', () => {
                        addBtn.style.opacity = '0.4';
                    });
                    cell.addEventListener('mouseleave', () => {
                        addBtn.style.opacity = '0';
                    });
                    addBtn.addEventListener('mouseenter', () => {
                        addBtn.style.opacity = '0.8';
                        addBtn.style.color = 'var(--main-primary)';
                    });
                }
                
                tr.appendChild(cell);
            });
            
            tbody.appendChild(tr);
        });
        
        tableElement.appendChild(tbody);
        container.appendChild(tableElement);
        
        // Make sure the last row doesn't have bottom border
        const lastRow = tbody.lastElementChild;
        if (lastRow) {
            lastRow.style.borderBottom = 'none';
            const cells = lastRow.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.borderBottom = 'none';
            });
        }
    }

    /**
     * 星取表を描画するメソッド（クリック機能付き）
     * @param {Array<Object>} selectedEmployees - 表示対象の社員オブジェクトの配列
     * @param {Set<number>} yearFilter - (今回は未使用だが互換性のために残す)
     * @param {Object} displayOptions - 表示オプション (starChartType を含む)
     */
    renderStarChart(selectedEmployees, yearFilter, displayOptions) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        const chartType = displayOptions.starChartType || 'qualification';
        
        if (!selectedEmployees || selectedEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-th-list"></i><h3>表示対象社員がいません</h3><p>サイドバーから表示する社員を選択してください。</p></div>`);
            return;
        }

        const starChartType = displayOptions.starChartType || 'qualification'; // 'qualification' or 'certification'
        
        // 社員名を基準にソート
        const employees = [...selectedEmployees].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        let items; // 資格マスタまたは作業認定マスタ
        let itemTypeLabel; // "資格" または "作業認定"
        let employeeItemDataGetter; // 社員の保有資格/認定を取得する関数

        if (starChartType === 'qualification') {
            items = this.appController.appData.getQualifications().sort((a,b) => {
                const catComp = (a.category || '').localeCompare(b.category || '', 'ja');
                if (catComp !== 0) return catComp;
                return a.name.localeCompare(b.name, 'ja');
            });
            itemTypeLabel = '資格';
            employeeItemDataGetter = (empId, itemId) => {
                const empQuals = this.appController.appData.getEmployeeQualifications(empId);
                return empQuals.find(q => q.qualificationId === itemId);
            };
        } else { // certification
            items = this.appController.appData.getWorkCertifications().sort((a,b) => {
                const catComp = (a.category || '').localeCompare(b.category || '', 'ja');
                if (catComp !== 0) return catComp;
                const classComp = (a.classification || '').localeCompare(b.classification || '', 'ja');
                if (classComp !== 0) return classComp;
                return a.name.localeCompare(b.name, 'ja');
            });
            itemTypeLabel = '作業認定';
            employeeItemDataGetter = (empId, itemId) => {
                const empCerts = this.appController.appData.getEmployeeWorkCertifications(empId);
                return empCerts.find(c => c.certificationId === itemId);
            };
        }

        if (!items || items.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-exclamation-circle"></i><h3>${itemTypeLabel}マスタ未登録</h3><p>${itemTypeLabel}マスタにデータが登録されていません。設定画面から登録してください。</p></div>`);
            return;
        }
        
        let tableHtml = `<div class="star-chart-container">
                            <div class="star-chart-header">
                                <h2>星取表 - ${itemTypeLabel}</h2>
                                <p class="star-chart-info">セルをクリックして${itemTypeLabel}の登録・編集ができます</p>
                            </div>
                            <table class="star-chart-table">
                                <thead>
                                    <tr>
                                        <th class="star-chart-header-axis">${itemTypeLabel}名（分類 / 区分）</th>`;
        employees.forEach(emp => {
            tableHtml += `<th class="star-chart-header-employee" title="${emp.name}">${emp.name}</th>`;
        });
        tableHtml += `          </tr>
                                </thead>
                                <tbody>`;

        items.forEach(item => {
            let itemNameDisplay = item.name;
            // 表示オプションを取得
            const displayOptions = this.appController.getDisplayOptions();
            let itemDetails = [];
            // 分類・区分カード用のコンテナ
            let detailsHtml = '<div class="star-chart-item-details">';
            if (item.category) itemDetails.push(item.category);
            if (starChartType === 'certification' && item.classification) itemDetails.push(item.classification);
            
            if (itemDetails.length > 0) {
                itemNameDisplay += ` (${itemDetails.join(' / ')})`;
            }

            tableHtml += `<tr>
                            <td class="star-chart-item-name" title="${itemTypeLabel}: ${item.name}\n分類: ${item.category || '-'}\n${starChartType === 'certification' ? '区分: ' + (item.classification || '-') : ''}">
                                ${itemNameDisplay}
                            </td>`;
            
            employees.forEach(emp => {
                let symbol = '';
                let cellClass = 'star-chart-cell';
                let cellTitle = `${itemTypeLabel}: ${item.name}\n社員: ${emp.name}\n状態: `;
                const employeeItem = employeeItemDataGetter(emp.id, item.id);

                if (starChartType === 'qualification') {
                    if (employeeItem) {
                        // 仮のステータス。実際のデータ構造に合わせて調整
                        const status = employeeItem.status || 'acquired'; 
                        switch (status) {
                            case 'acquired':
                                symbol = '○';
                                cellClass += ' status-acquired';
                                cellTitle += '取得済';
                                break;
                            case 'planned':
                            case 'challenging':
                                symbol = '□';
                                cellClass += ' status-planned';
                                cellTitle += '計画中/挑戦中';
                                break;
                            default:
                                symbol = '○'; // 不明なステータスは取得済み扱い
                                cellClass += ' status-acquired';
                                cellTitle += '取得済 (不明な状態)';
                        }
                        cellTitle += `\n取得日: ${employeeItem.dateAcquired ? this.formatDateForDisplay(employeeItem.dateAcquired) : '-'}`;
                        if (employeeItem.expiryDate) cellTitle += `\n有効期限: ${this.formatDateForDisplay(employeeItem.expiryDate)}`;
                    } else {
                        symbol = ''; 
                        cellClass += ' status-none';
                        cellTitle += '未取得';
                    }
                } else { // certification
                    if (employeeItem) {
                        // 仮のレベル。実際のデータ構造に合わせて調整
                        const level = employeeItem.level || 'independent'; 
                        switch (level) {
                            case 'expert_trainer':
                                symbol = '●';
                                cellClass += ' level-expert';
                                cellTitle += '一人作業可能、教育も可';
                                break;
                            case 'independent':
                                symbol = '○';
                                cellClass += ' level-independent';
                                cellTitle += '一人作業可能';
                                break;
                            case 'supervised':
                                symbol = '△';
                                cellClass += ' level-supervised';
                                cellTitle += '指導下作業';
                                break;
                            case 'in_training':
                            case 'planned':
                                symbol = '□';
                                cellClass += ' level-training';
                                cellTitle += '教育・訓練中/予定';
                                break;
                            default:
                                symbol = '○'; // 不明なレベルは一人作業可扱い
                                cellClass += ' level-independent';
                                cellTitle += '一人作業可能 (不明な状態)';
                        }
                        cellTitle += `\n認定日: ${employeeItem.dateAcquired ? this.formatDateForDisplay(employeeItem.dateAcquired) : '-'}`;
                        if (employeeItem.expiryDate) cellTitle += `\n有効期限: ${this.formatDateForDisplay(employeeItem.expiryDate)}`;
                    } else {
                        symbol = ''; 
                        cellClass += ' status-none';
                        cellTitle += '未認定';
                    }
                }
                
                cellTitle += '\n\nクリックして編集';
                tableHtml += `<td class="${cellClass}" 
                                data-employee-id="${emp.id}" 
                                data-item-id="${item.id}" 
                                data-item-type="${starChartType}"
                                data-assignment-id="${employeeItem ? employeeItem.id : ''}"
                                title="${cellTitle}"
                                style="cursor: pointer; user-select: none;">${symbol}</td>`;
            });
            tableHtml += `</tr>`;
        });

        tableHtml += `      </tbody>
                            </table>
                        </div>`;
        
        container.innerHTML = tableHtml;
        
        // セルクリックイベントリスナーを追加
        this.setupStarChartCellClickEvents(starChartType);
        
        this.makeStarChartHeadersSticky(); // Ensure headers are sticky after render
    }

    /**
     * 星取表のセルクリックイベントを設定
     * @param {string} chartType 'qualification' または 'certification'
     */
    setupStarChartCellClickEvents(chartType) {
        const cells = document.querySelectorAll('.star-chart-cell[data-employee-id][data-item-id]');
        
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const employeeId = parseInt(cell.dataset.employeeId);
                const itemId = cell.dataset.itemId;
                const assignmentId = cell.dataset.assignmentId ? parseInt(cell.dataset.assignmentId) : null;
                const itemType = cell.dataset.itemType;

                console.log('Star chart cell clicked:', { employeeId, itemId, assignmentId, itemType });

                if (this.appController.certificationManager) {
                    if (itemType === 'qualification') {
                        if (assignmentId) {
                            this.appController.certificationManager.showAssignQualificationModal(employeeId, assignmentId);
                        } else {
                            this.appController.certificationManager.showAssignQualificationModal(employeeId, null, itemId);
                        }
                    } else if (itemType === 'certification') {
                        if (assignmentId) {
                            this.appController.certificationManager.showAssignCertificationModal(employeeId, assignmentId);
                        } else {
                            this.appController.certificationManager.showAssignCertificationModal(employeeId, null, itemId);
                        }
                    }
                } else {
                    console.warn('CertificationManager not found');
                }
            });
            
            // ホバー効果（セル + 縦軸 + 横軸の連動）
            cell.addEventListener('mouseenter', () => {
                // セル自体のハイライト
                cell.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                
                // 横軸ヘッダー（従業員名）のハイライト
                const employeeId = cell.dataset.employeeId;
                if (employeeId) {
                    this.highlightEmployeeColumn(employeeId, true);
                }
                
                // 縦軸ヘッダー（資格/作業認定名）のハイライト
                const row = cell.closest('tr');
                if (row) {
                    const itemNameCell = row.querySelector('.star-chart-item-name');
                    if (itemNameCell) {
                        itemNameCell.classList.add('cell-hover-active');
                    }
                }
            });
            
            cell.addEventListener('mouseleave', () => {
                // セル自体のハイライト解除
                cell.style.backgroundColor = '';
                
                // 横軸ヘッダー（従業員名）のハイライト解除
                const employeeId = cell.dataset.employeeId;
                if (employeeId) {
                    this.highlightEmployeeColumn(employeeId, false);
                }
                
                // 縦軸ヘッダー（資格/作業認定名）のハイライト解除
                const row = cell.closest('tr');
                if (row) {
                    const itemNameCell = row.querySelector('.star-chart-item-name');
                    if (itemNameCell) {
                        itemNameCell.classList.remove('cell-hover-active');
                    }
                }
            });
        });
    }

    /**
     * 従業員列のハイライト表示/非表示
     * @param {string} employeeId 従業員ID
     * @param {boolean} highlight ハイライトするかどうか
     */
    highlightEmployeeColumn(employeeId, highlight) {
        // 横軸ヘッダー（従業員名）の取得と色変更
        const table = document.querySelector('.star-chart-table');
        if (!table) return;
        
        // 従業員IDに基づいて対応する列インデックスを取得
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        
        const headers = headerRow.querySelectorAll('th');
        let columnIndex = -1;
        
        // 従業員名ヘッダーを探す（最初のthは縦軸ラベルなので1から開始）
        for (let i = 1; i < headers.length; i++) {
            const header = headers[i];
            // data-employee-idを設定していない場合は、セルから推測
            const firstDataCell = table.querySelector(`tbody tr:first-child td:nth-child(${i + 1})`);
            if (firstDataCell && firstDataCell.dataset.employeeId === employeeId) {
                columnIndex = i;
                break;
            }
        }
        
        if (columnIndex >= 0 && columnIndex < headers.length) {
            const employeeHeader = headers[columnIndex];
            if (highlight) {
                employeeHeader.classList.add('cell-hover-active');
            } else {
                employeeHeader.classList.remove('cell-hover-active');
            }
        }
    }

    /**
     * 日付を表示用にフォーマット
     * @param {string} dateStr 日付文字列
     * @returns {string} フォーマットされた日付
     */
    formatDateForDisplay(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}/${month}/${day}`;
    }
    /**
        スターチャートのヘッダーを固定（スティッキー）にするためのヘルパー。
        動的コンテンツの影響でCSSだけでは対応できない場合に必要になる可能性がある。
        現時点ではCSSで対応できていると想定しているが、念のためプレースホルダーとして残しておく。
     */
    makeStarChartHeadersSticky() {
        const table = document.querySelector('.star-chart-table');
        if (!table) return;

        // これは基本的な例です。より堅牢な対応にはオフセットの計算が必要になるかもしれません。
        // ほとんどのモダンブラウザでは、CSS の `position: sticky` で十分です。
        // もし問題が発生した場合は、ここで JavaScript ベースの「スティッキー」動作を実装することもできます。
        // 例：
        // const header = table.querySelector('thead');
        // if (header) {
        //     // スクロール時にヘッダーの位置を調整するロジック
        // }
    }


    setupCellInteractions(cell, evaluation) {
        cell.addEventListener('mouseenter', (e) => this.showEvaluationTooltip(e, evaluation));
        cell.addEventListener('mouseleave', () => this.hideEvaluationTooltip());
        cell.addEventListener('dblclick', () => {
            this.hideEvaluationTooltip(); // Hide tooltip before opening modal
            this.appController.appUI.appUIForms.showEvaluationModal(evaluation.id); // Open edit modal
        });
    }

    // renderDepartmentChart メソッド修正 - グレード軸対応
    renderDepartmentChart(filteredEmployees, axisType, yearFilter = null) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        const displayOptions = this.appController.getDisplayOptions();
        const sortOrder = displayOptions.sortOrder;
        const currentYear = new Date().getFullYear();

        // Handle empty filtered list
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象社員がいません</h3><p>フィルター条件を確認してください。</p></div>`);
            return;
        }

        const yearFilterActive = yearFilter && yearFilter.size > 0;

        // Determine axis range and label based on axisType
        let minAxis, maxAxis, axisLabel, axisUnit;
        const allEvaluations = yearFilterActive 
            ? this.appController.appData.getEvaluations().filter(e => yearFilter.has(e.year)) 
            : this.appController.appData.getEvaluations(); // Get all for range calculation

        // グレード軸対応
        const isGradeAxis = axisType === 'grade';
        let axisValues = [];

        try {
            if (isGradeAxis) {
                // グレード軸の場合はグレードオプションをそのまま使用
                const gradeOptions = this.appController.appData.getGradeOptions();
                
                // グレードをG1,G2,...などの順に並べ替え
                const sortedGrades = [...gradeOptions].sort((a, b) => {
                    const numA = parseInt(a.replace('G', ''));
                    const numB = parseInt(b.replace('G', ''));
                    return numA - numB;
                });
                
                // 表示順に応じて並び替え
                axisValues = displayOptions.sortOrder === 'desc' 
                    ? [...sortedGrades].reverse() // 降順なら逆順に
                    : sortedGrades;               // 昇順ならそのまま

                axisLabel = 'グレード';
                axisUnit = '';
            } else if (axisType === 'age') {
                axisLabel = '年齢'; axisUnit = '歳';
                minAxis = displayOptions.ageRange.min;
                maxAxis = displayOptions.ageRange.max;
                if (minAxis >= maxAxis) throw new Error("Min age cannot be >= max age.");
            } else if (axisType === 'year') {
                axisLabel = '年度'; axisUnit = '年';
                // 年度フィルターが適用されている場合
                if (yearFilterActive) {
                    const yearArray = Array.from(yearFilter);
                    minAxis = Math.min(...yearArray);
                    maxAxis = Math.max(...yearArray);
                } else {
                    const allEvalYears = allEvaluations.map(e => e.year);
                    if (allEvalYears.length > 0) {
                        minAxis = Math.min(...allEvalYears);
                        maxAxis = Math.max(...allEvalYears, currentYear);
                    } else { minAxis = currentYear - 10; maxAxis = currentYear; }
                }
                if (minAxis >= maxAxis) maxAxis = minAxis + 1;
            } else if (axisType === 'tenure') {
                axisLabel = '勤続'; axisUnit = '年';
                minAxis = 0;
                // 年度フィルターが適用されている場合
                if (yearFilterActive) {
                    const filteredTenures = allEvaluations.map(e => e.tenure);
                    maxAxis = filteredTenures.length > 0 ? Math.max(...filteredTenures) : 20;
                } else {
                    const allTenures = allEvaluations.map(e => e.tenure);
                    maxAxis = allTenures.length > 0 ? Math.max(...allTenures) : 20;
                }
                if (maxAxis <= minAxis) maxAxis = minAxis + 5;
            } else {
                throw new Error(`Unsupported axis type for department chart: ${axisType}`);
            }

            // 数値軸の場合は範囲を作成
            if (!isGradeAxis) {
                axisValues = [];
                for (let i = minAxis; i <= maxAxis; i++) axisValues.push(i);
                
                // Apply sort order to axis values
                if (displayOptions.sortOrder === 'desc') axisValues.reverse();
            }
        } catch (error) {
            console.error("Error determining axis range for department chart:", error);
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-exclamation-triangle"></i><h3>チャート描画エラー</h3><p>軸範囲の計算中にエラーが発生しました。</p></div>`);
            return;
        }

        // --- Prepare Data Structure ---
        const departmentData = {};
        const departments = this.appController.appData.getDepartments();
        
        // フィルター適用：選択された部署IDのみを使用
        const selectedDepartmentIds = this.appController.filters.departments;

        // 変更点: 表示対象として選択された社員の所属する部署のIDを取得
        const selectedEmployeeDepartmentIds = new Set();
        
        // 選択されている社員IDを取得
        const selectedEmployeeIds = this.appController.getSelectedEmployeeIds();
        
        // selectedEmployeeIdsが空でない場合のみ、選択された社員の所属部署IDを使う
        if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
            // 選択された社員がfilteredEmployeesにも含まれていることを確認
            const visibleSelectedEmployees = filteredEmployees.filter(emp => 
                selectedEmployeeIds.includes(emp.id)
            );
            
            // 選択された社員の所属部署IDを収集
            visibleSelectedEmployees.forEach(emp => {
                if (emp.departmentId) {
                    selectedEmployeeDepartmentIds.add(emp.departmentId);
                }
            });
        } else {
            // 選択された社員がいない場合は、すべての表示対象社員の所属部署を取得
            filteredEmployees.forEach(emp => {
                if (emp.departmentId) {
                    selectedEmployeeDepartmentIds.add(emp.departmentId);
                }
            });
        }
        
        // 表示対象の部署のフィルタリング:
        // 1. 選択された部署IDs (selectedDepartmentIds) に含まれる
        // 2. かつ 選択された社員の所属部署IDs (selectedEmployeeDepartmentIds) に含まれる
        const filteredDepartments = departments.filter(dept => 
            selectedDepartmentIds.has(dept.id) && selectedEmployeeDepartmentIds.has(dept.id)
        );
        
        // フィルター後に部署がない場合のメッセージ表示
        if (filteredDepartments.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象部署がありません</h3><p>部署フィルター条件を確認するか、表示社員選択で該当社員を選択してください。</p></div>`);
            return;
        }
        
        const sortedDepartments = [...filteredDepartments].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        // Initialize structure: { deptId: { name: 'Dept Name', axisMap: { axisValue1: [emp1, emp2], axisValue2: [...] } } }
        sortedDepartments.forEach(dept => {
            departmentData[dept.id] = { name: dept.name, axisMap: {} };
            // Initialize map keys for the calculated axis range
            axisValues.forEach(axisValue => {
                departmentData[dept.id].axisMap[axisValue] = [];
            });
        });

        // Populate the data structure
        filteredEmployees.forEach(employee => {
            // Ensure employee has a department that exists in our structure
            if (!departmentData[employee.departmentId]) return;

            // Get all evaluations for the employee
            let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
            
            // 年度フィルターが適用されている場合、該当年度の評価のみ使用
            if (yearFilterActive) {
                employeeEvals = employeeEvals.filter(evaluation => yearFilter.has(evaluation.year));
            }
            
            // 評価がない場合（新規社員など）の処理
            if (employeeEvals.length === 0) {
                // グレード軸や年度軸の場合は、評価がないと配置できないのでスキップ
                if (isGradeAxis || axisType === 'year') return;

                // 年齢軸・勤続年数軸の場合は、現在の情報から計算して配置
                let axisValue = null;
                const currentYear = new Date().getFullYear();
                
                if (axisType === 'age') {
                    const birthYear = new Date(employee.birthdate).getFullYear();
                    if (!isNaN(birthYear)) axisValue = currentYear - birthYear;
                } else if (axisType === 'tenure') {
                    const joinYear = new Date(employee.joinDate).getFullYear();
                    if (!isNaN(joinYear)) axisValue = currentYear - joinYear;
                }

                if (axisValue !== null && axisValue >= minAxis && axisValue <= maxAxis && 
                    teamData[employee.teamId] && 
                    teamData[employee.teamId].axisMap[axisValue] !== undefined) {
                    teamData[employee.teamId].axisMap[axisValue].push({
                        ...employee,
                        evaluation: null // 評価なし
                    });
                }
                return;
            }
            
            // グレード軸の場合の処理を追加
            if (isGradeAxis) {
                // 年度フィルタで絞り込んだ最新の評価情報を使用
                const latestEval = employeeEvals.sort((a, b) => b.year - a.year)[0];
                
                if (latestEval && latestEval.grade) {
                    // 該当グレードのセルに社員を配置
                    if (departmentData[employee.departmentId].axisMap[latestEval.grade] !== undefined) {
                        departmentData[employee.departmentId].axisMap[latestEval.grade].push({
                            ...employee,
                            evaluation: latestEval // 最新の評価情報を社員情報と一緒に保存
                        });
                    }
                }
            }
            // 軸の種類に応じて異なる処理
            else if (axisType === 'year') {
                // 年度軸の場合、各年度ごとに表示
                employeeEvals.forEach(evaluation => {
                    let axisValue = evaluation.year;
                    
                    // 年度が範囲内であれば表示
                    if (axisValue >= minAxis && axisValue <= maxAxis && 
                        departmentData[employee.departmentId].axisMap[axisValue] !== undefined) {
                        departmentData[employee.departmentId].axisMap[axisValue].push({
                            ...employee,
                            evaluation: evaluation // その年度の評価を使用
                        });
                    }
                });
            } else {
                // 年齢軸または勤続年数軸の場合、年度フィルタで絞り込んだ最新の評価情報を使用
                const latestEval = employeeEvals.sort((a, b) => b.year - a.year)[0];
                
                let axisValue;
                if (axisType === 'age') {
                    axisValue = latestEval.age;
                } else if (axisType === 'tenure') {
                    axisValue = latestEval.tenure;
                } else {
                    axisValue = null;
                }

                // Place employee in the correct cell if axisValue is valid and within range
                if (axisValue !== null && axisValue >= minAxis && axisValue <= maxAxis && 
                    departmentData[employee.departmentId].axisMap[axisValue] !== undefined) {
                    departmentData[employee.departmentId].axisMap[axisValue].push({
                        ...employee,
                        evaluation: latestEval // Store the latest evaluation info with the employee for card rendering
                    });
                }
            }
        });

        // --- Render Chart ---
        container.innerHTML = ''; // Clear container
        container.style.overflowX = 'auto'; // Ensure horizontal scrolling

        // Create table with explicit styles to ensure proper rendering
        const table = document.createElement('table');
        table.className = 'department-chart';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';
        table.style.minWidth = `${sortedDepartments.length * 150 + 70}px`; // Ensure minimum width based on departments
        
        // Create table header with explicit styles
        const thead = document.createElement('thead');
        thead.className = 'department-chart-header';
        thead.style.backgroundColor = 'var(--base-light-gray)';
        thead.style.fontWeight = '600';
        thead.style.position = 'sticky';
        thead.style.top = '0';
        thead.style.zIndex = '10';
        
        const headerRow = document.createElement('tr');
        headerRow.className = 'department-chart-header-row';
        
        // Axis header cell
        const axisHeaderCell = document.createElement('th');
        axisHeaderCell.className = 'department-chart-header-cell';
        axisHeaderCell.style.width = '60px';
        axisHeaderCell.style.minWidth = '60px';
        axisHeaderCell.style.position = 'sticky';
        axisHeaderCell.style.left = '0';
        axisHeaderCell.style.zIndex = '11';
        axisHeaderCell.style.backgroundColor = 'var(--main-primary)';
        axisHeaderCell.style.color = 'var(--text-on-primary)';
        axisHeaderCell.style.textAlign = 'center';
        axisHeaderCell.style.borderRight = '1px solid var(--border-color)';
        axisHeaderCell.style.borderBottom = '1px solid var(--border-color)';
        axisHeaderCell.textContent = axisLabel;
        headerRow.appendChild(axisHeaderCell);
        
        // Department header cells
        sortedDepartments.forEach(dept => {
            const deptHeaderCell = document.createElement('th');
            deptHeaderCell.className = 'department-chart-header-cell';
            deptHeaderCell.style.textAlign = 'center';
            deptHeaderCell.style.minWidth = '150px';
            deptHeaderCell.style.borderRight = '1px solid var(--border-color)';
            deptHeaderCell.style.borderBottom = '1px solid var(--border-color)';
            deptHeaderCell.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
            deptHeaderCell.textContent = dept.name;
            deptHeaderCell.title = dept.name;
            headerRow.appendChild(deptHeaderCell);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        tbody.className = 'department-chart-body';
        
        let axisRange = axisValues;
        
        // Create rows for each axis value
        axisRange.forEach((axisValue, rowIndex) => {
            const row = document.createElement('tr');
            row.className = 'department-chart-row';
            
            // Set row background for even rows
            if (rowIndex % 2 === 1) {
                row.style.backgroundColor = 'rgba(248, 249, 250, 0.5)';
            }
            
            // Create axis value cell
            const axisValueCell = document.createElement('td');
            axisValueCell.className = 'department-chart-department-cell';
            axisValueCell.style.textAlign = 'center';
            axisValueCell.style.width = '60px';
            axisValueCell.style.minWidth = '60px';
            axisValueCell.style.position = 'sticky';
            axisValueCell.style.left = '0';
            axisValueCell.style.zIndex = '5';
            
            // グレード軸の場合はセルにスタイルを適用
            if (isGradeAxis) {
                const gradeNum = parseInt(String(axisValue).replace('G', ''));
                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    axisValueCell.style.backgroundColor = `var(--grade-${gradeNum})`;
                    
                    // テキスト色のコントラスト調整
                    const bgHex = this.appUI.getComputedBgHex(axisValueCell);
                    this.appUI.applyContrastColor(axisValueCell, bgHex);
                } else {
                    axisValueCell.style.backgroundColor = 'var(--main-primary-light)';
                    axisValueCell.style.color = 'var(--text-color)';
                }
            } else {
                axisValueCell.style.backgroundColor = 'var(--main-primary-light)';
                axisValueCell.style.color = 'var(--text-color)';
            }
            
            axisValueCell.style.fontWeight = '600';
            axisValueCell.style.borderBottom = '1px solid var(--border-color)';
            axisValueCell.style.borderRight = '1px solid var(--border-color)';
            axisValueCell.textContent = `${axisValue}${axisUnit}`;
            row.appendChild(axisValueCell);
            
            // Create department cells
            sortedDepartments.forEach(dept => {
                const cell = document.createElement('td');
                cell.className = 'department-chart-cell';
                cell.style.minWidth = '150px';
                cell.style.padding = 'var(--spacing-xs)';
                cell.style.verticalAlign = 'top';
                cell.style.borderBottom = '1px solid var(--border-color)';
                cell.style.borderRight = '1px solid var(--border-color)';
                
                // Get employees for this cell
                const employeesInCell = departmentData[dept.id]?.axisMap[axisValue] || [];
                
                employeesInCell
                    .sort((a, b) => a.id - b.id)
                    .forEach(emp => this.createEmployeeCard(cell, emp, displayOptions));
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Make sure the last row doesn't have bottom border
        const lastRow = tbody.lastElementChild;
        if (lastRow) {
            const cells = lastRow.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.borderBottom = 'none';
            });
        }
    }

    // フラグアイコンバッジを作成するヘルパー関数
    createFlagBadge(flag) {
        if (!flag) return null;
        
        const flagBadge = document.createElement('div');
        flagBadge.className = 'flag-badge';
        
        switch (flag) {
            case 'promotion':
                flagBadge.className += ' promotion-flag';
                flagBadge.innerHTML = '<i class="fas fa-star"></i>'; // ⭐ に相当するアイコン
                flagBadge.title = '昇格対象';
                break;
            case 'retirement':
                flagBadge.className += ' retirement-flag';
                flagBadge.innerHTML = '<i class="fas fa-ban"></i>'; // 🚷 に相当するアイコン
                flagBadge.title = '退職者';
                break;
            case 'consideration':
                flagBadge.className += ' consideration-flag';
                flagBadge.innerHTML = '<i class="fas fa-hourglass-half"></i>'; // ⌛ に相当するアイコン
                flagBadge.title = '検討中';
                break;
            case 'check':
                flagBadge.className += ' check-flag';
                flagBadge.innerHTML = '<i class="fas fa-clipboard-check"></i>'; // 📋 に相当するアイコン
                flagBadge.title = 'チェック';
                break;
            case 'medical':
                flagBadge.className += ' medical-flag';
                flagBadge.innerHTML = '<i class="fas fa-heartbeat"></i>'; // 傷病中用アイコン
                flagBadge.title = '傷病中';
                break;
            case 'pending':
                flagBadge.className += ' pending-flag';
                flagBadge.innerHTML = '<i class="fas fa-clock"></i>'; // 確定待ち用アイコン
                flagBadge.title = '確定待ち';
                break;
            default:
                return null;
        }
        
        return flagBadge;
    }

    /**
     * 社員のメイン表示用写真を取得する
     * @param {Object} employee 社員データ
     * @returns {Object|null} 表示対象の写真オブジェクト（無ければnull）
     */
    getDisplayPhoto(employee) {
        if (!employee || !Array.isArray(employee.photos) || employee.photos.length === 0) return null;
        return employee.photos.find(p => p.id === employee.displayPhotoId) || employee.photos[0];
    }

    // 社員カード作成メソッドの修正（バッジデザイン統一対応）
    createEmployeeCard(container, employee, displayOptions) {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.setAttribute('data-employee-id', employee.id);
        // Tooltip shows name and the evaluation used for placement
        card.title = `${employee.name} (${employee.evaluation ? `${employee.evaluation.year}年:${employee.evaluation.grade}` : '評価無'})`;

        // Ensure card has all necessary styles directly applied
        // CSSクラス(.employee-card)側でFlexbox定義していますが、念のためインラインでも設定
        card.style.display = 'flex';
        card.style.alignItems = 'flex-start';
        card.style.gap = '8px';
        card.style.padding = '6px 8px';
        card.style.borderRadius = 'var(--border-radius-sm)';
        card.style.marginBottom = '2px';
        card.style.fontSize = 'var(--font-size-xs)';
        card.style.backgroundColor = 'var(--base-light-gray)';
        card.style.color = 'var(--text-color)';
        card.style.position = 'relative';
        card.style.cursor = 'pointer';
        card.style.transition = 'transform var(--transition-fast), box-shadow var(--transition-fast)';
        card.style.maxWidth = '100%';
        card.style.overflow = 'visible';
        card.style.lineHeight = '1.3';
        card.style.border = '1px solid var(--border-color)';

        // --- 顔写真の表示（表示オプションで切替可能。未指定時は従来通り表示） ---
        const showPhoto = displayOptions.showPhoto !== false;
        if (showPhoto) {
            const displayPhoto = this.getDisplayPhoto(employee);
            if (displayPhoto) {
                const img = document.createElement('img');
                img.className = 'employee-card-photo';
                img.src = displayPhoto.dataUrl;
                card.appendChild(img);
            } else {
                // デフォルトアイコン表示
                const iconDiv = document.createElement('div');
                iconDiv.className = 'employee-card-photo-placeholder';
                iconDiv.innerHTML = '<i class="fas fa-user"></i>';
                card.appendChild(iconDiv);
            }
        }

        // --- コンテンツコンテナ ---
        const contentContainer = document.createElement('div');
        contentContainer.className = 'employee-card-content';

        // Employee Name Label
        const label = document.createElement('span');
        label.className = 'employee-card-label';
        label.textContent = employee.name;
        label.style.display = 'block';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        label.style.fontWeight = '500';
        label.style.marginBottom = '3px';
        card.appendChild(label);

        // Badges Container
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'employee-badges';
        badgesContainer.style.display = 'flex';
        badgesContainer.style.flexWrap = 'wrap';
        badgesContainer.style.gap = '2px';

        // Prepare details for badge creation (evaluation might be null if placed by current age)
        const latestEval = employee.evaluation; // Already contains latest eval info used for placement
        const cardDetails = {
            evaluation: latestEval,
            employeeId: employee.id,
            year: latestEval?.year || new Date().getFullYear(), // Use latest eval year or current year
            employeeDeptId: latestEval ? latestEval.departmentId : employee.departmentId, // 評価時部署IDがあればそれを、なければ社員の部署IDを使用
            employeeTeamId: employee.teamId, // 所属班のIDをパスする
            employeeContractType: employee.contractType
        };

        // 部署バッジ
        if (displayOptions.showDepartmentBadge) {
            const deptBadge = this.createEvaluationCard(null, 'department-badge', cardDetails);
            if (deptBadge) badgesContainer.appendChild(deptBadge);
        }

        // 所属班バッジ
        if (displayOptions.showTeam && employee.teamId) {
            const teamBadge = this.createEvaluationCard(null, 'team-badge', cardDetails);
            if (teamBadge) badgesContainer.appendChild(teamBadge);
        }

        // 役職バッジ
        if (displayOptions.showPosition && employee.position) {
            // Use the employee's *current* position for the department chart card
            const posBadge = this.createEvaluationCard(employee.position, 'position', cardDetails);
            if (posBadge) badgesContainer.appendChild(posBadge);
        }
        
        // グレードバッジ
        if (displayOptions.showGrade && latestEval) {
            const gradeBadge = this.createEvaluationCard(latestEval.grade, 'grade', cardDetails);
            if (gradeBadge) badgesContainer.appendChild(gradeBadge);
        }

        // 年度評価バッジ
        if (displayOptions.showYearlyEval && latestEval && latestEval.yearlyEvaluation) {
            const yearlyBadge = this.createEvaluationCard(latestEval.yearlyEvaluation, 'yearly', cardDetails);
            if (yearlyBadge) badgesContainer.appendChild(yearlyBadge);
        }
        
        // 年齢バッジ
        if (displayOptions.showAge && latestEval) {
            const ageBadge = this.createAgeBadge(latestEval.age, cardDetails);
            if (ageBadge) badgesContainer.appendChild(ageBadge);
        }
        
        // 勤続年数バッジ
        if (displayOptions.showTenure && latestEval) {
            const tenureBadge = this.createTenureBadge(latestEval.tenure, cardDetails);
            if (tenureBadge) badgesContainer.appendChild(tenureBadge);
        }

        // 新卒/中途バッジ
        if (displayOptions.showRecruitType) {
            const recruitTypeBadge = this.createRecruitTypeBadge(employee, cardDetails);
            if (recruitTypeBadge) badgesContainer.appendChild(recruitTypeBadge);
        }

        // 契約形態バッジ表示
        if (displayOptions.showContractType) {
            const contractTypeBadge = this.createContractTypeBadge(employee, cardDetails);
            if (contractTypeBadge) badgesContainer.appendChild(contractTypeBadge);
        }

        // コンテンツがある場合のみ、バッジコンテナを追加
        if (badgesContainer.hasChildNodes()) {
            contentContainer.appendChild(badgesContainer);
        }
        
        // コンテンツをカードに追加
        card.appendChild(contentContainer);

        // インタラクションを追加
        card.addEventListener('mouseenter', (e) => this.showEmployeeTooltip(e, employee)); // Show general employee tooltip
        card.addEventListener('mouseleave', () => this.hideEmployeeTooltip());
        card.addEventListener('dblclick', () => {
            // 年度フィルターが1つだけ選択されている場合は、該当年度の評価編集モーダルを開く
            const yearFilter = this.appController.filters.years;
            if (yearFilter && yearFilter.size === 1) {
                const targetYear = Array.from(yearFilter)[0];
                const evaluation = employee.evaluations?.find(e => e.year === targetYear) 
                    || this.appController.appData.getEmployeeEvaluations(employee.id).find(e => e.year === targetYear);
                
                if (evaluation) {
                    this.appController.appUI.appUIForms.showEvaluationModal(evaluation.id);
                } else {
                    this.appController.appUI.appUIForms.showEvaluationModal(null, employee.id, targetYear);
                }
            } else {
                // 複数年度選択または未選択の場合は社員編集モーダルを開く
                this.appController.appUI.appUIForms.showEmployeeModal(employee.id);
            }
        });

        container.appendChild(card);
    }

    showEmployeeTooltip(event, employee) {
        const tooltip = document.getElementById('evaluationTooltip'); if (!tooltip || !employee) return;
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
            const departments = this.appController.appData.getDepartments();
            const contractTypes = this.appController.appData.getContractTypes();
            const deptName = departments.find(d => d.id === employee.departmentId)?.name || 'N/A';
            const contractTypeName = contractTypes.find(ct => ct.id === employee.contractType)?.name || 'N/A';
            const currentYear = new Date().getFullYear();
            const birthYear = new Date(employee.birthdate).getFullYear();
            const currentAge = isNaN(birthYear) ? 'N/A' : currentYear - birthYear;
            
            let photoHtml = '';
            const displayPhoto = this.getDisplayPhoto(employee);
            if (displayPhoto) {
                photoHtml = `<div style="text-align: center; margin-bottom: 10px;"><img src="${displayPhoto.dataUrl}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--main-primary-light); background-color: var(--base-light);"></div>`;
            }
            
            let content = `${photoHtml}<div class="tooltip-title" style="text-align: center;">${employee.name}</div><div class="tooltip-content">`;
            
            // 社員番号の表示（存在する場合）
            if (employee.employeeNumber) {
                content += `<div class="tooltip-row"><span class="tooltip-label">社員番号:</span><span class="tooltip-value">${employee.employeeNumber}</span></div>`;
            }
            
            content += `<div class="tooltip-row"><span class="tooltip-label">部署:</span><span class="tooltip-value">${deptName}</span></div>`;
            content += `<div class="tooltip-row"><span class="tooltip-label">契約形態:</span><span class="tooltip-value">${contractTypeName}</span></div>`;
            content += `<div class="tooltip-row"><span class="tooltip-label">現在年齢:</span><span class="tooltip-value">${currentAge}歳</span></div>`;
            if (employee.position) content += `<div class="tooltip-row"><span class="tooltip-label">役職:</span><span class="tooltip-value">${employee.position}</span></div>`;
    
            // 使用employee.evaluation（部署別チャート用）、または最新評価を取得
            const latestEval = employee.evaluation || this.appController.appData.getLatestEmployeeEvaluation(employee.id);
    
            if (latestEval) {
                content += `<div class="tooltip-row section-divider"><span class="tooltip-label">最新評価 (${latestEval.year}):</span><span class="tooltip-value">${latestEval.grade} / ${latestEval.yearlyEvaluation}</span></div>`;
                
                // フラグ情報の表示
                if (latestEval.flag) {
                    const flagBadge = this.createFlagBadge(latestEval.flag);
                    if (flagBadge) {
                        content += `<div class="tooltip-row"><span class="tooltip-label">フラグ:</span><span class="tooltip-value">${flagBadge.innerHTML} ${flagBadge.title}</span></div>`;
                    }
                }
                
                content += `<div class="tooltip-row"><span class="tooltip-label">評価時年齢:</span><span class="tooltip-value">${latestEval.age}歳</span></div>`;
                content += `<div class="tooltip-row"><span class="tooltip-label">評価時勤続:</span><span class="tooltip-value">${latestEval.tenure}年</span></div>`;
                if(latestEval.position) content += `<div class="tooltip-row"><span class="tooltip-label">評価時役職:</span><span class="tooltip-value">${latestEval.position}</span></div>`;
                
                // 評価時部署を表示
                if(latestEval.departmentId) {
                    const evalDeptName = departments.find(d => d.id === latestEval.departmentId)?.name || 'N/A';
                    content += `<div class="tooltip-row"><span class="tooltip-label">評価時部署:</span><span class="tooltip-value">${evalDeptName}</span></div>`;
                }
                
                // Add Grade change info to tooltip
                const evaluations = this.appController.appData.getEmployeeEvaluations(employee.id);
                const prevEval = evaluations.find(e => e.year === latestEval.year - 1);
    
                if (prevEval && prevEval.grade) {
                    // 現在のグレードと前年のグレードを数値化して比較
                    const currentGradeNum = parseInt(String(latestEval.grade).replace('G', ''));
                    const prevGradeNum = parseInt(String(prevEval.grade).replace('G', ''));
                    
                    if (!isNaN(currentGradeNum) && !isNaN(prevGradeNum)) {
                        let changeText = '';
                        if (currentGradeNum > prevGradeNum) {
                            // 上昇
                            changeText = `<span class="text-info">▲ 上昇</span> (前年: ${prevEval.grade})`;
                            content += `<div class="tooltip-row"><span class="tooltip-label">グレード変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                        } else if (currentGradeNum < prevGradeNum) {
                            // 下降
                            changeText = `<span class="text-danger">▼ 下降</span> (前年: ${prevEval.grade})`;
                            content += `<div class="tooltip-row"><span class="tooltip-label">グレード変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                        } else {
                            // 変化なし（維持）、連続年数を計算
                            if (typeof this.appController.appData.getConsecutiveYearsSameGrade === 'function') {
                                const consecutiveYears = this.appController.appData.getConsecutiveYearsSameGrade(employee.id, latestEval.year);
                                if (consecutiveYears > 1) {
                                    content += `<div class="tooltip-row"><span class="tooltip-label">グレード連続:</span><span class="tooltip-value">${consecutiveYears}年間維持</span></div>`;
                                }
                            }
                        }
                    }
                }
                
                // Add Yearly evaluation change info to tooltip
                const yearlyPrevEval = evaluations.find(e => e.year === latestEval.year - 1);
                if (yearlyPrevEval && yearlyPrevEval.yearlyEvaluation) {
                    const currentPrefix = String(latestEval.yearlyEvaluation).charAt(0).toUpperCase();
                    const currentValueStr = String(latestEval.yearlyEvaluation).substring(1);
                    const prevPrefix = String(yearlyPrevEval.yearlyEvaluation).charAt(0).toUpperCase();
                    const prevValueStr = String(yearlyPrevEval.yearlyEvaluation).substring(1);
                    
                    if (currentPrefix === prevPrefix && !isNaN(parseInt(currentValueStr)) && !isNaN(parseInt(prevValueStr))) {
                        const currentValue = parseInt(currentValueStr);
                        const prevValue = parseInt(prevValueStr);
                        
                        let changeText = '';
                        if (currentValue > prevValue) {
                            changeText = `<span class="text-info">▲ 上昇</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                        } else if (currentValue < prevValue) {
                            changeText = `<span class="text-danger">▼ 下降</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                        } else {
                            // 維持の場合、連続年数を取得して表示
                            if (typeof this.appController.appData.getConsecutiveYearsSameEvaluation === 'function') {
                                const consecutive = this.appController.appData.getConsecutiveYearsSameEvaluation(employee.id, latestEval.year);
                                changeText = `<span class="text-muted">= 維持</span> (${consecutive}年)`;
                            } else {
                                changeText = `<span class="text-muted">= 維持</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                            }
                        }
                        
                        content += `<div class="tooltip-row"><span class="tooltip-label">年度評価変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                    }
                }
                                   
            } else {
                content += `<div class="tooltip-row section-divider"><span class="tooltip-label">最新評価:</span><span class="tooltip-value">なし</span></div>`;
            }
            if (employee.notes) content += `<div class="tooltip-row section-divider"><span class="tooltip-label">備考:</span><span class="tooltip-value tooltip-notes">${employee.notes}</span></div>`;
            content += `</div>`;
            tooltip.innerHTML = content;
    
            // Position tooltip
            this.positionTooltip(event.target, tooltip, event);
            tooltip.classList.add('visible');
        }, 300); // Delay before showing
    }

    hideEmployeeTooltip() {
        clearTimeout(this.tooltipTimeout);
        const tooltip = document.getElementById('evaluationTooltip');
        if (tooltip) tooltip.classList.remove('visible');
    }

    showEvaluationTooltip(event, evaluation) {
        const tooltip = document.getElementById('evaluationTooltip'); if (!tooltip || !evaluation) return;
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
            const employee = this.appController.appData.getEmployee(evaluation.employeeId); if (!employee) return;
            
            // 評価時部署の取得
            const departments = this.appController.appData.getDepartments();
            const contractTypes = this.appController.appData.getContractTypes();
            const evalDeptName = evaluation.departmentId ? 
                departments.find(d => d.id === evaluation.departmentId)?.name || 'N/A' : 
                'N/A';
            const currentDeptName = departments.find(d => d.id === employee.departmentId)?.name || 'N/A';
            const contractTypeName = contractTypes.find(ct => ct.id === employee.contractType)?.name || 'N/A';
            
            tooltip.innerHTML = `<div class="tooltip-title">${employee.name} - ${evaluation.year}年度評価</div><div class="tooltip-content">`;
            
            // 社員番号の表示（存在する場合）
            if (employee.employeeNumber) {
                tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">社員番号:</span><span class="tooltip-value">${employee.employeeNumber}</span></div>`;
            }
            
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">年齢:</span><span class="tooltip-value">${evaluation.age}歳</span></div>`;
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">契約形態:</span><span class="tooltip-value">${contractTypeName}</span></div>`;
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">勤続年数:</span><span class="tooltip-value">${evaluation.tenure}年</span></div>`;
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">グレード:</span><span class="tooltip-value">${evaluation.grade}</span></div>`;
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">年度評価:</span><span class="tooltip-value">${evaluation.yearlyEvaluation}</span></div>`;
            
            // フラグ情報の表示
            if (evaluation.flag) {
                const flagBadge = this.createFlagBadge(evaluation.flag);
                if (flagBadge) {
                    tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">フラグ:</span><span class="tooltip-value">${flagBadge.innerHTML} ${flagBadge.title}</span></div>`;
                }
            }

            if(evaluation.position) tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">評価時役職:</span><span class="tooltip-value">${evaluation.position}</span></div>`;
            
            // 評価時部署の表示
            tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">評価時部署:</span><span class="tooltip-value">${evalDeptName}</span></div>`;
            
            // 現在と部署が異なる場合は両方表示
            if(evaluation.departmentId !== employee.departmentId) {
                tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">現在部署:</span><span class="tooltip-value">${currentDeptName}</span></div>`;
            }

            // Add Grade change info to tooltip
            const evaluations = this.appController.appData.getEmployeeEvaluations(employee.id);
            const prevEval = evaluations.find(e => e.year === evaluation.year - 1);

            if (prevEval && prevEval.grade) {
                // 現在のグレードと前年のグレードを数値化して比較
                const currentGradeNum = parseInt(String(evaluation.grade).replace('G', ''));
                const prevGradeNum = parseInt(String(prevEval.grade).replace('G', ''));
                
                if (!isNaN(currentGradeNum) && !isNaN(prevGradeNum)) {
                    let changeText = '';
                    if (currentGradeNum > prevGradeNum) {
                        // 上昇
                        changeText = `<span class="text-info">▲ 上昇</span> (前年: ${prevEval.grade})`;
                        tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">グレード変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                    } else if (currentGradeNum < prevGradeNum) {
                        // 下降
                        changeText = `<span class="text-danger">▼ 下降</span> (前年: ${prevEval.grade})`;
                        tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">グレード変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                    } else {
                        // 変化なし（維持）、連続年数を計算
                        if (typeof this.appController.appData.getConsecutiveYearsSameGrade === 'function') {
                            const consecutiveYears = this.appController.appData.getConsecutiveYearsSameGrade(employee.id, evaluation.year);
                            if (consecutiveYears > 1) {
                                tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">グレード連続:</span><span class="tooltip-value">${consecutiveYears}年間維持</span></div>`;
                            }
                        }
                    }
                }
            }
            
            // Add Yearly evaluation change info to tooltip
            const yearlyPrevEval = evaluations.find(e => e.year === evaluation.year - 1);
            if (yearlyPrevEval && yearlyPrevEval.yearlyEvaluation) {
                const currentPrefix = String(evaluation.yearlyEvaluation).charAt(0).toUpperCase();
                const currentValueStr = String(evaluation.yearlyEvaluation).substring(1);
                const prevPrefix = String(yearlyPrevEval.yearlyEvaluation).charAt(0).toUpperCase();
                const prevValueStr = String(yearlyPrevEval.yearlyEvaluation).substring(1);
                
                if (currentPrefix === prevPrefix && !isNaN(parseInt(currentValueStr)) && !isNaN(parseInt(prevValueStr))) {
                    const currentValue = parseInt(currentValueStr);
                    const prevValue = parseInt(prevValueStr);
                    
                    let changeText = '';
                    if (currentValue > prevValue) {
                        changeText = `<span class="text-info">▲ 上昇</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                    } else if (currentValue < prevValue) {
                        changeText = `<span class="text-danger">▼ 下降</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                    } else {
                        // 維持の場合、連続年数を取得して表示
                        if (typeof this.appController.appData.getConsecutiveYearsSameEvaluation === 'function') {
                            const consecutive = this.appController.appData.getConsecutiveYearsSameEvaluation(employee.id, evaluation.year);
                            changeText = `<span class="text-muted">= 維持</span> (${consecutive}年)`;
                        } else {
                            changeText = `<span class="text-muted">= 維持</span> (前年: ${yearlyPrevEval.yearlyEvaluation})`;
                        }
                    }
                    
                    tooltip.innerHTML += `<div class="tooltip-row"><span class="tooltip-label">年度評価変化:</span><span class="tooltip-value">${changeText}</span></div>`;
                }
            }
            
            if(evaluation.notes) tooltip.innerHTML += `<div class="tooltip-row section-divider"><span class="tooltip-label">評価備考:</span><span class="tooltip-value tooltip-notes">${evaluation.notes}</span></div>`;
            tooltip.innerHTML += `</div>`;

            // Position tooltip
            this.positionTooltip(event.currentTarget, tooltip, event); // Pass the event for cursor position
            tooltip.classList.add('visible');
        }, 300); // Delay
    }

    hideEvaluationTooltip() {
        clearTimeout(this.tooltipTimeout);
        const tooltip = document.getElementById('evaluationTooltip');
        if (tooltip) tooltip.classList.remove('visible');
    }

    // Helper to position the tooltip relative to the mouse cursor
    positionTooltip(targetElement, tooltipElement, event) {
        if (!tooltipElement) return;
        
        // Get mouse coordinates from event if available
        const mouseX = event?.clientX;
        const mouseY = event?.clientY;
        
        // If we don't have a mouse event or coordinates, fall back to element-based positioning
        if (mouseX === undefined || mouseY === undefined) {
            // Original element-based positioning as fallback
            if (!targetElement) return;
            
            const targetRect = targetElement.getBoundingClientRect();
            // Ensure tooltip is visible before getting its rect
            tooltipElement.style.visibility = 'hidden';
            tooltipElement.style.display = 'block';
            const tooltipRect = tooltipElement.getBoundingClientRect();
            tooltipElement.style.visibility = ''; // Reset visibility
            tooltipElement.style.display = '';  // Reset display

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const margin = 8; // Margin from viewport edges

            // Default position: below the target
            let top = targetRect.bottom + scrollY + margin; // Add scrollY offset
            let left = targetRect.left + scrollX + (targetRect.width / 2) - (tooltipRect.width / 2); // Add scrollX offset

            // Adjust position logic remains the same
            if (left < scrollX + margin) {
                left = scrollX + margin;
            } else if (left + tooltipRect.width > viewportWidth + scrollX - margin) {
                left = viewportWidth + scrollX - tooltipRect.width - margin;
            }

            if (top + tooltipRect.height > viewportHeight + scrollY - margin) {
                let topAbove = targetRect.top + scrollY - tooltipRect.height - margin;
                if (topAbove >= scrollY + margin) {
                    top = topAbove;
                } else {
                    top = viewportHeight + scrollY - tooltipRect.height - margin;
                }
            }
            if (top < scrollY + margin) {
                top = scrollY + margin;
            }

            tooltipElement.style.left = `${left}px`;
            tooltipElement.style.top = `${top}px`;
            return;
        }
        
        // Mouse-based positioning
        tooltipElement.style.visibility = 'hidden';
        tooltipElement.style.display = 'block';
        const tooltipRect = tooltipElement.getBoundingClientRect();
        tooltipElement.style.visibility = '';
        tooltipElement.style.display = '';
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const margin = 12; // Slightly larger margin from cursor
        
        // Position the tooltip slightly below and to the right of the cursor
        let left = mouseX + scrollX + margin;
        let top = mouseY + scrollY + margin;
        
        // Make sure tooltip doesn't go off-screen
        if (left + tooltipRect.width > viewportWidth + scrollX - margin) {
            // If tooltip would go off right edge, place it to the left of the cursor instead
            left = mouseX + scrollX - tooltipRect.width - margin;
        }
        
        if (top + tooltipRect.height > viewportHeight + scrollY - margin) {
            // If tooltip would go off bottom edge, place it above the cursor
            top = mouseY + scrollY - tooltipRect.height - margin;
        }
        
        // Ensure tooltip doesn't go off the top or left of the screen
        if (left < scrollX + margin) {
            left = scrollX + margin;
        }
        if (top < scrollY + margin) {
            top = scrollY + margin;
        }
        
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.top = `${top}px`;
    }

    // 年齢バッジと勤務年数バッジを作成するヘルパー関数
    createAgeBadge(age, details = {}) {
        if (!age) return null;
        
        const badge = document.createElement('div');
        badge.className = 'evaluation-card age-badge';
        badge.textContent = `${age}歳`;
        badge.title = `年齢: ${age}歳`;
        
        // 年齢バッジのスタイル設定
        badge.style.backgroundColor = 'rgba(119, 158, 203, 0.15)'; // 薄い青系
        badge.style.borderColor = 'rgba(119, 158, 203, 0.4)';
        badge.style.color = '#555';
        
        return badge;
    }

    createTenureBadge(tenure, details = {}) {
        if (!tenure && tenure !== 0) return null;
        
        const badge = document.createElement('div');
        badge.className = 'evaluation-card tenure-badge';
        badge.textContent = `${tenure}年`;
        badge.title = `勤続年数: ${tenure}年`;
        
        // 勤続年数バッジのスタイル設定
        badge.style.backgroundColor = 'rgba(121, 189, 154, 0.15)'; // 薄い緑系
        badge.style.borderColor = 'rgba(121, 189, 154, 0.4)';
        badge.style.color = '#555';
        
        return badge;
    }

    // renderTeamChart メソッド修正 - グレード軸対応
    renderTeamChart(filteredEmployees, axisType, yearFilter = null) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        const displayOptions = this.appController.getDisplayOptions();
        const sortOrder = displayOptions.sortOrder;
        const currentYear = new Date().getFullYear();

        // 空のフィルタリスト処理
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象社員がいません</h3><p>フィルター条件を確認してください。</p></div>`);
            return;
        }

        const yearFilterActive = yearFilter && yearFilter.size > 0;

        // グレード軸対応
        const isGradeAxis = axisType === 'grade';
        let axisValues = [];

        // 軸範囲と軸ラベルを決定
        let minAxis, maxAxis, axisLabel, axisUnit;
        const allEvaluations = yearFilterActive 
            ? this.appController.appData.getEvaluations().filter(e => yearFilter.has(e.year)) 
            : this.appController.appData.getEvaluations(); // 範囲計算用に全評価を取得

        try {
            if (isGradeAxis) {
                // グレード軸の場合はグレードオプションをそのまま使用
                const gradeOptions = this.appController.appData.getGradeOptions();
                
                // グレードをG1,G2,...などの順に並べ替え
                const sortedGrades = [...gradeOptions].sort((a, b) => {
                    const numA = parseInt(a.replace('G', ''));
                    const numB = parseInt(b.replace('G', ''));
                    return numA - numB;
                });
                
                // 表示順に応じて並び替え
                axisValues = displayOptions.sortOrder === 'desc' 
                    ? [...sortedGrades].reverse() // 降順なら逆順に
                    : sortedGrades;               // 昇順ならそのまま

                axisLabel = 'グレード';
                axisUnit = '';
            } else if (axisType === 'age') {
                axisLabel = '年齢'; axisUnit = '歳';
                minAxis = displayOptions.ageRange.min;
                maxAxis = displayOptions.ageRange.max;
                if (minAxis >= maxAxis) throw new Error("Min age cannot be >= max age.");
            } else if (axisType === 'year') {
                axisLabel = '年度'; axisUnit = '年';
                // 年度フィルターが適用されている場合
                if (yearFilterActive) {
                    const yearArray = Array.from(yearFilter);
                    minAxis = Math.min(...yearArray);
                    maxAxis = Math.max(...yearArray);
                } else {
                    const allEvalYears = allEvaluations.map(e => e.year);
                    if (allEvalYears.length > 0) {
                        minAxis = Math.min(...allEvalYears);
                        maxAxis = Math.max(...allEvalYears, currentYear);
                    } else { minAxis = currentYear - 10; maxAxis = currentYear; }
                }
                if (minAxis >= maxAxis) maxAxis = minAxis + 1;
            } else if (axisType === 'tenure') {
                axisLabel = '勤続'; axisUnit = '年';
                minAxis = 0;
                // 年度フィルターが適用されている場合
                if (yearFilterActive) {
                    const filteredTenures = allEvaluations.map(e => e.tenure);
                    maxAxis = filteredTenures.length > 0 ? Math.max(...filteredTenures) : 20;
                } else {
                    const allTenures = allEvaluations.map(e => e.tenure);
                    maxAxis = allTenures.length > 0 ? Math.max(...allTenures) : 20;
                }
                if (maxAxis <= minAxis) maxAxis = minAxis + 5;
            } else {
                throw new Error(`Unsupported axis type for team chart: ${axisType}`);
            }

            // 数値軸の場合は範囲を作成
            if (!isGradeAxis) {
                axisValues = [];
                for (let i = minAxis; i <= maxAxis; i++) axisValues.push(i);
                
                // Apply sort order to axis values
                if (displayOptions.sortOrder === 'desc') axisValues.reverse();
            }
        } catch (error) {
            console.error("Error determining axis range for team chart:", error);
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-exclamation-triangle"></i><h3>チャート描画エラー</h3><p>軸範囲の計算中にエラーが発生しました。</p></div>`);
            return;
        }

        // --- データ構造の準備 ---
        const teamData = {};
        const teams = this.appController.appData.getTeams();
        
        // フィルター適用：選択された班IDのみを使用
        const selectedTeamIds = this.appController.filters.teams;

        // 変更点: 表示対象として選択された社員の所属する班のIDを取得
        const selectedEmployeeTeamIds = new Set();
        
        // 選択されている社員IDを取得
        const selectedEmployeeIds = this.appController.getSelectedEmployeeIds();
        
        // selectedEmployeeIdsが空でない場合のみ、選択された社員の所属班IDを使う
        if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
            // 選択された社員がfilteredEmployeesにも含まれていることを確認
            const visibleSelectedEmployees = filteredEmployees.filter(emp => selectedEmployeeIds.includes(emp.id));
            
            // 選択された社員の所属班IDを収集
            visibleSelectedEmployees.forEach(emp => {
                if (emp.teamId) {
                    selectedEmployeeTeamIds.add(emp.teamId);
                }
            });
        } else {
            // 選択された社員がいない場合は、すべての表示対象社員の所属班を取得
            filteredEmployees.forEach(emp => {
                if (emp.teamId) {
                    selectedEmployeeTeamIds.add(emp.teamId);
                }
            });
        }
        
        // 表示対象の班のフィルタリング:
        // 1. 選択された班IDs (selectedTeamIds) に含まれる
        // 2. かつ 選択された社員の所属班IDs (selectedEmployeeTeamIds) に含まれる
        const filteredTeams = teams.filter(team => 
            selectedTeamIds.has(team.id) && selectedEmployeeTeamIds.has(team.id)
        );
        
        // フィルター後に班がない場合のメッセージ表示
        if (filteredTeams.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象班がありません</h3><p>所属班フィルター条件を確認するか、表示社員選択で該当社員を選択してください。</p></div>`);
            return;
        }
        
        const sortedTeams = [...filteredTeams].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        // データ構造の初期化: { teamId: { name: 'Team Name', axisMap: { axisValue1: [emp1, emp2], axisValue2: [...] } } }
        sortedTeams.forEach(team => {
            teamData[team.id] = { name: team.name, axisMap: {} };
            // 計算された軸範囲のキーを初期化
            axisValues.forEach(axisValue => {
                teamData[team.id].axisMap[axisValue] = [];
            });
        });

        // データ構造に社員情報を格納
        filteredEmployees.forEach(employee => {
            // 社員に班がなければスキップ
            if (!employee.teamId || !teamData[employee.teamId]) return;

            // 社員の評価データを取得
            let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
            
            // 年度フィルターが適用されている場合、該当年度の評価のみ使用
            if (yearFilterActive) {
                employeeEvals = employeeEvals.filter(evaluation => yearFilter.has(evaluation.year));
            }
            
            // 評価がない場合（新規社員など）の処理
            if (employeeEvals.length === 0) {
                // グレード軸や年度軸の場合は、評価がないと配置できないのでスキップ
                if (isGradeAxis || axisType === 'year') return;

                // 年齢軸・勤続年数軸の場合は、現在の情報から計算して配置
                let axisValue = null;
                const currentYear = new Date().getFullYear();
                
                if (axisType === 'age') {
                    const birthYear = new Date(employee.birthdate).getFullYear();
                    if (!isNaN(birthYear)) axisValue = currentYear - birthYear;
                } else if (axisType === 'tenure') {
                    const joinYear = new Date(employee.joinDate).getFullYear();
                    if (!isNaN(joinYear)) axisValue = currentYear - joinYear;
                }

                if (axisValue !== null && axisValue >= minAxis && axisValue <= maxAxis && 
                    teamData[employee.teamId] && 
                    teamData[employee.teamId].axisMap[axisValue] !== undefined) {
                    teamData[employee.teamId].axisMap[axisValue].push({
                        ...employee,
                        evaluation: null // 評価なし
                    });
                }
                return;
            }
            
            // グレード軸の場合の処理を追加
            if (isGradeAxis) {
                // 年度フィルタで絞り込んだ最新の評価情報を使用
                const latestEval = employeeEvals.sort((a, b) => b.year - a.year)[0];
                
                if (latestEval && latestEval.grade) {
                    // 該当グレードのセルに社員を配置
                    if (teamData[employee.teamId].axisMap[latestEval.grade] !== undefined) {
                        teamData[employee.teamId].axisMap[latestEval.grade].push({
                            ...employee,
                            evaluation: latestEval // 最新の評価情報を社員情報と一緒に保存
                        });
                    }
                }
            }
            // 軸の種類に応じて異なる処理
            else if (axisType === 'year') {
                // 年度軸の場合、各年度ごとに表示
                employeeEvals.forEach(evaluation => {
                    let axisValue = evaluation.year;
                    
                    // 年度が範囲内であれば表示
                    if (axisValue >= minAxis && axisValue <= maxAxis && 
                        teamData[employee.teamId].axisMap[axisValue] !== undefined) {
                        teamData[employee.teamId].axisMap[axisValue].push({
                            ...employee,
                            evaluation: evaluation // その年度の評価を使用
                        });
                    }
                });
            } else {
                // 年齢軸または勤続年数軸の場合、年度フィルタで絞り込んだ最新の評価情報を使用
                const latestEval = employeeEvals.sort((a, b) => b.year - a.year)[0];
                
                let axisValue;
                if (axisType === 'age') {
                    axisValue = latestEval.age;
                } else if (axisType === 'tenure') {
                    axisValue = latestEval.tenure;
                } else {
                    axisValue = null;
                }

                // 軸値が有効で範囲内であれば該当セルに社員を配置
                if (axisValue !== null && axisValue >= minAxis && axisValue <= maxAxis && 
                    teamData[employee.teamId].axisMap[axisValue] !== undefined) {
                    teamData[employee.teamId].axisMap[axisValue].push({
                        ...employee,
                        evaluation: latestEval // 最新の評価情報を社員情報と一緒に保存
                    });
                }
            }
        });

        // --- チャート表示 ---
        container.innerHTML = ''; // コンテナをクリア
        container.style.overflowX = 'auto'; // 横スクロール有効化

        // 明示的なスタイルでテーブル作成
        const table = document.createElement('table');
        table.className = 'team-chart';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';
        table.style.minWidth = `${sortedTeams.length * 150 + 70}px`; // 班数に応じた最小幅を設定
        
        // テーブルヘッダー
        const thead = document.createElement('thead');
        thead.className = 'team-chart-header';
        thead.style.backgroundColor = 'var(--base-light-gray)';
        thead.style.fontWeight = '600';
        thead.style.position = 'sticky';
        thead.style.top = '0';
        thead.style.zIndex = '10';
        
        const headerRow = document.createElement('tr');
        headerRow.className = 'team-chart-header-row';
        
        // 軸ヘッダーセル
        const axisHeaderCell = document.createElement('th');
        axisHeaderCell.className = 'team-chart-header-cell';
        axisHeaderCell.style.width = '60px';
        axisHeaderCell.style.minWidth = '60px';
        axisHeaderCell.style.position = 'sticky';
        axisHeaderCell.style.left = '0';
        axisHeaderCell.style.zIndex = '11';
        axisHeaderCell.style.backgroundColor = 'var(--main-primary)';
        axisHeaderCell.style.color = 'var(--text-on-primary)';
        axisHeaderCell.style.textAlign = 'center';
        axisHeaderCell.style.borderRight = '1px solid var(--border-color)';
        axisHeaderCell.style.borderBottom = '1px solid var(--border-color)';
        axisHeaderCell.textContent = axisLabel;
        headerRow.appendChild(axisHeaderCell);
        
        // 班ヘッダーセル
        sortedTeams.forEach(team => {
            const teamHeaderCell = document.createElement('th');
            teamHeaderCell.className = 'team-chart-header-cell';
            teamHeaderCell.style.textAlign = 'center';
            teamHeaderCell.style.minWidth = '150px';
            teamHeaderCell.style.borderRight = '1px solid var(--border-color)';
            teamHeaderCell.style.borderBottom = '1px solid var(--border-color)';
            teamHeaderCell.style.padding = 'var(--spacing-xs) var(--spacing-sm)';
            teamHeaderCell.textContent = team.name;
            teamHeaderCell.title = team.name;
            headerRow.appendChild(teamHeaderCell);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // テーブルボディ
        const tbody = document.createElement('tbody');
        tbody.className = 'team-chart-body';
        
        let axisRange = axisValues;
        
        // 軸値ごとに行を作成
        axisRange.forEach((axisValue, rowIndex) => {
            const row = document.createElement('tr');
            row.className = 'team-chart-row';
            
            // 偶数行/奇数行で背景色を変える
            if (rowIndex % 2 === 1) {
                row.style.backgroundColor = 'rgba(248, 249, 250, 0.5)';
            }
            
            // 軸値セル
            const axisValueCell = document.createElement('td');
            axisValueCell.className = 'team-chart-team-cell';
            axisValueCell.style.textAlign = 'center';
            axisValueCell.style.width = '60px';
            axisValueCell.style.minWidth = '60px';
            axisValueCell.style.position = 'sticky';
            axisValueCell.style.left = '0';
            axisValueCell.style.zIndex = '5';
            
            // グレード軸の場合はセルにスタイルを適用
            if (isGradeAxis) {
                const gradeNum = parseInt(String(axisValue).replace('G', ''));
                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    axisValueCell.style.backgroundColor = `var(--grade-${gradeNum})`;
                    
                    // テキスト色のコントラスト調整
                    const bgHex = this.appUI.getComputedBgHex(axisValueCell);
                    this.appUI.applyContrastColor(axisValueCell, bgHex);
                } else {
                    axisValueCell.style.backgroundColor = 'var(--main-primary-light)';
                    axisValueCell.style.color = 'var(--text-color)';
                }
            } else {
                axisValueCell.style.backgroundColor = 'var(--main-primary-light)';
                axisValueCell.style.color = 'var(--text-color)';
            }
            
            axisValueCell.style.fontWeight = '600';
            axisValueCell.style.borderBottom = '1px solid var(--border-color)';
            axisValueCell.style.borderRight = '1px solid var(--border-color)';
            axisValueCell.textContent = `${axisValue}${axisUnit}`;
            row.appendChild(axisValueCell);
            
            // 班ごとのセル
            sortedTeams.forEach(team => {
                const cell = document.createElement('td');
                cell.className = 'team-chart-cell';
                cell.style.minWidth = '150px';
                cell.style.padding = 'var(--spacing-xs)';
                cell.style.verticalAlign = 'top';
                cell.style.borderBottom = '1px solid var(--border-color)';
                cell.style.borderRight = '1px solid var(--border-color)';
                
                // このセルに表示する社員
                const employeesInCell = teamData[team.id]?.axisMap[axisValue] || [];
                
                // ソートして社員カードを作成
                employeesInCell
                    .sort((a, b) => a.id - b.id)
                    .forEach(emp => this.createEmployeeCard(cell, emp, displayOptions));
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // 最後の行の下線を消す
        const lastRow = tbody.lastElementChild;
        if (lastRow) {
            const cells = lastRow.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.borderBottom = 'none';
            });
        }
    }

    // マトリクス分布チャート（グレード×年齢/勤続）の表示
    renderMatrixDistributionChart(filteredEmployees, yearFilter = null) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>`);
            return;
        }

        // 表示オプションを取得
        const displayOptions = this.appController.getDisplayOptions();
        const sortOrder = displayOptions.sortOrder;
        const currentYear = new Date().getFullYear();
        const matrixAxisMode = displayOptions.matrixAxisMode || 'age';
        
        const yearFilterActive = yearFilter && yearFilter.size > 0;
        let yearFilterText = '';
        if (yearFilterActive) {
            const yearArray = Array.from(yearFilter).sort((a, b) => b - a);
            yearFilterText = yearArray.length === 1 
                ? `(${yearArray[0]}年)` 
                : `(${Math.min(...yearArray)}年～${Math.max(...yearArray)}年)`;
        }
        
        if (matrixAxisMode === 'grade-promotion') {
            this.renderGradePromotionMatrix(filteredEmployees, yearFilter);
            return;
        }
        
        let gradeOptions = this.appController.appData.getGradeOptions();
        if (sortOrder === 'desc') {
            gradeOptions = [...gradeOptions].reverse();
        }
        
        let matrixData = {}; // { grade: { axisValue: { count: N, employeeIds: [...] } } }
        gradeOptions.forEach(grade => {
            matrixData[grade] = {};
        });
        
        let minAxis = 0, maxAxis = 0;
        if (matrixAxisMode === 'age') {
            minAxis = displayOptions.ageRange.min;
            maxAxis = displayOptions.ageRange.max;
        } else if (matrixAxisMode === 'tenure') {
            minAxis = 0;
            const tenures = filteredEmployees.map(emp => {
                const joinYear = new Date(emp.joinDate).getFullYear();
                return !isNaN(joinYear) ? currentYear - joinYear : 0;
            }).filter(Boolean);
            maxAxis = tenures.length > 0 ? Math.max(...tenures) : 20;
            maxAxis = Math.min(maxAxis, 50);
        }
        
        const axisValues = [];
        for (let i = minAxis; i <= maxAxis; i++) {
            axisValues.push(i);
            gradeOptions.forEach(grade => {
                matrixData[grade][i] = { count: 0, employeeIds: [] }; // Initialize with employeeIds array
            });
        }
        
        let invalidCount = 0;
        filteredEmployees.forEach(employee => {
            let latestGrade;
            let axisValue;
            
            if (yearFilterActive) {
                let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
                employeeEvals = employeeEvals.filter(e => yearFilter.has(e.year));
                if (employeeEvals.length === 0) { invalidCount++; return; }
                
                const sortedEvals = [...employeeEvals].sort((a, b) => b.year - a.year);
                const latestEval = sortedEvals[0];
                latestGrade = latestEval.grade;
                axisValue = matrixAxisMode === 'age' ? latestEval.age : latestEval.tenure;
            } else {
                latestGrade = this.appController.appData.getLatestEmployeeGrade(employee.id);
                if (matrixAxisMode === 'age') {
                    const birthYear = new Date(employee.birthdate).getFullYear();
                    if (isNaN(birthYear)) { invalidCount++; return; }
                    axisValue = currentYear - birthYear;
                } else if (matrixAxisMode === 'tenure') {
                    const joinYear = new Date(employee.joinDate).getFullYear();
                    if (isNaN(joinYear)) { invalidCount++; return; }
                    axisValue = currentYear - joinYear;
                }
            }
            
            if (!latestGrade || !gradeOptions.includes(latestGrade)) { invalidCount++; return; }
            
            if (axisValue >= minAxis && axisValue <= maxAxis && matrixData[latestGrade][axisValue]) {
                matrixData[latestGrade][axisValue].count++;
                matrixData[latestGrade][axisValue].employeeIds.push(employee.id);
            } else {
                invalidCount++;
            }
        });
        
        let maxCount = 0;
        gradeOptions.forEach(grade => {
            Object.values(matrixData[grade]).forEach(data => {
                maxCount = Math.max(maxCount, data.count);
            });
        });
        
        const axisLabel = matrixAxisMode === 'age' ? '年齢' : '勤続年数';
        let html = `
            <div class="matrix-distribution-container">
                <div class="matrix-controls">
                    <div class="matrix-control-group">
                        <label>表示軸:</label>
                        <div class="btn-group">
                            <button class="btn btn-sm ${matrixAxisMode === 'age' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="age">年齢</button>
                            <button class="btn btn-sm ${matrixAxisMode === 'tenure' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="tenure">勤続年数</button>
                            <button class="btn btn-sm ${matrixAxisMode === 'grade-promotion' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="grade-promotion">グレード昇格分析</button>
                        </div>
                    </div>
                    <div class="matrix-info">
                        <span>フィルター適用後の社員 ${filteredEmployees.length} 名 ${invalidCount > 0 ? `(${invalidCount}名 表示対象外)` : ''} ${yearFilterText}</span>
                    </div>
                </div>
                <div class="matrix-heatmap-container">
                    <table class="matrix-heatmap">
                        <thead>
                            <tr>
                                <th>${matrixAxisMode === 'age' || matrixAxisMode === 'tenure' ? 'グレード' : matrixAxisMode}</th>`;
        axisValues.forEach(value => { html += `<th>${value}</th>`; });
        html += `<th>合計</th></tr></thead><tbody>`;
        
        gradeOptions.forEach(grade => {
            const gradeNum = parseInt(grade.replace('G', ''));
            const gradeStyleVar = `--grade-${gradeNum}`;
            html += `<tr><td class="matrix-grade-label" style="background-color: var(${gradeStyleVar}); color: var(--text-on-primary);">${grade}</td>`;
            let gradeTotal = 0;
            axisValues.forEach(value => {
                const cellData = matrixData[grade][value] || { count: 0, employeeIds: [] };
                const count = cellData.count;
                gradeTotal += count;
                let intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                html += `
                    <td class="matrix-cell" data-grade="${grade}" data-axis-value="${value}" data-count="${count}" data-intensity="${intensity.toFixed(0)}">
                        <div class="matrix-cell-content" style="background-color: rgba(var(--semantic-info-rgb), ${intensity / 100});">
                            ${count > 0 ? count : ''}
                        </div>
                    </td>`;
            });
            html += `<td class="matrix-total">${gradeTotal}</td></tr>`;
        });
        
        html += `<tr class="matrix-column-totals"><td>合計</td>`;
        let grandTotal = 0;
        axisValues.forEach(value => {
            let columnTotal = 0;
            gradeOptions.forEach(grade => {
                columnTotal += (matrixData[grade][value]?.count || 0);
            });
            grandTotal += columnTotal;
            html += `<td class="matrix-total">${columnTotal}</td>`;
        });
        html += `<td class="matrix-grand-total">${grandTotal}</td></tr>`;
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
        
        document.querySelectorAll('.matrix-controls button[data-matrix-axis]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newAxisMode = btn.getAttribute('data-matrix-axis');
                if (newAxisMode !== displayOptions.matrixAxisMode) {
                    displayOptions.matrixAxisMode = newAxisMode;
                    this.renderMatrixDistributionChart(filteredEmployees, yearFilter);
                }
            });
        });

        // Add event listeners to matrix cells for tooltip
        document.querySelectorAll('.matrix-heatmap .matrix-cell').forEach(cell => {
            const grade = cell.dataset.grade;
            const axisValue = cell.dataset.axisValue;
            if (grade && axisValue && matrixData[grade]?.[axisValue]?.employeeIds.length > 0) {
                const employeeIds = matrixData[grade][axisValue].employeeIds;
                cell.addEventListener('mouseenter', (e) => this.handleMatrixCellMouseEnter(e, employeeIds, grade, axisValue, matrixAxisMode));
                cell.addEventListener('mouseleave', () => this.hideMatrixTooltip());
            }
        });
    }

    renderGradePromotionMatrix(filteredEmployees, yearFilter) {
        const container = document.getElementById('chartContainer');
        if (!container) return;
        
        const displayOptions = this.appController.getDisplayOptions();
        const sortOrder = displayOptions.sortOrder;
        
        const yearFilterActive = yearFilter && yearFilter.size > 0;
        let yearFilterText = '';
        if (yearFilterActive) {
            const yearArray = Array.from(yearFilter).sort((a, b) => b - a);
            yearFilterText = yearArray.length === 1 
                ? `(${yearArray[0]}年)` 
                : `(${Math.min(...yearArray)}年～${Math.max(...yearArray)}年)`;
        }
        
        let gradeOptions = this.appController.appData.getGradeOptions();
        if (sortOrder === 'desc') {
            gradeOptions = [...gradeOptions].reverse();
        }
        
        const { promotionData, gradePromotionSummary } = this.calculateGradePromotionData(filteredEmployees, yearFilter);
        
        const maxPromotionYears = Math.max(
            ...Object.values(promotionData).map(gradeData => 
                Math.max(0, ...Object.keys(gradeData).map(years => parseInt(years)))),
            10 // Ensure at least 10 years are shown
        );
        
        const yearsRange = Array.from({ length: maxPromotionYears }, (_, i) => i + 1);
        
        const matrixData = {}; // { grade: { years: { count: N, employeeIds: [...] } } }
        gradeOptions.forEach(grade => {
            matrixData[grade] = {};
            yearsRange.forEach(years => {
                matrixData[grade][years] = promotionData[grade]?.[years] || { count: 0, employeeIds: [] };
            });
        });
        
        let maxCount = 0;
        gradeOptions.forEach(grade => {
            Object.values(matrixData[grade]).forEach(data => {
                maxCount = Math.max(maxCount, data.count);
            });
        });
        
        let html = `
            <div class="matrix-distribution-container">
                <div class="matrix-controls">
                    <div class="matrix-control-group">
                        <label>表示軸:</label>
                        <div class="btn-group">
                            <button class="btn btn-sm ${displayOptions.matrixAxisMode === 'age' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="age">年齢</button>
                            <button class="btn btn-sm ${displayOptions.matrixAxisMode === 'tenure' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="tenure">勤続年数</button>
                            <button class="btn btn-sm ${displayOptions.matrixAxisMode === 'grade-promotion' ? 'btn-primary' : 'btn-secondary'}" data-matrix-axis="grade-promotion">グレード昇格分析</button>
                        </div>
                    </div>
                    <div class="matrix-info">
                        <span>グレード昇格分析 - フィルター適用社員 ${filteredEmployees.length} 名 ${yearFilterText}</span>
                    </div>
                </div>
                <div class="matrix-heatmap-container">
                    <table class="matrix-heatmap">
                        <thead>
                            <tr>
                                <th>グレード\\昇格年数</th>`;
        yearsRange.forEach(years => { html += `<th>${years}年</th>`; });
        html += `<th>合計</th><th style="width: 120px; min-width: 120px; text-align: center;">平均昇格年数</th></tr></thead><tbody>`; // 平均昇格年数列ヘッダー追加
        
        gradeOptions.forEach(grade => {
            // G1 は昇格元がないのでスキップ
            if (grade === 'G1' && displayOptions.matrixAxisMode === 'grade-promotion') return;

            const gradeNum = parseInt(grade.replace('G', ''));
            const gradeStyleVar = `--grade-${gradeNum}`;
            html += `<tr><td class="matrix-grade-label" style="background-color: var(${gradeStyleVar}); color: var(--text-on-primary);">${grade}</td>`;
            let gradeTotal = 0;
            yearsRange.forEach(years => {
                const cellData = matrixData[grade][years] || { count: 0, employeeIds: [] };
                const count = cellData.count;
                gradeTotal += count;
                let intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                html += `
                    <td class="matrix-cell" data-grade="${grade}" data-years="${years}" data-count="${count}" data-intensity="${intensity.toFixed(0)}">
                        <div class="matrix-cell-content" style="background-color: rgba(var(--semantic-info-rgb), ${intensity / 100});">
                            ${count > 0 ? count : ''}
                        </div>
                    </td>`;
            });
            html += `<td class="matrix-total">${gradeTotal}</td>`;
            
            // 平均昇格年数を表示
            const summary = gradePromotionSummary[grade];
            let avgYearsText = '-';
            if (summary && summary.totalPromotions > 0) {
                avgYearsText = (summary.totalYears / summary.totalPromotions).toFixed(2) + '年';
            }
            html += `<td class="matrix-total" style="text-align: right;">${avgYearsText}</td></tr>`;
        });
        
        html += `<tr class="matrix-column-totals"><td>合計</td>`;
        let grandTotal = 0;
        yearsRange.forEach(years => {
            let columnTotal = 0;
            gradeOptions.forEach(grade => {
                 // G1 は昇格元がないのでスキップ
                if (grade === 'G1' && displayOptions.matrixAxisMode === 'grade-promotion') return;
                columnTotal += (matrixData[grade][years]?.count || 0);
            });
            grandTotal += columnTotal;
            html += `<td class="matrix-total">${columnTotal}</td>`;
        });
        html += `<td class="matrix-grand-total">${grandTotal}</td><td>-</td></tr>`; // 平均昇格年数列の合計は「-」
        html += `</tbody></table></div>
        <div class="matrix-info-panel" style="margin-top: 15px; padding: 10px; background-color: var(--base-light-gray); border-radius: var(--border-radius-md);">
            <h3 style="margin-top: 0;">グレード昇格分析について</h3>
            <p>このマトリクスは、各グレードへの昇格にかかった年数の分布を表示しています。</p>
            <ul style="list-style-position: inside; padding-left: 1.2em;">
                <li>縦軸：昇格先のグレード</li>
                <li>横軸：昇格にかかった年数</li>
                <li>セルの数値：該当するケース数</li>
            </ul>
            <p><strong>例：</strong> G3の行の「2年」列に「5」と表示されている場合、前のグレードからG3に昇格するのに2年かかったケースが5件あることを示します。</p>
        </div></div>`;
        container.innerHTML = html;
        
        document.querySelectorAll('.matrix-controls button[data-matrix-axis]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newAxisMode = btn.getAttribute('data-matrix-axis');
                if (newAxisMode !== displayOptions.matrixAxisMode) {
                    displayOptions.matrixAxisMode = newAxisMode;
                    this.renderMatrixDistributionChart(filteredEmployees, yearFilter);
                }
            });
        });

        // Add event listeners to matrix cells for tooltip
        document.querySelectorAll('.matrix-heatmap .matrix-cell').forEach(cell => {
            const grade = cell.dataset.grade;
            const years = cell.dataset.years;
             if (grade && years && matrixData[grade]?.[years]?.employeeIds.length > 0) {
                const employeeIds = matrixData[grade][years].employeeIds;
                cell.addEventListener('mouseenter', (e) => this.handleMatrixCellMouseEnter(e, employeeIds, grade, years, 'grade-promotion'));
                cell.addEventListener('mouseleave', () => this.hideMatrixTooltip());
            }
        });
    }

    initializeSections() {
    try {
        // 初期化が完了したかどうかのフラグ設定
        if (this._initializationComplete) {
        // 既に初期化完了している場合は、現在のセクションの表示のみ更新
        this.hideLoadingState();
        this.switchSection(this.currentSection || 'import-export');
        return;
        }
        
        // 直接参照を使用して処理を簡素化
        const formUI = this.appController.appUIForms;
        
        // 一連の操作をプロミスチェーンで処理
        Promise.resolve()
        .then(() => {
            // 部署・役職・所属班・グレード
            formUI.updateDepartmentTable();
            formUI.updatePositionTable();
            formUI.updateTeamTable();
            formUI.updateGradeTable();
            return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
            // 評価・資格
            formUI.updateAEvalTable();
            formUI.updateBEvalTable();
            formUI.updateCEvalTable();
            this.refreshGradeColors();
            return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
            // 社員関連
            formUI.updateEmployeeManagementTable(this.appData.getEmployees());
            this.refreshEmployeeSelector();
            return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
            // 資格・認定
            this.refreshQualificationList();
            this.refreshCertificationList();
            this.initializeImportExport();
            
            // アコーディオンの初期状態設定
            this.setupInitialAccordionState();
            
            // 明示的にインポート/エクスポートセクションをアクティブに
            this.currentSection = 'import-export';
            this.switchSection('import-export');
            
            // 初期化完了フラグを設定
            this._initializationComplete = true;
            
            // ローディング終了
            this.hideLoadingState();
        })
        .catch(error => {
            console.error('設定初期化エラー:', error);
            this.hideLoadingState();
            // エラーが発生しても最低限のUIは表示
            this.switchSection('import-export');
        });
    } catch (error) {
        console.error('深刻な初期化エラー:', error);
        this.hideLoadingState();
    }
    }

    calculateGradePromotionData(filteredEmployees, yearFilter) {
        const promotionData = {}; // { "G2": { 1: { count: C, employeeIds: [...] }, ... }, "G3": { ... } }
        const gradePromotionSummary = {}; // { "G2": { totalPromotions: N, totalYears: Y }, ... }

        filteredEmployees.forEach(employee => {
            let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
            employeeEvals.sort((a, b) => a.year - b.year);
            if (employeeEvals.length < 1) return;

            const firstYearForGrade = {};
            for (const evaluation of employeeEvals) {
                if (firstYearForGrade[evaluation.grade] === undefined) {
                    firstYearForGrade[evaluation.grade] = evaluation.year;
                }
            }

            const gradeOptions = this.appController.appData.getGradeOptions().sort((a, b) => 
                parseInt(a.replace('G', '')) - parseInt(b.replace('G', ''))
            );

            for (let i = 0; i < gradeOptions.length - 1; i++) {
                const prevGradeStr = gradeOptions[i];
                const currentGradeStr = gradeOptions[i+1];

                if (firstYearForGrade[prevGradeStr] !== undefined && firstYearForGrade[currentGradeStr] !== undefined) {
                    if (firstYearForGrade[currentGradeStr] > firstYearForGrade[prevGradeStr]) {
                        let countThisPromotion = true;
                        if (yearFilter && yearFilter.size > 0) {
                            if (!yearFilter.has(firstYearForGrade[currentGradeStr])) {
                                countThisPromotion = false;
                            }
                        }
                        if (countThisPromotion) {
                            const yearsTaken = firstYearForGrade[currentGradeStr] - firstYearForGrade[prevGradeStr];
                            const promotedToGrade = currentGradeStr;
                            if (yearsTaken > 0) {
                                if (!promotionData[promotedToGrade]) {
                                    promotionData[promotedToGrade] = {};
                                    gradePromotionSummary[promotedToGrade] = { totalPromotions: 0, totalYears: 0 }; // Initialize summary
                                }
                                if (!promotionData[promotedToGrade][yearsTaken]) {
                                    promotionData[promotedToGrade][yearsTaken] = { count: 0, employeeIds: [] };
                                }
                                promotionData[promotedToGrade][yearsTaken].count++;
                                promotionData[promotedToGrade][yearsTaken].employeeIds.push(employee.id);

                                // Update summary
                                gradePromotionSummary[promotedToGrade].totalPromotions++;
                                gradePromotionSummary[promotedToGrade].totalYears += yearsTaken;
                            }
                        }
                    }
                }
            }
        });
        return { promotionData, gradePromotionSummary };
    }

    renderGradeDistributionChart(filteredEmployees, yearFilter = null) {
        const container = document.getElementById('chartContainer'); if (!container) return;
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>`); return;
        }
        
        const gradeDistribution = {}; 
        const gradeOptions = this.appController.appData.getGradeOptions();
        gradeOptions.forEach(grade => gradeDistribution[grade] = 0);
        
        let unGradedCount = 0; // Count employees without a grade
        
        // 年度フィルターが適用されている場合
        const yearFilterActive = yearFilter && yearFilter.size > 0;
        let yearFilterText = '';
        
        filteredEmployees.forEach(emp => {
            // 社員の評価データを取得
            let employeeEvals = this.appController.appData.getEmployeeEvaluations(emp.id);
            
            // 年度フィルターが適用されている場合
            if (yearFilterActive) {
                employeeEvals = employeeEvals.filter(e => yearFilter.has(e.year));
                
                // 選択されている年度がない場合はカウントしない
                if (employeeEvals.length === 0) {
                    unGradedCount++;
                    return;
                }
                
                // 年度フィルター適用時は評価データの中で最新のグレードを使用
                const sortedEvals = [...employeeEvals].sort((a, b) => b.year - a.year);
                const latestGrade = sortedEvals[0].grade;
                
                if (latestGrade && gradeDistribution[latestGrade] !== undefined) {
                    gradeDistribution[latestGrade]++;
                } else {
                    unGradedCount++;
                }
                
                // 年度フィルターのテキスト生成
                const yearArray = Array.from(yearFilter).sort((a, b) => b - a);
                yearFilterText = yearArray.length === 1 
                    ? `(${yearArray[0]}年)` 
                    : `(${Math.min(...yearArray)}年～${Math.max(...yearArray)}年)`;
                
            } else {
                // 通常の最新グレード取得
                const latestGrade = this.appController.appData.getLatestEmployeeGrade(emp.id);
                if (latestGrade && gradeDistribution[latestGrade] !== undefined) {
                    gradeDistribution[latestGrade]++;
                } else {
                    unGradedCount++;
                }
            }
        });
        
        const totalEmployeesWithGrade = filteredEmployees.length - unGradedCount;
        let tableHTML = `<div class="distribution-container"><h2>最新グレード分布 ${yearFilterText}</h2><p class="distribution-info">フィルター適用後の社員 ${filteredEmployees.length} 名 (${unGradedCount > 0 ? `${unGradedCount}名 評価無` : '全員評価有'})</p><table class="table distribution-table"><thead><tr><th>グレード</th><th>人数</th><th>割合 (%)</th></tr></thead><tbody>`;

        gradeOptions.forEach(grade => {
            const count = gradeDistribution[grade];
            // Calculate percentage based on employees *with* a grade
            const percentage = totalEmployeesWithGrade > 0 ? ((count / totalEmployeesWithGrade) * 100).toFixed(1) : '0.0';
            tableHTML += `<tr><td>${grade}</td><td class="text-right">${count}</td><td class="text-right">${percentage}</td></tr>`;
        });
        tableHTML += `</tbody><tfoot><tr><th style="text-align:left;">合計 (評価有)</th><th class="text-right">${totalEmployeesWithGrade}</th><th class="text-right">${totalEmployeesWithGrade > 0 ? '100.0' : '0.0'}</th></tr></tfoot></table></div>`;
        container.innerHTML = tableHTML;
    }

    renderAgeDistributionChart(filteredEmployees, yearFilter = null) {
        const container = document.getElementById('chartContainer'); if (!container) return;
        if (!filteredEmployees || filteredEmployees.length === 0) {
            this.renderEmptyChart(container, `<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>`); return;
        }
        
        const ageDistribution = { '10s': 0, '20s': 0, '30s': 0, '40s': 0, '50s': 0, '60s': 0 }; 
        const currentYear = new Date().getFullYear();
        
        let invalidAgeCount = 0;
        // 年度フィルターが適用されている場合
        const yearFilterActive = yearFilter && yearFilter.size > 0;
        let yearFilterText = '';
        
        filteredEmployees.forEach(employee => {
            // 年度フィルターが適用されている場合
            if (yearFilterActive) {
                // 社員の評価データを取得
                let employeeEvals = this.appController.appData.getEmployeeEvaluations(employee.id);
                
                // 選択された年度の評価のみ使用
                employeeEvals = employeeEvals.filter(e => yearFilter.has(e.year));
                
                // 選択されている年度に評価がない場合はカウントしない
                if (employeeEvals.length === 0) {
                    invalidAgeCount++;
                    return;
                }
                
                // 最新の評価から年齢を取得
                const sortedEvals = [...employeeEvals].sort((a, b) => b.year - a.year);
                const latestEval = sortedEvals[0];
                const age = latestEval.age;
                
                if (age < 20) ageDistribution['10s']++;
                else if (age < 30) ageDistribution['20s']++;
                else if (age < 40) ageDistribution['30s']++;
                else if (age < 50) ageDistribution['40s']++;
                else if (age < 60) ageDistribution['50s']++;
                else ageDistribution['60s']++; // 60 and above
                
                // 年度フィルターのテキスト生成
                const yearArray = Array.from(yearFilter).sort((a, b) => b - a);
                yearFilterText = yearArray.length === 1 
                    ? `(${yearArray[0]}年)` 
                    : `(${Math.min(...yearArray)}年～${Math.max(...yearArray)}年)`;
                
            } else {
                // 通常の年齢計算
                const birthYear = new Date(employee.birthdate).getFullYear();
                if (isNaN(birthYear)) {
                    invalidAgeCount++;
                    return; // Skip if invalid date
                }
                const age = currentYear - birthYear;
                if (age < 20) ageDistribution['10s']++;
                else if (age < 30) ageDistribution['20s']++;
                else if (age < 40) ageDistribution['30s']++;
                else if (age < 50) ageDistribution['40s']++;
                else if (age < 60) ageDistribution['50s']++;
                else ageDistribution['60s']++; // 60 and above
            }
        });
        
        const ageGroups = ['10s', '20s', '30s', '40s', '50s', '60s'];
        const ageLabels = {'10s': '10代', '20s': '20代', '30s': '30代', '40s': '40代', '50s': '50代', '60s': '60代+'};
        let tableHTML = `<div class="distribution-container"><h2>年齢分布 ${yearFilterText}</h2><p class="distribution-info">フィルター適用後の社員 ${filteredEmployees.length} 名 (${invalidAgeCount > 0 ? `${invalidAgeCount}名 年齢不明` : '全員年齢有効'})</p><table class="table distribution-table"><thead><tr><th>年齢層</th><th>人数</th><th>割合 (%)</th></tr></thead><tbody>`;
        const totalEmployeesWithAge = filteredEmployees.length - invalidAgeCount;
        ageGroups.forEach(group => {
            const count = ageDistribution[group];
            const percentage = totalEmployeesWithAge > 0 ? ((count / totalEmployeesWithAge) * 100).toFixed(1) : '0.0';
            tableHTML += `<tr><td>${ageLabels[group]}</td><td class="text-right">${count}</td><td class="text-right">${percentage}</td></tr>`;
        });
        tableHTML += `</tbody><tfoot><tr><th style="text-align:left;">合計 (年齢有効)</th><th class="text-right">${totalEmployeesWithAge}</th><th class="text-right">${totalEmployeesWithAge > 0 ? '100.0' : '0.0'}</th></tr></tfoot></table></div>`;
        container.innerHTML = tableHTML;
    }

    // --- Matrix Tooltip Methods ---
    handleMatrixCellMouseEnter(event, employeeIds, grade, axisValue, matrixAxisMode) {
        const employeeNames = employeeIds.map(id => {
            const emp = this.appController.appData.getEmployee(id);
            return emp ? emp.name : '不明な社員';
        }).sort();

        let title = '';
        if (matrixAxisMode === 'grade-promotion') {
            title = `${grade} / ${axisValue}年`;
        } else if (matrixAxisMode === 'age') {
            title = `${grade} / ${axisValue}歳`;
        } else { // tenure
            title = `${grade} / ${axisValue}年`;
        }
        
        this.showMatrixTooltip(event, title, employeeNames);
    }

    showMatrixTooltip(event, title, employeeNames) {
        const tooltip = document.getElementById('matrixTooltip');
        if (!tooltip) return;

        clearTimeout(this.matrixTooltipTimeout);
        this.matrixTooltipTimeout = setTimeout(() => {
            let content = `<div class="matrix-tooltip-title">${title} (${employeeNames.length}名)</div>`;
            if (employeeNames.length > 0) {
                content += '<ul class="matrix-tooltip-list">';
                employeeNames.forEach(name => {
                    content += `<li>${name}</li>`;
                });
                content += '</ul>';
            } else {
                content += '<p>対象者なし</p>';
            }
            tooltip.innerHTML = content;
            this.positionTooltip(event.currentTarget, tooltip, event); // Use positionTooltip for consistency
            tooltip.classList.add('visible');
        }, 200); // Shorter delay for matrix tooltips
    }

    hideMatrixTooltip() {
        clearTimeout(this.matrixTooltipTimeout);
        const tooltip = document.getElementById('matrixTooltip');
        if (tooltip) tooltip.classList.remove('visible');
            }

    // 新卒/中途バッジを作成するヘルパー関数
    createRecruitTypeBadge(employee, details = {}) {
        if (!employee || !employee.birthdate || !employee.joinDate) return null;
        
        try {
            // 入社時の年齢を計算
            const birthDate = new Date(employee.birthdate);
            const joinDate = new Date(employee.joinDate);
            
            if (isNaN(birthDate.getTime()) || isNaN(joinDate.getTime())) return null;
            
            let joinAge = joinDate.getFullYear() - birthDate.getFullYear();
            
            // 誕生日がまだ来ていない場合は1引く
            const birthMonth = birthDate.getMonth();
            const birthDay = birthDate.getDate();
            const joinMonth = joinDate.getMonth();
            const joinDay = joinDate.getDate();
            
            if (joinMonth < birthMonth || (joinMonth === birthMonth && joinDay < birthDay)) {
                joinAge--;
            }
            
            // バッジ生成
            const badge = document.createElement('div');
            badge.className = 'evaluation-card recruit-type-badge';
            
            // 19歳以下で入社の場合は新卒、それ以外は中途
            if (joinAge === 18 || joinAge === 19) {
                badge.classList.add('new-graduate');
                badge.textContent = '新卒';
                badge.title = `新卒入社 (${joinAge}歳入社)`;
            } else {
                badge.classList.add('mid-career');
                badge.textContent = '中途';
                badge.title = `中途入社 (${joinAge}歳入社)`;
            }
            
            return badge;
        } catch (error) {
            console.warn("Error calculating recruit type badge:", error);
            return null;
        }
    }

    /**
     * 契約形態バッジを作成するヘルパー関数
     * @param {Object} employee 社員オブジェクト
     * @param {Object} details バッジ作成の詳細情報
     * @returns {HTMLElement|null} 作成したバッジ要素またはnull
     */
    createContractTypeBadge(employee, details = {}) {
        if (!employee || !employee.contractType) return null;
        
        const contractTypes = this.appController.appData.getContractTypes();
        const contractType = contractTypes.find(ct => ct.id === employee.contractType);
        
        if (!contractType) return null;
        
        const badge = document.createElement('div');
        badge.className = 'evaluation-card contract-type-badge';
        badge.textContent = contractType.name;
        badge.title = `契約形態: ${contractType.name}`;
        
        // 契約形態に応じたCSSクラスの追加
        badge.classList.add(employee.contractType);
        
        return badge;
    }

    /**
     * 昇給分析チャートの描画（マトリクス横並び表形式）
     */
    renderSalaryComparisonChart(selectedEmployeeIds, axisType, yearFilter = null) {
        // 昇給比較では軸を年齢か勤続年数に強制する
        if (axisType !== 'age' && axisType !== 'tenure') {
            axisType = 'age'; // フォールバック
        }

        const container = document.getElementById('chartContainer');
        if (!container) return;
        
        if (!selectedEmployeeIds || selectedEmployeeIds.length === 0) {
            this.renderEmptyChart(container); 
            return;
        }
        
        container.innerHTML = '';
        
        const selectedEmployees = selectedEmployeeIds
            .map(id => {
                const employee = this.appController.appData.getEmployee(id);
                let employeeEvals = this.appController.appData.getEmployeeEvaluations(id);
                if (yearFilter && yearFilter.size > 0) {
                    employeeEvals = employeeEvals.filter(evaluation => yearFilter.has(evaluation.year));
                }
                return employee ? { ...employee, evaluations: employeeEvals } : null;
            })
            .filter(Boolean);

        if (selectedEmployees.length === 0) {
            this.renderEmptyChart(container); 
            return;
        }

        // スクロール可能なラッパーコンテナの作成
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'salary-comparison-container';

        const displayOptions = this.appController.getDisplayOptions();
        const currentYear = new Date().getFullYear();
        const showFullName = displayOptions.showFullName;
        
        let minAxis, maxAxis;
        if (axisType === 'age') {
            minAxis = displayOptions.ageRange.min;
            maxAxis = displayOptions.ageRange.max;
        } else {
            // tenure
            let selectedTenures = [];
            selectedEmployees.forEach(emp => {
                selectedTenures = selectedTenures.concat(emp.evaluations.map(e => e.tenure));
            });
            minAxis = 0;
            maxAxis = selectedTenures.length > 0 ? Math.max(...selectedTenures) : 20;
            if (maxAxis <= minAxis) maxAxis = minAxis + 5;
        }

        const axisValues = [];
        for (let i = minAxis; i <= maxAxis; i++) axisValues.push(i);
        if (displayOptions.sortOrder === 'desc') axisValues.reverse();

        // テーブル要素の作成
        const tableElement = document.createElement('table');
        tableElement.className = 'salary-comparison-table';
        
        // Thead (2行構成: 名前, 現在年齢/勤続 + バッジ)
        const thead = document.createElement('thead');
        const nameRow = document.createElement('tr');
        const ageRow = document.createElement('tr');
        
        // 左上コーナー1: 「名前」
        const cornerNameTh = document.createElement('th');
        cornerNameTh.textContent = '名前';
        cornerNameTh.className = 'salary-th-corner';
        nameRow.appendChild(cornerNameTh);

        // 左上コーナー2: 「現在の状態」
        const cornerAgeTh = document.createElement('th');
        cornerAgeTh.textContent = '現在の状態';
        cornerAgeTh.className = 'salary-th-corner';
        ageRow.appendChild(cornerAgeTh);

        // 名前の横幅設定
        let nameWidth = showFullName ? '100px' : '65px';

        selectedEmployees.forEach(employee => {
            // 名前の表示制御 (フルネーム or 名字のみ)
            let displayName = employee.name;
            if (!showFullName) {
                if (employee.lastName) {
                    displayName = employee.lastName;
                } else if (employee.name.includes(' ')) {
                    displayName = employee.name.split(' ')[0];
                } else if (employee.name.includes('　')) {
                    displayName = employee.name.split('　')[0];
                }
            }

            // 現在の年齢/勤続年数を計算
            let currentAxisVal = '-';
            let currentAgeVal = null;
            let currentTenureVal = null;

            if (employee.birthdate) {
                const birthYear = new Date(employee.birthdate).getFullYear();
                if (!isNaN(birthYear)) {
                    currentAgeVal = currentYear - birthYear;
                    if (axisType === 'age') currentAxisVal = currentAgeVal + '歳';
                }
            }
            if (employee.joinDate) {
                const joinYear = new Date(employee.joinDate).getFullYear();
                if (!isNaN(joinYear)) {
                    currentTenureVal = currentYear - joinYear;
                    if (axisType === 'tenure') currentAxisVal = currentTenureVal + '年';
                }
            }

            // 名前ヘッダー
            const nameTh = document.createElement('th');
            nameTh.className = 'salary-th-name';
            nameTh.style.minWidth = nameWidth;
            nameTh.title = employee.name;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = displayName;
            nameTh.appendChild(nameSpan);
            
            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'salary-edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = '社員情報編集';
            editBtn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.appController.appUIForms.showEmployeeModal(employee.id);
            });
            nameTh.appendChild(editBtn);
            nameRow.appendChild(nameTh);

            // 現在年齢/勤続 + バッジエリア ヘッダー
            const ageTh = document.createElement('th');
            ageTh.className = 'salary-th-age';
            
            const ageValSpan = document.createElement('div');
            ageValSpan.innerHTML = `<span>${axisType === 'age' ? '基準年齢:' : '基準勤続:'} ${currentAxisVal}</span>`;
            ageValSpan.style.fontSize = '11px';
            ageValSpan.style.color = 'var(--text-muted)';
            ageValSpan.style.marginBottom = '4px';
            ageTh.appendChild(ageValSpan);

            // バッジコンテナ
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'salary-badge-container';

            const latestEval = employee.evaluations.sort((a,b) => b.year - a.year)[0] || null;
            const cardDetails = {
                evaluation: latestEval,
                employeeId: employee.id,
                year: latestEval?.year || currentYear,
                employeeDeptId: latestEval ? latestEval.departmentId : employee.departmentId,
                employeeTeamId: employee.teamId,
                employeeContractType: employee.contractType
            };

            // バッジの追加制御
            if (displayOptions.showAge && currentAgeVal !== null) {
                const ageBadge = this.createAgeBadge(currentAgeVal, cardDetails);
                if (ageBadge) badgeContainer.appendChild(ageBadge);
            }
            if (displayOptions.showTenure && currentTenureVal !== null) {
                const tenureBadge = this.createTenureBadge(currentTenureVal, cardDetails);
                if (tenureBadge) badgeContainer.appendChild(tenureBadge);
            }
            if (displayOptions.showDepartmentBadge) {
                const deptBadge = this.createEvaluationCard(null, 'department-badge', cardDetails);
                if (deptBadge) badgeContainer.appendChild(deptBadge);
            }
            if (displayOptions.showTeam && employee.teamId) {
                const teamBadge = this.createEvaluationCard(null, 'team-badge', cardDetails);
                if (teamBadge) badgeContainer.appendChild(teamBadge);
            }
            if (displayOptions.showPosition && employee.position) {
                const posBadge = this.createEvaluationCard(employee.position, 'position', cardDetails);
                if (posBadge) badgeContainer.appendChild(posBadge);
            }
            if (displayOptions.showRecruitType) {
                const recruitTypeBadge = this.createRecruitTypeBadge(employee, cardDetails);
                if (recruitTypeBadge) badgeContainer.appendChild(recruitTypeBadge);
            }
            if (displayOptions.showContractType) {
                const contractTypeBadge = this.createContractTypeBadge(employee, cardDetails);
                if (contractTypeBadge) badgeContainer.appendChild(contractTypeBadge);
            }
            if (displayOptions.showFlagIcon && latestEval?.flag) {
                const flagBadge = this.createFlagBadge(latestEval.flag);
                if (flagBadge) badgeContainer.appendChild(flagBadge);
            }

            if (badgeContainer.hasChildNodes()) {
                ageTh.appendChild(badgeContainer);
            }
            ageRow.appendChild(ageTh);
        });

        thead.appendChild(nameRow);
        thead.appendChild(ageRow);
        tableElement.appendChild(thead);

        // Tbody (データ部分)
        const tbody = document.createElement('tbody');
        
        axisValues.forEach(axisValue => {
            const tr = document.createElement('tr');
            
            // 左側の軸セル
            const axisCell = document.createElement('td');
            axisCell.className = 'salary-td-axis';
            axisCell.textContent = axisValue;
            tr.appendChild(axisCell);

            selectedEmployees.forEach(employee => {
                const cell = document.createElement('td');
                cell.className = 'salary-td-cell';
                
                const evaluation = employee.evaluations.find(e =>
                    axisType === 'age' ? e.age === axisValue :
                    axisType === 'tenure' ? e.tenure === axisValue : false);

                if (evaluation) {
                    const prevEval = employee.evaluations.find(e => e.year === evaluation.year - 1);

                    // 評価セルの中身を作成
                    const cellContent = this.createSalaryComparisonCard(evaluation, prevEval, displayOptions);
                    cell.appendChild(cellContent);
                    
                    // 背景色の設定 (グレードに応じた色を直接適用し、コントラストを調整)
                    const gradeNum = parseInt(String(evaluation.grade).replace('G', ''));
                    if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                        // 彩度を落として視認性を高めるため、白を半透明で重ねる
                        cell.style.background = `linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.45)), var(--grade-${gradeNum})`;
                        
                        // 背景を明るくしたため、テキスト色はダークグレーに固定して視認性を確保
                        cell.style.color = '#333';
                        
                        // 内部テキストのカラーを親（セル）に合わせる
                        const content = cell.querySelector('.salary-cell-content');
                        if (content) content.style.color = cell.style.color;
                        
                        const gradeText = cell.querySelector('.salary-text-grade');
                        const evalText = cell.querySelector('.salary-text-eval');
                        if (gradeText) gradeText.style.color = 'inherit';
                        if (evalText) evalText.style.color = 'inherit';
                    }
                    
                    this.setupCellInteractions(cell, evaluation);
                } else {
                    // 評価データがない場合の空セル + 追加ボタン
                    cell.classList.add('salary-td-empty');
                    const addBtn = document.createElement('div');
                    addBtn.className = 'salary-empty-add';
                    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
                    addBtn.title = `評価追加`;
                    cell.appendChild(addBtn);
                    
                    cell.addEventListener('dblclick', () => {
                        let targetYear = null;
                        const birthYear = new Date(employee.birthdate).getFullYear();
                        const joinYear = new Date(employee.joinDate).getFullYear();

                        if (!isNaN(birthYear) && !isNaN(joinYear)) {
                            if (axisType === 'age') targetYear = birthYear + axisValue;
                            else if (axisType === 'tenure') targetYear = joinYear + axisValue;
                        }

                        const latestPossibleYear = new Date().getFullYear() + 1;
                        if (targetYear !== null && targetYear >= joinYear && targetYear <= latestPossibleYear) {
                            this.appController.appUIForms.showEvaluationModal(null, employee.id, targetYear);
                        } else {
                            this.appUI.showNotification('warning', '追加不可', '評価対象外の軸値、または未来の年です');
                        }
                    });
                }
                tr.appendChild(cell);
            });
            tbody.appendChild(tr);
        });

        tableElement.appendChild(tbody);
        scrollContainer.appendChild(tableElement);
        container.appendChild(scrollContainer);
    }

    /**
     * 昇給分析用セルコンテンツの作成（コンパクト版）
     */
    createSalaryComparisonCard(evaluation, prevEval, displayOptions) {
        const wrapper = document.createElement('div');
        wrapper.className = 'salary-cell-content';
        
        let gradeChangeSymbol = '';
        let evalChangeSymbol = '';
        
        if (prevEval) {
            // グレード変化の記号付与
            if (displayOptions.showGradeChange && evaluation.grade && prevEval.grade) {
                const currG = parseInt(String(evaluation.grade).replace('G', ''));
                const prevG = parseInt(String(prevEval.grade).replace('G', ''));
                if (!isNaN(currG) && !isNaN(prevG)) {
                    if (currG > prevG) gradeChangeSymbol = '▲';
                    else if (currG < prevG) gradeChangeSymbol = '▼';
                    else gradeChangeSymbol = '＝';
                }
            }
            
            // 年度評価変化の記号付与
            if (displayOptions.showYearlyEvalChange && evaluation.yearlyEvaluation && prevEval.yearlyEvaluation) {
                const currPrefix = String(evaluation.yearlyEvaluation).charAt(0).toUpperCase();
                const currVal = parseInt(String(evaluation.yearlyEvaluation).substring(1));
                const prevPrefix = String(prevEval.yearlyEvaluation).charAt(0).toUpperCase();
                const prevVal = parseInt(String(prevEval.yearlyEvaluation).substring(1));
                
                if (currPrefix === prevPrefix && !isNaN(currVal) && !isNaN(prevVal)) {
                    if (currVal > prevVal) evalChangeSymbol = '▲';
                    else if (currVal < prevVal) evalChangeSymbol = '▼';
                    else evalChangeSymbol = '＝';
                }
            }
        }
        
        // グレード表示部分
        const gradeSpan = document.createElement('span');
        gradeSpan.className = 'salary-text-grade';
        gradeSpan.textContent = evaluation.grade;
        if (gradeChangeSymbol) {
            const symSpan = document.createElement('span');
            symSpan.textContent = gradeChangeSymbol;
            symSpan.style.fontSize = '9px';
            symSpan.style.marginLeft = '1px';
            symSpan.style.opacity = '0.7';
            gradeSpan.appendChild(symSpan);
        }
        
        // 評価表示部分
        const evalSpan = document.createElement('span');
        evalSpan.className = 'salary-text-eval';
        evalSpan.textContent = evaluation.yearlyEvaluation;
        if (evalChangeSymbol) {
            const symSpan = document.createElement('span');
            symSpan.textContent = evalChangeSymbol;
            symSpan.style.fontSize = '9px';
            symSpan.style.marginLeft = '1px';
            symSpan.style.opacity = '0.7';
            evalSpan.appendChild(symSpan);
        }

        wrapper.appendChild(gradeSpan);
        
        // 区切り線を追加
        const separator = document.createElement('span');
        separator.textContent = ' / ';
        separator.style.opacity = '0.4';
        separator.style.fontSize = '10px';
        separator.style.margin = '0 1px';
        wrapper.appendChild(separator);
        
        wrapper.appendChild(evalSpan);
        
        return wrapper;
    }
}
