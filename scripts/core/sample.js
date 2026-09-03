/**
 * サンプルデータ生成 - 人事評定視覚化アプリケーション
 * サンプルデータの生成機能を提供するモジュール
 * 実データに近い分布に基づいて生成
 */
class SampleDataGenerator {
    constructor(appData) {
        this.appData = appData;
    }

    /**
     * 重み付けされた配列からランダムに値を取得するヘルパーメソッド
     * @param {Array<{value: any, weight: number}>} options 
     * @returns {any}
     */
    getRandomWithWeight(options) {
        if (!options || options.length === 0) return null;
        const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const option of options) {
            if (random < option.weight) {
                return option.value;
            }
            random -= option.weight;
        }
        return options[0].value; // Fallback
    }

    /**
     * 配列からランダムな要素を取得
     * @param {Array} arr 
     * @returns {any}
     */
    getRandom(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 指定された範囲のランダムな整数を取得
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * サンプルデータの生成
     */
    generateSampleData() {
        this.appData.data.employees = []; // Clear existing sample data if any
        this.appData.data.evaluations = [];

        const currentYear = new Date().getFullYear();
        const departments = this.appData.getDepartments();
        const positions = this.appData.getPositions().map(p => p.name);
        const teams = this.appData.getTeams();

        // 日本の名前データ - 出現頻度を考慮して重み付け
        // 女性は全体の10%程度になるように設定
        const maleFirstNames = [
            // 一般的な男性名 (出現頻度が高い順)
            "大翔", "蓮", "湊", "陽翔", "颯真", "樹", "悠真", "悠人", "陽太", "太陽", 
            "大和", "悠斗", "翔", "陸", "蒼", "悠", "奏太", "悠太", "翔太", "大輝",
            "健太", "拓海", "翔真", "大地", "海斗", "大樹", "陽", "輝", "光", "優",
            "直樹", "健", "誠", "海", "大介", "龍太郎", "太郎", "一郎", "二郎", "三郎",
            "隆", "隆太", "英樹", "浩二", "清", "浩", "和也", "智也", "智樹", "竜也"
        ];
        
        const femaleFirstNames = [
            // 一般的な女性名 (出現頻度が高い順)
            "陽葵", "紬", "凛", "芽依", "葵", "陽菜", "澪", "ひなた", "心春", "結菜",
            "さくら", "美月", "結衣", "心", "咲良", "愛", "楓", "美桜", "莉子", "愛菜",
            "花子", "優子", "理子", "明美", "恵子", "智子", "直子", "純子", "京子", "真由美",
            "彩", "麻衣", "由美", "純", "幸子", "久美子", "明子", "千恵子", "裕子", "陽子"
        ];
        
        const lastNames = [
            // 一般的な姓 (出現頻度が高い順)
            {value: "佐藤", weight: 18},
            {value: "鈴木", weight: 17},
            {value: "高橋", weight: 14},
            {value: "田中", weight: 14},
            {value: "渡辺", weight: 11},
            {value: "伊藤", weight: 11},
            {value: "山本", weight: 10},
            {value: "中村", weight: 10},
            {value: "小林", weight: 10},
            {value: "加藤", weight: 9},
            {value: "吉田", weight: 9},
            {value: "山田", weight: 8},
            {value: "佐々木", weight: 8},
            {value: "山口", weight: 7},
            {value: "松本", weight: 7},
            {value: "井上", weight: 7},
            {value: "木村", weight: 7},
            {value: "林", weight: 6},
            {value: "斎藤", weight: 6},
            {value: "清水", weight: 6},
            {value: "山崎", weight: 5},
            {value: "中島", weight: 5},
            {value: "池田", weight: 5},
            {value: "阿部", weight: 5},
            {value: "橋本", weight: 5},
            {value: "山下", weight: 4},
            {value: "石川", weight: 4},
            {value: "小川", weight: 4},
            {value: "中野", weight: 4},
            {value: "前田", weight: 4}
        ];

        // グレード分布とその昇格年数に関する設定 (図表参照)
        // 値は [初期グレード出現確率の重み, 平均昇格年数]
        const gradeDistribution = {
            'G1': [3, 1.0],  // G1は稀
            'G2': [0, 0],    // G2はデータなし
            'G3': [12, 2.67],
            'G4': [14, 3.43],
            'G5': [18, 2.28],
            'G6': [16, 3.13],
            'G7': [12, 3.17],
            'G8': [5, 3.0],
            'G9': [2, 3.0],
            'G10': [0, 0],   // G10以上はほぼなし
            'G11': [0, 0],
            'G12': [0, 0]
        };

        // 初期グレード分布の重み付けリスト作成
        const initialGradeWeights = Object.entries(gradeDistribution).map(([grade, [weight, _]]) => ({
            value: grade,
            weight: weight
        }));

        const numEmployees = 80; // 適切なサンプルサイズ

        for (let i = 1; i <= numEmployees; i++) {
            // 女性の割合を約10%に設定
            const isFemale = Math.random() < 0.1;
            const firstName = isFemale ? 
                this.getRandom(femaleFirstNames) : 
                this.getRandom(maleFirstNames);
            
            const lastName = this.getRandomWithWeight(lastNames);

            // 年齢の分布を調整 - 若手から中堅、ベテランまでバランスよく
            const ageDistribution = [
                {value: this.getRandomInt(22, 29), weight: 30}, // 20代: 30%
                {value: this.getRandomInt(30, 39), weight: 30}, // 30代: 30%
                {value: this.getRandomInt(40, 49), weight: 25}, // 40代: 25%
                {value: this.getRandomInt(50, 59), weight: 12}, // 50代: 12%
                {value: this.getRandomInt(60, 65), weight: 3}   // 60代: 3%
            ];
            
            const age = this.getRandomWithWeight(ageDistribution);
            const birthYear = currentYear - age;
            const birthMonth = this.getRandomInt(1, 12);
            const birthDay = this.getRandomInt(1, 28);
            const birthdate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

            // 勤続年数の調整 - 年齢に応じた現実的な分布
            let maxTenure = Math.min(age - 18, 40); // 最大勤続年数 (18歳以降で最大40年)
            let minTenure = 1; // 最低1年は勤務

            // 年齢に応じた勤続年数の調整
            if (age >= 40) {
                minTenure = 5; // 40歳以上は少なくとも5年以上勤務していることが多い
            } else if (age >= 30) {
                minTenure = 2; // 30歳以上は少なくとも2年以上勤務していることが多い
            }

            const tenure = this.getRandomInt(minTenure, maxTenure);
            const joinYear = currentYear - tenure;
            const joinMonth = this.getRandomInt(1, 12);
            const joinDay = this.getRandomInt(1, 28);
            const joinDate = `${joinYear}-${String(joinMonth).padStart(2, '0')}-${String(joinDay).padStart(2, '0')}`;

            const department = this.getRandom(departments);
            const departmentId = department.id;
            
            // 所属班の割り当て
            const team = this.getRandom(teams);
            const teamId = team ? team.id : null;

            // 役職の割り当て - 年齢と勤続年数に基づいて調整
            let position = '';
            const currentAge = age;
            
            if (currentAge >= 60 && Math.random() < 0.7) {
                position = 'エルダー';
            } else if (tenure > 15 && currentAge >= 45 && Math.random() < 0.3) {
                position = '組長';
            } else if (tenure > 10 && currentAge >= 35 && Math.random() < 0.4) {
                position = '作業長';
            } else if (tenure > 5 && currentAge >= 30 && Math.random() < 0.5) {
                position = '班長';
            }

            const employee = {
                id: i,
                firstName: firstName,
                lastName: lastName,
                birthdate: birthdate,
                joinDate: joinDate,
                departmentId: departmentId,
                teamId: teamId,
                position: position,
                contractType: this.generateRandomContractType(age, tenure),
                notes: Math.random() > 0.85 ? `サンプル備考 ${i}` : ''
            };
            this.appData.data.employees.push(employee);

            // 初期グレードをグレード分布の重みに基づいて選択
            let currentGrade = parseInt(this.getRandomWithWeight(initialGradeWeights).replace('G', ''));
            
            // 評価データの生成
            let currentEvalPrefix = 'A';
            let currentEvalValue = this.getRandomInt(0, 2); // 初期評価は低めに
            let lastDepartmentId = departmentId;
            let yearsSinceLastPromotion = 0;

            for (let year = joinYear; year < currentYear; year++) {
                const age = year - birthYear;
                const tenure = year - joinYear;
                yearsSinceLastPromotion++;

                // グレード昇格ロジック - 図表に基づいた昇格年数
                const currentGradeKey = `G${currentGrade}`;
                const [_, avgPromotionYears] = gradeDistribution[currentGradeKey] || [0, 4];
                
                // 昇格確率の計算 - 平均昇格年数に基づいて確率上昇
                // 平均年数経過で50%、2倍の年数で90%程度の確率
                if (avgPromotionYears > 0) {
                    const promotionProbability = Math.min(0.9, yearsSinceLastPromotion / avgPromotionYears * 0.5);
                    
                    if (Math.random() < promotionProbability && currentGrade < 12) {
                        currentGrade++;
                        yearsSinceLastPromotion = 0;
                    }
                }

                // 評価値の更新 - グレードと年齢に応じて
                // 年度評価は一定の確率で上下動
                let evalChange = 0;
                
                // 80%の確率で変動、20%は変化なし
                if (Math.random() < 0.8) {
                    if (Math.random() < 0.6) {
                        evalChange = 1; // 60%の確率で上昇
                    } else {
                        evalChange = -1; // 40%の確率で下降
                    }
                }
                
                currentEvalValue += evalChange;

                // 評価タイプの調整
                let targetPrefix = 'A';
                
                if (age >= 60 && employee.position === 'エルダー') {
                    targetPrefix = 'C';
                } else if (currentGrade >= 7 || ['作業長', '組長'].includes(employee.position)) {
                    targetPrefix = 'B';
                }

                // 評価タイプが変わった場合は値をリセット
                if (targetPrefix !== currentEvalPrefix) {
                    currentEvalPrefix = targetPrefix;
                    currentEvalValue = this.getRandomInt(0, 2);
                }

                // 評価値の範囲制限
                if (currentEvalPrefix === 'A') currentEvalValue = Math.max(0, Math.min(5, currentEvalValue));
                else if (currentEvalPrefix === 'B') currentEvalValue = Math.max(0, Math.min(10, currentEvalValue));
                else if (currentEvalPrefix === 'C') currentEvalValue = Math.max(0, Math.min(11, currentEvalValue));

                // 部署異動の確率は低く設定
                if (Math.random() < 0.05 && departments.length > 1) {
                    const newDepartmentOptions = departments.filter(d => d.id !== lastDepartmentId);
                    if (newDepartmentOptions.length > 0) {
                        lastDepartmentId = this.getRandom(newDepartmentOptions).id;
                    }
                }

                // 評価時の役職 - 通常は社員の現在の役職を反映
                let evalPosition = employee.position;
                
                // サンプルデータでは役職の変更を簡略化
                // 実際には評価年度によって役職が異なる場合もある
                
                // 評価データの作成
                const evaluation = {
                    id: this.appData.data.evaluations.length + 1,
                    employeeId: employee.id,
                    year: year,
                    age: age,
                    tenure: tenure,
                    grade: `G${currentGrade}`,
                    yearlyEvaluation: `${currentEvalPrefix}${currentEvalValue}`,
                    position: evalPosition,
                    departmentId: lastDepartmentId,
                    notes: ''
                };

                // 評価タイプの整合性チェック
                if (!(evaluation.yearlyEvaluation.startsWith('C') && age < 60 && evaluation.position !== 'エルダー') &&
                    !(evaluation.yearlyEvaluation.startsWith('B') && currentGrade < 7 && 
                      !['作業長', '組長'].includes(evaluation.position))) {
                    
                    // フラグの追加 - ランダムにフラグを設定 (10%程度の確率)
                    if (Math.random() < 0.1) {
                        const flags = ['promotion', 'retirement', 'consideration', 'check', 'medical', 'pending'];
                        // 退職フラグは年齢が高い場合のみ
                        const availableFlags = age >= 55 ? flags : flags.filter(f => f !== 'retirement');
                        evaluation.flag = this.getRandom(availableFlags);
                    } else {
                        evaluation.flag = '';
                    }
                    
                    this.appData.data.evaluations.push(evaluation);
                }
            }
        }
        
        console.log(`Generated ${this.appData.data.employees.length} employees and ${this.appData.data.evaluations.length} evaluations.`);
        this.appData.saveData(); // 生成したサンプルデータを保存
    }

    // sample.js にランダム契約形態生成メソッドを追加
    generateRandomContractType(age, tenure) {
        // 年齢と勤続年数に基づいた現実的な契約形態分布
        if (age >= 60) {
            return Math.random() < 0.3 ? 'retired' : 'full-time';
        } else if (tenure < 1) {
            return Math.random() < 0.4 ? 'probation' : 'full-time';
        } else {
            const weights = [
                { value: 'full-time', weight: 70 },    // 正社員 70%
                { value: 'contract', weight: 15 },     // 契約社員 15%
                { value: 'dispatch', weight: 10 },     // 派遣社員 10%
                { value: 'seconded', weight: 3 },      // 出向社員 3%
                { value: 'probation', weight: 2 }      // 見習社員 2%
            ];
            return this.getRandomWithWeight(weights);
        }
    }

    /**
     * サンプルデータを含むデータのリセット
     */
    resetWithSampleData() {
        try {
            // データをデフォルト状態にリセット
            this.appData.data = JSON.parse(JSON.stringify(this.appData.defaultData));
            this.appData.data.employees = [];
            this.appData.data.evaluations = [];
            
            // サンプルデータを生成
            this.generateSampleData();
            
            console.log("All data reset with sample data.");
            return true;
        } catch (e) {
            console.error("Error resetting data with samples:", e);
            return false;
        }
    }
}