/**
 * データモデル - 人事評定視覚化アプリケーション
 * 年度評価(A/B/C評価)の管理機能追加修正版
 */
class AppData {
    constructor() {
        // ストレージキー
        this.STORAGE_KEY = 'hr_evaluation_app_data_v6_contract_type';
        this.DB_NAME = 'HREvaluationDB';
        this.STORE_NAME = 'app_store';

        // デフォルトデータ構造 (v5: 所属班追加)
        this.defaultData = {
            departments: [
                { id: 1, name: '鋳造課' },
                { id: 2, name: '熱延課' },
                { id: 3, name: '冷延課' },
                { id: 4, name: '仕上課' },
                { id: 5, name: '保全課' },
                { id: 6, name: '購買管理課' },
                { id: 7, name: '管理室' },
                { id: 8, name: '事務課' },
                { id: 9, name: '技術室' },
                { id: 10, name: '加工製品化グループ' },
                { id: 11, name: '生産管理課' },
                { id: 12, name: '品質保証課' },
                { id: 13, name: '梱包課' }
            ],
            positions: [
                { id: 1, name: '班長' },
                { id: 2, name: '作業長' },
                { id: 3, name: '組長' },
                { id: 4, name: 'エルダー' },
                { id: 5, name: '一般' } 
            ],
            // 所属班を追加
            teams: [
                { id: 1, name: 'TLV/CAL' },
                { id: 2, name: 'FS/CF' },
                { id: 3, name: 'LS/DL' }
            ],
            // Grades are fixed G1-G12, no need to store explicitly unless customizable
            grades: Array.from({ length: 12 }, (_, i) => `G${i + 1}`),
            // Yearly evaluations are fixed A0-5, B0-10, C0-11
            yearlyEvaluations: {
                A: Array.from({ length: 6 }, (_, i) => `A${i}`), 
                B: Array.from({ length: 11 }, (_, i) => `B${i}`),
                C: Array.from({ length: 12 }, (_, i) => `C${i}`)
            },

            // 契約形態の定義
            contractTypes: [
                { id: 'full-time', name: '正社員' },
                { id: 'probation', name: '見習社員' },
                { id: 'contract', name: '契約社員' }, 
                { id: 'dispatch', name: '派遣社員' },
                { id: 'seconded', name: '出向社員' },
                { id: 'retired', name: '退職者' }
            ],

            employees: [], 
            evaluations: [], 

            // 資格マスタ
            qualifications: [],
            
            // 作業認定マスタ
            workCertifications: [],

            // 社員と資格・認定の関連付けデータ
            employeeQualifications: [],
            employeeWorkCertifications: [],

            settings: {
                defaultChartType: 'grade',
                defaultSortOrder: 'desc',
                showSampleDataBanner: true 
            },
            metadata: { 
            version: "6.2", // 契約形態対応バージョン 
            lastUpdated: new Date().toISOString()
            }
        };

        // サンプルデータジェネレーターを先に初期化
        this.sampleDataGenerator = new SampleDataGenerator(this);

// サンプルデータジェネレーターを先に初期化
        this.sampleDataGenerator = new SampleDataGenerator(this);

        // コンストラクタでの同期的な読み込みを削除。代わりに initDBAndLoadData() を非同期で呼び出す。
        this.data = JSON.parse(JSON.stringify(this.defaultData));
    }

    // IndexedDBの初期化とデータの読み込み
    async initDBAndLoadData() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this._loadFromIDB().then(resolve).catch(reject);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                this._fallbackLoad();
                resolve();
            };
        });
    }

    // IndexedDBからのデータ読み込みとlocalStorageからの移行
    async _loadFromIDB() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(this.STORAGE_KEY);

            request.onsuccess = () => {
                const storedData = request.result;
                if (storedData) {
                    try {
                        const parsedData = JSON.parse(storedData);
                        if (!parsedData.metadata || !parsedData.employees || !parsedData.evaluations) {
                            console.warn("Stored data seems incomplete or outdated. Resetting to default.");
                            this.data = JSON.parse(JSON.stringify(this.defaultData));
                        } else {
                            this.data = {
                                ...JSON.parse(JSON.stringify(this.defaultData)),
                                ...parsedData,
                                settings: { ...this.defaultData.settings, ...(parsedData.settings || {}) },
                                metadata: { ...this.defaultData.metadata, ...(parsedData.metadata || {}) }
                            };
                            console.log("Data loaded from IndexedDB.");
                        }
                    } catch (e) {
                        console.error('Error parsing stored data:', e);
                        this.data = JSON.parse(JSON.stringify(this.defaultData));
                    }
                    this.checkAndUpgradeData();
                } else {
                    // データがない場合、localStorageからの移行を試みる
                    const localData = localStorage.getItem(this.STORAGE_KEY);
                    if (localData) {
                        console.log("Migrating data from localStorage to IndexedDB");
                        try {
                            const parsedData = JSON.parse(localData);
                            this.data = {
                                ...JSON.parse(JSON.stringify(this.defaultData)),
                                ...parsedData,
                                settings: { ...this.defaultData.settings, ...(parsedData.settings || {}) },
                                metadata: { ...this.defaultData.metadata, ...(parsedData.metadata || {}) }
                            };
                            const storedGrades = localStorage.getItem('hrApp_grades');
                            if (storedGrades) this.data.grades = JSON.parse(storedGrades);

                            this.checkAndUpgradeData();
                            this.saveData(); // IndexedDBへ保存
                            
                            // 移行完了後にlocalStorageの古いデータを削除（安全性のため一旦コメントアウトで残す）
                            // localStorage.removeItem(this.STORAGE_KEY);
                        } catch(e) {
                            console.error('Migration error:', e);
                            this.data = JSON.parse(JSON.stringify(this.defaultData));
                            this.sampleDataGenerator.generateSampleData();
                        }
                    } else {
                        console.log("No data found. Initializing with sample data.");
                        this.data = JSON.parse(JSON.stringify(this.defaultData));
                        this.sampleDataGenerator.generateSampleData();
                    }
                }
                this._ensureArraysExist();
                resolve();
            };

            request.onerror = () => {
                this._fallbackLoad();
                resolve();
            };
        });
    }

    _fallbackLoad() {
        const storedData = localStorage.getItem(this.STORAGE_KEY);
        if (storedData) {
            try {
                this.data = { ...JSON.parse(JSON.stringify(this.defaultData)), ...JSON.parse(storedData) };
                this.checkAndUpgradeData();
            } catch (e) {
                this.data = JSON.parse(JSON.stringify(this.defaultData));
            }
        } else {
            this.data = JSON.parse(JSON.stringify(this.defaultData));
            this.sampleDataGenerator.generateSampleData();
        }
        this._ensureArraysExist();
    }

    _ensureArraysExist() {
        this.data.departments = this.data.departments ||[];
        this.data.positions = this.data.positions ||[];
        this.data.teams = this.data.teams || this.defaultData.teams;
        this.data.employees = this.data.employees ||[];
        this.data.evaluations = this.data.evaluations ||[];
        this.data.settings = this.data.settings || this.defaultData.settings;
        this.data.metadata = this.data.metadata || this.defaultData.metadata;
        this.data.contractTypes = this.data.contractTypes || [...this.defaultData.contractTypes];
        
        if (!this.data.yearlyEvaluations) {
            this.data.yearlyEvaluations = JSON.parse(JSON.stringify(this.defaultData.yearlyEvaluations));
        }
    }

    // データを保存 (IndexedDB 非同期保存)
    saveData() {
        try {
            this.data.metadata.lastUpdated = new Date().toISOString();
            const dataString = JSON.stringify(this.data);
            
            if (this.db) {
                const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                store.put(dataString, this.STORAGE_KEY);
                store.put(JSON.stringify(this.data.grades), 'hrApp_grades');

                transaction.onerror = (e) => console.error("IndexedDB save error:", e.target.error);
            } else {
                // DBが使えない場合のフォールバック
                localStorage.setItem(this.STORAGE_KEY, dataString);
                localStorage.setItem('hrApp_grades', JSON.stringify(this.data.grades));
            }
        } catch (e) {
             console.error("Error saving data:", e);
             alert(`データの保存中にエラーが発生しました:\n${e.message}\n大容量の顔写真データが制限を超えている可能性があります。`);
        }
    }

    // データの構造をチェックし、必要に応じて更新する
    checkAndUpgradeData() {
        const version = this.data.metadata?.version || "1.0";
        let needsUpgrade = false;
        let needsSave = false; // 追加

        // v3: 評価に部署ID(departmentId)を追加
        if (version < "3.0") {
            console.log("Upgrading data from version", version, "to 3.0");
            
            // 既存の評価データに部署IDを追加
            this.data.evaluations.forEach(evaluation => {
                if (!evaluation.departmentId) {
                    // 対象社員の部署IDを取得して設定
                    const employee = this.getEmployee(evaluation.employeeId);
                    if (employee) {
                        evaluation.departmentId = employee.departmentId;
                    } else {
                        // 社員が見つからない場合はデフォルトの部署IDを設定
                        evaluation.departmentId = 1; // 1番目の部署をデフォルトとする
                    }
                }
            });

            // バージョン更新
            this.data.metadata.version = "3.0";
            needsUpgrade = true;
        }

        // v4: 姓名分割
        if (version < "4.0") {
            console.log("Upgrading data from version", version, "to 4.0");
            
            // 既存の社員データから姓名を分割
            this.data.employees.forEach(employee => {
                if (!employee.firstName && !employee.lastName && employee.name) {
                    // 名前を姓と名に分割
                    const nameParts = employee.name.trim().split(/\s+/);
                    if (nameParts.length >= 2) {
                        // スペース区切りの最初の部分を姓、残りを名として扱う
                        employee.lastName = nameParts[0];
                        employee.firstName = nameParts.slice(1).join(' ');
                    } else {
                        // 分割できない場合は姓のみとして扱う
                        employee.lastName = employee.name;
                        employee.firstName = '';
                    }
                    // name フィールドは残しておくが、表示用の計算値として扱うようになる
                }
            });

            // バージョン更新
            this.data.metadata.version = "4.0";
            needsUpgrade = true;
        }

        // v5: 所属班の追加
        if (version < "5.0") {
            console.log("Upgrading data from version", version, "to 5.0");
            
            // teamsが存在しない場合は追加
            if (!this.data.teams) {
                this.data.teams = this.defaultData.teams;
            }
            
            // 既存の社員データに所属班IDを追加
            this.data.employees.forEach(employee => {
                if (employee.teamId === undefined) {
                    // ランダムに所属班を割り当て
                    const teams = this.data.teams;
                    if (teams && teams.length > 0) {
                        const randomIndex = Math.floor(Math.random() * teams.length);
                        employee.teamId = teams[randomIndex].id;
                    } else {
                        employee.teamId = null; // チームがない場合はnull
                    }
                }
            });
            
            // A評価をA0-A5に更新
            if (this.data.yearlyEvaluations && this.data.yearlyEvaluations.A && this.data.yearlyEvaluations.A.length === 5) {
                this.data.yearlyEvaluations.A = Array.from({ length: 6 }, (_, i) => `A${i}`);
            }

            // バージョン更新
            this.data.metadata.version = "5.0";
            needsUpgrade = true;
        }

        // v6.0: 資格・作業認定機能の追加
        const currentVersion = this.data.metadata?.version || "1.0"; // 修正: 変数定義追加
        if (currentVersion < "6.0") {
            console.log("Upgrading data to version 6.0 (adding qualification status and certification level)");
            // employeeQualifications に status を追加 (デフォルト: 'acquired')
            if (this.data.employeeQualifications) {
                this.data.employeeQualifications.forEach(eq => {
                    if (eq.status === undefined) {
                        eq.status = 'acquired'; // 既存データは取得済みとする
                    }
                });
            } else {
                this.data.employeeQualifications = [];
            }

            // employeeWorkCertifications に level を追加 (デフォルト: 'independent')
            if (this.data.employeeWorkCertifications) {
                this.data.employeeWorkCertifications.forEach(ewc => {
                    if (ewc.level === undefined) {
                        ewc.level = 'independent'; // 既存データは一人作業可とする
                    }
                });
            } else {
                this.data.employeeWorkCertifications = [];
            }
            
            this.data.metadata.version = "6.0";
            needsSave = true;
        }

        // v6.1: 資格・認定に年度フィールドを追加
        if (currentVersion < "6.1") {
            console.log("Upgrading data from version", currentVersion, "to 6.1");
            
            // 既存の資格割り当てデータに年度を追加
            if (this.data.employeeQualifications) {
                this.data.employeeQualifications.forEach(eq => {
                    if (eq.year === undefined) {
                        // 取得日から年度を推定、なければ現在年度
                        if (eq.dateAcquired) {
                            eq.year = new Date(eq.dateAcquired).getFullYear();
                        } else {
                            eq.year = new Date().getFullYear();
                        }
                    }
                });
            }
            
            // 既存の作業認定割り当てデータに年度を追加
            if (this.data.employeeWorkCertifications) {
                this.data.employeeWorkCertifications.forEach(ewc => {
                    if (ewc.year === undefined) {
                        // 取得日から年度を推定、なければ現在年度
                        if (ewc.dateAcquired) {
                            ewc.year = new Date(ewc.dateAcquired).getFullYear();
                        } else {
                            ewc.year = new Date().getFullYear();
                        }
                    }
                });
            }

            this.data.metadata.version = "6.1";
            needsUpgrade = true;
        }

        // v6.2: 契約形態の追加
        if (currentVersion < "6.2") {
            console.log("Upgrading data to version 6.2 (adding contractType)");
            if (!this.data.contractTypes || this.data.contractTypes.length === 0) { // 配列が空の場合もデフォルトを設定
                this.data.contractTypes = [...this.defaultData.contractTypes];
            }
            this.data.employees.forEach(employee => {
                if (employee.contractType === undefined) {
                    // 既存社員はデフォルトで「正社員」とする
                    employee.contractType = 'full-time';
                }
            });
            this.data.metadata.version = "6.2";
            needsSave = true;
        }

        // 他のバージョンアップグレードがあれば、ここに追加

        // 変更があれば保存
        if (needsUpgrade || needsSave) {
            this.saveData();
            console.log(`Data upgraded to version ${this.data.metadata.version}`);
        }
    }


    addEmployee(employeeData) {
        try {
            // 必須フィールドの検証
            if (!employeeData.lastName || !employeeData.firstName || !employeeData.birthdate || !employeeData.joinDate || !employeeData.departmentId) {
                console.error('必須フィールドが不足しています:', employeeData);
                return null;
            }

            // 社員番号の重複チェック（入力されている場合）
            if (employeeData.employeeNumber && employeeData.employeeNumber.trim()) {
                const existingEmployee = this.data.employees.find(emp => emp.employeeNumber === employeeData.employeeNumber.trim());
                if (existingEmployee) {
                    console.error('社員番号が既に存在します:', employeeData.employeeNumber);
                    return null;
                }
            }

            // IDの生成（既存の最大ID + 1）
            const maxId = this.data.employees.length > 0 ? Math.max(...this.data.employees.map(emp => emp.id)) : 0;
            const nextId = maxId + 1;

            // 姓名を結合して名前を作成
            const fullName = `${employeeData.lastName.trim()} ${employeeData.firstName.trim()}`.trim();

            // 新しい社員オブジェクトを作成
            const newEmployee = {
                id: nextId,
                employeeNumber: employeeData.employeeNumber ? employeeData.employeeNumber.trim() : '',
                lastName: employeeData.lastName.trim(),
                firstName: employeeData.firstName.trim(),
                name: fullName,
                birthdate: employeeData.birthdate,
                joinDate: employeeData.joinDate,
                departmentId: parseInt(employeeData.departmentId),
                teamId: employeeData.teamId ? parseInt(employeeData.teamId) : null,
                position: employeeData.position || '', // 文字列として保存
                contractType: employeeData.contractType || 'full-time', // 追加: 契約形態
                notes: employeeData.notes || '',
                // 顔写真（データ層側でコピーを保持し、フォーム側の配列と共有しない）
                photos: Array.isArray(employeeData.photos) ? [...employeeData.photos] : [],
                displayPhotoId: employeeData.displayPhotoId || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // データ検証
            const department = this.getDepartment(newEmployee.departmentId);
            if (!department) {
                console.error('指定された部署が存在しません:', newEmployee.departmentId);
                return null;
            }

            if (newEmployee.teamId) {
                const team = this.getTeam(newEmployee.teamId);
                if (!team) {
                    console.error('指定された所属班が存在しません:', newEmployee.teamId);
                    return null;
                }
            }

            // 契約形態の検証
            const contractTypes = this.getContractTypes();
            const validContractType = contractTypes.find(ct => ct.id === newEmployee.contractType);
            if (!validContractType) {
                console.error('指定された契約形態が存在しません:', newEmployee.contractType);
                return null;
            }

            // 配列に追加
            this.data.employees.push(newEmployee);
            
            // データを保存
            this.saveData();

            console.log('社員を追加しました:', newEmployee);
            return nextId;

        } catch (error) {
            console.error('社員追加エラー:', error);
            return null;
        }
    }

    updateEmployee(employeeData) {
        try {
            if (!employeeData.id) return false;
            
            const employeeIndex = this.data.employees.findIndex(emp => emp.id === employeeData.id);
            if (employeeIndex === -1) return false;
            
            const existingEmployee = this.data.employees[employeeIndex];
            
            // 社員番号の重複チェック
            if (employeeData.employeeNumber && employeeData.employeeNumber.trim()) {
                const duplicate = this.data.employees.find(emp => 
                    emp.id !== employeeData.id && emp.employeeNumber === employeeData.employeeNumber.trim()
                );
                if (duplicate) return false;
            }
            
            // 姓名の処理
            const lastName = employeeData.lastName !== undefined ? employeeData.lastName.trim() : existingEmployee.lastName;
            const firstName = employeeData.firstName !== undefined ? employeeData.firstName.trim() : existingEmployee.firstName;
            const fullName = `${lastName} ${firstName}`.trim();
            
            this.data.employees[employeeIndex] = {
                ...existingEmployee,
                employeeNumber: employeeData.employeeNumber !== undefined ? employeeData.employeeNumber.trim() : existingEmployee.employeeNumber,
                lastName: lastName,
                firstName: firstName,
                name: fullName,
                birthdate: employeeData.birthdate || existingEmployee.birthdate,
                joinDate: employeeData.joinDate || existingEmployee.joinDate,
                departmentId: employeeData.departmentId ? parseInt(employeeData.departmentId) : existingEmployee.departmentId,
                teamId: employeeData.teamId !== undefined ? (employeeData.teamId ? parseInt(employeeData.teamId) : null) : existingEmployee.teamId,
                position: employeeData.position !== undefined ? employeeData.position : existingEmployee.position,
                contractType: employeeData.contractType || existingEmployee.contractType,
                notes: employeeData.notes !== undefined ? employeeData.notes : existingEmployee.notes,
                // 顔写真（未指定なら既存を維持）
                photos: Array.isArray(employeeData.photos) ? [...employeeData.photos] : (existingEmployee.photos || []),
                displayPhotoId: employeeData.displayPhotoId !== undefined ? employeeData.displayPhotoId : (existingEmployee.displayPhotoId || null),
                updatedAt: new Date().toISOString()
            };
            
            this.saveData();
            return true;
        } catch (error) {
            console.error('社員更新エラー:', error);
            return false;
        }
    }

    // データオールクリア機能を追加（サンプルデータは生成しない）
    clearAllData() {
        try {
            // デフォルトデータの構造を維持しつつ、動的データをすべてクリア
            this.data = {
                ...JSON.parse(JSON.stringify(this.defaultData)), // デフォルトのマスタは保持（評価種別など）
                departments: [], // 部署をクリア
                positions: [],   // 役職をクリア
                teams: [],       // 所属班をクリア
                employees: [],   // 社員をクリア
                evaluations: [], // 評価をクリア
                qualifications: [], // 資格マスタをクリア
                workCertifications: [], // 作業認定マスタをクリア
                employeeQualifications: [], // 資格割り当てをクリア
                employeeWorkCertifications: [], // 認定割り当てをクリア
                settings: { // 設定は維持
                    ...this.defaultData.settings,
                    ...(this.data.settings || {})
                },
                metadata: { // メタデータ更新
                    ...this.defaultData.metadata,
                    lastUpdated: new Date().toISOString()
                }
            };
            
            // データを保存
            this.saveData();
            
            console.log("All data cleared. Sample data not generated.");
            return true;
        } catch (e) {
            console.error("Error clearing data:", e);
            return false;
        }
    }

    // サンプルデータを含むデータのリセット
    resetWithSampleData() {
        return this.sampleDataGenerator.resetWithSampleData();
    }

    // データエクスポート
    async exportData(exportMode = 'all') {
        try {
            let exportData;
            let fileNamePrefix = '人事評定_全データ';
            
            // エクスポートモードに応じてデータを準備
            switch (exportMode) {
                case 'master':
                    // マスタデータのみエクスポート
                    exportData = {
                        departments: this.data.departments,
                        positions: this.data.positions,
                        teams: this.data.teams,
                        grades: this.data.grades,
                        yearlyEvaluations: this.data.yearlyEvaluations,
                        settings: this.data.settings,
                        metadata: {
                            ...this.data.metadata,
                            exportType: 'master',
                            exportDate: new Date().toISOString()
                        }
                    };
                    fileNamePrefix = '人事評定_マスタデータ';
                    break;
                    
                case 'data':
                    // 登録データのみエクスポート
                    exportData = {
                        employees: this.data.employees,
                        evaluations: this.data.evaluations,
                        metadata: {
                            ...this.data.metadata,
                            exportType: 'data',
                            exportDate: new Date().toISOString()
                        }
                    };
                    fileNamePrefix = '人事評定_社員評価データ';
                    break;
                    
                case 'all':
                default:
                    // すべてのデータをエクスポート
                    exportData = {
                        ...this.data,
                        metadata: {
                            ...this.data.metadata,
                            exportType: 'all',
                            exportDate: new Date().toISOString()
                        }
                    };
                    fileNamePrefix = '人事評定_全データ';
                    break;
            }
            
            const jsonData = JSON.stringify(exportData, null, 2);
            
            // 日付形式を日本語的なYYYY-MM-DD形式に変更
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            const baseName = `${fileNamePrefix}_${formattedDate}`;
            
            // ZIP形式で出力（JSONをそのまま格納するため、解凍すれば従来と同じ内容を参照できる）
            const blob = await ZipArchive.create([{ name: `${baseName}.json`, content: jsonData }]);
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}.zip`;
            
            // アンカー要素の追加とクリックをセットで行い、すぐに削除
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // URL オブジェクトの解放（保存処理が始まる前に解放するとファイル名や内容が欠けるため遅延させる）
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            
            return true;
        } catch (e) {
            console.error("Error exporting data:", e);
            alert(`データのエクスポート中にエラーが発生しました: ${e.message}`);
            return false;
        }
    }

    // データインポート（拡張版）
    importData(jsonData) {
        try {
            const parsedData = JSON.parse(jsonData);
            
            // 基本的な検証: オブジェクトであることだけ確認
            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('インポートされたデータが正しいJSON形式ではありません。');
            }
            
            // エクスポートタイプを確認（メタデータにある場合）
            const exportType = parsedData.metadata?.exportType || 'all';
            
            // タイプ別の検証と処理
            switch (exportType) {
                case 'master':
                    // マスタデータのみの検証
                    if (!Array.isArray(parsedData.departments) || 
                        !Array.isArray(parsedData.positions) || 
                        !Array.isArray(parsedData.teams) || 
                        typeof parsedData.settings !== 'object') {
                        throw new Error('マスタデータの形式が正しくありません。');
                    }
                    
                    // 既存データを保持しつつマスタデータのみを更新
                    this.data = {
                        ...this.data,
                        departments: parsedData.departments,
                        positions: parsedData.positions,
                        teams: parsedData.teams || this.defaultData.teams,
                        yearlyEvaluations: parsedData.yearlyEvaluations || this.data.yearlyEvaluations,
                        grades: parsedData.grades || this.data.grades,
                        settings: { ...this.data.settings, ...parsedData.settings },
                        metadata: { ...this.data.metadata, lastUpdated: new Date().toISOString() }
                    };
                    break;
                    
                case 'data':
                    // 登録データのみの検証
                    if (!Array.isArray(parsedData.employees) || 
                        !Array.isArray(parsedData.evaluations)) {
                        throw new Error('登録データの形式が正しくありません。');
                    }
                    
                    // マスタデータを保持しつつ登録データのみを更新
                    this.data = {
                        ...this.data,
                        employees: parsedData.employees,
                        evaluations: parsedData.evaluations,
                        metadata: { ...this.data.metadata, lastUpdated: new Date().toISOString() }
                    };
                    break;
                    
                case 'all':
                default:
                    // すべてのデータの検証（全体検証だけでなく個別フィールドも確認）
                    if (!Array.isArray(parsedData.departments) || 
                        !Array.isArray(parsedData.positions) || 
                        !Array.isArray(parsedData.employees) || 
                        !Array.isArray(parsedData.evaluations) || 
                        typeof parsedData.settings !== 'object') {
                        throw new Error('データ形式が正しくありません。必要なフィールドが不足しています。');
                    }
                    
                    // すべてのデータを上書き
                    this.data = {
                        ...parsedData,
                        // Teams配列が存在しない場合、デフォルトを追加
                        teams: parsedData.teams || this.defaultData.teams,
                        metadata: { 
                            ...parsedData.metadata, 
                            lastUpdated: new Date().toISOString() 
                        }
                    };
                    break;
            }
            
            // 互換性チェックと更新
            this.checkAndUpgradeData();
            
            // データ保存
            this.saveData();
            console.log(`Data imported successfully (type: ${exportType}).`);
            return true;
        } catch (e) {
            console.error('Import error:', e);
            alert(`データのインポートに失敗しました:\n${e.message}\n\nファイルが正しいJSON形式であり、必要なデータ構造を持っているか確認してください。`);
            return false;
        }
    }

    // データ構造の互換性チェックを拡張
    checkAndUpgradeData() {
        const version = this.data.metadata?.version || "1.0";
        let needsUpgrade = false;

        // 既存のアップグレードコード...

        // v6: 資格・作業認定機能の追加
        if (version < "6.0") {
            console.log("Upgrading data from version", version, "to 6.0");
            
            // 資格・作業認定の配列を追加
            if (!this.data.qualifications) {
                this.data.qualifications = [];
            }
            
            if (!this.data.workCertifications) {
                this.data.workCertifications = [];
            }
            
            // 社員と資格・認定の関連付けデータを追加
            if (!this.data.employeeQualifications) {
                this.data.employeeQualifications = [];
            }
            
            if (!this.data.employeeWorkCertifications) {
                this.data.employeeWorkCertifications = [];
            }

            // バージョン更新
            this.data.metadata.version = "6.0";
            needsUpgrade = true;
        }

        // 変更があれば保存
        if (needsUpgrade) {
            this.saveData();
            console.log(`Data upgraded to version ${this.data.metadata.version}`);
        }
    }

    // 資格取得メソッド
    getQualifications() {
        return this.data.qualifications || [];
    }

    // 作業認定取得メソッド
    getWorkCertifications() {
        return this.data.workCertifications || [];
    }

    // 社員の保有資格取得メソッド
    getEmployeeQualifications(employeeId) {
        return (this.data.employeeQualifications || []).filter(eq => eq.employeeId === employeeId);
    }

    // 社員の作業認定取得メソッド
    getEmployeeWorkCertifications(employeeId) {
        return (this.data.employeeWorkCertifications || []).filter(ewc => ewc.employeeId === employeeId);
    }

    getEmployeeQualificationById(assignmentId) {
        return (this.data.employeeQualifications || []).find(eq => eq.id === assignmentId);
    }

    getEmployeeCertificationById(assignmentId) {
        return (this.data.employeeWorkCertifications || []).find(ewc => ewc.id === assignmentId);
    }

    // 資格追加メソッド
    addQualification(qualificationData) {
        // IDが既に設定されている場合はそれを使用、なければ新規ID生成
        const id = qualificationData.id || this._generateQualificationId();
        
        const newQualification = {
            id,
            name: qualificationData.name,
            category: qualificationData.category || '', // カテゴリがなければ空文字
            description: qualificationData.description || '',
            validMonths: parseInt(qualificationData.validMonths) || 0,
            issuer: qualificationData.issuer || ''
        };
        
        this.data.qualifications.push(newQualification);
        this.saveData();
        return id;
    }

    // 作業認定追加メソッド
    addWorkCertification(certificationData) {
        // IDが既に設定されている場合はそれを使用、なければ新規ID生成
        const id = certificationData.id || this._generateWorkCertificationId();
        
        const newCertification = {
            id,
            name: certificationData.name,
            category: certificationData.category || '',
            classification: certificationData.classification || '', // 区分がなければ空文字
            description: certificationData.description || '',
            validMonths: parseInt(certificationData.validMonths) || 0,
            requiredTraining: certificationData.requiredTraining || ''
        };
        
        this.data.workCertifications.push(newCertification);
        this.saveData();
        return id;
    }

    // 資格割り当てメソッド
    assignQualificationToEmployee(employeeId, qualificationId, dateAcquired, expiryDate, notes, status = 'acquired', year = null) {
        const id = this._getNextId(this.data.employeeQualifications);
        
        const assignment = {
            id,
            employeeId,
            qualificationId,
            year: year || new Date().getFullYear(), // 年度を追加
            dateAcquired,
            expiryDate,
            notes: notes || '',
            status: status
        };
        
        this.data.employeeQualifications.push(assignment);
        this.saveData();
        return id;
    }

    // 作業認定割り当てメソッド
    assignWorkCertificationToEmployee(employeeId, certificationId, dateAcquired, expiryDate, notes, level = 'independent', year = null) {
        const id = this._getNextId(this.data.employeeWorkCertifications);
        
        const assignment = {
            id,
            employeeId,
            certificationId,
            year: year || new Date().getFullYear(), // 年度を追加
            dateAcquired,
            expiryDate,
            notes: notes || '',
            level: level // 'expert_trainer', 'independent', 'supervised', 'in_training', 'planned'
        };
        
        this.data.employeeWorkCertifications.push(assignment);
        this.saveData();
        return id;
    }

    // 年度別取得メソッドを追加
    getEmployeeQualificationsByYear(employeeId, year) {
        return (this.data.employeeQualifications || []).filter(eq => 
            eq.employeeId === employeeId && eq.year === year
        );
    }

    getEmployeeWorkCertificationsByYear(employeeId, year) {
        return (this.data.employeeWorkCertifications || []).filter(ewc => 
            ewc.employeeId === employeeId && ewc.year === year
        );
    }

    // 資格の更新メソッド
    updateQualification(qualificationData) {
        const index = this.data.qualifications.findIndex(q => q.id === qualificationData.id);
        if (index !== -1) {
            this.data.qualifications[index] = {
                ...this.data.qualifications[index],
                ...qualificationData
            };
            this.saveData();
            return true;
        }
        return false;
    }

    // 作業認定の更新メソッド
    updateWorkCertification(certificationData) {
        const index = this.data.workCertifications.findIndex(c => c.id === certificationData.id);
        if (index !== -1) {
            this.data.workCertifications[index] = {
                ...this.data.workCertifications[index],
                ...certificationData
            };
            this.saveData();
            return true;
        }
        return false;
    }

    // 社員の資格割り当ての更新メソッド
    updateEmployeeQualification(assignmentData) {
        const index = this.data.employeeQualifications.findIndex(eq => eq.id === assignmentData.id);
        if (index !== -1) {
            this.data.employeeQualifications[index] = {
                ...this.data.employeeQualifications[index], // 既存のデータを保持
                ...assignmentData // 更新するデータで上書き
            };
            // status が assignmentData に含まれていなければ、既存の status を維持
            if (assignmentData.status === undefined && this.data.employeeQualifications[index].status === undefined) {
                 this.data.employeeQualifications[index].status = 'acquired'; // デフォルト
            }
            this.saveData();
            return true;
        }
        return false;
    }

    // 社員の作業認定割り当ての更新メソッド
    updateEmployeeWorkCertification(assignmentData) {
        const index = this.data.employeeWorkCertifications.findIndex(ewc => ewc.id === assignmentData.id);
        if (index !== -1) {
            this.data.employeeWorkCertifications[index] = {
                ...this.data.employeeWorkCertifications[index], // 既存のデータを保持
                ...assignmentData // 更新するデータで上書き
            };
            // level が assignmentData に含まれていなければ、既存の level を維持
            if (assignmentData.level === undefined && this.data.employeeWorkCertifications[index].level === undefined) {
                this.data.employeeWorkCertifications[index].level = 'independent'; // デフォルト
            }
            // year が assignmentData に含まれていなければ、現在年度をデフォルト
            if (assignmentData.year === undefined && this.data.employeeWorkCertifications[index].year === undefined) {
                this.data.employeeWorkCertifications[index].year = new Date().getFullYear();
            }
            this.saveData();
            return true;
        }
        return false;
    }

    // 資格IDの生成ヘルパー
    _generateQualificationId() {
        let maxIdNum = 0;
        
        this.data.qualifications.forEach(qualification => {
            let idNum = 0;
            const id = String(qualification.id);
            
            // "Q001"形式の場合
            const qPattern = /^Q(\d+)$/;
            if (qPattern.test(id)) {
                const match = id.match(qPattern);
                idNum = parseInt(match[1], 10);
            }
            // 数値形式の場合
            else if (/^\d+$/.test(id)) {
                idNum = parseInt(id, 10);
            }
            
            maxIdNum = Math.max(maxIdNum, idNum);
        });
        
        // 既存データに"Q"形式があるかチェック
        const hasQFormat = this.data.qualifications.some(q => /^Q\d+$/.test(String(q.id)));
        
        // 既存に"Q"形式があれば"Q"形式で生成、なければ数値で生成
        if (hasQFormat || this.data.qualifications.length === 0) {
            return `Q${(maxIdNum + 1).toString().padStart(3, '0')}`;
        } else {
            return maxIdNum + 1;
        }
    }

    // 作業認定IDの生成ヘルパー
    _generateWorkCertificationId() {
        let maxIdNum = 0;
        
        this.data.workCertifications.forEach(certification => {
            let idNum = 0;
            const id = String(certification.id);
            
            // "W001"形式の場合
            const wPattern = /^W(\d+)$/;
            if (wPattern.test(id)) {
                const match = id.match(wPattern);
                idNum = parseInt(match[1], 10);
            }
            // 数値形式の場合
            else if (/^\d+$/.test(id)) {
                idNum = parseInt(id, 10);
            }
            
            maxIdNum = Math.max(maxIdNum, idNum);
        });
        
        // 既存データに"W"形式があるかチェック
        const hasWFormat = this.data.workCertifications.some(w => /^W\d+$/.test(String(w.id)));
        
        // 既存に"W"形式があれば"W"形式で生成、なければ数値で生成
        if (hasWFormat || this.data.workCertifications.length === 0) {
            return `W${(maxIdNum + 1).toString().padStart(3, '0')}`;
        } else {
            return maxIdNum + 1;
        }
    }

    /**
     * 資格を削除
     * @param {string} qualificationId 資格ID
     * @returns {boolean} 削除成功時true
     */
    deleteQualification(qualificationId) {
        // 社員に割り当てられているかチェック
        const isAssigned = this.data.employeeQualifications.some(eq => eq.qualificationId === qualificationId);
        if (isAssigned) {
            console.warn(`Cannot delete qualification ${qualificationId} - it is assigned to employees`);
            return false;
        }
        
        const initialLength = this.data.qualifications.length;
        this.data.qualifications = this.data.qualifications.filter(q => q.id !== qualificationId);
        
        if (this.data.qualifications.length < initialLength) {
            this.saveData();
            return true;
        }
        return false; // 資格が見つからなかった
    }

    /**
     * 作業認定を削除
     * @param {string} certificationId 作業認定ID
     * @returns {boolean} 削除成功時true
     */
    deleteWorkCertification(certificationId) {
        // 社員に割り当てられているかチェック
        const isAssigned = this.data.employeeWorkCertifications.some(ewc => ewc.certificationId === certificationId);
        if (isAssigned) {
            console.warn(`Cannot delete work certification ${certificationId} - it is assigned to employees`);
            return false;
        }
        
        const initialLength = this.data.workCertifications.length;
        this.data.workCertifications = this.data.workCertifications.filter(c => c.id !== certificationId);
        
        if (this.data.workCertifications.length < initialLength) {
            this.saveData();
            return true;
        }
        return false; // 作業認定が見つからなかった
    }

    /**
     * 社員の資格割り当てを削除
     * @param {number} assignmentId 割り当てID
     * @returns {boolean} 削除成功時true
     */
    deleteEmployeeQualification(assignmentId) {
        const initialLength = this.data.employeeQualifications.length;
        this.data.employeeQualifications = this.data.employeeQualifications.filter(eq => eq.id !== assignmentId);
        
        if (this.data.employeeQualifications.length < initialLength) {
            this.saveData();
            return true;
        }
        return false; // 割り当てが見つからなかった
    }

    /**
     * 社員の作業認定割り当てを削除
     * @param {number} assignmentId 割り当てID
     * @returns {boolean} 削除成功時true
     */
    deleteEmployeeWorkCertification(assignmentId) {
        const initialLength = this.data.employeeWorkCertifications.length;
        this.data.employeeWorkCertifications = this.data.employeeWorkCertifications.filter(ewc => ewc.id !== assignmentId);
        
        if (this.data.employeeWorkCertifications.length < initialLength) {
            this.saveData();
            return true;
        }
        return false; // 割り当てが見つからなかった
    }

    // CSVファイルから資格マスタをインポートするメソッド
    importQualificationsFromCSV(csvData, overwrite = true) {
        try {
            const rows = this._parseCSV(csvData);
            if (rows.length < 2) return false; // ヘッダーのみはNG
    
            const header = rows[0].map(h => h.toLowerCase().trim());
            const expectedHeader = ['id', '資格名', '分類', '説明', '有効期間(月)', '発行機関'];
            // オプショナル: 'status'列
            const statusIndex = header.indexOf('status');
    
            // ヘッダー検証 (最低限の必須項目)
            if (expectedHeader.slice(0, 2).some(h => !header.includes(h))) { // IDと資格名は必須
                console.error("CSVヘッダーが不正です。ID, 資格名は必須です。", header);
                return false;
            }
    
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue; // IDと名前がない行はスキップ
    
                const qualificationData = {};
                header.forEach((colName, index) => {
                    switch (colName) {
                        case 'id': qualificationData.id = row[index]?.trim(); break;
                        case '資格名': qualificationData.name = row[index]?.trim(); break;
                        case '分類': qualificationData.category = row[index]?.trim(); break;
                        case '説明': qualificationData.description = row[index]?.trim(); break;
                        case '有効期間(月)': qualificationData.validMonths = parseInt(row[index], 10) || 0; break;
                        case '発行機関': qualificationData.issuer = row[index]?.trim(); break;
                    }
                });
    
                if (!qualificationData.id || !qualificationData.name) continue; // IDと名前は必須
    
                const existingIndex = this.data.qualifications.findIndex(q => q.id === qualificationData.id);
                if (existingIndex !== -1) {
                    if (overwrite) {
                        this.data.qualifications[existingIndex] = { ...this.data.qualifications[existingIndex], ...qualificationData };
                    }
                } else {
                    this.data.qualifications.push(qualificationData);
                }
            }
            this.saveData();
            return true;
        } catch (error) {
            console.error("Error importing qualifications from CSV:", error);
            return false;
        }
    }

    // CSVファイルから作業認定マスタをインポートするメソッド
    importWorkCertificationsFromCSV(csvData, overwrite = true) {
        try {
            const rows = this._parseCSV(csvData);
            if (rows.length < 2) return false;
    
            const header = rows[0].map(h => h.toLowerCase().trim());
            const expectedHeader = ['id', '作業名', '分類', '区分', '説明', '有効期間(月)', '必要研修'];
            // オプショナル: 'level'列
            const levelIndex = header.indexOf('level');
    
            if (expectedHeader.slice(0, 2).some(h => !header.includes(h))) {
                console.error("CSVヘッダーが不正です。ID, 作業名は必須です。", header);
                return false;
            }
    
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue;
    
                const certificationData = {};
                header.forEach((colName, index) => {
                    switch (colName) {
                        case 'id': certificationData.id = row[index]?.trim(); break;
                        case '作業名': certificationData.name = row[index]?.trim(); break;
                        case '分類': certificationData.category = row[index]?.trim(); break;
                        case '区分': certificationData.classification = row[index]?.trim(); break;
                        case '説明': certificationData.description = row[index]?.trim(); break;
                        case '有効期間(月)': certificationData.validMonths = parseInt(row[index], 10) || 0; break;
                        case '必要研修': certificationData.requiredTraining = row[index]?.trim(); break;
                    }
                });
    
                if (!certificationData.id || !certificationData.name) continue;
    
                const existingIndex = this.data.workCertifications.findIndex(w => w.id === certificationData.id);
                if (existingIndex !== -1) {
                    if (overwrite) {
                        this.data.workCertifications[existingIndex] = { ...this.data.workCertifications[existingIndex], ...certificationData };
                    }
                } else {
                    this.data.workCertifications.push(certificationData);
                }
            }
            this.saveData();
            return true;
        } catch (error) {
            console.error("Error importing work certifications from CSV:", error);
            return false;
        }
    }

    // 簡易CSVパーサー
    _parseCSV(csvText) {
        const lines = csvText.split(/\r\n|\n/);
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // シンプルなCSVパース（カンマ区切りで分割し、引用符を考慮）
            const values = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            
            values.push(currentValue); // 最後の値を追加
            result.push(values);
        }
        
        return result;
    }

    // --- Grade Master Management Methods (within AppData) ---
    addGrade(gradeName) {
        if (!this.data.grades.includes(gradeName)) {
            this.data.grades.push(gradeName);
            this.data.grades.sort((a, b) => {
                const numA = parseInt(a.replace('G', ''));
                const numB = parseInt(b.replace('G', ''));
                return numA - numB;
            });
            this.saveData();
            return true;
        }
        return false; // Already exists
    }

    updateGrade(oldGradeName, newGradeName) {
        const index = this.data.grades.indexOf(oldGradeName);
        if (index === -1) return false; // Old grade not found

        // New grade name already exists (and it's not the same as the old one being renamed)
        if (this.data.grades.includes(newGradeName) && newGradeName !== oldGradeName) {
            return false;
        }

        // Check if the old grade is in use by any evaluations
        const evaluations = this.getEvaluations();
        const isUsed = evaluations.some(evaluation => evaluation.grade === oldGradeName);
        if (isUsed) {
            // If grade is in use, only allow renaming if new name is not conflicting
            // But generally, disallow if in use to prevent data integrity issues
            // For simplicity here, let's assume we disallow if in use and old/new are different.
            // If old and new are same, it's not really an update.
            if (oldGradeName !== newGradeName) {
                    console.warn(`Grade ${oldGradeName} is in use and cannot be renamed to ${newGradeName}.`);
                    return false;
            }
        }

        this.data.grades[index] = newGradeName;
        this.data.grades.sort((a, b) => {
            const numA = parseInt(a.replace('G', ''));
            const numB = parseInt(b.replace('G', ''));
            return numA - numB;
        });

        // If grade name changed, update all evaluations that used the old grade name
        if (oldGradeName !== newGradeName) {
            this.data.evaluations.forEach(evaluation => {
                if (evaluation.grade === oldGradeName) {
                    evaluation.grade = newGradeName;
                }
            });
        }
        this.saveData();
        return true;
    }

    deleteGrade(gradeName) {
        const isUsed = this.data.evaluations.some(evaluation => evaluation.grade === gradeName);
        if (isUsed) return false; // Cannot delete if in use
        this.data.grades = this.data.grades.filter(g => g !== gradeName);
        this.saveData();
        return true;
    }
    
    getContractTypes() {
        return this.data.contractTypes || []; // contractTypes が未定義の場合は空配列を返す
    }

    getDepartments() {
        return this.data.departments || [];
    }

    getPositions() {
        return this.data.positions || [];
    }
    
    // 所属班取得メソッド追加
    getTeams() {
        return this.data.teams || [];
    }

    getPosition(id) {
        // 数値IDと文字列ID（名前）の両方で検索できるようにする
        return this.data.positions.find(p => p.id == id || p.name === id);
    }
    
    getDepartment(id) {
        return this.data.departments.find(d => d.id == id); // IDは数値の可能性
    }
    
    getTeam(id) {
        return this.data.teams.find(t => t.id == id); // IDは数値の可能性
    }
    
    getQualification(id) {
        return this.data.qualifications.find(q => q.id === id);
    }
    
    getWorkCertification(id) {
        return this.data.workCertifications.find(wc => wc.id === id);
    }

    getEmployees() {
        return this.data.employees.map(emp => {
            // 計算プロパティとしての name を追加
            return {
                ...emp,
                name: `${emp.lastName || ''} ${emp.firstName || ''}`.trim()
            };
        });
    }

    getEvaluations() {
        return this.data.evaluations || [];
    }

    getSettings() {
        return this.data.settings || { ...this.defaultData.settings };
    }

    getGradeOptions() {
        return this.data.grades || [...this.defaultData.grades];
    }

    getYearlyEvaluationOptions() {
        // 保存されている年度評価データを返す
        return this.data.yearlyEvaluations || this.defaultData.yearlyEvaluations;
    }

    getEmployee(id) {
        const employee = this.data.employees.find(e => e.id === id);
        if (employee) {
            // 計算プロパティとしての name を追加
            return {
                ...employee,
                name: `${employee.lastName || ''} ${employee.firstName || ''}`.trim()
            };
        }
        return null;
    }

    getEmployeeEvaluations(employeeId) {
        // Sort by year ascending by default for easier processing later
        return this.data.evaluations
            .filter(e => e.employeeId === employeeId)
            .sort((a, b) => a.year - b.year);
    }

    getEvaluation(id) {
        return this.data.evaluations.find(e => e.id === id);
    }

    getEmployeesByDepartment(departmentId) {
        return this.getEmployees().filter(e => e.departmentId === departmentId);
    }
    
    // 所属班で社員をフィルタリングするメソッド追加
    getEmployeesByTeam(teamId) {
        return this.getEmployees().filter(e => e.teamId === teamId);
    }

    // --- Year Evaluation Methods ---
    addYearlyEvaluation(type, evalName) {
        // 型の検証
        if (!['A', 'B', 'C'].includes(type)) {
            console.error(`Invalid evaluation type: ${type}`);
            return false;
        }
        
        // 名前の検証（正規表現: A, B, Cで始まり、数字が続く）
        const validPattern = new RegExp(`^${type}\\d+$`);
        if (!validPattern.test(evalName)) {
            console.error(`Invalid evaluation name format: ${evalName}, expected ${type} followed by numbers`);
            return false;
        }
        
        // 重複チェック
        if (this.data.yearlyEvaluations[type].includes(evalName)) {
            console.error(`Evaluation ${evalName} already exists`);
            return false;
        }
        
        // 配列に追加
        this.data.yearlyEvaluations[type].push(evalName);
        
        // 数字順にソート
        this.data.yearlyEvaluations[type].sort((a, b) => {
            const aNum = parseInt(a.substring(1));
            const bNum = parseInt(b.substring(1));
            return aNum - bNum;
        });
        
        // データ保存
        this.saveData();
        return true;
    }

    updateYearlyEvaluation(type, oldEvalName, newEvalName) {
        // 型の検証
        if (!['A', 'B', 'C'].includes(type)) {
            console.error(`Invalid evaluation type: ${type}`);
            return false;
        }
        
        // 新しい名前の検証
        const validPattern = new RegExp(`^${type}\\d+$`);
        if (!validPattern.test(newEvalName)) {
            console.error(`Invalid evaluation name format: ${newEvalName}, expected ${type} followed by numbers`);
            return false;
        }
        
        // 重複チェック（古い名前と同じ場合を除く）
        if (oldEvalName !== newEvalName && this.data.yearlyEvaluations[type].includes(newEvalName)) {
            console.error(`Evaluation ${newEvalName} already exists`);
            return false;
        }
        
        // インデックスを取得
        const index = this.data.yearlyEvaluations[type].indexOf(oldEvalName);
        if (index === -1) {
            console.error(`Evaluation ${oldEvalName} not found`);
            return false;
        }
        
        // 評価が使用されていないか確認
        const isInUse = this.data.evaluations.some(e => e.yearlyEvaluation === oldEvalName);
        if (isInUse) {
            console.error(`Cannot update evaluation ${oldEvalName} because it is in use`);
            return false;
        }
        
        // 更新
        this.data.yearlyEvaluations[type][index] = newEvalName;
        
        // 数字順にソート
        this.data.yearlyEvaluations[type].sort((a, b) => {
            const aNum = parseInt(a.substring(1));
            const bNum = parseInt(b.substring(1));
            return aNum - bNum;
        });
        
        // データ保存
        this.saveData();
        return true;
    }

    deleteYearlyEvaluation(type, evalName) {
        // 型の検証
        if (!['A', 'B', 'C'].includes(type)) {
            console.error(`Invalid evaluation type: ${type}`);
            return false;
        }
        
        // インデックスを取得
        const index = this.data.yearlyEvaluations[type].indexOf(evalName);
        if (index === -1) {
            console.error(`Evaluation ${evalName} not found`);
            return false;
        }
        
        // 評価が使用されていないか確認
        const isInUse = this.data.evaluations.some(e => e.yearlyEvaluation === evalName);
        if (isInUse) {
            console.error(`Cannot delete evaluation ${evalName} because it is in use`);
            return false;
        }
        
        // 削除
        this.data.yearlyEvaluations[type].splice(index, 1);
        
        // データ保存
        this.saveData();
        return true;
    }

    // --- Data Modification Methods ---

    _getNextId(array) {
        if (!array || array.length === 0) {
            return 1;
        }
        return Math.max(...array.map(item => item.id)) + 1;
    }

    addDepartment(name) {
        const newId = this._getNextId(this.data.departments);
        const newDepartment = { id: newId, name: name.trim() };
        this.data.departments.push(newDepartment);
        this.saveData();
        return newId;
    }

    updateDepartment(id, name) {
        const department = this.data.departments.find(d => d.id == id);
        if (department) {
            department.name = name.trim();
            this.saveData();
            return true;
        }
        return false;
    }

    deleteDepartment(id) {
        const isInUse = this.data.employees.some(e => e.departmentId === id) || 
                        this.data.evaluations.some(e => e.departmentId === id);
        if (isInUse) {
            console.warn(`Attempted to delete department ${id} which is in use.`);
            return false; // Cannot delete if in use
        }
        const initialLength = this.data.departments.length;
        this.data.departments = this.data.departments.filter(d => d.id !== id);
        if (this.data.departments.length < initialLength) {
             this.saveData();
             return true;
        }
         return false; // Not found or not deleted
    }


    addPosition(name) {
        const newId = this._getNextId(this.data.positions);
        const newPosition = { id: newId, name: name.trim() };
        this.data.positions.push(newPosition);
        this.saveData();
        return newId;
    }

    // 所属班追加メソッド
    addTeam(name) {
        const newId = this._getNextId(this.data.teams);
        const newTeam = { id: newId, name: name.trim() };
        this.data.teams.push(newTeam);
        this.saveData();
        return newId;
    }
    
    // 所属班更新メソッド
    updateTeam(id, name) {
        const team = this.data.teams.find(t => t.id == id);
        if (team) {
            team.name = name.trim();
            this.saveData();
            return true;
        }
        return false;
    }
    
    // 所属班削除メソッド
    deleteTeam(id) {
        const isInUse = this.data.employees.some(e => e.teamId === id);
        if (isInUse) {
            console.warn(`Attempted to delete team ${id} which is in use.`);
            return false; // Cannot delete if in use
        }
        const initialLength = this.data.teams.length;
        this.data.teams = this.data.teams.filter(t => t.id !== id);
        if (this.data.teams.length < initialLength) {
            this.saveData();
            return true;
        }
        return false; // Not found or not deleted
    }


    deleteEmployee(id) {
        const initialEmployeeLength = this.data.employees.length;
        // Filter out the employee
        this.data.employees = this.data.employees.filter(e => e.id !== id);
        // Filter out their evaluations
        this.data.evaluations = this.data.evaluations.filter(e => e.employeeId !== id);

         // Check if deletion happened before saving
         if (this.data.employees.length < initialEmployeeLength) {
             this.saveData();
             return true;
         }
         return false; // Employee not found
    }


    addEvaluation(evaluationData) {
         // Check for duplicates (same employee, same year)
         const existing = this.data.evaluations.find(
             ev => ev.employeeId === evaluationData.employeeId && ev.year === evaluationData.year
         );
         if (existing) {
             console.warn(`Attempted to add duplicate evaluation for employee ${evaluationData.employeeId} in year ${evaluationData.year}.`);
             return null; // Indicate failure due to duplicate
         }

        const newId = this._getNextId(this.data.evaluations);
        const newEvaluation = {
            ...evaluationData, // Contains employeeId, year, age, tenure, grade, yearlyEvaluation, position, departmentId, notes
            id: newId
        };
        this.data.evaluations.push(newEvaluation);
        this.saveData();
        return newId;
    }

    updateEvaluation(evaluationData) {
         // Check for duplicates if year/employeeId changed (unlikely via UI, but possible)
         const existing = this.data.evaluations.find(
             ev => ev.employeeId === evaluationData.employeeId &&
                   ev.year === evaluationData.year &&
                   ev.id !== evaluationData.id // Exclude self
         );
         if (existing) {
             console.warn(`Attempted to update evaluation ${evaluationData.id} resulting in a duplicate for employee ${evaluationData.employeeId} in year ${evaluationData.year}.`);
             return false; // Indicate failure due to duplicate
         }

        const index = this.data.evaluations.findIndex(e => e.id === evaluationData.id);
        if (index !== -1) {
            this.data.evaluations[index] = { ...this.data.evaluations[index], ...evaluationData }; // Merge data
            this.saveData();
            return true;
        }
        return false; // Not found
    }

    deleteEvaluation(id) {
        const initialLength = this.data.evaluations.length;
        this.data.evaluations = this.data.evaluations.filter(e => e.id !== id);
         if (this.data.evaluations.length < initialLength) {
            this.saveData();
            return true;
         }
         return false; // Not found
    }


    updateSettings(newSettings) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        this.saveData();
    }

    // === 年度/グレード変化計算ヘルパー ===

    /**
     * 指定された従業員の指定年の評価が、それ以前から何年連続しているか計算する
     * @param {number} employeeId
     * @param {number} targetYear
     * @returns {number} 連続年数 (最低1年)
     */
    getConsecutiveYearsSameEvaluation(employeeId, targetYear) {
        const evaluations = this.getEmployeeEvaluations(employeeId) // year asc sorted
            .filter(e => e.year <= targetYear); // Only consider up to target year
        if (evaluations.length === 0) return 0;

        const targetEval = evaluations.find(e => e.year === targetYear); // Find the exact year
        if (!targetEval) return 0; // No evaluation for the target year

        const targetYearlyEval = targetEval.yearlyEvaluation;
        let consecutiveYears = 0;

        // Find the index of the target year's evaluation
        const targetIndex = evaluations.findIndex(e => e.year === targetYear);
        if (targetIndex === -1) return 0; // Should not happen if targetEval was found

        // Iterate backwards from the target evaluation
        for (let i = targetIndex; i >= 0; i--) {
             // Check if the year is consecutive (handle potential gaps in evaluations)
             if (i === targetIndex || evaluations[i].year === evaluations[i+1].year - 1) {
                if (evaluations[i].yearlyEvaluation === targetYearlyEval) {
                    consecutiveYears++;
                } else {
                    break; // Stop when evaluation differs
                }
             } else {
                 break; // Stop if there's a gap in years
             }
        }
        return consecutiveYears;
    }

    /**
     * 指定された従業員の指定年から見て、最後にグレードが変化したのが何年前か、その方向を返す
     * @param {number} employeeId
     * @param {number} targetYear
     * @returns {{yearsAgo: number, direction: 'up' | 'down'} | null} 変化情報 or null
     */
    getYearsSinceLastGradeChange(employeeId, targetYear) {
        const evaluations = this.getEmployeeEvaluations(employeeId) // year asc sorted
            .filter(e => e.year <= targetYear); // Only consider up to target year

        const targetIndex = evaluations.findIndex(e => e.year === targetYear);
        if (targetIndex < 1) return null; // Need at least one evaluation *before* the target year to detect change

        const targetEval = evaluations[targetIndex];
        const targetGrade = targetEval.grade;
        let lastChangeYear = -1;
        let previousGradeBeforeChange = null;

        // Iterate backwards from the evaluation *before* the target year
        for (let i = targetIndex - 1; i >= 0; i--) {
            if (evaluations[i].grade !== targetGrade) {
                // The change happened *after* this evaluation (i.e., in year evaluations[i].year + 1)
                lastChangeYear = evaluations[i].year + 1;
                previousGradeBeforeChange = evaluations[i].grade;
                break;
            }
        }

        if (lastChangeYear !== -1 && previousGradeBeforeChange) {
            const yearsAgo = targetYear - lastChangeYear; // Years since the change took effect

            // Determine direction by comparing numeric parts
            const targetGradeNum = parseInt(targetGrade.replace('G', ''));
            const prevGradeNum = parseInt(previousGradeBeforeChange.replace('G', ''));
            let direction = null;
            if (!isNaN(targetGradeNum) && !isNaN(prevGradeNum)) {
                 direction = targetGradeNum > prevGradeNum ? 'up' : 'down';
            }

             // Only return if direction could be determined
             if(direction) {
                 return { yearsAgo, direction };
             }
        }

        return null; // No change found before target year
    }

    /**
     * 指定された従業員の指定年のグレードが、それ以前から何年連続しているか計算する
     * @param {number} employeeId
     * @param {number} targetYear
     * @returns {number} 連続年数 (最低1年)
     */
    getConsecutiveYearsSameGrade(employeeId, targetYear) {
        const evaluations = this.getEmployeeEvaluations(employeeId) // year asc sorted
            .filter(e => e.year <= targetYear); // Only consider up to target year
        if (evaluations.length === 0) return 0;

        const targetEval = evaluations.find(e => e.year === targetYear); // Find the exact year
        if (!targetEval) return 0; // No evaluation for the target year

        const targetGrade = targetEval.grade;
        let consecutiveYears = 0;

        // Find the index of the target year's evaluation
        const targetIndex = evaluations.findIndex(e => e.year === targetYear);
        if (targetIndex === -1) return 0; // Should not happen if targetEval was found

        // Iterate backwards from the target evaluation
        for (let i = targetIndex; i >= 0; i--) {
            // Check if the year is consecutive (handle potential gaps in evaluations)
            if (i === targetIndex || evaluations[i].year === evaluations[i+1].year - 1) {
                if (evaluations[i].grade === targetGrade) {
                    consecutiveYears++;
                } else {
                    break; // Stop when grade differs
                }
            } else {
                break; // Stop if there's a gap in years
            }
        }
        return consecutiveYears;
    }   

    // --- Utility Methods ---

    getLatestEmployeeEvaluation(employeeId) {
        const evaluations = this.getEmployeeEvaluations(employeeId); // Already sorted by year asc
        if (evaluations.length === 0) return null;
        return evaluations[evaluations.length - 1]; // Get the last one (latest year)
    }


    getLatestEmployeeGrade(employeeId) {
        const latestEval = this.getLatestEmployeeEvaluation(employeeId);
        return latestEval ? latestEval.grade : null;
    }

    getDepartmentEmployeesCount() {
        const counts = {};
        this.getDepartments().forEach(dept => {
            counts[dept.id] = 0;
        });
        this.getEmployees().forEach(emp => {
            if (counts[emp.departmentId] !== undefined) {
                counts[emp.departmentId]++;
            }
        });
        return counts;
    }
    
    // 所属班ごとの社員数を取得
    getTeamEmployeesCount() {
        const counts = {};
        this.getTeams().forEach(team => {
            counts[team.id] = 0;
        });
        this.getEmployees().forEach(emp => {
            if (counts[emp.teamId] !== undefined) {
                counts[emp.teamId]++;
            }
        });
        return counts;
    }

    getEmployeesByAgeGroup() {
        const result = { '10s': 0, '20s': 0, '30s': 0, '40s': 0, '50s': 0, '60s': 0 };
        const currentYear = new Date().getFullYear();
        this.getEmployees().forEach(employee => {
            const birthYear = new Date(employee.birthdate).getFullYear();
             if (isNaN(birthYear)) return; // Skip if invalid date
            const age = currentYear - birthYear;

            if (age < 20) result['10s']++;
            else if (age < 30) result['20s']++;
            else if (age < 40) result['30s']++;
            else if (age < 50) result['40s']++;
            else if (age < 60) result['50s']++;
            else if (age >= 60) result['60s']++; // Include 60+
        });
        return result;
    }

     getGradeDistribution() {
         const distribution = {};
         this.getGradeOptions().forEach(grade => distribution[grade] = 0);
         const currentYear = new Date().getFullYear();

         this.getEmployees().forEach(emp => {
             const latestGrade = this.getLatestEmployeeGrade(emp.id);
             if (latestGrade && distribution[latestGrade] !== undefined) {
                 distribution[latestGrade]++;
             }
         });
         return distribution;
     }
}