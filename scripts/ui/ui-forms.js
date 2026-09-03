/**
 * UI操作と表示 フォーム関連 - 人事評定視覚化アプリケーション
 * モーダルフォーム、リスト表示、データ入力に関連する機能を提供
 */
class UIForms {
    /**
     * UIFormsコンストラクタ
     * @param {Object} uiManager UIマネージャーへの参照
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.appController = uiManager.appController;
        
        // 評価モーダル用イベントリスナー参照
        this._yearChangeListener = null;
        this._employeeChangeListener = null;

        // 顔写真用ステート
        this.currentEmployeePhotos =[];
        this.currentDisplayPhotoId = null;
        this._photoUploadListener = null;
        this._photoPasteListener = null;
    }

    /**
     * 顔写真のアップロード・リサイズ処理（パフォーマンス最適化）
     */
    processImageFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 400; // 保存サイズを最大400pxに制限
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // 背景を白で塗りつぶす（透過PNG対策）
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 軽量化のためJPEGの品質0.8で保存
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 顔写真のサムネイルUI更新
     */
    renderPhotoThumbnails() {
        const container = document.getElementById('employeePhotoThumbnails');
        const mainPhoto = document.getElementById('employeeMainPhoto');
        if (!container || !mainPhoto) return;

        container.innerHTML = '';
        
        const defaultSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

        if (this.currentEmployeePhotos.length === 0) {
            mainPhoto.src = defaultSvg;
            return;
        }

        // 表示用写真が未選択、または削除されて存在しない場合は最初のものを選択
        const hasDisplayPhoto = this.currentEmployeePhotos.some(p => p.id === this.currentDisplayPhotoId);
        if (!hasDisplayPhoto) {
            this.currentDisplayPhotoId = this.currentEmployeePhotos[0].id;
        }

        // メイン写真を設定
        const displayPhoto = this.currentEmployeePhotos.find(p => p.id === this.currentDisplayPhotoId);
        mainPhoto.src = displayPhoto.dataUrl;

        // サムネイルを生成
        this.currentEmployeePhotos.forEach(photo => {
            const wrapper = document.createElement('div');
            wrapper.className = 'employee-thumbnail-wrapper';

            const img = document.createElement('img');
            img.className = 'employee-thumbnail-item';
            if (photo.id === this.currentDisplayPhotoId) {
                img.classList.add('selected');
            }
            img.src = photo.dataUrl;
            img.title = 'クリックでメイン画像に設定';
            img.addEventListener('click', () => {
                this.currentDisplayPhotoId = photo.id;
                this.renderPhotoThumbnails();
            });

            const delBtn = document.createElement('div');
            delBtn.className = 'employee-thumbnail-delete';
            delBtn.innerHTML = '<i class="fas fa-times"></i>';
            delBtn.title = '削除';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentEmployeePhotos = this.currentEmployeePhotos.filter(p => p.id !== photo.id);
                this.renderPhotoThumbnails();
            });

            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            container.appendChild(wrapper);
        });
    }

    /**
     * 画像ファイル群を顔写真として登録する（ファイル選択・貼り付け共通処理）
     * @param {FileList|File[]} files 追加する画像ファイル
     * @returns {Promise<number>} 実際に追加できた枚数
     */
    async addPhotoFiles(files) {
        if (!files || files.length === 0) return 0;
        let addedCount = 0;

        for (const file of Array.from(files)) {
            if (!file || !file.type || !file.type.startsWith('image/')) continue;

            try {
                const dataUrl = await this.processImageFile(file);
                const newPhotoId = 'photo_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                this.currentEmployeePhotos.push({
                    id: newPhotoId,
                    dataUrl: dataUrl
                });
                // 最初に追加されたものをメインに設定
                if (this.currentEmployeePhotos.length === 1) {
                    this.currentDisplayPhotoId = newPhotoId;
                }
                addedCount++;
            } catch (err) {
                console.error('Image processing error:', err);
            }
        }

        if (addedCount > 0) {
            this.renderPhotoThumbnails();
        }
        return addedCount;
    }

    /**
     * 画像アップロードのイベントリスナー設定（ファイル選択 + Ctrl+V 貼り付け）
     */
    setupPhotoUploadEvents() {
        const fileInput = document.getElementById('employeePhotoInput');
        if (!fileInput) return;

        // 既存のリスナーを削除（クローン置換）
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);

        newFileInput.addEventListener('change', async (e) => {
            await this.addPhotoFiles(e.target.files);
            newFileInput.value = ''; // 選択状態をリセット
        });

        this.setupPhotoPasteEvent();
    }

    /**
     * Ctrl+V（クリップボード貼り付け）による顔写真登録
     * 社員モーダル表示中のみ有効。リスナーは一度だけ登録して重複を防ぐ。
     */
    setupPhotoPasteEvent() {
        if (this._photoPasteListener) return;

        this._photoPasteListener = async (e) => {
            // 社員追加/編集モーダルが開いているときだけ処理する
            const modal = document.getElementById('employeeModal');
            if (!modal || !modal.classList.contains('visible')) return;

            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            // クリップボード内の画像のみを抽出（テキスト貼り付けは通常動作を維持）
            const imageFiles = Array.from(clipboardData.items || [])
                .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter(Boolean);

            if (imageFiles.length === 0) return;

            e.preventDefault();
            const addedCount = await this.addPhotoFiles(imageFiles);
            if (addedCount > 0) {
                this.uiManager.showNotification('success', '写真を登録しました', `クリップボードから${addedCount}枚の画像を追加しました。`);
            } else {
                this.uiManager.showNotification('error', '写真の登録に失敗', '貼り付けた画像を読み込めませんでした。');
            }
        };

        document.addEventListener('paste', this._photoPasteListener);
    }

    // ----------------------
    // 社員管理モーダル関連
    // ----------------------
    
    /**
     * 社員管理モーダルを表示
     */
    showEmployeeManagementModal() {
        if (this.uiManager.showModal('employeeManagementModal')) {
            this.updateEmployeeManagementTable(this.appController.appData.getEmployees());
            const searchInput = document.getElementById('employeeManagementSearch');
            if (searchInput) searchInput.value = ''; // 開くたびに検索をクリア
        }
    }

    /**
     * 社員管理テーブルを更新（役職ID管理版）
     * @param {Array} employees 社員リスト
     */
    updateEmployeeManagementTable(employees) {
        const tableBody = document.getElementById('employeeManagementTableBody');
        if (!tableBody) return;
        
        // テーブルをクリア
        tableBody.innerHTML = '';
        
        // 社員データが空の場合のメッセージ表示
        if (!employees || employees.length === 0) {
            const row = tableBody.insertRow();
            row.className = 'empty-message-row';
            const cell = row.insertCell();
            cell.colSpan = 8; // カラム数を修正（契約形態列追加により8列）
            cell.textContent = '登録されている社員がいません。';
            cell.style.textAlign = 'center';
            cell.style.padding = 'var(--spacing-lg)';
            cell.style.color = 'var(--base-dark-gray)';
            return;
        }
        
        // マスタデータ取得
        const departments = this.appController.appData.getDepartments();
        const teams = this.appController.appData.getTeams();
        const positions = this.appController.appData.getPositions();
        const contractTypes = this.appController.appData.getContractTypes();
        
        // ヘルパー関数
        const getDeptName = (id) => departments.find(d => d.id === id)?.name || '未所属';
        const getTeamName = (id) => teams.find(t => t.id === id)?.name || '';
        const getPositionName = (positionId) => {
            if (!positionId) return '';
            const position = positions.find(p => p.id == positionId || p.name === positionId);
            return position ? position.name : '';
        };
        const getContractTypeName = (contractTypeId) => {
            const contractType = contractTypes.find(ct => ct.id === contractTypeId);
            return contractType ? contractType.name : '不明';
        };
        
        // DOMフラグメントを使用して一括更新（パフォーマンス最適化）
        const fragment = document.createDocumentFragment();
        
        // ID順でソート
        const sortedEmployees = [...employees].sort((a, b) => a.id - b.id);
        
        sortedEmployees.forEach(employee => {
            const row = document.createElement('tr');
            row.setAttribute('data-employee-id', employee.id);
            
            // 検索用の属性を設定
            const deptName = getDeptName(employee.departmentId);
            const teamName = getTeamName(employee.teamId);
            const positionName = getPositionName(employee.positionId || employee.position);
            const contractTypeName = getContractTypeName(employee.contractType);
            const latestGrade = this.appController.appData.getLatestEmployeeGrade(employee.id);
            
            row.setAttribute('data-search-terms', 
                `${employee.name.toLowerCase()} ${employee.employeeNumber || ''} ${deptName.toLowerCase()} ${teamName.toLowerCase()} ${positionName.toLowerCase()} ${contractTypeName.toLowerCase()} ${latestGrade?.toLowerCase() || ''}`
            );
            
            // データセルを作成
            row.innerHTML = `
                <td>${employee.employeeNumber || '-'}</td>
                <td title="${employee.name}">${employee.name}</td>
                <td>${deptName || '-'}</td>
                <td>${teamName || '-'}</td>
                <td>${positionName || '-'}</td>
                <td class="contract-type-cell">${contractTypeName}</td>
                <td class="grade-cell"></td>
                <td class="action-cell">
                    <button class="btn-table-action edit edit-employee" title="社員情報編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table-action delete delete-employee" title="社員削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
                <td class="action-cell">
                    <button class="btn-table-action info view-qualifications" title="資格・認定情報">
                        <i class="fas fa-certificate"></i>
                    </button>
                </td>
            `;
            
            // 契約形態セルにスタイルを適用
            const contractTypeCell = row.querySelector('.contract-type-cell');
            if (contractTypeCell && employee.contractType) {
                const contractTypeBadge = document.createElement('span');
                contractTypeBadge.className = `contract-type-badge ${employee.contractType}`;
                contractTypeBadge.textContent = contractTypeName;
                contractTypeBadge.title = `契約形態: ${contractTypeName}`;
                contractTypeCell.innerHTML = '';
                contractTypeCell.appendChild(contractTypeBadge);
            }
            
            // グレードバッジ作成部分は変更なし
            const gradeCell = row.querySelector('.grade-cell');
            if (latestGrade) {
                const gradeNum = parseInt(String(latestGrade).replace('G', ''));
                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    const gradeBadge = document.createElement('span');
                    gradeBadge.className = 'employee-badge grade';
                    gradeBadge.textContent = latestGrade;
                    gradeBadge.style.backgroundColor = `var(--grade-${gradeNum})`;

                    document.body.appendChild(gradeBadge);
                    const bgHex = this.uiManager.getComputedBgHex(gradeBadge);
                    document.body.removeChild(gradeBadge);

                    this.uiManager.applyContrastColor(gradeBadge, bgHex);
                    gradeBadge.style.borderColor = 'rgba(0,0,0,0.1)';

                    gradeCell.appendChild(gradeBadge);
                } else {
                    gradeCell.textContent = latestGrade;
                }
            } else {
                gradeCell.textContent = '-';
            }
            
            // イベントリスナー設定は変更なし
            row.addEventListener('dblclick', () => {
                row.classList.add('clicked');
                setTimeout(() => {
                    row.classList.remove('clicked');
                }, 300);
                
                const employeeId = row.getAttribute('data-employee-id');
                if (employeeId) {
                    this.showEmployeeModal(employeeId);
                }
            });
            
            this.setupEmployeeTableButtons(row, employee.id);
            fragment.appendChild(row);
        });
        
        tableBody.appendChild(fragment);
    }

    /**
     * 役職選択肢を設定（修正版 - ID管理対応）
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populatePositionOptions(selectElement) {
        if (!selectElement) return;
        
        // 役職をIDでマッピング
        const positions = this.appController.appData.getPositions()
            .map(pos => ({ value: pos.id, text: pos.name }))
            .sort((a, b) => a.text.localeCompare(b.text, 'ja'));
        
        // 「なし」を含める
        this.populateSelectWithOptions(selectElement, positions, true, 'なし');
    }

    /**
     * 社員テーブルの各ボタンイベントを設定
     * @param {HTMLElement} row 社員行要素
     * @param {string} employeeId 社員ID
     */
    setupEmployeeTableButtons(row, employeeId) {
        // 編集ボタン
        const editBtn = row.querySelector('.edit-employee');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 伝播を防止
                this.showEmployeeModal(employeeId);
            });
        }
        
        // 削除ボタン
        const deleteBtn = row.querySelector('.delete-employee');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 伝播を防止
                this.appController.deleteEmployee(employeeId);
            });
        }
        
        // 資格・認定ボタン
        const qualBtn = row.querySelector('.view-qualifications');
        if (qualBtn) {
            qualBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 伝播を防止
                this.showEmployeeQualifications(employeeId);
            });
        }
    }

    /**
     * 社員の資格・認定情報を表示
     * @param {string} employeeId 社員ID
     */
    showEmployeeQualifications(employeeId) {
        // ID値をチェック
        if (!employeeId) return;
        
        // 設定モーダルを表示
        this.appController.appUI.showModal('settingsModal');
        
        // 少し遅延して社員資格設定セクションに切り替え
        setTimeout(() => {
            // 設定マネージャを取得
            const settingsManager = this.appController.settingsManager;
            if (settingsManager) {
                // 社員資格セクションに切り替え
                settingsManager.switchSection('employee-qualifications');
                
                // 該当社員を選択
                setTimeout(() => {
                    const selector = document.querySelector(`.employee-selector-item[data-employee-id="${employeeId}"]`);
                    if (selector) {
                        // 選択状態にして、クリックイベントをトリガー
                        selector.classList.add('selected');
                        selector.click();
                        // スクロールして表示
                        selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }, 300);
    }

    /**
     * 部署名を取得
     * @param {string} departmentId 部署ID
     * @returns {string} 部署名
     */
    getDepartmentName(departmentId) {
        if (!departmentId) return '';
        
        const department = this.appController.appData.getDepartment(departmentId);
        return department ? department.name : '';
    }

    /**
     * 所属班名を取得
     * @param {string} teamId 班ID
     * @returns {string} 班名
     */
    getTeamName(teamId) {
        if (!teamId) return '';
        
        const team = this.appController.appData.getTeam(teamId);
        return team ? team.name : '';
    }

    /**
     * 役職名を取得
     * @param {string} positionId 役職ID
     * @returns {string} 役職名
     */
    getPositionName(positionId) {
        if (!positionId) return '';
        
        const position = this.appController.appData.getPosition(positionId);
        return position ? position.name : '';
    }

    /**
     * 社員管理テーブルに検索フィルターを適用
     * @param {string} searchTerm 検索語
     */
    filterEmployeeManagementTable(searchTerm) {
        const tableBody = document.getElementById('employeeManagementTableBody');
        if (!tableBody) return;
        const rows = tableBody.querySelectorAll('tr:not(.empty-message-row):not(.no-results-message)');
        let matchFound = false;
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();

        // 各行について検索語との一致を確認
        rows.forEach(row => {
            const searchTerms = row.getAttribute('data-search-terms') || '';
            if (searchTerms.includes(normalizedSearchTerm)) {
                row.style.display = '';
                matchFound = true;
            } else {
                row.style.display = 'none';
            }
        });

        // 「該当なし」メッセージの処理
        let noResultsRow = tableBody.querySelector('.no-results-message');
        if (!matchFound && normalizedSearchTerm && rows.length > 0) {
            if (!noResultsRow) {
                noResultsRow = tableBody.insertRow(0);
                noResultsRow.className = 'no-results-message';
                const cell = noResultsRow.insertCell();
                cell.colSpan = 9; // カラム数を修正（契約形態列追加により9列）
                cell.textContent = '検索条件に一致する社員が見つかりません。';
                cell.style.textAlign = 'center';
                cell.style.padding = 'var(--spacing-md)';
                cell.style.color = 'var(--base-dark-gray)';
                cell.style.fontStyle = 'italic';
            }
            noResultsRow.style.display = '';
        } else if (noResultsRow) {
            noResultsRow.style.display = 'none';
        }

        // 「社員がいません」メッセージの表示状態を更新
        const emptyMessageRow = tableBody.querySelector('.empty-message-row');
        if (emptyMessageRow) {
            const isAnyRowVisible = Array.from(rows).some(row => row.style.display !== 'none');
            emptyMessageRow.style.display = isAnyRowVisible || (noResultsRow && noResultsRow.style.display !== 'none') ? 'none' : '';
        }
    }


    /**
     * 契約形態選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populateContractTypeOptions(selectElement) {
        if (!selectElement) return;
        const contractTypes = this.appController.appData.getContractTypes()
            .map(type => ({ value: type.id, text: type.name }));
        // 契約形態は必須項目なので空オプションは不要
        this.populateSelectWithOptions(selectElement, contractTypes, false);
    }

    /**
     * 社員追加/編集モーダルを表示
     * @param {number} employeeId 社員ID (null=新規追加)
     */
    showEmployeeModal(employeeId = null) {
        // 各種選択肢を設定
        this.populateDepartmentOptions(document.getElementById('employeeDepartment'));
        this.populatePositionOptions(document.getElementById('employeePosition'));
        this.populateTeamOptions(document.getElementById('employeeTeam'));
        this.populateContractTypeOptions(document.getElementById('employeeContractType')); // 追加

        const form = document.getElementById('employeeForm');
        const titleElem = document.getElementById('employeeModalTitle');
        const employeeIdInput = document.getElementById('employeeId');
        const latestGradeInput = document.getElementById('employeeLatestGrade');
        const lastNameInput = document.getElementById('employeeLastName');
        const firstNameInput = document.getElementById('employeeFirstName');
        const employeeNumberInput = document.getElementById('employeeNumber');
        
        form.reset();

        this.currentEmployeePhotos =[];
        this.currentDisplayPhotoId = null;

        if (employeeId) {
            // 編集モード
            const employee = this.appController.appData.getEmployee(employeeId);
            if (employee) {
                titleElem.innerHTML = '<i class="fas fa-user-edit"></i> 社員編集';
                employeeIdInput.value = employee.id;
                
                // 顔写真データの復元
                if (employee.photos && Array.isArray(employee.photos)) {
                    this.currentEmployeePhotos = [...employee.photos];
                    this.currentDisplayPhotoId = employee.displayPhotoId || null;
                }
                lastNameInput.value = employee.lastName || '';
                firstNameInput.value = employee.firstName || '';
                employeeNumberInput.value = employee.employeeNumber || '';
                document.getElementById('employeeBirthdate').value = employee.birthdate;
                document.getElementById('employeeJoinDate').value = employee.joinDate;
                document.getElementById('employeeDepartment').value = employee.departmentId;
                document.getElementById('employeePosition').value = employee.position || '';
                document.getElementById('employeeTeam').value = employee.teamId || '';
                document.getElementById('employeeContractType').value = employee.contractType || 'full-time'; // 追加
                document.getElementById('employeeNotes').value = employee.notes || '';
                const latestGrade = this.appController.appData.getLatestEmployeeGrade(employee.id);
                latestGradeInput.value = latestGrade || '評価なし';
            } else {
                console.error(`Employee with ID ${employeeId} not found.`);
                this.uiManager.showNotification('error', 'エラー', '編集対象の社員が見つかりません。');
                return;
            }
        } else {
            // 新規追加モード
            titleElem.innerHTML = '<i class="fas fa-user-plus"></i> 社員追加';
            employeeIdInput.value = '';
            employeeNumberInput.value = '';
            latestGradeInput.value = '登録前';
            document.getElementById('employeeContractType').value = 'full-time'; // デフォルト値設定
        }
        
        // 写真UIの初期化とイベント設定
        this.setupPhotoUploadEvents();
        this.renderPhotoThumbnails();

        if (this.uiManager.showModal('employeeModal')) {
            setTimeout(() => lastNameInput.focus(), 150);
        }
    }

    /**
     * 評価追加/編集モーダルを表示
     * @param {number} evaluationId 評価ID (null=新規追加)
     * @param {number} presetEmployeeId 事前設定する社員ID (省略可)
     * @param {number} presetYear 事前設定する年 (省略可)
     * @param {Array} employeeList 社員リスト (省略可)
     */
    showEvaluationModal(evaluationId = null, presetEmployeeId = null, presetYear = null, employeeList = null) {
        const form = document.getElementById('evaluationForm');
        const titleElem = document.getElementById('evaluationModalTitle');
        const evaluationIdInput = document.getElementById('evaluationId');
        const yearInput = document.getElementById('evaluationYear');
        const employeeSelect = document.getElementById('evaluationEmployee');
        const deleteBtn = document.getElementById('deleteEvaluationBtn');
        
        form.reset();
        evaluationIdInput.value = '';
    
        // 既存のリスナーを削除
        if (this._yearChangeListener) {
            yearInput.removeEventListener('change', this._yearChangeListener);
            this._yearChangeListener = null;
        }
        
        if (this._employeeChangeListener) {
            employeeSelect.removeEventListener('change', this._employeeChangeListener);
            this._employeeChangeListener = null;
        }
        
        // 新しいリスナーを設定
        this._yearChangeListener = () => this.calculateEvaluationAgeAndTenure();
        this._employeeChangeListener = () => this.calculateEvaluationAgeAndTenure();
        
        yearInput.addEventListener('change', this._yearChangeListener);
        employeeSelect.addEventListener('change', this._employeeChangeListener);
    
        // フラグのラジオボタンをリセット
        document.querySelectorAll('input[name="evaluationFlag"]').forEach(radio => {
            radio.checked = radio.value === '';
        });
    
        // 評価用選択肢を生成
        this.populateEmployeeOptions(employeeSelect, employeeList);
        this.populateGradeOptions(document.getElementById('evaluationGrade'));
        this.populateYearlyEvaluationOptions(document.getElementById('evaluationYearly'));
        this.populatePositionOptions(document.getElementById('evaluationPosition'));
        this.populateDepartmentOptions(document.getElementById('evaluationDepartment'));
    
        if (evaluationId) {
            // 編集モード
            const evaluation = this.appController.appData.getEvaluation(evaluationId);
            if (evaluation) {
                titleElem.innerHTML = '<i class="fas fa-edit"></i> 評価編集';
                evaluationIdInput.value = evaluation.id;
                employeeSelect.value = evaluation.employeeId;
                yearInput.value = evaluation.year;
                document.getElementById('evaluationAge').value = evaluation.age;
                document.getElementById('evaluationTenure').value = evaluation.tenure;
                document.getElementById('evaluationGrade').value = evaluation.grade;
                document.getElementById('evaluationYearly').value = evaluation.yearlyEvaluation;
                document.getElementById('evaluationPosition').value = evaluation.position || '';
                document.getElementById('evaluationDepartment').value = evaluation.departmentId || '';
                document.getElementById('evaluationNotes').value = evaluation.notes || '';
                
                // フラグ設定
                if (evaluation.flag) {
                    const flagRadio = document.querySelector(`input[name="evaluationFlag"][value="${evaluation.flag}"]`);
                    if (flagRadio) flagRadio.checked = true;
                }
                
                // 削除ボタンを表示
                deleteBtn.style.display = 'inline-block';
                // 削除ボタンにイベントハンドラ設定
                deleteBtn.onclick = () => {
                    this.uiManager.hideModal('evaluationModal');
                    this.appController.deleteEvaluation(evaluation.id);
                };
            } else {
                console.error(`Evaluation with ID ${evaluationId} not found.`);
                this.uiManager.showNotification('error', 'エラー', '編集対象の評価が見つかりません。');
                return;
            }
        } else {
            // 新規追加モード
            titleElem.innerHTML = '<i class="fas fa-plus-circle"></i> 評価追加';
            const currentYear = new Date().getFullYear();
            yearInput.value = presetYear || currentYear;
    
            if (presetEmployeeId) {
                employeeSelect.value = presetEmployeeId;
                this.calculateEvaluationAgeAndTenure();
            } else {
                document.getElementById('evaluationAge').value = '';
                document.getElementById('evaluationTenure').value = '';
            }
            
            // 削除ボタンを非表示
            deleteBtn.style.display = 'none';
        }
    
        if (this.uiManager.showModal('evaluationModal')) {
            setTimeout(() => {
                yearInput.focus();
                
                // フラグボタンの初期化
                const flagButtons = document.querySelectorAll('.flag-button');
                flagButtons.forEach(button => {
                    const radio = button.querySelector('input[type="radio"]');
                    
                    // 初期状態のチェックを反映してクラスを付与/削除
                    if (radio.checked) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                    
                    // 既存のイベントを削除してから再設定
                    button.removeEventListener('click', this.handleFlagButtonClick);
                    button.addEventListener('click', this.handleFlagButtonClick);
                });
            }, 150);
        }
    }

    /**
     * フラグボタンクリックのイベントハンドラ
     * @param {Event} e クリックイベント
     */
    handleFlagButtonClick(e) {
        const flagButtons = document.querySelectorAll('.flag-button');
        
        // すべてのボタンからactiveクラスを削除
        flagButtons.forEach(btn => btn.classList.remove('active'));
        
        // クリックされたボタンにactiveクラスを追加
        this.classList.add('active');
        
        // ラジオボタンをチェック
        const radio = this.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
        }
    }

    /**
     * 評価モーダルの年齢・勤続年数を計算
     * @param {boolean} autoSelectGradeEval グレードと評価を自動選択するかどうか
     * @returns {boolean} 計算成功の場合true
     */
    calculateEvaluationAgeAndTenure(autoSelectGradeEval = true) {
        const yearInput = document.getElementById('evaluationYear');
        const employeeSelect = document.getElementById('evaluationEmployee');
        const ageInput = document.getElementById('evaluationAge');
        const tenureInput = document.getElementById('evaluationTenure');
        const gradeSelect = document.getElementById('evaluationGrade');
        const yearlySelect = document.getElementById('evaluationYearly');
        const positionSelect = document.getElementById('evaluationPosition');
        const departmentSelect = document.getElementById('evaluationDepartment');

        if (!yearInput || !employeeSelect || !ageInput || !tenureInput || !gradeSelect || !yearlySelect || !positionSelect || !departmentSelect) {
            console.error("年齢/勤続年数計算に必要な要素が見つかりません");
            return false;
        }

        const year = parseInt(yearInput.value);
        const employeeId = parseInt(employeeSelect.value);

        // 年または社員が選択されていない/無効な場合、フィールドをリセット
        if (isNaN(year) || isNaN(employeeId)) {
            ageInput.value = '';
            tenureInput.value = '';
            if (autoSelectGradeEval) {
                gradeSelect.selectedIndex = 0;
                yearlySelect.selectedIndex = 0;
                positionSelect.value = '';
                departmentSelect.selectedIndex = 0;
            }
            return false;
        }

        const employee = this.appController.appData.getEmployee(employeeId);
        // 社員データが欠けている場合、フィールドをリセットして終了
        if (!employee || !employee.birthdate || !employee.joinDate) {
            ageInput.value = '情報不足';
            tenureInput.value = '情報不足';
            if (autoSelectGradeEval) {
                gradeSelect.selectedIndex = 0; 
                yearlySelect.selectedIndex = 0; 
                positionSelect.value = '';
                departmentSelect.selectedIndex = 0;
            }
            return false;
        }

        try {
            const birthDate = new Date(employee.birthdate);
            const joinDate = new Date(employee.joinDate);
            if (isNaN(birthDate.getTime()) || isNaN(joinDate.getTime())) throw new Error("不正な日付形式です");

            const birthYear = birthDate.getFullYear();
            const joinYear = joinDate.getFullYear();

            // 評価年末時点での年齢と勤続年数を計算
            const age = year - birthYear;
            const tenure = year - joinYear;

            // 計算値の基本的な検証
            if (age < 0 || tenure < 0) throw new Error("年齢または勤続年数が負の値になりました");

            ageInput.value = age;
            tenureInput.value = tenure;

            // 新規評価の場合のみ、グレード、役職、年間評価を自動選択
            if (autoSelectGradeEval && !document.getElementById('evaluationId').value) {
                const employeeEvals = this.appController.appData.getEmployeeEvaluations(employeeId)
                    .sort((a,b) => b.year - a.year); // 年降順でソート
                const latestPreviousEval = employeeEvals.find(e => e.year < year); // 現在の年より前の最新評価を検索

                // 前年の評価があればそれを基に、なければG1をデフォルトに
                gradeSelect.value = latestPreviousEval ? latestPreviousEval.grade : 'G1';

                // 社員の現在のプロファイルから役職を設定
                positionSelect.value = employee.position || '';

                // 社員の現在のプロファイルから部署を設定
                departmentSelect.value = employee.departmentId;

                // 前年の評価があればそれを継承、なければロジックで判定
                if (latestPreviousEval) {
                    yearlySelect.value = latestPreviousEval.yearlyEvaluation;
                } else {
                    // 前年の評価がない場合のロジック
                    const currentGradeNum = parseInt(gradeSelect.value.replace('G', '') || 1);
                    const selectedPosition = positionSelect.value;
                    let targetPrefix = 'A'; // デフォルトのプレフィックス

                    if (age >= 60 && selectedPosition === 'エルダー') {
                        targetPrefix = 'C';
                    } else if (currentGradeNum >= 7 || selectedPosition === '作業長' || selectedPosition === '組長') {
                        targetPrefix = 'B';
                    }

                    // 対象の評価グループ（A, B, C）内で最初のオプションを検索
                    let foundValue = null;
                    for (let i = 0; i < yearlySelect.options.length; i++) {
                        const option = yearlySelect.options[i];
                        if (option.value.startsWith(targetPrefix)) {
                            foundValue = option.value;
                            break;
                        }
                    }

                    yearlySelect.value = foundValue || (yearlySelect.options.length > 0 ? yearlySelect.options[0].value : '');
                }
            }
            
            return true; // 計算成功

        } catch (e) {
            console.error("年齢/勤続年数の計算エラー:", e);
            ageInput.value = '計算エラー';
            tenureInput.value = '計算エラー';
            if (autoSelectGradeEval) {
                gradeSelect.selectedIndex = 0; 
                yearlySelect.selectedIndex = 0; 
                positionSelect.value = '';
                departmentSelect.selectedIndex = 0;
            }
            return false; // 計算失敗
        }
    }

    // ----------------------
    // 選択肢関連ユーティリティ
    // ----------------------
    
    /**
     * 選択要素に選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     * @param {Array} options 選択肢データ配列
     * @param {boolean} includeEmpty 空の選択肢を含めるか
     * @param {string} emptyLabel 空の選択肢のラベル
     */
    populateSelectWithOptions(selectElement, options, includeEmpty = false, emptyLabel = '選択してください') {
        if (!selectElement) return;
        const currentValue = selectElement.value; // 現在の選択を保持
        selectElement.innerHTML = ''; // 既存の選択肢をクリア

        // 空/プレースホルダーオプションを追加（必要な場合）
        if (includeEmpty) {
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = emptyLabel;
            selectElement.appendChild(emptyOpt);
        }

        // 配列から選択肢を追加
        options.forEach(opt => {
            const option = document.createElement('option');
            if (typeof opt === 'object' && opt !== null) {
                option.value = opt.value;
                option.textContent = opt.text;
            } else { // 単純な値の配列の場合
                option.value = opt;
                option.textContent = opt;
            }
            // 現在の値が一致する場合、選択状態を復元
            if (currentValue !== undefined && currentValue !== null && String(option.value) === String(currentValue)) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });

        // 選択されたオプションがない場合の処理
        if (selectElement.selectedIndex === -1 && !includeEmpty && selectElement.options.length > 0) {
            // 空のオプションが許可されていない場合、最初のオプションを選択
            selectElement.selectedIndex = 0;
        }
        else if (selectElement.selectedIndex === -1 && includeEmpty && selectElement.options.length > 0 && selectElement.options[0].value === '') {
            // 空のオプションが許可されている場合、それを選択
            selectElement.selectedIndex = 0;
        }
    }

    /**
     * 部署選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populateDepartmentOptions(selectElement) {
        if (!selectElement) return;
        const departments = this.appController.appData.getDepartments()
            .map(dept => ({ value: dept.id, text: dept.name }))
            .sort((a, b) => a.text.localeCompare(b.text, 'ja')); // 名前でソート
        this.populateSelectWithOptions(selectElement, departments, false);
    }

    /**
     * 役職選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populatePositionOptions(selectElement) {
        if (!selectElement) return;
        const positions = this.appController.appData.getPositions()
            .map(pos => ({ value: pos.name, text: pos.name }))
            .sort((a, b) => a.text.localeCompare(b.text, 'ja')); // 名前でソート
        // 役職は「なし」を含める
        this.populateSelectWithOptions(selectElement, positions, true, 'なし');
    }
    
    /**
     * 所属班選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populateTeamOptions(selectElement) {
        if (!selectElement) return;
        const teams = this.appController.appData.getTeams()
            .map(team => ({ value: team.id, text: team.name }))
            .sort((a, b) => a.text.localeCompare(b.text, 'ja')); // 名前でソート
        // 所属班は「なし」を含める
        this.populateSelectWithOptions(selectElement, teams, true, 'なし');
    }

    /**
     * 社員選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     * @param {Array} employees 社員リスト（省略時は全社員）
     */
    populateEmployeeOptions(selectElement, employees = null) {
        if (!selectElement) return;
        // 指定された社員リストまたは全社員を使用
        const employeeList = (employees || this.appController.appData.getEmployees())
            .map(emp => ({ value: emp.id, text: emp.name }))
            .sort((a, b) => a.text.localeCompare(b.text, 'ja')); // 名前でソート

        // データ属性に基づいて空オプションを含めるかどうかを決定
        const includeEmptyOption = selectElement.getAttribute('data-include-empty') === 'true';
        const emptyLabel = includeEmptyOption ? '社員を選択' : '';
        this.populateSelectWithOptions(selectElement, employeeList, includeEmptyOption, emptyLabel);
    }

    /**
     * グレード選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populateGradeOptions(selectElement) {
        if (!selectElement) return;
        const grades = this.appController.appData.getGradeOptions();
        // グレードは通常必須なので、空オプションなし
        this.populateSelectWithOptions(selectElement, grades);
    }

    /**
     * 年度評価選択肢を設定
     * @param {HTMLElement} selectElement 対象のselect要素
     */
    populateYearlyEvaluationOptions(selectElement) {
        if (!selectElement) return;
        const yearlyOptionsData = this.appController.appData.getYearlyEvaluationOptions();
        const currentValue = selectElement.value; // 選択を保持
        selectElement.innerHTML = ''; // 既存の選択肢をクリア

        // optgroupと選択肢を作成するヘルパー
        const createOptgroup = (label, options) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = label;
            options.forEach(optValue => {
                const option = document.createElement('option');
                option.value = optValue;
                option.textContent = optValue;
                // 選択を復元（一致する場合）
                if (currentValue !== undefined && currentValue !== null && option.value === currentValue) {
                    option.selected = true;
                }
                optgroup.appendChild(option);
            });
            return optgroup;
        };

        // optgroupを作成して追加
        selectElement.appendChild(createOptgroup('A評価（一般）', yearlyOptionsData.A));
        selectElement.appendChild(createOptgroup('B評価（G7+/作業長/組長）', yearlyOptionsData.B));
        selectElement.appendChild(createOptgroup('C評価（60歳+/エルダー）', yearlyOptionsData.C));

        // currentValueと一致するものがなかった場合のデフォルト選択
        if (selectElement.selectedIndex === -1 && selectElement.options.length > 0) {
            selectElement.selectedIndex = 0; // 最初のオプションを選択（おそらくA0）
        }
    }

    // ----------------------
    // サイドバーと表示関連
    // ----------------------
    
    /**
     * サイドバーの社員選択リストを更新
     * @param {Array} filteredEmployees フィルタリングされた社員リスト
     * @param {Array} selectedEmployeeIds 選択中の社員ID配列
     */
    updateEmployeeSelectList(filteredEmployees, selectedEmployeeIds) {
        const container = document.getElementById('employeeSelectListContainer');
        if (!container) return;
        container.innerHTML = ''; // 前のリストをクリア
        
        // 選択数と総数のカウンター更新
        const selectedCountElem = document.getElementById('selectedEmployeeCount2');
        const totalCountElem = document.getElementById('totalEmployeeCount2');
        if (selectedCountElem) selectedCountElem.textContent = selectedEmployeeIds.length;
        if (totalCountElem) totalCountElem.textContent = filteredEmployees.length;

        // フィルター条件にマッチする社員がない場合のメッセージ
        if (!filteredEmployees || filteredEmployees.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            const searchTerm = this.appController.filters.searchTerm;
            emptyMessage.textContent = searchTerm
                ? `検索語「${searchTerm}」に一致する社員がいません。`
                : '表示対象の社員がいません。フィルターを確認してください。';
            emptyMessage.style.padding = 'var(--spacing-md)';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = 'var(--base-dark-gray)';
            emptyMessage.style.fontSize = 'var(--font-size-small)';
            container.appendChild(emptyMessage);
            return;
        }

        // 部署情報、所属班情報、契約形態情報の準備
        const departments = this.appController.appData.getDepartments();
        const getDeptName = (id) => departments.find(d => d.id === id)?.name || '未';
        
        const teams = this.appController.appData.getTeams();
        const getTeamName = (id) => teams.find(t => t.id === id)?.name || '';

        const contractTypes = this.appController.appData.getContractTypes(); // 追加
        const getContractTypeName = (id) => contractTypes.find(ct => ct.id === id)?.name || '';

        // 一貫した表示のために名前でソート
        const sortedEmployees = [...filteredEmployees].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        const displayOptions = this.appController.getDisplayOptions();

        // 各社員のリスト項目を作成
        sortedEmployees.forEach(employee => {
            const item = document.createElement('div');
            item.className = 'employee-select-item';
            item.setAttribute('data-employee-id', employee.id);
            if (selectedEmployeeIds.includes(employee.id)) {
                item.classList.add('selected');
            }

            // 社員名
            const nameSpan = document.createElement('span');
            nameSpan.className = 'employee-select-name';
            nameSpan.textContent = employee.name;
            nameSpan.title = employee.name;
            item.appendChild(nameSpan);

            // バッジのコンテナ
            const badgesContainer = document.createElement('div');
            badgesContainer.className = 'employee-badges';

            // 部署バッジ
            if (displayOptions.showDepartmentBadge) {
                const deptName = getDeptName(employee.departmentId);
                const deptBadge = this.createSidebarBadge(deptName, 'dept', `部署: ${deptName}`);
                if (deptBadge) badgesContainer.appendChild(deptBadge);
            }

            // 所属班バッジ
            if (displayOptions.showTeam && employee.teamId) {
                const teamName = getTeamName(employee.teamId);
                if (teamName) {
                    const teamBadge = this.createSidebarBadge(teamName, 'team', `所属班: ${teamName}`);
                    if (teamBadge) badgesContainer.appendChild(teamBadge);
                }
            }

            // 役職バッジ
            if (displayOptions.showPosition && employee.position) {
                const posBadge = this.createSidebarBadge(employee.position, 'position', `役職: ${employee.position}`);
                if (posBadge) badgesContainer.appendChild(posBadge);
            }

            // 契約形態バッジ（新規追加）
            if (displayOptions.showContractType && employee.contractType) {
                const contractTypeName = getContractTypeName(employee.contractType);
                if (contractTypeName) {
                    const contractBadge = this.createSidebarBadge(contractTypeName, 'contract', `契約形態: ${contractTypeName}`);
                    if (contractBadge) badgesContainer.appendChild(contractBadge);
                }
            }

            // グレードバッジ
            if (displayOptions.showGrade) {
                const latestGrade = this.appController.appData.getLatestEmployeeGrade(employee.id);
                if (latestGrade) {
                    const gradeBadge = this.createSidebarBadge(latestGrade, 'grade', `最新グレード: ${latestGrade}`);
                    if (gradeBadge) {
                        const gradeNum = parseInt(String(latestGrade).replace('G', ''));
                        if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                            gradeBadge.style.backgroundColor = `var(--grade-${gradeNum})`;

                            document.body.appendChild(gradeBadge);
                            const bgHex = this.uiManager.getComputedBgHex(gradeBadge);
                            document.body.removeChild(gradeBadge);

                            this.uiManager.applyContrastColor(gradeBadge, bgHex);
                            gradeBadge.style.borderColor = 'rgba(0,0,0,0.1)';
                        }
                        badgesContainer.appendChild(gradeBadge);
                    }
                }
            }

            // バッジコンテナを項目に追加（子要素がある場合のみ）
            if (badgesContainer.hasChildNodes()) {
                item.appendChild(badgesContainer);
            }

            // 選択を切り替えるクリックイベント
            item.addEventListener('click', () => {
                const employeeId = parseInt(item.getAttribute('data-employee-id'));
                const index = this.appController.selectedEmployeeIds.indexOf(employeeId);
                if (index > -1) {
                    this.appController.selectedEmployeeIds.splice(index, 1);
                    item.classList.remove('selected');
                } else {
                    this.appController.selectedEmployeeIds.push(employeeId);
                    item.classList.add('selected');
                }
                this.appController.refreshChart();
            });
            container.appendChild(item);
        });
    }

    /**
     * サイドバーバッジを作成
     * @param {string} text バッジテキスト
     * @param {string} type バッジタイプ（dept/team/position/grade）
     * @param {string} title ツールチップテキスト
     * @returns {HTMLElement} 作成したバッジ要素または null
     */
    createSidebarBadge(text, type, title) {
        if (!text) return null;
        const badge = document.createElement('span');
        badge.className = `employee-badge ${type}`;
        badge.textContent = text;
        badge.title = title;

        // グレード以外はデフォルトの無彩色スタイルを適用
        if (type !== 'grade') {
            // スタイルは主にCSSで処理（.employee-badge）
        }
        // グレードのスタイルは呼び出し元で設定

        return badge;
    }

    // ----------------------
    // フィルターリストボックス
    // ----------------------
    
    /**
     * フィルターのリストボックスを更新
     * @param {string} listBoxId リストボックスのID
     * @param {Array} items 項目配列
     * @param {Set} selectedSet 選択されている値のセット
     * @param {string} valueKey 値のキー（オブジェクトの場合）
     * @param {string} textKey テキストのキー（オブジェクトの場合）
     * @param {boolean} sort ソートするかどうか
     */
    updateFilterListBox(listBoxId, items, selectedSet, valueKey = 'id', textKey = 'name', sort = true) {
        const listBox = document.getElementById(listBoxId);
        if (!listBox) return;

        const currentScrollTop = listBox.scrollTop; // スクロール位置を保存
        listBox.innerHTML = ''; // 既存のオプションをクリア

        let sortedItems = items;
        if (sort && items.length > 0) {
            // ソート用に項目がオブジェクトか単純な値かを確認
            const firstItem = items[0];
            if (typeof firstItem === 'object' && firstItem !== null && firstItem.hasOwnProperty(textKey)) {
                // オブジェクトをtextKeyでソート（null/undefinedを考慮）
                sortedItems = [...items].sort((a, b) => String(a[textKey] ?? '').localeCompare(String(b[textKey] ?? ''), 'ja'));
            } else if (typeof firstItem !== 'object' || firstItem === null) {
                // 単純な値（文字列、数値）をソート（null/undefinedを考慮）
                sortedItems = [...items].sort((a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'ja'));
            }
            // textKeyのないオブジェクトの場合、ソートしないか別の処理
        } else {
            // sort=false の場合は items をそのまま使用
            sortedItems = items;
        }

        // 各項目をリストボックスに追加
        sortedItems.forEach(item => {
            const value = typeof item === 'object' && item !== null ? item[valueKey] : item;
            const text = typeof item === 'object' && item !== null ? item[textKey] : item;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = text || '(未設定)'; // null/空のテキストには「(未設定)」を表示
            // 効率的な検索のためにSetの`has`メソッドを使用
            // 型の違い（数値と文字列など）を処理
            option.selected = selectedSet.has(String(value)) || selectedSet.has(Number(value));

            listBox.appendChild(option);
        });
        listBox.scrollTop = currentScrollTop; // スクロール位置を復元
    }

    // ----------------------
    // マスタデータ管理関連
    // ----------------------
    
    /**
     * 部署管理テーブルを更新
     */
    updateDepartmentTable() {
        const tableBody = document.getElementById('departmentTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const departments = this.appController.appData.getDepartments();
        const sortedDepartments = [...departments].sort((a, b) => a.id - b.id); // ID順にソート

        // 各部署の行を作成
        sortedDepartments.forEach(dept => {
            const row = tableBody.insertRow();
            row.setAttribute('data-department-id', dept.id);
            row.insertCell().textContent = dept.id;
            row.insertCell().textContent = dept.name;
            const actionCell = row.insertCell();
            actionCell.classList.add('action-cell');

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-table-action edit'; 
            editBtn.title = '編集'; 
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => {
                this.showInlineEditForm(dept.id, dept.name, '部署', (newName) => {
                    const success = this.appController.appData.updateDepartment(dept.id, newName.trim());
                    if (success) {
                        this.updateDepartmentTable();
                        this.appController.updateDepartmentFilter();
                        this.appController.populateDepartmentOptions();
                        this.uiManager.showNotification('success', '部署名を更新しました');
                    } else { 
                        this.uiManager.showNotification('error', '更新失敗'); 
                    }
                    return success;
                });
            });

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-table-action delete'; 
            deleteBtn.title = '削除'; 
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`部署「${dept.name}」を削除しますか？使用中の場合削除できません。`)) {
                    const success = this.appController.appData.deleteDepartment(dept.id);
                    if (success) {
                        this.updateDepartmentTable();
                        this.appController.filters.departments.delete(dept.id); // アクティブフィルターから削除
                        this.appController.updateDepartmentFilter();
                        this.appController.populateDepartmentOptions();
                        this.appController.refreshData();
                        this.uiManager.showNotification('success', '部署を削除しました');
                    } else { 
                        this.uiManager.showNotification('error', '削除不可', '部署が使用中のため削除できません。'); 
                    }
                }
            });
            actionCell.appendChild(editBtn); 
            actionCell.appendChild(deleteBtn);
        });
    }

    /**
     * インライン編集フォームを表示
     * @param {number} id 項目ID
     * @param {string} currentName 現在の名前
     * @param {string} entityType エンティティタイプ（部署/役職/所属班）
     * @param {Function} saveCallback 保存時のコールバック関数
     */
    showInlineEditForm(id, currentName, entityType, saveCallback) {
        // 対象の行を検索
        const row = document.querySelector(`tr[data-${entityType.toLowerCase()}-id="${id}"]`);
        if (!row) return;
        
        // 現在の表示を隠す
        row.style.display = 'none';
        
        // インラインフォームの作成
        const formRow = document.createElement('tr');
        formRow.className = 'edit-form-row';
        
        // ID列
        const idCell = document.createElement('td');
        idCell.textContent = id;
        formRow.appendChild(idCell);
        
        // 名前列（入力フィールド付き）
        const nameCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = currentName;
        input.style.width = '100%';
        nameCell.appendChild(input);
        formRow.appendChild(nameCell);
        
        // アクション列（保存・キャンセルボタン）
        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';
        
        // 保存ボタン
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-sm btn-primary';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => {
            const newName = input.value.trim();
            if (!newName) {
                this.uiManager.showNotification('warning', '入力エラー', `${entityType}名を入力してください。`);
                return;
            }
            
            if (newName === currentName) {
                // 変更がない場合は編集をキャンセル
                row.style.display = '';
                formRow.remove();
                return;
            }
            
            // 保存処理を実行
            const success = saveCallback(newName);
            if (success) {
                // 成功時は編集フォームを削除
                formRow.remove();
            }
        });
        
        // キャンセルボタン
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-sm btn-secondary';
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.style.marginLeft = '8px';
        cancelBtn.addEventListener('click', () => {
            row.style.display = '';
            formRow.remove();
        });
        
        actionCell.appendChild(saveBtn);
        actionCell.appendChild(cancelBtn);
        formRow.appendChild(actionCell);
        
        // 編集フォームを挿入
        row.parentNode.insertBefore(formRow, row.nextSibling);
        
        // 入力フィールドにフォーカス
        input.focus();
        input.select();
        
        // Enter/Escapeキー操作
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelBtn.click();
            }
        });
    }

    /**
     * 役職管理テーブルを更新
     */
    updatePositionTable() {
        const tableBody = document.getElementById('positionTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const positions = this.appController.appData.getPositions();
        const sortedPositions = [...positions].sort((a, b) => a.id - b.id); // ID順にソート

        // 各役職の行を作成
        sortedPositions.forEach(pos => {
            const row = tableBody.insertRow();
            row.setAttribute('data-position-id', pos.id);
            row.insertCell().textContent = pos.id;
            row.insertCell().textContent = pos.name;
            const actionCell = row.insertCell();
            actionCell.classList.add('action-cell');

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-table-action edit'; 
            editBtn.title = '編集'; 
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => {
                this.showInlineEditForm(pos.id, pos.name, '役職', (newName) => {
                    const success = this.appController.appData.updatePosition(pos.id, newName.trim());
                    if (success) {
                        this.updatePositionTable();
                        this.appController.updatePositionFilter();
                        this.appController.populatePositionOptions();
                        this.uiManager.showNotification('success', '役職名を更新しました');
                    } else { 
                        this.uiManager.showNotification('error', '更新失敗'); 
                    }
                    return success;
                });
            });

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-table-action delete'; 
            deleteBtn.title = '削除'; 
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`役職「${pos.name}」を削除しますか？使用中の場合削除できません。`)) {
                    const success = this.appController.appData.deletePosition(pos.id);
                    if (success) {
                        this.updatePositionTable();
                        this.appController.filters.positions.delete(pos.name);
                        this.appController.updatePositionFilter();
                        this.appController.populatePositionOptions();
                        this.appController.refreshData();
                        this.uiManager.showNotification('success', '役職を削除しました');
                    } else { 
                        this.uiManager.showNotification('error', '削除不可', '役職が使用中のため削除できません。'); 
                    }
                }
            });
            actionCell.appendChild(editBtn); 
            actionCell.appendChild(deleteBtn);
        });
    }
    
    /**
     * 所属班管理テーブルを更新
     */
    updateTeamTable() {
        const tableBody = document.getElementById('teamTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const teams = this.appController.appData.getTeams();
        const sortedTeams = [...teams].sort((a, b) => a.id - b.id); // ID順にソート

        // 各班の行を作成
        sortedTeams.forEach(team => {
            const row = tableBody.insertRow();
            row.setAttribute('data-team-id', team.id);
            row.insertCell().textContent = team.id;
            row.insertCell().textContent = team.name;
            const actionCell = row.insertCell();
            actionCell.classList.add('action-cell');

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-table-action edit'; 
            editBtn.title = '編集'; 
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => {
                this.showInlineEditForm(team.id, team.name, '所属班', (newName) => {
                    const success = this.appController.appData.updateTeam(team.id, newName.trim());
                    if (success) {
                        this.updateTeamTable();
                        this.appController.updateTeamFilter();
                        this.appController.populateTeamOptions();
                        this.uiManager.showNotification('success', '所属班名を更新しました');
                    } else { 
                        this.uiManager.showNotification('error', '更新失敗'); 
                    }
                    return success;
                });
            });

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-table-action delete'; 
            deleteBtn.title = '削除'; 
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`所属班「${team.name}」を削除しますか？使用中の場合削除できません。`)) {
                    const success = this.appController.appData.deleteTeam(team.id);
                    if (success) {
                        this.updateTeamTable();
                        this.appController.filters.teams.delete(team.id);
                        this.appController.updateTeamFilter();
                        this.appController.populateTeamOptions();
                        this.appController.refreshData();
                        this.uiManager.showNotification('success', '所属班を削除しました');
                    } else { 
                        this.uiManager.showNotification('error', '削除不可', '所属班が使用中のため削除できません。'); 
                    }
                }
            });
            actionCell.appendChild(editBtn); 
            actionCell.appendChild(deleteBtn);
        });
    }

    /**
     * 共通の評価テーブル更新関数 - グレードと年度評価に対応
     * @param {string} tablePrefix テーブルIDのプレフィックス ('g'=グレード, 'a'/'b'/'c'=年度評価)
     * @param {string} evalType 評価タイプ ('G'=グレード, 'A'/'B'/'C'=年度評価)
     */
    updateEvalTypeTable(tablePrefix, evalType) {
        const tableBody = document.getElementById(`${tablePrefix}EvalTableBody`);
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // 評価タイプに応じてデータを取得
        let evaluations;
        if (evalType === 'G') {
            // グレード評価の場合、直接グレードオプションを取得
            evaluations = this.appController.appData.getGradeOptions();
        } else {
            // 年度評価の場合、評価タイプ（A/B/C）に応じたデータを取得
            evaluations = this.appController.appData.getYearlyEvaluationOptions()[evalType];
        }
        
        // データがない場合のメッセージ表示
        if (!evaluations || evaluations.length === 0) {
            const row = tableBody.insertRow();
            row.className = 'empty-message-row';
            const cell = row.insertCell();
            cell.colSpan = 2;
            cell.textContent = `${evalType}評価が登録されていません。`;
            cell.style.textAlign = 'center';
            cell.style.padding = 'var(--spacing-sm)';
            cell.style.color = 'var(--base-dark-gray)';
            return;
        }
        
        // 数値部分でソート
        const sortedEvals = [...evaluations].sort((a, b) => {
            const aNum = parseInt(a.substring(1));
            const bNum = parseInt(b.substring(1));
            return aNum - bNum;
        });
        
        // 各評価の行を作成
        sortedEvals.forEach(evaluation => {
            const row = tableBody.insertRow();
            
            // 評価タイプに応じた属性を設定
            if (evalType === 'G') {
                row.setAttribute('data-grade-id', evaluation);
            } else {
                row.setAttribute(`data-${evalType.toLowerCase()}-eval-id`, evaluation);
            }
            
            // 評価名を表示
            const evalCell = row.insertCell();
            const evalBadge = document.createElement('div');
            evalBadge.className = 'evaluation-card';
            
            // 評価タイプに応じたクラスを追加
            if (evalType === 'G') {
                evalBadge.classList.add('grade-evaluation');
                // グレードの場合は色を設定
                const gradeNum = parseInt(evaluation.substring(1));
                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                    evalBadge.style.backgroundColor = `var(--grade-${gradeNum})`;
                    
                    // 一時的にDOMに追加してスタイル計算
                    document.body.appendChild(evalBadge);
                    const bgHex = this.uiManager.getComputedBgHex(evalBadge);
                    document.body.removeChild(evalBadge);
                    
                    // コントラスト計算
                    this.uiManager.applyContrastColor(evalBadge, bgHex);
                    evalBadge.style.borderColor = 'rgba(0,0,0,0.1)';
                }
            } else {
                evalBadge.classList.add('yearly-evaluation');
                evalBadge.dataset.evalType = evalType;
            }
            
            evalBadge.textContent = evaluation;
            evalCell.appendChild(evalBadge);
            
            // 操作ボタン列
            const actionCell = row.insertCell();
            actionCell.classList.add('action-cell');
            
            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-table-action edit';
            editBtn.title = '編集';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            
            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-table-action delete';
            deleteBtn.title = '削除';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtn);
        });
    }

    /**
     * グレード管理テーブルを更新
     */
    updateGradeTable() {
        this.updateEvalTypeTable('g', 'G');
    }
    
    /**
     * A評価管理テーブルを更新
     */
    updateAEvalTable() {
        this.updateEvalTypeTable('a', 'A');
    }
    
    /**
     * B評価管理テーブルを更新
     */
    updateBEvalTable() {
        this.updateEvalTypeTable('b', 'B');
    }
    
    /**
     * C評価管理テーブルを更新
     */
    updateCEvalTable() {
        this.updateEvalTypeTable('c', 'C');
    }
}