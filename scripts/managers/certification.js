/**
 * 統合資格管理モジュール
 * 資格マスタ、作業認定、資格割り当て機能を統合管理
 */
class CertificationManager {
  /**
   * 資格管理マネージャーの初期化
   * @param {AppController|SettingsManager} controller 親コントローラー（AppControllerまたはSettingsManager）
   */
  constructor(controller) {
    // 親コントローラーの種類を判定
    if (controller.constructor.name === 'SettingsManager') {
      this.settingsManager = controller;
      this.appController = controller.appController;
    } else {
      this.appController = controller;
      this.settingsManager = controller.settingsManager;
    }
    
    this.appData = this.appController.appData;
    this.appUI = this.appController.appUI;
    
    // イベントリスナー初期化フラグ
    this.eventListenersInitialized = false;
  }
  
  /**
   * イベントリスナーの初期化
   */
  setupEventListeners() {
    // 既に初期化済みなら処理をスキップ
    if (this.eventListenersInitialized) return;
    
    // 資格管理機能のイベントリスナー設定
    this.setupQualificationEventListeners();
    
    // 作業認定管理機能のイベントリスナー設定
    this.setupWorkCertificationEventListeners();
    
    // 社員の資格・認定管理機能のイベントリスナー設定
    this.setupEmployeeCertificationEventListeners();
    
    // インポート・エクスポート関連のイベントリスナー設定
    this.setupImportExportEventListeners();
    
    // 検索フィルター関連のイベントリスナー設定
    this.setupSearchFilterEventListeners();
    
    // 初期化完了フラグをセット
    this.eventListenersInitialized = true;
  }
  
  /**
   * 資格管理機能のイベントリスナー設定
   */
  setupQualificationEventListeners() {
    // 資格マスタ管理モーダルを開くボタン
    const openQualificationManagementBtn = document.getElementById('openQualificationManagementBtn');
    if (openQualificationManagementBtn) {
      openQualificationManagementBtn.addEventListener('click', () => {
        this.showQualificationManagementModal();
      });
    }
    
    // 資格追加ボタン
    const addQualificationBtn = document.getElementById('addQualificationBtn');
    if (addQualificationBtn) {
      addQualificationBtn.addEventListener('click', () => {
        this.showQualificationModal();
      });
    }
    
    // ✅ 修正: 保存ボタンのイベントリスナーを削除（showQualificationModalで設定）
    // 既存のコードを削除
    
    // 資格モーダルのキャンセルボタン
    const cancelQualificationBtn = document.getElementById('cancelQualificationBtn');
    if (cancelQualificationBtn) {
      cancelQualificationBtn.addEventListener('click', () => {
        this.appUI.hideModal('qualificationModal');
      });
    }
    
    // 資格モーダルのクローズボタン
    const closeQualificationModal = document.getElementById('closeQualificationModal');
    if (closeQualificationModal) {
      closeQualificationModal.addEventListener('click', () => {
        this.appUI.hideModal('qualificationModal');
      });
    }

    // 資格追加ボタン (設定画面内)
    const addQualificationBtnMaster = document.getElementById('addQualificationBtn'); // これは設定パネル内のボタンID
    if (addQualificationBtnMaster) {
      addQualificationBtnMaster.addEventListener('click', () => {
        this.showQualificationModal(); // 新規追加なのでIDなし
      });
    }

    // 作業認定追加ボタン (設定画面内)
    const addWorkCertificationBtnMaster = document.getElementById('addWorkCertificationBtn'); // これも設定パネル内のボタンID
    if (addWorkCertificationBtnMaster) {
      addWorkCertificationBtnMaster.addEventListener('click', () => {
        this.showWorkCertificationModal(); // 新規追加なのでIDなし
      });
    }

  }
  
  /**
   * 作業認定管理機能のイベントリスナー設定
   */
  setupWorkCertificationEventListeners() {
    // 作業認定追加ボタン
    const addWorkCertificationBtn = document.getElementById('addWorkCertificationBtn');
    if (addWorkCertificationBtn) {
      addWorkCertificationBtn.addEventListener('click', () => {
        this.showWorkCertificationModal();
      });
    }
    
    // ✅ 修正: 保存ボタンのイベントリスナーを削除（showWorkCertificationModalで設定）
    // 既存のコードを削除
    
    // 作業認定モーダルのキャンセルボタン
    const cancelWorkCertificationBtn = document.getElementById('cancelWorkCertificationBtn');
    if (cancelWorkCertificationBtn) {
      cancelWorkCertificationBtn.addEventListener('click', () => {
        this.appUI.hideModal('workCertificationModal');
      });
    }
    
    // 作業認定モーダルのクローズボタン
    const closeWorkCertificationModal = document.getElementById('closeWorkCertificationModal');
    if (closeWorkCertificationModal) {
      closeWorkCertificationModal.addEventListener('click', () => {
        this.appUI.hideModal('workCertificationModal');
      });
    }
  }
  
/**
   * 資格の保存とモーダルクローズ
   */
saveQualificationAndClose() {
    console.log('saveQualificationAndClose メソッドが呼ばれました');
    
    const form = document.getElementById('qualificationForm');
    if (!form) {
      console.error('qualificationForm が見つかりません');
      return;
    }
    console.log('フォーム要素が見つかりました');
    
    // バリデーションチェック
    const isValid = form.checkValidity();
    console.log('フォームバリデーション結果:', isValid);
    
    if (!isValid) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      console.log('バリデーションエラーのため処理を終了');
      return;
    }
    
    // データ収集
    const qualificationData = {
      name: document.getElementById('qualificationName')?.value?.trim() || '',
      category: document.getElementById('qualificationCategory')?.value?.trim() || '',
      description: document.getElementById('qualificationDescription')?.value?.trim() || '',
      validMonths: document.getElementById('qualificationValidMonths')?.value || 0,
      issuer: document.getElementById('qualificationIssuer')?.value?.trim() || ''
    };
    console.log('収集した資格データ:', qualificationData);
    
    const idInput = document.getElementById('qualificationId');
    const qualificationId = idInput?.value || null;
    console.log('資格ID:', qualificationId);
    
    try {
      let success = false;
      let message = '';
      
      if (qualificationId) { // 更新
        console.log('更新処理を実行中...');
        qualificationData.id = qualificationId;
        success = this.appData.updateQualification(qualificationData);
        message = success ? `資格「${qualificationData.name}」を更新しました` : "更新対象が見つかりません";
      } else { // 新規追加
        console.log('新規追加処理を実行中...');
        const newId = this.appData.addQualification(qualificationData);
        success = !!newId;
        message = success ? `資格「${qualificationData.name}」を登録しました` : "資格追加失敗";
      }
      
      console.log('保存処理結果:', success, message);
      
      if (success) {
        console.log('保存成功、モーダルを閉じます');
        
        // ✅ 確実にモーダルを閉じる
        this.appUI.hideModal('qualificationModal');
        
        // データ更新と通知
        this.refreshQualificationList();
        this.appUI.showNotification('success', '保存完了', message);
        
        console.log('資格保存完了:', qualificationData);
      } else {
        console.log('保存失敗:', message);
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error saving qualification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
}

/**
 * 作業認定の保存とモーダルクローズ
 */
saveWorkCertificationAndClose() {
    
    const form = document.getElementById('workCertificationForm');
    if (!form) {
      console.error('workCertificationForm が見つかりません');
      return;
    }
    
    // バリデーションチェック
    const isValid = form.checkValidity();
    console.log('フォームバリデーション結果:', isValid);
    
    if (!isValid) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      console.log('バリデーションエラーのため処理を終了');
      return;
    }
    
    // データ収集
    const certificationData = {
      name: document.getElementById('workCertificationName')?.value?.trim() || '',
      category: document.getElementById('workCertificationCategory')?.value?.trim() || '',
      classification: document.getElementById('workCertificationClassification')?.value?.trim() || '',
      description: document.getElementById('workCertificationDescription')?.value?.trim() || '',
      validMonths: document.getElementById('workCertificationValidMonths')?.value || 0,
      requiredTraining: document.getElementById('workCertificationRequiredTraining')?.value?.trim() || ''
    };
    console.log('収集した作業認定データ:', certificationData);
    
    const idInput = document.getElementById('workCertificationId');
    const certificationId = idInput?.value || null;
    console.log('作業認定ID:', certificationId);
    
    try {
      let success = false;
      let message = '';
      
      if (certificationId) { // 更新
        certificationData.id = certificationId;
        success = this.appData.updateWorkCertification(certificationData);
        message = success ? `作業認定「${certificationData.name}」を更新しました` : "更新対象が見つかりません";
      } else { 
        const newId = this.appData.addWorkCertification(certificationData);
        success = !!newId;
        message = success ? `作業認定「${certificationData.name}」を登録しました` : "作業認定追加失敗";
      }
      
      if (success) {
        this.appUI.hideModal('workCertificationModal');
        this.refreshCertificationList();
        this.appUI.showNotification('success', '保存完了', message);
      } else {
        console.log('保存失敗:', message);
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error saving work certification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
}


  /**
   * 社員の資格・認定管理機能のイベントリスナー設定
   */
  setupEmployeeCertificationEventListeners() {
    // 社員の資格・認定管理ボタン (おそらく settings.js 側で処理)
    
    // 社員資格管理モーダルのクローズボタン (存在しない可能性あり、もしあれば)
    const closeEmployeeQualificationModal = document.getElementById('closeEmployeeQualificationModal');
    if (closeEmployeeQualificationModal) {
      closeEmployeeQualificationModal.addEventListener('click', () => {
        this.appUI.hideModal('employeeQualificationModal');
      });
    }
    
    // 社員資格管理モーダルのタブ (存在しない可能性あり、もしあれば)
    const employeeQualificationTabs = document.querySelectorAll('#employeeQualificationModal .tab');
    if (employeeQualificationTabs.length > 0) {
      employeeQualificationTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('#employeeQualificationModal .tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('#employeeQualificationModal .tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          const tabId = tab.getAttribute('data-tab');
          document.getElementById(`${tabId}-tab`)?.classList.add('active');
        });
      });
    }
    
    // 資格割り当てボタン (社員資格設定セクション内のボタンを参照)
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'addEmployeeQualificationBtn') {
            const employeeIdInput = document.querySelector('#employeeQualificationsContent input[name="employeeIdForQualification"]'); // 仮のID
            const employeeId = employeeIdInput ? parseInt(employeeIdInput.value) : null;
            if (employeeId) {
                this.showAssignQualificationModal(employeeId);
            } else {
                console.warn("資格追加ボタン: 社員IDが取得できませんでした。");
            }
        }
    });


    // 作業認定割り当てボタン (社員資格設定セクション内のボタンを参照)
     document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'addEmployeeCertificationBtn') {
            const employeeIdInput = document.querySelector('#employeeQualificationsContent input[name="employeeIdForCertification"]'); // 仮のID
            const employeeId = employeeIdInput ? parseInt(employeeIdInput.value) : null;
            if (employeeId) {
                this.showAssignCertificationModal(employeeId);
            } else {
                console.warn("認定追加ボタン: 社員IDが取得できませんでした。");
            }
        }
    });
    
    // 資格割り当てモーダルのクローズボタン
    const closeAssignQualificationModal = document.getElementById('closeAssignQualificationModal');
    if (closeAssignQualificationModal) {
      closeAssignQualificationModal.addEventListener('click', () => {
        this.appUI.hideModal('assignQualificationModal');
      });
    }
    
    // 作業認定割り当てモーダルのクローズボタン
    const closeAssignCertificationModal = document.getElementById('closeAssignCertificationModal');
    if (closeAssignCertificationModal) {
      closeAssignCertificationModal.addEventListener('click', () => {
        this.appUI.hideModal('assignCertificationModal');
      });
    }
    
    // 資格割り当て保存ボタン
    const saveAssignQualificationBtn = document.getElementById('saveAssignQualificationBtn');
    if (saveAssignQualificationBtn) {
      saveAssignQualificationBtn.addEventListener('click', () => {
        this.saveAssignQualification();
      });
    }
    
    // 作業認定割り当て保存ボタン
    const saveAssignCertificationBtn = document.getElementById('saveAssignCertificationBtn');
    if (saveAssignCertificationBtn) {
      saveAssignCertificationBtn.addEventListener('click', () => {
        this.saveAssignCertification();
      });
    }
    
    // 資格割り当てキャンセルボタン
    const cancelAssignQualificationBtn = document.getElementById('cancelAssignQualificationBtn');
    if (cancelAssignQualificationBtn) {
      cancelAssignQualificationBtn.addEventListener('click', () => {
        this.appUI.hideModal('assignQualificationModal');
      });
    }
    
    // 作業認定割り当てキャンセルボタン
    const cancelAssignCertificationBtn = document.getElementById('cancelAssignCertificationBtn');
    if (cancelAssignCertificationBtn) {
      cancelAssignCertificationBtn.addEventListener('click', () => {
        this.appUI.hideModal('assignCertificationModal');
      });
    }
  }
  
  /**
   * インポート・エクスポート関連のイベントリスナー設定
   */
  setupImportExportEventListeners() {
    // 資格インポートボタン
    const importQualificationsBtn = document.getElementById('importQualificationsBtn');
    if (importQualificationsBtn) {
      importQualificationsBtn.addEventListener('click', () => {
        this.showCsvImportModal('qualification');
      });
    }
    
    // 作業認定インポートボタン
    const importWorkCertificationsBtn = document.getElementById('importWorkCertificationsBtn');
    if (importWorkCertificationsBtn) {
      importWorkCertificationsBtn.addEventListener('click', () => {
        this.showCsvImportModal('workCertification');
      });
    }
    
    // CSVインポートモーダルのクローズボタン
    const closeCsvImportModal = document.getElementById('closeCsvImportModal');
    if (closeCsvImportModal) {
      closeCsvImportModal.addEventListener('click', () => {
        this.appUI.hideModal('csvImportModal');
      });
    }
    
    // CSVインポートモーダルのキャンセルボタン
    const cancelCsvImportBtn = document.getElementById('cancelCsvImportBtn');
    if (cancelCsvImportBtn) {
      cancelCsvImportBtn.addEventListener('click', () => {
        this.appUI.hideModal('csvImportModal');
      });
    }
    
    // CSVインポート実行ボタン
    const executeCsvImportBtn = document.getElementById('executeCsvImportBtn');
    if (executeCsvImportBtn) {
      executeCsvImportBtn.addEventListener('click', () => {
        this.executeCsvImport();
      });
    }
    
    // CSVファイル選択変更
    const csvImportFile = document.getElementById('csvImportFile');
    if (csvImportFile) {
      csvImportFile.addEventListener('change', (e) => {
        this.handleCsvFileSelect(e);
      });
    }
    
    // CSVファイル選択解除ボタン
    const removeCsvFileBtn = document.getElementById('removeCsvFileBtn');
    if (removeCsvFileBtn) {
      removeCsvFileBtn.addEventListener('click', () => {
        this.clearCsvFileSelection();
      });
    }
    
    // CSVファイルドロップエリア
    this.setupCsvDropArea();
  }
  
  /**
   * 検索フィルター関連のイベントリスナー設定
   */
  setupSearchFilterEventListeners() {
    // 資格検索フィールド
    const qualificationSearch = document.getElementById('qualificationSearch');
    if (qualificationSearch) {
      qualificationSearch.addEventListener('input', () => {
        this.filterTable(
          'qualificationSearch',
          'qualificationTable',
          'tbody tr:not(.empty-message-row):not(.no-results-message)',
          'data-search-terms'
        );
      });
    }
    
    // 作業認定検索フィールド
    const certificationSearch = document.getElementById('certificationSearch');
    if (certificationSearch) {
      certificationSearch.addEventListener('input', () => {
        this.filterTable(
          'certificationSearch',
          'workCertificationTable',
          'tbody tr:not(.empty-message-row):not(.no-results-message)',
          'data-search-terms'
        );
      });
    }
    
    // 社員の資格検索フィールド (おそらく employee.js 側で処理)
    const employeeQualificationSearch = document.getElementById('employeeQualificationSearch');
    if (employeeQualificationSearch) {
      employeeQualificationSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const employeeSelectorItems = document.querySelectorAll('#employeeSelector .employee-selector-item');
        employeeSelectorItems.forEach(item => {
            const employeeName = item.textContent.toLowerCase();
            if (employeeName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
      });
    }
  }
  
  /**
   * CSVファイルドロップエリアの設定
   */
  setupCsvDropArea() {
    const csvDropArea = document.getElementById('csvDropArea');
    if (!csvDropArea) return;
    
    // ドラッグ&ドロップイベント
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      csvDropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // ドラッグ中のスタイル
    ['dragenter', 'dragover'].forEach(eventName => {
      csvDropArea.addEventListener(eventName, () => {
        csvDropArea.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      csvDropArea.addEventListener(eventName, () => {
        csvDropArea.classList.remove('drag-over');
      });
    });
    
    // ファイルドロップ
    csvDropArea.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fileInput = document.getElementById('csvImportFile');
        if (fileInput) {
          fileInput.files = files;
          // ファイル選択イベントを手動で発生させる
          fileInput.dispatchEvent(new Event('change'));
        }
      }
    });
    
    // クリックでファイル選択ダイアログを開く
    csvDropArea.addEventListener('click', () => {
      const fileInput = document.getElementById('csvImportFile');
      if (fileInput) fileInput.click();
    });
  }
  
  /**
   * CSVファイル選択ハンドラー
   */
  handleCsvFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      const fileInfo = document.getElementById('csvFileInfo');
      const fileName = document.getElementById('csvFileName');
      const fileSize = document.getElementById('csvFileSize');
      const dropArea = document.getElementById('csvDropArea');
      const importBtn = document.getElementById('executeCsvImportBtn');
      
      // ファイル情報表示
      if (fileName) fileName.textContent = file.name;
      if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
      if (fileInfo) fileInfo.style.display = 'flex';
      if (dropArea) dropArea.style.display = 'none';
      
      // インポートボタン有効化
      if (importBtn) importBtn.disabled = false;
    }
  }
  
  /**
   * CSVファイル選択クリア
   */
  clearCsvFileSelection() {
    const fileInput = document.getElementById('csvImportFile');
    const fileInfo = document.getElementById('csvFileInfo');
    const dropArea = document.getElementById('csvDropArea');
    const importBtn = document.getElementById('executeCsvImportBtn');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (dropArea) dropArea.style.display = 'flex';
    if (importBtn) importBtn.disabled = true;
  }
  
  /**
   * 資格マスタ管理モーダルを表示 (settings.js側でメインのモーダル表示を処理)
   */
  showQualificationManagementModal() {
    if (this.settingsManager && typeof this.settingsManager.showModal === 'function') {
      this.settingsManager.showModal('settingsModal'); // 統合モーダルを表示
      setTimeout(() => {
        this.settingsManager.switchSection('qualification'); // 資格マスタセクションに切り替え
        this.refreshQualificationList();
        const searchInput = document.getElementById('qualificationSearch');
        if (searchInput) searchInput.value = '';
      }, 100);
    } else if (typeof this.appUI.showModal === 'function') { // SettingsManagerがない場合（直接AppControllerから呼ばれるなど）
        this.appUI.showModal('qualificationManagementModal');
        this.refreshQualificationList();
        const searchInput = document.getElementById('qualificationSearch');
        if (searchInput) searchInput.value = '';
    }
  }
  
  /**
   * 作業認定マスタ管理モーダルを表示 (settings.js側でメインのモーダル表示を処理)
   */
  showWorkCertificationManagementModal() {
     if (this.settingsManager && typeof this.settingsManager.showModal === 'function') {
      this.settingsManager.showModal('settingsModal'); // 統合モーダルを表示
      setTimeout(() => {
        this.settingsManager.switchSection('certification'); // 作業認定マスタセクションに切り替え
        this.refreshCertificationList();
        const searchInput = document.getElementById('certificationSearch');
        if (searchInput) searchInput.value = '';
      }, 100);
    } else if (typeof this.appUI.showModal === 'function') {
        this.appUI.showModal('workCertificationManagementModal');
        this.refreshCertificationList();
        const searchInput = document.getElementById('certificationSearch');
        if (searchInput) searchInput.value = '';
    }
  }
  
  /**
   * 資格モーダルの表示
   * @param {string} qualificationId 編集時の資格ID
   */
  showQualificationModal(qualificationId = null) {
      const form = document.getElementById('qualificationForm');
      const titleElem = document.getElementById('qualificationModalTitle');
      const idInput = document.getElementById('qualificationId');
      
      if (form) form.reset();
      
      if (qualificationId) {
          let qualification;
          const qualifications = this.appData.getQualifications();
          qualification = qualifications.find(q => q.id == qualificationId);
          
          if (qualification) {
              titleElem.innerHTML = '<i class="fas fa-certificate"></i> 資格編集';
              idInput.value = qualification.id;
              document.getElementById('qualificationName').value = qualification.name;
              document.getElementById('qualificationCategory').value = qualification.category || '';
              document.getElementById('qualificationDescription').value = qualification.description || '';
              document.getElementById('qualificationValidMonths').value = qualification.validMonths || 0;
              document.getElementById('qualificationIssuer').value = qualification.issuer || '';
          } else {
              console.error(`Qualification with ID ${qualificationId} not found.`);
              this.appUI.showNotification('error', 'エラー', '編集対象の資格が見つかりません。');
              return;
          }
      } else {
          titleElem.innerHTML = '<i class="fas fa-certificate"></i> 資格追加';
          idInput.value = '';
      }
      
      // ✅ 修正: モーダル表示前に保存ボタンのイベントリスナーを設定
      const saveBtn = document.getElementById('saveQualificationBtn');
      if (saveBtn) {
          // 既存のイベントリスナーをクリア
          const newSaveBtn = saveBtn.cloneNode(true);
          saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
          
          // 新しいイベントリスナーを設定
          newSaveBtn.addEventListener('click', (e) => {
              console.log('資格保存ボタンがクリックされました');
              e.preventDefault();
              e.stopPropagation();
              this.saveQualificationAndClose();
          });
      }
      
      this.appUI.showModal('qualificationModal');
  }
  
  /**
   * 作業認定モーダルの表示
   * @param {string} certificationId 編集時の作業認定ID
   */
  showWorkCertificationModal(certificationId = null) {
    const form = document.getElementById('workCertificationForm');
    const titleElem = document.getElementById('workCertificationModalTitle');
    const idInput = document.getElementById('workCertificationId');
    
    if (form) form.reset();
    
    if (certificationId) {
      let certification;
      if (this.appData && typeof this.appData.getWorkCertification === 'function') {
        certification = this.appData.getWorkCertification(certificationId);
      } else if (this.appData && typeof this.appData.getWorkCertifications === 'function') {
        const certifications = this.appData.getWorkCertifications();
        certification = certifications.find(c => c.id === certificationId);
      }
      
      if (certification) {
        titleElem.innerHTML = '<i class="fas fa-tools"></i> 作業認定編集';
        idInput.value = certification.id;
        document.getElementById('workCertificationName').value = certification.name;
        document.getElementById('workCertificationCategory').value = certification.category || '';
        document.getElementById('workCertificationClassification').value = certification.classification || '';
        document.getElementById('workCertificationDescription').value = certification.description || '';
        document.getElementById('workCertificationValidMonths').value = certification.validMonths || 0;
        document.getElementById('workCertificationRequiredTraining').value = certification.requiredTraining || '';
      } else {
        console.error(`Certification with ID ${certificationId} not found.`);
        this.appUI.showNotification('error', 'エラー', '編集対象の作業認定が見つかりません。');
        return;
      }
    } else {
      titleElem.innerHTML = '<i class="fas fa-tools"></i> 作業認定追加';
      idInput.value = '';
    }
    
    // ✅ 修正: モーダル表示前に保存ボタンのイベントリスナーを設定
    const saveBtn = document.getElementById('saveWorkCertificationBtn');
    if (saveBtn) {
        // 既存のイベントリスナーをクリア
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        // 新しいイベントリスナーを設定
        newSaveBtn.addEventListener('click', (e) => {
            console.log('作業認定保存ボタンがクリックされました');
            e.preventDefault();
            e.stopPropagation();
            this.saveWorkCertificationAndClose();
        });
    }
    
    this.appUI.showModal('workCertificationModal');
  }
  
  /**
   * CSVインポートモーダルを表示
   * @param {string} type インポートタイプ ('qualification'または'workCertification')
   */
  showCsvImportModal(type) {
    const modal = document.getElementById('csvImportModal');
    const title = document.getElementById('csvImportModalTitle');
    const info = document.getElementById('csvImportInfo');
    const description = document.getElementById('csvImportDescription');
    const typeField = document.getElementById('csvImportType');
    
    if (!modal || !title || !info || !description || !typeField) return;
    
    // モーダル内容設定
    if (type === 'qualification') {
      title.innerHTML = '<i class="fas fa-file-import"></i> 資格CSVインポート';
      info.textContent = '資格マスタCSVインポート';
      description.textContent = '資格データをCSV形式でインポートします。ID,資格名,カテゴリ,説明,有効期間(月),発行機関 の形式で準備してください。';
      typeField.value = 'qualification';
    } else if (type === 'workCertification') {
      title.innerHTML = '<i class="fas fa-file-import"></i> 作業認定CSVインポート';
      info.textContent = '作業認定マスタCSVインポート';
      description.textContent = '作業認定データをCSV形式でインポートします。ID,作業名,カテゴリ,区分,説明,有効期間(月),必要研修 の形式で準備してください。';
      typeField.value = 'workCertification';
    }
    
    // ファイル選択をリセット
    this.clearCsvFileSelection();
    
    // モーダル表示
    this.appUI.showModal('csvImportModal');
  }
  
  /**
   * 社員の資格管理モーダルを表示 (settings.jsのemployeeManagerから呼び出されることを想定)
   * @param {number} employeeId 社員ID
   */
  showEmployeeQualificationModal(employeeId) {
    if (!this.appData) return;
    const employee = this.appData.getEmployee(employeeId);
    if (!employee) {
      this.appUI.showNotification('error', 'エラー', '社員が見つかりません。');
      return;
    }
    
    // 社員名をモーダルタイトルに設定
    const nameElem = document.getElementById('employeeQualificationName'); // employeeQualificationModal内の社員名表示用
    if (nameElem) nameElem.textContent = employee.name;
    
    // 社員IDを隠しフィールドに設定 (資格/認定割り当てモーダル用)
    document.querySelectorAll('#assignQualificationEmployeeId, #assignCertificationEmployeeId').forEach(input => {
      if (input) input.value = employeeId;
    });
    
    // 資格・作業認定テーブルを更新
    this.updateEmployeeQualificationTable(employeeId);
    this.updateEmployeeCertificationTable(employeeId);
    
    // 検索フィールドをクリア
    const searchInputs = document.querySelectorAll('#employeeQualificationSearch, #employeeCertificationSearch');
    searchInputs.forEach(input => {
      if (input) input.value = '';
    });
    
    // 最初のタブをアクティブに
    const tabContainer = document.querySelector('#employeeQualificationModal .tabs');
    if (tabContainer) {
      const tabs = tabContainer.querySelectorAll('.tab');
      const contents = document.querySelectorAll('#employeeQualificationModal .tab-content');
      
      tabs.forEach(tab => tab.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));
      
      if (tabs.length > 0) tabs[0].classList.add('active');
      if (contents.length > 0) contents[0].classList.add('active');
    }
    
    this.appUI.showModal('employeeQualificationModal');
  }
  
  /**
   * 資格割り当てモーダルを表示（修正版）
   * @param {number} employeeId 社員ID
   * @param {string} assignmentId 資格割り当てID（編集時のみ）
   * @param {string} presetQualificationId 事前選択する資格ID（星取表からの呼び出し時）
   */
  showAssignQualificationModal(employeeId, assignmentId = null, presetQualificationId = null) {
      console.log('[showAssignQualificationModal] Called with employeeId:', employeeId, 'assignmentId:', assignmentId, 'presetQualificationId:', presetQualificationId);

      const form = document.getElementById('assignQualificationForm');
      const titleElem = document.getElementById('assignQualificationModalTitle');
      const employeeIdInput = document.getElementById('assignQualificationEmployeeId');
      const assignmentIdInput = document.getElementById('assignQualificationId');
      const deleteBtn = document.getElementById('deleteAssignQualificationBtn'); // 削除ボタンを取得

      if (form) form.reset();
      if (employeeIdInput) employeeIdInput.value = employeeId; // フォーム内のhidden inputに社員IDを設定

      const isFromStarChart = (presetQualificationId !== null && presetQualificationId !== undefined && presetQualificationId !== '');
      const isEditMode = (assignmentId !== null && assignmentId !== undefined && assignmentId !== '');

      const employeeNameDisplay = document.getElementById('assignQualificationEmployeeName');
      // ... (社員名表示のロジックはそのまま) ...
      if (employeeId && employeeNameDisplay) {
          const employee = this.appData.getEmployee(employeeId);
          if (employee) {
              employeeNameDisplay.textContent = employee.name;
          } else {
              employeeNameDisplay.textContent = '（対象社員情報なし）';
          }
      } else if (employeeNameDisplay) {
          employeeNameDisplay.textContent = '（対象社員未選択）';
      }

      this.populateQualificationOptions(); // 資格の選択肢を生成
      this.setupQualificationExpiryCalculation();
      this.setupDateYearSyncImproved(); // 資格用の日付と年度の同期

      const qualificationSelect = document.getElementById('selectQualification');
      const acquiredDateInput = document.getElementById('qualificationAcquiredDate');
      const expiryDateInput = document.getElementById('qualificationExpiryDate');
      const yearSelect = document.getElementById('qualificationYear'); // 年度のselect要素
      const statusSelect = document.getElementById('qualificationStatus'); // 状態のselect要素
      const notesInput = document.getElementById('qualificationAssignmentNotes'); // 備考のtextarea要素

      if (isEditMode) {
          // 編集モードの処理
          const employeeQualifications = this.appData.getEmployeeQualifications(employeeId);
          const assignment = employeeQualifications.find(eq => eq.id == assignmentId); // == で比較

          if (assignment) {
              titleElem.innerHTML = '<i class="fas fa-certificate"></i> 資格情報の編集';
              if (assignmentIdInput) assignmentIdInput.value = assignment.id;
              if (qualificationSelect) {
                  qualificationSelect.value = String(assignment.qualificationId);
                  qualificationSelect.disabled = true; // 編集時は資格自体は変更不可
              }
              if (yearSelect) yearSelect.value = assignment.year || new Date().getFullYear();
              if (statusSelect) statusSelect.value = assignment.status || 'acquired';
              if (acquiredDateInput) acquiredDateInput.value = this.formatDateForInput(assignment.dateAcquired);
              if (expiryDateInput && assignment.expiryDate) expiryDateInput.value = this.formatDateForInput(assignment.expiryDate);
              if (notesInput) notesInput.value = assignment.notes || '';

              if (deleteBtn) {
                  deleteBtn.style.display = 'inline-block';
                  // ★ 既存の削除ボタンリスナーをクリアして再設定
                  const newDeleteBtn = deleteBtn.cloneNode(true);
                  deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                  newDeleteBtn.addEventListener('click', () => {
                      const qualification = this.appData.getQualifications().find(q => q.id === assignment.qualificationId);
                      const qualificationName = qualification ? qualification.name : '不明な資格';
                      this.deleteEmployeeQualification(assignmentId, qualificationName);
                      this.appUI.hideModal('assignQualificationModal');
                  });
              }
              this.updateQualificationExpiryDate(); // 有効期限を再計算・表示
          } else {
              this.appUI.showNotification('error', 'エラー', '編集対象の資格情報が見つかりません。');
              return;
          }
      } else {
          // 新規追加モードの処理
          titleElem.innerHTML = '<i class="fas fa-certificate"></i> 資格の割り当て';
          if (assignmentIdInput) assignmentIdInput.value = '';
          if (yearSelect) yearSelect.value = new Date().getFullYear();
          if (statusSelect) statusSelect.value = isFromStarChart ? 'planned' : 'planned';
          if (acquiredDateInput) acquiredDateInput.value = '';
          if (qualificationSelect) qualificationSelect.disabled = false;
          if (deleteBtn) deleteBtn.style.display = 'none';

          if (isFromStarChart && qualificationSelect) {
              qualificationSelect.value = String(presetQualificationId);
              qualificationSelect.disabled = true;
          }
          this.updateQualificationExpiryDate();
      }

      // ★★★ 保存ボタンのイベントリスナーを安全に再設定 ★★★
      const saveBtn = document.getElementById('saveAssignQualificationBtn');
      if (saveBtn) {
          const newSaveBtn = saveBtn.cloneNode(true); // ボタンをクローン
          saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn); // 古いボタンを新しいボタンで置き換える
          newSaveBtn.addEventListener('click', () => { // 新しいボタンにリスナーを設定
              this.saveAssignQualification();
          });
      }

      // モーダル表示
      this.appUI.showModal('assignQualificationModal');

      // 最終確認ログ (これは関数の最後に実行されるもの)
      setTimeout(() => {
          const finalQualificationSelect = document.getElementById('selectQualification');
          if (finalQualificationSelect) {
              console.log('=== 最終状態確認 (資格) ===', {
                  value: finalQualificationSelect.value,
                  selectedText: finalQualificationSelect.selectedOptions[0]?.textContent || 'なし',
                  disabled: finalQualificationSelect.disabled,
                  presetId: presetQualificationId
              });
          }
      }, 500);
  }


  /**
   * 作業認定割り当てモーダルを表示（修正版）
   * @param {number} employeeId 社員ID
   * @param {string} assignmentId 作業認定割り当てID（編集時のみ）
   * @param {string} presetCertificationId 事前選択する作業認定ID（星取表からの呼び出し時）
   */
  showAssignCertificationModal(employeeId, assignmentId = null, presetCertificationId = null) {
      // ... (関数の冒頭のデバッグログや要素取得、社員名表示などの処理はそのまま) ...
      console.log('[showAssignCertificationModal] Called with employeeId:', employeeId, 'assignmentId:', assignmentId, 'presetCertificationId:', presetCertificationId);

      const form = document.getElementById('assignCertificationForm');
      const titleElem = document.getElementById('assignCertificationModalTitle');
      const employeeIdInput = document.getElementById('assignCertificationEmployeeId');
      const assignmentIdInput = document.getElementById('assignCertificationId');
      const deleteBtn = document.getElementById('deleteAssignCertificationBtn'); // 削除ボタンも取得

      if (form) form.reset();
      if (employeeIdInput) employeeIdInput.value = employeeId;

      const isFromStarChart = (presetCertificationId !== null && presetCertificationId !== undefined && presetCertificationId !== '');
      const isEditMode = (assignmentId !== null && assignmentId !== undefined && assignmentId !== '');

      const employeeNameDisplay = document.getElementById('assignCertificationEmployeeName');
      // ... (社員名表示のロジックはそのまま) ...
      if (employeeId && employeeNameDisplay) {
          const employee = this.appData.getEmployee(employeeId);
          if (employee) {
              employeeNameDisplay.textContent = employee.name;
          } else {
              employeeNameDisplay.textContent = '（対象社員情報なし）';
          }
      } else if (employeeNameDisplay) {
          employeeNameDisplay.textContent = '（対象社員未選択）';
      }


      this.populateCertificationOptions(); // 作業認定の選択肢を生成
      this.setupCertificationExpiryCalculation();
      this.setupCertificationDateYearSyncImproved();

      const certificationSelect = document.getElementById('selectCertification');
      const acquiredDateInput = document.getElementById('certificationAcquiredDate');
      const expiryDateInput = document.getElementById('certificationExpiryDate');
      const yearSelect = document.getElementById('certificationYear'); // 年度のselect要素
      const levelSelect = document.getElementById('certificationLevel'); // レベルのselect要素
      const notesInput = document.getElementById('certificationAssignmentNotes'); // 備考のtextarea要素


      if (isEditMode) {
          // 編集モードの処理 (既存の割り当て情報をフォームに設定)
          const employeeCertifications = this.appData.getEmployeeWorkCertifications(employeeId);
          const assignment = employeeCertifications.find(ec => ec.id == assignmentId); // == で文字列と数値の比較に対応

          if (assignment) {
              titleElem.innerHTML = '<i class="fas fa-tools"></i> 作業認定情報の編集';
              if (assignmentIdInput) assignmentIdInput.value = assignment.id;
              if (certificationSelect) {
                  certificationSelect.value = String(assignment.certificationId); // 文字列に変換して設定
                  certificationSelect.disabled = true; // 編集時は認定自体は変更不可とする
              }
              if (yearSelect) yearSelect.value = assignment.year || new Date().getFullYear();
              if (levelSelect) levelSelect.value = assignment.level || 'independent';
              if (acquiredDateInput) acquiredDateInput.value = this.formatDateForInput(assignment.dateAcquired);
              if (expiryDateInput && assignment.expiryDate) expiryDateInput.value = this.formatDateForInput(assignment.expiryDate);
              if (notesInput) notesInput.value = assignment.notes || '';

              if (deleteBtn) {
                  deleteBtn.style.display = 'inline-block';
                  // ★ 既存の削除ボタンリスナーをクリアして再設定
                  const newDeleteBtn = deleteBtn.cloneNode(true);
                  deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                  newDeleteBtn.addEventListener('click', () => {
                      const cert = this.appData.getWorkCertifications().find(c => c.id === assignment.certificationId);
                      const certName = cert ? cert.name : '不明な作業認定';
                      this.deleteEmployeeWorkCertification(assignmentId, certName); // deleteEmployeeWorkCertification を呼び出す
                      this.appUI.hideModal('assignCertificationModal');
                  });
              }
              this.updateCertificationExpiryDate(); // 有効期限を再計算・表示
          } else {
              this.appUI.showNotification('error', 'エラー', '編集対象の作業認定情報が見つかりません。');
              return;
          }
      } else {
          // 新規追加モードの処理
          titleElem.innerHTML = '<i class="fas fa-tools"></i> 作業認定の割り当て';
          if (assignmentIdInput) assignmentIdInput.value = '';
          if (yearSelect) yearSelect.value = new Date().getFullYear();
          if (levelSelect) levelSelect.value = isFromStarChart ? 'planned' : 'planned'; // 星取表からは計画中スタート
          if (acquiredDateInput) acquiredDateInput.value = ''; // 新規の場合は取得日を空に
          if (certificationSelect) certificationSelect.disabled = false;
          if (deleteBtn) deleteBtn.style.display = 'none';

          if (isFromStarChart && certificationSelect) {
              certificationSelect.value = String(presetCertificationId); // 文字列に変換して設定
              certificationSelect.disabled = true; // 星取表からの場合は認定固定
          }
          this.updateCertificationExpiryDate(); // 有効期限を計算・表示
      }

      // ★★★ 保存ボタンのイベントリスナーを安全に再設定 ★★★
      const saveBtn = document.getElementById('saveAssignCertificationBtn');
      if (saveBtn) {
          const newSaveBtn = saveBtn.cloneNode(true); // ボタンをクローン
          saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn); // 古いボタンを新しいボタンで置き換える
          newSaveBtn.addEventListener('click', () => { // 新しいボタンにリスナーを設定
              this.saveAssignCertification();
          });
      }

      // モーダル表示
      this.appUI.showModal('assignCertificationModal');
  }

  /**
   * 改良版：取得日と年度の同期機能（資格用）
   * フラグ→日付判断→年度判断の優先順位を実装
   */
  setupDateYearSyncImproved() {
      const acquiredDate = document.getElementById('qualificationAcquiredDate');
      const yearSelect = document.getElementById('qualificationYear');
      const statusSelect = document.getElementById('qualificationStatus');
      
      if (acquiredDate && yearSelect && statusSelect) {
          // 既存のイベントリスナーを削除
          const newAcquiredDate = acquiredDate.cloneNode(true);
          acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
          
          const newStatusSelect = statusSelect.cloneNode(true);
          statusSelect.parentNode.replaceChild(newStatusSelect, statusSelect);
          
          // 取得日変更時の処理（改良版）
          newAcquiredDate.addEventListener('change', () => {
              const dateValue = newAcquiredDate.value;
              if (dateValue) {
                  // 年度を自動更新
                  const year = new Date(dateValue).getFullYear();
                  yearSelect.value = year;
                  
                  // ステータスの自動変更は「計画中」「挑戦中」の場合のみ
                  const currentStatus = newStatusSelect.value;
                  if (currentStatus === 'planned' || currentStatus === 'challenging') {
                      newStatusSelect.value = 'acquired';
                  }
                  // 既に「取得済み」の場合は変更しない
              }
          });
          
          // ステータス変更時の処理（改良版）
          newStatusSelect.addEventListener('change', () => {
              const status = newStatusSelect.value;
              if (status === 'planned' || status === 'challenging') {
                  // 計画中/挑戦中の場合は取得日をクリア（ユーザーの意図を尊重）
                  // 自動でクリアしない方が良い場合もあるので、警告のみ
                  console.log('Status changed to planned/challenging - consider clearing date if needed');
              } else if (status === 'acquired' && !newAcquiredDate.value) {
                  // 取得済みに変更されて取得日が空の場合のみ今日の日付を設定
                  const today = new Date();
                  newAcquiredDate.value = this.formatDateForInput(today);
                  const year = today.getFullYear();
                  yearSelect.value = year;
              }
          });
      }
  }

  /**
   * 改良版：取得日と年度の同期機能（作業認定用）
   * フラグ→日付判断→年度判断の優先順位を実装
   */
  setupCertificationDateYearSyncImproved() {
      const acquiredDate = document.getElementById('certificationAcquiredDate');
      const yearSelect = document.getElementById('certificationYear');
      const levelSelect = document.getElementById('certificationLevel');
      
      if (acquiredDate && yearSelect && levelSelect) {
          // 既存のイベントリスナーを削除
          const newAcquiredDate = acquiredDate.cloneNode(true);
          acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
          
          const newLevelSelect = levelSelect.cloneNode(true);
          levelSelect.parentNode.replaceChild(newLevelSelect, levelSelect);
          
          // 取得日変更時の処理（改良版）
          newAcquiredDate.addEventListener('change', () => {
              const dateValue = newAcquiredDate.value;
              if (dateValue) {
                  // 年度を自動更新
                  const year = new Date(dateValue).getFullYear();
                  yearSelect.value = year;
                  
                  // レベルの自動変更は「予定」「訓練中」の場合のみ
                  const currentLevel = newLevelSelect.value;
                  if (currentLevel === 'planned' || currentLevel === 'in_training') {
                      newLevelSelect.value = 'independent';
                  }
                  // 既に実作業レベルの場合は変更しない
              }
          });
          
          // レベル変更時の処理（改良版）
          newLevelSelect.addEventListener('change', () => {
              const level = newLevelSelect.value;
              if (level === 'planned' || level === 'in_training') {
                  // 予定/訓練中の場合は取得日をクリア（ユーザーの意図を尊重）
                  // 自動でクリアしない方が良い場合もあるので、警告のみ
                  console.log('Level changed to planned/training - consider clearing date if needed');
              } else if ((level === 'independent' || level === 'supervised' || level === 'expert_trainer') && !newAcquiredDate.value) {
                  // 実作業レベルに変更されて取得日が空の場合のみ今日の日付を設定
                  const today = new Date();
                  newAcquiredDate.value = this.formatDateForInput(today);
                  const year = today.getFullYear();
                  yearSelect.value = year;
              }
          });
      }
  }

  // 取得日と年度の同期機能を追加
  setupDateYearSync() {
      const acquiredDate = document.getElementById('qualificationAcquiredDate');
      const yearSelect = document.getElementById('qualificationYear');
      const statusSelect = document.getElementById('qualificationStatus');
      
      if (acquiredDate && yearSelect && statusSelect) {
          // 既存のイベントリスナーを削除
          const newAcquiredDate = acquiredDate.cloneNode(true);
          acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
          
          const newStatusSelect = statusSelect.cloneNode(true);
          statusSelect.parentNode.replaceChild(newStatusSelect, statusSelect);
          
          // 取得日変更時の処理
          newAcquiredDate.addEventListener('change', () => {
              const dateValue = newAcquiredDate.value;
              if (dateValue) {
                  const year = new Date(dateValue).getFullYear();
                  yearSelect.value = year;
                  
                  // 取得日が入力された場合は自動的に「取得済み」に変更
                  newStatusSelect.value = 'acquired';
              }
          });
          
          // ステータス変更時の処理
          newStatusSelect.addEventListener('change', () => {
              const status = newStatusSelect.value;
              if (status === 'planned' || status === 'challenging') {
                  // 計画中/挑戦中の場合は取得日をクリア
                  newAcquiredDate.value = '';
              } else if (status === 'acquired' && !newAcquiredDate.value) {
                  // 取得済みで取得日が空の場合は今日の日付を設定
                  newAcquiredDate.value = this.formatDateForInput(new Date());
                  const year = new Date().getFullYear();
                  yearSelect.value = year;
              }
          });
      }
  }

  // 作業認定用の取得日と年度の同期機能
  setupCertificationDateYearSync() {
      const acquiredDate = document.getElementById('certificationAcquiredDate');
      const yearSelect = document.getElementById('certificationYear');
      const levelSelect = document.getElementById('certificationLevel');
      
      if (acquiredDate && yearSelect && levelSelect) {
          // 既存のイベントリスナーを削除
          const newAcquiredDate = acquiredDate.cloneNode(true);
          acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
          
          const newLevelSelect = levelSelect.cloneNode(true);
          levelSelect.parentNode.replaceChild(newLevelSelect, levelSelect);
          
          // 取得日変更時の処理
          newAcquiredDate.addEventListener('change', () => {
              const dateValue = newAcquiredDate.value;
              if (dateValue) {
                  const year = new Date(dateValue).getFullYear();
                  yearSelect.value = year;
                  
                  // 取得日が入力された場合で、現在が予定の場合は「一人作業可能」に変更
                  if (newLevelSelect.value === 'planned') {
                      newLevelSelect.value = 'independent';
                  }
              }
          });
          
          // レベル変更時の処理
          newLevelSelect.addEventListener('change', () => {
              const level = newLevelSelect.value;
              if (level === 'planned' || level === 'in_training') {
                  // 予定/訓練中の場合は取得日をクリア
                  newAcquiredDate.value = '';
              } else if ((level === 'independent' || level === 'supervised' || level === 'expert_trainer') && !newAcquiredDate.value) {
                  // 実際のレベルで取得日が空の場合は今日の日付を設定
                  newAcquiredDate.value = this.formatDateForInput(new Date());
                  const year = new Date().getFullYear();
                  yearSelect.value = year;
              }
          });
      }
  }

  /**
   * 資格の有効期限自動計算の設定
   */
  setupQualificationExpiryCalculation() {
    const selectQualification = document.getElementById('selectQualification');
    const acquiredDate = document.getElementById('qualificationAcquiredDate');
    
    if (selectQualification && acquiredDate) {
      const calculateExpiryDate = () => {
        const qualificationId = selectQualification.value;
        const dateAcquired = acquiredDate.value;
        
        if (qualificationId && dateAcquired) {
          const qualification = this.appData.getQualifications().find(q => q.id === qualificationId);
          
          if (qualification && qualification.validMonths > 0) {
            const expiryDate = this.calculateExpiryDate(dateAcquired, qualification.validMonths);
            document.getElementById('qualificationExpiryDate').value = this.formatDateForInput(expiryDate);
          } else {
            document.getElementById('qualificationExpiryDate').value = '';
          }
        }
      };
      
      // 既存のイベントリスナーを削除（イベントをクローンして再作成）
      const newSelectQualification = selectQualification.cloneNode(true);
      selectQualification.parentNode.replaceChild(newSelectQualification, selectQualification);
      
      const newAcquiredDate = acquiredDate.cloneNode(true);
      acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
      
      // 新しいイベントリスナーを追加
      newSelectQualification.addEventListener('change', calculateExpiryDate);
      newAcquiredDate.addEventListener('change', calculateExpiryDate);
      
      // 初期計算を実行
      calculateExpiryDate();
    }
  }

  /**
   * 作業認定の有効期限自動計算の設定
   */
  setupCertificationExpiryCalculation() {
    const selectCertification = document.getElementById('selectCertification');
    const acquiredDate = document.getElementById('certificationAcquiredDate');
    
    if (selectCertification && acquiredDate) {
      const calculateExpiryDate = () => {
        const certificationId = selectCertification.value;
        const dateAcquired = acquiredDate.value;
        
        if (certificationId && dateAcquired) {
          const certification = this.appData.getWorkCertifications().find(c => c.id === certificationId);
          
          if (certification && certification.validMonths > 0) {
            const expiryDate = this.calculateExpiryDate(dateAcquired, certification.validMonths);
            document.getElementById('certificationExpiryDate').value = this.formatDateForInput(expiryDate);
          } else {
            document.getElementById('certificationExpiryDate').value = '';
          }
        }
      };
      
      // 既存のイベントリスナーを削除（イベントをクローンして再作成）
      const newSelectCertification = selectCertification.cloneNode(true);
      selectCertification.parentNode.replaceChild(newSelectCertification, selectCertification);
      
      const newAcquiredDate = acquiredDate.cloneNode(true);
      acquiredDate.parentNode.replaceChild(newAcquiredDate, acquiredDate);
      
      // 新しいイベントリスナーを追加
      newSelectCertification.addEventListener('change', calculateExpiryDate);
      newAcquiredDate.addEventListener('change', calculateExpiryDate);
      
      // 初期計算を実行
      calculateExpiryDate();
    }
  }

  /**
   * 資格有効期限の自動計算（CertificationManager版）
   */
  updateQualificationExpiryDate() {
    const selectQualification = document.getElementById('selectQualification');
    const acquiredDateInput = document.getElementById('qualificationAcquiredDate');
    const expiryDateField = document.getElementById('qualificationExpiryDate');
    
    if (!selectQualification || !acquiredDateInput || !expiryDateField) return;
    
    const qualificationId = selectQualification.value;
    const acquiredDate = acquiredDateInput.value;
    
    if (qualificationId && acquiredDate) {
      const qualification = this.appData.getQualification(qualificationId);
      if (qualification && qualification.validMonths && parseInt(qualification.validMonths) > 0) {
        expiryDateField.value = this.formatDateForInput(this.calculateExpiryDate(acquiredDate, parseInt(qualification.validMonths)));
      } else {
        expiryDateField.value = ''; // 無期限
      }
    } else if (qualificationId && !acquiredDate) { 
        const qualification = this.appData.getQualification(qualificationId);
        if (qualification && qualification.validMonths && parseInt(qualification.validMonths) > 0) {
            expiryDateField.value = '';
        } else {
            expiryDateField.value = ''; 
        }
    } else {
        expiryDateField.value = '';
    }
  }

  /**
   * 作業認定有効期限の自動計算（CertificationManager版）
   */
  updateCertificationExpiryDate() {
    const selectCertification = document.getElementById('selectCertification');
    const acquiredDateInput = document.getElementById('certificationAcquiredDate');
    const expiryDateField = document.getElementById('certificationExpiryDate');

    if (!selectCertification || !acquiredDateInput || !expiryDateField) return;

    const certificationId = selectCertification.value;
    const acquiredDate = acquiredDateInput.value;

    if (certificationId && acquiredDate) {
        const certification = this.appData.getWorkCertification(certificationId);
        if (certification && certification.validMonths && parseInt(certification.validMonths) > 0) {
            expiryDateField.value = this.formatDateForInput(this.calculateExpiryDate(acquiredDate, parseInt(certification.validMonths)));
        } else {
            expiryDateField.value = ''; // 無期限
        }
    } else if (certificationId && !acquiredDate) {
        const certification = this.appData.getWorkCertification(certificationId);
        if (certification && certification.validMonths && parseInt(certification.validMonths) > 0) {
            expiryDateField.value = '';
        } else {
            expiryDateField.value = ''; 
        }
    } else {
        expiryDateField.value = '';
    }
  }  

  // calculateExpiryDate も CertificationManager に必要になります。
  // SettingsUI.js からコピーするか、共通化してください。
  // ここでは仮に CertificationManager に直接実装します。
  calculateExpiryDate(startDateStr, validMonths) {
    if (!startDateStr || !validMonths || validMonths <= 0) return null;
    
    try {
      const startDate = new Date(startDateStr);
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + validMonths);
      return expiryDate; 
    } catch (e) {
      console.error("Error calculating expiry date:", e);
      return null;
    }
  }

  /**
   * 資格マスタテーブルを更新
   */
  refreshQualificationList() {
    const tableBody = document.getElementById('qualificationTableBody');
    if (!tableBody) return;
    
    const settingsUI = this.settingsManager?.settingsUI || this.appUI;
    
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</td></tr>';
    
    setTimeout(() => {
      const qualifications = this.appData.getQualifications();
      const fragment = document.createDocumentFragment();
      
      if (qualifications.length === 0) {
        const row = document.createElement('tr');
        row.className = 'empty-message-row';
        const cell = document.createElement('td');
        cell.colSpan = 7; // 説明列追加のためcolspanを7に
        cell.textContent = '資格が登録されていません。';
        cell.style.textAlign = 'center';
        cell.style.padding = 'var(--spacing-md)';
        cell.style.color = 'var(--base-dark-gray)';
        row.appendChild(cell);
        fragment.appendChild(row);
      } else {
        const sortedQualifications = this._sortById(qualifications, 'Q');
        
        sortedQualifications.forEach(qual => {
          const row = document.createElement('tr');

          row.setAttribute('data-search-terms', `${String(qual.id)} ${qual.name.toLowerCase()} ${qual.category?.toLowerCase() || ''} ${qual.description?.toLowerCase() || ''} ${qual.issuer?.toLowerCase() || ''}`);
          row.insertCell().textContent = qual.id;
          row.insertCell().textContent = qual.name;
          row.insertCell().textContent = qual.category || '-';
          row.insertCell().textContent = qual.description || '-'; // 説明列
          
          const validMonths = parseInt(qual.validMonths);
          row.insertCell().textContent = isNaN(validMonths) || validMonths <= 0 ? '無期限' : `${validMonths}ヶ月`;
          
          row.insertCell().textContent = qual.issuer || '-';
          
          const actionCell = row.insertCell();
          actionCell.classList.add('action-cell');
          
          const detailBtn = document.createElement('button');
          detailBtn.className = 'btn btn-table-action info';
          detailBtn.title = '詳細';
          detailBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
          detailBtn.addEventListener('click', () => {
            // 詳細表示は説明列があるので、より多くの情報を表示するように変更も可能
            alert(`資格名: ${qual.name}\nカテゴリ: ${qual.category || '-'}\n説明: ${qual.description || '説明なし'}\n有効期間: ${isNaN(validMonths) || validMonths <= 0 ? '無期限' : `${validMonths}ヶ月`}\n発行機関: ${qual.issuer || '-'}`);
          });
          
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-table-action edit';
          editBtn.title = '編集';
          editBtn.innerHTML = '<i class="fas fa-edit"></i>';
          editBtn.addEventListener('click', () => {
            this.showQualificationModal(qual.id);
          });
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-table-action delete';
          deleteBtn.title = '削除';
          deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
          deleteBtn.addEventListener('click', () => {
            this.deleteQualification(qual.id);
          });
          
          actionCell.appendChild(detailBtn);
          actionCell.appendChild(editBtn);
          actionCell.appendChild(deleteBtn);
          row.appendChild(actionCell);
          
          fragment.appendChild(row);
        });
      }
      
      tableBody.innerHTML = '';
      tableBody.appendChild(fragment);
    }, 10);
  }
  
  /**
   * 作業認定マスタテーブルを更新
   */
  refreshCertificationList() {
    const tableBody = document.getElementById('workCertificationTableBody');
    if (!tableBody) return;
    
    const settingsUI = this.settingsManager?.settingsUI || this.appUI;
    
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</td></tr>'; // colspanを8に
    
    setTimeout(() => {
      const certifications = this.appData.getWorkCertifications();
      const fragment = document.createDocumentFragment();
      
      if (certifications.length === 0) {
        const row = document.createElement('tr');
        row.className = 'empty-message-row';
        const cell = document.createElement('td');
        cell.colSpan = 8; // colspanを8に
        cell.textContent = '作業認定が登録されていません。';
        cell.style.textAlign = 'center';
        cell.style.padding = 'var(--spacing-md)';
        cell.style.color = 'var(--base-dark-gray)';
        row.appendChild(cell);
        fragment.appendChild(row);
      } else {
        const sortedCertifications = this._sortById(certifications, 'W');
        
        sortedCertifications.forEach(cert => {
          const row = document.createElement('tr');

          row.setAttribute('data-search-terms', `${String(cert.id)} ${cert.name.toLowerCase()} ${cert.category?.toLowerCase() || ''} ${cert.classification?.toLowerCase() || ''} ${cert.description?.toLowerCase() || ''} ${cert.requiredTraining?.toLowerCase() || ''}`);         
          row.insertCell().textContent = cert.id;
          row.insertCell().textContent = cert.name;
          row.insertCell().textContent = cert.category || '-';
          row.insertCell().textContent = cert.classification || '-';
          row.insertCell().textContent = cert.description || '-'; // 説明列
          const validMonths = parseInt(cert.validMonths);
          row.insertCell().textContent = isNaN(validMonths) || validMonths <= 0 ? '無期限' : `${validMonths}ヶ月`;
          
          row.insertCell().textContent = cert.requiredTraining || '-';
          
          const actionCell = row.insertCell();
          actionCell.classList.add('action-cell');
          
          const detailBtn = document.createElement('button');
          detailBtn.className = 'btn btn-table-action info';
          detailBtn.title = '詳細';
          detailBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
          detailBtn.addEventListener('click', () => {
            alert(`作業名: ${cert.name}\nカテゴリ: ${cert.category || '-'}\n区分: ${cert.classification || '-'}\n説明: ${cert.description || '説明なし'}\n有効期間: ${isNaN(validMonths) || validMonths <= 0 ? '無期限' : `${validMonths}ヶ月`}\n必要研修: ${cert.requiredTraining || '-'}`);
          });
          
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-table-action edit';
          editBtn.title = '編集';
          editBtn.innerHTML = '<i class="fas fa-edit"></i>';
          editBtn.addEventListener('click', () => {
            this.showWorkCertificationModal(cert.id);
          });
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-table-action delete';
          deleteBtn.title = '削除';
          deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
          deleteBtn.addEventListener('click', () => {
            this.deleteWorkCertification(cert.id);
          });
          
          actionCell.appendChild(detailBtn);
          actionCell.appendChild(editBtn);
          actionCell.appendChild(deleteBtn);
          row.appendChild(actionCell);
          
          fragment.appendChild(row);
        });
      }
      
      tableBody.innerHTML = '';
      tableBody.appendChild(fragment);
    }, 10);
  }
  
  /**
   * 社員の資格テーブルを更新
   * @param {number} employeeId 社員ID
   */
  updateEmployeeQualificationTable(employeeId) {
    const tableBody = document.getElementById('employeeQualificationTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    // 社員の資格を取得
    const employeeQualifications = this.appData.getEmployeeQualifications(employeeId);
    
    if (!employeeQualifications || employeeQualifications.length === 0) {
      const row = tableBody.insertRow();
      row.className = 'empty-message-row';
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = '登録されている資格がありません。';
      cell.style.textAlign = 'center';
      cell.style.padding = 'var(--spacing-lg)';
      cell.style.color = 'var(--base-dark-gray)';
      return;
    }
    
    // 資格マスタを取得
    const qualifications = this.appData.getQualifications();
    
    // 資格情報を結合
    const qualificationData = employeeQualifications.map(eq => {
      const qualification = qualifications.find(q => q.id === eq.qualificationId);
      return {
        ...eq,
        name: qualification ? qualification.name : '不明な資格',
        category: qualification ? qualification.category : '',
        validMonths: qualification ? qualification.validMonths : 0
      };
    });
    
    // 取得日順にソート
    const sortedData = [...qualificationData].sort((a, b) => {
      return new Date(b.dateAcquired) - new Date(a.dateAcquired);
    });
    
    // 現在日
    const today = new Date();
    
    sortedData.forEach(item => {
      const row = tableBody.insertRow();
      row.setAttribute('data-qualification-assignment-id', item.id);
      
      // 資格名
      row.insertCell().textContent = item.name;
      
      // 取得日
      row.insertCell().textContent = this.formatDate(item.dateAcquired);
      
      // 有効期限
      const expiryCell = row.insertCell();
      if (item.expiryDate) {
        expiryCell.textContent = this.formatDate(item.expiryDate);
      } else {
        expiryCell.textContent = '無期限';
      }
      
      // ステータス
      const statusCell = row.insertCell();
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      
      if (!expiryDate) {
        statusCell.innerHTML = '<span class="badge status-valid">有効</span>';
      } else if (expiryDate < today) {
        statusCell.innerHTML = '<span class="badge status-expired">期限切れ</span>';
      } else {
        // 90日以内に期限切れになるか確認
        const remainingDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (remainingDays <= 90) {
          statusCell.innerHTML = `<span class="badge status-warning">あと${remainingDays}日</span>`;
        } else {
          statusCell.innerHTML = '<span class="badge status-valid">有効</span>';
        }
      }
      
      // 操作ボタン
      const actionCell = row.insertCell();
      actionCell.classList.add('action-cell');
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-table-action edit';
      editBtn.title = '編集';
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.addEventListener('click', () => {
        this.showAssignQualificationModal(employeeId, item.id);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-table-action delete';
      deleteBtn.title = '削除';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener('click', () => {
        this.deleteEmployeeQualification(item.id, item.name);
      });
      
      actionCell.appendChild(editBtn);
      actionCell.appendChild(deleteBtn);
    });
  }
  
  /**
   * 社員の作業認定テーブルを更新
   * @param {number} employeeId 社員ID
   */
  updateEmployeeCertificationTable(employeeId) {
    const tableBody = document.getElementById('employeeCertificationTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    // 社員の作業認定を取得
    const employeeCertifications = this.appData.getEmployeeWorkCertifications(employeeId);
    
    if (!employeeCertifications || employeeCertifications.length === 0) {
      const row = tableBody.insertRow();
      row.className = 'empty-message-row';
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = '登録されている作業認定がありません。';
      cell.style.textAlign = 'center';
      cell.style.padding = 'var(--spacing-lg)';
      cell.style.color = 'var(--base-dark-gray)';
      return;
    }
    
    // 作業認定マスタを取得
    const certifications = this.appData.getWorkCertifications();
    
    // 作業認定情報を結合
    const certificationData = employeeCertifications.map(ec => {
      const certification = certifications.find(c => c.id === ec.certificationId);
      return {
        ...ec,
        name: certification ? certification.name : '不明な作業認定',
        category: certification ? certification.category : '',
        validMonths: certification ? certification.validMonths : 0
      };
    });
    
    // 取得日順にソート
    const sortedData = [...certificationData].sort((a, b) => {
      return new Date(b.dateAcquired) - new Date(a.dateAcquired);
    });
    
    // 現在日
    const today = new Date();
    
    sortedData.forEach(item => {
      const row = tableBody.insertRow();
      row.setAttribute('data-certification-assignment-id', item.id);
      
      // 作業名
      row.insertCell().textContent = item.name;
      
      // 取得日
      row.insertCell().textContent = this.formatDate(item.dateAcquired);
      
      // 有効期限
      const expiryCell = row.insertCell();
      if (item.expiryDate) {
        expiryCell.textContent = this.formatDate(item.expiryDate);
      } else {
        expiryCell.textContent = '無期限';
      }
      
      // ステータス
      const statusCell = row.insertCell();
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      
      if (!expiryDate) {
        statusCell.innerHTML = '<span class="badge status-valid">有効</span>';
      } else if (expiryDate < today) {
        statusCell.innerHTML = '<span class="badge status-expired">期限切れ</span>';
      } else {
        // 90日以内に期限切れになるか確認
        const remainingDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (remainingDays <= 90) {
          statusCell.innerHTML = `<span class="badge status-warning">あと${remainingDays}日</span>`;
        } else {
          statusCell.innerHTML = '<span class="badge status-valid">有効</span>';
        }
      }
      
      // 操作ボタン
      const actionCell = row.insertCell();
      actionCell.classList.add('action-cell');
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-table-action edit';
      editBtn.title = '編集';
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.addEventListener('click', () => {
        this.showAssignCertificationModal(employeeId, item.id);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-table-action delete';
      deleteBtn.title = '削除';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener('click', () => {
        this.deleteEmployeeWorkCertification(item.id, item.name);
      });
      
      actionCell.appendChild(editBtn);
      actionCell.appendChild(deleteBtn);
    });
  }
  
  /**
   * フィルター機能 (テーブル検索)
   */
  filterTable(inputId, tableId, rowSelector, dataAttribute) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    
    const searchTerm = input.value.toLowerCase().trim();
    const rows = table.querySelectorAll(rowSelector);
    let matchFound = false;
    
    rows.forEach(row => {
      const searchTerms = row.getAttribute(dataAttribute) || '';
      if (searchTerms.includes(searchTerm)) {
        row.style.display = '';
        matchFound = true;
      } else {
        row.style.display = 'none';
      }
    });
    
    // 一致するものがなかった場合のメッセージ
    let noResultsRow = table.querySelector('.no-results-message');
    if (!matchFound && searchTerm && rows.length > 0) {
      if (!noResultsRow) {
        noResultsRow = document.createElement('tr');
        noResultsRow.className = 'no-results-message';
        const cell = document.createElement('td');
        cell.colSpan = table.querySelector('thead th')?.length || 6; // 列数に応じて調整
        cell.textContent = '検索条件に一致する項目が見つかりません。';
        cell.style.textAlign = 'center';
        cell.style.padding = 'var(--spacing-md)';
        cell.style.color = 'var(--base-dark-gray)';
        noResultsRow.appendChild(cell);
        table.querySelector('tbody').appendChild(noResultsRow);
      }
      noResultsRow.style.display = '';
    } else if (noResultsRow) {
      noResultsRow.style.display = 'none';
    }
    
    // 空のテーブルメッセージ
    const emptyMessageRow = table.querySelector('.empty-message-row');
    if (emptyMessageRow) {
      const isAnyRowVisible = Array.from(rows).some(row => row.style.display !== 'none');
      emptyMessageRow.style.display = isAnyRowVisible || (noResultsRow && noResultsRow.style.display !== 'none') ? 'none' : '';
    }
  }
  
  // --- 資格操作 ---
  
  /**
   * 資格の保存
   */
  saveQualification() {
    console.log('saveQualification メソッドが呼ばれました'); // デバッグ用
    
    const form = document.getElementById('qualificationForm');
    if (!form) {
      console.error('qualificationForm が見つかりません');
      return;
    }
    
    if (!form.checkValidity()) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      return;
    }
    
    const qualificationData = {
      name: document.getElementById('qualificationName')?.value?.trim() || '',
      category: document.getElementById('qualificationCategory')?.value?.trim() || '',
      description: document.getElementById('qualificationDescription')?.value?.trim() || '',
      validMonths: document.getElementById('qualificationValidMonths')?.value || 0,
      issuer: document.getElementById('qualificationIssuer')?.value?.trim() || ''
    };
    
    const idInput = document.getElementById('qualificationId');
    const qualificationId = idInput?.value || null;
    
    try {
      let success = false;
      let message = '';
      
      if (qualificationId) { // 更新
        qualificationData.id = qualificationId;
        success = this.appData.updateQualification(qualificationData);
        message = success ? `資格「${qualificationData.name}」を更新しました` : "更新対象が見つかりません";
      } else { // 新規追加
        const newId = this.appData.addQualification(qualificationData);
        success = !!newId;
        message = success ? `資格「${qualificationData.name}」を登録しました` : "資格追加失敗";
      }
      
      if (success) {
        // ✅ 修正: モーダルを確実に閉じる
        setTimeout(() => {
          this.appUI.hideModal('qualificationModal');
        }, 100);
        
        this.refreshQualificationList();
        this.appUI.showNotification('success', '保存完了', message);
        
        console.log('資格保存完了:', qualificationData); // デバッグ用
      } else {
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error saving qualification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
  }
  
  /**
   * 資格の削除
   * @param {string} qualificationId 資格ID
   */
  deleteQualification(qualificationId) {
    const qualification = this.appData.getQualifications().find(q => q.id === qualificationId);
    if (!qualification) {
      this.appUI.showNotification('error', '資格が見つかりません');
      return;
    }
    
    if (confirm(`資格「${qualification.name}」を削除しますか？この操作は元に戻せません。社員に割り当てられている場合は削除できません。`)) {
      const success = this.appData.deleteQualification(qualificationId);
      if (success) {
        this.appUI.showNotification('success', '資格を削除しました');
        this.refreshQualificationList();
      } else {
        this.appUI.showNotification('error', '資格を削除できません', '資格が社員に割り当てられているか、他のデータから参照されています。');
      }
    }
  }
  
  /**
   * 作業認定の保存
   */
  saveWorkCertification() {
    console.log('saveWorkCertification メソッドが呼ばれました'); // デバッグ用
    
    const form = document.getElementById('workCertificationForm');
    if (!form) {
      console.error('workCertificationForm が見つかりません');
      return;
    }
    
    if (!form.checkValidity()) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      return;
    }
    
    const certificationData = {
      name: document.getElementById('workCertificationName')?.value?.trim() || '',
      category: document.getElementById('workCertificationCategory')?.value?.trim() || '',
      classification: document.getElementById('workCertificationClassification')?.value?.trim() || '',
      description: document.getElementById('workCertificationDescription')?.value?.trim() || '',
      validMonths: document.getElementById('workCertificationValidMonths')?.value || 0,
      requiredTraining: document.getElementById('workCertificationRequiredTraining')?.value?.trim() || ''
    };
    
    const idInput = document.getElementById('workCertificationId');
    const certificationId = idInput?.value || null;
    
    try {
      let success = false;
      let message = '';
      
      if (certificationId) { // 更新
        certificationData.id = certificationId;
        success = this.appData.updateWorkCertification(certificationData);
        message = success ? `作業認定「${certificationData.name}」を更新しました` : "更新対象が見つかりません";
      } else { // 新規追加
        const newId = this.appData.addWorkCertification(certificationData);
        success = !!newId;
        message = success ? `作業認定「${certificationData.name}」を登録しました` : "作業認定追加失敗";
      }
      
      if (success) {
        // ✅ 修正: モーダルを確実に閉じる
        setTimeout(() => {
          this.appUI.hideModal('workCertificationModal');
        }, 100);
        
        this.refreshCertificationList();
        this.appUI.showNotification('success', '保存完了', message);
        
        console.log('作業認定保存完了:', certificationData); // デバッグ用
      } else {
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error saving work certification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
  }
  
  /**
   * 作業認定の削除
   * @param {string} certificationId 作業認定ID
   */
  deleteWorkCertification(certificationId) {
    const certification = this.appData.getWorkCertifications().find(c => c.id === certificationId);
    if (!certification) {
      this.appUI.showNotification('error', '作業認定が見つかりません');
      return;
    }
    
    if (confirm(`作業認定「${certification.name}」を削除しますか？この操作は元に戻せません。社員に割り当てられている場合は削除できません。`)) {
      const success = this.appData.deleteWorkCertification(certificationId);
      if (success) {
        this.appUI.showNotification('success', '作業認定を削除しました');
        this.refreshCertificationList();
      } else {
        this.appUI.showNotification('error', '作業認定を削除できません', '作業認定が社員に割り当てられているか、他のデータから参照されています。');
      }
    }
  }
  
  /**
   * 資格割り当てを保存（星取表対応版）
   */
  saveAssignQualification() {
      const form = document.getElementById('assignQualificationForm');
      if (!form.checkValidity()) {
          form.reportValidity();
          this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
          return;
      }
      
      const employeeId = parseInt(document.getElementById('assignQualificationEmployeeId').value);
      const qualificationId = document.getElementById('selectQualification').value;
      const year = parseInt(document.getElementById('qualificationYear').value); // 年度を追加
      const dateAcquired = document.getElementById('qualificationAcquiredDate').value;
      const expiryDate = document.getElementById('qualificationExpiryDate').value;
      const notes = document.getElementById('qualificationAssignmentNotes').value.trim();
      const statusElement = document.getElementById('qualificationStatus');
      const status = statusElement ? statusElement.value : 'acquired';
      
      const assignmentData = {
          employeeId,
          qualificationId,
          year, // 年度を追加
          dateAcquired,
          expiryDate: expiryDate || null,
          notes,
          status
      };
      
      const assignmentIdInput = document.getElementById('assignQualificationId');
      const assignmentId = assignmentIdInput.value ? parseInt(assignmentIdInput.value) : null;
      
      try {
          let success = false;
          let message = '';
          const qualification = this.appData.getQualifications().find(q => q.id === qualificationId);
          const qualificationName = qualification ? qualification.name : '不明な資格';
          
          if (assignmentId) {
              // 既存の割り当てを更新
              assignmentData.id = assignmentId;
              success = this.appData.updateEmployeeQualification(assignmentData);
              message = success ? `「${qualificationName}」の情報を更新しました` : "更新対象が見つかりません";
          } else {
              // 新規割り当てを追加
              const newId = this.appData.assignQualificationToEmployee(
                  employeeId,
                  qualificationId,
                  dateAcquired,
                  expiryDate || null,
                  notes,
                  status,
                  year // 年度を追加
              );
              success = !!newId;
              message = success ? `「${qualificationName}」を割り当てました` : "資格割り当て失敗";
          }
          
          if (success) {
              this.appUI.hideModal('assignQualificationModal');
              this.refreshStarChartIfVisible();
              
              if (this.settingsManager?.currentSection === 'employee-qualifications') {
                  this.settingsManager.employeeManager.loadEmployeeQualifications(employeeId);
              }
              this.appUI.showNotification('success', '保存完了', message);
          } else {
              this.appUI.showNotification('error', '保存エラー', message);
          }
      } catch (error) {
          console.error("Error saving qualification assignment:", error);
          this.appUI.showNotification('error', '保存エラー', error.message);
      }
  }

  // 作業認定保存メソッドも修正
  saveAssignCertification() {
      const form = document.getElementById('assignCertificationForm');
      if (!form.checkValidity()) {
          form.reportValidity();
          this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
          return;
      }
      
      const employeeId = parseInt(document.getElementById('assignCertificationEmployeeId').value);
      const certificationId = document.getElementById('selectCertification').value;
      const year = parseInt(document.getElementById('certificationYear').value); // 年度を追加
      const dateAcquired = document.getElementById('certificationAcquiredDate').value;
      const expiryDate = document.getElementById('certificationExpiryDate').value;
      const notes = document.getElementById('certificationAssignmentNotes').value.trim();
      
      // レベル選択の取得
      const levelElement = document.getElementById('certificationLevel');
      const level = levelElement ? levelElement.value : 'independent';
      
      const assignmentData = {
          employeeId,
          certificationId,
          year, // 年度を追加
          dateAcquired,
          expiryDate: expiryDate || null,
          notes,
          level
      };
      
      const assignmentIdInput = document.getElementById('assignCertificationId');
      const assignmentId = assignmentIdInput.value ? parseInt(assignmentIdInput.value) : null;
      
      try {
          let success = false;
          let message = '';
          const certification = this.appData.getWorkCertifications().find(c => c.id === certificationId);
          const certificationName = certification ? certification.name : '不明な作業認定';
          
          if (assignmentId) {
              // 既存の割り当てを更新
              assignmentData.id = assignmentId;
              success = this.appData.updateEmployeeWorkCertification(assignmentData);
              message = success ? `「${certificationName}」の情報を更新しました` : "更新対象が見つかりません";
          } else {
              // 新規割り当てを追加
              const newId = this.appData.assignWorkCertificationToEmployee(
                  employeeId,
                  certificationId,
                  dateAcquired,
                  expiryDate || null,
                  notes,
                  level,
                  year // 年度を追加
              );
              success = !!newId;
              message = success ? `「${certificationName}」を割り当てました` : "作業認定割り当て失敗";
          }
          
          if (success) {
              this.appUI.hideModal('assignCertificationModal');
              
              // 星取表の再描画をトリガー
              this.refreshStarChartIfVisible();
              
              // 社員資格設定セクションのリストを更新
              if (this.settingsManager?.currentSection === 'employee-qualifications') {
                  this.settingsManager.employeeManager.loadEmployeeQualifications(employeeId);
              }
              this.appUI.showNotification('success', '保存完了', message);
          } else {
              this.appUI.showNotification('error', '保存エラー', message);
          }
      } catch (error) {
          console.error("Error saving certification assignment:", error);
          this.appUI.showNotification('error', '保存エラー', error.message);
      }
  }

  /**
   * 社員の作業認定割り当てを削除（星取表対応版）
   * @param {string} assignmentId 作業認定割り当てID
   * @param {string} certificationName 作業認定名
   */
  deleteEmployeeWorkCertification(assignmentId, certificationName) {
      if (confirm(`「${certificationName}」の作業認定情報を削除しますか？`)) {
          try {
              const success = this.appData.deleteEmployeeWorkCertification(parseInt(assignmentId));
              
              if (success) {
                  this.appUI.showNotification('success', '作業認定情報削除', `「${certificationName}」の情報を削除しました`);
                  
                  // 星取表の再描画をトリガー
                  this.refreshStarChartIfVisible();
                  
                  // 社員資格設定セクションのリストを更新
                  const employeeId = parseInt(document.getElementById('assignCertificationEmployeeId')?.value);
                  if (this.settingsManager?.currentSection === 'employee-qualifications' && employeeId) {
                      this.settingsManager.employeeManager.loadEmployeeQualifications(employeeId);
                  }
              } else {
                  this.appUI.showNotification('error', '削除失敗', '作業認定情報が見つからないか、削除できませんでした。');
              }
          } catch (error) {
              console.error("Error deleting employee work certification:", error);
              this.appUI.showNotification('error', '削除エラー', error.message);
          }
      }
  }

  /**
   * 社員の資格割り当てを削除
   * @param {string} assignmentId 資格割り当てID
   * @param {string} qualificationName 資格名
   */
  deleteEmployeeQualification(assignmentId, qualificationName) {
      if (confirm(`「${qualificationName}」の資格情報を削除しますか？`)) {
          try {
              const success = this.appData.deleteEmployeeQualification(parseInt(assignmentId));
              
              if (success) {
                  this.appUI.showNotification('success', '資格情報削除', `「${qualificationName}」の情報を削除しました`);
                  this.refreshStarChartIfVisible();
                  
                  const employeeId = parseInt(document.getElementById('assignQualificationEmployeeId')?.value);
                  if (this.settingsManager?.currentSection === 'employee-qualifications' && employeeId) {
                      this.settingsManager.employeeManager.loadEmployeeQualifications(employeeId);
                  }
              } else {
                  this.appUI.showNotification('error', '削除失敗', '資格情報が見つからないか、削除できませんでした。');
              }
          } catch (error) {
              console.error("Error deleting employee qualification:", error);
              this.appUI.showNotification('error', '削除エラー', error.message);
          }
      }
  }

  // 星取表の再描画をトリガーするヘルパーメソッド
  refreshStarChartIfVisible() {
      // 現在表示されているタブが星取表かチェック
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.getAttribute('data-view') === 'star-chart') {
          // 星取表を再描画
          if (this.appController && typeof this.appController.refreshChart === 'function') {
              this.appController.refreshChart();
          }
      }
  }

   
  /**
   * CSVインポートを実行
   */
  executeCsvImport() {
    const fileInput = document.getElementById('csvImportFile');
    const file = fileInput.files[0];
    
    if (!file) {
      this.appUI.showNotification('warning', 'ファイル未選択', 'CSVファイルを選択してください。');
      return;
    }
    
    // CSVファイルの拡張子チェック
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.appUI.showNotification('error', 'ファイル形式エラー', 'CSVファイル(.csv)を選択してください。');
      return;
    }
    
    // インポート実行ボタンのアニメーション
    const executeBtn = document.getElementById('executeCsvImportBtn');
    if (executeBtn) {
      executeBtn.disabled = true;
      executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> インポート中...';
    }
    
    // ファイル読み込み
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvContent = e.target.result;
      let success = false;
      
      // 上書き設定を取得
      const overwrite = document.getElementById('csvOverwriteExisting').checked;
      
      // インポートタイプを取得
      const type = document.getElementById('csvImportType').value;
      
      // CSVデータをインポート
      if (type === 'qualification') {
        success = this.appData.importQualificationsFromCSV(csvContent, overwrite);
      } else if (type === 'workCertification' || type === 'certification') { // 'certification' も許容
        success = this.appData.importWorkCertificationsFromCSV(csvContent, overwrite);
      }
      
      // 結果通知
      if (success) {
        this.appUI.hideModal('csvImportModal');
        
        // データテーブルを更新
        if (type === 'qualification') {
          this.refreshQualificationList();
        } else if (type === 'workCertification' || type === 'certification') {
          this.refreshCertificationList();
        }
        
        this.appUI.showNotification('success', 'インポート完了', `${type === 'qualification' ? '資格' : '作業認定'}データを正常にインポートしました。`);
      } else {
        this.appUI.showNotification('error', 'インポート失敗', 'CSVファイルの形式に問題があります。ヘッダー行と必須項目を確認してください。');
      }
      // ボタンを元に戻す（成功・失敗問わず）
      if (executeBtn) {
        executeBtn.disabled = false;
        executeBtn.innerHTML = 'インポート実行';
      }
    };
    
    reader.onerror = () => {
      // ボタンを元に戻す
      if (executeBtn) {
        executeBtn.disabled = false;
        executeBtn.innerHTML = 'インポート実行';
      }
      
      this.appUI.showNotification('error', 'ファイル読み込み失敗');
    };
    
    reader.readAsText(file);
  }
  
  /**
   * 資格選択肢を生成
   */
  populateQualificationOptions() {
    const selectElement = document.getElementById('selectQualification');
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">資格を選択してください</option>';
    
    const qualifications = this.appData.getQualifications();
    if (!qualifications || qualifications.length === 0) return;
    
    // カテゴリごとにグループ化
    const categorizedQualifications = {};
    
    qualifications.forEach(qualification => {
      const category = qualification.category || '未分類';
      if (!categorizedQualifications[category]) {
        categorizedQualifications[category] = [];
      }
      categorizedQualifications[category].push(qualification);
    });
    
    // カテゴリごとにソートし、オプショングループとして追加
    Object.keys(categorizedQualifications).sort().forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      const sortedQualifications = this._sortById(categorizedQualifications[category], 'Q');
      
      sortedQualifications.forEach(qualification => {
        const option = document.createElement('option');
        option.value = qualification.id;
        option.textContent = qualification.name;
        
        // 有効期間の情報を追加
        if (qualification.validMonths > 0) {
          option.textContent += ` (${qualification.validMonths}ヶ月)`;
        } else {
          option.textContent += ' (無期限)';
        }
        
        optgroup.appendChild(option);
      });
      
      selectElement.appendChild(optgroup);
    });
  }
  
  /**
   * 作業認定選択肢を生成
   */
  populateCertificationOptions() {
    const selectElement = document.getElementById('selectCertification');
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">作業認定を選択してください</option>';
    
    const certifications = this.appData.getWorkCertifications();
    if (!certifications || certifications.length === 0) return;
    
    // カテゴリごとにグループ化
    const categorizedCertifications = {};
    
    certifications.forEach(certification => {
      const category = certification.category || '未分類';
      if (!categorizedCertifications[category]) {
        categorizedCertifications[category] = [];
      }
      categorizedCertifications[category].push(certification);
    });
    
    // カテゴリごとにソートし、オプショングループとして追加
    Object.keys(categorizedCertifications).sort().forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      // カテゴリ内の作業認定を名前でソート
      const sortedCertifications = this._sortById(certifications, 'W');
      
      sortedCertifications.forEach(certification => {
        const option = document.createElement('option');
        option.value = certification.id;
        option.textContent = certification.name;
        
        // 有効期間の情報を追加
        if (certification.validMonths > 0) {
          option.textContent += ` (${certification.validMonths}ヶ月)`;
        } else {
          option.textContent += ' (無期限)';
        }
        
        optgroup.appendChild(option);
      });
      
      selectElement.appendChild(optgroup);
    });
  }
  
  // --- ヘルパー関数 ---
  
  /**
   * 日付フォーマット
   * @param {string} dateStr 日付文字列
   * @returns {string} フォーマットされた日付
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return ''; // 不正な日付
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  }
  
  /**
   * 日付入力フィールド用フォーマット
   * @param {string|Date} dateStr 日付文字列またはDateオブジェクト
   * @returns {string} フォーマットされた日付 (YYYY-MM-DD)
   */
  formatDateForInput(dateStr) {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(date.getTime())) return ''; // 不正な日付
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * 有効期限計算
   * @param {string} startDateStr 開始日
   * @param {number} validMonths 有効期間（月）
   * @returns {Date|null} 計算された有効期限
   */
  calculateExpiryDate(startDateStr, validMonths) {
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime()) || validMonths <= 0) return null;
    
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(validMonths));
    
    return expiryDate;
  }
  
  /**
   * ファイルサイズのフォーマット
   * @param {number} bytes バイト数
   * @returns {string} フォーマットされたサイズ
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * ID比較用のヘルパー関数
   * @param {string} id 
   * @param {string} prefix 
   * @returns {number}
   */
  _extractIdNumber(id, prefix = '') {
      const idStr = String(id);
      
      if (prefix) {
          // プレフィックス付きID（Q001, W001など）
          const pattern = new RegExp(`^${prefix}(\\d+)$`);
          const match = idStr.match(pattern);
          if (match) return parseInt(match[1], 10);
      }
      
      // 純粋な数値ID
      const numMatch = idStr.match(/^\d+$/);
      if (numMatch) return parseInt(idStr, 10);
      
      return 0;
  }

  /**
   * 資格/作業認定の共通ソート関数
   * @param {Array} items 
   * @param {string} idPrefix 
   * @returns {Array}
   */
  _sortById(items, idPrefix = '') {
      return [...items].sort((a, b) => {
          const aNum = this._extractIdNumber(a.id, idPrefix);
          const bNum = this._extractIdNumber(b.id, idPrefix);
          
          if (aNum !== bNum) {
              return aNum - bNum;
          }
          
          // IDが同じ場合は名前でソート
          return a.name.localeCompare(b.name, 'ja');
      });
  }


}