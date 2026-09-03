/**
 * UI管理 - 人事評定視覚化アプリケーション
 * UI全体を管理するコアクラス
 * モーダル、通知、UI状態、表示制御など
 */
class UIManager {
    /**
     * UIManagerコンストラクタ
     * @param {Object} appController アプリケーションコントローラ
     */
    constructor(appController) {
        this.appController = appController;
        this.appData = appController.appData;
        this.appUICharts = null; // App.jsの初期化時に設定される
        this.uiForms = null; // App.jsの初期化時に設定される
        
        // UI状態の初期化
        this.activeModals = new Set(); // 表示中のモーダルトラッキング
        this.notificationTimeout = null; // 通知表示タイマー参照
    }

    /**
     * UI全体の初期化
     */
    initializeUI() {
        // フィルターセクションの初期化
        this.initializeFilterSections();
        
        // 年齢範囲スライダーの初期化
        this.initializeAgeRangeSlider();
        
        // 勤続年数範囲スライダーの初期化
        this.initializeTenureRangeSlider();
        
        // モーダルの初期化
        this.initializeModals();
        
        // メニューの初期化
        this.initializeMenu();
        
        // インポート/エクスポート機能の初期化
        this.initializeImportExport();
    }

    /**
     * ビューに応じたツールバーオプションの表示切替
     * @param {string} view 表示ビュー名
     */
    toggleToolbarOptionsForView(view) {
        const ageRangeSlider = document.querySelector('.age-range-slider-container');
        const tenureRangeSlider = document.querySelector('.tenure-range-slider-container');
        
        // 昇給分析専用オプションの表示制御
        const salaryOptions = document.querySelectorAll('.salary-comparison-options');
        salaryOptions.forEach(opt => {
            opt.style.display = (view === 'salary-comparison') ? 'flex' : 'none';
        });
        
        // チャートタイプに応じたスライダーの表示・非表示制御は別処理
        // ここでは視覚化タイプに応じた項目の表示切替のみ行う
        
        if (view === 'chart' || view === 'department' || view === 'team' || view === 'salary-comparison') {
            // 共通の表示項目
            document.getElementById('chartTypeSelect')?.removeAttribute('disabled');
            document.getElementById('sortOrderSelect')?.removeAttribute('disabled');
            
            // 昇給比較の場合、セレクトボックスの選択肢を制御する
            const chartTypeSelect = document.getElementById('chartTypeSelect');
            if (chartTypeSelect) {
                if (view === 'salary-comparison') {
                    Array.from(chartTypeSelect.options).forEach(opt => {
                        // 昇給比較は「年齢」か「勤続年数」のみに限定
                        if (opt.value === 'grade' || opt.value === 'year') {
                            opt.disabled = true;
                            opt.style.display = 'none';
                        } else {
                            opt.disabled = false;
                            opt.style.display = '';
                        }
                    });
                } else {
                    Array.from(chartTypeSelect.options).forEach(opt => {
                        opt.disabled = false;
                        opt.style.display = '';
                    });
                }
            }
        } else if (view === 'career-path') {
            // キャリアパス分析では年齢軸固定
            document.getElementById('chartTypeSelect')?.setAttribute('disabled', 'disabled');
            document.getElementById('sortOrderSelect')?.removeAttribute('disabled');
            // 年齢スライダーは表示
            this.toggleAgeRangeSliderVisibility(true);
            this.toggleTenureRangeSliderVisibility(false);
        } else {
            // それ以外のビューでは表示形式と表示順序を無効化
            document.getElementById('chartTypeSelect')?.setAttribute('disabled', 'disabled');
            document.getElementById('sortOrderSelect')?.setAttribute('disabled', 'disabled');
        }
    }
    
    /**
     * 年齢範囲スライダーの表示/非表示切替
     * @param {boolean} visible 表示する場合はtrue
     */
    toggleAgeRangeSliderVisibility(visible) {
        const container = document.querySelector('.age-range-slider-container');
        if (container) {
            container.style.display = visible ? 'flex' : 'none';
        }
    }
    
    /**
     * 勤続年数範囲スライダーの表示/非表示切替
     * @param {boolean} visible 表示する場合はtrue
     */
    toggleTenureRangeSliderVisibility(visible) {
        const container = document.querySelector('.tenure-range-slider-container');
        if (container) {
            container.style.display = visible ? 'flex' : 'none';
        }
    }

    /**
     * モーダルの表示
     * @param {string} modalId モーダルのID
     * @returns {boolean} モーダル表示成功の場合true
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        modal.classList.add('visible');
        this.activeModals.add(modalId);

        // 先頭のフォーム要素にフォーカス
        const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100); // レンダリング完了を待つため少し遅延
        }
        
        // ESCキーでモーダルを閉じるイベント追加
        document.addEventListener('keydown', this.handleEscapeKey);
        
        return true; // 表示成功
    }
    
    /**
     * モーダルの非表示
     * @param {string} modalId モーダルのID
     * @returns {boolean} モーダル非表示成功の場合true
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        modal.classList.remove('visible');
        this.activeModals.delete(modalId);
        
        // アクティブなモーダルがなくなったらESCキーイベントを削除
        if (this.activeModals.size === 0) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
        
        return true; // 非表示成功
    }
    
    /**
     * モーダル内タブを有効化
     * @param {string} tabId タブID
     * @param {HTMLElement} modalBodyElement モーダル本体要素
     * @returns {boolean} タブ切替成功の場合true
     */
    activateTab(tabId, modalBodyElement) {
        if (!modalBodyElement) return false;
        
        // このモーダル内のすべてのタブコンテンツを非表示
        const tabContents = modalBodyElement.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // すべてのタブボタンを非アクティブ化
        const tabButtons = modalBodyElement.closest('.modal').querySelectorAll('.tab');
        tabButtons.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 指定されたタブとコンテンツをアクティブ化
        const selectedTab = modalBodyElement.closest('.modal').querySelector(`.tab[data-tab="${tabId}"]`);
        const selectedContent = modalBodyElement.querySelector(`#${tabId}-tab`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            return true;
        }
        
        return false;
    }
    
    /**
     * モーダル共通のESCキーハンドラー
     */
    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.activeModals.size > 0) {
            // 最後に開いたモーダルを取得 (Setは挿入順を維持)
            const lastModalId = Array.from(this.activeModals).pop();
            this.hideModal(lastModalId);
        }
    }
    
    /**
     * 通知を表示
     * @param {string} type 通知タイプ (success/error/warning/info)
     * @param {string} title 通知タイトル
     * @param {string} message 通知メッセージ
     * @param {number} duration 表示時間（ミリ秒）
     */
    showNotification(type = 'success', title = '完了', message = '', duration = 3000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        // 通知タイプに応じたクラスを設定
        notification.className = 'notification'; // クラスをリセット
        notification.classList.add(`notification-${type}`);
        
        // 通知内容を設定
        const titleElement = notification.querySelector('.notification-title');
        const messageElement = notification.querySelector('.notification-message');
        const iconElement = notification.querySelector('.notification-icon i');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // タイプに応じたアイコンを設定
        if (iconElement) {
            iconElement.className = ''; // クラスをリセット
            switch (type) {
                case 'success': iconElement.className = 'fas fa-check-circle'; break;
                case 'error': iconElement.className = 'fas fa-times-circle'; break;
                case 'warning': iconElement.className = 'fas fa-exclamation-triangle'; break;
                case 'info': iconElement.className = 'fas fa-info-circle'; break;
                default: iconElement.className = 'fas fa-bell';
            }
        }
        
        // 通知を表示
        notification.classList.remove('hidden');
        
        // 既存のタイムアウトをクリア
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // 通知を自動的に非表示にするタイマー設定
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
            this.notificationTimeout = null;
        }, duration);
        
        // 閉じるボタンのクリックハンドラを追加
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                notification.classList.add('hidden');
                if (this.notificationTimeout) {
                    clearTimeout(this.notificationTimeout);
                    this.notificationTimeout = null;
                }
            };
        }
    }

    /**
     * フィルターセクションの初期化
     */
    initializeFilterSections() {
        // フィルターセクションのトグル動作追加
        document.querySelectorAll('.filter-section h3').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.filter-section');
                section.classList.toggle('collapsed');
                // FontAwesomeアイコンの方向も動的に変更
                const icon = header.querySelector('.fa-chevron-right, .fa-chevron-down');
                if (icon) {
                    icon.classList.toggle('fa-chevron-right');
                    icon.classList.toggle('fa-chevron-down');
                }
            });
        });
        
        // サイドバーの折りたたみボタン
        const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
        if (sidebarCollapseBtn) {
            sidebarCollapseBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                    // ボタンのアイコンを反転
                    const icon = sidebarCollapseBtn.querySelector('i');
                    if (icon) {
                        if (sidebar.classList.contains('collapsed')) {
                            icon.classList.remove('fa-chevron-left');
                            icon.classList.add('fa-chevron-right');
                        } else {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-left');
                        }
                    }
                }
            });
        }
        
        // サイドバーにフォーカスするボタン
        const focusEmployeeListBtn = document.getElementById('focusEmployeeListBtn');
        if (focusEmployeeListBtn) {
            focusEmployeeListBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                const employeeList = document.querySelector('.employee-select-list');
                if (sidebar && employeeList) {
                    sidebar.classList.remove('collapsed');
                    employeeList.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    /**
     * 年齢範囲スライダーの初期化
     */
    initializeAgeRangeSlider() {
        const minThumb = document.getElementById('minThumb');
        const maxThumb = document.getElementById('maxThumb');
        const minValue = document.getElementById('minValue');
        const maxValue = document.getElementById('maxValue');
        const track = document.querySelector('.age-range-slider-container .double-slider-track');
        const range = document.querySelector('.age-range-slider-container .double-slider-range');
        
        if (!minThumb || !maxThumb || !minValue || !maxValue || !track || !range) return;
        
        const min = 18; // 最小年齢
        const max = 65; // 最大年齢
        
        // コントローラーから初期値を設定（またはデフォルト値）
        const initialMinVal = this.appController.displayOptions.ageRange.min || min;
        const initialMaxVal = this.appController.displayOptions.ageRange.max || max;
        
        // 表示値を更新
        minValue.textContent = initialMinVal;
        maxValue.textContent = initialMaxVal;
        
        // 初期位置を設定
        updatePositions(initialMinVal, initialMaxVal);
        
        // スライダー操作中のテキスト選択を防止
        minThumb.addEventListener('dragstart', preventDefault);
        maxThumb.addEventListener('dragstart', preventDefault);
        
        // マウスとタッチイベントのリスナー
        minThumb.addEventListener('mousedown', e => handleThumbDrag(e, minThumb, true));
        maxThumb.addEventListener('mousedown', e => handleThumbDrag(e, maxThumb, false));
        minThumb.addEventListener('touchstart', e => handleThumbDrag(e, minThumb, true));
        maxThumb.addEventListener('touchstart', e => handleThumbDrag(e, maxThumb, false));
        
        function preventDefault(e) {
            e.preventDefault();
            return false;
        }
        
        function handleThumbDrag(e, thumb, isMin) {
            // デフォルト動作を防止（ページスクロールなど）
            e.preventDefault();
            
            // パーセンテージ計算用のトラック範囲を取得
            const trackRect = track.getBoundingClientRect();
            
            // タッチ使用時はタッチ識別子を保存
            const touchId = e.changedTouches ? e.changedTouches[0].identifier : null;
            
            // マウスまたはタッチに適したリスナーを定義
            const moveListener = touchId !== null ? 'touchmove' : 'mousemove';
            const endListener = touchId !== null ? 'touchend' : 'mouseup';
            
            // 現在位置を追跡
            let currentMin = parseInt(minValue.textContent);
            let currentMax = parseInt(maxValue.textContent);
            
            function onMove(moveEvent) {
                let clientX;
                
                // タッチとマウスイベントを処理
                if (touchId !== null) {
                    // 保存した識別子に一致するタッチを検索
                    for (let i = 0; i < moveEvent.changedTouches.length; i++) {
                        if (moveEvent.changedTouches[i].identifier === touchId) {
                            clientX = moveEvent.changedTouches[i].clientX;
                            break;
                        }
                    }
                    if (clientX === undefined) return; // タッチが見つからない
                } else {
                    clientX = moveEvent.clientX;
                }
                
                // トラック内のパーセンテージ位置を計算
                let percentage = (clientX - trackRect.left) / trackRect.width;
                percentage = Math.min(1, Math.max(0, percentage)); // 0-1に制限
                
                // 値の範囲（min-max）に変換
                let value = Math.round(min + percentage * (max - min));
                
                // 制約付きで適切な値を更新
                if (isMin) {
                    value = Math.min(value, currentMax - 1); // 最小値は最大値未満
                    currentMin = value;
                } else {
                    value = Math.max(value, currentMin + 1); // 最大値は最小値より大きい
                    currentMax = value;
                }
                
                // UI更新
                updatePositions(currentMin, currentMax);
                
                // ドラッグ中の値をレンダリング用に要素に設定
                if (isMin) minValue.textContent = value;
                else maxValue.textContent = value;
            }
            
            function onEnd() {
                // リスナーを削除
                document.removeEventListener(moveListener, onMove);
                document.removeEventListener(endListener, onEnd);
                
                // 最終値をアプリコントローラーに適用
                const newValues = { min: currentMin, max: currentMax };
                window.hrApp.updateAgeRange(newValues);
            }
            
            // 一時的なドキュメントレベルのイベントリスナーを追加
            document.addEventListener(moveListener, onMove);
            document.addEventListener(endListener, onEnd);
        }
        
        function updatePositions(minVal, maxVal) {
            // パーセンテージ位置を計算
            const minPos = ((minVal - min) / (max - min)) * 100;
            const maxPos = ((maxVal - min) / (max - min)) * 100;
            
            // サムの位置を更新
            minThumb.style.left = `${minPos}%`;
            maxThumb.style.left = `${maxPos}%`;
            
            // 範囲要素を更新
            range.style.left = `${minPos}%`;
            range.style.width = `${maxPos - minPos}%`;
        }
    }
    
    /**
     * 勤続年数範囲スライダーの初期化
     */
    initializeTenureRangeSlider() {
        const minThumb = document.getElementById('minTenureThumb');
        const maxThumb = document.getElementById('maxTenureThumb');
        const minValue = document.getElementById('minTenureValue');
        const maxValue = document.getElementById('maxTenureValue');
        const track = document.querySelector('.tenure-range-slider-container .double-slider-track');
        const range = document.querySelector('.tenure-range-slider-container .double-slider-range');
        
        if (!minThumb || !maxThumb || !minValue || !maxValue || !track || !range) return;
        
        const min = 0; // 最小勤続年数
        const max = 50; // 最大勤続年数
        
        // コントローラーから初期値を設定（またはデフォルト値）
        const initialMinVal = this.appController.displayOptions.tenureRange.min || min;
        const initialMaxVal = this.appController.displayOptions.tenureRange.max || max;
        
        // 表示値を更新
        minValue.textContent = initialMinVal;
        maxValue.textContent = initialMaxVal;
        
        // 初期位置を設定
        updatePositions(initialMinVal, initialMaxVal);
        
        // スライダー操作中のテキスト選択を防止
        minThumb.addEventListener('dragstart', preventDefault);
        maxThumb.addEventListener('dragstart', preventDefault);
        
        // マウスとタッチイベントのリスナー
        minThumb.addEventListener('mousedown', e => handleThumbDrag(e, minThumb, true));
        maxThumb.addEventListener('mousedown', e => handleThumbDrag(e, maxThumb, false));
        minThumb.addEventListener('touchstart', e => handleThumbDrag(e, minThumb, true));
        maxThumb.addEventListener('touchstart', e => handleThumbDrag(e, maxThumb, false));
        
        function preventDefault(e) {
            e.preventDefault();
            return false;
        }
        
        function handleThumbDrag(e, thumb, isMin) {
            // デフォルト動作を防止（ページスクロールなど）
            e.preventDefault();
            
            // パーセンテージ計算用のトラック範囲を取得
            const trackRect = track.getBoundingClientRect();
            
            // タッチ使用時はタッチ識別子を保存
            const touchId = e.changedTouches ? e.changedTouches[0].identifier : null;
            
            // マウスまたはタッチに適したリスナーを定義
            const moveListener = touchId !== null ? 'touchmove' : 'mousemove';
            const endListener = touchId !== null ? 'touchend' : 'mouseup';
            
            // 現在位置を追跡
            let currentMin = parseInt(minValue.textContent);
            let currentMax = parseInt(maxValue.textContent);
            
            function onMove(moveEvent) {
                let clientX;
                
                // タッチとマウスイベントを処理
                if (touchId !== null) {
                    // 保存した識別子に一致するタッチを検索
                    for (let i = 0; i < moveEvent.changedTouches.length; i++) {
                        if (moveEvent.changedTouches[i].identifier === touchId) {
                            clientX = moveEvent.changedTouches[i].clientX;
                            break;
                        }
                    }
                    if (clientX === undefined) return; // タッチが見つからない
                } else {
                    clientX = moveEvent.clientX;
                }
                
                // トラック内のパーセンテージ位置を計算
                let percentage = (clientX - trackRect.left) / trackRect.width;
                percentage = Math.min(1, Math.max(0, percentage)); // 0-1に制限
                
                // 値の範囲（min-max）に変換
                let value = Math.round(min + percentage * (max - min));
                
                // 制約付きで適切な値を更新
                if (isMin) {
                    value = Math.min(value, currentMax - 1); // 最小値は最大値未満
                    currentMin = value;
                } else {
                    value = Math.max(value, currentMin + 1); // 最大値は最小値より大きい
                    currentMax = value;
                }
                
                // UI更新
                updatePositions(currentMin, currentMax);
                
                // ドラッグ中の値をレンダリング用に要素に設定
                if (isMin) minValue.textContent = value;
                else maxValue.textContent = value;
            }
            
            function onEnd() {
                // リスナーを削除
                document.removeEventListener(moveListener, onMove);
                document.removeEventListener(endListener, onEnd);
                
                // 最終値をアプリコントローラーに適用
                const newValues = { min: currentMin, max: currentMax };
                window.hrApp.updateTenureRange(newValues);
            }
            
            // 一時的なドキュメントレベルのイベントリスナーを追加
            document.addEventListener(moveListener, onMove);
            document.addEventListener(endListener, onEnd);
        }
        
        function updatePositions(minVal, maxVal) {
            // パーセンテージ位置を計算
            const minPos = ((minVal - min) / (max - min)) * 100;
            const maxPos = ((maxVal - min) / (max - min)) * 100;
            
            // サムの位置を更新
            minThumb.style.left = `${minPos}%`;
            maxThumb.style.left = `${maxPos}%`;
            
            // 範囲要素を更新
            range.style.left = `${minPos}%`;
            range.style.width = `${maxPos - minPos}%`;
        }
    }
    
    /**
     * モーダルの初期化
     */
    initializeModals() {
        // 各モーダルにCloseボタンイベントを追加
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            const modal = closeBtn.closest('.modal-overlay');
            if (modal) {
                closeBtn.addEventListener('click', () => {
                    this.hideModal(modal.id);
                });
            }
        });
        
        // モーダル外クリックによる閉じる動作
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', e => {
                // モーダル自体(overlay)がクリックされ、かつそれがモーダルの子要素でない場合のみ閉じる
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }
    
    /**
     * メニューの初期化
     */
    initializeMenu() {
        // インポートエクスポートのタブ機能
        document.querySelectorAll('#importExportModal .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                // すべてのタブを非アクティブ化
                document.querySelectorAll('#importExportModal .tab').forEach(t => {
                    t.classList.remove('active');
                });
                
                // すべてのタブコンテンツを非表示
                document.querySelectorAll('#importExportModal .tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // クリックされたタブをアクティブ化
                tab.classList.add('active');
                
                // 対応するコンテンツを表示
                document.getElementById(`${targetTab}-tab`)?.classList.add('active');
            });
        });
        
        // 通知Closeボタン
        document.getElementById('closeNotification')?.addEventListener('click', () => {
            const notification = document.getElementById('notification');
            if (notification) {
                notification.classList.add('hidden');
                if (this.notificationTimeout) {
                    clearTimeout(this.notificationTimeout);
                    this.notificationTimeout = null;
                }
            }
        });
    }
    
    /**
     * インポート/エクスポート機能の初期化
     */
    initializeImportExport() {
        // ファイルアップロード機能の初期化
        this.initializeFileUpload();
    }
    
    /**
     * ファイルアップロードとドラッグ＆ドロップ機能の初期化
     */
    initializeFileUpload() {
        const fileDropArea = document.getElementById('fileDropArea');
        const fileInput = document.getElementById('importFile');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFileBtn = document.getElementById('removeFileBtn');
        const importBtn = document.getElementById('importDataBtn');
        
        if (!fileDropArea || !fileInput || !fileInfo || !fileName || !fileSize || !removeFileBtn || !importBtn) return;
        
        // ファイル選択時の処理
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileSelection(file);
            }
        });
        
        // ドラッグ＆ドロップの処理
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // ドラッグ操作の視覚的フィードバック
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, () => {
                fileDropArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, () => {
                fileDropArea.classList.remove('drag-over');
            }, false);
        });
        
        // ファイルのドロップ処理
        fileDropArea.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0]; // 1ファイルのみ対応
            if (file) {
                fileInput.files = e.dataTransfer.files; // ファイル入力に設定（Form送信用）
                handleFileSelection(file);
            }
        });
        
        // ファイル選択後の処理
        const handleFileSelection = (file) => {
            // JSONファイル確認
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                this.showNotification('error', 'エラー', 'JSONファイルのみアップロードできます。');
                clearFileSelection();
                return;
            }
            
            // ファイル情報表示
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.style.display = 'flex';
            fileDropArea.style.display = 'none';
            
            // インポートボタン有効化
            importBtn.disabled = false;
        };
        
        // ファイル選択解除ボタン
        removeFileBtn.addEventListener('click', () => {
            clearFileSelection();
        });
        
        // ファイル選択状態をクリア
        const clearFileSelection = () => {
            fileInput.value = '';
            fileInfo.style.display = 'none';
            fileDropArea.style.display = 'flex';
            importBtn.disabled = true;
        };
        
        // ファイルサイズのフォーマット
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    }
    
    /**
     * 空のチャート表示
     * @param {HTMLElement} container チャートコンテナ要素
     * @param {string} customMsg カスタムメッセージ（省略可）
     */
    renderEmptyChart(container, customMsg = null) {
        if (!container) return;
        
        if (customMsg) {
            container.innerHTML = customMsg;
        } else {
            container.innerHTML = `
                <div class="empty-chart">
                    <i class="fas fa-info-circle"></i>
                    <h3>表示データがありません</h3>
                    <p>左側のリストからチャートに表示する社員を選択するか、フィルター条件を確認してください。</p>
                    <button id="focusEmployeeListBtn" class="btn btn-primary">
                        <i class="fas fa-users"></i> 社員リストを確認
                    </button>
                </div>
            `;
            
            // リスト確認ボタンのイベント再追加
            const focusBtn = container.querySelector('#focusEmployeeListBtn');
            if (focusBtn) {
                focusBtn.addEventListener('click', () => {
                    const sidebar = document.getElementById('sidebar');
                    const employeeList = document.querySelector('.employee-select-list');
                    if (sidebar && employeeList) {
                        sidebar.classList.remove('collapsed');
                        employeeList.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
        }
    }
    
    /**
     * 印刷準備
     */
    prepareForPrint() {
        // 印刷用スタイルのために本文にクラスを追加
        document.body.classList.add('printing');
        
        // 印刷後、クラスを削除
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing');
        }, { once: true });
    }
    
    /**
     * 評価バッジへのコントラスト色適用 (可読性向上のためテキスト色自動調整)
     * @param {HTMLElement} element 対象要素
     * @param {string} bgColorHex 背景色（16進数）
     */
    applyContrastColor(element, bgColorHex) {
        if (!element || !bgColorHex) return;
        
        // 有効なHEXでなければ黒（フォールバック）
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(bgColorHex)) {
            element.style.color = '#000000';
            return;
        }
        
        // 簡易な輝度計算（近似値）
        // 16進数（3または6文字）をRGBに変換
        let r, g, b;
        
        if (bgColorHex.length === 4) { // #RGB形式
            r = parseInt(bgColorHex[1] + bgColorHex[1], 16);
            g = parseInt(bgColorHex[2] + bgColorHex[2], 16);
            b = parseInt(bgColorHex[3] + bgColorHex[3], 16);
        } else { // #RRGGBB形式
            r = parseInt(bgColorHex.slice(1, 3), 16);
            g = parseInt(bgColorHex.slice(3, 5), 16);
            b = parseInt(bgColorHex.slice(5, 7), 16);
        }
        
        // 知覚される明るさを計算（YIQ公式）
        // この公式は異なる色の人間の知覚を考慮
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // 明るさに基づいてテキスト色を決定
        element.style.color = brightness > 128 ? '#000000' : '#FFFFFF';
    }
    
    /**
     * 背景色をHEXで取得 (コントラスト計算用)
     * @param {HTMLElement} element 対象要素
     * @returns {string} 背景色の16進数表現
     */
    getComputedBgHex(element) {
        if (!element) return '#FFFFFF'; // デフォルト白
        
        const bgColor = window.getComputedStyle(element).backgroundColor;
        
        // rgb(r, g, b)形式を16進数に変換
        if (bgColor.startsWith('rgb')) {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                return `#${Number(rgb[0]).toString(16).padStart(2, '0')}${Number(rgb[1]).toString(16).padStart(2, '0')}${Number(rgb[2]).toString(16).padStart(2, '0')}`;
            }
        }
        
        // すでに16進数または他の形式の場合、そのまま返す
        return bgColor;
    }

    /**
     * 設定モーダルのグレード表示にコントラストを適用
     */
    applyContrastToSettingsGradeColors() {
        const gradeElements = document.querySelectorAll('.evaluation-card.grade-evaluation');
        gradeElements.forEach(el => {
            const gradeText = el.textContent.trim();
            const gradeNum = parseInt(gradeText.replace('G', ''));
            
            if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12) {
                el.style.backgroundColor = `var(--grade-${gradeNum})`;
                
                // 計算された背景色を取得し、適切なテキスト色を適用
                const bgHex = this.getComputedBgHex(el);
                this.applyContrastColor(el, bgHex);
            }
        });
    }

    // チャート描画関連のメソッド - UIChartsへの橋渡し
    
    /**
     * 評価チャートを描画
     */
    renderEvaluationChart(employeeIds, chartType, yearFilter) {
        this.appUICharts.renderEvaluationChart(employeeIds, chartType, yearFilter);
    }
    
    /**
     * 部署別配置チャートを描画
     */
    renderDepartmentChart(employees, chartType, yearFilter) {
        this.appUICharts.renderDepartmentChart(employees, chartType, yearFilter);
    }
    
    /**
     * 班別配置チャート描画
     */
    renderTeamChart(employees, chartType, yearFilter) {
        this.appUICharts.renderTeamChart(employees, chartType, yearFilter);
    }
    
    /**
     * キャリアパス分析チャート描画
     */
    renderCareerPathChart(employees, yearFilter) {
        this.appUICharts.renderCareerPathChart(employees, yearFilter);
    }
    
    /**
     * グレード分布チャート描画
     */
    renderGradeDistributionChart(employees, yearFilter) {
        this.appUICharts.renderGradeDistributionChart(employees, yearFilter);
    }
    
    /**
     * 年齢分布チャート描画
     */
    renderAgeDistributionChart(employees, yearFilter) {
        this.appUICharts.renderAgeDistributionChart(employees, yearFilter);
    }
    
    /**
     * マトリクス分布チャート描画
     */
    renderMatrixDistributionChart(employees, yearFilter) {
        this.appUICharts.renderMatrixDistributionChart(employees, yearFilter);
    }
    
    // UIFormsへの橋渡しメソッド
    
    /**
     * 社員管理モーダルを表示
     */
    showEmployeeManagementModal() {
        this.uiForms.showEmployeeManagementModal();
    }
    
    /**
     * 社員管理モーダルの社員一覧表を更新
     */
    updateEmployeeManagementTable(employees) {
        this.uiForms.updateEmployeeManagementTable(employees);
    }
    
    /**
     * 社員管理モーダルの検索フィルター適用
     */
    filterEmployeeManagementTable(searchTerm) {
        this.uiForms.filterEmployeeManagementTable(searchTerm);
    }
    
    /**
     * 社員追加/編集モーダルを表示
     */
    showEmployeeModal(employeeId = null) {
        this.uiForms.showEmployeeModal(employeeId);
    }
    
    /**
     * 評価追加/編集モーダルを表示
     */
    showEvaluationModal(evaluationId = null, presetEmployeeId = null, presetYear = null, employeeList = null) {
        this.uiForms.showEvaluationModal(evaluationId, presetEmployeeId, presetYear, employeeList);
    }
    
    /**
     * 評価モーダルの年齢・勤続年数を計算
     */
    calculateEvaluationAgeAndTenure(autoSelectGradeEval = true) {
        return this.uiForms.calculateEvaluationAgeAndTenure(autoSelectGradeEval);
    }
    
    /**
     * 共通ヘルパー：部署選択肢を設定
     */
    populateDepartmentOptions(selectElement) {
        this.uiForms.populateDepartmentOptions(selectElement);
    }
    
    /**
     * 共通ヘルパー：役職選択肢を設定
     */
    populatePositionOptions(selectElement) {
        this.uiForms.populatePositionOptions(selectElement);
    }
    
    /**
     * 共通ヘルパー：所属班選択肢を設定
     */
    populateTeamOptions(selectElement) {
        this.uiForms.populateTeamOptions(selectElement);
    }
    
    /**
     * 共通ヘルパー：フィルターリストボックスを更新
     */
    updateFilterListBox(listBoxId, items, selectedSet, valueKey = 'id', textKey = 'name', sort = true) {
        this.uiForms.updateFilterListBox(listBoxId, items, selectedSet, valueKey, textKey, sort);
    }
    
    /**
     * サイドバーの社員選択リストを更新
     */
    updateEmployeeSelectList(filteredEmployees, selectedEmployeeIds) {
        this.uiForms.updateEmployeeSelectList(filteredEmployees, selectedEmployeeIds);
    }
}

/**
 * UI統合クラス - 人事評定視覚化アプリケーション
 * ui-core.js, ui-forms.js, ui-charts.jsの3つのUIコンポーネントを統合します
 */
class AppUI {
    constructor(appController) {
        // メインの参照を保持
        this.appController = appController;
        
        // 各UIコンポーネントのインスタンス化
        this.core = new AppUICore(appController);
        this.forms = new UIForms(this);
        this.charts = new UICharts(this);
        
        // 必要なプロパティを内部クラスから統合
        this.tooltipTimeout = this.core.tooltipTimeout;
        this.sliderUpdateTimeout = this.core.sliderUpdateTimeout;
        this.contrastColorCache = this.core.contrastColorCache;
    }

    // --- コア機能のプロキシメソッド ---
    
    // コントラスト計算ヘルパー
    getLuminance(r, g, b) { return this.core.getLuminance(r, g, b); }
    getContrastRatio(rgb1, rgb2) { return this.core.getContrastRatio(rgb1, rgb2); }
    hexToRgb(hex) { return this.core.hexToRgb(hex); }
    rgbStringToHex(rgbString) { return this.core.rgbStringToHex(rgbString); }
    getContrastColor(backgroundHex) { return this.core.getContrastColor(backgroundHex); }
    applyContrastColor(element, backgroundHex) { return this.core.applyContrastColor(element, backgroundHex); }
    getComputedBgHex(element) { return this.core.getComputedBgHex(element); }
    
    // UI初期化
    initializeUI() { return this.core.initializeUI(); }
    initializeAgeRangeSlider() { return this.core.initializeAgeRangeSlider(); }
    toggleAgeRangeSliderVisibility(isVisible) { return this.core.toggleAgeRangeSliderVisibility(isVisible); }
    initializeMenu() { return this.core.initializeMenu(); }
    initializeModals() { return this.core.initializeModals(); }
    applyContrastToSettingsGradeColors() { return this.core.applyContrastToSettingsGradeColors(); }
    
    // タブとモーダル
    activateTab(tabId, container) { return this.core.activateTab(tabId, container); }
    showModal(modalId) { return this.core.showModal(modalId); }
    hideModal(modalId) { return this.core.hideModal(modalId); }
    
    // バッジとツールチップ
    createSidebarBadge(text, type, title) { return this.core.createSidebarBadge(text, type, title); }
    
    // 通知と印刷
    showNotification(type, title, message, autoHideDelay) { return this.core.showNotification(type, title, message, autoHideDelay); }
    hideNotification() { return this.core.hideNotification(); }
    prepareForPrint() { return this.core.prepareForPrint(); }
    toggleToolbarOptionsForView(view) { return this.core.toggleToolbarOptionsForView(view); }
    
    // 勤続年数スライダー
    toggleTenureRangeSliderVisibility(visible) { return this.core.toggleTenureRangeSliderVisibility(visible); }
    
    // --- フォーム関連のプロキシメソッド ---
    
    // 社員管理モーダル
    showEmployeeManagementModal() { return this.forms.showEmployeeManagementModal(); }
    updateEmployeeManagementTable(employees) { return this.forms.updateEmployeeManagementTable(employees); }
    filterEmployeeManagementTable(searchTerm) { return this.forms.filterEmployeeManagementTable(searchTerm); }
    
    // 社員追加/編集モーダル
    showEmployeeModal(employeeId) { return this.forms.showEmployeeModal(employeeId); }
    
    // 評価追加/編集モーダル
    showEvaluationModal(evaluationId, presetEmployeeId, presetYear, employeeList) { 
        return this.forms.showEvaluationModal(evaluationId, presetEmployeeId, presetYear, employeeList); 
    }
    calculateEvaluationAgeAndTenure(autoSelectGradeEval) { 
        return this.forms.calculateEvaluationAgeAndTenure(autoSelectGradeEval); 
    }
    
    // セレクトボックスヘルパー
    populateSelectWithOptions(selectElement, options, includeEmpty, emptyLabel) { 
        return this.forms.populateSelectWithOptions(selectElement, options, includeEmpty, emptyLabel); 
    }
    populateDepartmentOptions(selectElement) { return this.forms.populateDepartmentOptions(selectElement); }
    populatePositionOptions(selectElement) { return this.forms.populatePositionOptions(selectElement); }
    populateEmployeeOptions(selectElement, employees) { return this.forms.populateEmployeeOptions(selectElement, employees); }
    populateGradeOptions(selectElement) { return this.forms.populateGradeOptions(selectElement); }
    populateYearlyEvaluationOptions(selectElement) { return this.forms.populateYearlyEvaluationOptions(selectElement); }
    populateTeamOptions(selectElement) { return this.forms.populateTeamOptions(selectElement); }
    
    // サイドバーリスト
    updateEmployeeSelectList(filteredEmployees, selectedEmployeeIds) { 
        return this.forms.updateEmployeeSelectList(filteredEmployees, selectedEmployeeIds); 
    }
    
    // 部署・役職管理テーブル
    updateDepartmentTable() { return this.forms.updateDepartmentTable(); }
    updatePositionTable() { return this.forms.updatePositionTable(); }
    updateTeamTable() { return this.forms.updateTeamTable(); }
    
    // フィルターリストボックス
    updateFilterListBox(listBoxId, items, selectedSet, valueKey, textKey, sort) { 
        return this.forms.updateFilterListBox(listBoxId, items, selectedSet, valueKey, textKey, sort); 
    }
    
    // --- チャート関連のプロキシメソッド ---
    
    // チャート描画
    renderEmptyChart(container, messageHtml) { return this.charts.renderEmptyChart(container, messageHtml); }
    createEvaluationCard(text, type, details) { return this.charts.createEvaluationCard(text, type, details); }
    renderEvaluationChart(selectedEmployeeIds, axisType, yearFilter) { 
        return this.charts.renderEvaluationChart(selectedEmployeeIds, axisType, yearFilter); 
    }
    setupCellInteractions(cell, evaluation) { return this.charts.setupCellInteractions(cell, evaluation); }
    
    // 部署チャート
    renderDepartmentChart(filteredEmployees, axisType, yearFilter) { 
        return this.charts.renderDepartmentChart(filteredEmployees, axisType, yearFilter); 
    }
    createEmployeeCard(container, employee, displayOptions) { 
        return this.charts.createEmployeeCard(container, employee, displayOptions); 
    }
    
    // チームチャート
    renderTeamChart(employees, chartType, yearFilter) {
        return this.charts.renderTeamChart(employees, chartType, yearFilter);
    }

    // 星取表
    renderStarChart(filteredEmployees, yearFilter, displayOptions) { 
        return this.charts.renderStarChart(filteredEmployees, yearFilter, displayOptions); 
    }
    
    // キャリアパスチャート
    renderCareerPathChart(employees, yearFilter) {
        return this.charts.renderCareerPathChart(employees, yearFilter);
    }
    
    // ツールチップ
    showEmployeeTooltip(event, employee) { return this.charts.showEmployeeTooltip(event, employee); }
    hideEmployeeTooltip() { return this.charts.hideEmployeeTooltip(); }
    showEvaluationTooltip(event, evaluation) { return this.charts.showEvaluationTooltip(event, evaluation); }
    hideEvaluationTooltip() { return this.charts.hideEvaluationTooltip(); }
    positionTooltip(targetElement, tooltipElement) { return this.charts.positionTooltip(targetElement, tooltipElement); }
    
    // 分布チャート
    renderGradeDistributionChart(filteredEmployees, yearFilter) { 
        return this.charts.renderGradeDistributionChart(filteredEmployees, yearFilter); 
    }
    renderAgeDistributionChart(filteredEmployees, yearFilter) { 
        return this.charts.renderAgeDistributionChart(filteredEmployees, yearFilter); 
    }
    
    renderMatrixDistributionChart(filteredEmployees, yearFilter) { 
        return this.charts.renderMatrixDistributionChart(filteredEmployees, yearFilter); 
    }
    
    // 昇給比較チャート
    renderSalaryComparisonChart(employeeIds, chartType, yearFilter) {
        return this.charts.renderSalaryComparisonChart(employeeIds, chartType, yearFilter);
    }
}