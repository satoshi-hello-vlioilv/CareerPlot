/**
 * 統合設定モジュール - UI操作クラス
 * SettingsManager UIの共通操作を管理するクラス
 */
class SettingsUI {
  constructor(settingsCore) {
    this.core = settingsCore;
    this.appUI = settingsCore.appUI;
    this.appData = settingsCore.appData;
  }
  
  /**
   * アコーディオン切り替えの改善
   */
  toggleAccordionSection(section) {
    if (!section) {
      console.warn('アコーディオンセクションが見つかりません');
      return;
    }
     
    // 既存のアクティブなアコーディオンがあれば閉じる
    if (this.core.activeAccordion && this.core.activeAccordion !== section) {
      // 閉じるアニメーション - CSSトランジションに任せる
      this.core.activeAccordion.classList.remove('active');
      const oldContent = this.core.activeAccordion.querySelector('.accordion-content');
      if (oldContent) {
        oldContent.style.height = '0';
        oldContent.style.opacity = '0';
        oldContent.style.visibility = 'hidden';
      }
    }
    
    const content = section.querySelector('.accordion-content');
    const icon = section.querySelector('.accordion-icon');
    
    if (!content || !icon) {
      console.warn('コンテンツまたはアイコンが見つかりません', section);
      return;
    }
    
    if (section.classList.contains('active')) {
      // 閉じるアニメーション
      section.classList.remove('active');
      icon.style.transform = 'rotate(0deg)';
      content.style.height = '0';
      content.style.opacity = '0';
      content.style.visibility = 'hidden';
      this.core.activeAccordion = null;
    } else {
      // 開くアニメーション
      section.classList.add('active');
      this.core.activeAccordion = section;
      
      // コンテンツを表示状態に
      content.style.visibility = 'visible';
      content.style.opacity = '1';
      icon.style.transform = 'rotate(180deg)';
      
      // 高さを自動調整（パフォーマンス最適化のためrequestAnimationFrameを使用）
      requestAnimationFrame(() => {
        const height = content.scrollHeight;
        content.style.height = `${height}px`;
        
        // 現在のナビゲーションアイテムにスクロール
        const currentNavItem = section.querySelector(`.settings-nav-item[data-section="${this.core.currentSection}"]`);
        if (currentNavItem) {
          setTimeout(() => {
            currentNavItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      });
    }
  }
  
  /**
   * タブ切り替え（最適化版）
   */
  switchEvalTab(tabId) {
    // タブボタンとコンテンツの参照をキャッシュ
    const tabButtons = document.querySelectorAll('.eval-tab-btn');
    const tabContents = document.querySelectorAll('.eval-tab-content');
    
    // 不要なDOM操作を減らすためのフラグ
    let needsUpdate = false;
    
    // タブボタンのアクティブ状態を更新
    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-eval-tab') === tabId;
      if (btn.classList.contains('active') !== isActive) {
        needsUpdate = true;
        btn.classList.toggle('active', isActive);
      }
    });
    
    // タブコンテンツの表示/非表示を切り替え
    tabContents.forEach(content => {
      const isActive = content.id === `${tabId}-tab`;
      if (content.classList.contains('active') !== isActive) {
        needsUpdate = true;
        content.classList.toggle('active', isActive);
      }
    });
    
    // 変更があった場合のみ波紋エフェクトを追加
    if (needsUpdate) {
      const activeBtn = document.querySelector(`.eval-tab-btn[data-eval-tab="${tabId}"]`);
      if (activeBtn) this.addRippleEffect(activeBtn);
    }
  }

  /**
   * 波紋エフェクト追加
   */
  addRippleEffect(element) {
    if (!element) return;
    
    // 既存の波紋要素を削除
    element.querySelectorAll('.ripple').forEach(ripple => ripple.remove());
    
    // ボタンの位置とサイズを取得
    const rect = element.getBoundingClientRect();
    
    // 波紋の直径を計算（ボタンの対角線長）
    const diameter = Math.max(rect.width, rect.height) * 2;
    
    // 新しい波紋要素を作成
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.width = ripple.style.height = `${diameter}px`;
    
    // 波紋の位置を中央に
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.transform = 'translate(-50%, -50%) scale(0)';
    
    // 要素に波紋を追加
    element.appendChild(ripple);
    
    // アニメーション（CSSトランジションを使用）
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(1)';
      ripple.style.opacity = '0';
      
      // アニメーション終了後に波紋要素を削除
      setTimeout(() => ripple.remove(), 600);
    });
  }

  /**
   * ローディング状態表示
   */
  showLoadingState() {
    const contentArea = document.querySelector('.settings-content');
    if (!contentArea) return;
    
    const loader = document.createElement('div');
    loader.className = 'settings-loader';
    loader.innerHTML = `
      <div class="spinner"></div>
      <p>設定データを読み込み中...</p>
    `;
    
    contentArea.appendChild(loader);
  }
  
  /**
   * ローディング状態非表示
   */
  hideLoadingState() {
    const loader = document.querySelector('.settings-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 300);
    }
  }

  /**
   * アコーディオンセクションの初期化
   */
  setupInitialAccordionState() {
    // すべてのアコーディオンを閉じた状態に
    document.querySelectorAll('.accordion-section').forEach(section => {
      section.classList.remove('active');
      const content = section.querySelector('.accordion-content');
      const icon = section.querySelector('.accordion-icon');
      
      if (content) {
        content.style.height = '0';
        content.style.opacity = '0';
        content.style.visibility = 'hidden';
      }
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
      }
    });
    
    // 現在のセクションが含まれるアコーディオンを開く
    const currentNavItem = document.querySelector(`.settings-nav-item[data-section="${this.core.currentSection}"]`);
    if (currentNavItem) {
      const accordionSection = currentNavItem.closest('.accordion-section');
      if (accordionSection) {
        // アニメーションを適用
        setTimeout(() => {
          this.toggleAccordionSection(accordionSection);
        }, 50);
      }
    }
  }
  
  /**
   * 日付のフォーマット
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Invalid date
      
      // yyyy/mm/dd形式
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  }
  
  /**
   * ファイルサイズのフォーマット
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 有効期限を計算
   */
  calculateExpiryDate(startDateStr, validMonths) {
    if (!startDateStr || !validMonths || validMonths <= 0) return null;
    
    try {
      const startDate = new Date(startDateStr);
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + validMonths);
      
      return expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
    } catch (e) {
      console.error("Error calculating expiry date:", e);
      return null;
    }
  }
}