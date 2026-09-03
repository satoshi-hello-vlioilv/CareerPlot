/**
 * 統合設定管理モジュール - エントリーポイント
 * 各種設定管理機能を統括するクラス
 */
class SettingsManager {
  /**
   * 設定マネージャーの初期化
   * @param {AppController} appController アプリケーションコントローラー
   */
  constructor(appController) {
    this.appController = appController;
    this.appUI = appController.appUI;
    this.appData = appController.appData;
    
    // 各サブモジュールの初期化
    this.masterDataManager = new MasterDataManager(this);
    this.employeeManager = new EmployeeManager(this);
    this.qualificationManager = new CertificationManager(this); // Changed QualificationManager to CertificationManager
    this.importExportManager = new ImportExportManager(this);
    
    // UI管理
    this.settingsUI = new SettingsUI(this);
    
    // 初期化状態管理
    this._initializationComplete = false;
    this.currentSection = 'import-export'; // デフォルトセクション
    this.activeAccordion = null; // アクティブなアコーディオン
    this.switchAttempts = 0; // セクション切り替え試行回数
    
    // 初期化
    this.setupEventListeners();
  }
  
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 設定ボタンのクリックイベント
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      // 既存のイベントリスナーをクリアするためクローンで置換
      const newSettingsBtn = settingsBtn.cloneNode(true);
      settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
      
      newSettingsBtn.onclick = (e) => {
        this.showModal('settingsModal');
        this.settingsUI.showLoadingState();
        setTimeout(() => this.initializeSections(), 300);
      };
    }
    
    // ナビゲーションとアコーディオン関連のイベント委任
    document.querySelector('.settings-nav')?.addEventListener('click', (e) => {
      const navItem = e.target.closest('.settings-nav-item');
      const accordionHeader = e.target.closest('.accordion-header');
      
      if (navItem) {
        e.preventDefault();
        const targetSection = navItem.getAttribute('data-section');
        this.switchSection(targetSection);
      } else if (accordionHeader) {
        const section = accordionHeader.closest('.accordion-section');
        this.settingsUI.toggleAccordionSection(section);
      }
    });
    
    // 評価タブのクリックイベント
    document.querySelector('.evaluation-tabs')?.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.eval-tab-btn');
      if (tabBtn) {
        const tabId = tabBtn.getAttribute('data-eval-tab');
        this.settingsUI.switchEvalTab(tabId);
      }
    });

    // 閉じるボタンイベント
    document.querySelectorAll('#closeSettingsModal, #closeSettingsBtn').forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.hideModal());
    });
    
    // 各マネージャーのイベントリスナー設定
    this.masterDataManager.setupEventListeners();
    this.employeeManager.setupEventListeners();
    this.qualificationManager.setupEventListeners();
    this.importExportManager.setupEventListeners();
    
    // セーブボタンのイベントリスナー
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        // 保存アニメーション
        saveSettingsBtn.classList.add('btn-saving');
        
        // 保存処理とフィードバック
        setTimeout(() => {
          this.hideModal();
          this.appUI.showNotification('success', '設定を保存しました', '変更内容が正常に保存されました');
          saveSettingsBtn.classList.remove('btn-saving');
          
          // 表示データを更新
          this.appController.refreshData();
        }, 300);
      });
    }
  }
  
  /**
   * モーダル表示
   * @param {string} modalId モーダルID
   * @returns {boolean} 表示成功したかどうか
   */
  showModal(modalId) {
    const result = this.appUI.showModal(modalId);
    
    // 統合設定モーダルの場合は追加処理
    if (modalId === 'settingsModal' && result) {
      // モーダル開始時のデフォルト設定
      this.currentSection = 'import-export';
      
      // すべてのセクションを非表示に
      document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
      });
      
      // ナビゲーションのアクティブ状態をリセット
      document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // モーダル表示後、少し遅延させてインポート/エクスポートセクションを明示的に表示
      setTimeout(() => {
        // インポート/エクスポートセクションを表示
        const targetSection = document.getElementById('import-export-section');
        if (targetSection) {
          targetSection.classList.add('active');
          
          // 対応するナビゲーションアイテムもアクティブに
          const navItem = document.querySelector('.settings-nav-item[data-section="import-export"]');
          if (navItem) {
            navItem.classList.add('active');
            // 親アコーディオンを開く
            const accordionSection = navItem.closest('.accordion-section');
            if (accordionSection && !accordionSection.classList.contains('active')) {
              this.settingsUI.toggleAccordionSection(accordionSection);
            }
          }
        } else {
          console.warn('インポート/エクスポートセクションが見つかりません');
        }
      }, 300);
    }
    
    return result;
  }
  
  /**
   * モーダル非表示
   * @returns {boolean} 非表示成功したかどうか
   */
  hideModal() {
    return this.appUI.hideModal('settingsModal');
  }
  
  /**
   * セクション切り替え
   * @param {string} sectionId 切り替え先セクションID
   */
  switchSection(sectionId) {
    // sectionIdが無効な場合はデフォルトを使用
    if (!sectionId) {
      sectionId = 'import-export';
    }
    
    // 対象セクションの存在確認
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (!targetSection) {
      console.warn(`セクション "${sectionId}-section" が見つかりません`);
      // import-exportセクションに切り替える試行回数を制限するための確認
      if (sectionId !== 'import-export' && this.switchAttempts < 3) {
        this.switchAttempts = (this.switchAttempts || 0) + 1;
        // 別のセクションを試す
        this.switchSection('department');
      }
      return;
    }
    
    // 切り替え試行回数をリセット
    this.switchAttempts = 0;
    
    // 現在のセクションと同じ場合は処理をスキップ
    if (this.currentSection === sectionId) return;
    
    // 現在のセクションを記録
    this.currentSection = sectionId;
    
    // ナビゲーションアイテムのアクティブ状態を効率的に更新
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      const itemSectionId = item.getAttribute('data-section');
      const isActive = itemSectionId === sectionId;
      item.classList.toggle('active', isActive);
      
      // アクティブになったアイテムにエフェクト追加
      if (isActive) {
        // 波紋エフェクトを追加
        this.settingsUI.addRippleEffect(item);
        
        // 対応するアコーディオンを展開
        const accordionSection = item.closest('.accordion-section');
        if (accordionSection && !accordionSection.classList.contains('active')) {
          setTimeout(() => {
            this.settingsUI.toggleAccordionSection(accordionSection);
          }, 50);
        }
      }
    });
    
    // セクションの表示/非表示を一括更新
    const allSections = document.querySelectorAll('.settings-section');
    let targetFound = false;
    
    allSections.forEach(section => {
      const isCurrent = section.id === `${sectionId}-section`;
      section.classList.toggle('active', isCurrent);
      
      if (isCurrent) {
        targetFound = true;
        // 表示されたセクションは先頭にスクロール
        const contentPanel = document.querySelector('.settings-content');
        if (contentPanel) contentPanel.scrollTop = 0;
      }
    });
    
    if (!targetFound) {
      console.warn(`セクション要素 "${sectionId}-section" が見つかりませんでした`);
    }
    
    // セクション切り替え時に必要なデータのみ更新
    this.refreshSectionData(sectionId);
  }
  
  /**
   * セクションデータ更新
   * @param {string} sectionId セクションID
   */
  refreshSectionData(sectionId) {
    try {
      // 直接参照を使用
      const formUI = this.appController.appUIForms;
      
      setTimeout(() => {
        switch (sectionId) {
          case 'department':
            this.appUI.appUIForms.updateDepartmentTable();
            break;
          case 'team':
            this.appUI.appUIForms.updateTeamTable();
            break;
          case 'position':
            this.appUI.appUIForms.updatePositionTable();
            break;
          case 'grade':
            this.appUI.appUIForms.updateGradeTable();
            this.masterDataManager.refreshGradeColors();
            break;
          case 'yearly':
            this.appUI.appUIForms.updateAEvalTable();
            this.appUI.appUIForms.updateBEvalTable();
            this.appUI.appUIForms.updateCEvalTable();
            break;
          case 'employee-management':
            this.appUI.appUIForms.updateEmployeeManagementTable(this.appData.getEmployees());
            break;
          case 'employee-qualifications':
            this.employeeManager.refreshEmployeeSelector();
            // START OF MODIFICATION (setting.js - refreshSectionData for employee-qualifications)
            // 選択中の社員がいれば、その資格情報を読み込む
            const selectedEmployeeItem = document.querySelector('.employee-selector-item.selected');
            if (selectedEmployeeItem) {
                const employeeId = selectedEmployeeItem.getAttribute('data-employee-id');
                if (employeeId) {
                    this.employeeManager.loadEmployeeQualifications(parseInt(employeeId));
                } else {
                     this.employeeManager.showEmptyEmployeeQualifications();
                }
            } else {
                this.employeeManager.showEmptyEmployeeQualifications();
            }
            // END OF MODIFICATION
            break;
          case 'qualification':
            this.qualificationManager.refreshQualificationList();
            break;
          case 'certification':
            this.qualificationManager.refreshCertificationList();
            break;
          case 'import-export':
            this.importExportManager.initializeImportExport();
            break;
        }
      }, 10);
    } catch (error) {
      console.error('セクションデータ更新エラー:', error);
    }
  }
  
  /**
   * 全セクションの初期化（バッチ処理化・非同期化）
   */
  initializeSections() {
    try {
      // 初期化が完了したかどうかのフラグ設定
      if (this._initializationComplete) {
        // 既に初期化完了している場合は、現在のセクションの表示のみ更新
        this.settingsUI.hideLoadingState();
        this.switchSection(this.currentSection || 'import-export');
        return;
      }
      
      // より確実に初期セクションを表示
      this.switchSection('import-export');
      
      // 直接参照を使用して処理を簡素化
      const formUI = this.appController.appUIForms || {};
      
      // 一連の操作をプロミスチェーンで処理
      Promise.resolve()
        .then(() => {
          // 部署・役職・所属班・グレード
          if (typeof formUI.updateDepartmentTable === 'function') formUI.updateDepartmentTable();
          if (typeof formUI.updatePositionTable === 'function') formUI.updatePositionTable();
          if (typeof formUI.updateTeamTable === 'function') formUI.updateTeamTable();
          if (typeof formUI.updateGradeTable === 'function') formUI.updateGradeTable();
          return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
          // 評価・資格
          if (typeof formUI.updateAEvalTable === 'function') formUI.updateAEvalTable();
          if (typeof formUI.updateBEvalTable === 'function') formUI.updateBEvalTable();
          if (typeof formUI.updateCEvalTable === 'function') formUI.updateCEvalTable();
          this.masterDataManager.refreshGradeColors();
          return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
          // 社員関連
          if (typeof formUI.updateEmployeeManagementTable === 'function') {
            formUI.updateEmployeeManagementTable(this.appData.getEmployees());
          }
          this.employeeManager.refreshEmployeeSelector();
          return new Promise(resolve => setTimeout(resolve, 50));
        })
        .then(() => {
          // 資格・認定
          this.qualificationManager.refreshQualificationList();
          this.qualificationManager.refreshCertificationList();
          this.importExportManager.initializeImportExport();
          
          // アコーディオンの初期状態設定
          this.settingsUI.setupInitialAccordionState();
          
          // 明示的にインポート/エクスポートセクションをアクティブに
          this.currentSection = 'import-export';
          this.switchSection('import-export');
          
          // 初期化完了フラグを設定
          this._initializationComplete = true;
          
          // ローディング終了
          this.settingsUI.hideLoadingState();
        })
        .catch(error => {
          console.error('設定初期化エラー:', error);
          this.settingsUI.hideLoadingState();
          // エラーが発生しても最低限のUIは表示
          this.switchSection('import-export');
        });
    } catch (error) {
      console.error('深刻な初期化エラー:', error);
      this.settingsUI.hideLoadingState();
      // 最低限のUIは表示
      this.switchSection('import-export');
    }
  }
}