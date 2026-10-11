/**
 * UI基本操作 - 人事評定視覚化アプリケーション
 * モーダル、通知、色彩計算などの基本機能を提供
 */
class AppUICore {
    constructor(appController) {
        this.appController = appController;
        this.tooltipTimeout = null;
        this.sliderUpdateTimeout = null;
        this.contrastColorCache = new Map();
        this.activeModals = new Set();
        this.notificationTimeout = null;
    }

    // 色彩関連ユーティリティ
    getLuminance(r, g, b) {
        // sRGB 色空間から線形RGBへの変換
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        
        // 相対輝度の計算
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    getContrastRatio(rgb1, rgb2) {
        const lum1 = this.getLuminance(rgb1[0], rgb1[1], rgb1[2]);
        const lum2 = this.getLuminance(rgb2[0], rgb2[1], rgb2[2]);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    hexToRgb(hex) {
        // 短縮形（#abc）を完全な形式（#aabbcc）に展開
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0]; // フォールバック
    }
    
    rgbStringToHex(rgbString) {
        const regex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
        const match = rgbString.match(regex);
        if (!match) return '#000000';
        
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    getContrastColor(backgroundHex) {
        // キャッシュを活用して計算を効率化
        if (this.contrastColorCache.has(backgroundHex)) {
            return this.contrastColorCache.get(backgroundHex);
        }
        
        const rgb = this.hexToRgb(backgroundHex);
        // 白と黒で、どちらが背景色とのコントラストが高いかを判定
        const whiteContrast = this.getContrastRatio(rgb, [255, 255, 255]);
        const blackContrast = this.getContrastRatio(rgb, [0, 0, 0]);
        
        const contrastColor = whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
        this.contrastColorCache.set(backgroundHex, contrastColor);
        return contrastColor;
    }
    
    applyContrastColor(element, backgroundHex) {
        if (!element || !backgroundHex) return;
        element.style.color = this.getContrastColor(backgroundHex);
    }
    
    getComputedBgHex(element) {
        if (!element) return '#FFFFFF';
        
        // DOM 未接続の要素は算出スタイルが得られない（CSS 変数も解決されない）ため、一時的に接続して計算する
        const detached = !element.isConnected;
        if (detached) document.body.appendChild(element);
        const bgColor = window.getComputedStyle(element).backgroundColor;
        if (detached) element.remove();
        
        // rgb(r, g, b)形式を16進数に変換
        if (bgColor.startsWith('rgb')) {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                return `#${Number(rgb[0]).toString(16).padStart(2, '0')}${Number(rgb[1]).toString(16).padStart(2, '0')}${Number(rgb[2]).toString(16).padStart(2, '0')}`;
            }
        }
        
        return bgColor;
    }

    // UI要素関連の基本機能
    initializeUI() {
        this.initializeFilterSections();
        this.initializeAgeRangeSlider();
        this.initializeTenureRangeSlider();
    }
    
    initializeFilterSections() {
        // レールの開閉は AppShell が担当する。空表示の「社員リストを確認」は表示社員パネルを開く
        document.getElementById('focusEmployeeListBtn')?.addEventListener('click', () => {
            this.appController.shell?.openPanel('employeeRail');
        });
    }
    
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
                notification.classList.remove('visible');
                notification.classList.add('hidden');
                if (this.notificationTimeout) {
                    clearTimeout(this.notificationTimeout);
                    this.notificationTimeout = null;
                }
            }
        });
    }
    
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
    
    /** 範囲スライダーの定義（要素IDと値の範囲） */
    static RANGE_SLIDERS = {
        age: { container: '.age-range-slider-container', minThumb: 'minThumb', maxThumb: 'maxThumb', minValue: 'minValue', maxValue: 'maxValue', min: 18, max: 65, option: 'ageRange' },
        tenure: { container: '.tenure-range-slider-container', minThumb: 'minTenureThumb', maxThumb: 'maxTenureThumb', minValue: 'minTenureValue', maxValue: 'maxTenureValue', min: 0, max: 50, option: 'tenureRange' }
    };

    getRangeSliderElements(type) {
        const def = AppUICore.RANGE_SLIDERS[type];
        const el = {
            minThumb: document.getElementById(def.minThumb),
            maxThumb: document.getElementById(def.maxThumb),
            minValue: document.getElementById(def.minValue),
            maxValue: document.getElementById(def.maxValue),
            track: document.querySelector(`${def.container} .double-slider-track`),
            range: document.querySelector(`${def.container} .double-slider-range`)
        };
        return Object.values(el).every(Boolean) ? el : null;
    }

    getRangeSliderBounds(type) {
        const { min, max } = AppUICore.RANGE_SLIDERS[type];
        return { min, max };
    }

    /** スライダーの表示（つまみ位置と数値）を指定値に合わせる。データへの反映は呼び出し側で行う */
    setRangeSliderValues(type, minVal, maxVal) {
        const el = this.getRangeSliderElements(type);
        if (!el) return;
        const { min, max } = AppUICore.RANGE_SLIDERS[type];
        el.minValue.textContent = minVal;
        el.maxValue.textContent = maxVal;
        this.updateSliderPositions(el.minThumb, el.maxThumb, el.range, minVal, maxVal, min, max);
    }

    initializeRangeSlider(type) {
        const el = this.getRangeSliderElements(type);
        if (!el) return;
        const { min, max, option } = AppUICore.RANGE_SLIDERS[type];
        const initial = this.appController.displayOptions?.[option] || {};
        this.setRangeSliderValues(type, initial.min ?? min, initial.max ?? max);

        const { minThumb, maxThumb, minValue, maxValue, track, range } = el;
        [[minThumb, true], [maxThumb, false]].forEach(([thumb, isMin]) => {
            // スライダー操作中のテキスト選択を防止
            thumb.addEventListener('dragstart', e => e.preventDefault());
            const onStart = e => this.handleThumbDrag(e, minThumb, maxThumb, minValue, maxValue, track, range, min, max, isMin, type);
            thumb.addEventListener('mousedown', onStart);
            thumb.addEventListener('touchstart', onStart);
        });
    }

    initializeAgeRangeSlider() {
        this.initializeRangeSlider('age');
    }
    
    initializeTenureRangeSlider() {
        this.initializeRangeSlider('tenure');
    }
    
    handleThumbDrag(e, minThumb, maxThumb, minValue, maxValue, track, range, min, max, isMin, rangeType) {
        // デフォルト動作を防止
        e.preventDefault();
        
        // トラック範囲を取得
        const trackRect = track.getBoundingClientRect();
        
        // タッチ識別子を保存
        const touchId = e.changedTouches ? e.changedTouches[0].identifier : null;
        
        // マウスまたはタッチに適したリスナーを定義
        const moveListener = touchId !== null ? 'touchmove' : 'mousemove';
        const endListener = touchId !== null ? 'touchend' : 'mouseup';
        
        // 現在位置を追跡
        let currentMin = parseInt(minValue.textContent);
        let currentMax = parseInt(maxValue.textContent);
        
        const onMove = (moveEvent) => {
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
            this.updateSliderPositions(minThumb, maxThumb, range, currentMin, currentMax, min, max);
            
            // ドラッグ中の値をレンダリング用に要素に設定
            if (isMin) minValue.textContent = value;
            else maxValue.textContent = value;
        };
        
        const onEnd = () => {
            // リスナーを削除
            document.removeEventListener(moveListener, onMove);
            document.removeEventListener(endListener, onEnd);
            
            // 最終値をアプリコントローラーに適用
            const newValues = { min: currentMin, max: currentMax };
            if (rangeType === 'age') {
                this.appController.updateAgeRange(newValues);
            } else if (rangeType === 'tenure') {
                this.appController.updateTenureRange(newValues);
            }
        };
        
        // 一時的なドキュメントレベルのイベントリスナーを追加
        document.addEventListener(moveListener, onMove);
        document.addEventListener(endListener, onEnd);
    }
    
    updateSliderPositions(minThumb, maxThumb, range, minVal, maxVal, min, max) {
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
    
    // モーダル表示・非表示
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        modal.classList.add('visible');
        this.activeModals.add(modalId);

        // 先頭のフォーム要素にフォーカス
        const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // ESCキーでモーダルを閉じるイベント追加
        document.addEventListener('keydown', this.handleEscapeKey);
        
        return true;
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        modal.classList.remove('visible');
        this.activeModals.delete(modalId);
        
        // アクティブなモーダルがなくなったらESCキーイベントを削除
        if (this.activeModals.size === 0) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
        
        return true;
    }
    
    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.activeModals.size > 0) {
            // 最後に開いたモーダルを取得
            const lastModalId = Array.from(this.activeModals).pop();
            this.hideModal(lastModalId);
        }
    }
    
    // 通知表示
    showNotification(type = 'success', title = '完了', message = '', duration = 3000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        // 通知タイプに応じたクラスを設定
        notification.className = 'notification';
        notification.classList.add(`notification-${type}`);
        
        // 通知内容を設定
        const titleElement = notification.querySelector('.notification-title');
        const messageElement = notification.querySelector('.notification-message');
        const iconElement = notification.querySelector('.notification-icon i');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // タイプに応じたアイコンを設定
        if (iconElement) {
            iconElement.className = '';
            switch (type) {
                case 'success': iconElement.className = 'fas fa-check-circle'; break;
                case 'error': iconElement.className = 'fas fa-times-circle'; break;
                case 'warning': iconElement.className = 'fas fa-exclamation-triangle'; break;
                case 'info': iconElement.className = 'fas fa-info-circle'; break;
                default: iconElement.className = 'fas fa-bell';
            }
        }
        
        // 通知を表示（.notification は既定で opacity:0/visibility:hidden のため .visible が必須）
        notification.classList.remove('hidden');
        notification.classList.add('visible');
        
        // 既存のタイムアウトをクリア
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // 通知を自動的に非表示にするタイマー設定
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            notification.classList.add('hidden');
            this.notificationTimeout = null;
        }, duration);
        
        // 閉じるボタンのクリックハンドラを追加
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                notification.classList.remove('visible');
                notification.classList.add('hidden');
                if (this.notificationTimeout) {
                    clearTimeout(this.notificationTimeout);
                    this.notificationTimeout = null;
                }
            };
        }
    }
    
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('visible');
            notification.classList.add('hidden');
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
                this.notificationTimeout = null;
            }
        }
    }
    
    // その他UIユーティリティ
    activateTab(tabId, container) {
        if (!container) return false;
        
        // このモーダル内のすべてのタブコンテンツを非表示
        const tabContents = container.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // すべてのタブボタンを非アクティブ化
        const tabButtons = container.closest('.modal').querySelectorAll('.tab');
        tabButtons.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 指定されたタブとコンテンツをアクティブ化
        const selectedTab = container.closest('.modal').querySelector(`.tab[data-tab="${tabId}"]`);
        const selectedContent = container.querySelector(`#${tabId}-tab`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            return true;
        }
        
        return false;
    }
    
    createSidebarBadge(text, type, title) {
        if (!text) return null;
        const badge = document.createElement('span');
        badge.className = `employee-badge ${type}`;
        badge.textContent = text;
        badge.title = title;
        return badge;
    }
    
    toggleAgeRangeSliderVisibility(visible) {
        const container = document.querySelector('.age-range-slider-container');
        if (container) {
            container.style.display = visible ? 'flex' : 'none';
        }
    }
    
    toggleTenureRangeSliderVisibility(visible) {
        const container = document.querySelector('.tenure-range-slider-container');
        if (container) {
            container.style.display = visible ? 'flex' : 'none';
        }
    }
    
    toggleToolbarOptionsForView(view) {
        if (view === 'chart' || view === 'department' || view === 'team') {
            // チャートビュー、デプトビュー、チームビューで共通の表示項目
            document.getElementById('chartTypeSelect')?.removeAttribute('disabled');
            document.getElementById('sortOrderSelect')?.removeAttribute('disabled');
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
    
    prepareForPrint() {
        // 印刷用スタイルのために本文にクラスを追加
        document.body.classList.add('printing');
        
        // 印刷後、クラスを削除
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing');
        }, { once: true });
    }
    
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
}