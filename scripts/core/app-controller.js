/**
 * アプリケーションメイン処理 - 人事評定視覚化アプリケーション
 * 設定マネージャー統合版
 */
class AppController {
    constructor() {
        this.appData = new AppData();
        this.appUI = new AppUI(this);
        this.appUICharts = new AppUICharts(this.appUI);
        this.appUIForms = new UIForms(this.appUI);
        this.selectedEmployeeIds =[];

        this.appUI.appUICharts = this.appUICharts;
        this.appUI.appUIForms = this.appUIForms;
        this.appUIForms.appController = this;

        this.eventListenersInitialized = false;

        // フィルター状態の初期枠組みのみ定義（中身はデータロード後に設定）
        this.filters = {
            departments: new Set(),
            ageGroups: new Set(['10s', '20s', '30s', '40s', '50s', '60s']),
            tenureGroups: new Set(['0-5', '6-10', '11-15', '16-20', '21-30', '31-']),
            positions: new Set(),
            teams: new Set(),
            grades: new Set(),
            evaluationTypes: new Set(['A', 'B', 'C']),
            years: new Set(),
            recruitTypes: new Set(['new-graduate', 'mid-career']),
            contractTypes: new Set(['full-time', 'probation', 'contract', 'dispatch', 'seconded', 'retired']), 
            searchTerm: ''
        };

        this.allGradeOptionsCount = 0;
        this.allEvalTypeOptionsCount = 3;

        this.displayOptions = {
            chartType: 'grade',
            sortOrder: 'desc',
            currentView: 'department',
            showPhoto: true,
            showGrade: true,
            showYearlyEval: true,
            showPosition: false,
            showDepartmentBadge: false,
            showTeam: false,
            showGradeChange: true,
            showYearlyEvalChange: true,
            showRecruitType: true,
            showFlagIcon: false,
            showAge: false,
            showTenure: false,
            showContractType: true,
            showFullName: false,
            ageRange: { min: 18, max: 65 },
            tenureRange: { min: 0, max: 50 },
            matrixAxisMode: 'age',
            showStarChartCategory: true,
            showStarChartClassification: true,
            starChartType: 'qualification'
        };

        this.certificationManager = new CertificationManager(this);
        this.settingsManager = new SettingsManager(this);
        this.exportManager = new ExportManager(this);
    }

    // 非同期初期化
    async init() {
        // 1. IndexedDBの初期化とデータのロードを完全に待機
        await this.appData.initDBAndLoadData();

        // 2. データの準備ができたあとにフィルタ等のマスターデータを設定
        this.allGradeOptionsCount = this.appData.getGradeOptions().length;
        
        const positionSet = new Set(this.appData.getPositions().map(p => p.name));
        positionSet.add(''); // 役職なしの選択肢を追加
        
        this.filters.positions = positionSet;
        this.filters.teams = new Set(this.appData.getTeams().map(t => t.id));
        this.filters.departments = new Set(this.appData.getDepartments().map(d => d.id));
        this.filters.grades = new Set(this.appData.getGradeOptions());

        const allYears = this.appData.getEvaluations().map(e => e.year);
        this.filters.years = new Set([...new Set(allYears)]);
        
        // 3. UI構築とイベントリスナーの登録（必ずデータがある状態で行う）
        this.initializeUI();
        this.setupEventListeners();
        this.certificationManager.setupEventListeners();

        // 4. 初期の表示状態を構築
        this.updateYearFilter();
        const filteredEmployees = this.getFilteredEmployees();
        this.selectedEmployeeIds = filteredEmployees.map(emp => emp.id);
        
        this.loadCSVData();

        const importExportBtn = document.getElementById('importExportBtn');
        if (importExportBtn) {
            // クローンでイベント重複を防ぐ
            const newBtn = importExportBtn.cloneNode(true);
            importExportBtn.parentNode.replaceChild(newBtn, importExportBtn);
            newBtn.addEventListener('click', () => {
                this.appUI.showModal('settingsModal');
                setTimeout(() => {
                    this.settingsManager.switchSection('import-export');
                }, 100);
            });
        }

        document.querySelectorAll('.tabs-navigation .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === 'department') {
                btn.classList.add('active');
            }
        });
        
        const chartTypeSelect = document.getElementById('chartTypeSelect');
        if (chartTypeSelect) chartTypeSelect.value = this.displayOptions.chartType;
        
        this.appUI.toggleAgeRangeSliderVisibility(false);
        this.appUI.toggleTenureRangeSliderVisibility(false);
        this.toggleEmployeeSelectVisibility(this.displayOptions.currentView === 'chart');
        
        this.refreshData();
    }

    // CSVデータのロード
    loadCSVData() {
        // 既存のデータがあれば、スキップ
        if (this.appData.getQualifications().length > 0 && this.appData.getWorkCertifications().length > 0) {
            console.log("資格と作業認定のデータが既に存在します。CSVインポートをスキップします。");
            return;
        }
        
        // qualifications.csvのデータ
        const qualificationsCSV = `ID,資格名,分類,説明,有効期間(月),発行機関
1,エックス線作業主任者,国家資格,事業者は、医療用以外の用途（例：鋳物等の非破壊検査）において1MeV未満の出力のエックス線を用いる場合、労働者の中からエックス線作業主任者を選任することが義務づけられている。,0,都道府県労働局長
2,玉掛け技能,技能講習,玉掛け技能とは、クレーンや移動式クレーンなどで荷物を吊り上げたり降ろしたりする作業を行うための資格,0,
3,フォークリフト運転技能講習,技能講習,最大荷重1t以上のフォークリフト運転に必要,0,都道府県労働局長
4,クレーン運転士,国家資格,吊り上げ荷重5t以上のクレーン運転に必要,0,都道府県労働局
5,床上操作式クレーン運転技能講習,技能講習,床上から操作する5t未満クレーンの運転に必要,0,労働局長登録教習機関
6,有機溶剤作業主任者,技能講習,有機溶剤を使用する作業の安全管理責任者,0,事業者
7,酸素欠乏危険作業主任者,技能講習,酸欠・硫化水素危険場所での作業主任者,0,事業者
8,職長等特別教育,技能講習,作業現場の安全衛生管理を行う職長・安全衛生責任者向け教育,0,事業者
9,局所排気装置等自主検査者,技能講習,排気装置等の定期自主点検を行う者に必要な知識習得,0,事業者または講習機関
10,危険物取扱者乙種第4類,国家資格,"ガソリン等の引火性液体の取扱い・立会い業務
（更新はなし、ただし長期間従事しない場合、講習が必要）",0,各都道府県知事（消防試験研究センター実施）
11,ガス溶接技能講習,技能講習,アセチレンなどを用いたガス溶接作業に必要,0,労働局長登録教習機関
12,アーク溶接特別教育,技能講習,アーク溶接機を用いた作業に必要な教育,0,事業者または講習機関
13,粉塵作業主任者,技能講習,粉塵が発生する作業における安全衛生責任者,0,事業者が実施（外部講習も可）
14,第一種衛生管理者,国家資格,常時50人以上の労働者がいる事業場の衛生管理者,0,各労働局
15,足場の組立等作業主任者,技能講習,足場組立・解体・変更における安全管理者,0,事業者または講習機関
16,研削砥石取替業務特別教育,技能講習,砥石の取替え・試運転作業の安全作業教育,0,事業者または講習機関
17,はい作業主任者,技能講習,廃材などの取扱い（積込み・取崩し等）作業の安全管理責任者,0,事業者または講習機関`;

        // workCertifications.csvのデータ
        const workCertificationsCSV = `ID,作業名,分類,区分,説明,有効期間(月),必要研修
1,メイン,TLV,,,0,
2,サブ,TLV,,,0,
3,加熱（処理前）設定作業,CAL,特殊工程作業,,0,
4,加熱（昇温）操作,CAL,特殊工程作業,,0,
5,温度プロファイル確認,CAL,特殊工程作業,,0,
6,2チャンネルチャート機操作,CAL,特殊工程作業,,0,
7,メイン,CAL,一般作業,,0,
8,サブ,CAL,一般作業,,0,
9,メイン,LS4,,,0,
10,サブ,LS4,,,0,
11,メイン,LS3,,,0,
12,サブ,LS3,,,0,
13,メイン,DL1,,,0,
14,メイン,DL2,,,0,
15,メイン,FS4,,,0,
16,サブ,FS4,,,0,
17,メイン,CL,,,0,
18,サブ,CL,,,0,
19,メイン,FS3,,,0,
20,サブ,FS3,,,0,
21,温度設定・調整,CF,特殊工程作業,,0,
22,記録作業,CF,特殊工程作業,,0,
23,補助作業（実体線取付、炉組）,CF,特殊工程作業,,0,
24,ガス発生器取り扱い,CF,一般作業,,0,
25,フォークリフト,CF,一般作業,,0,
26,フォークリフト,仕上,コイル,,0,
27,フォークリフト,仕上,板,,0,
28,クレーン,CF,一般作業,,0,
29,ｶｯﾀｰﾅｲﾌ取扱い作業,仕上,,,0,
30,検査員認定,仕上,コイル,,0,
31,検査員認定,仕上,板,,0,`;

        // CSVをインポート
        try {
            const qualificationsSuccess = this.appData.importQualificationsFromCSV(qualificationsCSV);
            const workCertificationsSuccess = this.appData.importWorkCertificationsFromCSV(workCertificationsCSV);
        } catch (error) {
            console.error("CSVデータのインポートに失敗しました:", error);
        }
    }

    addGrade(grade) {
        return this.appData.addGrade(grade);
    }

    updateGrade(oldGrade, newGrade) {
        const success = this.appData.updateGrade(oldGrade, newGrade);
        if (success) {
            // UIの更新が必要な場合
            this.updateGradeFilter(); // フィルターの選択肢更新
            this.refreshData(); // チャートやリストの再描画
        }
        return success;
    }

    deleteGrade(grade) {
        return this.appData.deleteGrade(grade);
    }

    // UI初期化
    initializeUI() {
        this.appUI.initializeUI();
        this.appUI.initializeMenu();
        this.appUI.initializeModals();

        // 表示オプション
        document.getElementById('chartTypeSelect').value = this.displayOptions.chartType;
        document.getElementById('sortOrderSelect').value = this.displayOptions.sortOrder;
        const showPhotoElem = document.getElementById('showPhoto');
        if (showPhotoElem) showPhotoElem.checked = this.displayOptions.showPhoto;
        document.getElementById('showGrade').checked = this.displayOptions.showGrade;
        document.getElementById('showYearlyEval').checked = this.displayOptions.showYearlyEval;
        document.getElementById('showPosition').checked = this.displayOptions.showPosition;
        document.getElementById('showDepartmentBadge').checked = this.displayOptions.showDepartmentBadge;
        document.getElementById('showGradeChange').checked = this.displayOptions.showGradeChange;
        document.getElementById('showYearlyEvalChange').checked = this.displayOptions.showYearlyEvalChange;
        document.getElementById('showTeam').checked = this.displayOptions.showTeam;
        document.getElementById('showAge').checked = this.displayOptions.showAge; // 年齢バッジ
        document.getElementById('showTenure').checked = this.displayOptions.showTenure; // 勤続年数バッジ
        document.getElementById('showFlagIcon').checked = this.displayOptions.showFlagIcon;
        document.getElementById('showRecruitType').checked = this.displayOptions.showRecruitType; // 新卒/中途バッジ
        
        // グレード軸が選択された場合、年齢と勤続年数スライダーを非表示
        this.appUI.toggleAgeRangeSliderVisibility(this.displayOptions.chartType === 'age');
        this.appUI.toggleTenureRangeSliderVisibility(this.displayOptions.chartType === 'tenure');

        // グレード変化とYearly変化のチェックボックス表示状態制御
        this.toggleGradeChangeVisibility(this.displayOptions.showGrade);
        this.toggleYearlyEvalChangeVisibility(this.displayOptions.showYearlyEval);

        // 設定
        const defaultChartTypeElem = document.getElementById('defaultChartType');
        if (defaultChartTypeElem) {
            defaultChartTypeElem.value = this.appData.getSettings().defaultChartType;
        }

        const defaultSortOrderElem = document.getElementById('defaultSortOrder');
        if (defaultSortOrderElem) {
            defaultSortOrderElem.value = this.appData.getSettings().defaultSortOrder;
        }
        
        // 契約形態表示オプションの初期化
        const showContractTypeCheckbox = document.getElementById('showContractType');
        if (showContractTypeCheckbox) {
            showContractTypeCheckbox.checked = this.displayOptions.showContractType;
        }

        // フィルターリストボックスの初期化
        this.updateAllFilters();

        // すべてのフィルターの視覚的状態を初期化
        this.initializeAllFilterVisualStates();

        // 設定モーダルのグレード色表示にコントラストを適用
        this.appUI.applyContrastToSettingsGradeColors();
    }

    // グレード変化チェックボックスの表示/非表示を切り替える
    toggleGradeChangeVisibility(showGrade) {
        const gradeChangeCheckboxItem = document.getElementById('showGradeChange')?.closest('.checkbox-item');
        if (gradeChangeCheckboxItem) {
            if (showGrade) {
                gradeChangeCheckboxItem.style.display = '';
            } else {
                gradeChangeCheckboxItem.style.display = 'none';
                // グレード表示がオフならグレード変化も自動でオフに
                document.getElementById('showGradeChange').checked = false;
                this.displayOptions.showGradeChange = false;
            }
        }
    }

    // 年度評価変化チェックボックスの表示/非表示を切り替える
    toggleYearlyEvalChangeVisibility(showYearlyEval) {
        const yearlyEvalChangeCheckboxItem = document.getElementById('showYearlyEvalChange')?.closest('.checkbox-item');
        if (yearlyEvalChangeCheckboxItem) {
            if (showYearlyEval) {
                yearlyEvalChangeCheckboxItem.style.display = '';
            } else {
                yearlyEvalChangeCheckboxItem.style.display = 'none';
                // 年度評価表示がオフなら変化も自動でオフに
                document.getElementById('showYearlyEvalChange').checked = false;
                this.displayOptions.showYearlyEvalChange = false;
            }
        }
    }

    // リストボックス形式に合わせてフィルター更新メソッドを整理
    updateAllFilters() {
        this.updateDepartmentFilter();
        this.updatePositionFilter();
        this.updateTeamFilter(); // 所属班フィルター更新を追加
        this.updateGradeFilter();
        this.updateAgeFilter();
        this.updateTenureFilter();
        this.updateEvaluationTypeFilter();
        this.updateYearFilter(); // 年度フィルター更新メソッドを追加
        this.updateRecruitTypeFilter(); // 新卒/中途フィルター更新を追加
        this.updateContractTypeFilter();
    }

    updateContractTypeFilter() {
        const contractTypes = this.appData.getContractTypes();
        // データがない場合、選択中のフィルターもクリア
        if (contractTypes.length === 0) {
            this.filters.contractTypes.clear();
        }
        this.appUIForms.updateFilterListBox(
            'contractTypeListBox',
            contractTypes,
            this.filters.contractTypes,
            'id',
            'name',
            true
        );
        // 視覚的状態を更新
        this.updateFilterVisualState('contractTypeFilter', this.filters.contractTypes, contractTypes.length);
    }

    updateDepartmentFilter() {
        const departments = this.appData.getDepartments();
        this.appUI.updateFilterListBox('departmentListBox', departments, this.filters.departments, 'id', 'name');
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('departmentFilter', this.filters.departments, departments.length);
    }

    updatePositionFilter() {
        // 役職データを取得
        const positions = this.appData.getPositions().map(p => ({ id: p.name, name: p.name }));
        
        // データが存在する場合のみ「役職なし」を追加
        if (positions.length > 0) {
            positions.unshift({ id: '', name: '(役職なし)' });
        }
        
        this.appUI.updateFilterListBox('positionListBox', positions, this.filters.positions, 'id', 'name');
        
        // フィルターの視覚的状態を更新
        // 「役職なし」を含むため、totalCountは +1 する
        this.updateFilterVisualState('positionFilter', this.filters.positions, this.appData.getPositions().length + (positions.length > 0 ? 1 : 0));
    }
    
    // 所属班フィルター更新メソッド追加
    updateTeamFilter() {
        const teams = this.appData.getTeams();
        this.appUI.updateFilterListBox('teamListBox', teams, this.filters.teams, 'id', 'name');
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('teamFilter', this.filters.teams, teams.length);
    }

    updateGradeFilter() {
        const grades = this.appData.getGradeOptions().map(g => ({ id: g, name: g }));
        // データがない場合、選択中のフィルターもクリア
        if (grades.length === 0) {
            this.filters.grades.clear();
        }
        this.appUI.updateFilterListBox('gradeListBox', grades, this.filters.grades, 'id', 'name', false);
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('gradeFilter', this.filters.grades, this.allGradeOptionsCount);
    }

    updateAgeFilter() {
        const ageListBox = document.getElementById('ageListBox');
        if (!ageListBox) return;
        
        const employees = this.appData.getEmployees();
        // データがない場合はリストを空にする
        if (employees.length === 0) {
            ageListBox.innerHTML = '';
            this.filters.ageGroups.clear();
        } else {
            // データがある場合のみ選択肢をセット
            ageListBox.innerHTML = `
                <option value="10s">10代</option>
                <option value="20s">20代</option>
                <option value="30s">30代</option>
                <option value="40s">40代</option>
                <option value="50s">50代</option>
                <option value="60s">60代</option>
            `;
            // 選択状態を復元
            Array.from(ageListBox.options).forEach(option => {
                option.selected = this.filters.ageGroups.has(option.value);
            });
        }
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('ageFilter', this.filters.ageGroups, employees.length > 0 ? 6 : 0);
    }

    updateTenureFilter() {
        const tenureListBox = document.getElementById('tenureListBox');
        if (!tenureListBox) return;
        
        const employees = this.appData.getEmployees();
        // データがない場合はリストを空にする
        if (employees.length === 0) {
            tenureListBox.innerHTML = '';
            this.filters.tenureGroups.clear();
        } else {
            // データがある場合のみ選択肢をセット
            tenureListBox.innerHTML = `
                <option value="0-5">0-5年</option>
                <option value="6-10">6-10年</option>
                <option value="11-15">11-15年</option>
                <option value="16-20">16-20年</option>
                <option value="21-30">21-30年</option>
                <option value="31-">31年以上</option>
            `;
            // 選択状態を復元
            Array.from(tenureListBox.options).forEach(option => {
                option.selected = this.filters.tenureGroups.has(option.value);
            });
        }
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('tenureFilter', this.filters.tenureGroups, employees.length > 0 ? 6 : 0);
    }

    updateEvaluationTypeFilter() {
        const evalTypeListBox = document.getElementById('evaluationTypeListBox');
        if (!evalTypeListBox) return;

        const evaluations = this.appData.getEvaluations();
        // データがない場合はリストを空にする
        if (evaluations.length === 0) {
            evalTypeListBox.innerHTML = '';
            this.filters.evaluationTypes.clear();
        } else {
             // データがある場合のみ選択肢をセット
            evalTypeListBox.innerHTML = `
                <option value="A">A評価</option>
                <option value="B">B評価</option>
                <option value="C">C評価</option>
            `;
            // 選択状態を復元
            Array.from(evalTypeListBox.options).forEach(option => {
                option.selected = this.filters.evaluationTypes.has(option.value);
            });
        }
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('evaluationFilter', this.filters.evaluationTypes, evaluations.length > 0 ? this.allEvalTypeOptionsCount : 0);
    }

    // 新卒/中途フィルター更新メソッド
    updateRecruitTypeFilter() {
        const recruitTypeListBox = document.getElementById('recruitTypeListBox');
        if (!recruitTypeListBox) return;
        
        const employees = this.appData.getEmployees();
        // データがない場合はリストを空にする
        if (employees.length === 0) {
            recruitTypeListBox.innerHTML = '';
            this.filters.recruitTypes.clear();
        } else {
             // データがある場合のみ選択肢をセット
            recruitTypeListBox.innerHTML = `
                <option value="new-graduate">新卒採用</option>
                <option value="mid-career">中途採用</option>
            `;
            // 選択状態を復元
            if (this.filters.recruitTypes) {
                Array.from(recruitTypeListBox.options).forEach(option => {
                    option.selected = this.filters.recruitTypes.has(option.value);
                });
            }
        }
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('recruitTypeFilter', this.filters.recruitTypes || new Set(), employees.length > 0 ? 2 : 0);
    }

    // 評価年度フィルター更新メソッド追加
    updateYearFilter() {
        // 評価データから利用可能なすべての年度を取得
        const years = this.appData.getEvaluations().map(e => e.year);
        const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // 明示的に降順
        
        // 年度リストを表示用データに変換
        const yearItems = uniqueYears.map(year => ({ id: year, name: `${year}年` }));
        
        // データが空になった場合、選択中の年度フィルターもクリア
        if (uniqueYears.length === 0) {
            this.filters.years.clear();
        } else if (this.filters.years.size === 0) {
            // 初期状態ですべての年度を選択状態にする
            this.filters.years = new Set(uniqueYears);
        }
        
        // リストボックスを更新 - ソートを無効にして元の順序を維持
        this.appUI.updateFilterListBox('yearListBox', yearItems, this.filters.years, 'id', 'name', false);
        
        // フィルターの視覚的状態を更新
        this.updateFilterVisualState('yearFilter', this.filters.years, uniqueYears.length);
    }

    /**
     * フィルターの選択状態を確認し、選択状態に応じて視覚的にマーク
     * @param {string} filterId - フィルター要素のID
     * @param {Set} selectedValues - 選択された値のセット
     * @param {Array|number} totalOptions - 全オプション数または全オプション配列
     */
    updateFilterVisualState(filterId, selectedValues, totalOptions) {
        const filterSection = document.getElementById(filterId);
        if (!filterSection) return;
        
        const totalCount = Array.isArray(totalOptions) ? totalOptions.length : totalOptions;
        const selectedCount = selectedValues.size;
        
        // フィルターのヘッダー要素
        const headerEl = filterSection.querySelector('h3');
        if (!headerEl) return;
        
        // 現在のフィルター状態アイコンを削除（存在する場合）
        const existingIndicator = headerEl.querySelector('.filter-active-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 現在のフィルターカウントを削除（存在する場合）
        const existingCount = headerEl.querySelector('.filter-count');
        if (existingCount) {
            existingCount.remove();
        }
        
        // 修正: 全選択または全選択でない場合にフィルターセクションにクラスを追加
        // 全選択の場合（selectedCount === totalCount）のみ通常表示
        if (selectedCount !== totalCount) {
            filterSection.classList.add('filtered');
            
            // フィルター状態属性を設定（CSS用）
            if (selectedCount === 0) {
                filterSection.setAttribute('data-filter-state', 'none');
            } else if (selectedCount < totalCount) {
                filterSection.setAttribute('data-filter-state', 'partial');
            }
            
            // フィルターアクティブアイコンを追加
            const indicator = document.createElement('i');
            indicator.className = 'fas fa-filter filter-active-indicator';
            headerEl.appendChild(indicator);
            
            // 選択数バッジを追加
            const countBadge = document.createElement('span');
            countBadge.className = 'filter-count';
            
            // 表示テキストの調整
            if (selectedCount === 0) {
                countBadge.textContent = '0';
                countBadge.title = `全選択解除 (0/${totalCount})`;
            } else {
                countBadge.textContent = selectedCount;
                countBadge.title = `${selectedCount}/${totalCount} 選択中`;
            }
            
            headerEl.appendChild(countBadge);
        } else {
            // 全選択の場合はフィルター表示を解除
            filterSection.classList.remove('filtered');
            filterSection.removeAttribute('data-filter-state');
        }
    }

    /**
     * すべてのフィルターの視覚的状態を初期化
     */
    initializeAllFilterVisualStates() {
        // 各フィルターの視覚的状態を更新
        this.updateFilterVisualState('departmentFilter', this.filters.departments, this.appData.getDepartments().length);
        this.updateFilterVisualState('ageFilter', this.filters.ageGroups, 6);
        this.updateFilterVisualState('tenureFilter', this.filters.tenureGroups, 6);
        this.updateFilterVisualState('positionFilter', this.filters.positions, this.appData.getPositions().length + 1);
        this.updateFilterVisualState('teamFilter', this.filters.teams, this.appData.getTeams().length);
        this.updateFilterVisualState('gradeFilter', this.filters.grades, this.allGradeOptionsCount);
        this.updateFilterVisualState('evaluationFilter', this.filters.evaluationTypes, this.allEvalTypeOptionsCount);
        
        // 年度フィルターは特別処理
        const years = this.appData.getEvaluations().map(e => e.year);
        const uniqueYearsCount = new Set(years).size;
        this.updateFilterVisualState('yearFilter', this.filters.years, uniqueYearsCount);
        
        // 新卒/中途フィルター
        this.updateFilterVisualState('recruitTypeFilter', this.filters.recruitTypes, 2);

        // 契約形態フィルタの初期化と視覚的状態更新
        const contractTypes = this.appData.getContractTypes();
        this.filters.contractTypes = new Set(contractTypes.map(ct => ct.id));
        this.updateContractTypeFilter(); // この中で updateFilterVisualState も呼ばれる
    }

    /**
     * リストボックスIDからフィルターセクションIDを取得
     * @param {string} listBoxId - リストボックスのID
     * @returns {string|null} - フィルターセクションのID
     */
    getFilterSectionIdFromListBoxId(listBoxId) {
        const mapping = {
            'departmentListBox': 'departmentFilter',
            'ageListBox': 'ageFilter',
            'tenureListBox': 'tenureFilter',
            'positionListBox': 'positionFilter',
            'teamListBox': 'teamFilter',
            'gradeListBox': 'gradeFilter',
            'evaluationTypeListBox': 'evaluationFilter',
            'yearListBox': 'yearFilter',
            'recruitTypeListBox': 'recruitTypeFilter',
            'contractTypeListBox': 'contractTypeFilter' // 追加
        };
        return mapping[listBoxId] || null;
    }

    /**
     * フィルターセクションIDから対応するフィルター情報を取得
     * @param {string} sectionId - フィルターセクションのID
     * @returns {Object|null} - フィルター情報 {filterSet, totalCount}
     */
    getFilterInfoFromSectionId(sectionId) {
        let filterSet = null;
        let totalCount = 0;
        
        switch (sectionId) {
            case 'departmentFilter':
                filterSet = this.filters.departments;
                totalCount = this.appData.getDepartments().length;
                break;
            case 'ageFilter':
                filterSet = this.filters.ageGroups;
                totalCount = 6; // 10s〜60s
                break;
            case 'tenureFilter':
                filterSet = this.filters.tenureGroups;
                totalCount = 6; // 0-5〜31-
                break;
            case 'positionFilter':
                filterSet = this.filters.positions;
                totalCount = this.appData.getPositions().length + 1; // +1 for "役職なし"
                break;
            case 'teamFilter':
                filterSet = this.filters.teams;
                totalCount = this.appData.getTeams().length;
                break;
            case 'gradeFilter':
                filterSet = this.filters.grades;
                totalCount = this.allGradeOptionsCount;
                break;
            case 'evaluationFilter':
                filterSet = this.filters.evaluationTypes;
                totalCount = this.allEvalTypeOptionsCount;
                break;
            case 'yearFilter':
                filterSet = this.filters.years;
                const years = this.appData.getEvaluations().map(e => e.year);
                totalCount = new Set(years).size;
                break;
            case 'recruitTypeFilter':
                filterSet = this.filters.recruitTypes;
                totalCount = 2; // 新卒と中途の2つ
                break;
            case 'contractTypeFilter': // 追加
                filterSet = this.filters.contractTypes;
                totalCount = this.appData.getContractTypes().length;
                break;
            default:
                return null;
        }
        
        return { filterSet, totalCount };
    }

    // フィルターリストボックスから選択値を取得するヘルパー
    getSelectedValuesFromListBox(listBoxId) {
        const listBox = document.getElementById(listBoxId);
        if (!listBox) return new Set();
        return new Set(
            Array.from(listBox.selectedOptions).map(option => {
                // Try converting to number, keep as string if NaN or doesn't match original
                const numValue = Number(option.value);
                return !isNaN(numValue) && String(numValue) === option.value ? numValue : option.value;
            })
        );
    }
   
    // 要素をクローンして元のイベントリスナーを削除するヘルパー関数
    replaceElementWithClone(id) {
        const element = document.getElementById(id);
        if (element) {
            const clone = element.cloneNode(true);
            element.parentNode.replaceChild(clone, element);
            return clone;
        }
        return null;
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // 既に初期化されている場合は処理をスキップ
        if (this.eventListenersInitialized) {
            return;
        }

        // サイドバー検索
        const employeeSelectSearch = this.replaceElementWithClone('employeeSelectSearch');
        if (employeeSelectSearch) {
            employeeSelectSearch.addEventListener('input', e => {
                this.filters.searchTerm = e.target.value.toLowerCase();
                this.refreshEmployeeSelectList();
            });
        }

        // 表示オプション変更
        const chartTypeSelect = this.replaceElementWithClone('chartTypeSelect');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', e => {
                this.displayOptions.chartType = e.target.value;
                this.appUI.toggleAgeRangeSliderVisibility(this.displayOptions.chartType === 'age');
                this.appUI.toggleTenureRangeSliderVisibility(this.displayOptions.chartType === 'tenure');
                this.refreshChart();
            });
        }

        const sortOrderSelect = this.replaceElementWithClone('sortOrderSelect');
        if (sortOrderSelect) {
            sortOrderSelect.addEventListener('change', e => {
                this.displayOptions.sortOrder = e.target.value;
                this.refreshChart();
            });
        }

        const showGrade = this.replaceElementWithClone('showGrade');
        if (showGrade) {
            showGrade.addEventListener('change', e => {
                this.displayOptions.showGrade = e.target.checked;
                // グレード変化の表示/非表示の制御を追加
                this.toggleGradeChangeVisibility(e.target.checked);
                this.refreshData(); // Refresh sidebar list and chart
            });
        }

        const showYearlyEval = this.replaceElementWithClone('showYearlyEval');
        if (showYearlyEval) {
            showYearlyEval.addEventListener('change', e => {
                this.displayOptions.showYearlyEval = e.target.checked;
                // 年度評価変化の表示/非表示の制御を追加
                this.toggleYearlyEvalChangeVisibility(e.target.checked);
                this.refreshChart(); // Only chart needs refresh for this
            });
        }

        const showFlagIcon = this.replaceElementWithClone('showFlagIcon');
        if (showFlagIcon) {
            showFlagIcon.addEventListener('change', e => {
                this.displayOptions.showFlagIcon = e.target.checked;
                this.refreshData(); // Refresh both sidebar and chart
            });
        }

        const showPhoto = this.replaceElementWithClone('showPhoto');
        if (showPhoto) {
            showPhoto.addEventListener('change', e => {
                this.displayOptions.showPhoto = e.target.checked;
                this.refreshChart(); // 顔写真はチャート内カードのみに影響
            });
        }

        const showPosition = this.replaceElementWithClone('showPosition');
        if (showPosition) {
            showPosition.addEventListener('change', e => {
                this.displayOptions.showPosition = e.target.checked;
                this.refreshData(); // Refresh sidebar list and chart
            });
        }

        const showTeam = this.replaceElementWithClone('showTeam');
        if (showTeam) {
            showTeam.addEventListener('change', e => {
                this.displayOptions.showTeam = e.target.checked;
                this.refreshData(); // Refresh sidebar list and chart
            });
        }

        const showDepartmentBadge = this.replaceElementWithClone('showDepartmentBadge');
        if (showDepartmentBadge) {
            showDepartmentBadge.addEventListener('change', e => {
                this.displayOptions.showDepartmentBadge = e.target.checked;
                this.refreshData(); // Refresh sidebar list and chart (以前はrefreshChartのみ)
            });
        }

        const showGradeChange = this.replaceElementWithClone('showGradeChange');
        if (showGradeChange) {
            showGradeChange.addEventListener('change', e => {
                this.displayOptions.showGradeChange = e.target.checked;
                this.refreshChart(); // Only chart needs refresh for this
            });
        }

        const showYearlyEvalChange = this.replaceElementWithClone('showYearlyEvalChange');
        if (showYearlyEvalChange) {
            showYearlyEvalChange.addEventListener('change', e => {
                this.displayOptions.showYearlyEvalChange = e.target.checked;
                this.refreshChart(); // Only chart needs refresh for this
            });
        }

        // 表示オプション変更イベントリスナー (年齢と勤続年数のバッジ表示用を追加)
        const showAge = this.replaceElementWithClone('showAge');
        if (showAge) {
            showAge.addEventListener('change', e => {
                this.displayOptions.showAge = e.target.checked;
                this.refreshData(); // Refresh both sidebar and chart
            });
        }

        const showTenure = this.replaceElementWithClone('showTenure');
        if (showTenure) {
            showTenure.addEventListener('change', e => {
                this.displayOptions.showTenure = e.target.checked;
                this.refreshData(); // Refresh both sidebar and chart
            });
        }

        // 表示オプション変更イベントリスナー追加
        const showRecruitType = this.replaceElementWithClone('showRecruitType');
        if (showRecruitType) {
            showRecruitType.addEventListener('change', e => {
                this.displayOptions.showRecruitType = e.target.checked;
                this.refreshData(); // Refresh both sidebar and chart
            });
        }

        // 星取表タイプ選択
        const starChartTypeSelect = this.replaceElementWithClone('starChartTypeSelect');
        if (starChartTypeSelect) {
            starChartTypeSelect.addEventListener('change', e => {
                this.displayOptions.starChartType = e.target.value;
                this.refreshChart();
            });
        }

        // --- フィルター関連イベントリスナー (リストボックス用) ---
        const departmentListBox = this.replaceElementWithClone('departmentListBox');
        if (departmentListBox) {
            departmentListBox.addEventListener('change', () => {
                this.filters.departments = this.getSelectedValuesFromListBox('departmentListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('departmentFilter', this.filters.departments, this.appData.getDepartments().length);
                this.refreshData();
            });
        }

        const ageListBox = this.replaceElementWithClone('ageListBox');
        if (ageListBox) {
            ageListBox.addEventListener('change', () => {
                this.filters.ageGroups = this.getSelectedValuesFromListBox('ageListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('ageFilter', this.filters.ageGroups, 6);
                this.refreshData();
            });
        }

        const tenureListBox = this.replaceElementWithClone('tenureListBox');
        if (tenureListBox) {
            tenureListBox.addEventListener('change', () => {
                this.filters.tenureGroups = this.getSelectedValuesFromListBox('tenureListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('tenureFilter', this.filters.tenureGroups, 6);
                this.refreshData();
            });
        }

        const positionListBox = this.replaceElementWithClone('positionListBox');
        if (positionListBox) {
            positionListBox.addEventListener('change', () => {
                this.filters.positions = this.getSelectedValuesFromListBox('positionListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('positionFilter', this.filters.positions, this.appData.getPositions().length + 1);
                this.refreshData();
            });
        }

        const teamListBox = this.replaceElementWithClone('teamListBox');
        if (teamListBox) {
            teamListBox.addEventListener('change', () => {
                this.filters.teams = this.getSelectedValuesFromListBox('teamListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('teamFilter', this.filters.teams, this.appData.getTeams().length);
                this.refreshData();
            });
        }

        const gradeListBox = this.replaceElementWithClone('gradeListBox');
        if (gradeListBox) {
            gradeListBox.addEventListener('change', () => {
                this.filters.grades = this.getSelectedValuesFromListBox('gradeListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('gradeFilter', this.filters.grades, this.allGradeOptionsCount);
                this.refreshData();
            });
        }

        const evaluationTypeListBox = this.replaceElementWithClone('evaluationTypeListBox');
        if (evaluationTypeListBox) {
            evaluationTypeListBox.addEventListener('change', () => {
                this.filters.evaluationTypes = this.getSelectedValuesFromListBox('evaluationTypeListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('evaluationFilter', this.filters.evaluationTypes, this.allEvalTypeOptionsCount);
                this.refreshData();
            });
        }

        // 評価年度フィルターのイベントリスナー追加
        const yearListBox = this.replaceElementWithClone('yearListBox');
        if (yearListBox) {
            yearListBox.addEventListener('change', () => {
                this.filters.years = this.getSelectedValuesFromListBox('yearListBox');
                // フィルターの視覚的状態を更新
                const years = this.appData.getEvaluations().map(e => e.year);
                const uniqueYearsCount = new Set(years).size;
                this.updateFilterVisualState('yearFilter', this.filters.years, uniqueYearsCount);
                this.refreshData();
            });
        }

        // 新卒/中途フィルターのイベントリスナー追加
        const recruitTypeListBox = this.replaceElementWithClone('recruitTypeListBox');
        if (recruitTypeListBox) {
            recruitTypeListBox.addEventListener('change', () => {
                this.filters.recruitTypes = this.getSelectedValuesFromListBox('recruitTypeListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('recruitTypeFilter', this.filters.recruitTypes, 2);
                this.refreshData();
            });
        }

        const showStarChartCategory = this.replaceElementWithClone('showStarChartCategory');
        if (showStarChartCategory) {
            showStarChartCategory.addEventListener('change', e => {
                this.displayOptions.showStarChartCategory = e.target.checked;
                this.refreshChart();
            });
        }

        const showStarChartClassification = this.replaceElementWithClone('showStarChartClassification');
        if (showStarChartClassification) {
            showStarChartClassification.addEventListener('change', e => {
                this.displayOptions.showStarChartClassification = e.target.checked;
                this.refreshChart();
            });
        }

        // 契約形態フィルタ
        const contractTypeListBox = this.replaceElementWithClone('contractTypeListBox');
        if (contractTypeListBox) {
            contractTypeListBox.addEventListener('change', () => {
                this.filters.contractTypes = this.getSelectedValuesFromListBox('contractTypeListBox');
                // フィルターの視覚的状態を更新
                this.updateFilterVisualState('contractTypeFilter', this.filters.contractTypes, this.appData.getContractTypes().length);
                this.refreshData();
            });
        }
        
        // 契約形態フィルタのボタン - 呼び出しをコメントアウト
        // this.setupFilterButtons('contractTypeListBox', this.filters.contractTypes, 
        //     this.appData.getContractTypes().map(ct => ct.id));
        
        // 表示オプション: 契約形態バッジ
        const showContractTypeCheckbox = document.getElementById('showContractType');
        if (showContractTypeCheckbox) {
            showContractTypeCheckbox.addEventListener('change', (e) => {
                this.displayOptions.showContractType = e.target.checked;
                this.refreshChart();
            });
        }

        // 表示オプション: フルネーム表示
        const showFullNameCheckbox = document.getElementById('showFullName');
        if (showFullNameCheckbox) {
            showFullNameCheckbox.addEventListener('change', (e) => {
                this.displayOptions.showFullName = e.target.checked;
                this.refreshChart();
            });
        }

        // 全選択ボタンのイベントリスナー
        document.querySelectorAll('.btn-select-all').forEach(btn => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const listBox = document.getElementById(targetId);
                if (listBox) {
                    Array.from(listBox.options).forEach(option => {
                        option.selected = true;
                    });
                    // リストボックスの change イベントを手動で発火
                    const event = new Event('change');
                    listBox.dispatchEvent(event);
                    
                    // 対応するフィルターセクションIDを取得
                    const filterSectionId = this.getFilterSectionIdFromListBoxId(targetId);
                    if (filterSectionId) {
                        // フィルター名と対応するフィルターセットを取得
                        const filterInfo = this.getFilterInfoFromSectionId(filterSectionId);
                        if (filterInfo) {
                            // フィルターの視覚的状態を更新
                            this.updateFilterVisualState(filterSectionId, filterInfo.filterSet, filterInfo.totalCount);
                        }
                    }
                }
            });
        });

        // 全解除ボタンのイベントリスナー
        document.querySelectorAll('.btn-deselect-all').forEach(btn => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const listBox = document.getElementById(targetId);
                if (listBox) {
                    Array.from(listBox.options).forEach(option => {
                        option.selected = false;
                    });
                    // リストボックスの change イベントを手動で発火
                    const event = new Event('change');
                    listBox.dispatchEvent(event);
                    
                    // 対応するフィルターセクションIDを取得
                    const filterSectionId = this.getFilterSectionIdFromListBoxId(targetId);
                    if (filterSectionId) {
                        // フィルター名と対応するフィルターセットを取得
                        const filterInfo = this.getFilterInfoFromSectionId(filterSectionId);
                        if (filterInfo) {
                            // フィルターの視覚的状態を更新
                            this.updateFilterVisualState(filterSectionId, filterInfo.filterSet, filterInfo.totalCount);
                        }
                    }
                }
            });
        });

        // 社員選択リストの「すべて選択」ボタン
        const selectAllEmployeesBtn = this.replaceElementWithClone('selectAllEmployeesBtn');
        if (selectAllEmployeesBtn) {
            selectAllEmployeesBtn.addEventListener('click', () => {
                const filteredEmployees = this.getFilteredEmployees();
                this.selectedEmployeeIds = filteredEmployees.map(emp => emp.id);
                this.refreshEmployeeSelectList();
                this.refreshChart();
            });
        }

        // 社員選択リストの「すべて解除」ボタン
        const deselectAllEmployeesBtn = this.replaceElementWithClone('deselectAllEmployeesBtn');
        if (deselectAllEmployeesBtn) {
            deselectAllEmployeesBtn.addEventListener('click', () => {
                this.selectedEmployeeIds =[];
                this.refreshEmployeeSelectList();
                this.refreshChart();
            });
        }

        // --- フィルター関連ここまで ---

        // 社員管理モーダル - このイベントを設定マネージャで処理するように修正
        const manageEmployeesBtn = this.replaceElementWithClone('manageEmployeesBtn');
        if (manageEmployeesBtn) {
            manageEmployeesBtn.addEventListener('click', () => this.appUIForms.showEmployeeModal());
        }

        // 評価追加ボタン
        const addEvaluationBtn = this.replaceElementWithClone('addEvaluationBtn');
        if (addEvaluationBtn) {
            addEvaluationBtn.addEventListener('click', () => this.showEvaluationModal());
        }

        // 社員追加/編集モーダル
        const saveEmployeeBtn = this.replaceElementWithClone('saveEmployeeBtn');
        if (saveEmployeeBtn) {
            saveEmployeeBtn.addEventListener('click', () => this.saveEmployee());
        }

        const cancelEmployeeBtn = this.replaceElementWithClone('cancelEmployeeBtn');
        if (cancelEmployeeBtn) {
            cancelEmployeeBtn.addEventListener('click', () => this.appUI.hideModal('employeeModal'));
        }

        const closeEmployeeModal = this.replaceElementWithClone('closeEmployeeModal');
        if (closeEmployeeModal) {
            closeEmployeeModal.addEventListener('click', () => this.appUI.hideModal('employeeModal'));
        }

        // 評価追加/編集モーダル
        const saveEvaluationBtn = this.replaceElementWithClone('saveEvaluationBtn');
        if (saveEvaluationBtn) {
            saveEvaluationBtn.addEventListener('click', () => this.saveEvaluation());
        }

        const cancelEvaluationBtn = this.replaceElementWithClone('cancelEvaluationBtn');
        if (cancelEvaluationBtn) {
            cancelEvaluationBtn.addEventListener('click', () => this.appUI.hideModal('evaluationModal'));
        }

        const closeEvaluationModal = this.replaceElementWithClone('closeEvaluationModal');
        if (closeEvaluationModal) {
            closeEvaluationModal.addEventListener('click', () => this.appUI.hideModal('evaluationModal'));
        }

        // 印刷ボタン
        const printBtn = this.replaceElementWithClone('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => { this.appUI.prepareForPrint(); window.print(); });
        }

        const printBtn2 = this.replaceElementWithClone('printBtn2');
        if (printBtn2) {
            printBtn2.addEventListener('click', () => { this.appUI.prepareForPrint(); window.print(); });
        }

        // 更新ボタン
        const updateBtn = this.replaceElementWithClone('updateBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => { this.refreshData(); this.appUI.showNotification('info', 'データ更新', '表示を最新の状態に更新しました。'); });
        }

        // ヘルプボタン
        const helpBtn = this.replaceElementWithClone('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                 // Simple alert for now, could be replaced with a dedicated help modal
                alert('人事評定視覚化アプリケーション ヘルプ\n\n' +
                      '使い方:\n' +
                      '1. 左のフィルター(部署/年齢/勤続/役職/所属班/グレード/評価/年度)で表示条件を絞り込みます。(Ctrl/Shift+クリックで複数選択)\n' +
                      '2. 左下の「表示社員選択」リストで、チャートに表示したい社員をクリックして選択/解除します。\n' +
                      '3. 右側に選択した社員のチャートまたは分布図が表示されます。\n' +
                      '4. 上部のタブで表示モード(評価チャート/部署別配置/班別配置/分布図)を切り替えられます。\n' +
                      '5. ツールバーで表示形式(年齢軸/年度軸/勤続軸)、表示項目(グレード/年評/役職/部署)、表示順序、年齢範囲を変更できます。\n' +
                      '   (表示形式と表示項目設定は評価チャートと部署別配置で共通です。年齢範囲は年齢軸の時のみ有効)\n\n' +
                      '表示詳細:\n' +
                       '- グレード: G1-G12を色分け表示。カッコ内は前回変化からの経過年数と方向(▲上昇▼下降)。例: G5 (▲2年前)\n' +
                       '- 年度評価: 前年比較を矢印で表示(▲上昇▼下降＝維持)。維持の場合は連続年数を表示。例: =B3 (3年)\n' +
                       '- 役職/部署/所属班: グレーの枠線付きバッジで表示。\n\n' +
                      '機能:\n' +
                      '・<i class="fas fa-users-cog"></i> 社員管理: 社員の追加/編集/削除\n' +
                      '・<i class="fas fa-cog"></i> 設定: デフォルト設定、部署/役職/所属班管理\n' +
                      '・<i class="fas fa-file-import"></i> インポート/エクスポート: データ保存/読込\n' +
                      '・<i class="fas fa-print"></i> 印刷: 現在の表示を印刷\n' +
                      '・<i class="fas fa-camera"></i> 画像出力: 現在のチャートを画像として保存\n' +
                      '・<i class="fas fa-plus-circle"></i> 評価追加: 新規評価登録\n' +
                      '・チャート操作: セルをダブルクリックで評価編集/追加');
            });
        }

        // タブナビゲーション
        document.querySelectorAll('.tabs-navigation .tab-btn').forEach(btn => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', () => {
                document.querySelectorAll('.tabs-navigation .tab-btn').forEach(b => b.classList.remove('active'));
                clone.classList.add('active'); 
                this.changeView(clone.getAttribute('data-view'));
            });
        });

        // モーダル内タブ
        document.querySelectorAll('.modal .tabs .tab').forEach(tab => {
            const clone = tab.cloneNode(true);
            tab.parentNode.replaceChild(clone, tab);
            clone.addEventListener('click', e => this.appUI.activateTab(e.target.getAttribute('data-tab'), e.target.closest('.modal-body')));
        });

        // イベントリスナー初期化完了フラグをセット
        this.eventListenersInitialized = true;
    }

    // --- データ操作メソッド ---
    showEmployeeModal(employeeId = null) { this.appUI.showEmployeeModal(employeeId); }
    showEvaluationModal(evaluationId = null, presetEmployeeId = null, presetYear = null) {
        // Pass currently *filtered* employees if no selection, otherwise pass selected
        const filteredEmployees = this.getFilteredEmployees();
        const employeesForDropdown = this.selectedEmployeeIds.length > 0
            ? this.selectedEmployeeIds.map(id => this.appData.getEmployee(id)).filter(Boolean)
            : filteredEmployees;
        this.appUI.showEvaluationModal(evaluationId, presetEmployeeId, presetYear, employeesForDropdown);
    }

    saveEmployee() {
        const form = document.getElementById('employeeForm');
        if (!form.checkValidity()) { 
            form.reportValidity(); 
            this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。'); 
            return; 
        }
        
        // 社員番号のバリデーション
        const employeeNumberInput = document.getElementById('employeeNumber');
        const employeeNumber = employeeNumberInput.value.trim();
        
        if (employeeNumber && !/^\d{5,8}$/.test(employeeNumber)) {
            this.appUI.showNotification('error', '入力エラー', '社員番号は5〜8桁の数値で入力してください。');
            employeeNumberInput.focus();
            return;
        }
        
        // 姓名を別々に取得
        const lastName = document.getElementById('employeeLastName').value.trim();
        const firstName = document.getElementById('employeeFirstName').value.trim();
        
        const employeeData = {
            lastName: lastName,
            firstName: firstName,
            employeeNumber: employeeNumber, // 社員番号追加
            birthdate: document.getElementById('employeeBirthdate').value,
            joinDate: document.getElementById('employeeJoinDate').value,
            departmentId: parseInt(document.getElementById('employeeDepartment').value),
            teamId: document.getElementById('employeeTeam').value ? parseInt(document.getElementById('employeeTeam').value) : null,
            position: document.getElementById('employeePosition').value || '',
            contractType: document.getElementById('employeeContractType').value,
            notes: document.getElementById('employeeNotes').value.trim(),
            // 顔写真データの保存
            photos: this.appUIForms.currentEmployeePhotos,
            displayPhotoId: this.appUIForms.currentDisplayPhotoId
        };
        
        const employeeIdInput = document.getElementById('employeeId');
        const employeeId = employeeIdInput.value ? parseInt(employeeIdInput.value) : null;
        
        try {
            let success = false;
            let message = '';
            const displayName = `${lastName} ${firstName}`.trim(); // 表示用に姓名を結合
            
            if (employeeId) { // Update existing employee
                employeeData.id = employeeId;
                success = this.appData.updateEmployee(employeeData);
                message = success ? `「${displayName}」さん更新完了` : "更新対象が見つかりません";
            } else { // Add new employee
                const newId = this.appData.addEmployee(employeeData);
                success = !!newId; // Check if addEmployee returned a valid ID
                message = success ? `「${displayName}」さん登録完了` : "社員追加失敗";
            }

            if (success) {
                this.appUI.hideModal('employeeModal');
                this.refreshEmployeeSelectList();
                this.appUI.updateEmployeeManagementTable(this.appData.getEmployees());
                this.refreshChart(); // Refresh chart in case the updated employee was displayed
                this.appUI.showNotification('success', '保存完了', message); // 統一したタイトル
            } else {
                this.appUI.showNotification('error', '保存エラー', message);
            }
        } catch (error) {
            console.error("Error saving employee:", error);
            this.appUI.showNotification('error', '保存エラー', error.message);
        }
    }

    saveEvaluation() {
        const form = document.getElementById('evaluationForm');
        if (!form.checkValidity()) { 
            form.reportValidity(); 
            this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。'); 
            return; 
        }

        const employeeId = parseInt(document.getElementById('evaluationEmployee').value); 
        const year = parseInt(document.getElementById('evaluationYear').value);
        const grade = document.getElementById('evaluationGrade').value; 
        const yearlyEvaluation = document.getElementById('evaluationYearly').value;
        const departmentId = parseInt(document.getElementById('evaluationDepartment').value);

        if (isNaN(employeeId) || isNaN(year) || !grade || !yearlyEvaluation || isNaN(departmentId)) { 
            this.appUI.showNotification('error', '入力エラー', '対象社員、評価年度、グレード、年度評価、評価時部署は必須です。'); 
            return; 
        }

        let age = parseInt(document.getElementById('evaluationAge').value); 
        let tenure = parseInt(document.getElementById('evaluationTenure').value);
        if (isNaN(age) || isNaN(tenure)) { 
            if (!this.appUI.calculateEvaluationAgeAndTenure(false)) { 
                this.appUI.showNotification('error', '計算エラー', '年齢/勤続年数を計算できません。社員の生年月日と入社年月日を確認してください。'); 
                return; 
            } 
            age = parseInt(document.getElementById('evaluationAge').value); 
            tenure = parseInt(document.getElementById('evaluationTenure').value); 
        }

        // フラグ値を取得
        const flagRadio = document.querySelector('input[name="evaluationFlag"]:checked');
        const flag = flagRadio ? flagRadio.value : '';

        const evaluationData = { 
            employeeId, 
            year, 
            age, 
            tenure, 
            grade, 
            yearlyEvaluation,
            flag: flag, // フラグフィールド追加 
            position: document.getElementById('evaluationPosition').value || '', 
            departmentId, 
            notes: document.getElementById('evaluationNotes').value.trim() 
        };
        
        const employee = this.appData.getEmployee(employeeId); 
        const employeeName = employee ? employee.name : '不明';
        const evaluationIdInput = document.getElementById('evaluationId'); 
        const evaluationId = evaluationIdInput.value ? parseInt(evaluationIdInput.value) : null;

        try {
            let success = false;
            let message = '';
            let notificationType = 'success';
            let notificationTitle = '保存完了'; // Default title

            if (evaluationId) { // Update existing evaluation
                evaluationData.id = evaluationId;
                // Check for potential duplicate if year/employee changed (though UI prevents this)
                const existingEval = this.appData.getEvaluations().find(ev => ev.employeeId === employeeId && ev.year === year && ev.id !== evaluationId);
                if (existingEval) {
                    message = `${employeeName}さんの${year}年度評価は既に存在します。`;
                    notificationType = 'error';
                    notificationTitle = '重複エラー';
                } else {
                    success = this.appData.updateEvaluation(evaluationData);
                    message = success ? `${employeeName}さん(${year}年)更新完了` : "更新対象が見つかりません";
                    if (!success) {
                        notificationType = 'error';
                        notificationTitle = '更新エラー';
                    }
                }
            } else { // Add new evaluation
                // Check for duplicate before adding
                const existingEval = this.appData.getEvaluations().find(ev => ev.employeeId === employeeId && ev.year === year);
                if (existingEval) {
                    message = `${employeeName}さんの${year}年度評価は既に存在します。`;
                    notificationType = 'error';
                    notificationTitle = '重複エラー';
                } else {
                    const newId = this.appData.addEvaluation(evaluationData);
                    success = !!newId;
                    message = success ? `${employeeName}さん(${year}年)追加完了` : "評価追加失敗";
                    if (!success) {
                        notificationType = 'error';
                        notificationTitle = '追加エラー';
                    }
                }
            }

            if (success) {
                this.appUI.hideModal('evaluationModal');
                
                // 評価の追加・更新時に年度フィルターを更新
                if (this.filters.years.size === 0) {
                    // 初期状態の場合は追加された年度も追加
                    this.filters.years.add(year);
                }
                this.updateYearFilter();  // 年度フィルター更新
                
                this.refreshEmployeeSelectList(); // Update latest grade potentially
                this.appUI.updateEmployeeManagementTable(this.appData.getEmployees()); // Update latest grade in mgmt table
                this.refreshChart(); // Refresh chart to show new/updated evaluation
            }
            // Show notification regardless of success/failure if a message was generated
            if (message) {
                  this.appUI.showNotification(notificationType, notificationTitle, message);
            }

        } catch (error) {
            console.error("Error saving evaluation:", error);
            this.appUI.showNotification('error', '保存エラー', error.message);
        }
    }

    deleteEmployee(employeeId) {
        const employee = this.appData.getEmployee(employeeId); if (!employee) return;
        if (confirm(`社員「${employee.name}」を削除しますか？\n関連する評価データも全て削除され、元に戻せません。`)) {
            try {
                if (this.appData.deleteEmployee(employeeId)) {
                   // Remove from selection if present
                   const index = this.selectedEmployeeIds.indexOf(employeeId);
                   if (index > -1) this.selectedEmployeeIds.splice(index, 1);

                   this.appUI.showNotification('success', '社員削除', `「${employee.name}」さん削除完了`);
                   this.refreshEmployeeSelectList(); // Update sidebar list
                   this.appUI.updateEmployeeManagementTable(this.appData.getEmployees()); // Update management table
                   this.refreshChart(); // Refresh chart view
                } else {
                     // This case might happen if the employee was already deleted somehow
                    this.appUI.showNotification('error', '削除失敗', '社員が見つからないか、削除できませんでした。');
                }
            } catch (error) {
                console.error("Error deleting employee:", error);
                this.appUI.showNotification('error', '削除エラー', error.message);
            }
        }
    }

    // 評価削除メソッドの追加
    deleteEvaluation(evaluationId) {
        const evaluation = this.appData.getEvaluation(evaluationId);
        if (!evaluation) return false;
        
        const employee = this.appData.getEmployee(evaluation.employeeId);
        const employeeName = employee ? employee.name : '不明';
        
        if (confirm(`${employeeName}さんの${evaluation.year}年度の評価を削除しますか？\nこの操作は元に戻せません。`)) {
            try {
                if (this.appData.deleteEvaluation(evaluationId)) {
                    this.appUI.showNotification('success', '評価削除', `${employeeName}さんの${evaluation.year}年度の評価を削除しました`);
                    this.refreshData();
                    return true;
                } else {
                    this.appUI.showNotification('error', '削除失敗', '評価が見つからないか、削除できませんでした。');
                    return false;
                }
            } catch (error) {
                console.error("Error deleting evaluation:", error);
                this.appUI.showNotification('error', '削除エラー', error.message);
                return false;
            }
        }
        return false;
    }

    // --- データ表示更新メソッド ---
    refreshData() {
        this.refreshEmployeeSelectList();
        this.refreshChart();
        // Refresh management table only if it's visible
        if (document.getElementById('employeeManagementModal')?.classList.contains('visible')) {
             this.appUI.updateEmployeeManagementTable(this.appData.getEmployees());
             const searchInput = document.getElementById('employeeManagementSearch');
             if (searchInput?.value) { // Re-apply filter if search term exists
                  this.appUI.filterEmployeeManagementTable(searchInput.value);
             }
        }
    }

    getFilteredEmployees() {
        const employees = this.appData.getEmployees();
        const currentYear = new Date().getFullYear();
        // --- ここからが修正箇所 ---
        // filtersオブジェクト自体やそのプロパティがundefinedでもエラーにならないようにする
        const { 
            departments, ageGroups, tenureGroups, positions, teams, grades, 
            evaluationTypes, years, recruitTypes, searchTerm, contractTypes 
        } = this.filters || {};
        // --- ここまでが修正箇所 ---
        const { min: minAgeFilter, max: maxAgeFilter } = this.displayOptions.ageRange;
        const { min: minTenureFilter, max: maxTenureFilter } = this.displayOptions.tenureRange;

        // 年度フィルターが選択されているかチェック
        const yearFilterActive = years?.size > 0;

        return employees.filter(employee => {
            // 部署フィルター
            if (departments?.size > 0 && !departments.has(employee.departmentId)) return false;
            
            // 所属班フィルター
            if (teams?.size > 0 && employee.teamId && !teams.has(employee.teamId)) return false;

            // 新卒/中途フィルター
            if (recruitTypes?.size > 0 && recruitTypes.size < 2) { // どちらか一方のみ選択された場合
                let isNewGraduate = false;
                try {
                    if (employee.birthdate && employee.joinDate) {
                        const birthDate = new Date(employee.birthdate);
                        const joinDate = new Date(employee.joinDate);
                        
                        if (!isNaN(birthDate.getTime()) && !isNaN(joinDate.getTime())) {
                            let joinAge = joinDate.getFullYear() - birthDate.getFullYear();
                            const birthMonth = birthDate.getMonth();
                            const birthDay = birthDate.getDate();
                            const joinMonth = joinDate.getMonth();
                            const joinDay = joinDate.getDate();
                            if (joinMonth < birthMonth || (joinMonth === birthMonth && joinDay < birthDay)) {
                                joinAge--;
                            }
                            isNewGraduate = joinAge <= 22;
                        }
                    }
                } catch (e) {
                    console.warn(`Error calculating recruit type for employee ${employee.id}:`, e);
                }
                
                const matchesFilter = 
                    (recruitTypes.has('new-graduate') && isNewGraduate) || 
                    (recruitTypes.has('mid-career') && !isNewGraduate);
                
                if (!matchesFilter) return false;
            }

            // 年齢フィルター (Listbox + Slider)
            let age = NaN;
            if (employee.birthdate) {
                try {
                    const birthDate = new Date(employee.birthdate);
                    if (!isNaN(birthDate.getTime())) {
                        const birthYear = birthDate.getFullYear();
                        age = currentYear - birthYear;
                        const ageGroup = age < 20 ? '10s' : age < 30 ? '20s' : age < 40 ? '30s' : age < 50 ? '40s' : age < 60 ? '50s' : '60s';
                        if (ageGroups?.size > 0 && !ageGroups.has(ageGroup)) return false;
                        if (age < minAgeFilter || age > maxAgeFilter) return false;
                    } else {
                        if (ageGroups?.size < 6 || minAgeFilter !== 18 || maxAgeFilter !== 65) return false;
                    }
                } catch (e) {
                    console.warn(`Invalid date format for employee ${employee.id}: ${employee.birthdate}`);
                    if (ageGroups?.size < 6 || minAgeFilter !== 18 || maxAgeFilter !== 65) return false;
                }
            } else {
                if (ageGroups?.size < 6 || minAgeFilter !== 18 || maxAgeFilter !== 65) return false;
            }

            // 勤続年数フィルター (Listbox + Slider)
            let tenure = NaN;
            if (employee.joinDate) {
                try {
                    const joinDate = new Date(employee.joinDate);
                    if (!isNaN(joinDate.getTime())) {
                        const joinYear = joinDate.getFullYear();
                        tenure = currentYear - joinYear;
                        let tenureGroup = '';
                        if (tenure <= 5) tenureGroup = '0-5';
                        else if (tenure <= 10) tenureGroup = '6-10';
                        else if (tenure <= 15) tenureGroup = '11-15';
                        else if (tenure <= 20) tenureGroup = '16-20';
                        else if (tenure <= 30) tenureGroup = '21-30';
                        else tenureGroup = '31-';
                        if (tenureGroups?.size > 0 && !tenureGroups.has(tenureGroup)) return false;
                        if (tenure < minTenureFilter || tenure > maxTenureFilter) return false;
                    } else {
                        if (tenureGroups?.size < 6 || minTenureFilter !== 0 || maxTenureFilter !== 50) return false;
                    }
                } catch (e) {
                    console.warn(`Invalid date format for employee ${employee.id}: ${employee.joinDate}`);
                    if (tenureGroups?.size < 6 || minTenureFilter !== 0 || maxTenureFilter !== 50) return false;
                }
            } else {
                if (tenureGroups?.size < 6 || minTenureFilter !== 0 || maxTenureFilter !== 50) return false;
            }

            // 役職フィルター
            const employeePosition = employee.position || '';
            if (positions?.size > 0 && !positions.has(employeePosition)) {
                return false;
            }

            // 年度フィルターを適用
            if (yearFilterActive) {
                const employeeEvals = this.appData.getEmployeeEvaluations(employee.id);
                // 評価が1件以上ある場合のみ年度フィルターを適用
                if (employeeEvals.length > 0) {
                    const hasEvalInSelectedYears = employeeEvals.some(evaluation => years.has(evaluation.year));
                    if (!hasEvalInSelectedYears) return false;
                }
            }

            // Grade filter (based on evaluations matching year filter)
            if (grades?.size > 0 && grades.size < this.allGradeOptionsCount) {
                const employeeEvals = this.appData.getEmployeeEvaluations(employee.id);
                // 評価が1件以上ある場合のみグレードフィルターを適用
                if (employeeEvals.length > 0) {
                    let latestGrade = null;
                    const filteredEvals = yearFilterActive 
                        ? employeeEvals.filter(evaluation => years.has(evaluation.year))
                        : employeeEvals;
                    if (filteredEvals.length > 0) {
                        const sortedEvals =[...filteredEvals].sort((a, b) => b.year - a.year);
                        latestGrade = sortedEvals[0].grade;
                    }
                    if (latestGrade === null || !grades.has(latestGrade)) return false;
                }
            }

            // Evaluation type filter (based on evaluations matching year filter)
            if (evaluationTypes?.size > 0 && evaluationTypes.size < this.allEvalTypeOptionsCount) {
                const employeeEvals = this.appData.getEmployeeEvaluations(employee.id);
                // 評価が1件以上ある場合のみ評価タイプフィルターを適用
                if (employeeEvals.length > 0) {
                    const filteredEvals = yearFilterActive
                        ? employeeEvals.filter(evaluation => years.has(evaluation.year))
                        : employeeEvals;
                    if (filteredEvals.length === 0) return false;
                    const sortedEvals = [...filteredEvals].sort((a, b) => b.year - a.year);
                    const latestEval = sortedEvals[0];
                    if (!latestEval || !latestEval.yearlyEvaluation) return false;
                    const evalType = latestEval.yearlyEvaluation.charAt(0).toUpperCase();
                    if (!evaluationTypes.has(evalType)) return false;
                }
            }

            // 契約形態フィルタ
            if (contractTypes?.size > 0 && !contractTypes.has(employee.contractType || 'full-time')) {
                return false;
            }

            // Sidebar search filter
            if (searchTerm && !employee.name.toLowerCase().includes(searchTerm)) return false;

            return true;
        });
    }

    refreshEmployeeSelectList() {
        const filteredEmployees = this.getFilteredEmployees();
        this.appUI.updateEmployeeSelectList(filteredEmployees, this.selectedEmployeeIds);
    }

    refreshChart() {
        const filteredEmployees = this.getFilteredEmployees();
        // Filter selected IDs to only include those that are still visible after filtering
        const employeesToDisplayIds = this.selectedEmployeeIds.filter(id =>
            filteredEmployees.some(emp => emp.id === id)
        );
        const targetIds = employeesToDisplayIds; // Use the filtered selection for chart view
        const currentView = this.displayOptions.currentView;

        // 評価年度フィルターを取得
        const yearFilter = this.filters.years;

        // 年度フィルターが未選択の場合はすべてのチャートを空表示
        if (yearFilter.size === 0 && currentView !== 'star-chart') { // 星取表は年度フィルター無視
            const emptyMessage = `<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象がありません</h3><p>年度フィルターを選択してください。少なくとも1つの年度を選択する必要があります。</p></div>`;
            this.appUI.renderEmptyChart(document.getElementById('chartContainer'), emptyMessage);
            return;
        }

        const employeesForAggregateViews = filteredEmployees;

        switch (currentView) {
            case 'chart':
                if (targetIds.length > 0) {
                    this.appUI.renderEvaluationChart(targetIds, this.displayOptions.chartType, yearFilter);
                } else {
                    // Show specific message if selection is empty vs. no filter results
                    if (this.selectedEmployeeIds.length > 0 && targetIds.length === 0) {
                        this.appUI.renderEmptyChart(document.getElementById('chartContainer'), `<div class="empty-chart"><i class="fas fa-filter"></i><h3>選択中の社員がいません</h3><p>現在のフィルター条件により、選択された社員が表示できません。フィルターを調整するか、別の社員を選択してください。</p></div>`);
                    } else {
                         this.appUI.renderEmptyChart(document.getElementById('chartContainer')); // Default empty message
                    }
                }
                break;
            case 'department':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderDepartmentChart(employeesForAggregateViews, this.displayOptions.chartType, yearFilter);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象社員がいません</h3><p>フィルター条件を確認してください。</p></div>');
                }
                break;
            case 'team':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderTeamChart(employeesForAggregateViews, this.displayOptions.chartType, yearFilter);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象社員がいません</h3><p>フィルター条件を確認してください。</p></div>');
                }
                break;
            case 'matrix':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderMatrixDistributionChart(employeesForAggregateViews, yearFilter);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>');
                }
                break;
            case 'grade':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderGradeDistributionChart(employeesForAggregateViews, yearFilter);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>');
                }
                break;
            case 'age':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderAgeDistributionChart(employeesForAggregateViews, yearFilter);
                } else {
                     this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>分布表示対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>');
                }
                break;
            case 'career-path':
                if (employeesForAggregateViews.length > 0) {
                    this.appUI.renderCareerPathChart(employeesForAggregateViews, yearFilter);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), 
                        '<div class="empty-chart"><i class="fas fa-filter"></i><h3>分析対象がいません</h3><p>現在のフィルター条件に一致する社員がいません。</p></div>');
                }
                break;
            case 'salary-comparison':
                if (targetIds.length > 0) {
                    this.appUI.renderSalaryComparisonChart(targetIds, this.displayOptions.chartType, yearFilter);
                } else {
                    if (this.selectedEmployeeIds.length > 0 && targetIds.length === 0) {
                        this.appUI.renderEmptyChart(document.getElementById('chartContainer'), `<div class="empty-chart"><i class="fas fa-filter"></i><h3>選択中の社員がいません</h3><p>現在のフィルター条件により、選択された社員が表示できません。</p></div>`);
                    } else {
                         this.appUI.renderEmptyChart(document.getElementById('chartContainer'));
                    }
                }
                break;
            case 'star-chart':
                if (employeesForAggregateViews.length > 0) {
                    // this.displayOptions には starChartType が含まれている
                    this.appUI.renderStarChart(employeesForAggregateViews, yearFilter, this.displayOptions);
                } else {
                    this.appUI.renderEmptyChart(document.getElementById('chartContainer'), '<div class="empty-chart"><i class="fas fa-filter"></i><h3>表示対象社員がいません</h3><p>フィルター条件を確認してください。</p></div>');
                }
                break;
            default:
                this.appUI.renderEmptyChart(document.getElementById('chartContainer'));
        }
    }

    // ビュー切り替え
    changeView(view) {
        this.displayOptions.currentView = view;
        this.appUI.toggleToolbarOptionsForView(view);
        
        // 昇給比較ビューで無効な軸が選択されている場合は強制的に年齢軸にする
        if (view === 'salary-comparison') {
            if (this.displayOptions.chartType === 'grade' || this.displayOptions.chartType === 'year') {
                this.displayOptions.chartType = 'age';
                const chartTypeSelect = document.getElementById('chartTypeSelect');
                if (chartTypeSelect) chartTypeSelect.value = 'age';
            }
        }

        // 社員選択リストの表示/非表示を切り替え
        this.toggleEmployeeSelectVisibility(view === 'chart' || view === 'salary-comparison');
        
        // ビュー切り替え時にも現在の軸タイプに応じてスライダーの表示/非表示を更新する
        if (view === 'chart' || view === 'department' || view === 'team' || view === 'salary-comparison') {
            // チャート、部署別、班別、昇給比較ビューでは軸タイプに応じたスライダー表示
            const chartType = this.displayOptions.chartType;
            this.appUI.toggleAgeRangeSliderVisibility(chartType === 'age');
            this.appUI.toggleTenureRangeSliderVisibility(chartType === 'tenure');
        } else {
            // その他のビューではスライダーを非表示
            this.appUI.toggleAgeRangeSliderVisibility(false);
            this.appUI.toggleTenureRangeSliderVisibility(false);
        }

        // 星取表専用オプションの表示制御
        const starChartOptions = document.querySelector('.star-chart-options');
        const starChartOptionsDivider = document.querySelector('.star-chart-options-divider');
        
        const isStarChartView = (view === 'star-chart');
        if (starChartOptions) starChartOptions.style.display = isStarChartView ? 'flex' : 'none';
        if (starChartOptionsDivider) starChartOptionsDivider.style.display = isStarChartView ? '' : 'none';
    
        // チャートタイプセレクトボックスの有効/無効制御
        const chartTypeSelect = document.getElementById('chartTypeSelect');
        if (chartTypeSelect) {
            chartTypeSelect.disabled = isStarChartView; // 星取表ビューでは表示形式選択を無効化
        }
        
        this.refreshChart();
    }

    // 社員選択リストの表示/非表示を切り替えるメソッドを追加
    toggleEmployeeSelectVisibility(visible) {
        const employeeSelectList = document.querySelector('.employee-select-list');
        if (employeeSelectList) {
            employeeSelectList.style.display = visible ? 'block' : 'none';
        }
    }

    updateAgeRange(ageRange) {
        this.displayOptions.ageRange = ageRange;
        this.refreshData(); // Refresh lists and chart based on new age range filter
    }

    updateTenureRange(tenureRange) {
        this.displayOptions.tenureRange = tenureRange;
        this.refreshData(); // Refresh lists and chart based on new tenure range filter
    }

    getSelectedEmployeeIds() { return this.selectedEmployeeIds; }
    getDisplayOptions() { return this.displayOptions; }

    // --- ヘルパーメソッド ---
    // These seem primarily UI related, might live better in AppUI but okay here for now
    populateDepartmentOptions() { this.appUI.populateDepartmentOptions(document.getElementById('employeeDepartment')); }
    populatePositionOptions() { this.appUI.populatePositionOptions(document.getElementById('employeePosition')); this.appUI.populatePositionOptions(document.getElementById('evaluationPosition')); }
    populateTeamOptions() { this.appUI.populateTeamOptions(document.getElementById('employeeTeam')); }
}

// アプリケーションの初期化 (非同期)
document.addEventListener('DOMContentLoaded', async () => {
    window.hrApp = new AppController();
    await window.hrApp.init();
});