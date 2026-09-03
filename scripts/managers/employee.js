/**
 * 統合設定モジュール - 社員管理クラス
 * 社員情報や資格割り当て管理
 */
class EmployeeManager {
  constructor(settingsCore) {
    this.core = settingsCore;
    this.appUI = settingsCore.appUI;
    this.appData = settingsCore.appData;
    this.settingsUI = settingsCore.settingsUI;
    // 社員管理関連のイベントリスナー初期化フラグ
    this.eventListenersInitialized = false;
  }

  /**
   * 社員管理関連のイベントリスナーを設定
   */
  setupEventListeners() {
    // 既に初期化済みなら処理をスキップ
    if (this.eventListenersInitialized) return;
    
    // 社員管理テーブルの検索フィールド
    const employeeManagementSearch = document.getElementById('employeeManagementSearch');
    if (employeeManagementSearch) {
      employeeManagementSearch.addEventListener('input', (e) => {
        this.appUI.appUIForms.filterEmployeeManagementTable(e.target.value);
      });
    }
    
    // 社員資格検索フィールド
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
    
    // 社員選択リストのイベント委任
    document.getElementById('employeeSelector')?.addEventListener('click', (e) => {
      const employeeItem = e.target.closest('.employee-selector-item');
      if (employeeItem) {
        // 他の選択状態をクリア
        document.querySelectorAll('.employee-selector-item').forEach(item => {
          item.classList.remove('selected');
        });
        
        // クリックした社員を選択状態に
        employeeItem.classList.add('selected');
        
        // 社員IDを取得
        const employeeId = employeeItem.getAttribute('data-employee-id');
        if (employeeId) {
          this.loadEmployeeQualifications(parseInt(employeeId));
        }
      }
    });
    
    // 初期化完了フラグをセット
    this.eventListenersInitialized = true;
  }

  /**
   * 社員選択リストを更新
   */
  refreshEmployeeSelector() {
    const selector = document.getElementById('employeeSelector');
    if (!selector) return;
    
    const employees = this.appData.getEmployees();
    const fragment = document.createDocumentFragment();
    
    // 社員を名前順でソート
    const sortedEmployees = [...employees].sort((a, b) => 
      a.name.localeCompare(b.name, 'ja')
    );
    
    sortedEmployees.forEach(employee => {
      const item = document.createElement('div');
      item.className = 'employee-selector-item';
      item.setAttribute('data-employee-id', employee.id);
      item.textContent = employee.name;
      fragment.appendChild(item);
    });
    
    selector.innerHTML = '';
    selector.appendChild(fragment);
  }
  
  /**
   * 指定社員の資格情報を読み込んで表示
   * @param {number} employeeId 社員ID
   */
  loadEmployeeQualifications(employeeId) {
    const contentContainer = document.getElementById('employeeQualificationsContent');
    if (!contentContainer) return;
    
    // ローディング表示
    contentContainer.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>資格情報を読み込み中...</p>
      </div>
    `;
    
    // 社員情報を取得
    const employee = this.appData.getEmployee(employeeId);
    if (!employee) {
      this.showEmptyEmployeeQualifications();
      return;
    }
    
    // 資格・認定情報を取得
    const qualifications = this.appData.getEmployeeQualifications(employeeId);
    const certifications = this.appData.getEmployeeWorkCertifications(employeeId);
    
    // コンテンツを構築
    const content = `
      <div class="employee-qualifications-header">
        <h4><i class="fas fa-user"></i> ${employee.name}さんの資格・認定情報</h4>
        <input type="hidden" name="employeeIdForQualification" value="${employeeId}">
        <input type="hidden" name="employeeIdForCertification" value="${employeeId}">
      </div>
      
      <div class="qualifications-sections">
        <!-- 資格セクション -->
        <div class="qualification-section">
          <div class="section-header">
            <h5><i class="fas fa-certificate"></i> 保有資格</h5>
            <button id="addEmployeeQualificationBtn" class="btn btn-primary btn-sm">
              <i class="fas fa-plus"></i> 資格追加
            </button>
          </div>
          <div class="qualifications-list">
            ${this.renderQualificationsList(qualifications)}
          </div>
        </div>
        
        <!-- 作業認定セクション -->
        <div class="certification-section">
          <div class="section-header">
            <h5><i class="fas fa-tools"></i> 作業認定</h5>
            <button id="addEmployeeCertificationBtn" class="btn btn-primary btn-sm">
              <i class="fas fa-plus"></i> 認定追加
            </button>
          </div>
          <div class="certifications-list">
            ${this.renderCertificationsList(certifications)}
          </div>
        </div>
      </div>
    `;
    
    contentContainer.innerHTML = content;
  }

  /**
   * 社員の資格リストをレンダリング
   * @param {Array} qualifications 資格配列
   * @returns {string} HTML文字列
   */
  renderQualificationsList(qualifications) {
    if (!qualifications || qualifications.length === 0) {
      return '<div class="empty-message">登録されている資格がありません。</div>';
    }
    
    // 取得日順でソート
    const sortedQualifications = [...qualifications].sort((a, b) => 
      new Date(b.dateAcquired) - new Date(a.dateAcquired)
    );
    
    return sortedQualifications.map(qualification => {
      const qualInfo = this.appData.getQualifications().find(q => q.id === qualification.qualificationId);
      const qualName = qualInfo ? qualInfo.name : '不明な資格';
      
      // 有効期限の状態を判定
      let statusBadge = '<span class="badge status-valid">有効</span>';
      if (qualification.expiryDate) {
        const expiryDate = new Date(qualification.expiryDate);
        const today = new Date();
        const remainingDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (remainingDays < 0) {
          statusBadge = '<span class="badge status-expired">期限切れ</span>';
        } else if (remainingDays <= 90) {
          statusBadge = `<span class="badge status-warning">あと${remainingDays}日</span>`;
        }
      }
      
      return `
        <div class="qualification-item" data-qualification-id="${qualification.id}">
          <div class="qualification-info">
            <div class="qualification-name">${qualName}</div>
            <div class="qualification-details">
              <span>取得日: ${this.formatDate(qualification.dateAcquired)}</span>
              <span>有効期限: ${qualification.expiryDate ? this.formatDate(qualification.expiryDate) : '無期限'}</span>
              ${statusBadge}
            </div>
          </div>
          <div class="qualification-actions">
            <button class="btn btn-table-action edit" onclick="window.hrApp.certificationManager.showAssignQualificationModal(${qualification.employeeId}, ${qualification.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-table-action delete" onclick="window.hrApp.certificationManager.deleteEmployeeQualification(${qualification.id}, '${qualName}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 社員資格セクションのイベントリスナー設定
   */
  setupEmployeeQualificationEvents(employeeId) {
    // 資格追加ボタン
    const addQualBtn = document.getElementById('addEmployeeQualificationBtn');
    if (addQualBtn) {
      addQualBtn.addEventListener('click', () => {
        this.showAssignQualificationModal(employeeId);
      });
    }
    
    // 作業認定追加ボタン
    const addCertBtn = document.getElementById('addEmployeeCertificationBtn');
    if (addCertBtn) {
      addCertBtn.addEventListener('click', () => {
        this.showAssignCertificationModal(employeeId);
      });
    }
    
    // 資格編集ボタン（イベント委任）
    document.querySelector('.qualification-list')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-qualification');
      if (editBtn) {
        const qualId = editBtn.getAttribute('data-id');
        this.editEmployeeQualification(qualId);
      }
      
      const deleteBtn = e.target.closest('.delete-qualification');
      if (deleteBtn) {
        const qualId = deleteBtn.getAttribute('data-id');
        this.deleteEmployeeQualification(qualId, employeeId);
      }
    });
    
    // 認定編集ボタン（イベント委任）
    document.querySelector('.certification-list')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-certification');
      if (editBtn) {
        const certId = editBtn.getAttribute('data-id');
        this.editEmployeeCertification(certId);
      }
      
      const deleteBtn = e.target.closest('.delete-certification');
      if (deleteBtn) {
        const certId = deleteBtn.getAttribute('data-id');
        this.deleteEmployeeCertification(certId, employeeId);
      }
    });
  }
  
  /**
   * 資格割り当てモーダルの表示
   */
  showAssignQualificationModal(employeeId, qualificationAssignmentId = null) {
    // モーダル要素の参照取得
    const modal = document.getElementById('assignQualificationModal');
    const modalTitle = document.getElementById('assignQualificationModalTitle');
    const employeeIdField = document.getElementById('assignQualificationEmployeeId');
    const assignmentIdField = document.getElementById('assignQualificationId');
    const selectQualification = document.getElementById('selectQualification');
    const acquiredDateField = document.getElementById('qualificationAcquiredDate');
    const expiryDateField = document.getElementById('qualificationExpiryDate');
    const notesField = document.getElementById('qualificationAssignmentNotes');
    
    if (!modal || !employeeIdField || !selectQualification) return;
    
    // 既存の割り当てを編集する場合
    if (qualificationAssignmentId) {
      const assignment = this.appData.getEmployeeQualificationById(qualificationAssignmentId);
      if (assignment) {
        modalTitle.innerHTML = '<i class="fas fa-certificate"></i> 資格の編集';
        employeeIdField.value = assignment.employeeId;
        assignmentIdField.value = assignment.id;
        acquiredDateField.value = assignment.acquiredDate;
        expiryDateField.value = assignment.expiryDate || '';
        notesField.value = assignment.notes || '';
        
        // 後で選択項目を設定するため保存
        setTimeout(() => {
          selectQualification.value = assignment.qualificationId;
        }, 10);
      } else {
        this.appUI.showNotification('error', '資格情報が見つかりません');
        return;
      }
    } else {
      // 新規追加の場合
      modalTitle.innerHTML = '<i class="fas fa-certificate"></i> 資格の割り当て';
      employeeIdField.value = employeeId;
      assignmentIdField.value = '';
      
      // デフォルトの日付を設定
      const today = new Date().toISOString().split('T')[0];
      acquiredDateField.value = today;
      expiryDateField.value = '';
      notesField.value = '';
    }
    
    // 資格選択肢を設定
    this.populateQualificationSelect(selectQualification);
    
    // モーダルを表示
    this.appUI.showModal('assignQualificationModal');
    
    // 保存ボタンのイベントリスナー
    const saveBtn = document.getElementById('saveAssignQualificationBtn');
    if (saveBtn) {
      // 既存のイベントリスナーを削除
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      
      // 新しいイベントリスナーを追加
      newSaveBtn.addEventListener('click', () => {
        this.saveAssignQualification();
      });
    }
    
    // キャンセルボタンのイベントリスナー
    const cancelBtn = document.getElementById('cancelAssignQualificationBtn');
    if (cancelBtn) {
      // 既存のイベントリスナーを削除
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // 新しいイベントリスナーを追加
      newCancelBtn.addEventListener('click', () => {
        this.appUI.hideModal('assignQualificationModal');
      });
    }
    
    // 資格選択時の有効期間自動計算
    selectQualification.addEventListener('change', () => {
      this.updateQualificationExpiryDate();
    });
    
    acquiredDateField.addEventListener('change', () => {
      this.updateQualificationExpiryDate();
    });
  }


    /**
     * 日付のフォーマット
     * @param {string} dateStr 日付文字列
     * @returns {string} フォーマットされた日付
     */
    formatDate(dateStr) {
      if (!dateStr) return '-';
      
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}/${month}/${day}`;
      } catch (e) {
        return dateStr;
      }
    }
  
  /**
   * 作業認定割り当てモーダルの表示
   */
  showAssignCertificationModal(employeeId, certificationAssignmentId = null) {
    // モーダル要素の参照取得
    const modal = document.getElementById('assignCertificationModal');
    const modalTitle = document.getElementById('assignCertificationModalTitle');
    const employeeIdField = document.getElementById('assignCertificationEmployeeId');
    const assignmentIdField = document.getElementById('assignCertificationId');
    const selectCertification = document.getElementById('selectCertification');
    const acquiredDateField = document.getElementById('certificationAcquiredDate');
    const expiryDateField = document.getElementById('certificationExpiryDate');
    const notesField = document.getElementById('certificationAssignmentNotes');
    
    if (!modal || !employeeIdField || !selectCertification) return;
    
    // 既存の割り当てを編集する場合
    if (certificationAssignmentId) {
      const assignment = this.appData.getEmployeeCertificationById(certificationAssignmentId);
      if (assignment) {
        modalTitle.innerHTML = '<i class="fas fa-tools"></i> 作業認定の編集';
        employeeIdField.value = assignment.employeeId;
        assignmentIdField.value = assignment.id;
        acquiredDateField.value = assignment.acquiredDate;
        expiryDateField.value = assignment.expiryDate || '';
        notesField.value = assignment.notes || '';
        
        // 後で選択項目を設定するため保存
        setTimeout(() => {
          selectCertification.value = assignment.certificationId;
        }, 10);
      } else {
        this.appUI.showNotification('error', '認定情報が見つかりません');
        return;
      }
    } else {
      // 新規追加の場合
      modalTitle.innerHTML = '<i class="fas fa-tools"></i> 作業認定の割り当て';
      employeeIdField.value = employeeId;
      assignmentIdField.value = '';
      
      // デフォルトの日付を設定
      const today = new Date().toISOString().split('T')[0];
      acquiredDateField.value = today;
      expiryDateField.value = '';
      notesField.value = '';
    }
    
    // 作業認定選択肢を設定
    this.populateCertificationSelect(selectCertification);
    
    // モーダルを表示
    this.appUI.showModal('assignCertificationModal');
    
    // 保存ボタンのイベントリスナー
    const saveBtn = document.getElementById('saveAssignCertificationBtn');
    if (saveBtn) {
      // 既存のイベントリスナーを削除
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      
      // 新しいイベントリスナーを追加
      newSaveBtn.addEventListener('click', () => {
        this.saveAssignCertification();
      });
    }
    
    // キャンセルボタンのイベントリスナー
    const cancelBtn = document.getElementById('cancelAssignCertificationBtn');
    if (cancelBtn) {
      // 既存のイベントリスナーを削除
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // 新しいイベントリスナーを追加
      newCancelBtn.addEventListener('click', () => {
        this.appUI.hideModal('assignCertificationModal');
      });
    }
    
    // 認定選択時の有効期間自動計算
    selectCertification.addEventListener('change', () => {
      this.updateCertificationExpiryDate();
    });
    
    acquiredDateField.addEventListener('change', () => {
      this.updateCertificationExpiryDate();
    });
  }
  
  /**
   * 資格選択肢の設定
   */
  populateQualificationSelect(selectElement) {
    if (!selectElement) return;
    
    // DOMフラグメントを使用
    const fragment = document.createDocumentFragment();
    
    // デフォルトオプション
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '資格を選択してください';
    fragment.appendChild(defaultOption);
    
    // 資格オプション
    const qualifications = this.appData.getQualifications();
    qualifications.sort((a, b) => a.name.localeCompare(b.name, 'ja')).forEach(qual => {
      const option = document.createElement('option');
      option.value = qual.id;
      option.textContent = qual.name;
      fragment.appendChild(option);
    });
    
    // 一度のDOM操作で更新
    selectElement.innerHTML = '';
    selectElement.appendChild(fragment);
  }
  
  /**
   * 作業認定選択肢の設定
   */
  populateCertificationSelect(selectElement) {
    if (!selectElement) return;
    
    // DOMフラグメントを使用
    const fragment = document.createDocumentFragment();
    
    // デフォルトオプション
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '作業認定を選択してください';
    fragment.appendChild(defaultOption);
    
    // 作業認定オプション
    const certifications = this.appData.getWorkCertifications();
    certifications.sort((a, b) => a.name.localeCompare(b.name, 'ja')).forEach(cert => {
      const option = document.createElement('option');
      option.value = cert.id;
      option.textContent = cert.name;
      fragment.appendChild(option);
    });
    
    // 一度のDOM操作で更新
    selectElement.innerHTML = '';
    selectElement.appendChild(fragment);
  }
  
  /**
   * 資格有効期限の自動計算
   */
  updateQualificationExpiryDate() {
    const qualificationId = document.getElementById('selectQualification').value;
    const acquiredDate = document.getElementById('qualificationAcquiredDate').value;
    const expiryDateField = document.getElementById('qualificationExpiryDate');
    
    if (!qualificationId || !acquiredDate || !expiryDateField) return;
    
    const qualification = this.appData.getQualification(qualificationId);
    if (qualification && qualification.validMonths && parseInt(qualification.validMonths) > 0) {
      expiryDateField.value = this.settingsUI.calculateExpiryDate(acquiredDate, parseInt(qualification.validMonths));
    } else {
      expiryDateField.value = ''; // 無期限
    }
  }
  
  /**
   * 作業認定有効期限の自動計算
   */
  updateCertificationExpiryDate() {
    const certificationId = document.getElementById('selectCertification').value;
    const acquiredDate = document.getElementById('certificationAcquiredDate').value;
    const expiryDateField = document.getElementById('certificationExpiryDate');
    
    if (!certificationId || !acquiredDate || !expiryDateField) return;
    
    const certification = this.appData.getWorkCertification(certificationId);
    if (certification && certification.validMonths && parseInt(certification.validMonths) > 0) {
      expiryDateField.value = this.settingsUI.calculateExpiryDate(acquiredDate, parseInt(certification.validMonths));
    } else {
      expiryDateField.value = ''; // 無期限
    }
  }

  
  /**
   * 社員資格の編集
   */
  editEmployeeQualification(qualificationAssignmentId) {
    const qualAssignment = this.appData.getEmployeeQualificationById(qualificationAssignmentId);
    if (!qualAssignment) {
      this.appUI.showNotification('error', '資格情報が見つかりません');
      return;
    }
    
    this.showAssignQualificationModal(qualAssignment.employeeId, qualificationAssignmentId);
  }
  
  /**
   * 社員認定の編集
   */
  editEmployeeCertification(certificationAssignmentId) {
    const certAssignment = this.appData.getEmployeeCertificationById(certificationAssignmentId);
    if (!certAssignment) {
      this.appUI.showNotification('error', '認定情報が見つかりません');
      return;
    }
    
    this.showAssignCertificationModal(certAssignment.employeeId, certificationAssignmentId);
  }
  
  /**
   * 社員資格の削除
   */
  deleteEmployeeQualification(qualificationAssignmentId, employeeId) {
    const qualAssignment = this.appData.getEmployeeQualificationById(qualificationAssignmentId);
    if (!qualAssignment) {
      this.appUI.showNotification('error', '資格情報が見つかりません');
      return;
    }
    
    const qualification = this.appData.getQualification(qualAssignment.qualificationId);
    const qualName = qualification ? qualification.name : '不明の資格';
    
    if (confirm(`「${qualName}」の資格登録を削除しますか？この操作は元に戻せません。`)) {
      const success = this.appData.deleteEmployeeQualification(qualificationAssignmentId);
      if (success) {
        this.appUI.showNotification('success', '資格登録を削除しました');
        this.loadEmployeeQualifications(employeeId);
      } else {
        this.appUI.showNotification('error', '削除に失敗しました');
      }
    }
  }
  
  /**
   * 社員認定の削除
   */
  deleteEmployeeCertification(certificationAssignmentId, employeeId) {
    const certAssignment = this.appData.getEmployeeCertificationById(certificationAssignmentId);
    if (!certAssignment) {
      this.appUI.showNotification('error', '認定情報が見つかりません');
      return;
    }
    
    const certification = this.appData.getWorkCertification(certAssignment.certificationId);
    const certName = certification ? certification.name : '不明の認定';
    
    if (confirm(`「${certName}」の作業認定登録を削除しますか？この操作は元に戻せません。`)) {
      const success = this.appData.deleteEmployeeCertification(certificationAssignmentId);
      if (success) {
        this.appUI.showNotification('success', '作業認定登録を削除しました');
        this.loadEmployeeQualifications(employeeId);
      } else {
        this.appUI.showNotification('error', '削除に失敗しました');
      }
    }
  }
  
  /**
   * 資格割り当ての保存
   */
  saveAssignQualification() {
    const form = document.getElementById('assignQualificationForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      return;
    }
    
    const employeeId = document.getElementById('assignQualificationEmployeeId').value;
    const qualificationId = document.getElementById('selectQualification').value;
    const acquiredDate = document.getElementById('qualificationAcquiredDate').value;
    const expiryDate = document.getElementById('qualificationExpiryDate').value || null;
    const notes = document.getElementById('qualificationAssignmentNotes').value.trim() || null;
    
    const assignmentId = document.getElementById('assignQualificationId').value || null;
    
    const employee = this.appData.getEmployee(employeeId);
    const qualification = this.appData.getQualification(qualificationId);
    
    if (!employee || !qualification) {
      this.appUI.showNotification('error', '入力エラー', '社員または資格が見つかりません。');
      return;
    }
    
    try {
      let success = false;
      let message = '';
      
      const assignmentData = {
        employeeId,
        qualificationId,
        acquiredDate,
        expiryDate,
        notes
      };
      
      if (assignmentId) { // 更新
        assignmentData.id = assignmentId;
        success = this.appData.updateEmployeeQualification(assignmentData);
        message = success ? `${employee.name}さんの資格「${qualification.name}」を更新しました` : "更新対象が見つかりません";
      } else { // 新規追加
        // 同じ資格の重複チェック
        const existingAssignment = this.appData.getEmployeeQualifications(employeeId).find(q => q.qualificationId === qualificationId);
        if (existingAssignment) {
          this.appUI.showNotification('warning', '重複エラー', `${employee.name}さんは既に資格「${qualification.name}」を登録済みです。`);
          return;
        }
        
        const newId = this.appData.addEmployeeQualification(assignmentData);
        success = !!newId;
        message = success ? `${employee.name}さんに資格「${qualification.name}」を登録しました` : "資格割り当て失敗";
      }
      
      if (success) {
        this.appUI.hideModal('assignQualificationModal');
        this.loadEmployeeQualifications(employeeId);
        this.appUI.showNotification('success', '保存完了', message);
      } else {
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error assigning qualification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
  }
  
  /**
   * 作業認定割り当ての保存
   */
  saveAssignCertification() {
    const form = document.getElementById('assignCertificationForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      this.appUI.showNotification('error', '入力エラー', '必須項目を確認してください。');
      return;
    }
    
    const employeeId = document.getElementById('assignCertificationEmployeeId').value;
    const certificationId = document.getElementById('selectCertification').value;
    const acquiredDate = document.getElementById('certificationAcquiredDate').value;
    const expiryDate = document.getElementById('certificationExpiryDate').value || null;
    const notes = document.getElementById('certificationAssignmentNotes').value.trim() || null;
    
    const assignmentId = document.getElementById('assignCertificationId').value || null;
    
    const employee = this.appData.getEmployee(employeeId);
    const certification = this.appData.getWorkCertification(certificationId);
    
    if (!employee || !certification) {
      this.appUI.showNotification('error', '入力エラー', '社員または作業認定が見つかりません。');
      return;
    }
    
    try {
      let success = false;
      let message = '';
      
      const assignmentData = {
        employeeId,
        certificationId,
        acquiredDate,
        expiryDate,
        notes
      };
      
      if (assignmentId) { // 更新
        assignmentData.id = assignmentId;
        success = this.appData.updateEmployeeCertification(assignmentData);
        message = success ? `${employee.name}さんの作業認定「${certification.name}」を更新しました` : "更新対象が見つかりません";
      } else { // 新規追加
        // 同じ作業認定の重複チェック
        const existingAssignment = this.appData.getEmployeeWorkCertifications(employeeId).find(c => c.certificationId === certificationId);
        if (existingAssignment) {
          this.appUI.showNotification('warning', '重複エラー', `${employee.name}さんは既に作業認定「${certification.name}」を登録済みです。`);
          return;
        }
        
        const newId = this.appData.addEmployeeCertification(assignmentData);
        success = !!newId;
        message = success ? `${employee.name}さんに作業認定「${certification.name}」を登録しました` : "作業認定割り当て失敗";
      }
      
      if (success) {
        this.appUI.hideModal('assignCertificationModal');
        this.loadEmployeeQualifications(employeeId);
        this.appUI.showNotification('success', '保存完了', message);
      } else {
        this.appUI.showNotification('error', '保存エラー', message);
      }
    } catch (error) {
      console.error("Error assigning certification:", error);
      this.appUI.showNotification('error', '保存エラー', error.message);
    }
  }
}