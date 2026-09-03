/**
 * 統合設定モジュール - インポート/エクスポート管理クラス
 * データのインポート・エクスポートの管理
 */
class ImportExportManager {
  constructor(settingsCore) {
    this.core = settingsCore;
    this.appUI = settingsCore.appUI;
    this.appData = settingsCore.appData;
    this.settingsUI = settingsCore.settingsUI;
    this.currentFileInput = null; // 現在のファイル入力要素への参照
  }
  
  /**
   * インポート/エクスポート関連のイベント設定
   */
  setupEventListeners() {
    // データオールクリアボタン
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', () => this.handleClearAllData());
    }
    
    // サンプルデータでリセットボタン
    const resetWithSampleDataBtn = document.getElementById('resetWithSampleDataBtn');
    if (resetWithSampleDataBtn) {
      resetWithSampleDataBtn.addEventListener('click', () => this.handleResetWithSampleData());
    }
  }

/**
   * インポート/エクスポート機能の初期化
   */
  initializeImportExport() {
    // 要素の取得
    const fileDropArea = document.getElementById('fileDropArea');
    const importFile = document.getElementById('importFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    
    if (!fileDropArea || !importFile || !fileInfo) {
      console.warn('必要な要素が見つかりません:', { fileDropArea, importFile, fileInfo });
      return;
    }
    
    // ファイル処理のヘルパー関数
    const handleFileSelection = (file) => {
      // 受け入れ形式の検証（ZIP形式。旧形式のJSONも読み込み可能）
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.json')) {
        this.appUI.showNotification('error', 'ファイル形式エラー', 'ZIPファイル（または旧形式のJSONファイル）を選択してください。');
        return false;
      }
      
      // ファイル情報表示
      if (fileName) fileName.textContent = file.name;
      if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
      
      // UI更新
      fileInfo.style.display = 'flex';
      fileDropArea.style.display = 'none';
      
      // インポートボタンを有効化
      const currentImportBtn = document.getElementById('importDataBtn');
      if (currentImportBtn) {
        currentImportBtn.disabled = false;
        currentImportBtn.classList.remove('disabled');
      }
      
      return true;
    };
    
    const clearFileSelection = () => {
      // ファイル入力をクリア
      const currentFileInput = document.getElementById('importFile');
      if (currentFileInput) {
        currentFileInput.value = '';
      }
      
      // UIをリセット
      fileInfo.style.display = 'none';
      fileDropArea.style.display = 'flex';
      
      // インポートボタンを無効化
      const currentImportBtn = document.getElementById('importDataBtn');
      if (currentImportBtn) {
        currentImportBtn.disabled = true;
        currentImportBtn.classList.add('disabled');
      }
    };
    
    // ファイル選択イベント（既存の要素に直接設定）
    importFile.removeEventListener('change', this._fileChangeHandler);
    this._fileChangeHandler = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    };
    importFile.addEventListener('change', this._fileChangeHandler);
    
    // ファイル削除ボタン
    if (removeFileBtn) {
      removeFileBtn.removeEventListener('click', this._removeFileHandler);
      this._removeFileHandler = (e) => {
        e.preventDefault();
        clearFileSelection();
      };
      removeFileBtn.addEventListener('click', this._removeFileHandler);
    }
    
    // ドラッグ&ドロップ設定（既存の要素に直接設定）
    // 既存のイベントリスナーを削除
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      fileDropArea.removeEventListener(eventName, this._dragHandlers?.[eventName]);
    });
    
    // 新しいイベントハンドラーを設定
    this._dragHandlers = {};
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this._dragHandlers[eventName] = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      fileDropArea.addEventListener(eventName, this._dragHandlers[eventName]);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      const handler = () => fileDropArea.classList.add('drag-over');
      fileDropArea.addEventListener(eventName, handler);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      const handler = () => fileDropArea.classList.remove('drag-over');
      fileDropArea.addEventListener(eventName, handler);
    });
    
    // ドロップ処理
    fileDropArea.removeEventListener('drop', this._dropHandler);
    this._dropHandler = (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        // ファイル入力に設定
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
        }
        
        handleFileSelection(file);
      }
    };
    fileDropArea.addEventListener('drop', this._dropHandler);
    
    // インポートボタン
    if (importDataBtn) {
      // 初期状態ではボタンを無効化
      importDataBtn.disabled = true;
      importDataBtn.classList.add('disabled');
      
      // 既存のイベントリスナーを削除
      importDataBtn.removeEventListener('click', this._importHandler);
      
      // 新しいイベントハンドラーを設定
      this._importHandler = (e) => {
        e.preventDefault();
        if (!importDataBtn.disabled) {
          this.handleImportData();
        }
      };
      importDataBtn.addEventListener('click', this._importHandler);
    }
    
    // エクスポートボタン
    if (exportDataBtn) {
      // 既存のイベントリスナーを削除
      exportDataBtn.removeEventListener('click', this._exportHandler);
      
      // 新しいイベントハンドラーを設定
      this._exportHandler = (e) => {
        e.preventDefault();
        this.handleExportData();
      };
      exportDataBtn.addEventListener('click', this._exportHandler);
    }
  }
  
  /**
   * インポート処理
   */
  /**
   * 読み込んだファイルからインポート用のJSONテキストを取り出す
   * ZIP形式は内部のJSONを展開し、旧形式のJSONはそのままテキストとして扱う
   * @param {ArrayBuffer} buffer 読み込んだファイル内容
   * @param {string} fileName ファイル名（形式判定の補助）
   * @returns {Promise<string>} JSONテキスト
   */
  async extractImportText(buffer, fileName) {
    const bytes = new Uint8Array(buffer);

    if (ZipArchive.isZip(bytes)) {
      const files = await ZipArchive.read(bytes);
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
      if (jsonFiles.length === 0) {
        throw new Error('ZIP内にデータファイル（.json）が見つかりません。');
      }
      if (jsonFiles.length > 1) {
        throw new Error('ZIP内にデータファイルが複数あります。1つだけ含むZIPを指定してください。');
      }
      return jsonFiles[0].text;
    }

    if (fileName.toLowerCase().endsWith('.zip')) {
      throw new Error('ZIPファイルとして読み込めませんでした。ファイルが破損している可能性があります。');
    }

    // 旧形式（JSONファイル）
    return new TextDecoder('utf-8').decode(bytes);
  }

  handleImportData() {
    // 現在のファイル入力要素を使用
    const fileInput = this.currentFileInput || document.getElementById('importFile');
    const file = fileInput?.files?.[0];
    
    if (!file) {
      this.appUI.showNotification('warning', 'ファイル未選択', 'インポートするファイルを選択してください。');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const jsonText = await this.extractImportText(e.target.result, file.name);
        const data = JSON.parse(jsonText);
        
        const exportType = data.metadata?.exportType || 'all';
        
        // データ構造の基本検証
        if (!data.metadata) {
          this.appUI.showNotification('error', 'データ形式エラー', '有効なエクスポートファイルではありません（metadata不足）。');
          return;
        }
        
        // エクスポートタイプに応じた確認メッセージ
        let confirmMessage = '';
        let dataDescription = '';
        
        switch (exportType) {
          case 'master':
            confirmMessage = 'マスタデータ（部署・役職・所属班・評価設定など）をインポートしますか？';
            dataDescription = '現在の登録データ（社員・評価）は保持されます。';
            break;
          case 'data':
            confirmMessage = '登録データ（社員・評価）をインポートしますか？';
            dataDescription = '現在のマスタデータ（部署・役職・所属班など）は保持されます。';
            break;
          case 'all':
          default:
            confirmMessage = '現在のデータをすべて上書きしてインポートしますか？';
            dataDescription = 'すべてのデータが置き換えられます。';
            break;
        }
        
        const fullMessage = `${confirmMessage}\n\n${dataDescription}\n\n注意: この操作は元に戻せません。\n\n続行しますか？`;
        
        if (confirm(fullMessage)) {
          this.executeImport(jsonText, exportType, file.name);
        }
      } catch (error) {
        this.appUI.showNotification('error', 'ファイル解析エラー', 'ファイルの形式が正しくありません。\n\n' + error.message);
        this.clearFileSelection();
      }
    };
    
    reader.onerror = (error) => {
      this.appUI.showNotification('error', 'ファイル読み込みエラー', 'ファイルの読み込みに失敗しました。');
      this.clearFileSelection();
    };
    
    // ZIP/JSONのどちらでも扱えるようバイナリとして読み込む
    reader.readAsArrayBuffer(file);
  }
  
  /**
   * インポート実行処理
   */
  executeImport(jsonText, exportType, fileName) {
    // インポートボタンのローディング状態
    const importBtn = document.getElementById('importDataBtn');
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> インポート中...';
    }
    
    // 非同期でインポート処理（UI応答性確保）
    setTimeout(() => {
      try {
        const success = this.appData.importData(jsonText);
        
        if (success) {
          this.handleImportSuccess(exportType, fileName);
        } else {
          this.appUI.showNotification('error', 'インポート失敗', 'データの形式が正しくないか、インポート処理中にエラーが発生しました。');
        }
      } catch (error) {
        this.appUI.showNotification('error', 'インポート失敗', 'インポート処理中にエラーが発生しました。\n\n' + error.message);
      } finally {
        // ボタンを元に戻す
        if (importBtn) {
          importBtn.disabled = false;
          importBtn.innerHTML = '<i class="fas fa-file-import"></i> データをインポート';
        }
      }
    }, 100);
  }
  
  /**
   * インポート成功時の処理
   */
  handleImportSuccess(exportType, fileName) {
    // フィルターをリセット
    this.core.appController.filters = {
      departments: new Set(this.appData.getDepartments().map(d => d.id)),
      ageGroups: new Set(['10s', '20s', '30s', '40s', '50s', '60s']),
      tenureGroups: new Set(['0-5', '6-10', '11-15', '16-20', '21-30', '31-']),
      positions: new Set(this.appData.getPositions().map(p => p.name)),
      teams: new Set(this.appData.getTeams().map(t => t.id)),
      grades: new Set(this.appData.getGradeOptions()),
      evaluationTypes: new Set(['A', 'B', 'C']),
      years: new Set(this.appData.getEvaluations().map(e => e.year)),
      recruitTypes: new Set(['new-graduate', 'mid-career']),
      searchTerm: ''
    };
    
    // 役職なし（空文字列）も含める
    this.core.appController.filters.positions.add('');
    
    // 表示オプションをリセット
    this.core.appController.displayOptions = {
      ...this.core.appController.displayOptions,
      chartType: this.appData.getSettings().defaultChartType || 'grade',
      sortOrder: this.appData.getSettings().defaultSortOrder || 'desc'
    };
    
    // UI要素を再初期化
    this.core.appController.initializeUI();
    
    // イベントリスナーをリセット
    this.core.appController.eventListenersInitialized = false;
    this.core.appController.setupEventListeners();
    
    // 全社員を選択状態にする
    const filteredEmployees = this.core.appController.getFilteredEmployees();
    this.core.appController.selectedEmployeeIds = filteredEmployees.map(emp => emp.id);
    
    // データ表示を更新
    this.core.appController.refreshData();
    
    // モーダルを閉じる
    this.core.hideModal();
    
    // ファイル選択をクリア
    this.clearFileSelection();
    
    // インポートタイプに応じたメッセージを表示
    let message = 'データのインポートが完了しました';
    switch (exportType) {
      case 'master':
        message = 'マスタデータのインポートが完了しました';
        break;
      case 'data':
        message = '登録データのインポートが完了しました';
        break;
      case 'all':
        message = 'すべてのデータのインポートが完了しました';
        break;
    }
    
    // 成功通知
    this.appUI.showNotification('success', 'インポート完了', `${message}（${fileName}）`);
  }
  
  /**
   * ファイル選択をクリア
   */
  clearFileSelection() {
    const fileInput = this.currentFileInput || document.getElementById('importFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileDropArea = document.getElementById('fileDropArea');
    const importDataBtn = document.getElementById('importDataBtn');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (fileDropArea) fileDropArea.style.display = 'flex';
    if (importDataBtn) {
      importDataBtn.disabled = true;
      importDataBtn.classList.add('disabled');
    }
  }
  
  /**
   * エクスポート処理
   */
  handleExportData() {
    // 選択されたエクスポートタイプを取得
    const exportType = document.querySelector('input[name="exportType"]:checked')?.value || 'all';
    
    // エクスポートボタンのアニメーション
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> エクスポート中...';
      
      // 非同期でエクスポート処理（UI応答性確保）
      setTimeout(async () => {
        const success = await this.appData.exportData(exportType);
        
        // ボタンを元に戻す
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i class="fas fa-file-export"></i> データをエクスポート';
        
        if (success) {
          // エクスポートタイプに応じたメッセージを表示
          let message = 'エクスポート完了';
          switch (exportType) {
            case 'master':
              message = 'マスタデータのエクスポート完了';
              break;
            case 'data':
              message = '登録データのエクスポート完了';
              break;
            case 'all':
              message = 'すべてのデータのエクスポート完了';
              break;
          }
          this.appUI.showNotification('success', message);
        }
      }, 100);
    }
  }

  /**
   * データオールクリア処理
   */
  handleClearAllData() {
    const warningMessage = 
      '本当にすべてのデータをクリアしますか？\n\n' +
      'この操作により以下のデータが削除されます：\n' +
      '- すべての社員データ\n' +
      '- すべての評価データ\n' +
      '- すべてのマスタデータ（部署・役職・所属班など）\n\n' +
      'サンプルデータは生成されません。\n\n' +
      'この操作は元に戻せません。重要なデータは事前にエクスポートしてください。';
    
    if (confirm(warningMessage)) {
      // ボタンのアニメーション
      const clearBtn = document.getElementById('clearAllDataBtn');
      if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
      }
      
      // 非同期で処理（UI応答性確保）
      setTimeout(() => {
        // AppDataのメソッドを呼び出してデータをクリア
        const success = this.appData.clearAllData();
        
        // ボタンを元に戻す
        if (clearBtn) {
          clearBtn.disabled = false;
          clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> データオールクリア';
        }
        
        if (success) {
          const app = this.core.appController;

          // アプリケーションの状態をリセット
          app.selectedEmployeeIds = [];
          
          // --- ここからが重要な修正 ---
          // フィルターを完全に空の状態で再構築
          app.filters = {
            departments: new Set(),
            ageGroups: new Set(),       // 空にする
            tenureGroups: new Set(),    // 空にする
            positions: new Set(),       // 空にする
            teams: new Set(),
            grades: new Set(),          // 空にする
            evaluationTypes: new Set(), // 空にする
            years: new Set(),
            recruitTypes: new Set(),    // 空にする
            contractTypes: new Set(),   // 空にする
            searchTerm: ''
          };
          
          // 表示設定をデフォルトに戻す
          app.displayOptions = {
            ...app.displayOptions,
            chartType: this.appData.getSettings().defaultChartType || 'grade',
            sortOrder: this.appData.getSettings().defaultSortOrder || 'desc',
            currentView: 'chart'
          };
          
          // UI要素の再初期化とデータ再描画
          app.initializeUI();
          app.refreshData();
          
          // モーダルを閉じる
          this.core.hideModal();
          
          // 成功メッセージの表示
          this.appUI.showNotification('success', 'データクリア完了', 'すべてのデータが正常にクリアされました。');
        } else {
          this.appUI.showNotification('error', 'クリア失敗', 'データのクリア中にエラーが発生しました。');
        }
      }, 100);
    }
  }

  /**
   * サンプルデータリセット処理
   */
  handleResetWithSampleData() {
    const warningMessage = 
      '本当にすべてのデータをリセットし、サンプルデータを再生成しますか？\n\n' +
      'この操作により以下のデータが削除されます：\n' +
      '- すべての社員データ\n' +
      '- すべての評価データ\n\n' +
      'その後、サンプルデータが生成されます。\n\n' +
      'この操作は元に戻せません。重要なデータは事前にエクスポートしてください。';
    
    if (confirm(warningMessage)) {
      // ボタンのアニメーション
      const resetBtn = document.getElementById('resetWithSampleDataBtn');
      if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
      }
      
      // 非同期で処理（UI応答性確保）
      setTimeout(() => {
        // サンプルデータでリセット
        const success = this.appData.resetWithSampleData();
        
        // ボタンを元に戻す
        if (resetBtn) {
          resetBtn.disabled = false;
          resetBtn.innerHTML = '<i class="fas fa-sync-alt"></i> サンプルデータでリセット';
        }
        
        if (success) {
          const app = this.core.appController;
          
          // --- ここからが重要な修正 ---
          // フィルターをサンプルデータに基づいて完全に再構築
          const positionSet = new Set(this.appData.getPositions().map(p => p.name));
          positionSet.add(''); // 役職なし
          
          app.filters = {
            departments: new Set(this.appData.getDepartments().map(d => d.id)),
            ageGroups: new Set(['10s', '20s', '30s', '40s', '50s', '60s']),
            tenureGroups: new Set(['0-5', '6-10', '11-15', '16-20', '21-30', '31-']),
            positions: positionSet,
            teams: new Set(this.appData.getTeams().map(t => t.id)),
            grades: new Set(this.appData.getGradeOptions()),
            evaluationTypes: new Set(['A', 'B', 'C']),
            years: new Set(this.appData.getEvaluations().map(e => e.year)),
            recruitTypes: new Set(['new-graduate', 'mid-career']), // 不足していたのを追加
            contractTypes: new Set(this.appData.getContractTypes().map(ct => ct.id)), // 不足していたのを追加
            searchTerm: ''
          };
          
          // 表示オプションをリセット
          app.displayOptions = {
            ...app.displayOptions,
            chartType: this.appData.getSettings().defaultChartType || 'grade',
            sortOrder: this.appData.getSettings().defaultSortOrder || 'desc',
            currentView: 'chart'
          };
          
          // 全社員を選択状態にする
          const filteredEmployees = app.getFilteredEmployees();
          app.selectedEmployeeIds = filteredEmployees.map(emp => emp.id);
          
          // UI要素の再初期化
          app.initializeUI();
          
          // イベントリスナーの初期化フラグをリセットして再設定
          app.eventListenersInitialized = false;
          app.setupEventListeners();
          
          app.refreshData();
          
          // モーダルを閉じる
          this.core.hideModal();
          
          // 成功メッセージの表示
          this.appUI.showNotification('success', 'リセット完了', 'サンプルデータで正常にリセットされました。');
        } else {
          this.appUI.showNotification('error', 'リセット失敗', 'データのリセット中にエラーが発生しました。');
        }
      }, 100);
    }
  }

  /**
   * ファイルサイズのフォーマット
   * @param {number} bytes ファイルサイズ（バイト）
   * @returns {string} フォーマットされたファイルサイズ
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}