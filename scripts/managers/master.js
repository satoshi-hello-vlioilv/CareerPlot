/**
 * 統合設定モジュール - マスタデータ管理クラス
 * 部署・役職・所属班・グレード・評価などマスタデータ管理
 */
class MasterDataManager {
  constructor(settingsCore) {
    this.core = settingsCore;
    this.appUI = settingsCore.appUI;
    this.appData = settingsCore.appData;
    this.settingsUI = settingsCore.settingsUI;
  }
  
  /**
   * マスタデータ関連イベント設定
   */
  setupEventListeners() {
    // 部署追加
    const addDepartmentBtn = document.getElementById('addDepartmentBtn');
    if (addDepartmentBtn) {
      addDepartmentBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('departmentName');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', '部署名を入力してください。');
          return;
        }
        
        const newId = this.appData.addDepartment(name);
        if (newId) {
          nameInput.value = '';
          this.core.appController.filters.departments.add(newId);
          this.appUI.appUIForms.updateDepartmentTable();
          this.core.appController.updateDepartmentFilter();
          this.core.appController.populateDepartmentOptions();
          this.core.appController.refreshData();
          this.appUI.showNotification('success', '部署追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // 所属班追加
    const addTeamBtn = document.getElementById('addTeamBtn');
    if (addTeamBtn) {
      addTeamBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('teamName');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', '所属班名を入力してください。');
          return;
        }
        
        const newId = this.appData.addTeam(name);
        if (newId) {
          nameInput.value = '';
          this.core.appController.filters.teams.add(newId);
          this.appUI.appUIForms.updateTeamTable();
          this.core.appController.updateTeamFilter();
          this.core.appController.populateTeamOptions();
          this.core.appController.refreshData();
          this.appUI.showNotification('success', '所属班追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // 役職追加
    const addPositionBtn = document.getElementById('addPositionBtn');
    if (addPositionBtn) {
      addPositionBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('positionName');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', '役職名を入力してください。');
          return;
        }
        
        const newId = this.appData.addPosition(name);
        if (newId) {
          nameInput.value = '';
          this.core.appController.filters.positions.add(name);
          this.appUI.appUIForms.updatePositionTable();
          this.core.appController.updatePositionFilter();
          this.core.appController.populatePositionOptions();
          this.core.appController.refreshData();
          this.appUI.showNotification('success', '役職追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // グレード追加
    const addGradeBtn = document.getElementById('addGradeBtn');
    if (addGradeBtn) {
      addGradeBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('gradeName');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', 'グレード名を入力してください。');
          return;
        }
        
        // Gから始まる形式をチェック
        if (!/^G\d+$/.test(name)) {
          this.appUI.showNotification('warning', '入力エラー', 'グレード名は「G」で始まり、数字が続く形式にしてください (例: G1)');
          return;
        }
        
        const success = this.core.appController.addGrade(name); // AppController経由に変更
        if (success) {
          nameInput.value = '';
          this.appUI.appUIForms.updateGradeTable();
          this.core.appController.updateGradeFilter();
          this.refreshGradeColors();
          this.appUI.showNotification('success', 'グレード追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // 評価追加（A評価）
    const addAEvalBtn = document.getElementById('addAEvalBtn');
    if (addAEvalBtn) {
      addAEvalBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('newAEval');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', 'A評価名を入力してください。');
          return;
        }
        
        // Aから始まる形式をチェック
        if (!/^A\d+$/.test(name)) {
          this.appUI.showNotification('warning', '入力エラー', 'A評価は「A」で始まり、数字が続く形式にしてください (例: A1)');
          return;
        }
        
        const success = this.appData.addYearlyEvaluation('A', name); // type 'A' を指定
        if (success) {
          nameInput.value = '';
          this.appUI.appUIForms.updateAEvalTable();
          this.appUI.showNotification('success', 'A評価追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // 評価追加（B評価）
    const addBEvalBtn = document.getElementById('addBEvalBtn');
    if (addBEvalBtn) {
      addBEvalBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('newBEval');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', 'B評価名を入力してください。');
          return;
        }
        
        // Bから始まる形式をチェック
        if (!/^B\d+$/.test(name)) {
          this.appUI.showNotification('warning', '入力エラー', 'B評価は「B」で始まり、数字が続く形式にしてください (例: B1)');
          return;
        }
        
        const success = this.appData.addYearlyEvaluation('B', name); // type 'B' を指定
        if (success) {
          nameInput.value = '';
          this.appUI.appUIForms.updateBEvalTable();
          this.appUI.showNotification('success', 'B評価追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // 評価追加（C評価）
    const addCEvalBtn = document.getElementById('addCEvalBtn');
    if (addCEvalBtn) {
      addCEvalBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('newCEval');
        const name = nameInput?.value.trim();
        
        if (!name) {
          this.appUI.showNotification('warning', '入力エラー', 'C評価名を入力してください。');
          return;
        }
        
        // Cから始まる形式をチェック
        if (!/^C\d+$/.test(name)) {
          this.appUI.showNotification('warning', '入力エラー', 'C評価は「C」で始まり、数字が続く形式にしてください (例: C1)');
          return;
        }
        
        const success = this.appData.addYearlyEvaluation('C', name); // type 'C' を指定
        if (success) {
          nameInput.value = '';
          this.appUI.appUIForms.updateCEvalTable();
          this.appUI.showNotification('success', 'C評価追加', `「${name}」を追加しました`);
        } else {
          this.appUI.showNotification('error', '追加失敗', `「${name}」は既に存在します`);
        }
      });
    }
    
    // テーブル内の編集・削除ボタンのイベント委任（パフォーマンス最適化）
    document.querySelector('.settings-content')?.addEventListener('click', (e) => {
      // 編集ボタン
      const editBtn = e.target.closest('.btn-table-action.edit');
      if (editBtn) {
        const row = editBtn.closest('tr');
        const tableBody = row?.closest('tbody');
        if (row && tableBody) {
          // テーブルIDを取得
          const tableId = tableBody.id;
          
          // 資格・作業認定テーブルは除外（CertificationManagerで処理）
          if (tableId === 'qualificationTableBody' || tableId === 'workCertificationTableBody') {
            return; // 処理しない
          }
          
          this.handleEditMasterData(tableId, row);
        }
        return;
      }
      
      // 削除ボタン
      const deleteBtn = e.target.closest('.btn-table-action.delete');
      if (deleteBtn) {
        const row = deleteBtn.closest('tr');
        const tableBody = row?.closest('tbody');
        if (row && tableBody) {
          // テーブルIDを取得
          const tableId = tableBody.id;
          
          // 資格・作業認定テーブルは除外（CertificationManagerで処理）
          if (tableId === 'qualificationTableBody' || tableId === 'workCertificationTableBody') {
            return; // 処理しない
          }
          
          this.handleDeleteMasterData(tableId, row);
        }
      }
    });
  }
  
  /**
   * グレード色表示の更新（バッチ処理化）
   */
  refreshGradeColors() {
    const container = document.querySelector('.grade-colors-container');
    if (!container) return;
    
    // DOM操作を最小限にするためのフラグメント
    const fragment = document.createDocumentFragment();
    const grades = this.appData.getGradeOptions();
    
    grades.forEach(grade => {
      const gradeNum = parseInt(grade.replace('G', ''));
      if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) return;
      
      const item = document.createElement('div');
      item.className = 'grade-color-item'; 
      item.style.backgroundColor = `var(--grade-${gradeNum})`;
      item.textContent = grade; 
      
      // コントラストカラー適用のための処理
      const tempParent = document.createElement('div'); 
      tempParent.style.display = 'none';
      document.body.appendChild(tempParent);
      tempParent.appendChild(item); 
      
      const bgColorHex = this.appUI.getComputedBgHex(item); 
      this.appUI.applyContrastColor(item, bgColorHex); 
      
      tempParent.removeChild(item); 
      document.body.removeChild(tempParent); 

      item.style.borderColor = 'rgba(0,0,0,0.1)'; 
      
      fragment.appendChild(item);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  /**
   * マスタデータ編集処理
   */
  handleEditMasterData(tableId, row) {
    if (!row) {
      console.error('編集対象の行がありません:', tableId);
      return;
    }
    
    const cells = row.cells;
    if (!cells || cells.length < 1) {
      console.error('編集対象の行にセルがありません:', tableId, row);
      return;
    }
    
    // テーブルタイプに応じた処理
    let id, currentName, entityType, updateMethod;
    
    try {
      switch (tableId) {
        case 'departmentTableBody':
          id = parseInt(cells[0].textContent, 10);
          currentName = cells[1].textContent;
          entityType = '部署';
          updateMethod = this.appData.updateDepartment.bind(this.appData);
          break;
        case 'positionTableBody':
          id = parseInt(cells[0].textContent, 10);
          currentName = cells[1].textContent;
          entityType = '役職';
          updateMethod = this.appData.updatePosition.bind(this.appData);
          break;
        case 'teamTableBody':
          id = parseInt(cells[0].textContent, 10);
          currentName = cells[1].textContent;
          entityType = '所属班';
          updateMethod = this.appData.updateTeam.bind(this.appData);
          break;
        case 'gEvalTableBody':
          const gradeBadgeEdit = cells[0].querySelector('.evaluation-card.grade-evaluation');
          if (!gradeBadgeEdit) {
            console.error('グレード編集: グレードバッジが見つかりません:', cells[0]);
            return;
          }
          currentName = gradeBadgeEdit.textContent.trim();
          // END OF MODIFICATION
          id = currentName; // グレードはIDと名前が同じ
          entityType = 'グレード';
          updateMethod = (oldVal, newVal) => this.core.appController.updateGrade(oldVal, newVal);
          break;
        case 'aEvalTableBody':
        case 'bEvalTableBody':
        case 'cEvalTableBody':
          // 評価もバッジからテキストを取得
          const evalBadgeEdit = cells[0].querySelector('.evaluation-card'); // yearly-evaluation or grade-evaluation
          if (!evalBadgeEdit) {
            console.error('評価編集: 評価バッジが見つかりません:', cells[0]);
            return;
          }
          currentName = evalBadgeEdit.textContent.trim();
          id = currentName; // 評価はIDと名前が同じ
          entityType = '評価';
          
          // 評価タイプを決定
          let evalType = '';
          if (tableId === 'aEvalTableBody') evalType = 'A';
          else if (tableId === 'bEvalTableBody') evalType = 'B';
          else if (tableId === 'cEvalTableBody') evalType = 'C';
          
          updateMethod = (oldVal, newVal) => this.appData.updateYearlyEvaluation(evalType, oldVal, newVal);
          break;

        default:
          console.error('不明なテーブルID:', tableId);
          return;
      }
    } catch (e) {
      console.error('編集データの抽出中にエラー:', e, tableId, row);
      return;
    }
    
    // 値が見つからなければ処理中止
    if (currentName === undefined || currentName === null) { // currentNameが空文字列の場合は許可
        console.error('編集対象の値が見つかりません:', tableId, row);
        return;
    }
    
    // インラインフォームの作成
    const formRow = document.createElement('tr');
    formRow.className = 'edit-form-row';
    
    if (tableId === 'gEvalTableBody' || tableId.endsWith('EvalTableBody')) {
      // グレードと評価は1カラム
      const nameCell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.value = currentName;
      input.style.width = '100%';
      // ダイアログ表示を防止
      input.setAttribute('autocomplete', 'off');
      nameCell.appendChild(input);
      
      const actionCell = document.createElement('td');
      actionCell.className = 'action-cell';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-table-action edit';
      saveBtn.title = '保存';
      saveBtn.innerHTML = '<i class="fas fa-check"></i>';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-table-action delete';
      cancelBtn.title = 'キャンセル';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
      
      actionCell.appendChild(saveBtn);
      actionCell.appendChild(cancelBtn);
      
      formRow.appendChild(nameCell);
      formRow.appendChild(actionCell);
      
      // 保存ボタン処理
      saveBtn.addEventListener('click', () => {
        const newName = input.value.trim();
        if (!newName) {
          this.appUI.showNotification('warning', '入力エラー', `${entityType}名を入力してください。`);
          return;
        }
        
        if (newName === currentName) {
          // 変更なしの場合は編集をキャンセル
          formRow.remove();
          row.style.display = '';
          return;
        }
        
        // グレードの場合はフォーマット確認
        if (entityType === 'グレード' && !/^G\d+$/.test(newName)) {
          this.appUI.showNotification('warning', '入力エラー', 'グレード名は「G」で始まり、数字が続く形式にしてください (例: G1)');
          return;
        }
        
        // 各評価タイプの場合もフォーマット確認
        if (entityType === '評価') {
          const evalPrefix = tableId.charAt(0).toUpperCase();
          if (!new RegExp(`^${evalPrefix}\\d+$`).test(newName)) {
            this.appUI.showNotification('warning', '入力エラー', `${evalPrefix}評価は「${evalPrefix}」で始まり、数字が続く形式にしてください (例: ${evalPrefix}1)`);
            return;
          }
        }
        
        // 保存アニメーション
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;
        
        setTimeout(() => {
          try {
            // 直接更新する（ダイアログを表示しない）
            const success = updateMethod(currentName, newName);
            
            if (success) {
              // テーブル更新
              switch (tableId) {
                case 'gEvalTableBody':
                  this.appUI.appUIForms.updateGradeTable();
                  this.core.appController.updateGradeFilter();
                  this.refreshGradeColors();
                  break;
                case 'aEvalTableBody':
                case 'bEvalTableBody':
                case 'cEvalTableBody':
                  this.appUI.appUIForms.updateAEvalTable();
                  this.appUI.appUIForms.updateBEvalTable();
                  this.appUI.appUIForms.updateCEvalTable();
                  break;
              }
              
              this.appUI.showNotification('success', '更新完了', `${entityType}名を更新しました`);
              this.core.appController.refreshData();
            } else {
              this.appUI.showNotification('error', '更新失敗', `同名の${entityType}が既に存在するか、使用中のため更新できません。`);
            }
            // 編集フォームを削除（成功・失敗問わず）
            formRow.remove();
            row.style.display = '';

          } catch (e) {
            console.error('更新処理でエラー:', e);
            this.appUI.showNotification('error', '更新エラー', `${entityType}の更新中にエラーが発生しました。`);
            formRow.remove();
            row.style.display = '';
          }
        }, 50);
      });
      
      // キャンセルボタン処理
      cancelBtn.addEventListener('click', () => {
        formRow.remove();
        row.style.display = '';
      });
      
      // キーボードイベント
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveBtn.click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelBtn.click();
        }
      });
    } else {
      // 部署・役職・所属班は2カラム
      const idCell = document.createElement('td');
      idCell.textContent = id;
      
      const nameCell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.value = currentName;
      input.style.width = '100%';
      // ダイアログ表示を防止
      input.setAttribute('autocomplete', 'off');
      nameCell.appendChild(input);
      
      const actionCell = document.createElement('td');
      actionCell.className = 'action-cell';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-table-action edit';
      saveBtn.title = '保存';
      saveBtn.innerHTML = '<i class="fas fa-check"></i>';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-table-action delete';
      cancelBtn.title = 'キャンセル';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
      
      actionCell.appendChild(saveBtn);
      actionCell.appendChild(cancelBtn);
      
      formRow.appendChild(idCell);
      formRow.appendChild(nameCell);
      formRow.appendChild(actionCell);
      
      // 保存ボタン処理
      saveBtn.addEventListener('click', () => {
        const newName = input.value.trim();
        if (!newName) {
          this.appUI.showNotification('warning', '入力エラー', `${entityType}名を入力してください。`);
          return;
        }
        
        if (newName === currentName) {
          // 変更なしの場合は編集をキャンセル
          formRow.remove();
          row.style.display = '';
          return;
        }
        
        // 保存アニメーション
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;
        
        setTimeout(() => {
          try {
            // 直接更新する（ダイアログを表示しない）
            const success = updateMethod(id, newName);
            
            if (success) {
              // テーブル更新
              switch (tableId) {
                case 'departmentTableBody':
                  this.appUI.appUIForms.updateDepartmentTable();
                  this.core.appController.updateDepartmentFilter();
                  this.core.appController.populateDepartmentOptions();
                  break;
                case 'positionTableBody':
                  this.appUI.appUIForms.updatePositionTable();
                  this.core.appController.updatePositionFilter();
                  this.core.appController.populatePositionOptions();
                  break;
                case 'teamTableBody':
                  this.appUI.appUIForms.updateTeamTable();
                  this.core.appController.updateTeamFilter();
                  this.core.appController.populateTeamOptions();
                  break;
              }
              
              this.appUI.showNotification('success', '更新完了', `${entityType}名を更新しました`);
              this.core.appController.refreshData();
            } else {
              this.appUI.showNotification('error', '更新失敗', `同名の${entityType}が既に存在するか、使用中のため更新できません。`);
            }
            // 編集フォームを削除（成功・失敗問わず）
            formRow.remove();
            row.style.display = '';

          } catch (e) {
            console.error('更新処理でエラー:', e);
            this.appUI.showNotification('error', '更新エラー', `${entityType}の更新中にエラーが発生しました。`);
            formRow.remove();
            row.style.display = '';
          }
        }, 50);
      });
      
      // キャンセルボタン処理
      cancelBtn.addEventListener('click', () => {
        formRow.remove();
        row.style.display = '';
      });
      
      // キーボードイベント
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
    
    // 元の行を非表示にして編集行を挿入
    row.style.display = 'none';
    row.after(formRow);
    
    // フォーカスを入力フィールドに設定
    formRow.querySelector('input').focus();
    formRow.querySelector('input').select();
  }

  /**
   * マスタデータ削除処理
   */
  handleDeleteMasterData(tableId, row) {
    const cells = row.cells;
    if (!cells || cells.length < 1) return;
    
    // テーブルタイプに応じた処理
    let id, name, entityType, deleteMethod, confirmMessage;
    
    switch (tableId) {
      case 'departmentTableBody':
        id = cells[0].textContent;
        name = cells[1].textContent;
        entityType = '部署';
        deleteMethod = (deptId) => this.appData.deleteDepartment(parseInt(deptId)); // IDは数値のはず
        confirmMessage = `${entityType}「${name}」を削除しますか？\n\n削除すると、この部署に所属している社員の部署情報も削除されます。この操作は元に戻せません。`;
        break;
      case 'positionTableBody':
        id = cells[0].textContent;
        name = cells[1].textContent;
        entityType = '役職';
        deleteMethod = (posId) => this.appData.deletePosition(parseInt(posId)); // IDは数値のはず
        confirmMessage = `${entityType}「${name}」を削除しますか？\n\nこの役職を持つ社員からは役職情報が削除されます。この操作は元に戻せません。`;
        break;
      case 'teamTableBody':
        id = cells[0].textContent;
        name = cells[1].textContent;
        entityType = '所属班';
        deleteMethod = (teamId) => this.appData.deleteTeam(parseInt(teamId)); // IDは数値のはず
        confirmMessage = `${entityType}「${name}」を削除しますか？\n\nこの所属班に所属している社員の班情報も削除されます。この操作は元に戻せません。`;
        break;
      case 'gEvalTableBody': {
        const gradeBadgeDelete = cells[0].querySelector('.evaluation-card.grade-evaluation');
        if (!gradeBadgeDelete) {
            console.error('グレード削除: グレードバッジが見つかりません:', cells[0]);
            return;
        }
        name = gradeBadgeDelete.textContent.trim();
        // END OF MODIFICATION
        id = name; // グレードはIDと名前が同じ
        entityType = 'グレード';
        deleteMethod = (gradeName) => this.core.appController.deleteGrade(gradeName); // AppController経由に変更
        confirmMessage = `${entityType}「${name}」を削除しますか？\n\nこのグレードを持つ評価がある場合は削除できません。この操作は元に戻せません。`;
        break;
      }
      case 'aEvalTableBody':
      case 'bEvalTableBody':
      case 'cEvalTableBody': {
        // 評価のテキストをバッジから取得
        const evalBadgeDelete = cells[0].querySelector('.evaluation-card'); // yearly-evaluation or grade-evaluation
        if (!evalBadgeDelete) {
            console.error('評価削除: 評価バッジが見つかりません:', cells[0]);
            return;
        }
        name = evalBadgeDelete.textContent.trim();
        id = name; // 評価はIDと名前が同じ
        entityType = '評価';
        // 評価タイプを決定
        const evalType = {
          'aEvalTableBody': 'A',
          'bEvalTableBody': 'B', 
          'cEvalTableBody': 'C'
        }[tableId] || '';
        
        deleteMethod = (evalName) => this.appData.deleteYearlyEvaluation(evalType, evalName);
        confirmMessage = `${entityType}「${name}」を削除しますか？\n\nこの評価を持つ社員がいる場合は削除できません。この操作は元に戻せません。`;
        break;
      }
      default:
        return;
    }
    
    // 名前が取得できていないなら中断
    if (name === undefined || name === null) { // nameが空文字列の場合は許可
      console.error('削除対象の名前が取得できません', tableId, row);
      return;
    }
    
    if (confirm(confirmMessage)) {
      // 削除アニメーション
      const deleteBtn = row.querySelector('.btn-table-action.delete');
      if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        deleteBtn.disabled = true;
      }
      
      setTimeout(() => {
        const success = deleteMethod(id); // id を渡す
        
        if (success) {
          // テーブル更新
          switch (tableId) {
            case 'departmentTableBody':
              this.core.appController.filters.departments.delete(parseInt(id));
              this.appUI.appUIForms.updateDepartmentTable();
              this.core.appController.updateDepartmentFilter();
              this.core.appController.populateDepartmentOptions();
              break;
            case 'positionTableBody':
              this.core.appController.filters.positions.delete(name);
              this.appUI.appUIForms.updatePositionTable();
              this.core.appController.updatePositionFilter();
              this.core.appController.populatePositionOptions();
              break;
            case 'teamTableBody':
              this.core.appController.filters.teams.delete(parseInt(id));
              this.appUI.appUIForms.updateTeamTable();
              this.core.appController.updateTeamFilter();
              this.core.appController.populateTeamOptions();
              break;
            case 'gEvalTableBody':
              this.appUI.appUIForms.updateGradeTable();
              this.core.appController.updateGradeFilter();
              this.refreshGradeColors();
              break;
            case 'aEvalTableBody':
            case 'bEvalTableBody':
            case 'cEvalTableBody':
              this.appUI.appUIForms.updateAEvalTable();
              this.appUI.appUIForms.updateBEvalTable();
              this.appUI.appUIForms.updateCEvalTable();
              break;
          }
          
          this.appUI.showNotification('success', '削除完了', `${entityType}「${name}」を削除しました`);
          this.core.appController.refreshData();
        } else {
          // 削除失敗時はボタンを元に戻す
          if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.disabled = false;
          }
          
          this.appUI.showNotification('error', '削除失敗', `${entityType}「${name}」は使用中のため削除できません。`);
        }
      }, 50);
    }
  }
}